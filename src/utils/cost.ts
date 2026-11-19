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

/**
 * Turns a purchase (price paid for a quantity) into a Food Prices entry.
 * Weighed/volume foods get a price per 100 g; counted foods (eggs, cans) get a
 * price each, plus the weight of one unit so gram-based recipe costing works.
 * Without a food id the entry is keyed by name. Returns null when it can't be
 * priced (no price, nothing bought, or a counted food with no unit weight).
 */
export function purchasePriceEntry(purchase: {
  food_id?: string | null
  food_name: string
  purchase_price?: number | null
  quantity: number
  unit: 'g' | 'kg' | 'ml' | 'L' | 'units'
  unit_grams?: number | null
}): { food_id: string; food_name: string; cost_per_100g: number; cost_per_unit: number | null; grams_per_unit: number | null } | null {
  const name = purchase.food_name.trim()
  if (purchase.purchase_price == null || purchase.purchase_price < 0 || purchase.quantity <= 0 || !name) return null
  const food_id = purchase.food_id || `name:${name.toLowerCase()}`
  if (purchase.unit === 'units') {
    if (!purchase.unit_grams || purchase.unit_grams <= 0) return null
    const costPerUnit = purchase.purchase_price / purchase.quantity
    return {
      food_id,
      food_name: name,
      cost_per_100g: (costPerUnit / purchase.unit_grams) * 100,
      cost_per_unit: Math.round(costPerUnit * 10000) / 10000,
      grams_per_unit: purchase.unit_grams,
    }
  }
  const unit = purchase.unit.toLowerCase() as 'g' | 'kg' | 'ml' | 'l'
  return {
    food_id,
    food_name: name,
    cost_per_100g: normaliseToCostPer100g(purchase.purchase_price, purchase.quantity, unit),
    cost_per_unit: null,
    grams_per_unit: null,
  }
}

/** "$0.42 each" for counted foods, "$1.12/100g" otherwise. */
export function formatFoodPrice(price: { cost_per_100g: number; cost_per_unit?: number | null }): string {
  return price.cost_per_unit != null ? `${formatCost(price.cost_per_unit)} each` : `${formatCost(price.cost_per_100g)}/100g`
}
