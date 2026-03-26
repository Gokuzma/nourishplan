import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  getExpiryUrgency,
  convertToGrams,
  computeFifoDeductions,
  getAvailableQuantity,
  getLowStockStaples,
  getExpiringSoonItems,
  getPurchaseHistory,
} from './inventory'
import type { InventoryItem } from '../types/database'

// Helper to build a minimal InventoryItem for tests
function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'test-id',
    household_id: 'hh-1',
    added_by: 'user-1',
    food_name: 'Chicken Breast',
    brand: null,
    food_id: 'food-123',
    quantity_remaining: 500,
    unit: 'g',
    storage_location: 'fridge',
    is_opened: false,
    is_staple: false,
    purchased_at: '2026-03-10',
    expires_at: null,
    purchase_price: null,
    removed_at: null,
    removed_reason: null,
    is_leftover: false,
    leftover_from_recipe_id: null,
    created_at: '2026-03-10T12:00:00Z',
    updated_at: '2026-03-10T12:00:00Z',
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

// ─── getExpiryUrgency ────────────────────────────────────────────────────────

describe('getExpiryUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T00:00:00Z'))
  })

  it('returns expired for a date in the past', () => {
    expect(getExpiryUrgency('2026-03-20')).toBe('expired')
  })

  it('returns urgent for a date 2 days away', () => {
    expect(getExpiryUrgency('2026-03-27')).toBe('urgent')
  })

  it('returns warning for a date 5 days away', () => {
    expect(getExpiryUrgency('2026-03-30')).toBe('warning')
  })

  it('returns ok for a date more than 7 days away', () => {
    expect(getExpiryUrgency('2026-04-10')).toBe('ok')
  })

  it('returns none for null', () => {
    expect(getExpiryUrgency(null)).toBe('none')
  })
})

// ─── convertToGrams ─────────────────────────────────────────────────────────

describe('convertToGrams', () => {
  it('g: returns quantity unchanged', () => {
    expect(convertToGrams(500, 'g')).toBe(500)
  })

  it('kg: converts to grams by multiplying 1000', () => {
    expect(convertToGrams(0.5, 'kg')).toBe(500)
  })

  it('ml: returns quantity unchanged', () => {
    expect(convertToGrams(500, 'ml')).toBe(500)
  })

  it('L: converts to ml by multiplying 1000', () => {
    expect(convertToGrams(0.5, 'L')).toBe(500)
  })

  it('units: returns null (no weight conversion)', () => {
    expect(convertToGrams(3, 'units')).toBeNull()
  })

  it('kg: 1kg returns 1000g', () => {
    expect(convertToGrams(1, 'kg')).toBe(1000)
  })
})

// ─── computeFifoDeductions ──────────────────────────────────────────────────

describe('computeFifoDeductions', () => {
  it('deducts from oldest purchased_at first (FIFO ordering)', () => {
    const older = makeItem({ id: 'a', food_id: 'chicken-1', purchased_at: '2026-03-10', quantity_remaining: 500 })
    const newer = makeItem({ id: 'b', food_id: 'chicken-1', purchased_at: '2026-03-15', quantity_remaining: 500 })
    const items = [newer, older] // deliberately out of order to test sorting

    const { deductions, missing } = computeFifoDeductions(items, [
      { food_id: 'chicken-1', food_name: 'Chicken Breast', quantity_grams: 300 },
    ])

    expect(missing).toHaveLength(0)
    expect(deductions).toHaveLength(1)
    expect(deductions[0].item.id).toBe('a') // older item used first
    expect(deductions[0].deductAmount).toBe(300)
  })

  it('spreads across multiple items when first item is insufficient', () => {
    const item1 = makeItem({ id: 'a', food_id: 'chicken-1', purchased_at: '2026-03-10', quantity_remaining: 200 })
    const item2 = makeItem({ id: 'b', food_id: 'chicken-1', purchased_at: '2026-03-15', quantity_remaining: 500 })

    const { deductions, missing } = computeFifoDeductions([item1, item2], [
      { food_id: 'chicken-1', food_name: 'Chicken Breast', quantity_grams: 500 },
    ])

    expect(missing).toHaveLength(0)
    expect(deductions).toHaveLength(2)
    expect(deductions[0].item.id).toBe('a')
    expect(deductions[0].deductAmount).toBe(200)
    expect(deductions[1].item.id).toBe('b')
    expect(deductions[1].deductAmount).toBe(300)
  })

  it('adds to missing array when no matching food found', () => {
    const item = makeItem({ food_id: 'different-id', food_name: 'Rice' })

    const { deductions, missing } = computeFifoDeductions([item], [
      { food_id: 'chicken-1', food_name: 'Chicken Breast', quantity_grams: 300 },
    ])

    expect(deductions).toHaveLength(0)
    expect(missing).toContain('Chicken Breast')
  })

  it('falls back to case-insensitive food_name match when food_id is null', () => {
    const item = makeItem({ food_id: null, food_name: 'Chicken Breast', quantity_remaining: 400 })

    const { deductions, missing } = computeFifoDeductions([item], [
      { food_id: null, food_name: 'chicken breast', quantity_grams: 200 },
    ])

    expect(missing).toHaveLength(0)
    expect(deductions).toHaveLength(1)
    expect(deductions[0].deductAmount).toBe(200)
  })
})

