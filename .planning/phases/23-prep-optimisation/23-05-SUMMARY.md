---
phase: 23
plan: 05
subsystem: batch-prep-ui
tags: [ui, batch-prep, modal, plan-grid, slot-card, freezer-badge, cook-mode]
dependency_graph:
  requires: [23-01, 23-02, 23-03, 23-03b, 23-04-FreezerBadge]
  provides: [BatchPrepButton, BatchPrepModal, BatchPrepSessionCard, FreezerBadge, SlotCard-cook-button]
  affects: [PlanGrid, SlotCard, DayCard]
tech_stack:
  added: []
  patterns: [modal-shell-reuse, map-prop-threading, hook-callback-pattern]
key_files:
  created:
    - src/components/plan/BatchPrepButton.tsx
    - src/components/plan/BatchPrepSessionCard.tsx
    - src/components/plan/BatchPrepModal.tsx
    - src/components/plan/FreezerBadge.tsx
  modified:
    - src/components/plan/PlanGrid.tsx
    - src/components/plan/SlotCard.tsx
    - src/components/plan/DayCard.tsx
decisions:
  - "FreezerBadge created in Plan 05 (not Plan 04) because Plan 04 runs in parallel wave 3 — Plan 05 needs it immediately"
  - "DayCard extended with slotFreezerFriendly Map and onCookSlot callback rather than passing per-slot props inline"
  - "getSlotFreezerFriendly looks up first recipe-type meal_item via recipeById Map in PlanGrid"
  - "Cook navigation uses /cook/:mealId?slotId= URL pattern per D-20a"
metrics:
  duration_seconds: 281
  completed_date: "2026-04-12"
  tasks_completed: 5
  files_changed: 7
---

# Phase 23 Plan 05: Batch Prep UI + SlotCard Surfaces Summary

**One-liner:** Batch prep modal with stale-aware session cards, freezer badge icon in SlotCard, and Cook button entry point to /cook route — all three prep UI surfaces wired without losing any prior PlanGrid or SlotCard feature.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 0 | FreezerBadge prerequisite (Plan 04 parallel dependency) | f0ee315 | FreezerBadge.tsx |
| 1 | BatchPrepButton component | f0ee315 | BatchPrepButton.tsx |
| 2 | BatchPrepSessionCard component | e4867d6 | BatchPrepSessionCard.tsx |
| 3 | BatchPrepModal component | 6ec93dd | BatchPrepModal.tsx |
| 4 | Wire BatchPrepButton + BatchPrepModal into PlanGrid | a503400 | PlanGrid.tsx |
| 5 | FreezerBadge + Cook button in SlotCard; thread DayCard | 2f4726f | SlotCard.tsx, DayCard.tsx, PlanGrid.tsx |

## New Files

- `/src/components/plan/BatchPrepButton.tsx` — Secondary CTA with bowl icon, idle/loading/disabled states, `sm:w-[180px]` responsive width
- `/src/components/plan/BatchPrepSessionCard.tsx` — Session card with label, time chip, recipe pills, shared-ingredients callout, equipment callout, storage hints using FreezerBadge storage variants
- `/src/components/plan/BatchPrepModal.tsx` — Modal shell matching MealPicker chrome, stale indicator row with pulsing amber dot, shimmer loading, empty state, footer CTA, Escape-to-close, `onReassignmentsApplied` callback
- `/src/components/plan/FreezerBadge.tsx` — Reusable badge with `full`, `compact`, `icon-only`, `storage-freezer`, `storage-fridge` variants using sky-blue and accent color tokens

## Surgical Edits (additions-only)

### PlanGrid.tsx
- Added imports: `BatchPrepButton`, `BatchPrepModal`, `useRecipes`
- Added state: `batchPrepOpen`, `reassignmentToast`
- Added: `recipeById` Map and `getSlotFreezerFriendly()` helper
- Added: `BatchPrepButton` adjacent to `GeneratePlanButton` in header flex row
- Added: `BatchPrepModal` at JSX tree end with cook mode navigation and reassignment callback
- Added: D-16 reassignment toast (fixed top banner with Undo button)
- Added: `dayFreezerFriendly` Map built per day, passed as `slotFreezerFriendly` to DayCard
- Added: `onCookSlot` handler navigating to `/cook/:mealId?slotId=`
- Diff: 55 additions, 0 meaningful deletions of existing functionality

