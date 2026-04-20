# Phase 26: Wire Cook Mode to Inventory and Budget - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend `CookModePage.handlePrimaryAction` so that completing a Plan-driven cook session (`/cook/:mealId`) fires the same spend-log + FIFO inventory deduction + receipt that RecipeBuilder's "Mark as Cooked" button already does, and add a leftover-save prompt to the receipt (surfaced on both cook entry points via a shared component). Single-recipe sessions only. Combined/multi-recipe sessions (`recipe_ids.length > 1`) stay on their current no-op path and are Phase 28's problem.

Closes CRIT-01 from the v2.0 audit and satisfies INVT-05, INVT-06, BUDG-03 for the Plan → Cook flow.

</domain>

<decisions>
## Implementation Decisions

### Code Organisation
- **D-01:** Extract a shared `useCookCompletion` hook that encapsulates cost calc + `useCreateSpendLog.mutate` + `useInventoryDeduct.mutateAsync` + `DeductionResult` return. Both `CookModePage.handlePrimaryAction` AND `RecipeBuilder.handleMarkAsCooked` call this hook — no inline duplication. One source of truth prevents drift.
- **D-02:** The hook input is the recipe id + loaded ingredients + servings. Callers still own their own local UI state (`deductionResult`, `cookConfirmation`). The hook returns a function that resolves to `{ deductionResult, isPartial, totalCost }` so callers can render their own confirmation/toast text while sharing the mutation sequencing.
- **D-03:** Claude's discretion on the exact hook file path (suggested: `src/hooks/useCookCompletion.ts`) and whether sub-utilities like `buildIngredientNeeds()` or `computeRecipeCost()` get extracted as pure helpers.

### Leftover Prompt
- **D-04:** Leftover-save affordance lives as a **button inside `CookDeductionReceipt`**, not as a separately-triggered modal. Receipt shows deducted + missing items + a "Save leftover portion" button. Tapping the button opens `AddInventoryItemModal` with `leftoverDefaults={{ recipeName, recipeId }}` pre-populated (the modal already supports this shape).
- **D-05:** Leftover button **always renders** on the receipt — independent of `recipe.servings` or whether deductions happened. User decides whether to save a leftover. Dismissing the receipt (Done button or 8-second auto-dismiss) declines the prompt.
- **D-06:** Supersedes Phase 17 D-29 ("no special post-cook prompt"). That decision is obsolete because `AddInventoryItemModal` + `leftoverDefaults` shipped in Phase 17's execution anyway, and ROADMAP success criterion #4 now requires the prompt.

### RecipeBuilder Parity
- **D-07:** Because the leftover button lives inside `CookDeductionReceipt`, RecipeBuilder's Mark-as-Cooked flow **inherits the leftover prompt automatically** when it uses the shared hook. No separate RecipeBuilder work item needed beyond the refactor to use `useCookCompletion`. Both cook entry points behave identically.

### Multi-Recipe Session Scope
- **D-08:** Phase 26 scope is **`recipe_ids.length === 1` only**. When the active cook session has multiple recipes (combined prep mode), the completion handler skips spend + deduct + receipt and just calls `completeSession` as today. Phase 28 (PREP-02 orphans — `generate-cook-sequence`) owns combined cooking wiring.
- **D-09:** Guard in the handler: `if (activeSession?.recipe_ids.length !== 1) return completeSession()` — explicit early-return so downstream doesn't silently miss combined sessions. Log a console warning in dev for visibility.
- **D-10:** For `source === 'recipe'` (entry from RecipeDetail via CookEntryPoint), `mealId` in the route IS the recipe id — use it directly. For plan-driven entry (`source !== 'recipe'`), use `activeSession.recipe_ids[0]` as the recipe id. Both code paths converge on a single recipe id passed to the hook.

### Budget / Spend Semantics
- **D-11:** Spend log payload mirrors RecipeBuilder exactly: `source: 'cook'`, `recipe_id: <recipe_id>`, `amount: costPerServing × recipe.servings`, `is_partial: pricedCount < totalCount`. Do not invent new spend_log shapes.
- **D-12:** Deduction is **non-blocking** on spend. If `useInventoryDeduct.mutateAsync` rejects, the spend_log stays (cook happened, budget should reflect it). `CookDeductionReceipt` already handles `result.error` — it displays "Inventory could not be updated. Your cook was logged, but inventory was not deducted. Check your connection." Same behaviour Phase 17 D-27 established.

