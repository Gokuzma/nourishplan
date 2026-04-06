import { useQuery, useMemo } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { WontEatEntry } from '../types/database'
import type { SlotWithMeal } from './useMealPlan'

export interface SlotViolation {
  slotId: string
  dayIndex: number
  mealType: string
  recipeName: string
  memberName: string
  memberId: string
  foodName: string
  strength: 'dislikes' | 'refuses' | 'allergy'
}

interface MemberInfo {
  id: string
  name: string
}

export function usePlanViolations(
  householdId: string | undefined,
  slots: SlotWithMeal[],
  members: MemberInfo[],
) {
  const { data: wontEatEntries = [] } = useQuery({
    queryKey: ['wont-eat', householdId],
    queryFn: async (): Promise<WontEatEntry[]> => {
      const { data, error } = await supabase
        .from('wont_eat_entries')
        .select('*')
        .eq('household_id', householdId!)
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })

  const violations = useMemo<SlotViolation[]>(() => {
    if (!wontEatEntries.length || !slots.length || !members.length) return []

    const result: SlotViolation[] = []

    for (const slot of slots) {
      if (!slot.meals || !slot.meals.meal_items.length) continue

      for (const rawItem of slot.meals.meal_items) {
        const item = rawItem as typeof rawItem & { item_name?: string }
        const itemName = (item.item_name ?? '').toLowerCase()
        if (!itemName) continue

        for (const member of members) {
          const memberEntries = wontEatEntries.filter(
            e => e.member_user_id === member.id || e.member_profile_id === member.id
          )
          for (const entry of memberEntries) {
            if (itemName.includes(entry.food_name.toLowerCase())) {
              result.push({
                slotId: slot.id,
                dayIndex: slot.day_index,
                mealType: slot.slot_name,
                recipeName: slot.meals.name,
                memberName: member.name,
                memberId: member.id,
                foodName: entry.food_name,
                strength: entry.strength,
              })
            }
          }
        }
      }
    }

    return result
  }, [wontEatEntries, slots, members])

  const hasAllergyViolation = violations.some(v => v.strength === 'allergy')

  return { violations, hasAllergyViolation }
}
