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

// Words that may follow the head noun without changing what the ingredient is
// (prep instructions, cut forms, size/quality adjectives). If ANY other word
// follows the matched key, the ingredient is a different thing ("chicken
// broth", "corn starch", "rice vinegar") and must NOT borrow the base price.
const TRAILING_DESCRIPTORS = new Set([
  'chopped', 'diced', 'sliced', 'minced', 'grated', 'shredded', 'cubed', 'halved',
  'quartered', 'crushed', 'ground', 'peeled', 'seeded', 'deseeded', 'deveined',
  'drained', 'rinsed', 'cooked', 'uncooked', 'raw', 'fresh', 'frozen', 'thawed',
  'softened', 'melted', 'roughly', 'finely', 'thinly', 'coarsely', 'optional',
  'divided', 'room', 'temperature', 'to', 'taste', 'and', 'or', 'for', 'garnish',
  'boneless', 'skinless', 'trimmed', 'washed', 'dried', 'whole', 'large', 'small',
  'medium', 'ripe', 'strips', 'fillet', 'fillets', 'pieces', 'chunks', 'cubes',
  'tenders', 'cutlets', 'wedges', 'each', 'about',
])

/**
 * Looks up an ingredient's official reference price by name. Exact match first,
 * then a "head-noun" match: the key must appear as whole words AND everything
 * after it must be only prep descriptors — so "extra virgin olive oil" and
 * "chicken breast, diced" resolve, but "chicken broth", "corn starch", and
 * "red pepper flakes" do NOT borrow the base commodity's price. Longest key
 * first so "sweet potato" beats "potato". Returns null when nothing applies.
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
  for (const r of byLength) {
    const m = nameLower.match(new RegExp(`\\b${escapeRegex(r.ingredient_name)}\\b(.*)$`))
    if (!m) continue
    const trailingTokens = m[1].split(/[^a-z]+/).filter(Boolean)
    if (trailingTokens.every(t => TRAILING_DESCRIPTORS.has(t))) return r.cost_per_100g
  }
  return null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