### Missing Ingredients
- **D-13:** Mirror RecipeBuilder: when inventory has N of M ingredients, deduct the N, list the M−N under "not in inventory" in `CookDeductionReceipt`, still log full spend. No blocking pre-cook confirmation modal. `is_partial` on the spend_log continues to flag unpriced ingredients, not inventory gaps — this matches RecipeBuilder semantics and downstream consumers (`useWeeklySpend`) already interpret it that way.

### Completion Flow / Navigation
- **D-14:** CookModePage does NOT immediately `navigate(-1)` after `completeSession` anymore. New sequence on last-step completion: `completeSession` → `useCookCompletion.mutate` → render `CookDeductionReceipt` over `CookModeShell` → user taps Done (or 8s auto-dismiss) OR taps "Save leftover" which opens `AddInventoryItemModal` → on modal close/dismiss, `navigate(-1)`. Matches the RecipeBuilder UX where the receipt floats over the current page.
- **D-15:** Exit-cook-mode button behaviour for completed sessions is unchanged — tapping "Exit cook mode" when `allDone` navigates back without re-firing anything (idempotency — see D-16).

### Idempotency
- **D-16:** Spend + deduct + leftover prompt fire **only on the transition from `in_progress` to `completed`**. Detect transition via `useCompleteCookSession`'s success callback OR by checking `activeSession.status === 'in_progress'` before mutating. If the user re-enters a completed session (`status: 'completed'`), the completion handler short-circuits to `navigate(-1)` — no re-deduct, no phantom spend. No DB migration required.

