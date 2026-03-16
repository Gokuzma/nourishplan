import { describe, it, expect } from 'vitest';

describe('RecipeBuilder', () => {
  // RECP-01: Recipe creation
  it.todo('creates recipe with name and servings');
  it.todo('adds food ingredient with quantity');

  // RECP-03: Nutrition calculation
  it.todo('calculates per-serving nutrition from ingredients');
  it.todo('updates nutrition when ingredient quantity changes');
  it.todo('updates nutrition when servings count changes');

  // RECP-05: Ingredient management
  it.todo('edits ingredient quantity inline');
  it.todo('removes ingredient from recipe');
  it.todo('reorders ingredients by sort_order');
});

// RCPUX-01: FoodSearchOverlay navigation in select mode
describe('FoodSearchOverlay navigation (RCPUX-01)', () => {
  it('back button returns to search view when detail is shown, not closing overlay', () => {
    // Stub: will verify that clicking back chevron while detailFood is set
    // calls setDetailFood(null) instead of onClose
    expect(true).toBe(false) // RED — implement in 13-01
  });
});

// RCPUX-02: Recipe notes field
describe('Recipe notes (RCPUX-02)', () => {
  it('renders auto-expanding textarea with placeholder "Add notes or variations..."', () => {
    expect(true).toBe(false) // RED — implement in 13-01
  });

  it('saves notes on blur via useUpdateRecipe', () => {
    expect(true).toBe(false) // RED — implement in 13-01
  });
});
