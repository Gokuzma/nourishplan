// How an ingredient amount reads in a recipe: "2 cups", "1½ tbsp", "3 cloves",
// "2" (eggs — the name says what is counted), "450 g". Grams stay the source of
// truth for nutrition, cost and inventory; this is display only.

export const METRIC_UNITS = ['g', 'kg', 'ml', 'L'] as const

// Units that never take a plural "s".
const NO_PLURAL = new Set(['g', 'kg', 'ml', 'L', 'tbsp', 'tsp', 'oz', 'lb', 'large', 'medium', 'small', 'whole'])
const IRREGULAR_PLURALS: Record<string, string> = { leaf: 'leaves', loaf: 'loaves' }

// Units you can buy by count — the grocery list shows these instead of grams.
export const SHOPPING_COUNT_UNITS = ['', 'can', 'jar', 'bottle', 'package', 'bag', 'loaf', 'head', 'bunch', 'box', 'carton', 'block', 'tub']

const FRACTIONS: [number, string][] = [
  [0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, ''],
]

export function isMetricUnit(unit: string | null | undefined): unit is (typeof METRIC_UNITS)[number] {
  return METRIC_UNITS.includes(unit as (typeof METRIC_UNITS)[number])
}

/** 1.5 → "1½", 0.333 → "⅓", 12 → "12", 2.9 → "3". */
export function formatAmount(amount: number): string {
  if (!isFinite(amount) || amount <= 0) return '0'
  if (amount >= 10) return String(Math.round(amount))
  let whole = Math.floor(amount)
  const rest = amount - whole
  let best = FRACTIONS[0]
  for (const f of FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f
  if (best[0] === 1) whole += 1
  if (whole === 0 && best[1] === '') return FRACTIONS[1][1] // never show "0"
  return `${whole > 0 ? whole : ''}${best[1]}`
}

/** "cup" → "cups" when more than one; "can (796 ml)" → "cans (796 ml)"; "tbsp" stays. */
export function pluralizeUnit(unit: string, amount: number): string {
  if (amount <= 1 || !unit) return unit
  const [first, ...rest] = unit.split(' ')
  const head = first.replace(/,$/, '')
  const comma = first.endsWith(',') ? ',' : ''
  if (NO_PLURAL.has(head) || head.endsWith('s')) return unit
  const plural = IRREGULAR_PLURALS[head] ?? (/(ch|sh|x)$/.test(head) ? `${head}es` : `${head}s`)
  return [plural + comma, ...rest].join(' ')
}

function formatMetric(amount: number, unit: string): string {
  if (unit === 'g' && amount >= 1000) return `${Math.round(amount / 100) / 10} kg`
  if (unit === 'ml' && amount >= 1000) return `${Math.round(amount / 100) / 10} L`
  if (unit === 'g' || unit === 'ml') return `${Math.round(amount)} ${unit}`
  return `${Math.round(amount * 100) / 100} ${unit}`
}

export interface DisplayableIngredient {
  quantity_grams: number
  display_amount?: number | null
  display_unit?: string | null
}

/**
 * The amount as a recipe would write it, plus the gram weight as a quiet
 * note when the main text isn't already metric. `scale` multiplies both
 * (e.g. for a different number of servings).
 */
export function formatIngredientQuantity(ing: DisplayableIngredient, scale = 1): { text: string; grams: string | null } {
  const grams = ing.quantity_grams * scale
  if (ing.display_unit == null || ing.display_amount == null || ing.display_amount <= 0) {
    return { text: formatMetric(grams, 'g'), grams: null }
  }
  const amount = ing.display_amount * scale
  if (isMetricUnit(ing.display_unit)) return { text: formatMetric(amount, ing.display_unit), grams: null }
  const unit = pluralizeUnit(ing.display_unit, amount)
  return {
    text: unit ? `${formatAmount(amount)} ${unit}` : formatAmount(amount),
    grams: `≈${formatMetric(grams, 'g')}`,
  }
}

/** Grams for a metric amount (ml treated as grams, as everywhere else in the app). */
export function metricToGrams(amount: number, unit: (typeof METRIC_UNITS)[number]): number {
  return unit === 'kg' || unit === 'L' ? amount * 1000 : amount
}

/**
 * A USDA-style portion ("1 large", "1 cup, chopped", "0.5 cup") times a count
 * becomes a display amount and unit: ("1 large", 2) → { 2, "large" }.
 */
export function portionToDisplay(description: string, count: number): { display_amount: number; display_unit: string } {
  const match = description.trim().match(/^(\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/)
  if (!match) return { display_amount: count, display_unit: description.trim() }
  const [num, den] = match[1].split('/')
  const lead = den ? Number(num) / Number(den) : Number(num)
  return { display_amount: Math.round(lead * count * 1000) / 1000, display_unit: match[2].trim() }
}
