import type { FoodLog } from '../types/database';

/**
 * Filter plan slots to those with a meal assigned but no matching log entry.
 * Matching is done by meal_id. Slots without a meal (meal_id is null) are excluded.
 */
export function getUnloggedSlots<T extends { meal_id: string | null }>(
  slots: T[],
  existingLogs: Pick<FoodLog, 'meal_id'>[],
): T[] {
  const loggedMealIds = new Set(
    existingLogs.filter((l) => l.meal_id != null).map((l) => l.meal_id as string),
  );
  return slots.filter((s) => s.meal_id != null && !loggedMealIds.has(s.meal_id));
}
