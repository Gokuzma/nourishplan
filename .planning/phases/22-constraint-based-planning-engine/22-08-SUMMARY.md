---
phase: 22-constraint-based-planning-engine
plan: "08"
subsystem: ui-generation
tags: [react, plan-grid, shimmer, regression-test, gap-closure]
dependency_graph:
  requires: [22-06-SUMMARY]
  provides: [per-slot-shimmer-rendering, PlanGrid.shimmer.test]
  affects: []
tech_stack:
  added: []
  patterns:
    - "Per-slot shimmer: Array.from({ length: DAY_COUNT }) + DEFAULT_SLOTS.map with slot?.is_locked && slot.meal_id guard"
    - "Locked slots during generation render as SlotCard with isLocked + no-op handlers"
    - "data-testid shimmer-day-{i} (mobile) and shimmer-day-{i}-desktop on day containers for test targeting"
key_files:
  created:
    - tests/PlanGrid.shimmer.test.tsx
  modified:
    - src/components/plan/PlanGrid.tsx
decisions:
  - "Check slot?.is_locked && slot.meal_id (both conditions) before rendering SlotCard — slot.meal_id=null means slot exists in DB but has no meal, so it should still shimmer"
  - "Mock DayCarousel in shimmer test to avoid jsdom scrollIntoView crash — carousel scroll behavior is irrelevant to per-slot shimmer correctness"
  - "Array.from({ length: DAY_COUNT }) replaces dayCards.map((_, i) => ...) in shimmer branches — dayCards[i] is never used inside these loops"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-10"
  tasks_completed: 2
  files_changed: 2
---

# Phase 22 Plan 08: Shimmer Branch Fix and Regression Test Summary

**Per-slot shimmer fix for mixed locked/unlocked days: replaced `dayCards[i]` whole-day substitution with a direct `SlotCard`/`SlotShimmer` per-slot conditional in both mobile and desktop branches, plus a 3-case Vitest regression test.**

## Objective

Close UAT Gap D (test 3): during plan generation, a day with one locked slot was rendering 3 shimmers plus the entire `DayCard` (all 4 real slots) = 6+ stacked elements per day container. The fix renders exactly one element per slot — a real `SlotCard` for locked slots, a `SlotShimmer` for unlocked slots.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactor shimmer render branches in PlanGrid.tsx (mobile + desktop) | a210e25 | src/components/plan/PlanGrid.tsx |
| 2 | Add Vitest regression test tests/PlanGrid.shimmer.test.tsx | 7f1257e | tests/PlanGrid.shimmer.test.tsx |

## Changes Made

### Component (`src/components/plan/PlanGrid.tsx`)

Mobile carousel shimmer branch (lines 576-603):
- `dayCards.map((_, i) => ...)` replaced with `Array.from({ length: DAY_COUNT }, (_, i) => ...)`
- Day container div gains `data-testid={`shimmer-day-${i}`}` for test targeting
- Inner loop: `slot?.is_locked && slot.meal_id ? <SlotCard key={slotName} ... isLocked onAssign/onClear/onSwap={()=>{}} /> : <SlotShimmer key={slotName} />`

Desktop stack shimmer branch (lines 607-634):
- Same pattern with `data-testid={`shimmer-day-${i}-desktop`}`
- Identical per-slot conditional logic

Both the WIP additions (useNavigate import, supabase import, RecipeSuggestionCard onAdd handler calling `create-recipe-from-suggestion`) and the 22-06 edits (`isGenerationComplete` covering `'partial'`, `useEffect` terminal-status check covering `'done' | 'partial' | 'timeout' | 'error'`) were preserved unchanged.

### Test (`tests/PlanGrid.shimmer.test.tsx`)

3 test cases:
1. `day with ZERO locked slots shows exactly 4 shimmers` — asserts `[aria-hidden="true"].animate-pulse` count = 4 inside `shimmer-day-0` (mobile) and `shimmer-day-0-desktop` (desktop)
2. `day with ONE locked slot shows 3 shimmers + 1 real slot (no duplicate content)` — asserts shimmer count = 3 and meal name appears exactly once inside `shimmer-day-1-desktop`
3. `day with ALL 4 locked slots shows 0 shimmers + 4 real slots` — asserts shimmer count = 0 and all 4 meal names present inside `shimmer-day-2-desktop`

All tests use `await import('../src/components/plan/PlanGrid')` ESM pattern per `tests/AppShell.test.tsx` canonical.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mock DayCarousel to prevent jsdom scrollIntoView crash**
- **Found during:** Task 2 test run
- **Issue:** `DayCarousel.tsx` calls `el.scrollIntoView(...)` in a `useEffect` — jsdom does not implement `scrollIntoView`, causing all 3 tests to crash with `TypeError: el.scrollIntoView is not a function`
- **Fix:** Added `vi.mock('../src/components/plan/DayCarousel', ...)` to the test file, rendering children directly without carousel behavior. The mock is correct because carousel scroll is orthogonal to shimmer correctness.
- **Files modified:** `tests/PlanGrid.shimmer.test.tsx`
- **Commit:** 7f1257e (included in Task 2 commit)

## Known Stubs

None. No placeholder data or hardcoded empty values introduced.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- [x] `src/components/plan/PlanGrid.tsx` modified: no `dayCards[i]` inside shimmer loop (`grep` returns empty)
- [x] `slot?.is_locked && slot.meal_id` appears 2 times in PlanGrid.tsx (mobile + desktop branches)
- [x] `data-testid` markers present: `shimmer-day-${i}` and `shimmer-day-${i}-desktop`
- [x] `useNavigate` import preserved (line 11)
- [x] `supabase` import preserved (line 12)
- [x] `create-recipe-from-suggestion` handler preserved (line 665)
- [x] `activeJob?.status === 'partial'` still in PlanGrid.tsx at lines 178 and 195
- [x] `tests/PlanGrid.shimmer.test.tsx` exists with 3 test cases
- [x] `await import('../src/components/plan/PlanGrid')` pattern used (not require())
- [x] `vi.mock('../src/hooks/useNutritionTargets'` present in test
- [x] All 3 tests pass: `npx vitest run tests/PlanGrid.shimmer.test.tsx` exits 0
- [x] `npx vite build` succeeded (573ms, no TypeScript errors)
- [x] Commits a210e25 and 7f1257e exist
- [x] NO files modified outside the 2 in-scope files (PlanGrid.tsx and the new test file)
