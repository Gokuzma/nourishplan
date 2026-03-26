---
phase: 16-budget-engine-query-foundation
plan: 03
subsystem: ui
tags: [react, supabase, tanstack-query, budget, spend-tracking, settings]

requires:
  - phase: 16-01
    provides: queryKeys factory, food_prices/spend_logs DB schema, Household.weekly_budget field
  - phase: 16-02
    provides: cost utilities (cost.ts) and food price hooks (useFoodPrices.ts)

provides:
  - Weekly budget setting UI in SettingsPage (admin-only)
  - Food Prices management section in SettingsPage with inline delete
  - useCreateSpendLog mutation hook for recording cook events
  - useWeeklySpend query hook for aggregating spend from spend_logs and food_logs
  - BudgetSummarySection component with spend bar, color transitions, chevron toggle, and day chips
  - Mark as Cooked button in RecipeBuilder with spend recording and confirmation
  - BudgetSummarySection wired into PlanPage below PlanGrid with inline budget editing

affects:
  - 16-04 (human verification of all budget engine features)
  - RecipeBuilder (Cook button added)
  - PlanPage (BudgetSummarySection added)
  - SettingsPage (budget field + food prices section added)

tech-stack:
  added: []
  patterns:
    - Inline budget editing with blur/Enter/Escape keyboard handling in BudgetSummarySection
    - Color-coded spend bar (primary < 80%, amber-400 80-100%, red-500 > 100%) for visual budget feedback
    - Cook event spend recording pattern: compute cost from ingredients × food_prices, then insert spend_log with is_partial flag

key-files:
  created:
    - src/hooks/useSpendLog.ts
    - src/hooks/useWeeklySpend.ts
    - src/components/plan/BudgetSummarySection.tsx
    - src/utils/cost.ts
    - src/hooks/useFoodPrices.ts
  modified:
    - src/pages/SettingsPage.tsx
    - src/components/recipe/RecipeBuilder.tsx
    - src/pages/PlanPage.tsx

key-decisions:
  - "cost.ts and useFoodPrices.ts created as part of 16-03 execution because 16-02 had not been executed yet — these are dependencies required for the Cook button and Food Prices section; they match the 16-02 plan spec exactly"
  - "BudgetSummarySection defaults isExpanded=true and uses inline SVG chevron with CSS transform rotation to avoid external icon dependency"
  - "handleEditBudget in PlanPage uses direct supabase call + queryClient.invalidateQueries(['household']) matching existing SettingsPage pattern for household updates"
  - "Mark as Cooked button always visible on RecipeBuilder when viewing an existing recipe (not creation mode) since RecipeBuilder only receives recipeId prop for existing recipes"

patterns-established:
  - "Spend recording: useCreateSpendLog.mutate({ recipe_id, amount, is_partial }) — amount is total recipe cost (not per-serving)"
  - "BudgetSummarySection receives onEditBudget callback from parent; parent owns the supabase mutation"

requirements-completed:
  - BUDG-01
  - BUDG-03

duration: 25min
completed: 2026-03-26
---

# Phase 16 Plan 03: Budget Setting, Spend Tracking, and Plan Page Budget Section Summary

**Weekly budget UI in Settings, Cook button for spend recording, and BudgetSummarySection with color-coded spend bar and day cost chips on Plan page**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-26T00:45:00Z
- **Completed:** 2026-03-26T00:57:58Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Budget field and Food Prices management section added to SettingsPage (admin-only)
- `useCreateSpendLog` and `useWeeklySpend` hooks created for spend tracking
- `BudgetSummarySection` component with collapsible chevron, spend bar with three color states, summary text, and day cost chips
- "Mark as Cooked" button in RecipeBuilder records total recipe cost to spend_logs with partial-pricing flag
- BudgetSummarySection wired into PlanPage below PlanGrid with inline budget editing

## Task Commits

Each task was committed atomically:

