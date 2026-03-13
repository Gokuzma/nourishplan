import type { MacroSummary } from '../types/database';

// USDA FoodData Central nutrient ID mappings
export const USDA_NUTRIENT_IDS = {
  energy: 208,
  protein: 203,
  fat: 204,
  carbs: 205,
  fiber: 291,
  sugar: 269,
  sodium: 307,
  calcium: 301,
  iron: 303,
  potassium: 306,
  vitamin_c: 401,
  vitamin_a: 318,
} as const;

// Yield factors: ratio of cooked weight to raw weight.
// e.g. meat: 0.75 means 100g raw becomes ~75g cooked.
// To convert cooked grams back to raw equivalent: grams / yieldFactor.
// legumes and grains absorb water and expand (>1.0 yield factor).
export const YIELD_FACTORS: Record<string, number> = {
  meat: 0.75,
  poultry: 0.75,
  fish: 0.80,
  vegetables: 0.85,
  legumes: 2.5,
  grains: 2.5,
};

/**
 * Calculate the nutrition contribution of one ingredient.
 * All food macros are stored per-100g; this scales to the actual quantity used.
 */
export function calcIngredientNutrition(
  food: MacroSummary,
  quantityGrams: number,
): MacroSummary {
  const factor = quantityGrams / 100;
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    fat: food.fat * factor,
    carbs: food.carbs * factor,
  };
}

/**
 * Calculate per-serving nutrition for a recipe.
 * Sums all ingredient nutrition totals then divides by servings.
 */
export function calcRecipePerServing(
  ingredients: { nutrition: MacroSummary }[],
  servings: number,
): MacroSummary {
  const total = ingredients.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein: acc.protein + item.nutrition.protein,
      fat: acc.fat + item.nutrition.fat,
      carbs: acc.carbs + item.nutrition.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );

  return {
    calories: total.calories / servings,
    protein: total.protein / servings,
    fat: total.fat / servings,
    carbs: total.carbs / servings,
  };
}

/**
 * Convert cooked weight to raw-equivalent grams using a yield factor.
 * If weightState is 'raw', the grams value is returned unchanged.
 * If weightState is 'cooked', divide by yieldFactor to get the raw equivalent.
 */
export function applyYieldFactor(
  grams: number,
  weightState: 'raw' | 'cooked',
  yieldFactor: number,
): number {
  if (weightState === 'cooked') {
    return grams / yieldFactor;
  }
  return grams;
}

/**
 * Sum all item nutritions for a meal.
 * Items are expected to have their nutrition pre-calculated (e.g. via calcIngredientNutrition).
 */
export function calcMealNutrition(
  items: { nutrition: MacroSummary }[],
): MacroSummary {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein: acc.protein + item.nutrition.protein,
      fat: acc.fat + item.nutrition.fat,
      carbs: acc.carbs + item.nutrition.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

/**
 * Sum all meal nutritions across all slots in a day.
 */
export function calcDayNutrition(
  mealNutritions: MacroSummary[],
): MacroSummary {
  return mealNutritions.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

/**
 * BFS cycle detection for nested recipes.
 * Returns true if adding candidateId as an ingredient of recipeId would
 * create a circular reference.
 */
export async function wouldCreateCycle(
  recipeId: string,
  candidateId: string,
  getIngredients: (id: string) => Promise<{ ingredient_type: string; ingredient_id: string }[]>,
): Promise<boolean> {
  // A recipe cannot contain itself
  if (recipeId === candidateId) return true;

  const visited = new Set<string>();
  const queue: string[] = [candidateId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const ingredients = await getIngredients(current);
    for (const ing of ingredients) {
      if (ing.ingredient_type !== 'recipe') continue;
      if (ing.ingredient_id === recipeId) return true;
      if (!visited.has(ing.ingredient_id)) {
        queue.push(ing.ingredient_id);
      }
    }
  }

  return false;
}
