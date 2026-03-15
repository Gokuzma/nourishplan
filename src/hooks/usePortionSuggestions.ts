import { useMemo } from 'react'
import { useNutritionTargets } from './useNutritionTargets'
import { useHouseholdDayLogs } from './useFoodLogs'
import { useHouseholdMembers, useMemberProfiles } from './useHousehold'
import { calcPortionSuggestions } from '../utils/portionSuggestions'
import type { MacroSummary } from '../types/database'
import type { MemberInput, PortionResult } from '../utils/portionSuggestions'

/**
 * Computes portion suggestions for all household members for a given dish.
 *
 * Fetches nutrition targets and today's food logs for the full household, then
 * calls calcPortionSuggestions with the dish's calorie/macro data.
 *
 * TanStack Query keys include householdId and logDate — cache invalidation after
 * logging (via useInsertFoodLog/useBulkInsertFoodLogs) will automatically trigger
 * a recalculation.
 */
export function usePortionSuggestions(
  householdId: string | undefined,
  logDate: string,
  dishCaloriesPerServing: number,
  dishMacrosPerServing: MacroSummary,
  currentUserId: string,
): { data: PortionResult | null; isLoading: boolean } {
  const { data: targets, isLoading: targetsLoading } = useNutritionTargets(householdId)
  const { data: allLogs, isLoading: logsLoading } = useHouseholdDayLogs(householdId, logDate)
  const { data: householdMembers, isLoading: membersLoading } = useHouseholdMembers()
  const { data: memberProfiles, isLoading: profilesLoading } = useMemberProfiles()

  const isLoading = targetsLoading || logsLoading || membersLoading || profilesLoading

  const data = useMemo<PortionResult | null>(() => {
    if (!targets || !allLogs || !householdMembers) return null

    const members: MemberInput[] = []

    // Auth users (household members with profiles)
    for (const hm of householdMembers) {
      const target = targets.find(t => t.user_id === hm.user_id) ?? null
      const logsToday = allLogs.filter(l => l.member_user_id === hm.user_id)
      const name = hm.profiles?.display_name ?? hm.user_id.slice(0, 8)
      members.push({
        memberId: hm.user_id,
        memberName: name,
        memberType: 'user',
        target,
        logsToday,
      })
    }

    // Managed member profiles
    for (const profile of (memberProfiles ?? [])) {
      const target = targets.find(t => t.member_profile_id === profile.id) ?? null
      const logsToday = allLogs.filter(l => l.member_profile_id === profile.id)
      members.push({
        memberId: profile.id,
        memberName: profile.name,
        memberType: 'profile',
        target,
        logsToday,
      })
    }

    if (members.length === 0) return null

    return calcPortionSuggestions(members, dishCaloriesPerServing, dishMacrosPerServing, currentUserId)
  }, [targets, allLogs, householdMembers, memberProfiles, dishCaloriesPerServing, dishMacrosPerServing, currentUserId])

  return { data, isLoading }
}
