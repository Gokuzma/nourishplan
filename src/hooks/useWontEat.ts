import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import type { WontEatEntry } from '../types/database'

export function useWontEatEntries(
  householdId: string | undefined,
  memberId: string | undefined,
  memberType: 'user' | 'profile'
) {
  return useQuery({
    queryKey: queryKeys.wontEat.forMember(householdId, memberId),
    queryFn: async (): Promise<WontEatEntry[]> => {
      const column = memberType === 'user' ? 'member_user_id' : 'member_profile_id'
      const { data, error } = await supabase
        .from('wont_eat_entries')
        .select('*')
        .eq('household_id', householdId!)
        .eq(column, memberId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId && !!memberId,
  })
}

interface AddWontEatParams {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  foodName: string
}

export function useAddWontEat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: AddWontEatParams) => {
      const { householdId, memberId, memberType, foodName } = params
      const row: Record<string, unknown> = {
        household_id: householdId,
        food_name: foodName,
        strength: 'dislikes',
        source: 'manual',
      }
      if (memberType === 'user') {
        row.member_user_id = memberId
      } else {
        row.member_profile_id = memberId
      }
      const { data, error } = await supabase
        .from('wont_eat_entries')
        .insert(row)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['wont-eat', params.householdId] })
    },
  })
}

interface UpdateStrengthParams {
  id: string
  strength: 'dislikes' | 'refuses' | 'allergy'
  householdId: string
}

export function useUpdateWontEatStrength() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: UpdateStrengthParams) => {
      const { id, strength } = params
      const { data, error } = await supabase
        .from('wont_eat_entries')
        .update({ strength })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['wont-eat', params.householdId] })
    },
  })
}

interface RemoveWontEatParams {
  id: string
  householdId: string
}

export function useRemoveWontEat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: RemoveWontEatParams) => {
      const { error } = await supabase
        .from('wont_eat_entries')
        .delete()
        .eq('id', params.id)
      if (error) throw error
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['wont-eat', params.householdId] })
    },
  })
}
