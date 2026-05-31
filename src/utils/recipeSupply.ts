import type { Recipe } from '../types/database'

export const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const
export type MealSlot = (typeof MEAL_SLOTS)[number]

// Minimum recipes we want available per slot so a 7-day week needn't repeat.
// Breakfast/Lunch/Dinner cover 7 days; Snacks are lighter and tolerate repeats.
export const SLOT_SUPPLY_TARGETS: Record<MealSlot, number> = {
  Breakfast: 7,
  Lunch: 7,
  Dinner: 7,
  Snacks: 5,
}

export interface SlotSupply {
  slot: MealSlot
  available: number
  target: number
  shortfall: number // how many more recipes to reach the target (>= 0)
}

/**
 * Count recipes eligible for each slot and compute the shortfall vs target.
 * A recipe counts toward a slot only if its meal_types includes that slot.
 * Untagged recipes (empty meal_types) are NOT counted — counting wildcards
 * would mask real gaps, and after classification nothing should be untagged.
 */
export function computeSlotSupply(
  recipes: Pick<Recipe, 'meal_types'>[],
  targets: Record<MealSlot, number> = SLOT_SUPPLY_TARGETS,
): SlotSupply[] {
  return MEAL_SLOTS.map((slot) => {
    const available = recipes.filter((r) => (r.meal_types ?? []).includes(slot)).length
    const target = targets[slot]
    return { slot, available, target, shortfall: Math.max(0, target - available) }
  })
}

/** Slots below their supply target, worst shortfall first. */
export function detectUnderSuppliedSlots(
  recipes: Pick<Recipe, 'meal_types'>[],
  targets: Record<MealSlot, number> = SLOT_SUPPLY_TARGETS,
): SlotSupply[] {
  return computeSlotSupply(recipes, targets)
    .filter((s) => s.shortfall > 0)
    .sort((a, b) => b.shortfall - a.shortfall)
}

/** Count recipes with no meal_types — wildcards that need classification. */
export function countUntagged(recipes: Pick<Recipe, 'meal_types'>[]): number {
  return recipes.filter((r) => (r.meal_types ?? []).length === 0).length
}
