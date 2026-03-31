import { getAvailableQuantity, getLowStockStaples } from './inventory'
import type { InventoryItem, FoodPrice } from '../types/database'

const MAX_RECIPE_DEPTH = 5

export const STORE_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Pantry/Dry Goods',
  'Frozen',
  'Beverages',
  'Condiments & Spices',
  'Snacks',
  'Other',
] as const

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Produce': [
    'apple', 'banana', 'orange', 'tomato', 'lettuce', 'spinach', 'carrot', 'onion',
    'garlic', 'broccoli', 'cucumber', 'pepper', 'potato', 'mushroom', 'zucchini',
    'celery', 'avocado', 'lemon', 'lime', 'grape', 'berry', 'berries', 'kale',
    'cabbage', 'cauliflower', 'asparagus', 'eggplant', 'squash', 'sweet potato',
    'mango', 'pineapple', 'watermelon', 'melon', 'peach', 'pear', 'plum', 'cherry',
    'corn', 'peas', 'bean', 'herbs', 'basil', 'parsley', 'cilantro', 'ginger',
  ],
  'Dairy': [
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cream cheese',
    'cottage cheese', 'mozzarella', 'cheddar', 'parmesan', 'brie', 'ricotta',
    'ghee', 'kefir', 'half and half', 'whipped cream',
  ],
  'Meat & Seafood': [
    'chicken', 'beef', 'pork', 'turkey', 'lamb', 'bacon', 'ham', 'sausage',
    'salmon', 'tuna', 'shrimp', 'cod', 'tilapia', 'halibut', 'crab', 'lobster',
    'ground beef', 'steak', 'ribs', 'duck', 'veal', 'venison', 'bison', 'fish',
    'prawn', 'mussel', 'scallop', 'anchovy', 'sardine',
  ],
  'Bakery': [
    'bread', 'bun', 'roll', 'bagel', 'muffin', 'croissant', 'pita', 'tortilla',
    'baguette', 'sourdough', 'rye', 'whole wheat', 'cake', 'cookie', 'pastry',
    'doughnut', 'donut', 'scone', 'waffle', 'pancake',
  ],
  'Pantry/Dry Goods': [
    'rice', 'pasta', 'flour', 'sugar', 'salt', 'oil', 'olive oil', 'lentil',
    'chickpea', 'black bean', 'kidney bean', 'quinoa', 'oat', 'cereal', 'granola',
    'bread crumb', 'panko', 'cornstarch', 'baking soda', 'baking powder', 'yeast',
    'honey', 'syrup', 'vinegar', 'soy sauce', 'canned', 'broth', 'stock', 'soup',
    'tomato paste', 'coconut milk', 'dried', 'lentils', 'nuts', 'seeds', 'almond',
    'walnut', 'peanut', 'cashew', 'sunflower seed', 'flaxseed', 'chia',
  ],
  'Frozen': [
    'frozen', 'ice cream', 'gelato', 'sorbet', 'frozen peas', 'frozen corn',
    'frozen berries', 'frozen vegetables', 'frozen meals', 'fish sticks',
    'frozen pizza', 'ice', 'edamame',
  ],
  'Beverages': [
    'juice', 'water', 'coffee', 'tea', 'soda', 'cola', 'sparkling', 'kombucha',
    'smoothie', 'almond milk', 'oat milk', 'soy milk', 'coconut water', 'energy drink',
    'sports drink', 'wine', 'beer', 'alcohol',
  ],
  'Condiments & Spices': [
    'ketchup', 'mustard', 'mayonnaise', 'hot sauce', 'sriracha', 'salsa', 'pesto',
    'hummus', 'tahini', 'worcestershire', 'fish sauce', 'oyster sauce', 'hoisin',
    'pepper', 'paprika', 'cumin', 'oregano', 'thyme', 'rosemary', 'cinnamon',
    'turmeric', 'chili flakes', 'curry powder', 'spice', 'seasoning', 'sauce',
    'dressing', 'relish', 'jam', 'jelly', 'peanut butter', 'almond butter',
  ],
  'Snacks': [
    'chips', 'crackers', 'popcorn', 'pretzel', 'chocolate', 'candy', 'gummy',
    'protein bar', 'granola bar', 'trail mix', 'dried fruit', 'rice cake',
    'jerky', 'fruit snack',
  ],
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AggregatedIngredient {
  food_id: string | null
  food_name: string
  total_grams: number
}

