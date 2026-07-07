import { describe, it, expect } from 'vitest'
import { getPriceForIngredient, getReferencePriceForIngredient } from './useFoodPrices'
import type { FoodPrice, ReferenceFoodPrice } from '../types/database'

function ref(name: string, cost: number): ReferenceFoodPrice {
  return {
    id: name, region: 'ontario', ingredient_name: name, cost_per_100g: cost,
    quantity_label: null, statcan_product_id: null, source: 'statcan',
    ref_period: '2026-05-01', updated_at: '2026-05-01',
  }
}
function hh(food_id: string, food_name: string, cost: number, store = ''): FoodPrice {
  return {
    id: food_id + store, household_id: 'h', food_id, food_name, store,
    cost_per_100g: cost, created_by: 'u', created_at: '', updated_at: '',
  }
}

const references = [
  ref('olive oil', 1.07),
  ref('potato', 0.29),
  ref('sweet potato', 0.55),
  ref('chicken breast', 1.40),
  ref('chicken', 0.80),
  ref('corn', 0.30),
  ref('rice', 0.47),
  ref('cream', 1.50),
  ref('red pepper', 0.60),
]

describe('getReferencePriceForIngredient — derivative false positives (regression)', () => {
  it('does NOT price broths/stocks as their base meat', () => {
    expect(getReferencePriceForIngredient(references, 'chicken broth')).toBeNull()
    expect(getReferencePriceForIngredient(references, 'chicken stock')).toBeNull()
    expect(getReferencePriceForIngredient(references, 'chicken breast bone broth')).toBeNull()
  })

  it('does NOT price starch/syrup/vinegar as their base plant', () => {
    expect(getReferencePriceForIngredient(references, 'corn starch')).toBeNull()
    expect(getReferencePriceForIngredient(references, 'corn syrup')).toBeNull()
    expect(getReferencePriceForIngredient(references, 'rice vinegar')).toBeNull()
  })

  it('does NOT price red pepper flakes (a spice) as fresh red pepper', () => {
    expect(getReferencePriceForIngredient(references, 'crushed red pepper flakes')).toBeNull()
  })

  it('still prices legitimate prep-descriptor forms', () => {
    expect(getReferencePriceForIngredient(references, 'chicken breast, diced')).toBeCloseTo(1.40)
    expect(getReferencePriceForIngredient(references, 'red pepper, sliced')).toBeCloseTo(0.60)
    expect(getReferencePriceForIngredient(references, 'boneless skinless chicken breast')).toBeCloseTo(1.40)
    expect(getReferencePriceForIngredient(references, 'white rice')).toBeCloseTo(0.47)
  })
})

describe('getReferencePriceForIngredient', () => {
  it('matches exact ingredient name (case-insensitive)', () => {
    expect(getReferencePriceForIngredient(references, 'Olive Oil')).toBeCloseTo(1.07)
  })

  it('loosely matches when the ingredient name contains a reference key', () => {
    expect(getReferencePriceForIngredient(references, 'extra virgin olive oil')).toBeCloseTo(1.07)
    expect(getReferencePriceForIngredient(references, 'boneless chicken breast, diced')).toBeCloseTo(1.40)
  })

  it('prefers the longest matching key (sweet potato over potato)', () => {
    expect(getReferencePriceForIngredient(references, 'roasted sweet potato')).toBeCloseTo(0.55)
    expect(getReferencePriceForIngredient(references, 'mashed potato')).toBeCloseTo(0.29)
  })

  it('does not match on a partial word (potato should not hit "potatoey")', () => {
    expect(getReferencePriceForIngredient(references, 'potatoey snack')).toBeNull()
  })

  it('returns null when nothing matches or inputs are empty', () => {
    expect(getReferencePriceForIngredient(references, 'saffron')).toBeNull()
    expect(getReferencePriceForIngredient([], 'olive oil')).toBeNull()
    expect(getReferencePriceForIngredient(references, null)).toBeNull()
  })
})

describe('getPriceForIngredient with reference fallback', () => {
  it('household price wins over reference', () => {
    const prices = [hh('id1', 'olive oil', 0.90)]
    expect(getPriceForIngredient(prices, 'id1', undefined, 'olive oil', references)).toBeCloseTo(0.90)
  })

  it('falls back to reference when the household has no matching price', () => {
    expect(getPriceForIngredient([], 'unknown-id', undefined, 'olive oil', references)).toBeCloseTo(1.07)
  })

  it('returns null when neither household nor reference has a price', () => {
    expect(getPriceForIngredient([], 'x', undefined, 'saffron', references)).toBeNull()
  })

  it('still works with no reference list supplied (backward compatible)', () => {
    const prices = [hh('id1', 'butter', 1.22)]
    expect(getPriceForIngredient(prices, 'id1')).toBeCloseTo(1.22)
    expect(getPriceForIngredient([], 'id1', undefined, 'butter')).toBeNull()
  })
})
