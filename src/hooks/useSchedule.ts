import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import type { MemberScheduleSlot, ScheduleStatus } from '../types/database'
import type { ScheduleGrid } from '../utils/schedule'
import { SLOT_NAMES } from '../utils/schedule'

export function useSchedule(
  householdId: string | undefined,
  memberId: string | undefined,
  memberType: 'user' | 'profile'
) {
  return useQuery({
    queryKey: queryKeys.schedule.forMember(householdId, memberId),
    queryFn: async (): Promise<MemberScheduleSlot[]> => {
      const column = memberType === 'user' ? 'member_user_id' : 'member_profile_id'
      const { data, error } = await supabase
        .from('member_schedule_slots')
        .select('*')
        .eq('household_id', householdId!)
        .eq(column, memberId!)
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId && !!memberId,
  })
}

interface SaveScheduleParams {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  grid: ScheduleGrid
}

export function useSaveSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: SaveScheduleParams) => {
      const { householdId, memberId, memberType, grid } = params
      const column = memberType === 'user' ? 'member_user_id' : 'member_profile_id'

      // Delete existing slots then insert — partial unique indexes don't work with onConflict
      const { error: delError } = await supabase
        .from('member_schedule_slots')
        .delete()
        .eq('household_id', householdId)
        .eq(column, memberId)
      if (delError) throw delError

      const days = [0, 1, 2, 3, 4, 5, 6]
      const rows = days.flatMap(day =>
        SLOT_NAMES.map(slot => {
          const status: ScheduleStatus = grid.get(`${day}:${slot}`) ?? 'prep'
          const row: Record<string, unknown> = {
            household_id: householdId,
            day_of_week: day,
            slot_name: slot,
            status,
            updated_at: new Date().toISOString(),
          }
          if (memberType === 'user') {
            row.member_user_id = memberId
          } else {
            row.member_profile_id = memberId
          }
          return row
        })
      )
      const { error } = await supabase
        .from('member_schedule_slots')
        .insert(rows)
      if (error) throw error
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['schedule', params.householdId] })
    },
  })
}