export interface GroceryItemDraft {
  food_id: string | null
  food_name: string
  quantity_grams: number
  covered_grams?: number
  total_needed_grams?: number
  is_staple_restock?: boolean
}

// Internal recursive ingredient type
interface RecipeIngredientNode {
  id: string
  ingredient_type: 'food' | 'recipe'
  ingredient_id: string
  quantity_grams: number
  ingredient_name?: string | null
  recipe_ingredients?: RecipeIngredientNode[]
}

interface MealItemNode {
  id: string
  item_type: 'food' | 'recipe'
  item_id: string
  quantity_grams: number
  item_name?: string | null
  recipe_ingredients?: RecipeIngredientNode[]
}

interface ResolvedSlot {
  meal_id: string | null
  meal_items: MealItemNode[]
}

// ─── aggregateIngredients ────────────────────────────────────────────────────

/**
 * Traverses resolved slot data and aggregates all food ingredients by food_id.
 * - Skips slots with null meal_id
 * - Skips recipe meal_items whose item_id is in cookedRecipeIds (already cooked this week)
 * - Handles nested recipe references up to MAX_RECIPE_DEPTH levels
 * - Aggregates by food_id; falls back to case-insensitive food_name when food_id is null
 */
export function aggregateIngredients(
  slots: ResolvedSlot[],
  cookedRecipeIds: Set<string>
): AggregatedIngredient[] {
  // Key: food_id ?? food_name.toLowerCase()
  const map = new Map<string, AggregatedIngredient>()

  function collectFromIngredients(ingredients: RecipeIngredientNode[], depth: number): void {
    if (depth > MAX_RECIPE_DEPTH) {
      console.warn('[groceryGeneration] Max recipe nesting depth reached, stopping traversal')
      return
    }

    for (const ing of ingredients) {
      if (ing.ingredient_type === 'food') {
        const key = ing.ingredient_id ?? (ing.ingredient_name ?? '').toLowerCase()
        if (!key) continue
        const existing = map.get(key)
        if (existing) {
          existing.total_grams += ing.quantity_grams
        } else {
          map.set(key, {
            food_id: ing.ingredient_id || null,
            food_name: ing.ingredient_name ?? ing.ingredient_id,
            total_grams: ing.quantity_grams,
          })
        }
      } else if (ing.ingredient_type === 'recipe') {
        if (ing.recipe_ingredients && ing.recipe_ingredients.length > 0) {
          collectFromIngredients(ing.recipe_ingredients, depth + 1)
        }
      }
    }
  }

  for (const slot of slots) {
    if (slot.meal_id === null) continue

    for (const item of slot.meal_items) {
      if (item.item_type === 'food') {
        const key = item.item_id ?? (item.item_name ?? '').toLowerCase()
        if (!key) continue
        const existing = map.get(key)
        if (existing) {
          existing.total_grams += item.quantity_grams
        } else {
          map.set(key, {
            food_id: item.item_id || null,
            food_name: item.item_name ?? item.item_id,
            total_grams: item.quantity_grams,
          })
        }
      } else if (item.item_type === 'recipe') {
        if (cookedRecipeIds.has(item.item_id)) continue

        if (item.recipe_ingredients && item.recipe_ingredients.length > 0) {
          collectFromIngredients(item.recipe_ingredients, 1)
        }
      }
    }
  }

  return Array.from(map.values())
}

// ─── subtractInventory ───────────────────────────────────────────────────────

/**
 * Splits aggregated ingredients into needToBuy and alreadyHave lists
 * based on available inventory quantities.
 */
