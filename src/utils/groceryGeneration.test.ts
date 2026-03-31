import { describe, it, expect } from 'vitest'
import {
  aggregateIngredients,
  subtractInventory,
  assignCategories,
  formatDisplayQuantity,
  addRestockStaples,
  computeItemCost,
} from './groceryGeneration'
import type { InventoryItem, FoodPrice } from '../types/database'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeInventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    household_id: 'hh-1',
    added_by: 'user-1',
    food_name: 'Chicken Breast',
    brand: null,
    food_id: 'food-chicken',
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

// Represents a "resolved slot" — the structure aggregateIngredients receives
function makeResolvedSlot(overrides: {
  meal_id?: string | null
  meal_items?: {
    id: string
    item_type: 'food' | 'recipe'
    item_id: string
    quantity_grams: number
    item_name?: string | null
    recipe_ingredients?: {
      id: string
      ingredient_type: 'food' | 'recipe'
      ingredient_id: string
      quantity_grams: number
      ingredient_name?: string | null
      recipe_ingredients?: unknown[]
    }[]
  }[]
} = {}) {
  return {
    meal_id: 'meal_id' in overrides ? (overrides.meal_id ?? null) : 'meal-1',
    meal_items: overrides.meal_items ?? [],
  }
}

// ─── aggregateIngredients ────────────────────────────────────────────────────

describe('aggregateIngredients', () => {
  it('merges same food_id across two recipes with summed quantity', () => {
    const slots = [
      makeResolvedSlot({
        meal_items: [{
          id: 'mi-1', item_type: 'recipe', item_id: 'recipe-A', quantity_grams: 400,
          item_name: null,
          recipe_ingredients: [
            { id: 'ri-1', ingredient_type: 'food', ingredient_id: 'banana-id', quantity_grams: 500, ingredient_name: 'Banana' },
          ],
        }],
      }),
      makeResolvedSlot({
        meal_id: 'meal-2',
        meal_items: [{
          id: 'mi-2', item_type: 'recipe', item_id: 'recipe-B', quantity_grams: 400,
          item_name: null,
          recipe_ingredients: [
            { id: 'ri-2', ingredient_type: 'food', ingredient_id: 'banana-id', quantity_grams: 300, ingredient_name: 'Banana' },
          ],
        }],
      }),
    ]
    const result = aggregateIngredients(slots, new Set())
    expect(result).toHaveLength(1)
    expect(result[0].food_id).toBe('banana-id')
    expect(result[0].food_name).toBe('Banana')
    expect(result[0].total_grams).toBe(800)
  })

  it('skips slots where meal_id is null', () => {
    const slots = [
      makeResolvedSlot({ meal_id: null, meal_items: [
        { id: 'mi-1', item_type: 'food', item_id: 'apple-id', quantity_grams: 200, item_name: 'Apple' },
      ]}),
    ]
    const result = aggregateIngredients(slots, new Set())
    expect(result).toHaveLength(0)
  })

  it('handles nested recipe ingredients (ingredient_type=recipe) recursively', () => {
    // Top-level meal_item is a recipe, and one of its recipe_ingredients is also a recipe
    const slots = [
      makeResolvedSlot({
        meal_items: [{
          id: 'mi-1', item_type: 'recipe', item_id: 'outer-recipe', quantity_grams: 400,
          item_name: null,
          recipe_ingredients: [
            {
              id: 'ri-1', ingredient_type: 'recipe', ingredient_id: 'inner-recipe',
              quantity_grams: 200, ingredient_name: 'Sauce',
              recipe_ingredients: [
                { id: 'ri-2', ingredient_type: 'food', ingredient_id: 'tomato-id', quantity_grams: 150, ingredient_name: 'Tomato' },
              ],
            },
          ],
        }],
      }),
    ]
    const result = aggregateIngredients(slots, new Set())
    expect(result).toHaveLength(1)
    expect(result[0].food_id).toBe('tomato-id')
    expect(result[0].total_grams).toBe(150)
  })

  it('excludes recipe meal_items whose item_id is in cookedRecipeIds', () => {
    const cookedRecipeIds = new Set(['recipe-cooked'])
    const slots = [
      makeResolvedSlot({
        meal_items: [
          {
            id: 'mi-1', item_type: 'recipe', item_id: 'recipe-cooked', quantity_grams: 400,
            item_name: null,
            recipe_ingredients: [
              { id: 'ri-1', ingredient_type: 'food', ingredient_id: 'beef-id', quantity_grams: 300, ingredient_name: 'Beef' },
            ],
          },
          {
            id: 'mi-2', item_type: 'recipe', item_id: 'recipe-not-cooked', quantity_grams: 400,
            item_name: null,
            recipe_ingredients: [
              { id: 'ri-2', ingredient_type: 'food', ingredient_id: 'rice-id', quantity_grams: 200, ingredient_name: 'Rice' },
            ],
          },
        ],
      }),
    ]
    const result = aggregateIngredients(slots, cookedRecipeIds)
    expect(result).toHaveLength(1)
    expect(result[0].food_id).toBe('rice-id')
  })

  it('treats food-type meal_items as direct ingredients', () => {
    const slots = [
      makeResolvedSlot({
        meal_items: [{
          id: 'mi-1', item_type: 'food', item_id: 'egg-id', quantity_grams: 120, item_name: 'Egg',
        }],
      }),
    ]
    const result = aggregateIngredients(slots, new Set())
    expect(result).toHaveLength(1)
    expect(result[0].food_id).toBe('egg-id')
    expect(result[0].food_name).toBe('Egg')
    expect(result[0].total_grams).toBe(120)
  })
})

