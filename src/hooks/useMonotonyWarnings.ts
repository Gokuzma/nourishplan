import { useMemo } from 'react'
import { detectMonotony } from '../utils/monotonyDetection'
import type { MonotonyWarning, SlotEntry } from '../utils/monotonyDetection'
import type { SlotWithMeal } from './useMealPlan'

export function useMonotonyWarnings(
  slots: SlotWithMeal[],
  currentWeekStart: string,
  priorWeekSlots: SlotWithMeal[],
): MonotonyWarning[] {
  return useMemo(() => {
    const allSlots = [...slots, ...priorWeekSlots]
    const entries: SlotEntry[] = allSlots
      .filter(s => s.meals != null)
      .map(s => ({
        recipeId: s.meal_id ?? s.meals!.id,
        recipeName: s.meals!.name,
        weekStart: currentWeekStart,
        dayIndex: s.day_index,
      }))

    return detectMonotony(entries, currentWeekStart)
  }, [slots, priorWeekSlots, currentWeekStart])
}