// ─── getAvailableQuantity ────────────────────────────────────────────────────

describe('getAvailableQuantity', () => {
  it('sums quantity_remaining (in grams) for matching food_id', () => {
    const items = [
      makeItem({ food_id: 'food-abc', quantity_remaining: 200, unit: 'g' }),
      makeItem({ food_id: 'food-abc', quantity_remaining: 0.3, unit: 'kg' }),
      makeItem({ food_id: 'other', quantity_remaining: 999, unit: 'g' }),
    ]
    expect(getAvailableQuantity(items, 'food-abc')).toBe(500) // 200 + 300
  })

  it('excludes removed items', () => {
    const items = [
      makeItem({ food_id: 'food-abc', quantity_remaining: 200, unit: 'g', removed_at: null }),
      makeItem({ food_id: 'food-abc', quantity_remaining: 500, unit: 'g', removed_at: '2026-03-20T10:00:00Z' }),
    ]
    expect(getAvailableQuantity(items, 'food-abc')).toBe(200)
  })
})

// ─── getLowStockStaples ──────────────────────────────────────────────────────

describe('getLowStockStaples', () => {
  it('returns staple items below threshold', () => {
    const items = [
      makeItem({ food_name: 'Salt', is_staple: true, quantity_remaining: 50, unit: 'g' }),
      makeItem({ food_name: 'Flour', is_staple: true, quantity_remaining: 500, unit: 'g' }),
      makeItem({ food_name: 'Chicken', is_staple: false, quantity_remaining: 50, unit: 'g' }),
    ]
    const result = getLowStockStaples(items, 100)
    expect(result).toHaveLength(1)
    expect(result[0].food_name).toBe('Salt')
  })

  it('returns empty array when all staples are above threshold', () => {
    const items = [
      makeItem({ food_name: 'Salt', is_staple: true, quantity_remaining: 200, unit: 'g' }),
    ]
    expect(getLowStockStaples(items, 100)).toHaveLength(0)
  })
})

// ─── getExpiringSoonItems ────────────────────────────────────────────────────

describe('getExpiringSoonItems', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T00:00:00Z'))
  })

  it('returns items with urgent or warning urgency', () => {
    const items = [
      makeItem({ food_name: 'Milk', expires_at: '2026-03-27' }),    // urgent (2 days)
      makeItem({ food_name: 'Yogurt', expires_at: '2026-03-30' }),  // warning (5 days)
      makeItem({ food_name: 'Frozen Beef', expires_at: '2026-04-20' }), // ok
      makeItem({ food_name: 'Old Bread', expires_at: '2026-03-20' }), // expired
    ]
    const result = getExpiringSoonItems(items)
    expect(result).toHaveLength(2)
    expect(result.map(i => i.food_name)).toEqual(expect.arrayContaining(['Milk', 'Yogurt']))
  })

  it('returns empty array when no items expire soon', () => {
    const items = [
      makeItem({ food_name: 'Frozen Beef', expires_at: '2026-06-01' }),
    ]
    expect(getExpiringSoonItems(items)).toHaveLength(0)
  })
})

// ─── getPurchaseHistory ──────────────────────────────────────────────────────

describe('getPurchaseHistory', () => {
  it('returns purchase info including removed items', () => {
    const items = [
      makeItem({ food_id: 'rice-1', purchased_at: '2026-03-01', purchase_price: 3.50, unit: 'kg', removed_at: '2026-03-20T00:00:00Z' }),
      makeItem({ food_id: 'rice-1', purchased_at: '2026-03-15', purchase_price: 4.00, unit: 'kg', removed_at: null }),
      makeItem({ food_id: 'other-food', purchased_at: '2026-03-10', purchase_price: 1.00, unit: 'g', removed_at: null }),
    ]
    const result = getPurchaseHistory(items, 'rice-1')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ purchased_at: '2026-03-01', purchase_price: 3.50, unit: 'kg' })
    expect(result[1]).toMatchObject({ purchased_at: '2026-03-15', purchase_price: 4.00, unit: 'kg' })
  })
})
