# Recipe Discovery + Weekly Recipe Selector

**Date:** 2026-07-05
**Status:** Approved (design)
**Author:** audit + design session

## Problem

Populating recipes is the biggest bottleneck. The existing paths are functional but
utilitarian:

- `FillGapsModal` generates recipes framed as *fixing a supply deficit* — nobody gets
  excited by "need 3 more Breakfast".
- The `RecipePicker` in `PlanGrid` is a bare alphabetical name list — no search, no
  slot awareness, no macros — so choosing what to actually make this week is a chore
  (already flagged as open item A in `.planning/SESSION-HANDOFF.md`).

The user wants: recipes get **suggested** → appealing ones are **added to the recipe
book** → the family **selects** what to make this week, seeing macros and ingredients
along the way.

## Approach

### Component A — `discover` mode on `recipe-supply` edge function

New mode alongside `preview`/`commit`/`classify`. Inputs: `{ slot?: MealSlot | 'Any',
count, craving?: string }`. Builds a household taste profile server-side:

- dietary restrictions (`dietary_restrictions.predefined + custom_entries`)
- won't-eat foods (`wont_eat_entries.food_name`, allergy strength called out)
- top-rated recipe names (`recipe_ratings`, rating ≥ 4) as taste signal
- existing recipe names (avoid duplicates)

One AI call returns `count` distinct suggestions, each with: name, one-line pitch
(`description`), `meal_types`, servings, instructions, ingredients with per-100g
macros. Reuses the existing `sanitizeIngredient` clamps.

**Lesson compliance:** meal_types always set and validated in code — strict Breakfast
criteria, ≤2 slots cap enforced deterministically after parse, not just in the prompt
(L-036, L-038, L-039). Saving reuses the existing `commit` mode (already tags by slot).

### Component B — Discover modal (RecipesPage)

"Discover recipes" button on RecipesPage → modal:

- optional craving input ("cozy soups", "high-protein, kid-friendly") + slot chips
- suggestion cards: name, pitch, slot, per-serving kcal / P / F / C, expandable
  ingredient list
- per-card "Add to book" (single-recipe commit, card flips to Added ✓) and
  "Suggest more"

### Component C — Recipe selector (PlanGrid picker upgrade)

Implements handoff item A, plus macros:

- `slotName` threaded from `pickerState` into `RecipePicker`
- search input (case-insensitive substring)
- three groups: slot-matched first, then untagged, then rest — separator between
- each row shows per-serving kcal / P / F / C computed from embedded
  `recipe_ingredients` macro snapshots

Grouping/filtering is a pure util (`src/utils/recipePicker.ts`) with vitest coverage;
macros come from a new `useRecipeMacros()` hook (recipes + embedded ingredient macro
columns → `Map<recipeId, MacroSummary>`), key registered in `queryKeys.recipes`.

## Non-goals

- Auto-fill during generation / setup seed (Phase 2 of the 2026-05-31 supply spec).
- Persisting the one-line pitch on saved recipes (notes keeps instructions only).
- A separate "this week shortlist" entity — selection happens by filling slots via
  the upgraded picker; revisit if that proves insufficient.

## Testing

- Unit: picker grouping/filter/ordering; per-serving macro computation.
- Unit-style: slot-cap + breakfast-strictness sanitization on discover output shape.
- Existing suite must stay green (`npx vitest run`).
- Live: deploy `recipe-supply`, exercise discover → add → pick on prod.
