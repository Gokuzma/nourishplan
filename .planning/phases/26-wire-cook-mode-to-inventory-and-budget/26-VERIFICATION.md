---
phase: 26-wire-cook-mode-to-inventory-and-budget
verified: 2026-04-19T21:50:00Z
status: human_needed
score: 4/5 must-haves verified (criterion #5 gated on manual UAT per D-19)
overrides_applied: 0
human_verification:
  - test: "Budget → Cook → Inventory → Grocery reconciliation end-to-end"
    expected: "After completing a Plan → Cook Mode session for a recipe, generating a grocery list afterwards should exclude (or reduce) the quantities that were just deducted from inventory. Spend log entry should appear in PlanPage BudgetSummarySection for the current week."
    why_human: "D-19 explicitly defers this success criterion to manual Playwright UAT. Requires live auth session, real Supabase DB writes, cache invalidation across TanStack Query, and visual confirmation of UI updates across 3 pages (Plan, Inventory, Grocery). Per 26-RESEARCH.md §Landmine 11 and 26-VALIDATION.md §Manual-Only Verifications — use `claude-test@nourishplan.test` / `ClaudeTest!2026` after deploy + PWA cache clear (L-003/L-013)."
---

# Phase 26: Wire Cook Mode to Inventory and Budget — Verification Report

**Phase Goal:** Meals cooked via Plan → Cook Mode trigger inventory deduction, a spend_log entry, and a leftover save prompt — matching the behaviour of the RecipeBuilder "Mark as Cooked" button

**Verified:** 2026-04-19T21:50:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Completing a cook session via `/cook/:mealId` fires `useInventoryDeduct` against the recipe's ingredients (FIFO) | VERIFIED | CookModePage.tsx:257-262 awaits `runCookCompletion` which at useCookCompletion.ts:65 calls `inventoryDeduct.mutateAsync(needs)` — this hook calls `computeFifoDeductions` (useInventoryDeduct.ts:29 + inventory.ts:87-90, sorts by `purchased_at` ascending = FIFO). Matches RecipeBuilder path byte-for-byte because both call the same shared hook. |
| 2 | Completing a cook session inserts a `spend_logs` row with `source: 'cook'` — the meal shows up in `useWeeklySpend` on PlanPage BudgetSummarySection | VERIFIED | useCookCompletion.ts:47-51 awaits `spendLog.mutateAsync({ recipe_id, amount, is_partial })` FIRST. useSpendLog.ts:36 hardcodes `source: 'cook' as const`. useSpendLog.ts:49-51 invalidates `queryKeys.weeklySpend.root(householdId, weekStart)`. BudgetSummarySection.tsx:2,26 imports and calls `useWeeklySpend(householdId, weekStart)` on PlanPage (PlanPage.tsx:14,235). Full data-flow chain present. |
| 3 | `CookDeductionReceipt` renders on completion with deducted items and any missing/insufficient items | VERIFIED | CookModePage.tsx:522-533 renders `<CookDeductionReceipt>` when `deductionResult && leftoverContext`. CookDeductionReceipt.tsx:28-41 renders `result.deductions` list; lines 43-51 render `result.missing`; lines 22-26 render `result.error` banner. Receipt populated by CookModePage.tsx:263-265 after `runCookCompletion` returns a non-null `outcome.deductionResult`. |
| 4 | After completion, user is prompted to save any uneaten portion as a leftover inventory item via `AddInventoryItemModal` with `leftoverDefaults` | VERIFIED | CookDeductionReceipt.tsx:55-62 renders "Save leftover portion" button gated on `onSaveLeftover` prop. CookModePage.tsx:531 wires `onSaveLeftover={() => setShowLeftoverModal(true)}`. CookModePage.tsx:534-544 renders `<AddInventoryItemModal leftoverDefaults={leftoverContext}>` when `showLeftoverModal && leftoverContext`. Same affordance exists on RecipeBuilder.tsx:985,988-993 (inherited via shared component per D-07). |
| 5 | End-to-end flow Budget → Cook → Inventory → Grocery reconciles: generating a grocery list after a cook correctly subtracts the deducted ingredients | HUMAN_NEEDED | Static plumbing exists — `subtractInventory` at groceryGeneration.ts:197 reads `inventoryItems` (which receive the deducts from `useInventoryDeduct`). However, the end-to-end reconciliation across three live pages (Plan/Cook/Inventory/Grocery) with cache invalidation, Supabase RLS writes, and visual confirmation is explicitly deferred to manual Playwright UAT per D-19 / 26-RESEARCH.md §Landmine 11 / 26-VALIDATION.md §Manual-Only Verifications. |

**Score:** 4/5 truths verified via code + passing tests; 1/5 gated on manual UAT per locked decision D-19.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useCookCompletion.ts` | Shared cook-completion hook (spend → deduct composition) with `useCookCompletion`, `CookCompletionInput`, `CookCompletionOutcome` exports | VERIFIED | 75 lines; exports all three; composes `useCreateSpendLog`, `useInventoryDeduct`, `useFoodPrices`, `computeRecipeCostPerServing`; spend-first/deduct-second ordering; null-coerce `ingredient_name ?? ''`; servings fallback `> 0 ? servings : 1`; no `console.`, no `queryClient.invalidateQueries`, no `useHousehold` (per Pattern B/C). |
| `tests/useCookCompletion.test.tsx` | Hook unit tests — ≥5 passing | VERIFIED | 5/5 passing. Covers call order (spendInsertSpy invocationCallOrder < inventoryUpdateSpy), spend_logs payload with `source: 'cook'`, non-blocking deduct failure (deductShouldReject=true), cost calc correctness, is_partial flag when unpriced. |
| `src/components/inventory/CookDeductionReceipt.tsx` | Extended with optional `onSaveLeftover?: () => void` prop + "Save leftover portion" button | VERIFIED | 73 lines; prop added at line 8; destructured at line 11; button rendered conditionally at lines 55-62 with `bg-secondary border border-primary/30 text-primary` styling; `gap-2` on action row wrapper; all pre-existing features (auto-dismiss, deductions list, missing list, error banner, Done button) preserved. |
| `src/components/recipe/RecipeBuilder.tsx` | Refactored handleMarkAsCooked uses shared hook; AddInventoryItemModal rendered with leftoverDefaults; no inline spend/deduct | VERIFIED | `useCreateSpendLog` import GONE; `useInventoryDeduct` kept as type-only (`import type { DeductionResult }`); `useCookCompletion` imported line 21 and called line 272 with `{ runCookCompletion, isPending: cookPending }`; `handleMarkAsCooked` is async (line 576) and calls `runCookCompletion` (line 578); `<AddInventoryItemModal>` rendered at lines 988-993 with `leftoverDefaults={{ recipeName: recipe.name, recipeId: recipe.id }}`; `<CookDeductionReceipt onSaveLeftover={() => setShowLeftoverModal(true)}>` at line 985. Note: `computeRecipeCostPerServing` still imported (auto-fix Rule 3 — still used by cost-per-serving badge at line 790). |
| `src/pages/CookModePage.tsx` | Wired to shared hook with idempotency guard + single-recipe guard + deferred nav + receipt + leftover modal | VERIFIED | All 6 new imports (useRecipe, useRecipeIngredients, useCookCompletion, CookDeductionReceipt, AddInventoryItemModal, DeductionResult) present lines 22-26; new state (`deductionResult`, `showLeftoverModal`, `leftoverContext`) at lines 76-78; `handlePrimaryAction` async with status snapshot at lines 187,231; `runCookCompletionIfSingleRecipe` helper at 240-271 with `recipe_ids.length !== 1` guard, dev-only Phase 28 console.warn, data-loaded guard; receipt + modal rendered at 522-544 with `if (!showLeftoverModal) navigate(-1)` deferred-nav flag. |
| `tests/cookMode.test.tsx` | 4 new Phase 26 grep-assertion describe blocks | VERIFIED | All 4 blocks present at lines 124, 158, 168, 193: `CookModePage wiring (Phase 26, INVT-05)`, `Status transition guard (Phase 26, D-16 idempotency)`, `RecipeBuilder uses shared hook (Phase 26, D-01)`, `CookDeductionReceipt leftover button (Phase 26, INVT-06)`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `useCookCompletion.ts` | `useSpendLog.ts (useCreateSpendLog)` | import + composition | WIRED | Line 1 imports; line 22 calls; line 47 `await spendLog.mutateAsync(...)`. |
| `useCookCompletion.ts` | `useInventoryDeduct.ts (useInventoryDeduct, DeductionResult)` | import + composition | WIRED | Line 2 imports both; line 23 calls; line 65 `await inventoryDeduct.mutateAsync(needs)`. |
| `useCookCompletion.ts` | `useFoodPrices.ts (useFoodPrices, getPriceForIngredient)` | import + cost calc | WIRED | Line 3 imports both; line 24 calls `useFoodPrices()`; line 35 uses `getPriceForIngredient(prices, ing.ingredient_id)`. |
| `CookModePage.tsx (handlePrimaryAction)` | `useCookCompletion.ts (runCookCompletion)` | async call on last-step completion | WIRED | Line 23 imports; line 75 destructures; line 257 awaits inside `runCookCompletionIfSingleRecipe`; called at 190 (allDone branch) and 233 (isLastStep branch) after completeSession.mutateAsync. |
| `RecipeBuilder.tsx (handleMarkAsCooked)` | `useCookCompletion.ts` | import + call | WIRED | Line 21 imports; line 272 destructures `{ runCookCompletion, isPending: cookPending }`; line 578 awaits `runCookCompletion`. |
| `CookModePage.tsx` | `CookDeductionReceipt.tsx (onSaveLeftover prop)` | callback prop | WIRED | Line 24 imports; line 531 `onSaveLeftover={() => setShowLeftoverModal(true)}`. |
| `RecipeBuilder.tsx` | `CookDeductionReceipt.tsx (onSaveLeftover prop)` | callback prop | WIRED | Line 985 `onSaveLeftover={() => setShowLeftoverModal(true)}`. |
| `CookModePage.tsx` | `AddInventoryItemModal.tsx (leftoverDefaults prop)` | modal render with leftoverDefaults | WIRED | Line 25 imports; line 542 `leftoverDefaults={leftoverContext}` passes the captured `{ recipeName, recipeId }` snapshot. |
| `RecipeBuilder.tsx` | `AddInventoryItemModal.tsx` | modal render with leftoverDefaults | WIRED | Line 28 imports; line 992 `leftoverDefaults={{ recipeName: recipe.name, recipeId: recipe.id }}`. |
| `useSpendLog.ts (onSuccess)` | `useWeeklySpend` (BudgetSummarySection) | query cache invalidation | WIRED | useSpendLog.ts:49-51 invalidates `queryKeys.weeklySpend.root(householdId, data.week_start)`. BudgetSummarySection.tsx:26 calls `useWeeklySpend(householdId, weekStart)` → auto-refetch on invalidation. PlanPage.tsx:235 renders `<BudgetSummarySection>`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `CookModePage.tsx` receipt render | `deductionResult` | set by line 265 from `outcome.deductionResult` returned by `runCookCompletion` | YES — useInventoryDeduct mutation reads `useInventoryItems` (real Supabase query) + calls `computeFifoDeductions` + performs real `update()` on inventory_items rows | FLOWING |
| `CookModePage.tsx` modal render | `leftoverContext` | set by line 264 from captured `{ recipeName: cookingRecipe.name, recipeId }` snapshot | YES — `cookingRecipe` populated by `useRecipe(recipeIdForSteps)` which is a real Supabase query | FLOWING |
| `BudgetSummarySection` | `spendData` (from `useWeeklySpend`) | invalidated on `useCreateSpendLog` onSuccess | YES — real Supabase insert + invalidation triggers refetch of spend_logs for the week | FLOWING |
| `RecipeBuilder.tsx` receipt render | `deductionResult` | set by line 592 from `outcome.deductionResult` | YES — same shared hook path as CookModePage | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| useCookCompletion hook tests pass | `npx vitest run tests/useCookCompletion.test.tsx` | 5/5 passed in 730ms | PASS |
| cookMode.test.tsx Phase 26 blocks pass | `npx vitest run tests/cookMode.test.tsx` | 26/26 passed (14 pre-existing + 12 new Phase 26) | PASS |
| TypeScript compiles cleanly | `npx tsc --noEmit` | Zero output (clean) | PASS |
| Combined phase-26 scoped suite | `npx vitest run tests/cookMode.test.tsx tests/useCookCompletion.test.tsx` | 31/31 passed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INVT-05 | 26-01, 26-03, 26-04 | Finalizing a meal plan auto-deducts ingredient quantities from inventory | SATISFIED | Cook completion via `/cook/:mealId` now fires `useInventoryDeduct` (FIFO) — CookModePage.tsx:257-262 via shared hook. RecipeBuilder inherits same behaviour (Plan 03). Verified by cookMode.test.tsx `CookModePage wiring (Phase 26, INVT-05)` describe block. |
| INVT-06 | 26-01, 26-02, 26-03, 26-04 | Uneaten portions from a recipe appear as leftover inventory items with expiry | SATISFIED | CookDeductionReceipt exposes `onSaveLeftover` (Plan 02); both cook entry points wire it to open `AddInventoryItemModal` with `leftoverDefaults={{ recipeName, recipeId }}` (Plan 03 RecipeBuilder.tsx:985-993; Plan 04 CookModePage.tsx:531-544). Expiry is set inside the modal per existing Phase 17 AddInventoryItemModal behaviour. |
| BUDG-03 | 26-01, 26-03, 26-04 | Plan page shows weekly spend vs budget with remaining balance | SATISFIED | Cook completion inserts spend_logs row with `source: 'cook'` (useSpendLog.ts:36 — fired via useCookCompletion.ts:47-51). onSuccess invalidates `queryKeys.weeklySpend.root` (useSpendLog.ts:49-51) → BudgetSummarySection.tsx:26 auto-refetches via `useWeeklySpend` → PlanPage.tsx:235 re-renders. |

No orphaned requirements — all three requirement IDs from the phase's plan frontmatter are satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| _None_ | _—_ | _—_ | _—_ | No TODO/FIXME/PLACEHOLDER markers in phase 26 files. No empty handlers. No hardcoded empty arrays flowing to UI. No console.log-only handlers. |

### Human Verification Required

#### 1. Budget → Cook → Inventory → Grocery end-to-end reconciliation (Success Criterion #5)

**Test:** Run the full flow against a live dev server as `claude-test@nourishplan.test` / `ClaudeTest!2026`:
1. Seed inventory with known quantities for a recipe's ingredients.
2. Open `/plan`, confirm BudgetSummarySection weekly spend value `W0`.
3. Navigate Plan → tap a meal → enter Cook Mode at `/cook/:mealId`.
4. Complete all cook steps; tap "Finish cook session".
5. Observe CookDeductionReceipt overlay renders with deducted items + any missing items.
6. Tap "Save leftover portion" → AddInventoryItemModal opens with `leftoverDefaults` pre-populated from the recipe. Cancel or save.
7. Return to `/plan`. Confirm BudgetSummarySection weekly spend is now `W0 + recipe.totalCost` (new spend_log visible).
8. Navigate to `/inventory`. Confirm the deducted ingredient quantities have dropped (FIFO — oldest batches consumed first).
9. Navigate to `/grocery`. Generate a grocery list for the current plan. Confirm the just-deducted ingredients are either excluded OR have reduced quantities vs a pre-cook baseline list.

**Expected:** All four data surfaces (Budget, Cook receipt, Inventory, Grocery) reflect the cook consistently. Refreshing each page (PWA cache cleared per L-003) still shows the same values. No phantom spend_logs rows. No double-deduction on page refresh (D-16 idempotency).

**Why human:**
- Explicitly mandated by locked decision D-19: "No component-render RTL test for CookModePage — Manual Playwright UAT against `claude-test@nourishplan.test` covers the integration path."
- Requires real Supabase writes (RLS-gated), TanStack Query cache invalidation across routes, and visual confirmation across 4 pages.
- Verification checklist lives at 26-RESEARCH.md §"Landmine 11" and 26-VALIDATION.md §"Manual-Only Verifications".
- Should run after deploy (L-013) and PWA cache clear (L-003) per lessons.md.

### Gaps Summary

No code-level gaps. The phase delivered all 4 automatically-verifiable success criteria via 4 waves of plans:
- Wave 1 (Plans 01+02): Shared hook + receipt affordance — tested.
- Wave 2 (Plan 03): RecipeBuilder refactored to shared hook, leftover modal wired.
- Wave 3 (Plan 04): CookModePage wired with idempotency + deferred nav + grep-assertion tests.

The only remaining item is Success Criterion #5 (end-to-end grocery reconciliation) which was intentionally deferred to manual Playwright UAT per D-19. All static plumbing for criterion #5 is in place (`subtractInventory` at groceryGeneration.ts:197 reads from inventory which now receives cook deductions), but the dynamic cross-page reconciliation cannot be verified without running the app live.

### Preservation Audit (L-020 / L-027)

All features from the Phase 26 preservation lists survive:

**RecipeBuilder.tsx (≥20 feature grep hits expected):** CookEntryPointOnRecipeDetail, RecipeStepsSection, RecipeFreezerToggle, MicronutrientPanel, NutritionBar, FoodSearchOverlay, IngredientRow, perServingNutrition, relativeTime, DEFAULT_YIELD_FACTOR — all intact (per 26-03-SUMMARY preservation audit: 20+ matches).

**CookModePage.tsx (≥12 feature grep hits expected):** fireStepDoneNotification, playTimerChime, InAppTimerAlert, NotificationPermissionBanner, MultiMealPromptOverlay, ReheatSequenceCard, useLatestCookSessionForMeal, useActiveCookSessions, handleStartCook, derivePrimaryLabel, handleTimerComplete — 28 total preservation hits per 26-04-SUMMARY.

**CookDeductionReceipt.tsx:** 8-second auto-dismiss, deductions list, missing list, error banner, Done button all preserved.

### Decision Traceability

| Decision | Description | Resolution |
|----------|-------------|------------|
| D-01 | Cook is single source of truth via shared hook | useCookCompletion.ts composes spend+deduct; RecipeBuilder + CookModePage both call it (no inline duplication) |
| D-02 | Callers retain local UI state | Hook exposes plain async fn; each caller owns its own deductionResult / showLeftoverModal state |
| D-04 | Leftover button inside CookDeductionReceipt, not separate modal | Button rendered inline within receipt's action row |
| D-05 | Leftover button always renders when prop passed (no heuristic) | Gated purely on `{onSaveLeftover && ...}` |
| D-07 | Shared receipt means both cook paths inherit identical UX | Same component receives callback from RecipeBuilder AND CookModePage |
| D-08 | Single-recipe scope only | `recipe_ids.length !== 1` guard in runCookCompletionIfSingleRecipe |
| D-09 | Dev-only Phase 28 warning for combined sessions | console.warn gated on `import.meta.env.DEV` at CookModePage.tsx:243-246 |
| D-10 | Resolve single recipe id via activeSession.recipe_ids[0] | CookModePage.tsx:256 |
| D-11 | Spend FIRST, deduct SECOND, cost mirrors RecipeBuilder:578-588 | useCookCompletion.ts:47 then 65; cost calc at lines 33-42 |
| D-12 | Deduct failure non-blocking on spend | useCookCompletion.ts:67-70 try/catch returns spendLogged=true on deduct failure |
| D-14 | Deferred nav until receipt dismisses / modal closes | CookModePage.tsx:526-530 (`if (!showLeftoverModal) navigate(-1)`) |
| D-15 | Exit-cook-mode idempotent for completed sessions | Status snapshot check at CookModePage.tsx:187 |
| D-16 | Status-snapshot idempotency guard | `activeSession?.status === 'in_progress'` captured BEFORE await in both completion branches |
| D-17 | Vitest hook unit tests for useCookCompletion | 5/5 tests in tests/useCookCompletion.test.tsx |
| D-18 | Grep-level assertions in tests/cookMode.test.tsx | 4 new describe blocks with 16 it cases appended |
| D-19 | No component-render RTL for CookModePage; manual Playwright UAT for criterion #5 | Documented in human_verification frontmatter; checklist in 26-RESEARCH.md §Landmine 11 |

---

_Verified: 2026-04-19T21:50:00Z_
_Verifier: Claude (gsd-verifier)_
_Note: Pre-existing test failures in tests/auth.test.ts, tests/AuthContext.test.tsx, tests/guide.test.ts, tests/theme.test.ts confirmed NOT caused by Phase 26 — they existed on baseline pre-26 (commit 711b324) and relate to ES256 auth refactor (L-025) and other unrelated issues. Phase-26-scope tests: 31/31 pass._
