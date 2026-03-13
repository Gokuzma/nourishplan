---
phase: 02-food-data-recipe-builder
plan: 08
subsystem: database
tags: [postgres, supabase, deno, recipe, food-search]

# Dependency graph
requires:
  - phase: 02-food-data-recipe-builder
    provides: recipe_ingredients table with uuid ingredient_id column and USDA edge function
provides:
  - recipe_ingredients.ingredient_id as text type accepting any food ID string
  - USDA search results with id field matching NormalizedFoodResult interface
affects: [recipe-builder, food-search, meal-plan]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Polymorphic text ID: ingredient_id as text stores UUID, numeric string, or barcode without FK constraint"
    - "Edge function interface alignment: add id field to NormalizedFood matching client NormalizedFoodResult.id"

key-files:
  created:
    - supabase/migrations/007_ingredient_id_to_text.sql
  modified:
    - supabase/functions/search-usda/index.ts

key-decisions:
  - "ALTER ingredient_id TYPE text USING ingredient_id::text — preserves existing UUID data as text strings, no data loss"
  - "USDA id field = String(fdcId) — keeps fdcId for backward compat while adding id for NormalizedFoodResult interface compliance"

patterns-established:
  - "Schema-fix migration pattern: USING cast preserves data when widening column type"

requirements-completed: [RECP-01, RECP-04, FOOD-01, FOOD-02]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 2 Plan 08: Ingredient ID Type Fix Summary

**recipe_ingredients.ingredient_id widened from uuid to text via USING cast, and USDA edge function gains id field (String(fdcId)) matching NormalizedFoodResult interface**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-13T17:05:00Z
- **Completed:** 2026-03-13T17:10:00Z
- **Tasks:** 2 (1 code, 1 human-verify — approved)
- **Files modified:** 2

## Accomplishments
- Migration 007 created and applied: `ALTER COLUMN ingredient_id TYPE text USING ingredient_id::text`
- USDA edge function NormalizedFood interface gains `id: string` field
- normalizeFood return object now includes `id: String(food.fdcId)` as first field
- TypeScript compiles clean with no errors
- End-to-end verified: USDA food added as recipe ingredient without 22P02 error (user confirmed)

## Task Commits

1. **Task 1: Migrate ingredient_id to text and add id field to USDA edge function** - `3b89575` (feat)
2. **Task 2: Verify external food can be added as recipe ingredient** - human-verify checkpoint, approved by user

**Plan metadata:** `7688160` (docs: complete plan — awaiting verify), final docs commit pending

## Files Created/Modified
- `supabase/migrations/007_ingredient_id_to_text.sql` - ALTER TABLE recipe_ingredients ALTER COLUMN ingredient_id TYPE text
- `supabase/functions/search-usda/index.ts` - Added id field to NormalizedFood interface and normalizeFood return

## Decisions Made
- USING cast preserves existing UUID values as text strings — no data loss or migration complexity
- fdcId kept in both interface and return object for backward compatibility; id field added alongside it
- No client code changes needed — RecipeBuilder already uses food.id, it was simply undefined for USDA results before

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

Deployment complete. User applied migration 007 via `supabase db push` and redeployed `search-usda` edge function — both succeeded. No further setup needed.

## Next Phase Readiness
- Core recipe builder flow unblocked for all food sources once migration + edge function deployed
- Ready to proceed to Phase 3 (meal planning) after user verifies end-to-end

---
*Phase: 02-food-data-recipe-builder*
*Completed: 2026-03-13*
