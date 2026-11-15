import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import type { NutritionTarget } from '../types/database'
import { buildTargetUpsertPayload } from '../utils/mealPlan'
import { buildApplyPayload } from '../utils/nutritionProfile'
import type { MemberStats, SuggestedTargets } from '../utils/nutritionProfile'

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
      return (data ?? []) as unknown as NutritionTarget[]
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
      return data as unknown as NutritionTarget | null
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
      return data as unknown as NutritionTarget
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionTargets.list(params.householdId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionTargets.detail(params.householdId, params.memberId) })
    },
  })
}

function targetKeyColumns(householdId: string, memberId: string, memberType: 'user' | 'profile') {
  return {
    household_id: householdId,
    user_id: memberType === 'user' ? memberId : null,
    member_profile_id: memberType === 'profile' ? memberId : null,
  }
}

function conflictColumns(memberType: 'user' | 'profile') {
  return memberType === 'user' ? 'household_id,user_id' : 'household_id,member_profile_id'
}

/**
 * Saves a member's profile stats. Writes only the key and profile columns,
 * never calories, macros or micronutrients.
 */
export function useSaveMemberStats() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      householdId: string
      memberId: string
      memberType: 'user' | 'profile'
      stats: MemberStats & { notes: string | null }
    }): Promise<NutritionTarget> => {
      const { householdId, memberId, memberType, stats } = params
      const payload = { ...targetKeyColumns(householdId, memberId, memberType), ...stats }

      const { data, error } = await supabase
        .from('nutrition_targets')
        .upsert(payload, { onConflict: conflictColumns(memberType) })
        .select()
        .single()

      if (error) throw error

      if (memberType === 'profile' && stats.birth_date) {
        await supabase
          .from('member_profiles')
          .update({ birth_year: Number(stats.birth_date.slice(0, 4)) })
          .eq('id', memberId)
      }

      return data as unknown as NutritionTarget
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionTargets.list(params.householdId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionTargets.detail(params.householdId, params.memberId) })
      queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}

/**
 * Writes suggested calories, macros and micronutrients to a member's targets,
 * keeping their custom goals, other micronutrients and macro mode.
 */
export function useApplySuggestedTargets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      householdId: string
      memberId: string
      memberType: 'user' | 'profile'
      existing: NutritionTarget | null
      suggestion: SuggestedTargets
    }): Promise<NutritionTarget> => {
      const { householdId, memberId, memberType, existing, suggestion } = params
      const payload = {
        ...targetKeyColumns(householdId, memberId, memberType),
        ...buildApplyPayload(existing, suggestion),
      }

      const { data, error } = await supabase
        .from('nutrition_targets')
        .upsert(payload, { onConflict: conflictColumns(memberType) })
        .select()
        .single()

      if (error) throw error
      return data as unknown as NutritionTarget
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionTargets.list(params.householdId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.nutritionTargets.detail(params.householdId, params.memberId) })
    },
  })
}
