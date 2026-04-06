import type { NutritionTarget } from '../types/database'
import type { SlotWithMeal } from '../hooks/useMealPlan'

export interface MemberIdentity {
  id: string
  type: 'user' | 'profile'
  name: string
}

export interface WeeklyGap {
  memberId: string
  memberName: string
  nutrient: string
  weeklyTarget: number
  weeklyActual: number
  percentOfTarget: number
}

export function calcWeeklyGaps(
  slots: SlotWithMeal[],
  targets: NutritionTarget[],
  members: MemberIdentity[],
  threshold = 0.9,
): WeeklyGap[] {
  const gaps: WeeklyGap[] = []

  // Compute weekly nutrition totals from all slots
  let totalCalories = 0
  let totalProtein = 0
  let totalFat = 0
  let totalCarbs = 0

  for (const slot of slots) {
    if (!slot.meals) continue
    for (const item of slot.meals.meal_items) {
      const factor = item.quantity_grams / 100
      totalCalories += item.calories_per_100g * factor
      totalProtein += item.protein_per_100g * factor
      totalFat += item.fat_per_100g * factor
      totalCarbs += item.carbs_per_100g * factor
    }
  }

  for (const member of members) {
    const target = targets.find(t => {
      if (member.type === 'user') return t.user_id === member.id
      return t.member_profile_id === member.id
    })

    if (!target || target.calories == null) continue

    const weeklyCaloriesTarget = target.calories * 7
    const weeklyProteinTarget = (target.protein_g ?? 0) * 7
    const weeklyFatTarget = (target.fat_g ?? 0) * 7
    const weeklyCarbsTarget = (target.carbs_g ?? 0) * 7

    const macros: { nutrient: string; actual: number; weeklyTarget: number }[] = [
      { nutrient: 'calories', actual: totalCalories, weeklyTarget: weeklyCaloriesTarget },
      { nutrient: 'protein', actual: totalProtein, weeklyTarget: weeklyProteinTarget },
      { nutrient: 'fat', actual: totalFat, weeklyTarget: weeklyFatTarget },
      { nutrient: 'carbs', actual: totalCarbs, weeklyTarget: weeklyCarbsTarget },
    ]

    for (const { nutrient, actual, weeklyTarget } of macros) {
      if (weeklyTarget <= 0) continue
      const percent = actual / weeklyTarget
      if (percent < threshold) {
        gaps.push({
          memberId: member.id,
          memberName: member.name,
          nutrient,
          weeklyTarget,
          weeklyActual: actual,
          percentOfTarget: percent,
        })
      }
    }
  }

  return gaps
}
