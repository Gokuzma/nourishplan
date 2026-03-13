import { describe, it } from 'vitest';

describe('FoodSearch', () => {
  // FOOD-01: USDA search
  it.todo('searches USDA and returns normalized results');
  it.todo('debounces search input by 300ms');
  it.todo('shows loading skeleton while searching');

  // FOOD-02: Open Food Facts search
  it.todo('searches Open Food Facts and returns normalized results');
  it.todo('filters out entries with missing nutrition data');

  // FOOD-06: AI verification
  it.todo('shows verification badge on AI-verified results');
  it.todo('degrades gracefully when AI verification unavailable');
});
