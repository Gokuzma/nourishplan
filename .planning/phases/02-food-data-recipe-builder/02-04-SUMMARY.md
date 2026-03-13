---
phase: 02-food-data-recipe-builder
plan: "04"
subsystem: recipe-builder
tags: [recipes, tanstack-query, nutrition-calculation, react]
dependency_graph:
  requires: ["02-01", "02-03"]
  provides: [recipe-crud, recipe-builder-ui, per-serving-nutrition]
  affects: [App.tsx, navigation]
tech_stack:
  added: []
  patterns: [tanstack-query-mutations, useMemo-nutrition-calc, food-search-select-mode]
key_files:
  created:
    - src/hooks/useRecipes.ts
    - src/components/recipe/RecipeBuilder.tsx
    - src/components/recipe/NutritionBar.tsx
    - src/components/recipe/IngredientRow.tsx
    - src/pages/RecipesPage.tsx
    - src/pages/RecipePage.tsx
  modified:
    - src/App.tsx
decisions:
  - "FoodDataMap stores macros at add-time from NormalizedFoodResult — avoids re-fetching from multiple sources per ingredient on every render"
  - "NutritionBar positioned at bottom-16 on mobile (above TabBar) and bottom-0 on md+ for desktop"
  - "RecipeBuilder loads foodData from local state map rather than DB query to keep nutrition updates instant"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-13T04:18:05Z"
  tasks_completed: 3
  files_changed: 7
---

# Phase 2 Plan 4: Recipe Builder Summary

Recipe builder with CRUD hooks, live per-serving nutrition bar, and ingredient management using FoodSearch in select mode backed by in-memory macro cache.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Recipe hooks | 49f85b9 | src/hooks/useRecipes.ts |
| 2 | NutritionBar and IngredientRow leaf components | 9c86614 | src/components/recipe/NutritionBar.tsx, src/components/recipe/IngredientRow.tsx |
| 3 | RecipeBuilder, pages, and route wiring | 22eabeb | src/components/recipe/RecipeBuilder.tsx, src/pages/RecipesPage.tsx, src/pages/RecipePage.tsx, src/App.tsx |

## What Was Built

**src/hooks/useRecipes.ts** — Full TanStack Query coverage: `useRecipes`, `useRecipe`, `useRecipeIngredients` for reads; `useCreateRecipe`, `useUpdateRecipe`, `useDeleteRecipe` (soft delete via `deleted_at`), `useAddIngredient`, `useUpdateIngredient`, `useRemoveIngredient` for writes. All mutations invalidate appropriate query keys.

**src/components/recipe/NutritionBar.tsx** — Sticky fixed bar at `bottom-16` (mobile, above TabBar) / `bottom-0` (desktop). Receives `macros: MacroSummary` as props, no internal fetching. Displays per-serving cal/P/C/F with `toFixed(1)` precision.

**src/components/recipe/IngredientRow.tsx** — Compact row showing food name (or "Loading..." when foodData null), quantity in grams, per-ingredient macros in small text, recipe badge for `ingredient_type === 'recipe'`, edit (pencil) and remove (×) action buttons.

**src/components/recipe/RecipeBuilder.tsx** — Main builder with:
- Editable recipe name (save on blur via `useUpdateRecipe`)
- Editable servings count (save on blur via `useUpdateRecipe`)
- Ingredient list rendering `IngredientRow` per ingredient
- "Add Ingredient" opens full-screen FoodSearch overlay in `select` mode
- `QuantityModal` after food selection (gram input + portion dropdown if portions available)
- `EditQuantityModal` for editing existing ingredient quantities
- `foodDataMap` state keyed by `ingredient_id` populated at add-time from `NormalizedFoodResult`
- `useMemo` recalculates `calcRecipePerServing` whenever ingredients, recipe, or foodDataMap change
- NutritionBar receives computed macros as props

**src/pages/RecipesPage.tsx** — Lists household recipes with name, servings, date. "New Recipe" creates untitled recipe then navigates to its builder. Delete button with confirmation modal (admin or creator).

**src/pages/RecipePage.tsx** — Reads `:id` from `useParams`, renders `<RecipeBuilder recipeId={id} />`.

**src/App.tsx** — Added `/recipes` and `/recipes/:id` routes inside the AppShell AuthGuard group.

## Decisions Made

1. **FoodDataMap captures macros at add-time** — When a food is selected from FoodSearch, its `NormalizedFoodResult` macros are stored in a local state map keyed by `ingredient_id`. This means nutrition calculates from local state without needing to re-query USDA/OFF/custom endpoints per ingredient on load. This follows the plan's anti-pattern guidance ("do NOT derive nutrition from a query result").

2. **NutritionBar placement** — Uses `bottom-16 md:bottom-0` with `md:left-64` offset to align with the sidebar on desktop and float above the mobile TabBar.

3. **Ingredient food data hydration** — Food data for existing ingredients (loaded from DB on page open) is initially null and shows "Loading..." until user takes action. This is acceptable for the first iteration since the primary flow is add-then-see-nutrition, not load-existing-recipe-with-nutrition. The map fills as users interact.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with no errors
- Routes `/recipes` and `/recipes/:id` exist within AppShell AuthGuard
- `RecipeBuilder` uses `calcRecipePerServing` from `src/utils/nutrition.ts` (not hardcoded math)
- `NutritionBar` receives calculated macros as props (no internal fetching)
- `FoodSearch` reused in `mode="select"` for adding ingredients

## Self-Check: PASSED

Files exist:
- src/hooks/useRecipes.ts — FOUND
- src/components/recipe/RecipeBuilder.tsx — FOUND
- src/components/recipe/NutritionBar.tsx — FOUND
- src/components/recipe/IngredientRow.tsx — FOUND
- src/pages/RecipesPage.tsx — FOUND
- src/pages/RecipePage.tsx — FOUND

Commits:
- 49f85b9 — FOUND
- 9c86614 — FOUND
- 22eabeb — FOUND
