import { describe, it, expect } from 'vitest';
import { calcLogEntryNutrition } from '../src/utils/nutrition';
import { getUnloggedSlots } from '../src/utils/foodLogs';

describe('calcLogEntryNutrition', () => {
  it('scales per-serving macros by 1.5 servings', () => {
    const result = calcLogEntryNutrition({
      calories_per_serving: 200,
      protein_per_serving: 10,
      fat_per_serving: 8,
      carbs_per_serving: 25,
      servings_logged: 1.5,
    });
    expect(result.calories).toBeCloseTo(300);
    expect(result.protein).toBeCloseTo(15);
    expect(result.fat).toBeCloseTo(12);
    expect(result.carbs).toBeCloseTo(37.5);
  });

  it('returns per-serving values unchanged for 1 serving', () => {
    const result = calcLogEntryNutrition({
      calories_per_serving: 200,
      protein_per_serving: 10,
      fat_per_serving: 8,
      carbs_per_serving: 25,
      servings_logged: 1,
    });
    expect(result.calories).toBeCloseTo(200);
    expect(result.protein).toBeCloseTo(10);
    expect(result.fat).toBeCloseTo(8);
    expect(result.carbs).toBeCloseTo(25);
  });

  it('returns half of per-serving values for 0.5 servings', () => {
    const result = calcLogEntryNutrition({
      calories_per_serving: 200,
      protein_per_serving: 10,
      fat_per_serving: 8,
      carbs_per_serving: 25,
      servings_logged: 0.5,
    });
    expect(result.calories).toBeCloseTo(100);
    expect(result.protein).toBeCloseTo(5);
    expect(result.fat).toBeCloseTo(4);
    expect(result.carbs).toBeCloseTo(12.5);
  });
});

describe('getUnloggedSlots', () => {
  const makeSlot = (mealId: string | null) => ({ meal_id: mealId });
  const makeLog = (mealId: string | null) => ({ meal_id: mealId });

  it('returns slots that have a meal_id but no matching log entry', () => {
    const slots = [makeSlot('meal-1'), makeSlot('meal-2')];
    const logs = [makeLog('meal-1')];
    const result = getUnloggedSlots(slots, logs);
    expect(result).toHaveLength(1);
    expect(result[0].meal_id).toBe('meal-2');
  });

  it('returns empty array when all slots are logged', () => {
    const slots = [makeSlot('meal-1'), makeSlot('meal-2')];
    const logs = [makeLog('meal-1'), makeLog('meal-2')];
    const result = getUnloggedSlots(slots, logs);
    expect(result).toHaveLength(0);
  });

  it('excludes slots with no meal assigned (meal_id is null)', () => {
    const slots = [makeSlot(null), makeSlot('meal-1')];
    const logs: { meal_id: string | null }[] = [];
    const result = getUnloggedSlots(slots, logs);
    expect(result).toHaveLength(1);
    expect(result[0].meal_id).toBe('meal-1');
  });

  it('returns empty array when slots list is empty', () => {
    const result = getUnloggedSlots([], []);
    expect(result).toHaveLength(0);
  });
});
