---
phase: 16-budget-engine-query-foundation
plan: 02
subsystem: ui
tags: [react, tanstack-query, supabase, cost-utils, recipe, food-prices]

# Dependency graph
requires:
  - phase: 16-01
    provides: queryKeys.foodPrices.list factory and FoodPrice type in database.ts
provides:
  - Cost utility functions (normaliseToCostPer100g, computeRecipeCostPerServing, formatCost)
  - Food price CRUD hooks (useFoodPrices, useSaveFoodPrice, useDeleteFoodPrice, getPriceForIngredient)
  - Inline price entry form on IngredientRow
  - Cost per serving badge on RecipeBuilder with partial pricing indicator
affects: [16-03, 16-04, recipe-views, ingredient-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - cost-per-100g normalisation for multi-unit price entry
    - upsert with compound conflict key (household_id,food_id,store) for price deduplication
    - inline form toggle pattern in list row (expand/collapse without modal)

key-files:
  created:
    - src/utils/cost.ts
    - src/utils/cost.test.ts
    - src/hooks/useFoodPrices.ts
  modified:
    - src/components/recipe/IngredientRow.tsx
    - src/components/recipe/RecipeBuilder.tsx

key-decisions:
  - "normaliseToCostPer100g centralises unit conversion (g/kg/ml/l) — callers pass raw user input, function handles all unit math"
  - "getPriceForIngredient returns first match when multiple stores exist, preferred store wins if provided"
  - "Cost badge rendered only when pricedCount > 0 — no badge shown for fully unpriced recipes"
  - "RecipesPage cards not shown cost badge — list view does not load ingredient data; badge only in RecipeBuilder detail view"

patterns-established:
  - "Pattern: cost normalisation to per-100g at save time, never at display time"
  - "Pattern: inline form toggle in list rows uses local showForm state, not modals"
  - "Pattern: stores datalist populated from existing food_prices for autocomplete"

requirements-completed: [BUDG-02, BUDG-04]

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 16 Plan 02: Cost Utilities and Recipe Price Display Summary

**Cost normalisation functions with 15 passing tests, food price CRUD hooks with upsert deduplication, and inline price entry on ingredients with cost-per-serving badge on RecipeBuilder.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T00:52:55Z
- **Completed:** 2026-03-26T00:55:57Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- TDD implementation of cost utilities: normaliseToCostPer100g handles g/kg/ml/l, computeRecipeCostPerServing handles full/partial/zero pricing and zero-servings edge case, formatCost formats CAD amounts; 15 tests all passing
- Food price CRUD hooks following useRecipes pattern with centralised queryKeys and upsert on household_id,food_id,store conflict
- IngredientRow extended with optional inline price entry form (amount, quantity, unit, store) and price display ($0.xx/100g)
- RecipeBuilder shows cost per serving badge with partial pricing indicator (+/serving pattern) and stores datalist for autocomplete

## Task Commits

1. **Task 1: Cost utility functions with tests** - `d3b8b29` (feat + test TDD)
2. **Task 2: Food price hooks and recipe cost display integration** - `8ee1159` (feat)

## Files Created/Modified
- `src/utils/cost.ts` - normaliseToCostPer100g, computeRecipeCostPerServing, formatCost
- `src/utils/cost.test.ts` - 15 unit tests covering all behaviors and edge cases
- `src/hooks/useFoodPrices.ts` - useFoodPrices, useSaveFoodPrice, useDeleteFoodPrice, getPriceForIngredient
- `src/components/recipe/IngredientRow.tsx` - Added price prop, onSavePrice prop, inline form toggle
- `src/components/recipe/RecipeBuilder.tsx` - Added cost hooks, handleSavePrice, cost badge, stores datalist

## Decisions Made
- `getPriceForIngredient` returns the first store's price when no preferred store is given — deterministic behaviour without requiring user to select a store each time
- Cost badge on RecipesPage list cards was deliberately omitted — the list page does not load ingredient data per recipe (would require N+1 queries). Badge only in RecipeBuilder where ingredients are already loaded.
- Inline price form uses local component state (showPriceForm toggle) rather than a modal — keeps the UX inline and lightweight per D-10

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Worktree branch was behind master (16-01 changes not yet merged). Resolved by merging master before execution. This is expected parallel agent behaviour.
- 3 pre-existing test failures in tests/guide.test.ts, tests/AppShell.test.tsx, tests/useFoodSearch-scoring.test.ts confirmed pre-existing (same failures on master before this plan's changes).

## Known Stubs
None — all price data flows from the real food_prices Supabase table via useFoodPrices hook. Cost badge only renders when pricedCount > 0 (no placeholder values shown).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cost utilities and food price hooks are ready for 16-03 (budget tracking/spend logs) and 16-04 (budget summary page)
- IngredientRow and RecipeBuilder cost UI is wired end-to-end — saving a price will persist to food_prices and invalidate the cache

---
*Phase: 16-budget-engine-query-foundation*
*Completed: 2026-03-26*
