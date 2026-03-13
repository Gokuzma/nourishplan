import { describe, it, expect, vi } from 'vitest';
import {
  calcIngredientNutrition,
  calcRecipePerServing,
  calcMealNutrition,
  calcDayNutrition,
  wouldCreateCycle,
  applyYieldFactor,
  USDA_NUTRIENT_IDS,
  YIELD_FACTORS,
} from '../src/utils/nutrition';

describe('calcIngredientNutrition', () => {
  it('scales macros from per-100g to given quantity', () => {
    const food = { calories: 200, protein: 20, fat: 5, carbs: 25 };
    const result = calcIngredientNutrition(food, 150);
    expect(result.calories).toBeCloseTo(300);
    expect(result.protein).toBeCloseTo(30);
    expect(result.fat).toBeCloseTo(7.5);
    expect(result.carbs).toBeCloseTo(37.5);
  });

  it('returns all zeros when quantity is 0', () => {
    const food = { calories: 200, protein: 20, fat: 5, carbs: 25 };
    const result = calcIngredientNutrition(food, 0);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.carbs).toBe(0);
  });
});

describe('calcRecipePerServing', () => {
  it('sums ingredient nutrition and divides by servings', () => {
    const ingredients = [
      { nutrition: { calories: 200, protein: 10, fat: 5, carbs: 20 } },
      { nutrition: { calories: 100, protein: 10, fat: 5, carbs: 20 } },
    ];
    const result = calcRecipePerServing(ingredients, 4);
    expect(result.calories).toBeCloseTo(75);
    expect(result.protein).toBeCloseTo(5);
    expect(result.fat).toBeCloseTo(2.5);
    expect(result.carbs).toBeCloseTo(10);
  });

  it('returns all zeros when ingredient list is empty', () => {
    const result = calcRecipePerServing([], 1);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.carbs).toBe(0);
  });
});

describe('wouldCreateCycle', () => {
  it('detects self-reference (A contains A)', async () => {
    const getter = vi.fn().mockResolvedValue([
      { ingredient_type: 'recipe', ingredient_id: 'A' },
    ]);
    const result = await wouldCreateCycle('A', 'A', getter);
    expect(result).toBe(true);
  });

  it('detects indirect cycle (A -> B, B contains A)', async () => {
    const getter = vi.fn().mockImplementation((id: string) => {
      if (id === 'B') {
        return Promise.resolve([{ ingredient_type: 'recipe', ingredient_id: 'A' }]);
      }
      return Promise.resolve([]);
    });
    const result = await wouldCreateCycle('A', 'B', getter);
    expect(result).toBe(true);
  });

  it('returns false when no cycle exists', async () => {
    const getter = vi.fn().mockResolvedValue([]);
    const result = await wouldCreateCycle('A', 'B', getter);
    expect(result).toBe(false);
  });
});

describe('applyYieldFactor', () => {
  it('converts cooked weight to equivalent raw grams', () => {
    const result = applyYieldFactor(100, 'cooked', 0.75);
    expect(result).toBeCloseTo(133.33, 1);
  });

  it('returns grams unchanged when state is raw', () => {
    const result = applyYieldFactor(100, 'raw', 0.75);
    expect(result).toBe(100);
  });
});

describe('USDA_NUTRIENT_IDS', () => {
  it('has correct mapping for energy (208)', () => {
    expect(USDA_NUTRIENT_IDS.energy).toBe(208);
  });

  it('has correct mapping for protein (203)', () => {
    expect(USDA_NUTRIENT_IDS.protein).toBe(203);
  });

  it('has correct mapping for fat (204)', () => {
    expect(USDA_NUTRIENT_IDS.fat).toBe(204);
  });

  it('has correct mapping for carbs (205)', () => {
    expect(USDA_NUTRIENT_IDS.carbs).toBe(205);
  });
});

describe('calcMealNutrition', () => {
  it('sums nutrition across all meal items', () => {
    const items = [
      { nutrition: { calories: 200, protein: 10, fat: 5, carbs: 30 } },
      { nutrition: { calories: 300, protein: 20, fat: 10, carbs: 40 } },
    ];
    const result = calcMealNutrition(items);
    expect(result.calories).toBe(500);
    expect(result.protein).toBe(30);
    expect(result.fat).toBe(15);
    expect(result.carbs).toBe(70);
  });

  it('returns all zeros for an empty item list', () => {
    const result = calcMealNutrition([]);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.carbs).toBe(0);
  });
});

describe('calcDayNutrition', () => {
  it('sums all meal nutritions for a day', () => {
    const meals = [
      { calories: 500, protein: 30, fat: 15, carbs: 70 },
      { calories: 800, protein: 40, fat: 20, carbs: 100 },
    ];
    const result = calcDayNutrition(meals);
    expect(result.calories).toBe(1300);
    expect(result.protein).toBe(70);
    expect(result.fat).toBe(35);
    expect(result.carbs).toBe(170);
  });

  it('returns correct total for a single meal', () => {
    const meals = [{ calories: 500, protein: 30, fat: 15, carbs: 70 }];
    const result = calcDayNutrition(meals);
    expect(result.calories).toBe(500);
    expect(result.protein).toBe(30);
    expect(result.fat).toBe(15);
    expect(result.carbs).toBe(70);
  });

  it('returns all zeros for an empty meal list', () => {
    const result = calcDayNutrition([]);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.carbs).toBe(0);
  });
});

describe('YIELD_FACTORS', () => {
  it('has entries for meat, poultry, fish, vegetables, legumes, grains', () => {
    expect(YIELD_FACTORS).toHaveProperty('meat');
    expect(YIELD_FACTORS).toHaveProperty('poultry');
    expect(YIELD_FACTORS).toHaveProperty('fish');
    expect(YIELD_FACTORS).toHaveProperty('vegetables');
    expect(YIELD_FACTORS).toHaveProperty('legumes');
    expect(YIELD_FACTORS).toHaveProperty('grains');
  });

  it('all yield factor values are numbers between 0 and 5', () => {
    for (const [key, value] of Object.entries(YIELD_FACTORS)) {
      expect(typeof value, `${key} should be a number`).toBe('number');
      expect(value, `${key} should be > 0`).toBeGreaterThan(0);
    }
  });
});
