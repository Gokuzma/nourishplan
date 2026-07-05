import { describe, it, expect } from 'vitest'
import { calcPerServingMacros } from './recipeMacros'

describe('calcPerServingMacros', () => {
  it('sums ingredient macros and divides by servings', () => {
    const macros = calcPerServingMacros(
      [
        { quantity_grams: 200, calories_per_100g: 100, protein_per_100g: 10, fat_per_100g: 5, carbs_per_100g: 20 },
        { quantity_grams: 100, calories_per_100g: 50, protein_per_100g: 2, fat_per_100g: 1, carbs_per_100g: 10 },
      ],
      2,
    )
    expect(macros.calories).toBe(125) // (200 + 50) / 2
    expect(macros.protein).toBe(11) // (20 + 2) / 2
    expect(macros.fat).toBe(5.5) // (10 + 1) / 2
    expect(macros.carbs).toBe(25) // (40 + 10) / 2
  })

  it('treats missing macro snapshots as zero, not NaN', () => {
    const macros = calcPerServingMacros(
      [{ quantity_grams: 150, calories_per_100g: null, protein_per_100g: undefined }],
      3,
    )
    expect(macros.calories).toBe(0)
    expect(macros.protein).toBe(0)
    expect(Number.isNaN(macros.fat)).toBe(false)
  })

  it('guards against servings of 0', () => {
    const macros = calcPerServingMacros(
      [{ quantity_grams: 100, calories_per_100g: 200, protein_per_100g: 0, fat_per_100g: 0, carbs_per_100g: 0 }],
      0,
    )
    expect(macros.calories).toBe(200)
  })

  it('returns zeros for an empty ingredient list', () => {
    const macros = calcPerServingMacros([], 4)
    expect(macros).toEqual({ calories: 0, protein: 0, fat: 0, carbs: 0 })
  })
})
