import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import type { MemberScheduleSlot, MemberScheduleException, ScheduleStatus } from '../types/database'
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
      return (data ?? []) as unknown as MemberScheduleSlot[]
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
          const row: {
            household_id: string
            day_of_week: number
            slot_name: string
            status: ScheduleStatus
            updated_at: string
            member_user_id?: string
            member_profile_id?: string
          } = {
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

export function useScheduleExceptions(householdId: string | undefined, weekStart: string) {
  return useQuery({
    queryKey: queryKeys.schedule.exceptionsForWeek(householdId, weekStart),
    queryFn: async (): Promise<MemberScheduleException[]> => {
      const { data, error } = await supabase
        .from('member_schedule_exceptions')
        .select('*')
        .eq('household_id', householdId!)
        .eq('week_start', weekStart)
      if (error) throw error
      return (data ?? []) as unknown as MemberScheduleException[]
    },
    enabled: !!householdId && !!weekStart,
  })
}

export interface DayExceptionEntry {
  memberId: string
  memberType: 'user' | 'profile'
  slotName: string
  status: ScheduleStatus
}

interface SaveDayExceptionsParams {
  householdId: string
  weekStart: string
  dayOfWeek: number
  /** Members whose exception rows for this day are being replaced. */
  members: { memberId: string; memberType: 'user' | 'profile' }[]
  /** Rows to write — only statuses that differ from the member's base pattern. */
  entries: DayExceptionEntry[]
}

/**
 * Replaces one day's schedule exceptions for the given members:
 * deletes their existing rows for (week, day), then inserts the diffs.
 * Delete+insert because the partial unique indexes don't work with onConflict.
 */
export function useSaveDayScheduleExceptions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: SaveDayExceptionsParams) => {
      const { householdId, weekStart, dayOfWeek, members, entries } = params
      const userIds = members.filter(m => m.memberType === 'user').map(m => m.memberId)
      const profileIds = members.filter(m => m.memberType === 'profile').map(m => m.memberId)

      if (userIds.length > 0) {
        const { error } = await supabase
          .from('member_schedule_exceptions')
          .delete()
          .eq('household_id', householdId)
          .eq('week_start', weekStart)
          .eq('day_of_week', dayOfWeek)
          .in('member_user_id', userIds)
        if (error) throw error
      }
      if (profileIds.length > 0) {
        const { error } = await supabase
          .from('member_schedule_exceptions')
          .delete()
          .eq('household_id', householdId)
          .eq('week_start', weekStart)
          .eq('day_of_week', dayOfWeek)
          .in('member_profile_id', profileIds)
        if (error) throw error
      }

      if (entries.length > 0) {
        const rows = entries.map(entry => ({
          household_id: householdId,
          week_start: weekStart,
          day_of_week: dayOfWeek,
          slot_name: entry.slotName,
          status: entry.status,
          ...(entry.memberType === 'user'
            ? { member_user_id: entry.memberId }
            : { member_profile_id: entry.memberId }),
        }))
        const { error } = await supabase
          .from('member_schedule_exceptions')
          .insert(rows)
        if (error) throw error
      }
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-exceptions', params.householdId] })
    },
  })
}

export function useHouseholdSchedules(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.schedule.forHousehold(householdId),
    queryFn: async (): Promise<MemberScheduleSlot[]> => {
      const { data, error } = await supabase
        .from('member_schedule_slots')
        .select('*')
        .eq('household_id', householdId!)
      if (error) throw error
      return (data ?? []) as unknown as MemberScheduleSlot[]
    },
    enabled: !!householdId,
  })
}
