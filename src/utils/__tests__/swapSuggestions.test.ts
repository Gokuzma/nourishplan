import { describe, it, expect } from 'vitest'
import { computeSwapSuggestions } from '../swapSuggestions'
import type { WeeklyGap } from '../nutritionGaps'
import type { SlotWithMeal } from '../../hooks/useMealPlan'
import type { Meal, MealItem } from '../../types/database'

function makeMealItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: 'item-1',
    meal_id: 'meal-1',
    item_type: 'food',
    item_id: 'food-1',
    item_name: 'Food',
    quantity_grams: 100,
    calories_per_100g: 200,
    protein_per_100g: 10,
    fat_per_100g: 5,
    carbs_per_100g: 20,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } as MealItem
}

function makeMeal(id: string, name: string, items: Partial<MealItem>[] = []): Meal & { meal_items: MealItem[] } {
  return {
    id,
    name,
    household_id: 'hh-1',
    created_by: 'user-1',
    deleted_at: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    meal_items: items.map((it, i) =>
      makeMealItem({ id: `item-${id}-${i}`, meal_id: id, ...it }),
    ),
  } as unknown as Meal & { meal_items: MealItem[] }
}

function makeSlot(
  id: string,
  dayIndex: number,
  slotName: string,
  meal: (Meal & { meal_items: MealItem[] }) | null,
  isLocked = false,
): SlotWithMeal {
  return {
    id,
    plan_id: 'plan-1',
    day_index: dayIndex,
    slot_name: slotName,
    slot_order: 0,
    meal_id: meal?.id ?? null,
    meals: meal,
    is_locked: isLocked,
    is_override: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  } as unknown as SlotWithMeal
}

const proteinGap: WeeklyGap = {
  memberId: 'user-1',
  memberName: 'Alice',
  nutrient: 'protein',
  weeklyTarget: 700,
  weeklyActual: 400,
  percentOfTarget: 0.57,
}

describe('computeSwapSuggestions', () => {
  it('Test 1: returns empty array when gaps is empty', () => {
    const result = computeSwapSuggestions([], [], [], '2024-01-01', 0)
    expect(result).toEqual([])
  })

  it('Test 2: returns empty array when no unlocked slots have meals', () => {
    const emptySlot = makeSlot('s1', 0, 'Breakfast', null)
    const meal = makeMeal('m1', 'High Protein Meal', [{ protein_per_100g: 50 }])
    const result = computeSwapSuggestions([proteinGap], [emptySlot], [meal], '2024-01-01', 0)
    expect(result).toEqual([])
  })

  it('Test 3: suggests swapping the slot with lowest protein for the candidate with highest protein', () => {
    const lowProteinMeal = makeMeal('m-low', 'Low Protein', [{ protein_per_100g: 5, quantity_grams: 100 }])
    const highProteinMeal = makeMeal('m-high', 'High Protein', [{ protein_per_100g: 50, quantity_grams: 100 }])

    const slot = makeSlot('s1', 0, 'Breakfast', lowProteinMeal)
    const result = computeSwapSuggestions(
      [proteinGap],
      [slot],
      [lowProteinMeal, highProteinMeal],
      '2024-01-01',
      0,
    )

    expect(result).toHaveLength(1)
    expect(result[0].recipeName).toBe('High Protein')
    expect(result[0].nutrientGain).toBeCloseTo(50 - 5, 1)
    expect(result[0].nutrient).toBe('protein')
    expect(result[0].memberId).toBe('user-1')
    expect(result[0].mealId).toBe('m-high')
  })

  it('Test 4: does not suggest swapping a locked slot', () => {
    const lowProteinMeal = makeMeal('m-low', 'Low Protein', [{ protein_per_100g: 5, quantity_grams: 100 }])
    const highProteinMeal = makeMeal('m-high', 'High Protein', [{ protein_per_100g: 50, quantity_grams: 100 }])

    const lockedSlot = makeSlot('s1', 0, 'Breakfast', lowProteinMeal, true)
    const result = computeSwapSuggestions(
      [proteinGap],
      [lockedSlot],
      [lowProteinMeal, highProteinMeal],
      '2024-01-01',
      0,
    )

    expect(result).toEqual([])
  })

  it('Test 5: dayName is correctly derived from dayIndex and weekStart', () => {
    const lowProteinMeal = makeMeal('m-low', 'Low Protein', [{ protein_per_100g: 5, quantity_grams: 100 }])
    const highProteinMeal = makeMeal('m-high', 'High Protein', [{ protein_per_100g: 50, quantity_grams: 100 }])

    const slot = makeSlot('s1', 2, 'Lunch', lowProteinMeal)
    // 2024-01-01 is Monday; dayIndex=2 means Wednesday
    const result = computeSwapSuggestions(
      [proteinGap],
      [slot],
      [lowProteinMeal, highProteinMeal],
      '2024-01-01',
      0,
    )

    expect(result).toHaveLength(1)
    expect(result[0].dayName).toBe('Wed')
    expect(result[0].dayIndex).toBe(2)
  })

  it('Test 6: returns at most one suggestion per gap (member+nutrient combination)', () => {
    const lowProteinMeal = makeMeal('m-low', 'Low Protein', [{ protein_per_100g: 5, quantity_grams: 100 }])
    const midProteinMeal = makeMeal('m-mid', 'Mid Protein', [{ protein_per_100g: 20, quantity_grams: 100 }])
    const highProteinMeal = makeMeal('m-high', 'High Protein', [{ protein_per_100g: 50, quantity_grams: 100 }])

    const slot1 = makeSlot('s1', 0, 'Breakfast', lowProteinMeal)
    const slot2 = makeSlot('s2', 1, 'Lunch', midProteinMeal)

    const result = computeSwapSuggestions(
      [proteinGap],
      [slot1, slot2],
      [lowProteinMeal, midProteinMeal, highProteinMeal],
      '2024-01-01',
      0,
    )

    expect(result).toHaveLength(1)
    expect(result[0].recipeName).toBe('High Protein')
  })

  it('Test 7: does not suggest swapping to a meal already in the plan', () => {
    const mealA = makeMeal('m-a', 'Meal A', [{ protein_per_100g: 10, quantity_grams: 100 }])
    const mealB = makeMeal('m-b', 'Meal B', [{ protein_per_100g: 30, quantity_grams: 100 }])

    // Both mealA and mealB are already in the plan
    const slot1 = makeSlot('s1', 0, 'Breakfast', mealA)
    const slot2 = makeSlot('s2', 0, 'Lunch', mealB)

    // No candidate meals outside the plan — so no suggestion
    const result = computeSwapSuggestions(
      [proteinGap],
      [slot1, slot2],
      [mealA, mealB],
      '2024-01-01',
      0,
    )

    expect(result).toEqual([])
  })
})
