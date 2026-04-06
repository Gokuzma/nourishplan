import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import type { Meal, MealItem } from '../types/database'

/**
 * Returns all non-deleted meals for the current user's household, ordered by name.
 */
export function useMeals() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: queryKeys.meals.list(householdId),
    queryFn: async (): Promise<Meal[]> => {
      const { data, error } = await supabase
        .from('meals')
        .select('*, meal_items(calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, quantity_grams)')
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
 * Returns a single meal by id with its meal_items joined.
 */
export function useMeal(id: string) {
  return useQuery({
    queryKey: queryKeys.meals.detail(id),
    queryFn: async (): Promise<(Meal & { meal_items: MealItem[] }) | null> => {
      const { data, error } = await supabase
        .from('meals')
        .select('*, meal_items(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as unknown as (Meal & { meal_items: MealItem[] }) | null
    },
    enabled: !!id,
  })
}

/**
 * Creates a new meal in the current user's household.
 */
export function useCreateMeal() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async ({ name }: { name: string }): Promise<Meal> => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase
        .from('meals')
        .insert({ name, household_id: householdId, created_by: userId })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.list(householdId) })
    },
  })
}

/**
 * Updates a meal's name.
 */
export function useUpdateMeal() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async ({
      id,
      name,
    }: {
      id: string
      name: string
    }): Promise<Meal> => {
      const { data, error } = await supabase
        .from('meals')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.list(householdId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.detail(id) })
    },
  })
}

/**
 * Deletes a meal by id.
 */
export function useDeleteMeal() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.list(householdId) })
    },
  })
}

/**
 * Adds a food or recipe item to a meal with macro snapshot captured at add-time.
 */
export function useAddMealItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      meal_id,
      item_type,
      item_id,
      item_name,
      quantity_grams,
      calories_per_100g,
      protein_per_100g,
      fat_per_100g,
      carbs_per_100g,
      sort_order = 0,
    }: {
      meal_id: string
      item_type: 'food' | 'recipe'
      item_id: string
      item_name: string
      quantity_grams: number
      calories_per_100g: number
      protein_per_100g: number
      fat_per_100g: number
      carbs_per_100g: number
      sort_order?: number
    }): Promise<MealItem> => {
      const { data, error } = await supabase
        .from('meal_items')
        .insert({
          meal_id,
          item_type,
          item_id,
          item_name,
          quantity_grams,
          calories_per_100g,
          protein_per_100g,
          fat_per_100g,
          carbs_per_100g,
          sort_order,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { meal_id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.detail(meal_id) })
    },
  })
}

/**
 * Updates the quantity_grams of a meal_item.
 */
export function useUpdateMealItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      quantity_grams,
    }: {
      id: string
      meal_id: string
      quantity_grams: number
    }): Promise<MealItem> => {
      const { data, error } = await supabase
        .from('meal_items')
        .update({ quantity_grams })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { meal_id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.detail(meal_id) })
    },
  })
}

/**
 * Removes a meal_item row from a meal.
 */
export function useRemoveMealItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; meal_id: string }): Promise<void> => {
      const { error } = await supabase.from('meal_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { meal_id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.detail(meal_id) })
    },
  })
}
