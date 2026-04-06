import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import type { AIRecipeTag, RecipeRating } from '../types/database'

export function useAITags(recipeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.aiTags.forRecipe(recipeId),
    queryFn: async (): Promise<AIRecipeTag[]> => {
      const { data, error } = await supabase
        .from('ai_recipe_tags')
        .select('*')
        .eq('recipe_id', recipeId!)
        .order('confidence', { ascending: false, nullsFirst: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!recipeId,
  })
}

export function useHouseholdInsights(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.insights.household(householdId),
    queryFn: async (): Promise<{ ratings: RecipeRating[]; tags: AIRecipeTag[] }> => {
      const [ratingsRes, tagsRes] = await Promise.all([
        supabase
          .from('recipe_ratings')
          .select('*')
          .eq('household_id', householdId!)
          .order('rated_at', { ascending: false })
          .limit(100),
        supabase
          .from('ai_recipe_tags')
          .select('*')
          .eq('household_id', householdId!),
      ])
      if (ratingsRes.error) throw ratingsRes.error
      if (tagsRes.error) throw tagsRes.error
      return { ratings: ratingsRes.data ?? [], tags: tagsRes.data ?? [] }
    },
    enabled: !!householdId,
  })
}

export function useTriggerAnalysis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ householdId }: { householdId: string }) => {
      const { data, error } = await supabase.functions.invoke('analyze-ratings', {
        body: { householdId },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tags'] })
      queryClient.invalidateQueries({ queryKey: ['insights'] })
    },
  })
}
