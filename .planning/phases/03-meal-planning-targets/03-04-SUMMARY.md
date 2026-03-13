---
phase: 03-meal-planning-targets
plan: "04"
subsystem: ui
tags: [react, tanstack-query, supabase, tailwind, meal-plan, nutrition]

# Dependency graph
requires:
  - phase: 03-meal-planning-targets/03-01
    provides: DB types (MealPlan, MealPlanSlot), mealPlan utils (getWeekStart, DEFAULT_SLOTS)
  - phase: 03-meal-planning-targets/03-02
    provides: useMeals hook, Meal/MealItem types
  - phase: 03-meal-planning-targets/03-03
    provides: useNutritionTarget hook, NutritionTarget type
provides:
  - useMealPlan hook — query meal plan by household + weekStart (maybeSingle)
  - useCreateMealPlan hook — upsert with race-safe ignoreDuplicates
  - useMealPlanSlots hook — slots joined with meals and meal_items
  - useAssignSlot hook — upsert on (plan_id, day_index, slot_name)
  - useClearSlot hook — set meal_id = null on a slot
  - ProgressRing component — SVG circular macro progress indicator
  - MemberSelector component — dropdown for auth users + managed child profiles
  - SlotCard component — meal slot with assign/swap/clear and inline calorie display
  - DayCard component — full day with DEFAULT_SLOTS, custom slots, macro totals, 4 progress rings
  - PlanGrid component — mobile swipe + desktop scroll + meal picker modal
  - PlanPage at /plan — week navigation, create-plan flow, member target selector
affects:
  - Phase 04 offline sync (reads meal_plan_slots)
  - Phase 05 PWA (plan page is primary entry point)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SlotWithMeal intersection type extending MealPlanSlot with joined meals+meal_items
    - Client-side nutrition from meal_items macro snapshot columns (no re-fetch)
    - Touch event swipe detection via onTouchStart/onTouchEnd X delta > 50px threshold
    - Meal picker as bottom-sheet modal (rounded-t-2xl on mobile, centered on sm+)
    - upsert with ignoreDuplicates:true + .select().single() pattern for race-safe plan creation

key-files:
  created:
    - src/hooks/useMealPlan.ts
    - src/components/plan/ProgressRing.tsx
    - src/components/plan/MemberSelector.tsx
    - src/components/plan/SlotCard.tsx
    - src/components/plan/DayCard.tsx
    - src/components/plan/PlanGrid.tsx
    - src/pages/PlanPage.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "useMealPlanSlots joins meals(*,meal_items(*)) in single query — client computes nutrition from snapshot macros, no extra requests"
  - "SlotWithMeal intersection type defined in useMealPlan.ts and re-exported for component use"
  - "Mobile swipe uses native touch events (onTouchStart/onTouchEnd) with 50px threshold — no library dependency"
  - "MealPicker is a bottom-sheet modal on mobile (items end) centered on desktop (items-center sm:max-w-sm)"
  - "upsert on (plan_id,day_index,slot_name) conflict key allows idempotent slot assignment"

patterns-established:
  - "Plan components in src/components/plan/ directory, page in src/pages/PlanPage.tsx"
  - "ProgressRing used for 4 macros per day (cal/P/C/F) with distinct colors per macro"
  - "SlotCard renders empty state with dashed border + '+' button when no meal assigned"

requirements-completed: [MEAL-02, MEAL-03, MEAL-04, MEAL-06]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 3 Plan 4: Meal Plan Grid Summary

**Weekly meal plan grid with TanStack Query hooks, mobile swipe DayCards, SVG progress rings, and meal picker modal connecting household plan to per-member nutrition targets**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T21:33:35Z
- **Completed:** 2026-03-13T21:36:30Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Meal plan CRUD hooks (useMealPlan, useCreateMealPlan, useMealPlanSlots, useAssignSlot, useClearSlot) with upsert race-safety
- Full weekly plan UI: 7 DayCards with 4 default slots, nutrition totals, and 4 SVG progress rings per day
- Mobile swipe navigation (native touch events) between days with indicator dots; desktop vertical stack
- Meal picker bottom-sheet modal for assigning/swapping meals to slots
- PlanPage with week navigation (prev/next arrows), member selector, and auto-create plan flow

## Task Commits

1. **Task 1: Meal plan hooks** - `accc5f9` (feat)
2. **Task 2: PlanGrid, DayCard, SlotCard, ProgressRing, MemberSelector, PlanPage** - `3fb5ca4` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/hooks/useMealPlan.ts` - All meal plan TanStack Query hooks with SlotWithMeal type
- `src/components/plan/ProgressRing.tsx` - SVG circular progress indicator (sage/peach colors)
- `src/components/plan/MemberSelector.tsx` - Dropdown combining auth users and managed profiles
- `src/components/plan/SlotCard.tsx` - Single slot card with calorie display, swap/clear actions
- `src/components/plan/DayCard.tsx` - Day card with DEFAULT_SLOTS, custom slots, macro totals
- `src/components/plan/PlanGrid.tsx` - Week grid with mobile swipe, meal picker modal
- `src/pages/PlanPage.tsx` - Route with week navigation, member selector, create-plan flow
- `src/App.tsx` - /plan route replaced ComingSoonPage with PlanPage

## Decisions Made
- Client-side nutrition computed from meal_items macro snapshot columns in a single joined query — no extra network requests needed per slot
- upsert with `ignoreDuplicates: true` then `.select().single()` for race-safe plan creation (handles concurrent household members)
- Native touch events for swipe (no library) with 50px threshold — keeps bundle size minimal
- MemberSelector uses `id|type` composite value in select option to disambiguate user vs profile IDs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /plan route fully functional with household-shared meal plan data
- Per-member nutrition target progress rings ready
- Phase 4 (offline sync) can build on useMealPlanSlots and useAssignSlot patterns
- Phase 5 (PWA) plan page is the primary daily-use screen — ready for installability work

---
*Phase: 03-meal-planning-targets*
*Completed: 2026-03-13*
