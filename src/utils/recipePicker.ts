import type { Recipe } from '../types/database'

export type PickerRecipe = Pick<Recipe, 'id' | 'name' | 'servings' | 'meal_types'>

export interface PickerGroups<T extends PickerRecipe> {
  slotMatch: T[]
  untagged: T[]
  rest: T[]
}

/**
 * Group recipes for the plan-slot picker: recipes tagged for the slot first,
 * then untagged (slot-agnostic) recipes, then everything else. Within each
 * group the incoming order (alphabetical from useRecipes) is preserved.
 * The query filters by case-insensitive substring on name.
 * Snack slots may arrive as 'Snack' while recipes are tagged 'Snacks'.
 */
export function groupRecipesForSlot<T extends PickerRecipe>(
  recipes: T[],
  slotName: string,
  query: string,
): PickerGroups<T> {
  const slot = slotName === 'Snack' ? 'Snacks' : slotName
  const q = query.trim().toLowerCase()
  const groups: PickerGroups<T> = { slotMatch: [], untagged: [], rest: [] }

  for (const recipe of recipes) {
    if (q && !recipe.name.toLowerCase().includes(q)) continue
    const mealTypes = recipe.meal_types ?? []
    if (mealTypes.includes(slot)) groups.slotMatch.push(recipe)
    else if (mealTypes.length === 0) groups.untagged.push(recipe)
    else groups.rest.push(recipe)
  }

  return groups
}
