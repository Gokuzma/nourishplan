import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import type { NutritionTarget } from '../types/database'
import { buildTargetUpsertPayload } from '../utils/mealPlan'

/**
 * Returns all nutrition targets for the given household.
 */
export function useNutritionTargets(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.nutritionTargets.list(householdId),
    queryFn: async (): Promise<NutritionTarget[]> => {
      const { data, error } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('household_id', householdId!)

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}

/**
 * Returns a single member's nutrition target.
 * memberType: 'user' for auth users, 'profile' for managed member profiles.
 * Returns null if no target has been set yet.
 */
export function useNutritionTarget(
  householdId: string | undefined,
  memberId: string | undefined,
  memberType: 'user' | 'profile',
) {
  return useQuery({
    queryKey: queryKeys.nutritionTargets.detail(householdId, memberId),
    queryFn: async (): Promise<NutritionTarget | null> => {
      const column = memberType === 'user' ? 'user_id' : 'member_profile_id'
      const { data, error } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('household_id', householdId!)
        .eq(column, memberId!)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!householdId && !!memberId,
  })
}

/**
 * Upserts a nutrition target for a household member.
 * Pass householdId and either userId (auth user) or memberProfileId (managed profile).
 */
export function useUpsertNutritionTargets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      householdId: string
      userId?: string
      memberProfileId?: string
      memberId: string
      calories?: number
      protein_g?: number
      carbs_g?: number
      fat_g?: number
      micronutrients?: Record<string, number>
      custom_goals?: Record<string, number>
      macro_mode?: 'grams' | 'percent'
    }): Promise<NutritionTarget> => {
      const { memberId, macro_mode, ...rest } = params
      const payload = { ...buildTargetUpsertPayload(rest), ...(macro_mode != null ? { macro_mode } : {}) }

      const conflictColumn = params.userId
        ? 'household_id,user_id'
        : 'household_id,member_profile_id'

      const { data, error } = await supabase
        .from('nutrition_targets')
        .upsert(payload, { onConflict: conflictColumn })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionTargets.list(params.householdId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionTargets.detail(params.householdId, params.memberId) })
    },
  })
}
