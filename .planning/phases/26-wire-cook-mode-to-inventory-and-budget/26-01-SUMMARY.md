---
phase: 26
plan: 01
subsystem: cook-mode-hook
tags: [hooks, cook-mode, inventory, budget, tdd]
requires: [useSpendLog, useInventoryDeduct, useFoodPrices, computeRecipeCostPerServing]
provides: [useCookCompletion, CookCompletionInput, CookCompletionOutcome]
affects: [recipe-cook-pipeline, budget-spend-logs, inventory-fifo-deduction]
tech_stack:
  added: []
  patterns: [composition-hook, non-blocking-deduct, spend-first-ordering]
key_files:
  created:
    - src/hooks/useCookCompletion.ts
    - tests/useCookCompletion.test.tsx
  modified: []
decisions:
  - D-01 cook is source of truth satisfied (spend_logs insert with source='cook' triggered via useCreateSpendLog)
  - D-02 callers retain local UI state (hook does not own idempotency guards)
  - D-11 cost calc mirrors RecipeBuilder.tsx:578-588 byte-for-byte, spend FIRST
  - D-12 non-blocking deduct — deduct rejection does NOT roll back spend
metrics:
  duration_minutes: 3
  tasks_completed: 2
  tests_added: 5
  completed: 2026-04-20T01:23:29Z
---

# Phase 26 Plan 01: useCookCompletion Hook Summary

## One-liner

Shared cook-completion composition hook that sequences spend-log insert before non-blocking inventory deduct, with cost calc lifted byte-for-byte from `RecipeBuilder.handleMarkAsCooked`.

## Context

Closes CRIT-01 from the v2.0 audit by providing a single reusable pipeline for cook completion. Both `RecipeBuilder.handleMarkAsCooked` (Plan 03) and `CookModePage.handlePrimaryAction` (Plan 04) will consume this hook, eliminating drift between cook entry points — one implementation of cost, ordering, and non-blocking semantics.

Satisfies the core sequencing contract for:
- **INVT-05** — deduct sequencing (returned `DeductionResult` shape preserved)
- **INVT-06** — receipt flow (callers consume `outcome.deductionResult` to render leftover prompt)
- **BUDG-03** — spend_logs insert with `source='cook'` flows into `useWeeklySpend`

## What Was Built

**Task 1 — Hook file (`src/hooks/useCookCompletion.ts`, commit `ae4beee`)**

Composition hook wrapping `useCreateSpendLog` + `useInventoryDeduct` + `useFoodPrices`. Exposes `runCookCompletion(input)` returning `{ deductionResult, isPartial, totalCost, spendLogged }`. Internally:

1. Builds `ingredientsWithCost` via `getPriceForIngredient(prices, ing.ingredient_id)`.
2. Computes `{ costPerServing, pricedCount, totalCount }` via `computeRecipeCostPerServing` with `servings > 0 ? servings : 1` fallback.
3. `totalCost = costPerServing * servings`, `isPartial = pricedCount < totalCount`.
4. `await spendLog.mutateAsync({ recipe_id, amount, is_partial })` FIRST; on failure returns early with `spendLogged: false`.
5. `await inventoryDeduct.mutateAsync(needs)` SECOND with `ingredient_name ?? ''` coercion; on failure still returns `spendLogged: true` but `deductionResult: null` (non-blocking per D-12).

**Task 2 — Test file (`tests/useCookCompletion.test.tsx`, commit `e5dd839`)**

Five vitest unit tests using the `cookSession.test.tsx` mock pattern:
- `fires spend_log insert BEFORE inventory_items update` — `invocationCallOrder` assertion.
- `spend_logs payload uses source=cook` — confirms the useCreateSpendLog layer stamps the source field.
- `deduct failure does NOT roll back spend` — sets `deductShouldReject=true`, asserts `spendLogged===true`.
- `cost calc: 200g × $2.50/100g over 2 servings = totalCost 5.00` — uses REAL `computeRecipeCostPerServing`.
- `is_partial=true when some ingredients are unpriced` — confirms payload and outcome flag.

Added a `warmupPrices()` helper that polls `foodPricesSelectSpy` via `waitFor` and drains three microtask ticks inside `act(async)`, so TanStack Query's state flush completes before `runCookCompletion` reads `foodPrices`. Test-only; hook implementation was not altered.

## Hook Contract

```typescript
export interface CookCompletionInput {
  recipeId: string
  recipeName: string
  servings: number
  ingredients: RecipeIngredient[]
}

export interface CookCompletionOutcome {
  deductionResult: DeductionResult | null
  isPartial: boolean
  totalCost: number
  spendLogged: boolean
}
```

## Test Results

- `npx vitest run tests/useCookCompletion.test.tsx` — **5/5 passing**
- `npx tsc --noEmit | grep useCookCompletion` — **TYPECHECK_CLEAN**

Full-suite run reported 12 failing tests in `theme.test.ts`, `AuthContext.test.tsx`, `auth.test.ts`, `useFoodSearch-scoring.test.ts`, `guide.test.ts` — all **pre-existing** (confirmed by re-running `theme.test.ts` from base commit 711b324). Out of scope per L-020/L-027 (scope boundary rule).

## Decision Traceability

- **D-01 (cook is source of truth for source='cook' writes):** Hook wraps `useCreateSpendLog`, which internally sets `source: 'cook' as const` in the insert payload.
- **D-02 (callers retain local UI state):** Hook exposes a plain async function; no `recipe_ids` tracking, no idempotency guards, no UI state.
- **D-11 (spend FIRST, deduct SECOND, cost calc exact mirror):** `await spendLog.mutateAsync` precedes `await inventoryDeduct.mutateAsync`; `ingredientsWithCost` construction matches `RecipeBuilder.tsx:578-588` byte-for-byte; servings fallback matches line 585.
- **D-12 (deduct failure non-blocking on spend):** Try/catch around the deduct `mutateAsync` returns `spendLogged: true` + `deductionResult: null` on failure, never rolling back the spend insert.

## Deviations from Plan

None — plan executed exactly as written.

One adjustment inside the permitted scope: the test helper `warmupPrices()` was added to drain multiple microtask ticks + a `waitFor` poll, because a single `await Promise.resolve()` warmup was insufficient for `useFoodPrices` (TanStack Query) to resolve + rerender before `runCookCompletion` read the prices. The plan explicitly permits this — Task 2 action block says: *"If a test fails due to `useFoodPrices` returning empty data initially, adjust the `act(async () => { await Promise.resolve() })` warmup — do NOT change the hook implementation."* Hook implementation was left intact; only the test warmup was expanded.

## Commits

- `ae4beee` — feat(26-01): add useCookCompletion composition hook
- `e5dd839` — test(26-01): add useCookCompletion hook unit tests

## Self-Check: PASSED

- src/hooks/useCookCompletion.ts — FOUND
- tests/useCookCompletion.test.tsx — FOUND
- commit ae4beee — FOUND
- commit e5dd839 — FOUND
- `useCookCompletion`, `CookCompletionInput`, `CookCompletionOutcome` exports — present (grep verified)
- spend-before-deduct ordering — present (one `await spendLog.mutateAsync`, one `await inventoryDeduct.mutateAsync`)
- no `console.`, no `queryClient.invalidateQueries`, no `useHousehold` in hook — verified
- 5/5 tests pass