### Testing
- **D-17:** Vitest **hook unit tests** for `useCookCompletion`: mock supabase + the wrapped mutations, assert the call order (spend first, deduct after spend success, returns `DeductionResult`), assert error semantics (deduct failure does not roll back spend), assert cost calc correctness.
- **D-18:** **Grep-level assertions** added to `tests/cookMode.test.tsx`: CookModePage imports `useCookCompletion` and `CookDeductionReceipt`; RecipeBuilder still imports them too after refactor; `handlePrimaryAction` has an `activeSession.recipe_ids.length === 1` guard; `CookDeductionReceipt` exports the leftover-button affordance.
- **D-19:** **No** component-render RTL test for CookModePage — the existing `tests/cookMode.test.tsx` pattern is file-content assertions, and replicating the live cook-session state machine in RTL is too heavy for the value. Manual Playwright UAT against `claude-test@nourishplan.test` covers the integration path (success criterion #5 — Budget → Cook → Inventory → Grocery reconciliation).

### Claude's Discretion
- Hook file path and name — `useCookCompletion` suggested; final name/path at planner's discretion
- Whether to lift helper utilities (`buildIngredientNeeds`, `computeRecipeCostForCook`) into `src/utils/cookCompletion.ts` or keep them inside the hook file
- Exact API shape of the `CookDeductionReceipt` leftover-button prop (e.g., `onSaveLeftover?: () => void` vs `leftoverContext?: { recipeId, recipeName }`)
- Handling of the `AddInventoryItemModal` open/close state in CookModePage — use existing local state pattern from InventoryPage
- How to express the "stay on page until receipt dismisses" flow in React state (deferred navigation via effect, or controlled by an `onClose` callback on `CookDeductionReceipt`)
- Whether `useCookCompletion` returns a mutation object or a plain async function
- Console warning wording for the multi-recipe early-return (D-09)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §"Phase 26: Wire Cook Mode to Inventory and Budget" — 5 success criteria
- `.planning/REQUIREMENTS.md` §Inventory (INVT-05, INVT-06) §Budget (BUDG-03) — requirement definitions this phase satisfies
- `.planning/v2.0-MILESTONE-AUDIT.md` §integration.CRIT-01 — concrete evidence of the gap this phase closes (CookModePage.tsx:175-178, 214-217)

### Prior Phase Context (locked decisions)
- `.planning/phases/17-inventory-engine/17-CONTEXT.md` §Plan Deduction & Leftovers (D-24, D-25, D-26, D-27, D-28) — inventory deduction contract. Note: D-29 is superseded by this phase's D-04/D-05/D-06.
- `.planning/phases/16-budget-engine-query-foundation/16-CONTEXT.md` — spend_log source='cook' contract and useWeeklySpend behaviour

### Canonical Implementation to Mirror
- `src/components/recipe/RecipeBuilder.tsx:576-616` — `handleMarkAsCooked` (reference flow: spend first, deduct non-blocking on success, show receipt). This is the pattern Phase 26 replicates via shared hook.
- `src/components/recipe/RecipeBuilder.tsx:1001-1008` — `CookDeductionReceipt` render site + state management pattern (`deductionResult`, `setDeductionResult(null)` onClose)
- `src/components/recipe/RecipeBuilder.tsx:273-277` — hook wiring (`useInventoryDeduct`, `useCreateSpendLog`, receipt state)

### Target of Modification
- `src/pages/CookModePage.tsx:172-218` — `handlePrimaryAction` — extend the final completion branch (allDone + complete-session path) with the cook-completion sequence. Currently only calls `completeSession.mutateAsync` then `navigate(-1)`.
- `src/pages/CookModePage.tsx:362-469` — CookModeShell render site — render `CookDeductionReceipt` here (same pattern as RecipeBuilder)

### Existing Hooks and Components (reuse)
- `src/hooks/useInventoryDeduct.ts` — `useInventoryDeduct()` + `DeductionResult` type. Already batches updates and invalidates `['inventory', householdId]` on success.
- `src/hooks/useSpendLog.ts` — `useCreateSpendLog()` — inserts spend_logs row with source='cook', invalidates weekly spend + spend logs query keys
- `src/hooks/useCookSession.ts:263-282` — `useCompleteCookSession()` — existing session-completion mutation (unchanged by this phase)
- `src/hooks/useRecipes.ts:55-70` — `useRecipeIngredients(recipeId)` — loads recipe_ingredients ordered by sort_order
- `src/hooks/useFoodPrices.ts` — food price lookups for cost calc
- `src/components/inventory/CookDeductionReceipt.tsx` — receipt component. **Extend with leftover-button affordance** (this phase modifies it).
- `src/components/inventory/AddInventoryItemModal.tsx` — already accepts `leftoverDefaults?: { recipeName, recipeId }`. No changes needed — just needs a caller from the cook flow.

### Supporting Utilities
- `src/utils/cost.ts` — `computeRecipeCostPerServing`, `getPriceForIngredient`, `formatCost`, `normaliseToCostPer100g`. These power the cost calc inside `useCookCompletion`.
- `src/lib/queryKeys.ts` — query key factory. Cook-completion invalidations flow through existing `inventory`, `weeklySpend`, `spendLogs` keys (no new keys needed).

### Tests
- `tests/cookMode.test.tsx` — existing file-content assertion pattern for Cook Mode imports/nav. Phase 26 appends new describe blocks here (D-18).

### Project Rules
- `CLAUDE.md` — NourishPlan project rules (hook patterns, page spacing, query key conventions)
- `lessons.md` — L-001 (worktree cleanup before vitest), L-007 (test DB writes with Playwright using `claude-test@nourishplan.test`), L-014/L-015 (cache/PWA hygiene)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useInventoryDeduct`** + **`useCreateSpendLog`** — already the right abstractions; `useCookCompletion` wraps them.
- **`CookDeductionReceipt`** — already has deducted/missing/error rendering; just needs a leftover-save button added.
- **`AddInventoryItemModal` with `leftoverDefaults`** — already fully functional; just needs a caller.
- **`useRecipeIngredients(recipeId)`** + **`useFoodPrices()`** — same data sources RecipeBuilder uses for cost calc; CookModePage already has access via its existing hook wiring pattern.
- **`computeRecipeCostPerServing` + `getPriceForIngredient`** in `src/utils/cost.ts` — lift the inline calc from RecipeBuilder.tsx:576-589 into `useCookCompletion` unchanged.

### Established Patterns
- **TanStack Query hook contract**: hooks pull `householdId` via `useHousehold()`, use `queryKeys.*`, gate with `enabled: !!householdId`. `useCookCompletion` follows this even though it's a thin composition hook — it inherits this from the mutations it wraps.
- **Mutation composition**: RecipeBuilder's `spendLog.mutate({...}, { onSuccess: () => inventoryDeduct.mutateAsync(...).then(...).catch(...) })` is the canonical pattern for "spend first, then non-blocking deduct". Replicate exactly inside the shared hook.
- **Receipt-overlay-then-navigate**: RecipeBuilder keeps the receipt state local (`deductionResult, setDeductionResult`) and renders at the root of the component. CookModePage mirrors this — receipt lives in CookModeShell, not as a full-page state.
- **Status-transition guards**: `useCompleteCookSession` already filters by `started_by: session.user.id` — no additional idempotency infrastructure needed beyond the status check on the client side.

### Integration Points
- **`CookModePage.handlePrimaryAction`** — the single extension point. Currently lines 172-218; new branch fires after `completeSession.mutateAsync` succeeds.
- **`CookModePage` render tree** — `CookDeductionReceipt` gets rendered adjacent to `CookModeShell` (or inside the shell's children), state-driven by `deductionResult`.
- **`RecipeBuilder.handleMarkAsCooked`** — gets rewritten to call `useCookCompletion` instead of the inline sequence. Preserves existing behaviour exactly because the hook encapsulates the exact same logic.
- **`CookDeductionReceipt` public API** — gains a new prop for the leftover-save callback (or the leftover context). Both callers pass it. The existing callers are RecipeBuilder (1001-1008) — CookModePage adds the second.

</code_context>

<specifics>
## Specific Ideas

- Shared hook name suggestion: `useCookCompletion` (in `src/hooks/useCookCompletion.ts`). Final name at planner's discretion.
- Console warning text for multi-recipe early-return (D-09): `[CookMode] Combined cook session (recipe_ids.length=${n}) detected — spend/deduct/leftover skipped. Combined cooking is Phase 28's scope (PREP-02).` — suggested, planner may adjust.
- `is_partial` on spend_logs keeps its existing meaning (unpriced ingredients), NOT repurposed to flag inventory gaps. Don't change semantics downstream consumers rely on.
- UAT for success criterion #5 (Budget → Cook → Inventory → Grocery reconciliation) runs via Playwright against `claude-test@nourishplan.test` / `ClaudeTest!2026` on a dev server — not in automated test suite (too brittle for CI per L-007 cadence).
- The leftover-save modal replaces the receipt visually when opened — the receipt can auto-dismiss in the background during modal interaction. Final visual handoff at planner/executor discretion.

</specifics>

<deferred>
## Deferred Ideas

- **Combined / multi-recipe cook session wiring** — deferred to Phase 28 (PREP-02 orphans — `generate-cook-sequence`, `generate-reheat-sequence`). Phase 28 is expected to wire combined cooking holistically; adding combined spend/deduct there keeps related changes in one place.
- **DB marker column `cook_sessions.inventory_deducted_at`** — considered for idempotency, rejected in favour of client-side status-transition check (D-16). Add the column only if future audit needs arise.
- **Blocking pre-cook confirmation modal when ingredients missing** — considered, rejected (D-13). RecipeBuilder doesn't do this; Cook Mode shouldn't either — inconsistent UX and friction for the common case.
- **Separate spend model for combined cooks** (summed single row vs multi-row) — moot while combined is out of scope; Phase 28 owns the decision.
- **Component-render RTL test of CookModePage** — rejected (D-19). Hook-level unit tests + grep assertions + manual Playwright UAT is the right level of coverage.
- **Refactoring `AddInventoryItemModal` open/close state into a context or hook** — out of scope. Local state pattern from InventoryPage is fine.

</deferred>

---

*Phase: 26-wire-cook-mode-to-inventory-and-budget*
*Context gathered: 2026-04-19*
