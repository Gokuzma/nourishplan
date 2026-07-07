import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import { getReferencePriceForIngredient } from '../utils/referencePrices'
import type { FoodPrice, ReferenceFoodPrice } from '../types/database'

export { getReferencePriceForIngredient }

const DEFAULT_REGION = 'ontario'

/**
 * Official current retail averages (Statistics Canada) used as a fallback when
 * a household hasn't entered its own price for an ingredient. Read-only, shared
 * across households, refreshed monthly by the sync-reference-prices function.
 */
export function useReferencePrices(region: string = DEFAULT_REGION) {
  return useQuery({
    queryKey: queryKeys.referencePrices.list(region),
    queryFn: async (): Promise<ReferenceFoodPrice[]> => {
      const { data, error } = await supabase
        .from('reference_food_prices')
        .select('*')
        .eq('region', region)
        .order('ingredient_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 60 * 12,
  })
}

export function useFoodPrices() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useQuery({
    queryKey: queryKeys.foodPrices.list(householdId),
    queryFn: async (): Promise<FoodPrice[]> => {
      const { data, error } = await supabase
        .from('food_prices')
        .select('*')
        .eq('household_id', householdId!)
        .order('food_name')
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}

export function useSaveFoodPrice() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  return useMutation({
    mutationFn: async (params: {
      food_id: string; food_name: string; store: string; cost_per_100g: number
    }) => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')
      const { data, error } = await supabase
        .from('food_prices')
        .upsert({
          household_id: householdId,
          food_id: params.food_id,
          food_name: params.food_name,
          store: params.store.trim(),
          cost_per_100g: params.cost_per_100g,
          created_by: userId,
        }, { onConflict: 'household_id,food_id,store' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: queryKeys.foodPrices.list(householdId) })
    },
  })
}

export function useDeleteFoodPrice() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('food_prices').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: queryKeys.foodPrices.list(householdId) })
    },
  })
}

/**
 * Helper: find the price for a given ingredient from the loaded prices list.
 * Matches by food_id first, then by name — AI-generated recipes mint a new
 * ingredient_id every generation, so an id-only match loses saved prices.
 *
 * When the household has no price for the ingredient, falls back to official
 * reference prices (StatCan) matched by name, so recipe costs and the purse
 * still populate without anyone entering a price. Household prices always win.
 * Returns null if neither source has a price.
 */
export function getPriceForIngredient(
  prices: FoodPrice[],
  ingredientId: string,
  preferredStore?: string,
  ingredientName?: string | null,
  referencePrices?: ReferenceFoodPrice[]
): number | null {
  let matching = prices.filter(p => p.food_id === ingredientId)
  if (matching.length === 0 && ingredientName) {
    const nameLower = ingredientName.toLowerCase()
    matching = prices.filter(p => p.food_name.toLowerCase() === nameLower)
  }
  if (matching.length > 0) {
    if (preferredStore) {
      const storeMatch = matching.find(p => p.store === preferredStore)
      if (storeMatch) return storeMatch.cost_per_100g
    }
    return matching[0].cost_per_100g
  }
  return getReferencePriceForIngredient(referencePrices, ingredientName)
}
