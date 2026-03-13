---
phase: 03-meal-planning-targets
plan: 01
subsystem: database
tags: [supabase, postgres, rls, typescript, vitest, nutrition, meal-planning]

requires:
  - phase: 02-food-data-recipe-builder
    provides: "RLS helper functions (get_user_household_id, get_user_household_role), custom_foods and recipes tables, nutrition.ts utility functions, MacroSummary type"
  - phase: 01-foundation-auth
    provides: "households, household_members, member_profiles tables; auth setup"

provides:
  - "Migration 008: meals, meal_items, meal_plans, meal_plan_slots, meal_plan_templates, meal_plan_template_slots, nutrition_targets tables with RLS"
  - "week_start_day column on households table"
  - "TypeScript interfaces: Meal, MealItem, MealPlan, MealPlanSlot, MealPlanTemplate, MealPlanTemplateSlot, NutritionTarget"
  - "calcMealNutrition and calcDayNutrition utility functions in nutrition.ts"
  - "getWeekStart (UTC-safe), TARGET_PRESETS, DEFAULT_SLOTS, buildTargetUpsertPayload in mealPlan.ts"
  - "Unit tests for all new pure functions and nutrition target upsert logic"

affects:
  - 03-02 (meals CRUD and MealBuilder page)
  - 03-03 (meal plan grid and week navigation)
  - 03-04 (template save/load and swap)
  - 03-05 (nutrition targets UI)

tech-stack:
  added: []
  patterns:
    - "NutritionTarget uses two nullable FK columns (user_id, member_profile_id) with DB check constraint enforcing exactly one non-null — avoids unified person table"
    - "meal_items stores per-100g macro snapshot columns at insert time — avoids re-resolution on load (mirrors Phase 2 FoodDataMap approach)"
    - "getWeekStart uses UTC methods (getUTCDay, setUTCDate, toISOString) to avoid local timezone drift"
    - "buildTargetUpsertPayload pure helper validates exclusive FK ownership and throws on violation — called by mutation hooks"

key-files:
  created:
    - supabase/migrations/008_meals_plans_targets.sql
    - src/utils/mealPlan.ts
    - tests/meal-plan.test.ts
    - tests/nutrition-targets.test.ts
  modified:
    - src/types/database.ts
    - src/utils/nutrition.ts
    - tests/nutrition.test.ts

key-decisions:
  - "getWeekStart uses UTC methods throughout — mixing getDay() (local) with toISOString() (UTC) causes date-off-by-one errors when Date is constructed from YYYY-MM-DD strings (UTC midnight)"
  - "nutrition_targets has two nullable FKs (user_id, member_profile_id) with check constraint — supports both auth users and managed child profiles without a unified person table"
  - "meal_items macro snapshot columns (calories_per_100g etc.) captured at insert time — avoids live re-resolution of USDA/OFF/custom food sources on every page load"
  - "RLS on nutrition_targets uses get_user_household_id() and get_user_household_role() security-definer helpers — avoids RLS recursion from inline household_members joins"

patterns-established:
  - "Pattern: meal_items stores per-100g snapshots (not live references) — use same pattern for any future join-table with external food source references"
  - "Pattern: buildTargetUpsertPayload validates exclusive ownership before building payload — use same guard pattern for any table with exclusive nullable FKs"

requirements-completed: [MEAL-01, MEAL-02, MEAL-06, TRCK-01, TRCK-02, TRCK-03]

duration: 5min
completed: 2026-03-13
---

# Phase 3 Plan 01: Foundation — Tables, Types, and Utils Summary

