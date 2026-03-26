import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import type { CustomFood } from '../types/database'

interface CreateCustomFoodInput {
  name: string
  serving_description: string | null
  serving_grams: number
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  fiber_per_100g?: number | null
  sugar_per_100g?: number | null
  sodium_per_100g?: number | null
  micronutrients?: Record<string, number>
}

/**
 * Returns all non-deleted custom foods for the current user's household,
 * ordered by name.
 */
export function useCustomFoods() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: queryKeys.customFoods.list(householdId),
    queryFn: async (): Promise<CustomFood[]> => {
      const { data, error } = await supabase
        .from('custom_foods')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}

/**
 * Creates a new custom food for the current user's household.
 */
export function useCreateCustomFood() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (input: CreateCustomFoodInput): Promise<CustomFood> => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase
        .from('custom_foods')
        .insert({
          ...input,
          household_id: householdId,
          created_by: userId,
          micronutrients: input.micronutrients ?? {},
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-foods'] })
    },
  })
}

/**
 * Updates an existing custom food by id.
 */
export function useUpdateCustomFood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<CreateCustomFoodInput>
    }): Promise<CustomFood> => {
      const { data, error } = await supabase
        .from('custom_foods')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-foods'] })
    },
  })
}

/**
 * Deletes a custom food by id.
 */
export function useDeleteCustomFood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('custom_foods')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-foods'] })
    },
  })
}
