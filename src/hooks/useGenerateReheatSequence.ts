import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'

interface ReheatStepFromEdge {
  text: string
  duration_minutes: number
  is_active: boolean
  ingredients_used: string[]
  equipment: string[]
}

interface ReheatSequenceParams {
  recipeId: string
  storageHint: 'fridge' | 'freezer'
  servings?: number
}

interface ReheatSequenceResponse {
  success: boolean
  steps?: ReheatStepFromEdge[]
  error?: string
}

/**
 * Mutation hook invoking the generate-reheat-sequence edge function (Phase 23 / PREP-02).
 * Wires into CookModePage's flowMode === 'reheat' branch to produce AI-generated reheat steps.
 * On failure, throws — caller silently falls back to the existing hardcoded 3-step microwave
 * sequence per CONTEXT.md D-02. No cache invalidation needed (reheat data is ephemeral UI state,
 * not cached server state).
 */
export function useGenerateReheatSequence() {
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useMutation({
    mutationFn: async (params: ReheatSequenceParams): Promise<ReheatSequenceResponse> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase.functions.invoke('generate-reheat-sequence', {
        body: {
          recipeId: params.recipeId,
          householdId,
          storageHint: params.storageHint,
          servings: params.servings,
        },
      })
      if (error) throw error

      const response = data as ReheatSequenceResponse
      if (!response.success) {
        throw new Error(response.error ?? 'Reheat sequence generation failed')
      }
      return response
    },
  })
}
