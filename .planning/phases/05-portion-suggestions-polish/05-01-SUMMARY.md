---
phase: 05-portion-suggestions-polish
plan: 01
subsystem: api
tags: [deno, edge-functions, supabase, cnf, typescript]

# Dependency graph
requires:
  - phase: 04-daily-logging-summary
    provides: food_logs table and NormalizedFoodResult type used as base
provides:
  - CNF edge function with fetch-all-filter and module-level cache
  - OFF edge function removed
  - NormalizedFoodResult.source updated to 'cnf'
  - CNF_NUTRIENT_IDS, MICRONUTRIENT_DISPLAY_ORDER, MICRONUTRIENT_LABELS, MICRONUTRIENT_UNITS constants
affects:
  - 05-03-unified-search-ui
  - 05-04-portion-suggestion-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fetch-all-filter pattern for CNF: load full food list into module-level cache, filter client-side by keyword intersection
    - Module-level cache in Deno edge function for expensive API calls

key-files:
  created:
    - supabase/functions/search-cnf/index.ts
    - supabase/migrations/011_remove_off_add_cnf.sql
  modified:
    - src/types/database.ts
    - src/utils/nutrition.ts

key-decisions:
  - "CNF vitamin_a nutrient ID is 319 (not 318 like USDA) — CNF uses retinol activity equivalents"
  - "CNF fetch-all-filter pattern: cache full food list at module level, filter by keyword split — avoids per-query HTTP round trips to CNF"
  - "OFF barcodes not reliably distinguishable from USDA IDs in recipe_ingredients — only food_logs with item_type='off' can be safely deleted"

patterns-established:
  - "CNF_NUTRIENT_IDS matches USDA_NUTRIENT_IDS structure except vitamin_a=319 vs 318"
  - "Micronutrient display order: fiber > sodium > minerals (calcium, iron, potassium) > vitamins (vitamin_c, vitamin_a)"

requirements-completed: [TRCK-05]

# Metrics
duration: 12min
completed: 2026-03-15
---

# Phase 05 Plan 01: CNF Integration and OFF Removal Summary

**Canadian Nutrient File edge function with module-level cache replacing Open Food Facts, with updated source type union and micronutrient display constants**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-15T02:21:00Z
- **Completed:** 2026-03-15T02:33:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `search-cnf` Deno edge function implementing fetch-all-filter pattern with module-level food list cache
- Removed `search-off` edge function directory and added migration to clean OFF-sourced food_log entries
- Updated `NormalizedFoodResult.source` union from `'off'` to `'cnf'` — TypeScript compiles without errors
- Added `CNF_NUTRIENT_IDS`, `MICRONUTRIENT_DISPLAY_ORDER`, `MICRONUTRIENT_LABELS`, `MICRONUTRIENT_UNITS` to nutrition.ts for use by Plans 03 and 04

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CNF edge function and remove OFF** - `6df19f8` (feat)
2. **Task 2: Update types and add micronutrient constants** - `6a3b0c4` (feat)

## Files Created/Modified

- `supabase/functions/search-cnf/index.ts` - CNF food search edge function with module-level cache and fetch-all-filter
- `supabase/migrations/011_remove_off_add_cnf.sql` - Removes OFF-sourced food_log entries
- `src/types/database.ts` - NormalizedFoodResult.source changed from 'off' to 'cnf'
- `src/utils/nutrition.ts` - Added CNF_NUTRIENT_IDS, MICRONUTRIENT_DISPLAY_ORDER, MICRONUTRIENT_LABELS, MICRONUTRIENT_UNITS

## Decisions Made

- CNF vitamin_a nutrient ID is 319 (not 318 like USDA) — uses retinol activity equivalents
- Module-level cache stores the full CNF food list (~5800 foods) to avoid one HTTP call per search query
- OFF barcode IDs not reliably distinguishable from USDA numeric IDs in recipe_ingredients, so only food_logs with item_type='off' are deleted; recipe/meal references left in place to avoid false positives
- FoodSearch.tsx tab UI left as 'off' references — Plan 03 will replace them with 'cnf'; no TypeScript errors result from this because the local ActiveTab type is independent of NormalizedFoodResult.source

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CNF edge function ready to deploy and use in Plan 03 (unified search UI)
- Micronutrient constants ready for Plan 04 (portion suggestion UI)
- FoodSearch.tsx still references 'off' tab — Plan 03 will replace that tab with CNF
- No blockers for downstream plans

---
*Phase: 05-portion-suggestions-polish*
*Completed: 2026-03-15*

## Self-Check: PASSED

All files present and commits verified.
