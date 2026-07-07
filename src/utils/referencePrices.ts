/**
 * Parses the quantity clause of a Statistics Canada product label
 * (e.g. "Bacon, 500 grams", "Apples, per kilogram", "Milk, 1 litre")
 * into a mass in grams. Volumes are treated as grams at density ~1, which
 * is close enough for the liquids in this basket (milk, oil, juice).
 *
 * Returns null for count-based units ("1 dozen", "unit", "20 bags") that
 * can't be converted to mass without an explicit per-unit weight.
 */
export function parseQuantityToGrams(label: string): number | null {
  const lower = label.toLowerCase()
  if (/per\s+kilogram|per\s+kg\b/.test(lower)) return 1000

  const match = lower.match(/(\d+(?:\.\d+)?)\s*(kilograms?|kg|grams?|g|litres?|l|millilitres?|ml)\b/)
  if (!match) return null

  const value = parseFloat(match[1])
  const unit = match[2]
  if (unit.startsWith('kilogram') || unit === 'kg' || unit.startsWith('litre') || unit === 'l') {
    return value * 1000
  }
  // grams, g, millilitres, ml
  return value
}

/**
 * Converts a total price for `grams` of product into cost per 100 g.
 * Returns null when grams is non-positive.
 */
export function computeReferenceCostPer100g(price: number, grams: number): number | null {
  if (grams <= 0) return null
  return (price / grams) * 100
}

interface ReferencePriceRow {
  ingredient_name: string
  cost_per_100g: number
}

/**
 * Looks up an ingredient's official reference price by name (exact, then a
 * loose whole-word contains match so "extra virgin olive oil" resolves to
 * "olive oil", longest key first so "sweet potato" beats "potato").
 * Returns null when no reference price applies.
 */
export function getReferencePriceForIngredient(
  referencePrices: ReferencePriceRow[] | undefined,
  ingredientName: string | null | undefined
): number | null {
  if (!referencePrices || referencePrices.length === 0 || !ingredientName) return null
  const nameLower = ingredientName.toLowerCase().trim()
  const exact = referencePrices.find(r => r.ingredient_name === nameLower)
  if (exact) return exact.cost_per_100g
  const byLength = [...referencePrices].sort((a, b) => b.ingredient_name.length - a.ingredient_name.length)
  const loose = byLength.find(r => new RegExp(`\\b${escapeRegex(r.ingredient_name)}\\b`).test(nameLower))
  return loose ? loose.cost_per_100g : null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
