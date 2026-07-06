import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import type { InventoryItem, StorageLocation, InventoryUnit, RemovalReason } from '../types/database'
import { normaliseToCostPer100g } from '../utils/cost'
import type { ConsolidationPlan } from '../utils/inventory'
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
      return (data ?? []) as unknown as InventoryItem[]
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

export function useBulkAddInventoryItems() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (items: AddInventoryItemParams[]) => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const today = new Date().toISOString().slice(0, 10)
      const { error } = await supabase.from('inventory_items').insert(
        items.map(params => ({
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
          purchased_at: params.purchased_at ?? today,
          expires_at: params.expires_at ?? null,
          purchase_price: params.purchase_price ?? null,
          is_leftover: params.is_leftover ?? false,
          leftover_from_recipe_id: params.leftover_from_recipe_id ?? null,
        }))
      )
      if (error) throw error

      // D-04 price integration, bulk form: one upsert covering every priced,
      // weight-based item (deduped — upsert can't touch the same row twice)
      const priceRows = new Map<string, { household_id: string; food_id: string; food_name: string; store: string; cost_per_100g: number; created_by: string }>()
      for (const params of items) {
        if (params.purchase_price == null || !params.food_id || params.unit === 'units') continue
        if (priceRows.has(params.food_id)) continue
        priceRows.set(params.food_id, {
          household_id: householdId,
          food_id: params.food_id,
          food_name: params.food_name,
          store: '',
          cost_per_100g: normaliseToCostPer100g(
            params.purchase_price,
            params.quantity_remaining,
            params.unit.toLowerCase() as 'g' | 'kg' | 'ml' | 'l'
          ),
          created_by: userId,
        })
      }
      if (priceRows.size > 0) {
        const { error: priceError } = await supabase
          .from('food_prices')
          .upsert([...priceRows.values()], { onConflict: 'household_id,food_id,store' })
        if (priceError) throw priceError
      }
      return { householdId }
    },
    onSuccess: ({ householdId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })
      queryClient.invalidateQueries({ queryKey: queryKeys.foodPrices.list(householdId) })
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

export function useConsolidateInventory() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (plan: ConsolidationPlan) => {
      for (const survivor of plan.survivors) {
        const { error } = await supabase
          .from('inventory_items')
          .update({ quantity_remaining: survivor.quantity_remaining, expires_at: survivor.expires_at })
          .eq('id', survivor.id)
        if (error) throw error
      }
      if (plan.removeIds.length > 0) {
        const { error } = await supabase
          .from('inventory_items')
          .update({ removed_at: new Date().toISOString(), removed_reason: 'merged' })
          .in('id', plan.removeIds)
        if (error) throw error
      }
      return plan.duplicateCount
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })
    },
  })
}

export function useDiscardInventoryItems() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return
      const { error } = await supabase
        .from('inventory_items')
        .update({ removed_at: new Date().toISOString(), removed_reason: 'discarded' })
        .in('id', ids)
      if (error) throw error
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
