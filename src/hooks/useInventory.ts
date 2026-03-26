import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import type { InventoryItem, StorageLocation, InventoryUnit, RemovalReason } from '../types/database'
import { normaliseToCostPer100g } from '../utils/cost'
import { useSaveFoodPrice } from './useFoodPrices'

export function useInventoryItems(location?: StorageLocation) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useQuery({
    queryKey: location
      ? queryKeys.inventory.byLocation(householdId, location)
      : queryKeys.inventory.list(householdId),
    queryFn: async (): Promise<InventoryItem[]> => {
      let query = supabase
        .from('inventory_items')
        .select('*')
        .eq('household_id', householdId!)
        .is('removed_at', null)
        .order('expires_at', { ascending: true, nullsFirst: false })
      if (location) {
        query = query.eq('storage_location', location)
      }
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}

interface AddInventoryItemParams {
  food_name: string
  brand?: string
  food_id?: string
  quantity_remaining: number
  unit: InventoryUnit
  storage_location: StorageLocation
  is_opened?: boolean
  is_staple?: boolean
  purchased_at?: string
  expires_at?: string | null
  purchase_price?: number | null
  is_leftover?: boolean
  leftover_from_recipe_id?: string | null
}

export function useAddInventoryItem() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const saveFoodPrice = useSaveFoodPrice()

  return useMutation({
    mutationFn: async (params: AddInventoryItemParams) => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          household_id: householdId,
          added_by: userId,
          food_name: params.food_name,
          brand: params.brand ?? null,
          food_id: params.food_id ?? null,
          quantity_remaining: params.quantity_remaining,
          unit: params.unit,
          storage_location: params.storage_location,
          is_opened: params.is_opened ?? false,
          is_staple: params.is_staple ?? false,
          purchased_at: params.purchased_at ?? new Date().toISOString().slice(0, 10),
          expires_at: params.expires_at ?? null,
          purchase_price: params.purchase_price ?? null,
          is_leftover: params.is_leftover ?? false,
          leftover_from_recipe_id: params.leftover_from_recipe_id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return { data, params, householdId }
    },
    onSuccess: async ({ data: _data, params, householdId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })

      // D-04 price integration: save food price when price + food_id present and unit is weight-based
      if (
        params.purchase_price != null &&
        params.food_id &&
        params.unit !== 'units'
      ) {
        const costUnit = params.unit.toLowerCase() as 'g' | 'kg' | 'ml' | 'l'
        const cost_per_100g = normaliseToCostPer100g(
          params.purchase_price,
          params.quantity_remaining,
          costUnit
        )
        await saveFoodPrice.mutateAsync({
          food_id: params.food_id,
          food_name: params.food_name,
          store: '',
          cost_per_100g,
        })
      }
    },
  })
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })
    },
  })
}

export function useRemoveInventoryItem() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: RemovalReason }) => {
      const { error } = await supabase
        .from('inventory_items')
        .update({ removed_at: new Date().toISOString(), removed_reason: reason })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })
    },
  })
}
