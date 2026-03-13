import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import type { Recipe, RecipeIngredient } from '../types/database'

/**
 * Returns all non-deleted recipes for the current user's household, ordered by name.
 */
export function useRecipes() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: ['recipes', householdId],
    queryFn: async (): Promise<Recipe[]> => {
      const { data, error } = await supabase
        .from('recipes')
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
 * Returns a single recipe by id.
 */
export function useRecipe(id: string) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async (): Promise<Recipe | null> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

/**
 * Returns all ingredients for a recipe, ordered by sort_order.
 */
export function useRecipeIngredients(recipeId: string) {
  return useQuery({
    queryKey: ['recipe-ingredients', recipeId],
    queryFn: async (): Promise<RecipeIngredient[]> => {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('sort_order')

      if (error) throw error
      return data ?? []
    },
    enabled: !!recipeId,
  })
}

/**
 * Creates a new recipe in the current user's household.
 */
export function useCreateRecipe() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async ({ name, servings }: { name: string; servings: number }): Promise<Recipe> => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase
        .from('recipes')
        .insert({ name, servings, household_id: householdId, created_by: userId })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

/**
 * Updates an existing recipe's name or servings.
 */
export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: { name?: string; servings?: number }
    }): Promise<Recipe> => {
      const { data, error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', id] })
    },
  })
}

/**
 * Soft-deletes a recipe by setting deleted_at.
 */
export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('recipes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

/**
 * Adds an ingredient to a recipe.
 */
export function useAddIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      recipe_id,
      ingredient_type,
      ingredient_id,
      quantity_grams,
      weight_state = 'raw',
      sort_order = 0,
    }: {
      recipe_id: string
      ingredient_type: 'food' | 'recipe'
      ingredient_id: string
      quantity_grams: number
      weight_state?: 'raw' | 'cooked'
      sort_order?: number
    }): Promise<RecipeIngredient> => {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert({ recipe_id, ingredient_type, ingredient_id, quantity_grams, weight_state, sort_order })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { recipe_id }) => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients', recipe_id] })
    },
  })
}

/**
 * Updates an ingredient row (quantity, weight_state, or sort_order).
 */
export function useUpdateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      recipe_id,
      updates,
    }: {
      id: string
      recipe_id: string
      updates: { quantity_grams?: number; weight_state?: 'raw' | 'cooked'; sort_order?: number }
    }): Promise<RecipeIngredient> => {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { recipe_id }) => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients', recipe_id] })
    },
  })
}

/**
 * Removes an ingredient from a recipe.
 */
export function useRemoveIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, recipe_id }: { id: string; recipe_id: string }): Promise<void> => {
      const { error } = await supabase.from('recipe_ingredients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { recipe_id }) => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients', recipe_id] })
    },
  })
}