// ─── subtractInventory ───────────────────────────────────────────────────────

describe('subtractInventory', () => {
  it('sends item to alreadyHave when inventory fully covers need', () => {
    const ingredients = [{ food_id: 'banana-id', food_name: 'Banana', total_grams: 200 }]
    const inventory = [makeInventoryItem({ food_id: 'banana-id', quantity_remaining: 300, unit: 'g' })]

    const { needToBuy, alreadyHave } = subtractInventory(ingredients, inventory)

    expect(needToBuy).toHaveLength(0)
    expect(alreadyHave).toHaveLength(1)
    expect(alreadyHave[0].food_id).toBe('banana-id')
  })

  it('sends item to needToBuy when no inventory available', () => {
    const ingredients = [{ food_id: 'mango-id', food_name: 'Mango', total_grams: 500 }]
    const inventory: InventoryItem[] = []

    const { needToBuy, alreadyHave } = subtractInventory(ingredients, inventory)

    expect(needToBuy).toHaveLength(1)
    expect(needToBuy[0].quantity_grams).toBe(500)
    expect(alreadyHave).toHaveLength(0)
  })

  it('handles partial coverage: remainder goes to needToBuy, covered portion to alreadyHave', () => {
    const ingredients = [{ food_id: 'rice-id', food_name: 'Rice', total_grams: 500 }]
    const inventory = [makeInventoryItem({ food_id: 'rice-id', quantity_remaining: 200, unit: 'g' })]

    const { needToBuy, alreadyHave } = subtractInventory(ingredients, inventory)

    expect(needToBuy).toHaveLength(1)
    expect(needToBuy[0].quantity_grams).toBe(300)
    expect(alreadyHave).toHaveLength(1)
    expect(alreadyHave[0].covered_grams).toBe(200)
  })
})

// ─── assignCategories ────────────────────────────────────────────────────────

describe('assignCategories', () => {
  it('assigns category from keyword matching', () => {
    const items = [{ food_id: 'apple-id', food_name: 'apple', quantity_grams: 200 }]
    const result = assignCategories(items, [])
    expect(result[0].category).toBe('Produce')
    expect(result[0].category_source).toBe('auto')
  })

  it('falls back to Other when no keyword matches', () => {
    const items = [{ food_id: 'xyz-id', food_name: 'zzz unknown ingredient xyz', quantity_grams: 100 }]
    const result = assignCategories(items, [])
    expect(result[0].category).toBe('Other')
    expect(result[0].category_source).toBe('auto')
  })

  it('applies user override from previousItems when category_source is user', () => {
    const items = [{ food_id: 'apple-id', food_name: 'Apple', quantity_grams: 200 }]
    const previousItems = [{
      food_id: 'apple-id', food_name: 'Apple', category: 'Snacks', category_source: 'user',
    }]
    const result = assignCategories(items, previousItems)
    expect(result[0].category).toBe('Snacks')
    expect(result[0].category_source).toBe('user')
  })

  it('does not apply previousItems override when category_source is auto', () => {
    const items = [{ food_id: 'apple-id', food_name: 'Apple', quantity_grams: 200 }]
    const previousItems = [{
      food_id: 'apple-id', food_name: 'Apple', category: 'Other', category_source: 'auto',
    }]
    const result = assignCategories(items, previousItems)
    // Should still use keyword matching, not the auto previous
    expect(result[0].category).toBe('Produce')
    expect(result[0].category_source).toBe('auto')
  })
})

