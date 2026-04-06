import { describe, it, expect } from 'vitest'
import { calcWeeklyGaps } from '../nutritionGaps'
import type { NutritionTarget } from '../../types/database'
import type { SlotWithMeal } from '../../hooks/useMealPlan'

// Helper to build a SlotWithMeal with a single meal item
function makeSlot(overrides: Partial<SlotWithMeal> = {}): SlotWithMeal {
  return {
    id: 'slot-1',
    plan_id: 'plan-1',
    day_index: 0,
    slot_name: 'Breakfast',
    slot_order: 0,
    meal_id: 'meal-1',
    is_override: false,
    is_locked: false,
    generation_rationale: null,
    created_at: '2026-01-01T00:00:00Z',
    meals: {
      id: 'meal-1',
      household_id: 'hh-1',
      created_by: 'user-1',
      name: 'Test Meal',
      deleted_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      meal_items: [
        {
          id: 'item-1',
          meal_id: 'meal-1',
          item_type: 'food',
          item_id: 'food-1',
          quantity_grams: 100,
          calories_per_100g: 200,
          protein_per_100g: 20,
          fat_per_100g: 10,
          carbs_per_100g: 30,
          sort_order: 0,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    },
    ...overrides,
  }
}

// 7 days x 4 slots, each slot contributes 200 cal / 20g protein / 10g fat / 30g carbs
// Weekly total per member: 200*28=5600 cal, 20*28=560g protein, 10*28=280g fat, 30*28=840g carbs
function makeWeekSlots(): SlotWithMeal[] {
  const slots: SlotWithMeal[] = []
  for (let day = 0; day < 7; day++) {
    for (let order = 0; order < 4; order++) {
      slots.push(makeSlot({ id: `slot-${day}-${order}`, day_index: day, slot_order: order }))
    }
  }
  return slots
}

const memberAlice = { id: 'user-alice', type: 'user' as const, name: 'Alice' }
const memberBob = { id: 'profile-bob', type: 'profile' as const, name: 'Bob' }

// Alice: daily 2000 cal, 150g protein, 250g carbs, 70g fat
// Weekly: 14000 cal, 1050g protein, 1750g carbs, 490g fat
// Actual weekly (28 slots * 200cal = 5600 cal, 560g protein, 840g carbs, 280g fat)
// All are below 90% of weekly target — gaps expected
const targetAlice: NutritionTarget = {
  id: 'target-alice',
  household_id: 'hh-1',
  user_id: 'user-alice',
  member_profile_id: null,
  calories: 2000,
  protein_g: 150,
  carbs_g: 250,
  fat_g: 70,
  micronutrients: {},
  custom_goals: {},
  macro_mode: 'grams',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// Bob with profile: daily 1500 cal, 100g protein, 200g carbs, 55g fat
// Weekly: 10500 cal, 700g protein, 1400g carbs, 385g fat
const targetBob: NutritionTarget = {
  id: 'target-bob',
  household_id: 'hh-1',
  user_id: null,
  member_profile_id: 'profile-bob',
  calories: 1500,
  protein_g: 100,
  carbs_g: 200,
  fat_g: 55,
  micronutrients: {},
  custom_goals: {},
  macro_mode: 'grams',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('calcWeeklyGaps', () => {
  it('Test 1: member with all macros above 90% of weekly target returns no gaps', () => {
    // Override slots to provide enough nutrition to meet targets
    // Alice target weekly: 14000 cal. Need actual >= 12600 (90%).
    // With 28 slots * 450 cal = 12600 — exactly at threshold, so no gap
    const richSlots: SlotWithMeal[] = []
    for (let day = 0; day < 7; day++) {
      for (let order = 0; order < 4; order++) {
        richSlots.push(makeSlot({
          id: `slot-${day}-${order}`,
          day_index: day,
          slot_order: order,
          meals: {
            id: 'meal-rich',
            household_id: 'hh-1',
            created_by: 'user-1',
            name: 'Rich Meal',
            deleted_at: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            meal_items: [
              {
                id: 'item-rich',
                meal_id: 'meal-rich',
                item_type: 'food',
                item_id: 'food-rich',
                quantity_grams: 100,
                // 450 cal per slot * 28 slots = 12600 >= 12600 (90% of 14000)
                calories_per_100g: 450,
                // 37.5g protein per slot * 28 = 1050 >= 945 (90% of 1050)
                protein_per_100g: 37.5,
                // 63g carbs per slot * 28 = 1764 >= 1575 (90% of 1750)
                carbs_per_100g: 63,
                // 17.5g fat per slot * 28 = 490 >= 441 (90% of 490)
                fat_per_100g: 17.5,
                sort_order: 0,
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
          },
        }))
      }
    }

    const gaps = calcWeeklyGaps(richSlots, [targetAlice], [memberAlice])
    expect(gaps).toHaveLength(0)
  })

  it('Test 2: member with protein at 85% of weekly target returns a gap entry for protein', () => {
    // Alice weekly protein target: 1050g. 90% threshold = 945g.
    // We want actual = 85% = 892.5g. With 28 slots: 892.5 / 28 = ~31.875g protein per slot
    // Use 100g quantity, so protein_per_100g = 31.875
    // Calories: set high enough to not trigger cal gap (>= 90% of 14000 = 12600, so 12600/28=450 cal/slot)
    // Carbs: >= 90% of 1750 = 1575, 1575/28 = 56.25 carbs/slot
    // Fat: >= 90% of 490 = 441, 441/28 = 15.75 fat/slot
    const slots: SlotWithMeal[] = []
    for (let day = 0; day < 7; day++) {
      for (let order = 0; order < 4; order++) {
        slots.push(makeSlot({
          id: `slot-${day}-${order}`,
          day_index: day,
          slot_order: order,
          meals: {
            id: 'meal-low-protein',
            household_id: 'hh-1',
            created_by: 'user-1',
            name: 'Low Protein Meal',
            deleted_at: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            meal_items: [
              {
                id: 'item-low-protein',
                meal_id: 'meal-low-protein',
                item_type: 'food',
                item_id: 'food-1',
                quantity_grams: 100,
                calories_per_100g: 450,
                protein_per_100g: 31.875,
                fat_per_100g: 15.75,
                carbs_per_100g: 56.25,
                sort_order: 0,
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
          },
        }))
      }
    }

    const gaps = calcWeeklyGaps(slots, [targetAlice], [memberAlice])
    expect(gaps).toHaveLength(1)
    expect(gaps[0].memberId).toBe('user-alice')
    expect(gaps[0].memberName).toBe('Alice')
    expect(gaps[0].nutrient).toBe('protein')
    expect(gaps[0].weeklyTarget).toBe(1050)
    expect(gaps[0].weeklyActual).toBeCloseTo(892.5, 1)
    expect(gaps[0].percentOfTarget).toBeCloseTo(0.85, 2)
  })

  it('Test 3: member with null calories target is skipped entirely', () => {
    const targetNoCalories: NutritionTarget = {
      ...targetAlice,
      id: 'target-no-cal',
      user_id: 'user-no-cal',
      calories: null,
    }
    const memberNoCal = { id: 'user-no-cal', type: 'user' as const, name: 'No Calories' }
    const gaps = calcWeeklyGaps(makeWeekSlots(), [targetNoCalories], [memberNoCal])
    expect(gaps).toHaveLength(0)
  })

  it('Test 4: multiple members with different gaps return separate gap entries per member', () => {
    // Both Alice and Bob will have gaps with default slots (5600 actual vs 14000/10500 targets)
    const gaps = calcWeeklyGaps(makeWeekSlots(), [targetAlice, targetBob], [memberAlice, memberBob])
    const aliceGaps = gaps.filter(g => g.memberId === 'user-alice')
    const bobGaps = gaps.filter(g => g.memberId === 'profile-bob')
    expect(aliceGaps.length).toBeGreaterThan(0)
    expect(bobGaps.length).toBeGreaterThan(0)
    // Verify they are separate entries
    expect(aliceGaps[0].memberName).toBe('Alice')
    expect(bobGaps[0].memberName).toBe('Bob')
  })

  it('Test 5: custom threshold of 0.8 produces fewer gaps than default 0.9', () => {
    // Default slots: 5600 cal actual vs 14000 weekly target = 40% — below both thresholds
    // Let's craft slots that are between 80% and 90% (only fail at 0.9, not at 0.8)
    // For calories: target 2000/day = 14000/week. 85% = 11900. With 28 slots: 11900/28 = 425 cal/slot
    // For protein: target 1050/week. 85% = 892.5. With 28 slots: 31.875g/slot
    // For carbs: target 1750/week. 85% = 1487.5. With 28 slots: 53.125g/slot
    // For fat: target 490/week. 85% = 416.5. With 28 slots: 14.875g/slot
    // At 0.9 threshold: all 4 macros should be gaps. At 0.8 threshold: none should be gaps.
    const slots85: SlotWithMeal[] = []
    for (let day = 0; day < 7; day++) {
      for (let order = 0; order < 4; order++) {
        slots85.push(makeSlot({
          id: `slot-${day}-${order}`,
          day_index: day,
          slot_order: order,
          meals: {
            id: 'meal-85',
            household_id: 'hh-1',
            created_by: 'user-1',
            name: '85% Meal',
            deleted_at: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            meal_items: [
              {
                id: 'item-85',
                meal_id: 'meal-85',
                item_type: 'food',
                item_id: 'food-1',
                quantity_grams: 100,
                calories_per_100g: 425,
                protein_per_100g: 31.875,
                fat_per_100g: 14.875,
                carbs_per_100g: 53.125,
                sort_order: 0,
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
          },
        }))
      }
    }

    const gapsAt90 = calcWeeklyGaps(slots85, [targetAlice], [memberAlice])
    const gapsAt80 = calcWeeklyGaps(slots85, [targetAlice], [memberAlice], 0.8)
    expect(gapsAt90.length).toBeGreaterThan(0)
    expect(gapsAt80).toHaveLength(0)
  })

  it('Test 6: empty slots (meal_id null) contribute 0 nutrition and do not crash', () => {
    const emptySlots: SlotWithMeal[] = []
    for (let day = 0; day < 7; day++) {
      for (let order = 0; order < 4; order++) {
        emptySlots.push({
          id: `slot-${day}-${order}`,
          plan_id: 'plan-1',
          day_index: day,
          slot_name: 'Breakfast',
          slot_order: order,
          meal_id: null,
          is_override: false,
          is_locked: false,
          generation_rationale: null,
          created_at: '2026-01-01T00:00:00Z',
          meals: null,
        })
      }
    }

    expect(() => calcWeeklyGaps(emptySlots, [targetAlice], [memberAlice])).not.toThrow()
    const gaps = calcWeeklyGaps(emptySlots, [targetAlice], [memberAlice])
    // All actuals will be 0, so all macros below 90% — expect 4 gaps (cal, protein, fat, carbs)
    expect(gaps.length).toBeGreaterThan(0)
    gaps.forEach(g => {
      expect(g.weeklyActual).toBe(0)
    })
  })
})
