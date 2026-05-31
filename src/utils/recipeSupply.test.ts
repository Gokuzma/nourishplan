import { describe, it, expect } from 'vitest'
import {
  computeSlotSupply,
  detectUnderSuppliedSlots,
  countUntagged,
  SLOT_SUPPLY_TARGETS,
} from './recipeSupply'

// Build a list of recipes with the given meal_types arrays.
function recipes(...mealTypes: string[][]) {
  return mealTypes.map((mt) => ({ meal_types: mt }))
}

describe('computeSlotSupply', () => {
  it('counts recipes per slot via meal_types membership', () => {
    const supply = computeSlotSupply(
      recipes(['Breakfast'], ['Breakfast', 'Lunch'], ['Dinner'], ['Dinner']),
    )
    const bySlot = Object.fromEntries(supply.map((s) => [s.slot, s.available]))
    expect(bySlot.Breakfast).toBe(2)
    expect(bySlot.Lunch).toBe(1)
    expect(bySlot.Dinner).toBe(2)
    expect(bySlot.Snacks).toBe(0)
  })

  it('does NOT count untagged recipes toward any slot', () => {
    const supply = computeSlotSupply(recipes([], [], []))
    expect(supply.every((s) => s.available === 0)).toBe(true)
  })

  it('computes shortfall against the target, never negative', () => {
    // 9 Dinner recipes — over target (7) so shortfall is 0, not negative.
    const dinner = recipes(...Array.from({ length: 9 }, () => ['Dinner']))
    const supply = computeSlotSupply(dinner)
    const d = supply.find((s) => s.slot === 'Dinner')!
    expect(d.available).toBe(9)
    expect(d.shortfall).toBe(0)
  })

  it('uses the configured targets', () => {
    const supply = computeSlotSupply([], { Breakfast: 3, Lunch: 3, Dinner: 3, Snacks: 3 })
    expect(supply.find((s) => s.slot === 'Breakfast')!.shortfall).toBe(3)
  })
})

describe('detectUnderSuppliedSlots', () => {
  it('returns only slots below target, worst shortfall first', () => {
    // 6 breakfast (target 7 → short 1), 0 snacks (target 5 → short 5), 7 dinner (ok)
    const list = [
      ...recipes(...Array.from({ length: 6 }, () => ['Breakfast'])),
      ...recipes(...Array.from({ length: 7 }, () => ['Dinner'])),
    ]
    const under = detectUnderSuppliedSlots(list)
    const slots = under.map((s) => s.slot)
    expect(slots).not.toContain('Dinner') // fully supplied
    // Snacks (short 5) should rank before Breakfast (short 1) and Lunch (short 7)
    expect(under[0].shortfall).toBeGreaterThanOrEqual(under[under.length - 1].shortfall)
    expect(slots).toContain('Breakfast')
    expect(slots).toContain('Snacks')
  })

  it('returns empty when every slot meets target', () => {
    const full = [
      ...recipes(...Array.from({ length: SLOT_SUPPLY_TARGETS.Breakfast }, () => ['Breakfast'])),
      ...recipes(...Array.from({ length: SLOT_SUPPLY_TARGETS.Lunch }, () => ['Lunch'])),
      ...recipes(...Array.from({ length: SLOT_SUPPLY_TARGETS.Dinner }, () => ['Dinner'])),
      ...recipes(...Array.from({ length: SLOT_SUPPLY_TARGETS.Snacks }, () => ['Snacks'])),
    ]
    expect(detectUnderSuppliedSlots(full)).toEqual([])
  })
})

describe('countUntagged', () => {
  it('counts only recipes with empty meal_types', () => {
    expect(countUntagged(recipes(['Dinner'], [], ['Lunch'], []))).toBe(2)
  })
})
