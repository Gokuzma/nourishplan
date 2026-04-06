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
    const [y, m, d] = currentWeekStart.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    date.setUTCDate(date.getUTCDate() - 7)
    const priorWeekStart = date.toISOString().slice(0, 10)

    const currentEntries: SlotEntry[] = slots
      .filter(s => s.meals != null)
      .map(s => ({
        recipeId: s.meal_id ?? s.meals!.id,
        recipeName: s.meals!.name,
        weekStart: currentWeekStart,
        dayIndex: s.day_index,
      }))

    const priorEntries: SlotEntry[] = priorWeekSlots
      .filter(s => s.meals != null)
      .map(s => ({
        recipeId: s.meal_id ?? s.meals!.id,
        recipeName: s.meals!.name,
        weekStart: priorWeekStart,
        dayIndex: s.day_index,
      }))

    return detectMonotony([...currentEntries, ...priorEntries], currentWeekStart)
  }, [slots, priorWeekSlots, currentWeekStart])
}
