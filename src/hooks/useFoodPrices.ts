import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import type { FoodPrice } from '../types/database'

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
 * Returns null if no price exists. If multiple stores have prices, returns the first.
 */
export function getPriceForIngredient(
  prices: FoodPrice[],
  ingredientId: string,
  preferredStore?: string
): number | null {
  const matching = prices.filter(p => p.food_id === ingredientId)
  if (matching.length === 0) return null
  if (preferredStore) {
    const storeMatch = matching.find(p => p.store === preferredStore)
    if (storeMatch) return storeMatch.cost_per_100g
  }
  return matching[0].cost_per_100g
}
