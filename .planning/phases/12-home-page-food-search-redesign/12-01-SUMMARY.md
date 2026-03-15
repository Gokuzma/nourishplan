---
phase: 12-home-page-food-search-redesign
plan: "01"
subsystem: ui
tags: [react, food-search, fuzzy-scoring, overlay, tanstack-query]

requires:
  - phase: 11-nutrition-calculation-fixes
    provides: Serving unit decisions and micronutrient display patterns reused in overlay

provides:
  - scoreFood function exported from useFoodSearch.ts with 5-tier relevance scoring
  - FoodSearchOverlay component for log and select modes
  - Unit tests for scoreFood covering all tiers and sort order

affects:
  - 12-02 (home page integration uses FoodSearchOverlay in log mode)
  - 12-02 (RecipeBuilder integration uses FoodSearchOverlay in select mode)
  - 12-03 (food tab removal and route cleanup)

tech-stack:
  added: []
  patterns:
    - Fuzzy relevance scoring in useMemo sort step (scoreFood exported for testability)
    - Full-screen overlay component with log/select dual-mode pattern
    - Inline row expansion for portion picker (no separate modal)

key-files:
  created:
    - src/components/food/FoodSearchOverlay.tsx
    - tests/useFoodSearch-scoring.test.ts
  modified:
    - src/hooks/useFoodSearch.ts

key-decisions:
  - "Test fixture for contains tier uses 'turban squash'/'ban' instead of 'plantain banana-like'/'ban' — banana-like starts with 'ban' at a whitespace word boundary, scoring 0.7 not 0.5"
  - "Select mode shows 'Add to Recipe' label inline on each result row (not via modal expansion) — row click immediately calls onSelect+onClose with no portion picker"
  - "FoodDetailPanel renders inside overlay at z-50 — in select mode onAdd calls onSelect+onClose, passing selection back to caller"

patterns-established:
  - "scoreFood: export scoring function separately from hook for pure-function testability without TanStack Query mocking"
  - "Dual-mode overlay: log mode expands rows with PortionStepper; select mode tap-to-select immediately without expansion"

requirements-completed:
  - UXLOG-02
  - UXLOG-04

duration: 6min
completed: 2026-03-15
---

# Phase 12 Plan 01: Fuzzy Search Scoring + FoodSearchOverlay Summary

**Relevance-scored food search (5-tier fuzzy scoring in useFoodSearch) and new FoodSearchOverlay component unifying log-mode home page search and select-mode RecipeBuilder ingredient picker**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-15T23:06:27Z
- **Completed:** 2026-03-15T23:12:00Z
- **Tasks:** 3 (Task 0 test, Task 1 scoring, Task 2 overlay)
- **Files modified:** 3

## Accomplishments

- Added `scoreFood` function with 5 relevance tiers (exact 1.0, starts-with 0.9, word boundary 0.7, contains 0.5, no match 0.3) — exported from useFoodSearch.ts for testability
- Updated useFoodSearch useMemo to sort merged results by score descending, then name length ascending within same tier; `query` added to deps array
- Created FoodSearchOverlay with Search/My Foods tabs, inline row expansion with PortionStepper in log mode, immediate select in select mode, full CRUD for custom foods, FoodDetailPanel integration, and all required accessibility attributes

## Task Commits

1. **Task 0: Create failing test file for scoreFood** - `e0377c3` (test)
2. **Task 1: Add fuzzy relevance scoring to useFoodSearch** - `48b8ac5` (feat)
3. **Task 2: Create FoodSearchOverlay component** - `b5fae30` (feat)

## Files Created/Modified

- `src/hooks/useFoodSearch.ts` - Added exported `scoreFood` function and relevance sort in useMemo
- `src/components/food/FoodSearchOverlay.tsx` - New full-screen search overlay with log and select modes
- `tests/useFoodSearch-scoring.test.ts` - Unit tests for scoreFood scoring tiers and sort order (8 tests, all green)

## Decisions Made

- Test fixture for the "contains" tier case was corrected: the plan's example `scoreFood('plantain banana-like', 'ban')` scores 0.7 (word boundary — `banana-like` starts with `ban`), not 0.5 as the test expected. Used `scoreFood('turban squash', 'ban')` = 0.5 as the contains example instead, which matches the spec's tier definitions correctly.
- Select mode shows an "Add to Recipe" inline label on each row and immediately calls `onSelect+onClose` on row tap — no expansion, no portion picker, matching the locked decision in CONTEXT.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect test fixture for contains-tier scoring**
- **Found during:** Task 1 (GREEN verification)
- **Issue:** Plan's test `scoreFood('plantain banana-like', 'ban')` expects 0.5 (contains) but the implementation correctly returns 0.7 (word boundary) because `banana-like` starts with `ban` when split by whitespace
- **Fix:** Changed test fixture to `scoreFood('turban squash', 'ban')` = 0.5, which has `ban` only inside `turban` (not at word start)
- **Files modified:** tests/useFoodSearch-scoring.test.ts
- **Verification:** All 8 scoring tests pass GREEN
- **Committed in:** 48b8ac5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test fixture bug)
**Impact on plan:** Fix necessary for correctness — the scoring implementation is correct per spec. No scope creep.

## Issues Encountered

- Pre-existing `src/contexts/AuthContext.tsx` (modified in working tree before this plan) causes `AuthContext.test.tsx` failures due to `supabase.auth.getUser` not being mocked. Confirmed pre-existing by reverting that file temporarily — tests pass without it. Not caused by this plan's changes; logged for deferred fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `FoodSearchOverlay` is ready for integration into `HomePage.tsx` (Plan 02, log mode) and `RecipeBuilder.tsx` (Plan 02, select mode)
- `scoreFood` exports cleanly for unit testing — no test infrastructure changes needed for future plans
- Pre-existing AuthContext.tsx test mock gap should be fixed before Phase 12 completion verification

---
*Phase: 12-home-page-food-search-redesign*
*Completed: 2026-03-15*

## Self-Check: PASSED

- src/hooks/useFoodSearch.ts: FOUND
- src/components/food/FoodSearchOverlay.tsx: FOUND
- tests/useFoodSearch-scoring.test.ts: FOUND
- .planning/phases/12-home-page-food-search-redesign/12-01-SUMMARY.md: FOUND
- Commit e0377c3 (test - failing scoreFood tests): FOUND
- Commit 48b8ac5 (feat - scoring implementation): FOUND
- Commit b5fae30 (feat - FoodSearchOverlay): FOUND
