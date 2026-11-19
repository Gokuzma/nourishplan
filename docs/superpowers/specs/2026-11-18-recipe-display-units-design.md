# Recipe-style ingredient amounts — short design

## Why
Ingredients showed in grams everywhere ("Eggs 100 g"). The user wants recipes to
read like a normal recipe: "2 eggs", "1 cup rice", "3 cloves garlic".

## Approved
- Each recipe ingredient keeps grams (nutrition, cost, inventory) plus a display
  amount and unit (migration 045). Grams show small as "≈100 g".
- New AI recipes (import, suggestions, recipe supply) return natural units.
- Existing recipes are converted once by AI (`ingredient-units`, run in the
  background from the Recipes page / recipe builder; display columns only).
- Recipe builder: pick a portion and "how many", or edit amount + unit + grams.
- Kitchen fractions (½, ⅓, ¼); scales with servings.
- Grocery list shows counts ("12 eggs", "2 cans (796 ml)") when every recipe uses the
  same buy-by-count unit; otherwise g/kg (you don't buy "cups").

## Builder's calls
- display_unit '' = a count of the named food; null = not converted (shown in grams).
- Cups/tbsp/tsp/cloves/slices stay as weight on the grocery list.
- Cooking steps are told to quote the recipe amounts, not grams.
- If the AI skips an ingredient during conversion it is marked as grams, so it isn't retried forever.
