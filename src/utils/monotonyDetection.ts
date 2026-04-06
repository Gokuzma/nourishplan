export interface SlotEntry {
  recipeId: string
  recipeName: string
  weekStart: string  // YYYY-MM-DD
  dayIndex: number
}

export interface MonotonyWarning {
  recipeId: string
  recipeName: string
  count: number
}

/**
 * Detect recipes that appear more than `threshold` times
 * in a rolling 2-week window (current week + prior week).
 * Uses weekStart strings for filtering — currentWeekStart minus 7 days
 * gives the prior week's start.
 */
export function detectMonotony(
  slots: SlotEntry[],
  currentWeekStart: string,
  threshold = 2,
): MonotonyWarning[] {
  // Compute prior week start: subtract 7 days from currentWeekStart
  const [y, m, d] = currentWeekStart.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() - 7)
  const priorWeekStart = date.toISOString().slice(0, 10)

  // Filter slots to only those in the 2-week window (weekStart >= priorWeekStart)
  const relevant = slots.filter(s => s.weekStart >= priorWeekStart)

  // Count occurrences per recipe
  const counts = new Map<string, { name: string; count: number }>()
  for (const slot of relevant) {
    const existing = counts.get(slot.recipeId)
    if (existing) {
      existing.count++
    } else {
      counts.set(slot.recipeId, { name: slot.recipeName, count: 1 })
    }
  }

  // Return recipes exceeding threshold
  return [...counts.entries()]
    .filter(([, v]) => v.count > threshold)
    .map(([id, v]) => ({ recipeId: id, recipeName: v.name, count: v.count }))
}
