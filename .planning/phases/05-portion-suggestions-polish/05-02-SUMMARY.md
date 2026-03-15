---
phase: 05-portion-suggestions-polish
plan: 02
subsystem: testing
tags: [vitest, typescript, pure-functions, tdd, nutrition, portion-suggestions]

# Dependency graph
requires:
  - phase: 04-daily-logging-summary
    provides: FoodLog type, calcLogEntryNutrition utility
  - phase: 03-meal-planning-targets
    provides: NutritionTarget type
provides:
  - Pure portion suggestion calculation functions (calcRemainingCalories, calcPortionSuggestions, hasMacroWarning)
  - 19 unit tests covering all edge cases
affects: [05-04-portion-suggestion-hook, any UI consuming portion suggestions]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD red-green cycle for pure utility functions, proportional calorie split algorithm]

key-files:
  created:
    - src/utils/portionSuggestions.ts
    - tests/portionSuggestions.test.ts
  modified: []

key-decisions:
  - "calcPortionSuggestions uses remaining-calorie proportional split; members with null target receive 1.0 serving and null percentage (excluded from leftover calc)"
  - "Division by zero guard: when all members have zero remaining calories, all get 1.0 serving default instead of proportional split"
  - "hasMacroWarning checks (logged + portion) against target * 1.2 (over) and target * 0.8 (under) for each of protein, carbs, fat independently"
  - "Test data fix: two hasMacroWarning tests had incidental carbs/fat under-warnings from unrealistic target values — corrected to isolate the protein scenario under test"

patterns-established:
  - "MemberInput/MemberSuggestion/PortionResult interfaces define the contract between algorithm and hook layer"
  - "Pure functions with no side effects — all I/O via parameters, suitable for unit testing without mocks"

requirements-completed: [TRCK-05]

# Metrics
duration: 12min
completed: 2026-03-14
---

# Phase 5 Plan 02: Portion Suggestion Algorithm Summary

**Proportional calorie-split algorithm with macro warning detection: three pure TypeScript functions with 19 unit tests covering normal paths, null targets, division-by-zero, and 20% over/under thresholds**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-14T22:32:00Z
- **Completed:** 2026-03-14T22:44:00Z
- **Tasks:** 2 (RED + GREEN; no REFACTOR needed)
- **Files modified:** 2

## Accomplishments
- Implemented `calcRemainingCalories`: target minus logged total, clamped at zero, handles null target and null calorie target
- Implemented `calcPortionSuggestions`: proportional split by remaining calories, current user sorted first, no-target members get 1.0 serving / null percentage, division-by-zero guard returns 1.0 for all
- Implemented `hasMacroWarning`: checks protein/carbs/fat against ±20% threshold, short-circuits on null target or null macro targets
- 19 tests all pass; full suite (84 tests across 9 files) unaffected

## Task Commits

Each task was committed atomically:

1. **RED: Failing tests** - `0e15ac6` (test)
2. **GREEN: Implementation + test data fix** - `109dc5d` (feat)

_Note: TDD tasks follow test → feat commit pattern_

## Files Created/Modified
- `src/utils/portionSuggestions.ts` - Pure calculation functions: calcRemainingCalories, calcPortionSuggestions, hasMacroWarning, plus MemberInput/MemberSuggestion/PortionResult interfaces
- `tests/portionSuggestions.test.ts` - 19 unit tests with makeTarget/makeLog helpers

## Decisions Made
- Members without calorie targets receive 1.0 serving default and null percentage so they don't distort the proportional split or leftover calculation
- When the total remaining calories across all eligible members is zero (all have hit or exceeded their targets), every member defaults to 1.0 serving — avoids division-by-zero and provides a sensible fallback
- The 20% warning threshold applies independently to each macro; any single macro triggering the check makes `hasMacroWarning` return true

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test data causing incidental macro warnings in two hasMacroWarning tests**
- **Found during:** GREEN phase (running tests)
- **Issue:** Two "no warning" tests set large carbs/fat targets (250g, 500g) while logs only contributed 50–70g and portions added 20g — putting totals far below 80% of target, triggering the under-warning on carbs/fat even though the tests were designed to test protein only
- **Fix:** Updated both tests to use realistic targets (100g for all macros) with log + portion values that stay within the 80–120% window for carbs and fat, isolating each test to its intended scenario
- **Files modified:** tests/portionSuggestions.test.ts
- **Verification:** All 19 tests pass
- **Committed in:** 109dc5d (GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test data)
**Impact on plan:** Test data correction only — algorithm implementation unchanged. No scope creep.

## Issues Encountered
None beyond the test data fix above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `calcRemainingCalories`, `calcPortionSuggestions`, and `hasMacroWarning` are ready to be consumed by `usePortionSuggestions` hook (Plan 04)
- All interfaces (`MemberInput`, `MemberSuggestion`, `PortionResult`) are exported and stable
- No blockers

---
*Phase: 05-portion-suggestions-polish*
*Completed: 2026-03-14*