export function subtractInventory(
  ingredients: AggregatedIngredient[],
  inventoryItems: InventoryItem[]
): { needToBuy: GroceryItemDraft[]; alreadyHave: GroceryItemDraft[] } {
  const needToBuy: GroceryItemDraft[] = []
  const alreadyHave: GroceryItemDraft[] = []

  for (const ingredient of ingredients) {
    const available = ingredient.food_id
      ? getAvailableQuantity(inventoryItems, ingredient.food_id)
      : 0

    if (available === 0) {
      needToBuy.push({
        food_id: ingredient.food_id,
        food_name: ingredient.food_name,
        quantity_grams: ingredient.total_grams,
      })
    } else if (available >= ingredient.total_grams) {
      alreadyHave.push({
        food_id: ingredient.food_id,
        food_name: ingredient.food_name,
        quantity_grams: ingredient.total_grams,
        covered_grams: ingredient.total_grams,
        total_needed_grams: ingredient.total_grams,
      })
    } else {
      // Partial coverage
      const remainder = ingredient.total_grams - available
      needToBuy.push({
        food_id: ingredient.food_id,
        food_name: ingredient.food_name,
        quantity_grams: remainder,
      })
      alreadyHave.push({
        food_id: ingredient.food_id,
        food_name: ingredient.food_name,
        quantity_grams: available,
        covered_grams: available,
        total_needed_grams: ingredient.total_grams,
      })
    }
  }

  return { needToBuy, alreadyHave }
}

// ─── assignCategories ────────────────────────────────────────────────────────

/**
 * Assigns a store category to each grocery item draft.
 * First checks previousItems for user overrides (category_source='user').
 * Falls back to keyword matching against CATEGORY_KEYWORDS.
 * Defaults to 'Other' with source='auto'.
 */
export function assignCategories(
  items: GroceryItemDraft[],
  previousItems: { food_id: string | null; food_name: string; category: string; category_source: string }[]
): (GroceryItemDraft & { category: string; category_source: 'auto' | 'user' })[] {
  return items.map(item => {
    // Check for user override in previousItems
    const userOverride = previousItems.find(
      p =>
        p.category_source === 'user' &&
        ((item.food_id !== null && p.food_id === item.food_id) ||
          p.food_name.toLowerCase() === item.food_name.toLowerCase())
    )

    if (userOverride) {
      return { ...item, category: userOverride.category, category_source: 'user' as const }
    }

    // Keyword matching
    const nameLower = item.food_name.toLowerCase()
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => nameLower.includes(kw))) {
        return { ...item, category, category_source: 'auto' as const }
      }
    }

    return { ...item, category: 'Other', category_source: 'auto' as const }
  })
}

// ─── formatDisplayQuantity ───────────────────────────────────────────────────

/**
 * Converts a gram/ml quantity to a human-readable display quantity and unit.
 * Quantities >= 1000 are converted to kg (or L for liquids).
 * Rounds to 1 decimal place when converting.
 */
export function formatDisplayQuantity(
  quantity_grams: number,
  isLiquid = false
): { display_quantity: number; display_unit: string } {
  if (quantity_grams >= 1000) {
    const converted = Math.round((quantity_grams / 1000) * 10) / 10
    return {
      display_quantity: converted,
      display_unit: isLiquid ? 'L' : 'kg',
    }
  }
  return {
    display_quantity: quantity_grams,
    display_unit: isLiquid ? 'ml' : 'g',
  }
}

// ─── addRestockStaples ───────────────────────────────────────────────────────

/**
 * Returns low-stock staple items as GroceryItemDraft entries for restock.
 * Filters out staples whose food_id is already in existingFoodIds.
 */
export function addRestockStaples(
  existingFoodIds: Set<string>,
  inventoryItems: InventoryItem[]
): GroceryItemDraft[] {
  const lowStockStaples = getLowStockStaples(inventoryItems, 100)

  return lowStockStaples
    .filter(item => item.food_id === null || !existingFoodIds.has(item.food_id))
    .map(item => ({
      food_id: item.food_id,
      food_name: item.food_name,
      quantity_grams: 0,
      is_staple_restock: true,
    }))
}

// ─── computeItemCost ─────────────────────────────────────────────────────────

/**
 * Computes estimated cost for a grocery item based on food_prices.
 * Returns null if no price found or food_id is null.
 */
export function computeItemCost(
  quantity_grams: number,
  food_id: string | null,
  foodPrices: FoodPrice[]
): number | null {
  if (food_id === null) return null

  const price = foodPrices.find(p => p.food_id === food_id)
  if (!price) return null

  return (quantity_grams / 100) * price.cost_per_100g
}
