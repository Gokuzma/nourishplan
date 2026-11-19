import { describe, it, expect } from 'vitest'
import { formatAmount, pluralizeUnit, formatIngredientQuantity, portionToDisplay } from '../src/utils/ingredientDisplay'

describe('formatAmount', () => {
  it('uses kitchen fractions', () => {
    expect(formatAmount(1.5)).toBe('1½')
    expect(formatAmount(0.333)).toBe('⅓')
    expect(formatAmount(0.25)).toBe('¼')
    expect(formatAmount(2.97)).toBe('3')
    expect(formatAmount(12)).toBe('12')
    expect(formatAmount(0.05)).toBe('⅛')
  })
})

describe('pluralizeUnit', () => {
  it('pluralises nouns but not abbreviations or sizes', () => {
    expect(pluralizeUnit('cup', 2)).toBe('cups')
    expect(pluralizeUnit('cup', 1)).toBe('cup')
    expect(pluralizeUnit('can (796 ml)', 2)).toBe('cans (796 ml)')
    expect(pluralizeUnit('cup, chopped', 2)).toBe('cups, chopped')
    expect(pluralizeUnit('pinch', 2)).toBe('pinches')
    expect(pluralizeUnit('tbsp', 3)).toBe('tbsp')
    expect(pluralizeUnit('large', 2)).toBe('large')
  })
})

describe('formatIngredientQuantity', () => {
  it('reads like a recipe with grams as a quiet note', () => {
    expect(formatIngredientQuantity({ quantity_grams: 100, display_amount: 2, display_unit: '' })).toEqual({ text: '2', grams: '≈100 g' })
    expect(formatIngredientQuantity({ quantity_grams: 185, display_amount: 1, display_unit: 'cup' })).toEqual({ text: '1 cup', grams: '≈185 g' })
    expect(formatIngredientQuantity({ quantity_grams: 15, display_amount: 3, display_unit: 'clove' }).text).toBe('3 cloves')
  })

  it('shows metric amounts without a duplicate gram note', () => {
    expect(formatIngredientQuantity({ quantity_grams: 450, display_amount: 450, display_unit: 'g' })).toEqual({ text: '450 g', grams: null })
    expect(formatIngredientQuantity({ quantity_grams: 1500, display_amount: 1500, display_unit: 'g' }).text).toBe('1.5 kg')
  })

  it('falls back to grams when no display unit is set', () => {
    expect(formatIngredientQuantity({ quantity_grams: 120 })).toEqual({ text: '120 g', grams: null })
  })

  it('scales with servings', () => {
    expect(formatIngredientQuantity({ quantity_grams: 120, display_amount: 0.5, display_unit: 'cup' }, 2)).toEqual({ text: '1 cup', grams: '≈240 g' })
  })
})

describe('portionToDisplay', () => {
  it('multiplies the portion by the count', () => {
    expect(portionToDisplay('1 large', 2)).toEqual({ display_amount: 2, display_unit: 'large' })
    expect(portionToDisplay('0.5 cup', 3)).toEqual({ display_amount: 1.5, display_unit: 'cup' })
    expect(portionToDisplay('1/4 cup, chopped', 2)).toEqual({ display_amount: 0.5, display_unit: 'cup, chopped' })
    expect(portionToDisplay('slice', 2)).toEqual({ display_amount: 2, display_unit: 'slice' })
  })
})
