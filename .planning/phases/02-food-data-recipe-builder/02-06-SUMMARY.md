---
phase: 02-food-data-recipe-builder
plan: 06
subsystem: database
tags: [postgres, rls, supabase, security-definer]

# Dependency graph
requires:
  - phase: 02-food-data-recipe-builder
    provides: migration 004 food/recipe schema with broken RLS policies
  - phase: 01-foundation-auth
    provides: get_user_household_id() and get_user_household_role() security-definer helpers (migration 002)
provides:
  - Corrected RLS policies for custom_foods, recipes, and recipe_ingredients using security-definer helpers
  - All 12 policies replaced — no raw household_members subqueries remain in policy clauses
affects:
  - phase 02 UAT tests 5-8 (custom foods) and 10-20 (recipes)
  - any future phase adding tables that need household-scoped RLS

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Household-scoped RLS via get_user_household_id() instead of raw subquery — avoids RLS recursion"
    - "recipe_ingredients access via exists-subquery on recipes.household_id — no direct household_members join needed"

key-files:
  created:
    - supabase/migrations/006_fix_food_recipe_rls.sql
  modified: []

key-decisions:
  - "recipe_ingredients policies use exists(select 1 from recipes r where r.household_id = get_user_household_id()) — avoids any direct household_members reference while preserving access semantics"
  - "Policy names kept identical to migration 004 originals — consistent naming across drop/recreate cycle"

patterns-established:
  - "RLS policy pattern: always use get_user_household_id() / get_user_household_role() helpers, never raw subquery on household_members"
  - "Indirect-access tables (no household_id column): join through the parent table and check parent.household_id = get_user_household_id()"

requirements-completed: [FOOD-03, FOOD-04, RECP-01, RECP-04, RECP-05, RECP-06]

# Metrics
duration: 1min
completed: 2026-03-13
---

# Phase 2 Plan 06: Fix Food & Recipe RLS Policies Summary

**Replaced all 12 broken RLS policies on custom_foods, recipes, and recipe_ingredients with security-definer helper calls to eliminate household_members recursion causing 403 failures**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-13T16:33:47Z
- **Completed:** 2026-03-13T16:34:58Z
- **Tasks:** 2 completed
- **Files modified:** 1

## Accomplishments

- Created migration 006 dropping all 12 policies from migration 004 that queried household_members directly in policy clauses
- Recreated custom_foods and recipes policies using `public.get_user_household_id()` and `public.get_user_household_role()` security-definer helpers
- Recreated recipe_ingredients policies with an `exists` subquery through `public.recipes` to avoid any direct household_members reference
- Verified: 12 drop statements, 12 create statements, zero raw household_members references in policy clauses

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 006 to fix all food/recipe RLS policies** - `0b6c7e0` (feat)
2. **Task 2: Verify migration SQL syntax and policy coverage** - verification only, no file changes

## Files Created/Modified

- `supabase/migrations/006_fix_food_recipe_rls.sql` - Drops 12 broken policies, recreates all 12 using security-definer helpers

## Decisions Made

- recipe_ingredients has no direct `household_id` column, so policies check access by joining through `public.recipes` (`exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id and r.household_id = public.get_user_household_id())`). This avoids any direct household_members reference while preserving the same access semantics as the original policies.
- Policy names kept identical to migration 004 originals to ensure consistent naming across the drop/recreate cycle.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The Task 2 verification command in the plan had a shell arithmetic issue with the `|| echo 0` fallback for grep (grep exits 1 on no match, causing the whole expression to fail before the fallback runs in certain shell contexts). Used `; true` instead to capture grep output correctly. This was a verification script issue only — the migration file itself was correct.

## User Setup Required

**Migration must be applied manually.** Apply via Supabase Dashboard SQL Editor:

1. Open Supabase Dashboard > SQL Editor
2. Paste the contents of `supabase/migrations/006_fix_food_recipe_rls.sql`
3. Run the query
4. Retry UAT tests 5-8 (custom foods) and 10-20 (recipes) to confirm 403s are resolved

No environment variable changes required.

## Next Phase Readiness

- Migration 006 is ready to be applied via Supabase Dashboard SQL Editor or `supabase db push`
- Once applied, all food and recipe CRUD operations for household members should succeed without 403 errors
- UAT tests 5-8 (custom foods) and 10-20 (recipes) should pass after migration is applied

---
*Phase: 02-food-data-recipe-builder*
*Completed: 2026-03-13*
