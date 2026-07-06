import { describe, it, expect } from 'vitest'
import {
  normaliseToCostPer100g,
  computeRecipeCostPerServing,
  formatCost,
  summariseWeeklySpend,
} from './cost'

describe('normaliseToCostPer100g', () => {
  it('converts $4.50 per kg to $0.45 per 100g', () => {
    expect(normaliseToCostPer100g(4.50, 1, 'kg')).toBeCloseTo(0.45)
  })

  it('converts $7.99 for 900g to ~$0.888 per 100g', () => {
    expect(normaliseToCostPer100g(7.99, 900, 'g')).toBeCloseTo(0.8878, 3)
  })

  it('converts $3.00 for 500g to $0.60 per 100g', () => {
    expect(normaliseToCostPer100g(3.00, 500, 'g')).toBeCloseTo(0.60)
  })

  it('converts $2.50 per litre to $0.25 per 100g', () => {
    expect(normaliseToCostPer100g(2.50, 1, 'l')).toBeCloseTo(0.25)
  })

  it('handles ml unit: $1.00 for 500ml = $0.20 per 100g', () => {
    expect(normaliseToCostPer100g(1.00, 500, 'ml')).toBeCloseTo(0.20)
  })

  it('returns 0 when quantity is 0 (avoid division by zero)', () => {
    expect(normaliseToCostPer100g(5.00, 0, 'g')).toBe(0)
  })
})

describe('computeRecipeCostPerServing', () => {
  it('returns correct cost when all ingredients are priced', () => {
    const ingredients = [
      { quantity_grams: 200, cost_per_100g: 0.50 }, // $1.00
      { quantity_grams: 100, cost_per_100g: 1.00 }, // $1.00
    ]
    const result = computeRecipeCostPerServing(ingredients, 4)
    expect(result.costPerServing).toBeCloseTo(0.50)
    expect(result.pricedCount).toBe(2)
    expect(result.totalCount).toBe(2)
  })

  it('sums only priced ingredients when partial pricing exists', () => {
    const ingredients = [
      { quantity_grams: 200, cost_per_100g: 0.50 }, // $1.00
      { quantity_grams: 100, cost_per_100g: null },  // unpriced
      { quantity_grams: 150, cost_per_100g: null },  // unpriced
    ]
    const result = computeRecipeCostPerServing(ingredients, 2)
    expect(result.costPerServing).toBeCloseTo(0.50)
    expect(result.pricedCount).toBe(1)
    expect(result.totalCount).toBe(3)
  })

  it('returns 0 cost and 0 pricedCount when no ingredients are priced', () => {
    const ingredients = [
      { quantity_grams: 200, cost_per_100g: null },
      { quantity_grams: 100, cost_per_100g: null },
    ]
    const result = computeRecipeCostPerServing(ingredients, 4)
    expect(result.costPerServing).toBe(0)
    expect(result.pricedCount).toBe(0)
    expect(result.totalCount).toBe(2)
  })

  it('returns 0 when servings is 0 (no division by zero)', () => {
    const ingredients = [{ quantity_grams: 200, cost_per_100g: 1.00 }]
    const result = computeRecipeCostPerServing(ingredients, 0)
    expect(result.costPerServing).toBe(0)
  })

  it('returns empty result for empty ingredient list', () => {
    const result = computeRecipeCostPerServing([], 4)
    expect(result.costPerServing).toBe(0)
    expect(result.pricedCount).toBe(0)
    expect(result.totalCount).toBe(0)
  })
})

describe('formatCost', () => {
  it('formats 2.45 as "$2.45"', () => {
    expect(formatCost(2.45)).toBe('$2.45')
  })

  it('formats 0 as "$0.00"', () => {
    expect(formatCost(0)).toBe('$0.00')
  })

  it('formats fractional amounts with 2 decimal places', () => {
    expect(formatCost(1.5)).toBe('$1.50')
  })

  it('formats large values correctly', () => {
    expect(formatCost(12.99)).toBe('$12.99')
  })
})

describe('summariseWeeklySpend', () => {
  it('tracks cook + takeout when no grocery spend is recorded (legacy weeks)', () => {
    const result = summariseWeeklySpend(
      [
        { amount: 12.5, source: 'cook' },
        { amount: 8.0, source: 'cook' },
      ],
      [15.0, null]
    )
    expect(result).toEqual({ totalSpend: 35.5, cookSpend: 20.5, grocerySpend: 0, foodLogSpend: 15.0 })
  })

  it('switches to grocery + takeout once grocery spend exists — cook is informational, never double-counted', () => {
    const result = summariseWeeklySpend(
      [
        { amount: 182.0, source: 'grocery' },
        { amount: 12.5, source: 'cook' },
        { amount: 8.0, source: 'cook' },
      ],
      [15.0]
    )
    expect(result.totalSpend).toBe(197.0)
    expect(result.grocerySpend).toBe(182.0)
    expect(result.cookSpend).toBe(20.5)
    expect(result.foodLogSpend).toBe(15.0)
  })

  it('sums multiple grocery trips in the same week', () => {
    const result = summariseWeeklySpend(
      [
        { amount: 120.0, source: 'grocery' },
        { amount: 62.0, source: 'grocery' },
      ],
      []
    )
    expect(result.totalSpend).toBe(182.0)
    expect(result.grocerySpend).toBe(182.0)
  })

  it('handles empty inputs and null amounts', () => {
    expect(summariseWeeklySpend([], [])).toEqual({
      totalSpend: 0, cookSpend: 0, grocerySpend: 0, foodLogSpend: 0,
    })
    expect(summariseWeeklySpend([{ amount: null, source: 'grocery' }], [null]).totalSpend).toBe(0)
  })
})
