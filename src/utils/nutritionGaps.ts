import type { NutritionTarget } from '../types/database'
import type { SlotWithMeal } from '../hooks/useMealPlan'
import { calcIngredientNutrition, calcMealNutrition } from './nutrition'

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

const DEFAULT_THRESHOLD = 0.9

function calcSlotNutrition(slot: SlotWithMeal) {
  if (!slot.meals || !slot.meals.meal_items.length) {
    return { calories: 0, protein: 0, fat: 0, carbs: 0 }
  }
  const items = slot.meals.meal_items.map(item => ({
    nutrition: calcIngredientNutrition(
      {
        calories: item.calories_per_100g,
        protein: item.protein_per_100g,
        fat: item.fat_per_100g,
        carbs: item.carbs_per_100g,
      },
      item.quantity_grams,
    ),
  }))
  return calcMealNutrition(items)
}

/**
 * Calculates weekly nutrition gaps per member per nutrient.
 * Returns only gaps where a member's weekly actual falls below threshold (default 90%) of their weekly target.
 * Weekly target = daily target * 7.
 * Slots are shared (not per-member) — each slot's nutrition counts for all members.
 */
export function calcWeeklyGaps(
  slots: SlotWithMeal[],
  targets: NutritionTarget[],
  members: MemberIdentity[],
  threshold: number = DEFAULT_THRESHOLD,
): WeeklyGap[] {
  const gaps: WeeklyGap[] = []

  const totalNutrition = slots.reduce(
    (acc, slot) => {
      const n = calcSlotNutrition(slot)
      return {
        calories: acc.calories + n.calories,
        protein: acc.protein + n.protein,
        fat: acc.fat + n.fat,
        carbs: acc.carbs + n.carbs,
      }
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  )

  for (const member of members) {
    const target = targets.find(t =>
      member.type === 'user' ? t.user_id === member.id : t.member_profile_id === member.id,
    )
    if (!target) continue

    // Skip member entirely if calories target is not set — targets are incomplete
    if (!target.calories || target.calories <= 0) continue

    const nutrients: { key: keyof typeof totalNutrition; targetField: keyof NutritionTarget; label: string }[] = [
      { key: 'calories', targetField: 'calories', label: 'calories' },
      { key: 'protein', targetField: 'protein_g', label: 'protein' },
      { key: 'fat', targetField: 'fat_g', label: 'fat' },
      { key: 'carbs', targetField: 'carbs_g', label: 'carbs' },
    ]

    for (const { key, targetField, label } of nutrients) {
      const dailyTarget = target[targetField] as number | null
      if (!dailyTarget || dailyTarget <= 0) continue

      const weeklyTarget = dailyTarget * 7
      const weeklyActual = totalNutrition[key]
      const percentOfTarget = weeklyActual / weeklyTarget

      if (percentOfTarget < threshold) {
        gaps.push({
          memberId: member.id,
          memberName: member.name,
          nutrient: label,
          weeklyTarget,
          weeklyActual,
          percentOfTarget,
        })
      }
    }
  }

  return gaps
}
