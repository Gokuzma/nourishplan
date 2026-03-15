---
phase: 08-v1-1-ui-polish-and-usability-improvements
plan: 03
subsystem: ui
tags: [react, nutrition, progress-ring, meal-plan, tailwind]

# Dependency graph
requires:
  - phase: 08-02
    provides: ProgressRing component with theme-aware bgColor defaulting to currentColor

provides:
  - Per-slot mini nutrition rings on filled SlotCard instances (cal/P/C/F at size=20)
  - memberTarget prop threading from DayCard through to SlotCard

affects: [meal-plan UI, DayCard, SlotCard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - calcSlotNutrition helper pattern - returns full macro breakdown from meal_items (extends existing calcSlotCalories pattern)
    - memberTarget prop threading - DayCard passes member nutrition target down to SlotCard for per-slot ring rendering

key-files:
  created: []
  modified:
    - src/components/plan/SlotCard.tsx
    - src/components/plan/DayCard.tsx

key-decisions:
  - "calcSlotCalories replaced by calcSlotNutrition returning full {calories, protein, fat, carbs} - avoids double computation when both calories and macro rings are needed"

patterns-established:
  - "Mini rings use same color palette as DayCard day-total rings (#A8C5A0 cal, #93C5FD protein, #FCD34D carbs, #F9A8D4 fat) for visual consistency"

requirements-completed: [POLISH-03]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 08 Plan 03: Per-Slot Mini Nutrition Rings Summary

**4 tiny cal/P/C/F ProgressRings added to filled SlotCards showing each meal's contribution to daily targets**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T17:49:47Z
- **Completed:** 2026-03-15T17:51:44Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- SlotCard now accepts `memberTarget?: NutritionTarget | null` prop
- Replaced `calcSlotCalories` with `calcSlotNutrition` returning full macro object (calories, protein, fat, carbs)
- 4 mini ProgressRings (size=20, strokeWidth=2) render below the meal name for filled slots when memberTarget is provided
- DayCard passes memberTarget to both DEFAULT_SLOTS and custom slot SlotCard instances
- Empty slots show no rings (conditional on `meal && memberTarget`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add memberTarget prop to SlotCard and render mini rings** - `7a07d61` (feat)

**Plan metadata:** (docs commit — see final_commit below)

## Files Created/Modified

- `src/components/plan/SlotCard.tsx` - Added NutritionTarget import, ProgressRing import, calcSlotNutrition helper, memberTarget prop, mini ring row
- `src/components/plan/DayCard.tsx` - Added memberTarget={memberTarget} to both SlotCard render sites

## Decisions Made

- Replaced `calcSlotCalories` entirely with `calcSlotNutrition` (which returns all macros including calories) to avoid computing meal_items twice. The `calories` value is destructured from the result.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Mini rings visible on all filled slots in both light and dark mode (inheriting Plan 02's currentColor bgColor fix)
- Plan 04 can proceed with remaining phase 08 tasks

---
*Phase: 08-v1-1-ui-polish-and-usability-improvements*
*Completed: 2026-03-15*
