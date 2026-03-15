export const PROTEIN_KCAL_PER_G = 4
export const CARBS_KCAL_PER_G = 4
export const FAT_KCAL_PER_G = 9

/**
 * Converts a macro percentage to grams given a calorie target and kcal/g ratio.
 * e.g. pctToGrams(30, 2000, 4) = 150 (30% of 2000 kcal at 4 kcal/g)
 */
export function pctToGrams(pct: number, calories: number, kcalPerGram: number): number {
  if (!calories || !kcalPerGram) return 0
  return Math.round((pct / 100) * calories / kcalPerGram)
}

/**
 * Converts grams to a macro percentage given a calorie target and kcal/g ratio.
 * Returns 0 if calories is 0 to avoid division by zero.
 */
export function gramsToPct(grams: number, calories: number, kcalPerGram: number): number {
  if (!calories) return 0
  return Math.round((grams * kcalPerGram / calories) * 100)
}

/**
 * Validates that protein + carbs + fat percentages sum to 100 within a 0.5% tolerance.
 */
export function isMacroSumValid(proteinPct: number, carbsPct: number, fatPct: number): boolean {
  return Math.abs(proteinPct + carbsPct + fatPct - 100) <= 0.5
}
