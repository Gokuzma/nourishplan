import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'

interface ImportRecipeResponse {
  success: boolean
  recipeId?: string
  error?: string
}

/**
 * Mutation hook invoking the import-recipe edge function.
 * Accepts a URL or raw recipe text, returns the created recipe id.
 * Invalidates the household recipes list on success so the new row appears.
 */
export function useImportRecipe() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useMutation({
    mutationFn: async ({ input }: { input: string }): Promise<string> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase.functions.invoke('import-recipe', {
        body: { input },
      })
      if (error) throw error

      const response = data as ImportRecipeResponse
      if (!response.success || !response.recipeId) {
        throw new Error(response.error ?? 'Import failed')
      }
      return response.recipeId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
