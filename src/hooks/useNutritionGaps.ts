import { useMemo } from 'react'
import { useHousehold, useHouseholdMembers, useMemberProfiles } from './useHousehold'
import { useMealPlanSlots } from './useMealPlan'
import { useNutritionTargets } from './useNutritionTargets'
import { useLatestGeneration } from './usePlanGeneration'
import { calcWeeklyGaps } from '../utils/nutritionGaps'
import type { MemberIdentity } from '../utils/nutritionGaps'

export function useNutritionGaps(planId: string | undefined) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  const { data: slots } = useMealPlanSlots(planId)
  const { data: targets } = useNutritionTargets(householdId)
  const { data: members } = useHouseholdMembers()
  const { data: profiles } = useMemberProfiles()
  const { data: latestGen } = useLatestGeneration(planId)

  const gaps = useMemo(() => {
    if (!slots || !targets || !members) return []

    const memberIdentities: MemberIdentity[] = [
      ...(members).map(m => ({
        id: m.user_id,
        type: 'user' as const,
        name: m.profiles?.display_name ?? m.user_id.slice(0, 8),
      })),
      ...(profiles ?? []).map(p => ({
        id: p.id,
        type: 'profile' as const,
        name: p.name,
      })),
    ]

    return calcWeeklyGaps(slots, targets, memberIdentities)
  }, [slots, targets, members, profiles])

  return { gaps, hasGeneration: !!latestGen, latestGeneration: latestGen }
}