1. **Task 1: Budget field, Food Prices management, and dependency hooks/utilities** - `eb440b8` (feat)
2. **Task 2: Spend hooks, Cook button, BudgetSummarySection, and PlanPage wiring** - `0c4dde1` (feat)

## Files Created/Modified

- `src/utils/cost.ts` - Cost normalisation, computeRecipeCostPerServing, formatCost utilities
- `src/hooks/useFoodPrices.ts` - useFoodPrices query, useSaveFoodPrice/useDeleteFoodPrice mutations, getPriceForIngredient helper
- `src/hooks/useSpendLog.ts` - useCreateSpendLog mutation for recording cook events to spend_logs
- `src/hooks/useWeeklySpend.ts` - useWeeklySpend query aggregating spend_logs.amount + food_logs.cost for the week
- `src/components/plan/BudgetSummarySection.tsx` - Collapsible budget summary with spend bar, ARIA progressbar, inline edit, day chips
- `src/pages/SettingsPage.tsx` - Weekly Budget field (admin-only) and Food Prices management section with inline delete
- `src/components/recipe/RecipeBuilder.tsx` - Mark as Cooked button with spend recording and 2-second confirmation toast
- `src/pages/PlanPage.tsx` - BudgetSummarySection imported and rendered below PlanGrid with handleEditBudget callback

## Decisions Made

- `cost.ts` and `useFoodPrices.ts` were created in this plan (16-03) because plan 16-02 had not been executed yet. These files match the 16-02 plan spec exactly — no deviation from the intended design, just executed earlier due to parallel execution.
- `handleEditBudget` in PlanPage uses the same direct-supabase pattern as `handleSaveHouseholdName` in SettingsPage for consistency; the `useUpdateHousehold` mutation does not exist in useHousehold.ts.
- The Cook button is always visible in RecipeBuilder since the component only renders for existing recipes (recipeId prop is always a valid UUID from the RecipePage).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created cost.ts and useFoodPrices.ts from 16-02 spec**
- **Found during:** Task 1 (budget field in SettingsPage)
- **Issue:** Plan 16-03 imports `useFoodPrices`, `useDeleteFoodPrice`, `formatCost`, `computeRecipeCostPerServing`, and `getPriceForIngredient` from files created in Plan 16-02, which had not been executed. These are blocking dependencies.
- **Fix:** Created `src/utils/cost.ts` and `src/hooks/useFoodPrices.ts` following the 16-02 plan spec exactly
- **Files modified:** src/utils/cost.ts (created), src/hooks/useFoodPrices.ts (created)
- **Verification:** `npx tsc --noEmit` exits 0; all tests pass
- **Committed in:** eb440b8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Necessary to unblock execution. Files match 16-02 spec exactly — 16-02 can execute without conflicts.

## Issues Encountered

- The worktree branch did not have 16-01 commits (master was ahead). Merged master into worktree branch before execution — fast-forward merge, no conflicts.

## Known Stubs

None — all components wire to real hooks and data sources. BudgetSummarySection shows $0.00 spend when no cook events exist (correct behavior, not a stub).

## Self-Check: PASSED

- FOUND: src/hooks/useSpendLog.ts
- FOUND: src/hooks/useWeeklySpend.ts
- FOUND: src/components/plan/BudgetSummarySection.tsx
- FOUND: src/utils/cost.ts
- FOUND: src/hooks/useFoodPrices.ts
- FOUND: commit eb440b8 (Task 1)
- FOUND: commit 0c4dde1 (Task 2)

## Next Phase Readiness

- Budget engine UI complete; 16-04 (human verification) can proceed
- Cook button records spend; BudgetSummarySection shows spend vs budget with color transitions
- Food Prices management in Settings allows deleting stale prices
- 16-02 (cost display in recipe views) can execute and will find cost.ts and useFoodPrices.ts already created

---
*Phase: 16-budget-engine-query-foundation*
*Completed: 2026-03-26*
