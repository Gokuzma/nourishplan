import { calcIngredientNutrition, calcMealNutrition } from './nutrition'
import type { MacroSummary } from '../types/database'

export interface IngredientMacroRow {
  quantity_grams: number
  calories_per_100g?: number | null
  protein_per_100g?: number | null
  fat_per_100g?: number | null
  carbs_per_100g?: number | null
}

/**
 * Per-serving macros for a recipe from its ingredient macro snapshots.
 * Ingredients without snapshot values contribute zero rather than
 * poisoning the total with NaN.
 */
export function calcPerServingMacros(
  ingredients: IngredientMacroRow[],
  servings: number,
): MacroSummary {
  const items = ingredients.map((ing) => ({
    nutrition: calcIngredientNutrition(
      {
        calories: ing.calories_per_100g ?? 0,
        protein: ing.protein_per_100g ?? 0,
        fat: ing.fat_per_100g ?? 0,
        carbs: ing.carbs_per_100g ?? 0,
      },
      ing.quantity_grams,
    ),
  }))
  const total = calcMealNutrition(items)
  const divisor = Math.max(1, servings)
  return {
    calories: total.calories / divisor,
    protein: total.protein / divisor,
    fat: total.fat / divisor,
    carbs: total.carbs / divisor,
  }
}
