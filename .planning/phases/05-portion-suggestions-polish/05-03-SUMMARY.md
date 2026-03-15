---
phase: 05-portion-suggestions-polish
plan: 03
subsystem: ui
tags: [react, tanstack-query, typescript, food-search, cnf, micronutrients]

# Dependency graph
requires:
  - phase: 05-01
    provides: search-cnf edge function, MICRONUTRIENT_DISPLAY_ORDER and constants, NormalizedFoodResult.source='cnf'
provides:
  - Unified USDA+CNF parallel search with CNF deduplication priority
  - Source badges (USDA/CNF pills) on each search result
  - MicronutrientPanel reusable component with collapsible display and per-person toggle
  - RecipeBuilder shows micronutrient panel below macro summary when ingredient data exists
affects:
  - 05-04-portion-suggestion-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two parallel TanStack useQuery calls merged client-side with CNF priority deduplication
    - FoodDataEntry extended to carry micronutrients alongside MacroSummary for display

key-files:
  created:
    - src/components/plan/MicronutrientPanel.tsx
  modified:
    - src/hooks/useFoodSearch.ts
    - src/components/food/FoodSearch.tsx
    - src/components/food/FoodDetailPanel.tsx
    - src/components/recipe/RecipeBuilder.tsx
    - supabase/functions/verify-nutrition/index.ts

key-decisions:
  - "useFoodSearch fires two parallel queries (search-usda, search-cnf); CNF results go first, USDA items with a name already seen in CNF are dropped"
  - "FoodSearch.tsx collapsed to two tabs: Search (unified) and My Foods; source badge pill shows USDA or CNF on each result row"
  - "MicronutrientPanel hidden entirely when no micronutrient data is present — no empty section shown"
  - "FoodDataEntry extended with optional micronutrients field; aggregation computed in useMemo at RecipeBuilder level"

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 05 Plan 03: Unified Search UI and Micronutrient Panel Summary

**Unified USDA+CNF parallel food search with source badges, OFF removal, and collapsible micronutrient display on recipe builder**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T02:36:34Z
- **Completed:** 2026-03-15T02:40:35Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Refactored `useFoodSearch` to fire parallel `search-usda` and `search-cnf` TanStack queries, merge results with CNF priority (CNF names seen first; matching USDA names skipped), and return a single `{ data, isLoading, error }` object
- Replaced USDA/OFF/My-Foods three-tab layout in `FoodSearch.tsx` with a Search/My-Foods two-tab layout; each result row now shows a small USDA or CNF source badge
- Updated `verify-nutrition` Deno edge function: `offValues` parameter renamed to `cnfValues`, prompt updated to reference Canadian Nutrient File, local outlier check source label changed from OFF to CNF
- Fixed `FoodDetailPanel.tsx` source label: `'off'/'Open Food Facts'` replaced with `'cnf'/'Canadian Nutrient File'`
- Created `MicronutrientPanel.tsx`: collapsible section, follows `MICRONUTRIENT_DISPLAY_ORDER` (fiber > sodium > calcium > iron > potassium > vitamin C > vitamin A), optional per-person/per-serving toggle, hidden when no data
- Added `MicronutrientPanel` to `RecipeBuilder.tsx` below `NutritionBar`; `FoodDataEntry` now carries micronutrients, `perServingMicronutrients` useMemo aggregates from ingredient map scaled per serving

## Task Commits

Each task was committed atomically:

1. **Task 1: Unified USDA+CNF search, remove OFF** - `3de6056` (feat)
2. **Task 2: MicronutrientPanel and RecipeBuilder integration** - `51bc253` (feat)

## Files Created/Modified

- `src/hooks/useFoodSearch.ts` - Parallel USDA+CNF queries with CNF priority merge; signature `useFoodSearch(query: string)`
- `src/components/food/FoodSearch.tsx` - Two-tab UI (Search/My Foods) with source badge component; all OFF references removed
- `src/components/food/FoodDetailPanel.tsx` - Source label updated from 'off'/'Open Food Facts' to 'cnf'/'Canadian Nutrient File'
- `supabase/functions/verify-nutrition/index.ts` - offValues -> cnfValues, OFF -> CNF throughout
- `src/components/plan/MicronutrientPanel.tsx` - New reusable collapsible micronutrient display component
- `src/components/recipe/RecipeBuilder.tsx` - Imports MicronutrientPanel, extends FoodDataEntry, adds perServingMicronutrients memo

## Decisions Made

- useFoodSearch fires two parallel queries (search-usda, search-cnf); CNF results go first, USDA items with a name already seen in CNF are dropped
- FoodSearch.tsx collapsed to two tabs: Search (unified) and My Foods; source badge pill shows USDA or CNF on each result row
- MicronutrientPanel hidden entirely when no micronutrient data is present — no empty section shown
- FoodDataEntry extended with optional micronutrients field; aggregation computed in useMemo at RecipeBuilder level

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale 'off' source label in FoodDetailPanel.tsx**
- **Found during:** Task 1 (grep verification for OFF references)
- **Issue:** FoodDetailPanel.tsx had `food.source === 'off' ? 'Open Food Facts'` which would never match since source union was updated to 'cnf' in Plan 01
- **Fix:** Replaced with `food.source === 'cnf' ? 'Canadian Nutrient File'`
- **Files modified:** src/components/food/FoodDetailPanel.tsx
- **Commit:** 3de6056

## Issues Encountered

None beyond the auto-fixed OFF label in FoodDetailPanel.

## User Setup Required

None.

## Next Phase Readiness

- Plan 04 (portion suggestion UI) can use MicronutrientPanel with `showToggle=true` and a `servingsMultiplier` for per-person scaling
- Unified search is live and will return CNF results alongside USDA for any query string
- No blockers for downstream plans

---
*Phase: 05-portion-suggestions-polish*
*Completed: 2026-03-15*

## Self-Check: PASSED

All files present and commits 3de6056 and 51bc253 verified in git log.
