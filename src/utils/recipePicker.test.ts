import { describe, it, expect } from 'vitest'
import { groupRecipesForSlot, type PickerRecipe } from './recipePicker'

function recipe(id: string, name: string, meal_types: string[]): PickerRecipe {
  return { id, name, servings: 4, meal_types }
}

const RECIPES: PickerRecipe[] = [
  recipe('1', 'Avocado Toast', ['Breakfast']),
  recipe('2', 'Beef Stew', ['Dinner']),
  recipe('3', 'Cornbread', []),
  recipe('4', 'Frittata', ['Breakfast', 'Lunch']),
  recipe('5', 'Greek Salad', ['Lunch', 'Dinner']),
  recipe('6', 'Hummus', ['Snacks']),
]

describe('groupRecipesForSlot', () => {
  it('puts slot-tagged recipes first, untagged second, rest last', () => {
    const groups = groupRecipesForSlot(RECIPES, 'Breakfast', '')
    expect(groups.slotMatch.map((r) => r.id)).toEqual(['1', '4'])
    expect(groups.untagged.map((r) => r.id)).toEqual(['3'])
    expect(groups.rest.map((r) => r.id)).toEqual(['2', '5', '6'])
  })

  it('preserves incoming order within each group', () => {
    const groups = groupRecipesForSlot(RECIPES, 'Dinner', '')
    expect(groups.slotMatch.map((r) => r.id)).toEqual(['2', '5'])
  })

  it('filters by case-insensitive substring on name', () => {
    const groups = groupRecipesForSlot(RECIPES, 'Breakfast', 'TOAST')
    expect(groups.slotMatch.map((r) => r.id)).toEqual(['1'])
    expect(groups.untagged).toEqual([])
    expect(groups.rest).toEqual([])
  })

  it('matches query across all groups', () => {
    const groups = groupRecipesForSlot(RECIPES, 'Breakfast', 'e')
    expect(groups.slotMatch.map((r) => r.id)).toEqual([])
    expect(groups.untagged.map((r) => r.id)).toEqual(['3'])
    expect(groups.rest.map((r) => r.id)).toEqual(['2', '5'])
  })

  it("treats slot 'Snack' as 'Snacks'", () => {
    const groups = groupRecipesForSlot(RECIPES, 'Snack', '')
    expect(groups.slotMatch.map((r) => r.id)).toEqual(['6'])
  })

  it('handles null meal_types as untagged', () => {
    const groups = groupRecipesForSlot(
      [{ id: 'x', name: 'Mystery', servings: 2, meal_types: null as unknown as string[] }],
      'Lunch',
      '',
    )
    expect(groups.untagged.map((r) => r.id)).toEqual(['x'])
  })
})
