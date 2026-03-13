import { describe, it } from 'vitest';

describe('Recipes', () => {
  // RECP-01: Recipe CRUD
  it.todo('lists all household recipes');
  it.todo('navigates to recipe builder on click');
  it.todo('soft deletes recipe');

  // RECP-02: Nested recipes
  it.todo('adds recipe as ingredient in another recipe');
  it.todo('prevents circular recipe references');

  // RECP-04: Raw/cooked toggle
  it.todo('toggles ingredient between raw and cooked');
  it.todo('recalculates nutrition with yield factor on toggle');
});
