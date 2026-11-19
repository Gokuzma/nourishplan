import { describe, it, expect } from 'vitest'
import { aggregateIngredients, subtractInventory, groceryQuantity } from '../src/utils/groceryGeneration'

const recipeSlot = (ings: { name: string; grams: number; amount?: number; unit?: string | null }[]) => ({
  meal_id: 'm',
  meal_items: [{
    id: 'mi', item_type: 'recipe' as const, item_id: crypto.randomUUID(), quantity_grams: 100,
    recipe_ingredients: ings.map((g, i) => ({
      id: `i${i}`, ingredient_type: 'food' as const, ingredient_id: g.name.toLowerCase(), ingredient_name: g.name,
      quantity_grams: g.grams, display_amount: g.amount ?? null, display_unit: g.unit ?? null,
    })),
  }],
})

describe('grocery list in shopping units', () => {
  it('adds up eggs across recipes as a count', () => {
    const agg = aggregateIngredients([
      recipeSlot([{ name: 'Eggs', grams: 100, amount: 2, unit: '' }]),
      recipeSlot([{ name: 'Eggs', grams: 150, amount: 3, unit: '' }]),
    ], new Set())
    const { needToBuy } = subtractInventory(agg, [])
    expect(groceryQuantity(needToBuy[0])).toEqual({ quantity: 5, unit: 'units' })
  })

  it('rounds cans up and keeps the can size', () => {
    const agg = aggregateIngredients([recipeSlot([{ name: 'Diced Tomatoes', grams: 1200, amount: 1.5, unit: 'can (796 ml)' }])], new Set())
    const { needToBuy } = subtractInventory(agg, [])
    expect(groceryQuantity(needToBuy[0])).toEqual({ quantity: 2, unit: 'can (796 ml)' })
  })

  it('falls back to weight for cups or mixed units', () => {
    const rice = aggregateIngredients([recipeSlot([{ name: 'Rice', grams: 185, amount: 1, unit: 'cup' }])], new Set())
    expect(groceryQuantity(subtractInventory(rice, []).needToBuy[0])).toEqual({ quantity: 185, unit: 'g' })
    const mixed = aggregateIngredients([
      recipeSlot([{ name: 'Eggs', grams: 100, amount: 2, unit: '' }]),
      recipeSlot([{ name: 'Eggs', grams: 50 }]),
    ], new Set())
    expect(groceryQuantity(subtractInventory(mixed, []).needToBuy[0])).toEqual({ quantity: 150, unit: 'g' })
  })
})
