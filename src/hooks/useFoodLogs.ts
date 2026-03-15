import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import type { FoodLog } from '../types/database'

export interface InsertFoodLogParams {
  member_user_id?: string | null
  member_profile_id?: string | null
  log_date: string
  slot_name?: string | null
  meal_id?: string | null
  item_type?: string | null
  item_id?: string | null
  item_name: string
  servings_logged: number
  calories_per_serving: number
  protein_per_serving: number
  fat_per_serving: number
  carbs_per_serving: number
  micronutrients?: Record<string, number>
  is_private?: boolean
}

/**
 * Returns all food log entries for the given household, date, and member.
 * memberType distinguishes auth users ('user') from managed profiles ('profile').
 */
export function useFoodLogs(
  householdId: string | undefined,
  logDate: string | undefined,
  memberId: string | undefined,
  memberType: 'user' | 'profile',
) {
  return useQuery({
    queryKey: ['food-logs', householdId, logDate, memberId],
    queryFn: async (): Promise<FoodLog[]> => {
      let query = supabase
        .from('food_logs')
        .select('*')
        .eq('household_id', householdId!)
        .eq('log_date', logDate!)
        .order('created_at', { ascending: true })

      if (memberType === 'user') {
        query = query.eq('member_user_id', memberId!)
      } else {
        query = query.eq('member_profile_id', memberId!)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId && !!logDate && !!memberId,
  })
}

/**
 * Creates a new food log entry for the current user's household.
 * logged_by is set to the authenticated user; member targeting is via the params.
 */
export function useInsertFoodLog() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (params: InsertFoodLogParams): Promise<FoodLog> => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase
        .from('food_logs')
        .insert({
          household_id: householdId,
          logged_by: userId,
          member_user_id: params.member_user_id ?? null,
          member_profile_id: params.member_profile_id ?? null,
          log_date: params.log_date,
          slot_name: params.slot_name ?? null,
          meal_id: params.meal_id ?? null,
          item_type: params.item_type ?? null,
          item_id: params.item_id ?? null,
          item_name: params.item_name,
          servings_logged: params.servings_logged,
          calories_per_serving: params.calories_per_serving,
          protein_per_serving: params.protein_per_serving,
          fat_per_serving: params.fat_per_serving,
          carbs_per_serving: params.carbs_per_serving,
          micronutrients: params.micronutrients ?? {},
          is_private: params.is_private ?? false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      const householdId = membership?.household_id
      const memberId = data.member_user_id ?? data.member_profile_id ?? undefined
      queryClient.invalidateQueries({ queryKey: ['food-logs', householdId, data.log_date, memberId] })
    },
  })
}

/**
 * Updates the servings_logged (and optionally is_private) of an existing food log entry.
 */
export function useUpdateFoodLog() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async ({
      id,
      servings_logged,
      is_private,
    }: {
      id: string
      servings_logged: number
      is_private?: boolean
    }): Promise<FoodLog> => {
      const updates: Record<string, unknown> = { servings_logged }
      if (is_private !== undefined) updates.is_private = is_private

      const { data, error } = await supabase
        .from('food_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      const householdId = membership?.household_id
      const memberId = data.member_user_id ?? data.member_profile_id ?? undefined
      queryClient.invalidateQueries({ queryKey: ['food-logs', householdId, data.log_date, memberId] })
    },
  })
}

/**
 * Deletes a food log entry by id.
 */
export function useDeleteFoodLog() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('food_logs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: ['food-logs', householdId] })
    },
  })
}

/**
 * Returns all food log entries for the given household and date, across all members.
 * Used by usePortionSuggestions to gather per-member logs without N hook calls.
 */
export function useHouseholdDayLogs(
  householdId: string | undefined,
  logDate: string | undefined,
) {
  return useQuery({
    queryKey: ['food-logs', householdId, logDate],
    queryFn: async (): Promise<FoodLog[]> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('household_id', householdId!)
        .eq('log_date', logDate!)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId && !!logDate,
  })
}

/**
 * Inserts multiple food log entries in a single batch (for "Log all as planned").
 */
export function useBulkInsertFoodLogs() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (rows: InsertFoodLogParams[]): Promise<FoodLog[]> => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const inserts = rows.map(params => ({
        household_id: householdId,
        logged_by: userId,
        member_user_id: params.member_user_id ?? null,
        member_profile_id: params.member_profile_id ?? null,
        log_date: params.log_date,
        slot_name: params.slot_name ?? null,
        meal_id: params.meal_id ?? null,
        item_type: params.item_type ?? null,
        item_id: params.item_id ?? null,
        item_name: params.item_name,
        servings_logged: params.servings_logged,
        calories_per_serving: params.calories_per_serving,
        protein_per_serving: params.protein_per_serving,
        fat_per_serving: params.fat_per_serving,
        carbs_per_serving: params.carbs_per_serving,
        micronutrients: params.micronutrients ?? {},
        is_private: params.is_private ?? false,
      }))

      const { data, error } = await supabase
        .from('food_logs')
        .insert(inserts)
        .select()

      if (error) throw error
      return data ?? []
    },
    onSuccess: (data) => {
      const householdId = membership?.household_id
      // Invalidate all food-logs queries for this household (date may vary across rows)
      queryClient.invalidateQueries({ queryKey: ['food-logs', householdId] })
      // Also invalidate per-date keys found in the inserted rows
      const dates = [...new Set(data.map(r => r.log_date))]
      for (const date of dates) {
        queryClient.invalidateQueries({ queryKey: ['food-logs', householdId, date] })
      }
    },
  })
}