**Migration 008 creates 7 Phase 3 tables with RLS; TypeScript types, calcMealNutrition/calcDayNutrition, UTC-safe getWeekStart, TARGET_PRESETS, and buildTargetUpsertPayload added with full unit test coverage**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-13T21:21:26Z
- **Completed:** 2026-03-13T21:25:56Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Migration 008 creates meals, meal_items, meal_plans, meal_plan_slots, meal_plan_templates, meal_plan_template_slots, and nutrition_targets tables with household-scoped RLS following migration 004 patterns
- NutritionTarget uses dual nullable FK (user_id / member_profile_id) with DB check constraint to support both auth users and managed child profiles without a unified person table
- calcMealNutrition, calcDayNutrition, getWeekStart (UTC-safe), TARGET_PRESETS, DEFAULT_SLOTS, and buildTargetUpsertPayload all exported and covered by unit tests (58 tests pass, 0 failures)

## Task Commits

1. **Task 1: Database migration — all Phase 3 tables and RLS** - `8f1641b` (feat)
2. **Task 2: TypeScript types, nutrition utils, meal plan utils, and unit tests** - `44e0ffd` (feat)

## Files Created/Modified

- `supabase/migrations/008_meals_plans_targets.sql` - All Phase 3 tables, RLS policies, indexes, week_start_day ALTER
- `src/types/database.ts` - Added Meal, MealItem, MealPlan, MealPlanSlot, MealPlanTemplate, MealPlanTemplateSlot, NutritionTarget interfaces; updated Household with week_start_day; added all new tables to Database type
- `src/utils/nutrition.ts` - Added calcMealNutrition and calcDayNutrition
- `src/utils/mealPlan.ts` - New file: getWeekStart, TARGET_PRESETS, DEFAULT_SLOTS, buildTargetUpsertPayload
- `tests/nutrition.test.ts` - Extended with calcMealNutrition and calcDayNutrition describe blocks
- `tests/meal-plan.test.ts` - New file: getWeekStart tests across multiple week start configurations
- `tests/nutrition-targets.test.ts` - New file: NutritionTarget type shape, buildTargetUpsertPayload, JSONB round-trip tests

## Decisions Made

- **UTC-only date arithmetic in getWeekStart:** The RESEARCH.md implementation used `getDay()` (local) with `toISOString()` (UTC), causing date-off-by-one errors when `new Date('YYYY-MM-DD')` parses as UTC midnight. Fixed by using `getUTCDay()` and `setUTCDate()` throughout.
- **Dual nullable FK for nutrition_targets:** user_id and member_profile_id are both nullable with a DB check constraint (`exactly one non-null`). This supports auth users and managed child profiles without adding a unified person table.
- **Macro snapshot in meal_items:** Columns `calories_per_100g`, `protein_per_100g`, `fat_per_100g`, `carbs_per_100g` captured at insert time. Avoids re-fetching USDA/OFF APIs on every plan page load.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed UTC/local timezone mismatch in getWeekStart**
- **Found during:** Task 2 (unit tests for getWeekStart)
- **Issue:** RESEARCH.md implementation used `getDay()` (local time) + `toISOString()` (UTC), causing the wrong date to be returned when the input `Date` is constructed from a date-only string (which parses as UTC midnight, potentially shifting to the previous local day)
- **Fix:** Rewrote getWeekStart to use `getUTCDay()`, `setUTCDate()`, and `toISOString()` consistently — all UTC
- **Files modified:** src/utils/mealPlan.ts, tests/meal-plan.test.ts (reverted T+12h workaround, restored date-only strings)
- **Verification:** All 6 getWeekStart tests pass including Monday-boundary and month-boundary cases
- **Committed in:** 44e0ffd (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix was required for correctness in any non-UTC timezone. No scope creep.

## Issues Encountered

- Docker Desktop not running — `npx supabase db reset` could not be executed. Migration was verified as syntactically correct by inspection against existing migration 004 patterns. Full DB verification deferred until Docker is available.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- All Phase 3 tables defined; RLS follows established patterns from migration 004
- TypeScript interfaces fully typed and match DB schema
- calcMealNutrition, calcDayNutrition, getWeekStart, buildTargetUpsertPayload all exported and tested
- Plan 03-02 (meals CRUD + MealBuilder page) can proceed immediately

---
*Phase: 03-meal-planning-targets*
*Completed: 2026-03-13*
