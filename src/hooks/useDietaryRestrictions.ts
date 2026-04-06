import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import type { DietaryRestriction } from '../types/database'

export function useRestrictions(
  householdId: string | undefined,
  memberId: string | undefined,
  memberType: 'user' | 'profile'
) {
  return useQuery({
    queryKey: queryKeys.restrictions.forMember(householdId, memberId),
    queryFn: async (): Promise<DietaryRestriction | null> => {
      const column = memberType === 'user' ? 'member_user_id' : 'member_profile_id'
      const { data, error } = await supabase
        .from('dietary_restrictions')
        .select('*')
        .eq('household_id', householdId!)
        .eq(column, memberId!)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
    enabled: !!householdId && !!memberId,
  })
}

interface SaveRestrictionsParams {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  predefined: string[]
  customEntries: string[]
}

export function useSaveRestrictions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: SaveRestrictionsParams) => {
      const { householdId, memberId, memberType, predefined, customEntries } = params
      const row: Record<string, unknown> = {
        household_id: householdId,
        predefined,
        custom_entries: customEntries,
        updated_at: new Date().toISOString(),
      }
      if (memberType === 'user') {
        row.member_user_id = memberId
      } else {
        row.member_profile_id = memberId
      }
      const conflictColumn = memberType === 'user' ? 'member_user_id' : 'member_profile_id'
      const { data, error } = await supabase
        .from('dietary_restrictions')
        .upsert(row, { onConflict: `household_id,${conflictColumn}` })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, params) => {
      const { householdId, memberId, memberType, predefined, customEntries } = params
      queryClient.invalidateQueries({ queryKey: ['restrictions', householdId] })
      supabase.functions
        .invoke('classify-restrictions', {
          body: { memberId, memberType, restrictions: predefined, customEntries, householdId },
        })
        .catch(() => {})
    },
  })
}
