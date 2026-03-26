import type { InventoryItem, InventoryUnit } from '../types/database'

export type ExpiryUrgency = 'expired' | 'urgent' | 'warning' | 'ok' | 'none'

/**
 * Classifies an item's expiry date into urgency levels.
 * Uses Date.UTC arithmetic to avoid timezone drift (same pattern as getWeekStart in mealPlan.ts).
 */
export function getExpiryUrgency(expiresAt: string | null): ExpiryUrgency {
  if (expiresAt === null) return 'none'

  const now = new Date()
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

  const [y, m, d] = expiresAt.split('-').map(Number)
  const expiryMs = Date.UTC(y, m - 1, d)

  const daysUntil = Math.ceil((expiryMs - todayMs) / 86400000)

  if (daysUntil < 0) return 'expired'
  if (daysUntil <= 3) return 'urgent'
  if (daysUntil <= 7) return 'warning'
  return 'ok'
}

/**
 * Converts an inventory quantity to grams/ml for comparison.
 * Returns null for discrete 'units' which have no weight conversion.
 */
export function convertToGrams(quantity: number, unit: InventoryUnit): number | null {
  switch (unit) {
    case 'g': return quantity
    case 'kg': return quantity * 1000
    case 'ml': return quantity
    case 'L': return quantity * 1000
    case 'units': return null
  }
}

export interface FifoNeed {
  food_id: string | null
  food_name: string
  quantity_grams: number
}

export interface FifoDeduction {
  item: InventoryItem
  deductAmount: number
}

export interface FifoResult {
  deductions: FifoDeduction[]
  missing: string[]
}

/**
 * Computes FIFO deductions for a list of ingredient needs against available inventory.
 * Matches by food_id first (exact), falls back to case-insensitive food_name.
 * Deducts from oldest purchased_at items first.
 * Items with unit='units' are skipped (cannot deduct by weight).
 */
export function computeFifoDeductions(items: InventoryItem[], needs: FifoNeed[]): FifoResult {
  const deductions: FifoDeduction[] = []
  const missing: string[] = []

  for (const need of needs) {
    const activeItems = items.filter(item => item.removed_at === null)

    // Match by food_id first (if non-null), then fall back to case-insensitive food_name
    let matches: InventoryItem[]
    if (need.food_id !== null) {
      matches = activeItems.filter(item => item.food_id === need.food_id)
    } else {
      matches = []
    }

    if (matches.length === 0) {
      const nameLower = need.food_name.toLowerCase()
      matches = activeItems.filter(item => item.food_name.toLowerCase() === nameLower)
    }

    if (matches.length === 0) {
      missing.push(need.food_name)
      continue
    }

    // Sort FIFO: oldest purchased_at first
    const sorted = [...matches].sort((a, b) => {
      if (a.purchased_at < b.purchased_at) return -1
      if (a.purchased_at > b.purchased_at) return 1
      return 0
    })

    let remaining = need.quantity_grams

    for (const item of sorted) {
      if (remaining <= 0) break

      const availableGrams = convertToGrams(item.quantity_remaining, item.unit)
      if (availableGrams === null) {
        // 'units' type — skip, cannot deduct by weight
        continue
      }

      const deductGrams = Math.min(availableGrams, remaining)
      if (deductGrams > 0) {
        deductions.push({ item, deductAmount: deductGrams })
        remaining -= deductGrams
      }
    }
  }

  return { deductions, missing }
}

/**
 * Returns the total available quantity (in grams/ml) for items matching a food_id.
 * Skips items with unit='units'. Only counts active (non-removed) items.
 */
export function getAvailableQuantity(items: InventoryItem[], foodId: string): number {
  return items
    .filter(item => item.food_id === foodId && item.removed_at === null)
    .reduce((sum, item) => {
      const grams = convertToGrams(item.quantity_remaining, item.unit)
      return grams !== null ? sum + grams : sum
    }, 0)
}

/**
 * Returns staple items (is_staple=true) whose available quantity is below the threshold.
 * Threshold defaults to 100g. Skips 'units' items.
 */
export function getLowStockStaples(items: InventoryItem[], thresholdGrams = 100): InventoryItem[] {
  return items.filter(item => {
    if (!item.is_staple) return false
    const grams = convertToGrams(item.quantity_remaining, item.unit)
    if (grams === null) return false
    return grams < thresholdGrams
  })
}

/**
 * Returns items expiring soon (urgency 'urgent' or 'warning').
 * withinDays is used for documentation purposes — urgency bands are fixed at 3/7 days.
 */
export function getExpiringSoonItems(items: InventoryItem[], _withinDays = 7): InventoryItem[] {
  return items.filter(item => {
    const urgency = getExpiryUrgency(item.expires_at)
    return urgency === 'urgent' || urgency === 'warning'
  })
}

/**
 * Returns the purchase history for items matching a food_id (includes removed items).
 */
export function getPurchaseHistory(
  items: InventoryItem[],
  foodId: string
): { purchased_at: string; purchase_price: number | null; unit: InventoryUnit }[] {
  return items
    .filter(item => item.food_id === foodId)
    .map(item => ({
      purchased_at: item.purchased_at,
      purchase_price: item.purchase_price,
      unit: item.unit,
    }))
}