### SlotCard.tsx
- Added import: `FreezerBadge`
- Added props to interface: `isFreezerFriendly?`, `onCook?`
- Added to `OccupiedSlotCard` destructure: `isFreezerFriendly`, `onCook`
- Added: `FreezerBadge variant="icon-only"` before icon cluster when `isFreezerFriendly`
- Added: Cook button (chef-hat SVG) between swap and clear buttons when `onCook` defined
- Diff: 22 additions, 1 modified line (function signature extended — all original props preserved)

### DayCard.tsx
- Added props to interface: `slotFreezerFriendly?`, `onCookSlot?`
- Added to destructure: `slotFreezerFriendly`, `onCookSlot`
- Passed `isFreezerFriendly` and `onCook` at both DEFAULT_SLOTS and custom slots SlotCard call sites
- Diff: 8 additions, 0 deletions

## L-020/L-027 Preservation Verification

All preservation-list symbols confirmed present after edits:

**SlotCard:** `useState`, `useCallback`, `useDraggable`, `calcIngredientNutrition`, `calcMealNutrition`, `ProgressRing`, `PortionSuggestionRow`, `DragHandle`, `LockBadge`, `AIRationaleTooltip`, `SlotWithMeal`, `SlotCardProps`, `calcSlotNutrition`, `OccupiedSlotCard`, `isDeletedMeal`, `handleCloseTooltip`, `generation_rationale`, `tooltipOpen`, `tooltipId`, `attributes`, `listeners`, `setNodeRef`, `isDragging`, `onAssign`, `onClear`, `onSwap`, `onLog`, `onSuggestAlternative`, `onToggleLock`, all badges

**PlanGrid:** `useNavigate`, `useMealPlanSlots`, `useAssignSlot`, `useClearSlot`, `useToggleLock`, `useGeneratePlan`, `useGenerationJob`, `useLatestGeneration`, `useSuggestAlternative`, `useNutritionGaps`, `computeSwapSuggestions`, `MealPicker`, `generatePlan`, `suggestAlternative`, `swapSuggestions`, `handleApplySwap`, `activeJobId`, `generationStep`, `generationError`, `priorityOrder`, `isGenerating`, `isGenerationComplete`, `isTimeout`, `handleGenerate`, `recipeCount`, `suggestedRecipes`, `currentDayIndex`, `pickerState`, `logModalState`, `NutritionGapCard`, `GenerationProgressBar`, `GenerationJobBadge`, `SlotCard`, `DayCard`, `DayCarousel`, `RecipeSuggestionCard`, `LogMealModal`

**Tests:** `npx vitest run tests/AppShell.test.tsx tests/PlanGrid.nutritionGap.test.tsx tests/PlanGrid.shimmer.test.tsx` — 13/13 passed

## Deviations from Plan

### Auto-fixed: FreezerBadge created in Plan 05 (not Plan 04)

**Found during:** Task 1 setup
**Issue:** FreezerBadge.tsx is defined in Plan 04, which runs in parallel wave 3 with Plan 05. The worktree started at base commit `bfb4706` (before Plan 04 had run), so FreezerBadge.tsx didn't exist yet.
**Fix:** Created FreezerBadge.tsx in this plan using the spec from Plan 04's PLAN.md. The implementation is identical to Plan 04's spec — Plan 04's agent will create the same file from the same spec. Merge resolution: whichever merges second will find the file already exists; content should be identical.
**Files modified:** `src/components/plan/FreezerBadge.tsx` (created)
**Commit:** f0ee315

### Pre-existing TypeScript errors (not introduced by this plan)

`npx tsc -b` exits non-zero due to pre-existing errors in `RecipeBuilder.tsx`, `MealItemRow.tsx`, and `useAddManualGroceryItem.ts`. These errors existed at the `bfb4706` base commit before any of this plan's changes. All new files in this plan are type-correct.

## Known Stubs

None — all new components wire to real hooks (`useBatchPrepSummary`, `useRecipes`) and navigate to real routes.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. The `BatchPrepModal` calls `useBatchPrepSummary` which was threat-modeled in Plan 02. Cook button is a client-side navigate (T-23-32: accepted).

## Self-Check

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| BatchPrepButton.tsx | FOUND |
| BatchPrepSessionCard.tsx | FOUND |
| BatchPrepModal.tsx | FOUND |
| FreezerBadge.tsx | FOUND |
| SUMMARY.md | FOUND |
| commit f0ee315 | FOUND |
| commit e4867d6 | FOUND |
| commit 6ec93dd | FOUND |
| commit a503400 | FOUND |
| commit 2f4726f | FOUND |
| vitest 13/13 | PASSED |
