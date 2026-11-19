import { describe, it, expect } from 'vitest'
import { purchasePriceEntry, formatFoodPrice } from '../src/utils/cost'

describe('purchasePriceEntry', () => {
  it('prices a dozen eggs per egg, keyed by name when there is no food id', () => {
    const e = purchasePriceEntry({ food_name: 'Large Eggs', purchase_price: 4.99, quantity: 12, unit: 'units', unit_grams: 50 })!
    expect(e.food_id).toBe('name:large eggs')
    expect(e.cost_per_unit).toBeCloseTo(0.4158, 4)
    expect(e.grams_per_unit).toBe(50)
    expect(e.cost_per_100g).toBeCloseTo(0.8317, 3)
    expect(formatFoodPrice(e)).toBe('$0.42 each')
  })

  it('prices weighed food per 100 g and keeps a real food id', () => {
    const e = purchasePriceEntry({ food_id: '0612345', food_name: 'Chicken Breast', purchase_price: 14.87, quantity: 1.32, unit: 'kg' })!
    expect(e.food_id).toBe('0612345')
    expect(e.cost_per_unit).toBeNull()
    expect(e.cost_per_100g).toBeCloseTo(1.1265, 3)
    expect(formatFoodPrice(e)).toBe('$1.13/100g')
  })

  it('skips counted food with no unit weight, and items with no price', () => {
    expect(purchasePriceEntry({ food_name: 'Pizza', purchase_price: 6.97, quantity: 1, unit: 'units' })).toBeNull()
    expect(purchasePriceEntry({ food_name: 'Milk', purchase_price: null, quantity: 2, unit: 'L' })).toBeNull()
  })
})
