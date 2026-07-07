import { describe, it, expect } from 'vitest'
import { parseQuantityToGrams, computeReferenceCostPer100g } from './referencePrices'

describe('parseQuantityToGrams', () => {
  it('treats "per kilogram" as 1000 g', () => {
    expect(parseQuantityToGrams('Apples, per kilogram')).toBe(1000)
    expect(parseQuantityToGrams('Chicken breasts, per kilogram')).toBe(1000)
  })

  it('parses gram quantities', () => {
    expect(parseQuantityToGrams('Bacon, 500 grams')).toBe(500)
    expect(parseQuantityToGrams('Canned tuna, 170 grams')).toBe(170)
    expect(parseQuantityToGrams('Frozen corn, 750 grams ')).toBe(750)
  })

  it('parses kilogram quantities with decimals', () => {
    expect(parseQuantityToGrams('Potatoes, 4.54 kilograms')).toBe(4540)
    expect(parseQuantityToGrams('White rice, 2 kilograms')).toBe(2000)
    expect(parseQuantityToGrams('Peanut butter, 1 kilogram')).toBe(1000)
  })

  it('treats litres and millilitres as grams (density ~1)', () => {
    expect(parseQuantityToGrams('Milk, 1 litre')).toBe(1000)
    expect(parseQuantityToGrams('Soy milk, 1.89 litres')).toBeCloseTo(1890)
    expect(parseQuantityToGrams('Mayonnaise, 890 millilitres')).toBe(890)
    expect(parseQuantityToGrams('Baby food, 128 millilitres')).toBe(128)
  })

  it('returns null for count-based units it cannot convert', () => {
    expect(parseQuantityToGrams('Eggs, 1 dozen')).toBeNull()
    expect(parseQuantityToGrams('Lemons, unit')).toBeNull()
    expect(parseQuantityToGrams('Avocado, unit')).toBeNull()
    expect(parseQuantityToGrams('Tea (20 bags)')).toBeNull()
  })
})

describe('computeReferenceCostPer100g', () => {
  it('converts a per-kg price to per-100g', () => {
    // $14.01 per kilogram → $1.401 per 100 g
    expect(computeReferenceCostPer100g(14.01, 1000)).toBeCloseTo(1.401)
  })

  it('converts a packaged price to per-100g', () => {
    // $10.74 for 1000 ml olive oil → $1.074 per 100 g
    expect(computeReferenceCostPer100g(10.74, 1000)).toBeCloseTo(1.074)
    // $6.50 for 500 g butter → $1.30 per 100 g
    expect(computeReferenceCostPer100g(6.5, 500)).toBeCloseTo(1.3)
  })

  it('returns null for non-positive grams', () => {
    expect(computeReferenceCostPer100g(5, 0)).toBeNull()
    expect(computeReferenceCostPer100g(5, -100)).toBeNull()
  })
})
