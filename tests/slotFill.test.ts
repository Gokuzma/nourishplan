import { describe, it, expect } from 'vitest'
import { slotFillLabels } from '../src/utils/slotFill'
import { barcodeServingNutrition } from '../src/utils/barcodeLookup'
import { sanitizeReadyMealFields } from '../supabase/functions/_shared/readyMeal'

describe('slotFillLabels', () => {
  it('labels leftovers with where they came from', () => {
    expect(slotFillLabels({ fill_source: 'leftover', fill_note: 'from Mon dinner', extra_portions: 0 }))
      .toEqual([{ text: 'Leftovers · Mon dinner', tooltip: 'Leftovers from Mon dinner' }])
  })
  it('labels a ready meal with its storage place', () => {
    expect(slotFillLabels({ fill_source: 'ready_meal', fill_note: 'Freezer · uses 4 of 4', extra_portions: 0 })[0])
      .toEqual({ text: 'From freezer', tooltip: 'Ready meal from inventory — uses 4 of 4 servings' })
  })
  it('labels make-ahead and extra portions; nothing for an ordinary slot', () => {
    expect(slotFillLabels({ fill_source: 'make_ahead', fill_note: 'prep ahead', extra_portions: 0 })[0].text).toBe('Make ahead')
    expect(slotFillLabels({ fill_source: null, fill_note: null, extra_portions: 2 })).toEqual([
      { text: '+2 portions', tooltip: 'Cook 2 extra portions for leftovers later this week' },
    ])
    expect(slotFillLabels({ fill_source: null, fill_note: null, extra_portions: 0 })).toEqual([])
  })
})

describe('barcodeServingNutrition', () => {
  const product = { food_name: 'Burrito', brand: '', calories: 200, protein: 8, fat: 7, carbs: 25, serving_size: '1 burrito (142 g)', barcode: '1' }
  it('scales per-100g values to the stated serving', () => {
    expect(barcodeServingNutrition(product)).toEqual({ serving_calories: 284, serving_protein_g: 11.4, serving_carbs_g: 35.5, serving_fat_g: 9.9 })
  })
  it('returns null without a gram serving size or calories', () => {
    expect(barcodeServingNutrition({ ...product, serving_size: '1 burrito' })).toBeNull()
    expect(barcodeServingNutrition({ ...product, calories: null })).toBeNull()
  })
})

describe('sanitizeReadyMealFields', () => {
  it('clears everything for a non-ready-meal', () => {
    expect(sanitizeReadyMealFields({ is_ready_meal: false, serving_calories: 500 })).toMatchObject({ is_ready_meal: false, serving_calories: null, ready_meal_slots: null })
  })
  it('keeps valid slots, defaults to Lunch/Dinner, and drops absurd numbers', () => {
    expect(sanitizeReadyMealFields({ is_ready_meal: true, ready_meal_slots: ['Breakfast', 'Brunch'], serving_calories: 420.44 }))
      .toMatchObject({ ready_meal_slots: ['Breakfast'], serving_calories: 420.4 })
    expect(sanitizeReadyMealFields({ is_ready_meal: true, serving_calories: -5, serving_grams: 0 }))
      .toMatchObject({ ready_meal_slots: ['Lunch', 'Dinner'], serving_calories: null, serving_grams: null })
  })
})
