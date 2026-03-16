import { describe, it, expect } from 'vitest';

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

// RCPUX-03: Date created on recipe list cards
describe('Recipe date created (RCPUX-03)', () => {
  it('shows relative time like "Created 3 days ago" on recipe cards', () => {
    expect(true).toBe(false) // RED — implement in 13-01
  });
});

// DELMG-01: Inline delete confirmation
describe('Inline delete confirmation (DELMG-01)', () => {
  it('shows inline "Delete [name]? Yes, delete / Keep it" instead of modal', () => {
    expect(true).toBe(false) // RED — implement in 13-01
  });

  it('only shows delete button for creator or admin', () => {
    expect(true).toBe(false) // RED — implement in 13-02
  });
});
