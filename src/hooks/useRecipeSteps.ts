import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import { parseStepsSafely } from '../utils/recipeSteps'
import type { Recipe, RecipeStep } from '../types/database'

interface RecipeStepsData {
  id: string
  instructions: RecipeStep[] | null
  freezer_friendly: boolean | null
  freezer_shelf_life_weeks: number | null
}

export function useRecipeSteps(recipeId: string | undefined) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useQuery({
    queryKey: queryKeys.recipeSteps.detail(recipeId),
    queryFn: async (): Promise<RecipeStepsData | null> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId!)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const recipe = data as Recipe
      return {
        id: recipe.id,
        instructions: parseStepsSafely(recipe.instructions),
        freezer_friendly: recipe.freezer_friendly,
        freezer_shelf_life_weeks: recipe.freezer_shelf_life_weeks,
      }
    },
    enabled: !!householdId && !!recipeId,
  })
}

export function useUpdateRecipeSteps() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useMutation({
    mutationFn: async (params: { recipeId: string; steps: RecipeStep[] }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { error } = await db
        .from('recipes')
        .update({ instructions: params.steps })
        .eq('id', params.recipeId)
      if (error) throw error
      return params.steps
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipeSteps.detail(variables.recipeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(variables.recipeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) })
    },
  })
}

interface RegenerateParams {
  recipeId: string
  recipeName: string
  servings: number
  ingredientsSnapshot: { name: string; quantity_grams: number }[]
  existingSteps?: RecipeStep[]
  notes?: string | null
}

interface RegenerateResponse {
  success: boolean
  instructions?: RecipeStep[]
  freezer_friendly?: boolean
  freezer_shelf_life_weeks?: number | null
  uncertain_user_additions?: { previous_step_text: string; reason: string; suggested_action: 'remove' | 'keep_as_note' }[]
  error?: string
}

export function useRegenerateRecipeSteps() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useMutation({
    mutationFn: async (params: RegenerateParams): Promise<RegenerateResponse> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')
      const { data, error } = await supabase.functions.invoke('generate-recipe-steps', {
        body: {
          recipeId: params.recipeId,
          householdId,
          recipeName: params.recipeName,
          servings: params.servings,
          ingredientsSnapshot: params.ingredientsSnapshot,
          existingSteps: params.existingSteps,
          notes: params.notes,
        },
      })
      if (error) throw error
      const response = data as RegenerateResponse
      if (!response.success) {
        throw new Error(response.error ?? 'Step regeneration failed')
      }
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipeSteps.detail(variables.recipeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(variables.recipeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) })
    },
  })
}
