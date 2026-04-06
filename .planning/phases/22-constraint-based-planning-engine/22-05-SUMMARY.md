---
phase: 22-constraint-based-planning-engine
plan: "05"
subsystem: planning-engine
tags: [swap-suggestions, nutrition-gaps, plan-grid, tdd]
dependency_graph:
  requires:
    - 22-03 (NutritionGapCard component and SwapSuggestion interface)
    - 22-01 (nutritionGaps utility and WeeklyGap type)
  provides:
    - computeSwapSuggestions pure utility
    - wired NutritionGapCard in PlanGrid with real swap data
  affects:
    - src/components/plan/PlanGrid.tsx
    - src/components/plan/NutritionGapCard.tsx
    - src/hooks/useMeals.ts
tech_stack:
  added: []
  patterns:
    - TDD (RED-GREEN cycle) for swap suggestion logic
    - Pure utility function for client-side computation
    - useMemo for derived swap suggestions from cached query data
    - useCallback for stable mutation callback
key_files:
  created:
    - src/utils/swapSuggestions.ts
    - src/utils/__tests__/swapSuggestions.test.ts
  modified:
    - src/components/plan/NutritionGapCard.tsx (added mealId to SwapSuggestion interface)
    - src/components/plan/PlanGrid.tsx (wired useNutritionGaps + computeSwapSuggestions + NutritionGapCard)
    - src/hooks/useMeals.ts (expanded meal_items select to include all 4 macro fields)
decisions:
  - "computeSwapSuggestions is a pure function — no Supabase, no hooks; takes pre-fetched data"
  - "mealId added to SwapSuggestion interface as a non-breaking addition; NutritionGapCard UI ignores it"
  - "candidate meals for swapping come from useMeals (all household meals) after expanding the select"
  - "swapSuggestions useMemo merges meals already in slots with all household meals via deduplication"
  - "NutritionGapCard rendered above the DndContext block, visible when gaps.length > 0"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_changed: 5
---

# Phase 22 Plan 05: Swap Suggestions Wiring Summary

**One-liner:** Client-side swap suggestion computation wired to NutritionGapCard via PlanGrid, closing SC 4 / PLAN-04 gap with a pure utility + useMemo integration.

## What Was Built

**Task 1 (TDD):** Created `computeSwapSuggestions` pure utility function in `src/utils/swapSuggestions.ts`.

- Takes gaps (WeeklyGap[]), slots (SlotWithMeal[]), allMeals, weekStart, weekStartDay
- For each gap, finds the best (slot, candidate meal) pair with highest nutrient gain
- Skips locked slots and meals already assigned anywhere in the plan
- Derives `dayName` from weekStart + dayIndex via UTC arithmetic
- Returns at most one suggestion per gap (member + nutrient combination)
- Added `mealId: string` to the `SwapSuggestion` interface in NutritionGapCard.tsx
- 7 unit tests covering all edge cases — all pass

**Task 2:** Wired swap suggestions into `PlanGrid.tsx`.

- Added `useNutritionGaps(planId)` hook call for gap data
- Expanded `useMeals` select to include `protein_per_100g`, `fat_per_100g`, `carbs_per_100g` on meal_items
- Added `swapSuggestions` useMemo that calls `computeSwapSuggestions` with live data
- Added `handleApplySwap` useCallback that calls `assignSlot.mutate` with `swap.mealId`
- Rendered `NutritionGapCard` above the DndContext with `swapSuggestions` and `onApplySwap` props
- Build succeeds with no type errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree reset removed required files from this branch**
- **Found during:** Initial setup after `git reset --soft` to correct base commit
- **Issue:** The `reset --soft` left staged deletions that were included in the first commit, removing 42 files including planning docs, Phase 22 components, and Phase 21 schedule model files
- **Fix:** Restored all deleted files from main branch via `git checkout main -- <files>` and committed the restore
- **Files modified:** 42 files across `.planning/phases/`, `src/components/plan/`, `src/hooks/`, `supabase/`, `tests/`
- **Commit:** 0cecca8

## Known Stubs

None — all swap suggestion data flows from real plan slot and meal data via the hooks.

## Threat Flags

None — all computation is client-side from data already fetched under RLS. The `onApplySwap` handler goes through `useAssignSlot` which enforces household membership at the DB level.

## Self-Check: PASSED

- FOUND: src/utils/swapSuggestions.ts
- FOUND: src/utils/__tests__/swapSuggestions.test.ts
- FOUND: src/components/plan/NutritionGapCard.tsx (with mealId in SwapSuggestion)
- FOUND: src/components/plan/PlanGrid.tsx (with NutritionGapCard wired)
- FOUND: commits b88de9c, 0cecca8, 225a534, b8ae08a — all present in log
