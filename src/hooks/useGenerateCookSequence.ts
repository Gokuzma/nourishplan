import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'

interface SequenceItem {
  step_id: string
  recipe_id: string
  owner_member_id: string | null
}

interface CookSequenceParams {
  cookSessionId: string
  recipeIds: string[]
  mode: 'combined' | 'per-recipe'
  memberIds: string[]
}

interface CookSequenceResponse {
  success: boolean
  sequence?: SequenceItem[]
  equipment_conflicts?: string[]
  total_duration_minutes?: number
  error?: string
}

/**
 * Mutation hook invoking the generate-cook-sequence edge function (Phase 23 / PREP-02).
 * Wires into CookModePage.handleStartCook for multi-recipe combined or per-recipe cook sessions.
 * On success, returns the AI-ordered sequence. On failure, throws — caller silently falls back
 * to per-recipe concatenation per CONTEXT.md D-05.
 */
export function useGenerateCookSequence() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useMutation({
    mutationFn: async (params: CookSequenceParams): Promise<CookSequenceResponse> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase.functions.invoke('generate-cook-sequence', {
        body: {
          cookSessionId: params.cookSessionId,
          householdId,
          recipeIds: params.recipeIds,
          mode: params.mode,
          memberIds: params.memberIds,
        },
      })
      if (error) throw error

      const response = data as CookSequenceResponse
      if (!response.success) {
        throw new Error(response.error ?? 'Cook sequence generation failed')
      }
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.detail(variables.cookSessionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.active(householdId) })
    },
  })
}
