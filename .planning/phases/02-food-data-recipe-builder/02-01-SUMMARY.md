---
phase: 02-food-data-recipe-builder
plan: 01
subsystem: database
tags: [supabase, postgres, rls, typescript, vitest, nutrition, recipes]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: households, household_members tables and RLS patterns used for scoping custom_foods and recipes
provides:
  - custom_foods table with RLS (household-scoped, soft delete, creator/admin modify)
  - recipes table with RLS (same pattern)
  - recipe_ingredients table with RLS (parent recipe access check)
  - TypeScript types: CustomFood, Recipe, RecipeIngredient, MacroSummary, NormalizedFoodResult
  - src/utils/nutrition.ts: calcIngredientNutrition, calcRecipePerServing, wouldCreateCycle, applyYieldFactor, USDA_NUTRIENT_IDS, YIELD_FACTORS
  - Test stubs for all Phase 2 features (29 pending tests across 4 files)
affects:
  - 02-food-data-recipe-builder plans 02-05 (all depend on these tables, types, and utils)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "set_updated_at() reusable trigger function for timestamptz updated_at columns"
    - "Soft delete via deleted_at column; SELECT RLS policies filter deleted_at IS NOT NULL rows"
    - "Polymorphic ingredient_id: ingredient_type IN ('food','recipe') discriminates the UUID target"
    - "Per-100g normalization: all nutrition stored per-100g; calcIngredientNutrition scales to quantity at read time"
    - "Yield factor convention: values <1 = shrinkage (meat/fish), values >1 = absorption (legumes/grains)"
    - "BFS cycle detection: wouldCreateCycle traverses recipe ingredient graph to prevent circular nesting"

key-files:
  created:
    - supabase/migrations/004_food_recipe.sql
    - src/utils/nutrition.ts
    - tests/nutrition.test.ts
    - tests/food-search.test.ts
    - tests/custom-food.test.ts
    - tests/recipe-builder.test.tsx
    - tests/recipes.test.ts
  modified:
    - src/types/database.ts

key-decisions:
  - "Yield factor >1 for legumes/grains (2.5x) — absorb water when cooked; applyYieldFactor divides cooked weight by factor to get raw equivalent"
  - "Polymorphic recipe_ingredients.ingredient_id (no FK constraint) — references either custom_foods.id or recipes.id based on ingredient_type; avoids dual FK complexity"
  - "USDA_NUTRIENT_IDS exported as const object — consumer can reference by semantic name (energy, protein) rather than magic numbers"
  - "Test stubs use it.todo() — tests recognized as pending without failing CI; plans 02-03 through 02-05 convert to real tests"

patterns-established:
  - "Nutrition scaling: always store per-100g, scale to quantity at computation time"
  - "RLS household scoping: household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())"
  - "set_updated_at() trigger: reusable function, attach via CREATE TRIGGER on each table"

requirements-completed: [FOOD-05, RECP-02, RECP-04, RECP-06]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 2 Plan 01: Food & Recipe Data Foundation Summary

**Postgres schema for custom foods, recipes, and recipe ingredients with household RLS; TypeScript types; tested pure nutrition calculation utilities including BFS cycle detection and yield factor conversion**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T04:04:51Z
- **Completed:** 2026-03-13T04:07:46Z
- **Tasks:** 3 (Task 0, Task 1, Task 2)
- **Files modified:** 8

## Accomplishments
- Database migration with 3 tables (custom_foods, recipes, recipe_ingredients), full RLS policies, soft delete, and updated_at triggers
- TypeScript types for all Phase 2 entities including MacroSummary and NormalizedFoodResult shared types
- 15 passing unit tests covering all nutrition utility functions (TDD green)
- 29 pending test stubs covering all Phase 2 requirements across 4 feature test files

## Task Commits

Each task was committed atomically:

1. **Task 0: Create test stub scaffolds** - `6adb470` (test)
2. **Task 1: Database migration and TypeScript types** - `a7619d0` (feat)
3. **Task 2: Nutrition utils RED test** - `976849f` (test)
4. **Task 2: Nutrition utils GREEN implementation** - `04e11ab` (feat)

_Note: TDD task split into test commit (RED) and implementation commit (GREEN)_

## Files Created/Modified
- `supabase/migrations/004_food_recipe.sql` - custom_foods, recipes, recipe_ingredients tables with RLS and triggers
- `src/types/database.ts` - Added CustomFood, Recipe, RecipeIngredient, MacroSummary, NormalizedFoodResult interfaces and Database table entries
- `src/utils/nutrition.ts` - Pure nutrition calculation functions, USDA_NUTRIENT_IDS, YIELD_FACTORS
- `tests/nutrition.test.ts` - 15 tests covering all utility function behaviors
- `tests/food-search.test.ts` - FOOD-01, FOOD-02, FOOD-06 stubs (7 pending)
- `tests/custom-food.test.ts` - FOOD-03, FOOD-04, FOOD-05 stubs (7 pending)
- `tests/recipe-builder.test.tsx` - RECP-01, RECP-03, RECP-05 stubs (8 pending)
- `tests/recipes.test.ts` - RECP-01, RECP-02, RECP-04 stubs (7 pending)

## Decisions Made
- Polymorphic recipe_ingredients.ingredient_id with no DB foreign key constraint — avoids dual FK, type discriminated by ingredient_type column
- Yield factors >1 for legumes/grains (2.5x water absorption) — applyYieldFactor divides cooked weight by factor to get raw equivalent for nutrition lookup
- USDA_NUTRIENT_IDS exported as typed const object — semantic names prevent magic number errors in API consumers
- it.todo() stubs for Phase 2 feature tests — keeps CI green while establishing the test contract for subsequent plans

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Migration 004 ready to apply to Supabase (apply via dashboard SQL editor)
- All TypeScript types available for Phase 2 feature plans (02-02 through 02-05)
- Nutrition utilities fully tested and ready to use in recipe builder components
- Test stub files define verification targets for FOOD-01 through FOOD-06 and RECP-01 through RECP-06

## Self-Check: PASSED

All created files verified present on disk. All task commits verified in git log.

---
*Phase: 02-food-data-recipe-builder*
*Completed: 2026-03-13*
