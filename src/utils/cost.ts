/**
 * Normalises a user-entered price to cost per 100g.
 * Per D-09: supports per-weight ("$4.50 per kg") or per-package ("$7.99 for 900g").
 */
export function normaliseToCostPer100g(
  amount: number,
  quantityValue: number,
  unit: 'g' | 'kg' | 'ml' | 'l'
): number {
  let totalGrams: number
  switch (unit) {
    case 'kg': totalGrams = quantityValue * 1000; break
    case 'l': totalGrams = quantityValue * 1000; break
    case 'g': case 'ml': totalGrams = quantityValue; break
  }
  if (totalGrams <= 0) return 0
  return (amount / totalGrams) * 100
}

/**
 * Computes recipe cost per serving from ingredient prices.
 * Per D-06: looks up each ingredient's cost_per_100g from food_prices table.
 */
export function computeRecipeCostPerServing(
  ingredients: { quantity_grams: number; cost_per_100g: number | null }[],
  servings: number
): { costPerServing: number; pricedCount: number; totalCount: number } {
  let total = 0
  let pricedCount = 0
  for (const ing of ingredients) {
    if (ing.cost_per_100g != null) {
      total += (ing.quantity_grams / 100) * ing.cost_per_100g
      pricedCount++
    }
  }
  return {
    costPerServing: servings > 0 ? total / servings : 0,
    pricedCount,
    totalCount: ingredients.length,
  }
}

/**
 * Formats a cost value as CAD string. Per D-05: hardcoded to CAD ($).
 */
export function formatCost(amount: number): string {
  return `$${amount.toFixed(2)}`
}
