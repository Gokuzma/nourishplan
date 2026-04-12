import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'

// D-09: user overrides to the AI-suggested freezer flag persist canonically.
// Passing value=null means "Auto" — clears the override and lets the next AI
// regeneration re-classify (part of the merge-intent flow in generate-recipe-steps).

export function useToggleFreezerFriendly() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useMutation({
    mutationFn: async (params: { recipeId: string; value: boolean | null }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { error } = await db
        .from('recipes')
        .update({ freezer_friendly: params.value })
        .eq('id', params.recipeId)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipeSteps.detail(variables.recipeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(variables.recipeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) })
    },
  })
}

export function useUpdateShelfLifeWeeks() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useMutation({
    mutationFn: async (params: { recipeId: string; weeks: number | null }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { error } = await db
        .from('recipes')
        .update({ freezer_shelf_life_weeks: params.weeks })
        .eq('id', params.recipeId)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipeSteps.detail(variables.recipeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(variables.recipeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) })
    },
  })
}
