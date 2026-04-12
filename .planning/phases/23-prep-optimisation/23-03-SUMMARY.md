---
phase: 23
plan: 03
subsystem: hooks
tags: [hooks, tanstack-query, recipe-steps, batch-prep, freezer, debounce]
depends_on: [23-01]
provides: [useRecipeSteps, useBatchPrepSummary, useFreezerClassification]
affects: [Plans 04, 05, 06]
tech_stack:
  added: []
  patterns:
    - supabase as any cast for write operations on manually-typed Database schema
    - queryClient.getQueryCache().subscribe for cross-hook reactive debounce
    - useRef + window.setTimeout/setInterval for 30s debounce with countdown
key_files:
  created:
    - src/hooks/useRecipeSteps.ts
    - src/hooks/useBatchPrepSummary.ts
    - src/hooks/useFreezerClassification.ts
  modified: []
decisions:
  - select('*') + cast to Recipe type avoids partial-select never inference with manually-typed Supabase Database
  - supabase as any cast on write operations mirrors pre-existing pattern; all recipes update calls resolve to never due to PostgrestVersion:12 mismatch with manually-written Database type
  - DEBOUNCE_MS = 30_000 defined as named constant for testability and readability
  - enabled: !!householdId && !!planId && isModalOpen prevents silent edge-function invocations when modal is closed
metrics:
  duration_minutes: 25
  completed: "2026-04-12"
  tasks_completed: 3
  files_created: 3
  files_modified: 0
requirements: [PREP-01, PREP-03]
---

# Phase 23 Plan 03: Recipe Data Layer Hooks Summary

**One-liner:** Three TanStack Query hooks providing recipe steps fetch/write/regenerate, 30s-debounced batch prep invocation, and freezer classification overrides.

## What Was Built

### useRecipeSteps (`src/hooks/useRecipeSteps.ts`)

Three exported hooks:

- **`useRecipeSteps(recipeId)`** — Queries `recipes` with `select('*')`, casts to `Recipe`, runs `parseStepsSafely` on `instructions` at read time (T-23-16 mitigation). Returns `RecipeStepsData { id, instructions, freezer_friendly, freezer_shelf_life_weeks }`. Key: `queryKeys.recipeSteps.detail(recipeId)`. Enabled: `!!householdId && !!recipeId`.

- **`useUpdateRecipeSteps()`** — Accepts `{ recipeId, steps: RecipeStep[] }`. Writes `instructions` JSONB to `recipes` table (D-07: user-edited steps are canonical). Invalidates `recipeSteps.detail`, `recipes.detail`, `recipes.list` on success.

- **`useRegenerateRecipeSteps()`** — Accepts full `RegenerateParams` including optional `existingSteps` (D-04 merge-intent). Invokes `generate-recipe-steps` edge function via `supabase.functions.invoke`. Returns `RegenerateResponse` with `uncertain_user_additions` list for UI prompting. Invalidates same three keys.

### useBatchPrepSummary (`src/hooks/useBatchPrepSummary.ts`)

Single exported hook with signature `useBatchPrepSummary({ planId, isModalOpen, weekStart })`.

- Invokes `compute-batch-prep` edge function. Returns `BatchPrepSummary` with `sessions`, `reassignments`, `total_time_minutes`.
- `staleTime: Infinity` — refresh is managed explicitly, not by TanStack Query's automatic stale logic.
- `enabled: !!householdId && !!planId && isModalOpen` — prevents credit burn when modal is closed.
- **30s debounce (D-17/D-28):** A `useEffect` subscribes to `queryClient.getQueryCache()`. On every `['meal-plan-slots', planId]` cache update, it resets a 30-second window via `window.setTimeout`. A parallel `window.setInterval` ticks `secondsUntilRefresh` down for the stale indicator UI (UI-SPEC line 214).
- Returns: `{ data, isLoading, isFetching, error, isStale, secondsUntilRefresh, refresh, reassignmentsApplied }`.
- Exported types: `BatchPrepStorageHint`, `BatchPrepSession`, `BatchPrepReassignment`, `BatchPrepSummary`.

### useFreezerClassification (`src/hooks/useFreezerClassification.ts`)

Two exported mutation hooks:

- **`useToggleFreezerFriendly()`** — Accepts `{ recipeId, value: boolean | null }`. `null` = Auto (clears override, D-09). Updates `recipes.freezer_friendly`.
- **`useUpdateShelfLifeWeeks()`** — Accepts `{ recipeId, weeks: number | null }`. Updates `recipes.freezer_shelf_life_weeks`.
- Both invalidate `recipeSteps.detail`, `recipes.detail`, `recipes.list` on success.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase partial select resolves to `never` for new Recipe fields**
- **Found during:** Task 1 TypeScript check
- **Issue:** `select('id, instructions, freezer_friendly, freezer_shelf_life_weeks')` resolved to `never` for the new Phase 23 columns. This is a known limitation with the manually-written `Database` type — the Supabase JS 2.99.x client requires a `PostgrestVersion` field in the Database type that is absent from the hand-written schema. All 107 pre-existing write-path type errors in the codebase share this root cause.
- **Fix:** Used `select('*')` with explicit cast `data as Recipe` for the query path. For mutation paths (update), applied `const db = supabase as any` to bypass the `never` type on the write builder — mirroring the same workaround that every other write hook in the codebase effectively has (they just live with the TS error).
- **Files modified:** `src/hooks/useRecipeSteps.ts`, `src/hooks/useFreezerClassification.ts`
- **Commits:** 491bda1, f71c1b7

## How Plans 04/05/06 Consume These Hooks

| Plan | Hook | Usage |
|------|------|-------|
| 04 (Recipe Steps Editor) | `useRecipeSteps`, `useUpdateRecipeSteps`, `useRegenerateRecipeSteps`, `useToggleFreezerFriendly`, `useUpdateShelfLifeWeeks` | Step list display, inline editing, AI regeneration button, freezer toggle |
| 05 (Batch Prep Modal) | `useBatchPrepSummary` | Session grouping display, stale indicator, reassignment toast |
| 06 (Cook Mode) | `useRecipeSteps` | Step-by-step instruction rendering |

## TypeScript Notes

- `RecipeStep[]` cannot be directly passed to `supabase.from('recipes').update(...)` because the Supabase typed client infers the update type as `never` for all tables in this codebase (pre-existing systemic issue with manually-written `Database` type missing `PostgrestVersion`). The `supabase as any` pattern is the established workaround until the Database type is regenerated or the `PostgrestVersion` key is added.
- The `RegenerateResponse.uncertain_user_additions` field surfaces the D-04 merge-intent list for Plan 04's UI prompting — Plan 04 owns rendering that list.

## Self-Check: PASSED

- [x] `src/hooks/useRecipeSteps.ts` exists with 3 exports
- [x] `src/hooks/useBatchPrepSummary.ts` exists with 1 export + 4 exported types
- [x] `src/hooks/useFreezerClassification.ts` exists with 2 exports
- [x] Commits 491bda1, 7692bd2, f71c1b7 exist
- [x] AppShell nav count test: 5/5 passed
- [x] No existing hook files modified
- [x] TypeScript: 0 new errors introduced (pre-existing 107 errors unaffected)