// ─── formatDisplayQuantity ───────────────────────────────────────────────────

describe('formatDisplayQuantity', () => {
  it('converts 1500g to 1.5 kg', () => {
    const result = formatDisplayQuantity(1500, false)
    expect(result.display_quantity).toBe(1.5)
    expect(result.display_unit).toBe('kg')
  })

  it('converts 1500ml to 1.5 L for liquid', () => {
    const result = formatDisplayQuantity(1500, true)
    expect(result.display_quantity).toBe(1.5)
    expect(result.display_unit).toBe('L')
  })

  it('leaves quantities under 1000 in original unit (g)', () => {
    const result = formatDisplayQuantity(750, false)
    expect(result.display_quantity).toBe(750)
    expect(result.display_unit).toBe('g')
  })

  it('leaves liquid quantities under 1000 in ml', () => {
    const result = formatDisplayQuantity(500, true)
    expect(result.display_quantity).toBe(500)
    expect(result.display_unit).toBe('ml')
  })

  it('rounds to 1 decimal place when converting', () => {
    const result = formatDisplayQuantity(1234, false)
    expect(result.display_quantity).toBe(1.2)
    expect(result.display_unit).toBe('kg')
  })
})

// ─── addRestockStaples ───────────────────────────────────────────────────────

describe('addRestockStaples', () => {
  it('includes low-stock staples not already in existingFoodIds', () => {
    const existingFoodIds = new Set<string>()
    const inventory = [
      makeInventoryItem({ food_id: 'salt-id', food_name: 'Salt', is_staple: true, quantity_remaining: 50, unit: 'g' }),
    ]
    const result = addRestockStaples(existingFoodIds, inventory)
    expect(result).toHaveLength(1)
    expect(result[0].food_name).toBe('Salt')
  })

  it('excludes low-stock staples already in existingFoodIds', () => {
    const existingFoodIds = new Set(['salt-id'])
    const inventory = [
      makeInventoryItem({ food_id: 'salt-id', food_name: 'Salt', is_staple: true, quantity_remaining: 50, unit: 'g' }),
    ]
    const result = addRestockStaples(existingFoodIds, inventory)
    expect(result).toHaveLength(0)
  })

  it('does not include staples that are above threshold', () => {
    const existingFoodIds = new Set<string>()
    const inventory = [
      makeInventoryItem({ food_id: 'flour-id', food_name: 'Flour', is_staple: true, quantity_remaining: 500, unit: 'g' }),
    ]
    const result = addRestockStaples(existingFoodIds, inventory)
    expect(result).toHaveLength(0)
  })
})

// ─── computeItemCost ─────────────────────────────────────────────────────────

describe('computeItemCost', () => {
  const prices: FoodPrice[] = [
    {
      id: 'price-1',
      household_id: 'hh-1',
      food_id: 'banana-id',
      food_name: 'Banana',
      store: 'Grocery Store',
      cost_per_100g: 0.50,
      created_by: 'user-1',
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    },
  ]

  it('returns (quantity_grams / 100) * cost_per_100g when price found', () => {
    const cost = computeItemCost(400, 'banana-id', prices)
    expect(cost).toBe(2.0) // (400/100) * 0.50
  })

  it('returns null when no matching price found', () => {
    const cost = computeItemCost(400, 'unknown-id', prices)
    expect(cost).toBeNull()
  })

  it('returns null when food_id is null', () => {
    const cost = computeItemCost(400, null, prices)
    expect(cost).toBeNull()
  })
})
