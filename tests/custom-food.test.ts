import { describe, it } from 'vitest';

describe('CustomFood', () => {
  // FOOD-03: Custom food creation
  it.todo('creates custom food with required fields');
  it.todo('validates serving_grams > 0');
  it.todo('stores nutrition as per-100g');

  // FOOD-04: Custom food management
  it.todo('edits existing custom food');
  it.todo('soft deletes custom food');
  it.todo('only creator or admin can edit/delete');

  // FOOD-05: Micronutrients
  it.todo('stores micronutrients in jsonb column');
});
