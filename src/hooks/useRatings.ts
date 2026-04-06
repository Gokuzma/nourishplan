import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'

export function useUnratedCookedMeals(
  householdId: string | undefined,
  userId: string | undefined,
  today: string | undefined
) {
  return useQuery({
    queryKey: ['unrated-cooked', householdId, userId, today] as const,
    queryFn: async (): Promise<{ recipeId: string; recipeName: string }[]> => {
      const { data: spendLogs, error: spendError } = await supabase
        .from('spend_logs')
        .select('recipe_id')
        .eq('household_id', householdId!)
        .eq('logged_by', userId!)
        .eq('log_date', today!)
        .eq('source', 'cook')
        .not('recipe_id', 'is', null)

      if (spendError) throw spendError
      if (!spendLogs || spendLogs.length === 0) return []

      const recipeIds = [...new Set(spendLogs.map(l => l.recipe_id as string))]

      const { data: existingRatings, error: ratingsError } = await supabase
        .from('recipe_ratings')
        .select('recipe_id')
        .eq('rated_by_user_id', userId!)
        .eq('rated_at', today!)
        .in('recipe_id', recipeIds)

      if (ratingsError) throw ratingsError

      const ratedIds = new Set((existingRatings ?? []).map(r => r.recipe_id as string))
      const unratedIds = recipeIds.filter(id => !ratedIds.has(id))
      if (unratedIds.length === 0) return []

      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id, name')
        .in('id', unratedIds)

      if (recipesError) throw recipesError

      return (recipes ?? []).map(r => ({ recipeId: r.id, recipeName: r.name }))
    },
    enabled: !!householdId && !!userId && !!today,
  })
}

export function useRateMeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      householdId: string
      recipeId: string
      recipeName: string
      rating: number
      userId: string
    }) => {
      const today = new Date().toISOString().slice(0, 10)
      const { error } = await supabase
        .from('recipe_ratings')
        .insert({
          household_id: params.householdId,
          recipe_id: params.recipeId,
          recipe_name: params.recipeName,
          rated_by_user_id: params.userId,
          rating: params.rating,
          rated_at: today,
        })
      if (error) throw error
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['unrated-cooked'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.list(params.householdId) })
    },
  })
}
