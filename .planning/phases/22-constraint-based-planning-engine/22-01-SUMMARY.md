---
phase: 22-constraint-based-planning-engine
plan: 01
subsystem: database
tags: [supabase, postgres, rls, tanstack-query, typescript]

requires:
  - phase: 19-drag-and-drop-planner
    provides: is_locked column on meal_plan_slots (migration 023)
  - phase: 03-meal-planning-targets
    provides: NutritionTarget interface and MealPlanSlot types used in gap calc

provides:
  - plan_generations table with async job tracking and RLS
  - generation_rationale column on meal_plan_slots
  - PlanGeneration TypeScript interface
  - MealPlanSlot updated with is_locked and generation_rationale fields
  - planGeneration query key factories (job + latest)
  - calcWeeklyGaps pure function with MemberIdentity and WeeklyGap interfaces
  - 6 passing unit tests for gap calculation

affects:
  - 22-02 (generate-plan edge function uses plan_generations table)
  - 22-03 (UI polls planGeneration query keys)
  - 22-04 (nutrition gap card uses calcWeeklyGaps)

tech-stack:
  added: []
  patterns:
    - "calcWeeklyGaps: pure function with no supabase/hook imports — testable in isolation"
    - "plan_generations RLS: SELECT + INSERT policies using get_user_household_id(); UPDATE only via service role edge function"

key-files:
  created:
    - supabase/migrations/026_plan_generations.sql
    - src/utils/nutritionGaps.ts
    - src/utils/__tests__/nutritionGaps.test.ts
  modified:
    - src/types/database.ts
    - src/lib/queryKeys.ts

key-decisions:
  - "plan_generations UPDATE policy intentionally omitted — only edge function with service role can update job status, preventing client-side status manipulation"
  - "calcWeeklyGaps sums all slots (not per-member slots) — current data model has shared plan slots, not per-member slots; gap is per-member based on their personal targets"
  - "threshold=0.9 default matches D-15 from 22-CONTEXT.md (stricter than existing 80% hasMacroWarning)"

patterns-established:
  - "Nutrition gap utility: import SlotWithMeal from useMealPlan hook, NutritionTarget from database.ts — pure function pattern for testability"

requirements-completed:
  - PLAN-02
  - PLAN-04

duration: 4min
completed: 2026-04-06
---

# Phase 22 Plan 01: Constraint-Based Planning Engine — Data Foundation Summary

**plan_generations async job table with RLS, MealPlanSlot updated with is_locked/generation_rationale, planGeneration query key factories, and a tested calcWeeklyGaps utility for per-member macro gap detection at 90% threshold**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-06T19:37:39Z
- **Completed:** 2026-04-06T19:41:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Migration 026 creates plan_generations table for async job tracking with SELECT + INSERT RLS using get_user_household_id(); no UPDATE policy (edge function uses service role)
- MealPlanSlot interface updated with is_locked (from Phase 19 DB migration) and generation_rationale (new); PlanGeneration interface exported; plan_generations added to Database Tables type
- calcWeeklyGaps pure function flags macros below 90% threshold per member per nutrient; MemberIdentity handles both auth users and managed profiles; 6 tests covering all behaviors pass

## Task Commits

1. **Task 1: DB migration, types, and query keys** - `af09f22` (feat)
2. **Task 2: Nutrition gap calculation utility with tests** - `4bf26ef` (feat)

## Files Created/Modified

- `supabase/migrations/026_plan_generations.sql` - plan_generations table + RLS + generation_rationale column on meal_plan_slots
- `src/types/database.ts` - PlanGeneration interface, updated MealPlanSlot, plan_generations in Database type
- `src/lib/queryKeys.ts` - planGeneration namespace with job() and latest() factories
- `src/utils/nutritionGaps.ts` - calcWeeklyGaps, MemberIdentity, WeeklyGap interfaces
- `src/utils/__tests__/nutritionGaps.test.ts` - 6 test cases covering all plan behaviors

## Decisions Made

- plan_generations UPDATE policy intentionally omitted — only the edge function with service role key can update job status; prevents client-side manipulation of job state
- calcWeeklyGaps aggregates all slots regardless of member — the data model uses shared plan slots, not per-member slots; gap analysis applies each member's personal targets against the household plan totals
- threshold=0.9 as default matches D-15 (22-CONTEXT.md), which explicitly set a stricter bar than the existing 80% hasMacroWarning used in daily logging

## Deviations from Plan

One minor deviation noted:

**1. [Rule 1 - Bug] Plan referenced 025_schedule.sql as "latest migration" but it does not exist**
- **Found during:** Task 1 (migration file creation)
- **Issue:** The plan's context stated "Latest migration number: 025_schedule.sql — next is 026" but the actual latest migration in the repo is 024_feedback_dietary.sql. The Phase 21 schedule migration was not present in this worktree's base commit.
- **Fix:** Proceeded with 026 numbering as specified in the plan — no change to plan output.
- **Impact:** None — the migration filename 026_plan_generations.sql is correct regardless of whether 025 exists.

---

**Total deviations:** 1 (informational only, no code change needed)
**Impact on plan:** No scope impact.

## Issues Encountered

Pre-existing test failures in tests/AuthContext.test.tsx, tests/auth.test.ts, tests/theme.test.ts, tests/guide.test.ts, and tests/useFoodSearch-scoring.test.ts are unrelated to this plan. The new nutritionGaps.test.ts passes all 6 tests.

## User Setup Required

None - no external service configuration required. Migration must be pushed to Supabase before edge function (Plan 22-02) can write to plan_generations.

## Next Phase Readiness

- Plan 22-02 (generate-plan edge function): plan_generations table schema ready; can INSERT jobs and UPDATE status via service role
- Plan 22-03 (polling UI): planGeneration.job() and planGeneration.latest() query key factories ready
- Plan 22-04 (nutrition gap card): calcWeeklyGaps exported and tested, accepts SlotWithMeal[] from useMealPlanSlots

---
*Phase: 22-constraint-based-planning-engine*
*Completed: 2026-04-06*
