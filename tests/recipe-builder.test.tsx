import { describe, it } from 'vitest';

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
