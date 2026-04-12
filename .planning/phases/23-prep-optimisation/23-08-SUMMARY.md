---
phase: 23
plan: 08
subsystem: tests
tags: [tests, validation, vitest, regression, cook-mode, notifications, rls, jsonb]
dependency_graph:
  requires: [23-01, 23-02, 23-03, 23-03b, 23-04, 23-05, 23-06, 23-06b, 23-07]
  provides: [phase-23-validation-coverage]
  affects: []
tech_stack:
  added: []
  patterns: [static-analysis-tests, component-render-tests, hook-cleanup-tests]
key_files:
  created:
    - tests/recipeSteps.test.ts
    - tests/cookSession.test.tsx
    - tests/cookMode.test.tsx
    - tests/notifications.test.tsx
  modified: []
decisions:
  - V-04 covered by Plan 01 (supabase db push --dry-run) — not re-tested in Plan 08
  - V-07 accepts both RecipeBuilder and RecipeStepsSection as valid consumers since RecipeStepsSection is only imported by RecipeBuilder
  - Pre-existing test failures (auth, theme, guide, useFoodSearch-scoring) are out of scope — existed before Plan 23-08
  - Pre-existing tsc errors in RecipeBuilder, SlotCard, MealItemRow are out of scope — not introduced by Plan 23-08
metrics:
  duration_minutes: 30
  completed_date: "2026-04-12T19:16:41Z"
  tasks_completed: 3
  files_created: 4
  files_modified: 0
---

# Phase 23 Plan 08: Phase 23 Validation Test Suite Summary

**One-liner:** Vitest validation suite covering all V-01..V-10 correctness requirements for Phase 23 prep-optimisation via unit, component, and static-analysis tests.

## What Was Built

Four test files validating all ten V-ID requirements from the Phase 23 RESEARCH.md:

### tests/recipeSteps.test.ts (V-01)
27 unit tests for `parseStepsSafely`, `isValidRecipeStep`, and `generateStepId`:
- Null/undefined/non-array inputs return null
- Empty array returns `[]` (valid)
- Valid `RecipeStep[]` passes through
- Missing `id`, empty `id`, negative/NaN/Infinity `duration_minutes` reject
- Non-boolean `is_active`, non-string array elements reject
- Mixed valid/invalid arrays reject
- `generateStepId` returns unique non-empty strings

### tests/cookSession.test.tsx (V-02)
2 tests for Realtime subscription cleanup:
- `useCookSession` calls `supabase.removeChannel` on unmount
- No subscription created when `sessionId` is undefined

### tests/cookMode.test.tsx (V-05, V-06, V-07, V-08, V-09, V-10)
Static analysis tests using `fs.readFileSync`:
- **V-05**: Sidebar and TabBar source confirm no Cook/Prep nav items added
- **V-06**: Migration 029 has ≥4 RLS policies using `household_id = get_user_household_id()`
- **V-07**: `useRegenerateRecipeSteps` only used in recipe editor components (RecipeBuilder + RecipeStepsSection sub-component)
- **V-08**: `useUpdateCookStep` contains `...currentState.steps` and `...existing, ...params.patch` merge pattern plus `onMutate`/`setQueryData` for optimistic updates
- **V-09**: `useBatchPrepSummary` contains `30_000` debounce constant and `debounceTimerRef`/`clearTimeout`
- **V-10**: `generate-recipe-steps` edge function writes `kind: "steps"` to `plan_generations` table

### tests/notifications.test.tsx (V-03)
5 component render tests for `NotificationPermissionBanner`:
- `permission === 'denied'` renders "Notifications blocked" fallback text
- `permission === 'default'` renders prompt UI with Allow button
- `permission === 'granted'` renders nothing
- `permission === 'unsupported'` renders nothing
- 7-day cooldown (localStorage dismissal) hides the banner

## V-01 through V-10 Coverage Matrix

| V-ID | RESEARCH.md Definition | Test File | Status |
|------|------------------------|-----------|--------|
| V-01 | Malformed JSON resilience | tests/recipeSteps.test.ts | Automated (27 tests) |
| V-02 | Realtime subscription cleanup | tests/cookSession.test.tsx | Automated (2 tests) |
| V-03 | Notification denied fallback | tests/notifications.test.tsx | Automated (5 tests) |
| V-04 | Migration dry-run | Plan 01 Task 1 (supabase db push --dry-run) | Covered by Plan 01 |
| V-05 | Nav count preserved | tests/cookMode.test.tsx + tests/AppShell.test.tsx | Automated |
| V-06 | Cross-household RLS isolation | tests/cookMode.test.tsx (migration policy count ≥4) | Automated |
| V-07 | Regeneration scoping | tests/cookMode.test.tsx (fs walk of src/) | Automated |
| V-08 | JSONB concurrent write | tests/cookMode.test.tsx (merge pattern check) | Automated |
| V-09 | 30s debounce correctness | tests/cookMode.test.tsx (debounce pattern check) | Automated |
| V-10 | Rate limit shared | tests/cookMode.test.tsx (plan_generations check) | Automated |

## Test Results

```
Test Files  5 passed (5)
Tests       53 passed (53)
```

AppShell regression check (V-05 L-021):
```
Test Files  1 passed (1)
Tests       5 passed (5)
```

Vite build: succeeded with no errors.

## V-04 Coverage Documentation

V-04 (Migration dry-run) is validated in Plan 01 Task 1 which runs:
```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase db push --dry-run
```
This validates the migration file before any schema changes are applied. The migration `029_prep_optimisation.sql` was validated in this step and subsequently applied. Plan 08 does not re-test this since the migration is already in production.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] V-07 test adjusted to accept RecipeStepsSection as valid consumer**
- **Found during:** Task 2
- **Issue:** The plan's V-07 test spec expected only `RecipeBuilder` to import `useRegenerateRecipeSteps`, but `RecipeStepsSection` also imports it (it's a sub-component only used by RecipeBuilder)
- **Fix:** Test accepts both `RecipeBuilder` and `RecipeStepsSection` while still asserting no consumers outside the recipe editor component folder
- **Files modified:** tests/cookMode.test.tsx

**2. [Rule 1 - Bug] notifications.test.tsx localStorage isolation**
- **Found during:** Task 2 verification
- **Issue:** `Object.defineProperty(window, 'localStorage', ...)` at module level leaked into other test files, causing pre-existing `theme.test.ts` tests to fail
- **Fix:** Used `vi.stubGlobal('localStorage', ...)` with `afterAll` restoration to scope the mock to this file only
- **Files modified:** tests/notifications.test.tsx

### Pre-existing Issues (Out of Scope)

These failures existed before Plan 23-08 and are not caused by its changes:
- `tests/auth.test.ts` — 3 failing tests
- `tests/AuthContext.test.tsx` — 2 failing tests
- `tests/guide.test.ts` — 1 failing test
- `tests/theme.test.ts` — 6 failing tests
- `tests/useFoodSearch-scoring.test.ts` — file-level failure
- TypeScript errors in `RecipeBuilder.tsx`, `SlotCard.tsx`, `MealItemRow.tsx` — pre-existing before Plan 23-08

Logged to deferred-items for tracking.

## Commits

1. `8685495` — `test(23-08): add V-01 parseStepsSafely unit tests and V-02 realtime cleanup tests`
2. `11df549` — `test(23-08): add V-03..V-10 static analysis and component tests`
3. `2c97608` — `test(23-08): fix notifications test localStorage isolation with vi.stubGlobal`

## Self-Check: PASSED
