---
phase: 16-budget-engine-query-foundation
plan: 01
subsystem: database
tags: [tanstack-query, query-keys, supabase, typescript, migrations, budget-engine]

requires:
  - phase: 15-v1-1-audit-gap-closure
    provides: completed v1.1 codebase foundation for v2.0 work

provides:
  - Centralised query key factory at src/lib/queryKeys.ts for all TanStack Query hooks
  - Budget engine DB schema (food_prices, spend_logs, weekly_budget, food_logs.cost)
  - FoodPrice and SpendLog TypeScript types in database.ts

affects:
  - 16-02 (food price management hooks use queryKeys.foodPrices)
  - 16-03 (spend log hooks use queryKeys.spendLogs and queryKeys.weeklySpend)
  - 16-04 (budget UI reads queryKeys from this factory)
  - All v2.0 phases (any new hook must import from queryKeys.ts)

tech-stack:
  added: []
  patterns:
    - queryKeys factory pattern with typed factory functions returning `as const` tuples
    - Prefix invalidation (bare arrays) for broad cache invalidation vs exact keys for targeted invalidation

key-files:
  created:
    - src/lib/queryKeys.ts
    - supabase/migrations/020_budget_engine.sql
  modified:
    - src/types/database.ts
    - src/hooks/useProfile.ts
    - src/hooks/useHousehold.ts
    - src/hooks/useRecipes.ts
    - src/hooks/useMeals.ts
    - src/hooks/useMealPlan.ts
    - src/hooks/useMealPlanTemplates.ts
    - src/hooks/useFoodLogs.ts
    - src/hooks/useFoodSearch.ts
    - src/hooks/useNutritionTargets.ts
    - src/hooks/useCustomFoods.ts

key-decisions:
  - "queryKeys.ts factory functions return `as const` tuples — TypeScript narrows to exact literal type for type-safe cache operations"
  - "Prefix invalidation calls kept as bare inline arrays (e.g., ['recipes'], ['household']) — TanStack Query prefix matching works correctly and avoids over-specifying invalidation scope"
  - "food_id column in food_prices is text NOT uuid — accommodates USDA numeric IDs, CNF IDs, and custom food UUIDs without type mismatch"
  - "spend_logs.source CHECK constraint enforces 'cook' | 'food_log' at DB level — matches TypeScript union type"
  - "weekly_budget added to useCreateHousehold return value as null — satisfies updated Household interface without DB round-trip"

patterns-established:
  - "All new hooks in v2.0 must import { queryKeys } from '../lib/queryKeys' and use factory functions for queryKey values"
  - "Exact key invalidation uses factory: queryClient.invalidateQueries({ queryKey: queryKeys.X.Y(...) })"
  - "Broad prefix invalidation stays as inline array: queryClient.invalidateQueries({ queryKey: ['namespace'] })"

requirements-completed:
  - BUDG-04

duration: 15min
completed: 2026-03-26
---

# Phase 16 Plan 01: Centralised Query Keys and Budget Engine DB Schema Summary

**Typed queryKeys factory covering 12 query families migrated across 10 hook files, plus food_prices/spend_logs tables and budget columns in a single migration**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-26T00:45:00Z
- **Completed:** 2026-03-26T00:48:12Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Created `src/lib/queryKeys.ts` with 12 query family namespaces (profile, household, recipes, meals, mealPlan, customFoods, foodSearch, nutritionTargets, foodLogs, foodPrices, weeklySpend, spendLogs)
- Migrated all 10 hook files from inline string array query keys to typed factory function calls
- Created migration 020 with food_prices table (RLS, trigger), spend_logs table (RLS), weekly_budget on households, and cost on food_logs
- Extended database.ts with FoodPrice, SpendLog interfaces and updated Household/FoodLog/Database types

## Task Commits

Each task was committed atomically:

1. **Task 1: Create queryKeys.ts and migrate all hooks** - `632ff4e` (feat)
2. **Task 2: DB migration and TypeScript type extensions for budget engine** - `a1a0c30` (feat)

## Files Created/Modified

- `src/lib/queryKeys.ts` - Centralised query key factory with 12 namespaces, all returning `as const` tuples
- `supabase/migrations/020_budget_engine.sql` - Budget engine schema: food_prices, spend_logs, weekly_budget, food_logs.cost with RLS
- `src/types/database.ts` - Added FoodPrice, SpendLog interfaces; weekly_budget on Household; cost on FoodLog; Database table entries for food_prices and spend_logs
- `src/hooks/useProfile.ts` - Migrated to queryKeys.profile.root()
- `src/hooks/useHousehold.ts` - Migrated to queryKeys.household.*(); added weekly_budget to select query
- `src/hooks/useRecipes.ts` - Migrated to queryKeys.recipes.*()
- `src/hooks/useMeals.ts` - Migrated to queryKeys.meals.*()
- `src/hooks/useMealPlan.ts` - Migrated to queryKeys.mealPlan.*()
- `src/hooks/useMealPlanTemplates.ts` - Migrated to queryKeys.mealPlan.templates() and queryKeys.mealPlan.slots()
- `src/hooks/useFoodLogs.ts` - Migrated to queryKeys.foodLogs.*()
- `src/hooks/useFoodSearch.ts` - Migrated to queryKeys.foodSearch.*()
- `src/hooks/useNutritionTargets.ts` - Migrated to queryKeys.nutritionTargets.*()
- `src/hooks/useCustomFoods.ts` - Migrated to queryKeys.customFoods.list()

## Decisions Made

- Prefix invalidation calls (e.g., `['recipes']`, `['household']`, `['custom-foods']`) left as bare inline arrays — these are intentional broad invalidations where TanStack Query's prefix matching is the desired behavior
- `food_id` in food_prices is `text NOT NULL` to accommodate USDA numeric IDs, CNF IDs, and custom food UUIDs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added weekly_budget: null to useCreateHousehold return value**
- **Found during:** Task 2 (database.ts type update)
- **Issue:** Adding `weekly_budget: number | null` to the Household interface caused a TypeScript error in useCreateHousehold which constructs a Household object manually without making a DB round-trip
- **Fix:** Added `weekly_budget: null` to the returned object literal
- **Files modified:** src/hooks/useHousehold.ts
- **Verification:** `npx tsc --noEmit` reports zero errors
- **Committed in:** a1a0c30 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix to keep TypeScript types consistent after Household interface was extended. No scope creep.

## Issues Encountered

- `useMealPlanTemplates.ts` had a `['meal-plan-slots', currentPlanId]` invalidation (exact key, not prefix) that was not listed in the plan's migration instructions — migrated it to `queryKeys.mealPlan.slots(currentPlanId)` as part of the complete migration

## Known Stubs

None — no data stubs or placeholder values were introduced.

## Self-Check: PASSED

- FOUND: src/lib/queryKeys.ts
- FOUND: supabase/migrations/020_budget_engine.sql
- FOUND: src/types/database.ts
- FOUND: commit 632ff4e (Task 1)
- FOUND: commit a1a0c30 (Task 2)

## Next Phase Readiness

- All query keys centralised; v2.0 hooks can safely import `queryKeys` without collision risk
- Migration 020 requires deployment to Supabase before food_prices or spend_logs hooks can be used
- `queryKeys.foodPrices`, `queryKeys.weeklySpend`, and `queryKeys.spendLogs` factories are ready for Phase 16 plans 02-04

---
*Phase: 16-budget-engine-query-foundation*
*Completed: 2026-03-26*
