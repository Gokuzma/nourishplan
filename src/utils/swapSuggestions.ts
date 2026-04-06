import type { SwapSuggestion } from '../components/plan/NutritionGapCard'
import type { WeeklyGap } from './nutritionGaps'
import type { SlotWithMeal } from '../hooks/useMealPlan'
import type { Meal, MealItem } from '../types/database'
import { calcIngredientNutrition, calcMealNutrition } from './nutrition'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function calcSlotNutrient(slot: SlotWithMeal, nutrient: string): number {
  if (!slot.meals || !slot.meals.meal_items.length) return 0
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
  const totals = calcMealNutrition(items)
  return totals[nutrient as keyof typeof totals] ?? 0
}

function calcMealNutrient(meal: Meal & { meal_items: MealItem[] }, nutrient: string): number {
  if (!meal.meal_items.length) return 0
  const items = meal.meal_items.map(item => ({
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
  const totals = calcMealNutrition(items)
  return totals[nutrient as keyof typeof totals] ?? 0
}

function deriveDayName(weekStart: string, dayIndex: number): string {
  const [year, month, day] = weekStart.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + dayIndex))
  return DAY_NAMES[date.getUTCDay()]
}

export function computeSwapSuggestions(
  gaps: WeeklyGap[],
  slots: SlotWithMeal[],
  allMeals: (Meal & { meal_items: MealItem[] })[],
  weekStart: string,
  _weekStartDay: number,
): (SwapSuggestion & { mealId: string })[] {
  if (gaps.length === 0) return []

  const occupiedSlots = slots.filter(s => !s.is_locked && s.meal_id != null)
  if (occupiedSlots.length === 0) return []

  const mealIdsInPlan = new Set(slots.filter(s => s.meal_id != null).map(s => s.meal_id!))

  const suggestions: (SwapSuggestion & { mealId: string })[] = []

  for (const gap of gaps) {
    const nutrient = gap.nutrient

    let bestGain = 0
    let bestSlot: SlotWithMeal | null = null
    let bestCandidate: (Meal & { meal_items: MealItem[] }) | null = null

    for (const slot of occupiedSlots) {
      const currentValue = calcSlotNutrient(slot, nutrient)

      for (const candidate of allMeals) {
        if (mealIdsInPlan.has(candidate.id)) continue

        const candidateValue = calcMealNutrient(candidate, nutrient)
        const gain = candidateValue - currentValue

        if (gain > bestGain) {
          bestGain = gain
          bestSlot = slot
          bestCandidate = candidate
        }
      }
    }

    if (bestSlot && bestCandidate && bestGain > 0) {
      suggestions.push({
        memberId: gap.memberId,
        memberName: gap.memberName,
        dayIndex: bestSlot.day_index,
        dayName: deriveDayName(weekStart, bestSlot.day_index),
        slotName: bestSlot.slot_name,
        recipeName: bestCandidate.name,
        nutrientGain: Math.round(bestGain * 10) / 10,
        nutrient: gap.nutrient,
        mealId: bestCandidate.id,
      })
    }
  }

  return suggestions
}
