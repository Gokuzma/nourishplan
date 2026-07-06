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

/**
 * Summarises a week of spend rows into what the purse displays.
 *
 * Receipts are the truth: once any grocery spend is recorded for the week,
 * the budget tracks money out the door (grocery + takeout) and cooking is
 * informational — counting both grocery and cook would double-count, since
 * cooked meals consume ingredients that were already paid for at the store.
 * Weeks with no recorded grocery spend fall back to cook + takeout so
 * households that never log purchases keep a meaningful purse.
 */
export function summariseWeeklySpend(
  spendRows: { amount: number | null; source: string }[],
  foodLogCosts: (number | null)[]
): {
  totalSpend: number
  cookSpend: number
  grocerySpend: number
  foodLogSpend: number
} {
  let cookSpend = 0
  let grocerySpend = 0
  for (const row of spendRows) {
    if (row.source === 'grocery') grocerySpend += row.amount ?? 0
    else cookSpend += row.amount ?? 0
  }
  const foodLogSpend = foodLogCosts.reduce((sum: number, c) => sum + (c ?? 0), 0)
  const totalSpend = grocerySpend > 0
    ? grocerySpend + foodLogSpend
    : cookSpend + foodLogSpend
  return { totalSpend, cookSpend, grocerySpend, foodLogSpend }
}
