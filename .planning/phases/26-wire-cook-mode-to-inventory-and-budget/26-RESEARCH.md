# Phase 26: Wire Cook Mode to Inventory and Budget - Research

**Researched:** 2026-04-19
**Domain:** React/TanStack Query hook composition, NourishPlan internal refactor
**Confidence:** HIGH

## Summary

This phase closes CRIT-01 from the v2.0 audit by extending `CookModePage.handlePrimaryAction` so that Plan-driven cook completions fire the same `spendLog → inventoryDeduct → receipt` sequence that `RecipeBuilder.handleMarkAsCooked` already executes. The work is 90% code-relocation — all downstream primitives (`useInventoryDeduct`, `useCreateSpendLog`, `CookDeductionReceipt`, `AddInventoryItemModal` with `leftoverDefaults`) are already shipped and correctly wired. The missing piece is a shared hook plus a second caller.

Decisions D-01 through D-19 are locked; this research only covers the **how**, not the **what**. The highest-leverage prerequisites are (a) extracting `useCookCompletion` so both call sites stay in lock-step, (b) adding one leftover button to `CookDeductionReceipt` so both cook entry points inherit the leftover prompt for free, and (c) guarding the new sequence on `activeSession.recipe_ids.length === 1` and on `status` transition to prevent re-entry duplication.

**Primary recommendation:** Extract `src/hooks/useCookCompletion.ts` that encapsulates cost calc + `spendLog.mutate` + `inventoryDeduct.mutateAsync` byte-for-byte from RecipeBuilder.tsx:576-616, then call it from both sites. Add a single `onSaveLeftover?: () => void` prop to `CookDeductionReceipt` and render a "Save leftover portion" button whenever that prop is present.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Code Organisation**
- **D-01:** Extract a shared `useCookCompletion` hook that encapsulates cost calc + `useCreateSpendLog.mutate` + `useInventoryDeduct.mutateAsync` + `DeductionResult` return. Both `CookModePage.handlePrimaryAction` AND `RecipeBuilder.handleMarkAsCooked` call this hook — no inline duplication.
- **D-02:** The hook input is the recipe id + loaded ingredients + servings. Callers still own their own local UI state (`deductionResult`, `cookConfirmation`). The hook returns a function that resolves to `{ deductionResult, isPartial, totalCost }`.

**Leftover Prompt**
- **D-04:** Leftover-save affordance lives as a **button inside `CookDeductionReceipt`**, not as a separately-triggered modal. Tapping the button opens `AddInventoryItemModal` with `leftoverDefaults={{ recipeName, recipeId }}`.
- **D-05:** Leftover button **always renders** on the receipt — independent of `recipe.servings`.
- **D-06:** Supersedes Phase 17 D-29 ("no special post-cook prompt").

**RecipeBuilder Parity**
- **D-07:** Because the leftover button lives inside `CookDeductionReceipt`, RecipeBuilder **inherits the leftover prompt automatically**. Both cook entry points behave identically.

**Multi-Recipe Scope**
- **D-08:** Phase 26 scope is **`recipe_ids.length === 1` only**. Multi-recipe sessions skip spend/deduct/receipt. Phase 28 owns combined cooking.
- **D-09:** Guard: `if (activeSession?.recipe_ids.length !== 1) return completeSession()` with a dev console warning.
- **D-10:** For `source === 'recipe'`, `mealId` IS the recipe id. For plan-driven entry, use `activeSession.recipe_ids[0]`.

**Budget / Spend**
- **D-11:** Spend log mirrors RecipeBuilder: `source: 'cook'`, `recipe_id`, `amount: costPerServing × servings`, `is_partial: pricedCount < totalCount`.
- **D-12:** Deduction is **non-blocking** on spend. Deduct failure surfaces in `result.error`; spend log stays.

**Missing Ingredients**
- **D-13:** Mirror RecipeBuilder: deduct what's available, list missing in receipt, no blocking pre-cook modal. `is_partial` keeps its existing meaning (unpriced ingredients).

**Completion Flow / Navigation**
- **D-14:** CookModePage does NOT `navigate(-1)` immediately after `completeSession` anymore. New sequence: `completeSession` → `useCookCompletion.mutate` → render receipt → user interaction → `navigate(-1)` on dismiss.
- **D-15:** Exit-cook-mode button when `allDone` stays as-is (idempotent).

**Idempotency**
- **D-16:** Spend + deduct + leftover fire **only on the transition from `in_progress` to `completed`**. Detect via status check before mutating. Re-entry short-circuits to `navigate(-1)`. No DB migration.

**Testing**
- **D-17:** Vitest hook unit tests for `useCookCompletion`: mutation call order, error semantics, cost calc.
- **D-18:** Grep-level assertions in `tests/cookMode.test.tsx`.
- **D-19:** **No** component-render RTL test for CookModePage. Manual Playwright UAT covers integration.

### Claude's Discretion

- Hook file path/name (`useCookCompletion` suggested)
- Whether helper utilities (`buildIngredientNeeds`, `computeRecipeCostForCook`) live in `src/utils/cookCompletion.ts` or inside the hook file
- Exact API of the `CookDeductionReceipt` leftover-button prop (`onSaveLeftover?: () => void` vs `leftoverContext?: { recipeId, recipeName }`)
- `AddInventoryItemModal` open/close state management in CookModePage (use InventoryPage local-state pattern)
- How to express "stay on page until receipt dismisses" (deferred navigation via effect, or controlled by `onClose`)
- Whether `useCookCompletion` returns a mutation object or a plain async function
- Console warning wording for multi-recipe early-return

### Deferred Ideas (OUT OF SCOPE)

- Combined / multi-recipe cook session wiring → Phase 28
- DB marker column `cook_sessions.inventory_deducted_at` → rejected
- Blocking pre-cook confirmation modal when ingredients missing → rejected
- Separate spend model for combined cooks → Phase 28
- Component-render RTL test of CookModePage → rejected
- Refactoring `AddInventoryItemModal` state into context/hook → rejected

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INVT-05 | Finalizing a meal plan auto-deducts ingredient quantities from inventory | Success criterion #1: CookModePage completion calls `useInventoryDeduct` via the shared hook. Implementation mirrors RecipeBuilder.tsx:605-612 exactly. |
| INVT-06 | Uneaten portions from a recipe appear as leftover inventory items with expiry | Success criterion #4: `CookDeductionReceipt` renders a "Save leftover portion" button that opens `AddInventoryItemModal` with `leftoverDefaults`. `AddInventoryItemModal` already handles the `is_leftover` + `leftover_from_recipe_id` fields (lines 123-132). |
| BUDG-03 | Plan page shows weekly spend vs budget with remaining balance | Success criterion #2: CookModePage completion calls `useCreateSpendLog` with `source: 'cook'`. `useCreateSpendLog.onSuccess` already invalidates `weeklySpend.root` (useSpendLog.ts:48-54), which flows into `BudgetSummarySection` on PlanPage via `useWeeklySpend`. No additional invalidation work. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cost calc from ingredients + prices | Frontend (shared hook) | — | Pure computation on already-loaded client state (`useRecipeIngredients` + `useFoodPrices`). No server round-trip. |
| Spend log insertion | API / Backend (via Supabase client) | Frontend hook wrapper | `useCreateSpendLog` posts to `spend_logs` table; RLS enforces household_id via `get_user_household_id()`. |
| Inventory FIFO deduction | API / Backend (via Supabase client) | Frontend hook wrapper | `useInventoryDeduct` batches `UPDATE inventory_items` calls; RLS enforces household. FIFO sort is client-side (`computeFifoDeductions`). |
| Cook session completion | API / Backend (via Supabase client) | Frontend (`useCompleteCookSession`) | Sets `cook_sessions.status = 'completed'`. Filtered by `started_by = session.user.id`. |
| Receipt rendering | Browser / Client | — | React component, auto-dismiss timer, local state only. |
| Leftover inventory item creation | API / Backend (via Supabase client) | Frontend (`AddInventoryItemModal` → `useAddInventoryItem`) | Existing flow; this phase only adds a new caller. |
| Idempotency guard (status transition) | Frontend (CookModePage state check) | — | Client-side check on `activeSession.status` before mutation. No DB-side guard per D-16. |

## Implementation Approach

### Step 1: Extract `useCookCompletion` hook

**File to create:** `src/hooks/useCookCompletion.ts`

Lift RecipeBuilder.tsx:576-616 into a reusable hook. The hook internally composes `useCreateSpendLog` + `useInventoryDeduct` and exposes a single async function that callers invoke.

**Contract (recommended):**

```ts
// Source: src/components/recipe/RecipeBuilder.tsx:576-616 (existing canonical flow)
import { useCreateSpendLog } from './useSpendLog'
import { useInventoryDeduct, type DeductionResult } from './useInventoryDeduct'
import { useFoodPrices, getPriceForIngredient } from './useFoodPrices'
import { computeRecipeCostPerServing } from '../utils/cost'
import type { RecipeIngredient } from '../types/database'

export interface CookCompletionInput {
  recipeId: string
  recipeName: string          // for receipt display
  servings: number
  ingredients: RecipeIngredient[]
}

export interface CookCompletionOutcome {
  deductionResult: DeductionResult | null  // null only if deduct was skipped
  isPartial: boolean                        // spend partial flag
  totalCost: number
  spendLogged: boolean                      // false if spend mutation threw
}

export function useCookCompletion() {
  const spendLog = useCreateSpendLog()
  const inventoryDeduct = useInventoryDeduct()
  const { data: foodPrices } = useFoodPrices()

  async function runCookCompletion(input: CookCompletionInput): Promise<CookCompletionOutcome> {
    const prices = foodPrices ?? []
    const servings = input.servings > 0 ? input.servings : 1

    // Cost calc — mirrors RecipeBuilder.tsx:578-588
    const ingredientsWithCost = input.ingredients.map(ing => ({
      quantity_grams: ing.quantity_grams,
      cost_per_100g: getPriceForIngredient(prices, ing.ingredient_id),
    }))
    const { costPerServing, pricedCount, totalCount } = computeRecipeCostPerServing(
      ingredientsWithCost,
      servings
    )
    const totalCost = costPerServing * servings
    const isPartial = pricedCount < totalCount

    // Spend log first — mirrors RecipeBuilder.tsx:590-596
    let spendLogged = false
    try {
      await spendLog.mutateAsync({
        recipe_id: input.recipeId,
        amount: totalCost,
        is_partial: isPartial,
      })
      spendLogged = true
    } catch {
      // Caller can decide whether to surface this; we still attempt deduct
      // Per D-12, deduct is non-blocking on spend failure mode
      return { deductionResult: null, isPartial, totalCost, spendLogged: false }
    }

    // Inventory deduct — mirrors RecipeBuilder.tsx:604-612
    const needs = input.ingredients.map(ing => ({
      food_id: ing.ingredient_id,
      food_name: ing.ingredient_name ?? '',
      quantity_grams: ing.quantity_grams,
    }))
    try {
      const deductionResult = await inventoryDeduct.mutateAsync(needs)
      return { deductionResult, isPartial, totalCost, spendLogged }
    } catch {
      return { deductionResult: null, isPartial, totalCost, spendLogged }
    }
  }

  return { runCookCompletion, isPending: spendLog.isPending || inventoryDeduct.isPending }
}
```

**Key behavioural preservation** (from RecipeBuilder.tsx:576-616):
- Spend log fires first; deduct runs in spend `onSuccess` / after `await`.
- Deduct failure does NOT roll back spend (non-blocking per D-12).
- Missing `food_id`/`food_name` from ingredients is tolerated (RecipeBuilder uses `ing.ingredient_name` with `??` fallback, but current RecipeBuilder code does not provide a fallback — RecipeBuilder passes `ing.ingredient_name` directly, which can be null. We preserve this exactly: pass the name as-is from the DB row.).
- `servings` default-to-1 pattern on `recipe.servings <= 0`.

**Note on async sequencing vs RecipeBuilder's callback style:** RecipeBuilder uses `spendLog.mutate({...}, { onSuccess: () => inventoryDeduct.mutateAsync(...) })`. The hook version above switches to `await spendLog.mutateAsync(...)` because awaiting chains is cleaner for a shared hook. Behaviourally identical (same order, same non-blocking semantics). **RecipeBuilder will be refactored in the same phase** to call the hook, so no drift is possible.

### Step 2: Refactor RecipeBuilder to use the hook

**File to modify:** `src/components/recipe/RecipeBuilder.tsx`

- Remove inline `useCreateSpendLog` + `useInventoryDeduct` hook calls from lines 272-273.
- Replace with `const { runCookCompletion } = useCookCompletion()`.
- Rewrite `handleMarkAsCooked` (576-616) to call:
  ```ts
  async function handleMarkAsCooked() {
    if (!recipe || !ingredients) return
    const outcome = await runCookCompletion({
      recipeId: recipe.id,
      recipeName: recipe.name,
      servings: recipe.servings,
      ingredients,
    })
    if (outcome.spendLogged) {
      const msg = outcome.isPartial
        ? `Cooked — partial spend recorded (${formatCost(outcome.totalCost)} of estimated total)`
        : 'Cooked — spend recorded'
      setCookConfirmation(msg)
      setTimeout(() => setCookConfirmation(null), 2000)
    }
    if (outcome.deductionResult) {
      setDeductionResult(outcome.deductionResult)
    }
  }
  ```
- Existing `deductionResult` state and `<CookDeductionReceipt>` render site (lines 1001-1008) stay — no changes needed at the receipt call site beyond passing the new leftover props (Step 4).

### Step 3: Extend CookModePage.handlePrimaryAction

**File to modify:** `src/pages/CookModePage.tsx`

**New state additions** (near line 58-60):
```ts
const [deductionResult, setDeductionResult] = useState<DeductionResult | null>(null)
const [showLeftoverModal, setShowLeftoverModal] = useState(false)
const [leftoverContext, setLeftoverContext] = useState<{ recipeName: string; recipeId: string } | null>(null)
```

**New hook call** (near existing hook block, lines 62-64):
```ts
const { runCookCompletion } = useCookCompletion()
const { data: cookingIngredients } = useRecipeIngredients(recipeIdForSteps ?? '')
// recipeIdForSteps is already declared at line 67; reuse it for ingredients too.
```

**Resolve the single recipe id for the cook completion** (D-10): When `source === 'recipe'`, `mealId` IS the recipe id. Otherwise use `activeSession.recipe_ids[0]`. `recipeIdForSteps` at line 67 already encodes this precisely: `activeSession?.recipe_ids[0] ?? mealId`. Reuse it.

**Resolve recipe name for the receipt:** `recipeStepsData?.name` (line 136, 370) is already loaded by `useRecipeSteps(recipeIdForSteps)`. Reuse it.

**Resolve servings:** Neither `useRecipeSteps` nor the cook session JSON carries `servings`. Two options:
1. Add a `useRecipe(recipeIdForSteps)` call in CookModePage and use `recipe?.servings`. This is the simplest path and matches RecipeBuilder.
2. Pass `servings = 1` and skip the multiply (cost per serving × 1 = cost per serving, which understates total spend).

**Recommendation:** Option 1 — add `const { data: cookingRecipe } = useRecipe(recipeIdForSteps ?? '')` because spend must match RecipeBuilder semantics (total = costPerServing × servings).

**Rewrite `handlePrimaryAction` (172-218):**

```ts
async function handlePrimaryAction() {
  if (allDone || !activeStepId || !activeSessionId) {
    // Exit cook mode button path — already-completed sessions short-circuit (D-16)
    if (activeSessionId && activeSession?.status === 'in_progress') {
      // Transition guard: only run completion sequence on in_progress → completed
      await completeSession.mutateAsync(activeSessionId)
      await runCookCompletionIfSingleRecipe()
      // Do NOT navigate here — receipt dismissal triggers nav (D-14)
      return
    }
    // Already completed, or no session — go back immediately
    navigate(-1)
    return
  }

  const label = derivePrimaryLabel()

  // "Start timer" path — unchanged
  if (label === 'Start timer' && activeStep && activeStep.duration_minutes > 0) {
    // ...existing code...
    return
  }

  // Mark active step as complete
  await updateStep.mutateAsync({ /* existing */ })

  if (isLastStep) {
    // Transition guard: only fire completion sequence on in_progress → completed
    if (activeSession?.status === 'in_progress') {
      await completeSession.mutateAsync(activeSessionId)
      await runCookCompletionIfSingleRecipe()
      // Do NOT navigate here — receipt dismissal triggers nav (D-14)
      return
    }
    navigate(-1)
  }
}

async function runCookCompletionIfSingleRecipe() {
  // D-08/D-09: only single-recipe sessions
  if (!activeSession || activeSession.recipe_ids.length !== 1) {
    if (activeSession && activeSession.recipe_ids.length > 1 && import.meta.env.DEV) {
      console.warn(
        `[CookMode] Combined cook session (recipe_ids.length=${activeSession.recipe_ids.length}) detected — spend/deduct/leftover skipped. Combined cooking is Phase 28's scope (PREP-02).`
      )
    }
    navigate(-1)
    return
  }
  if (!cookingIngredients || !cookingRecipe) {
    navigate(-1)
    return
  }
  const recipeId = activeSession.recipe_ids[0]
  const outcome = await runCookCompletion({
    recipeId,
    recipeName: cookingRecipe.name,
    servings: cookingRecipe.servings,
    ingredients: cookingIngredients,
  })
  if (outcome.deductionResult) {
    setLeftoverContext({ recipeName: cookingRecipe.name, recipeId })
    setDeductionResult(outcome.deductionResult)
  } else {
    // Receipt doesn't render → navigate back directly (deduct was skipped, e.g. no ingredients)
    navigate(-1)
  }
}
```

**Render site** (after existing `CookModeShell` close tag at line 467 or inside the fragment at line 361):

```tsx
{deductionResult && leftoverContext && (
  <CookDeductionReceipt
    mealName={leftoverContext.recipeName}
    result={deductionResult}
    onClose={() => {
      setDeductionResult(null)
      navigate(-1)
    }}
    onSaveLeftover={() => setShowLeftoverModal(true)}
  />
)}

<AddInventoryItemModal
  isOpen={showLeftoverModal}
  onClose={() => {
    setShowLeftoverModal(false)
    setDeductionResult(null)
    navigate(-1)
  }}
  leftoverDefaults={leftoverContext}
/>
```

### Step 4: Add leftover button to CookDeductionReceipt

**File to modify:** `src/components/inventory/CookDeductionReceipt.tsx`

Add an optional `onSaveLeftover?: () => void` prop. When present, render a second button in the action row.

```tsx
interface CookDeductionReceiptProps {
  mealName: string
  result: DeductionResult
  onClose: () => void
  onSaveLeftover?: () => void  // NEW — D-04, D-05
}
```

Render change in the action row (existing line 53-60):
```tsx
<div className="flex justify-end gap-2 mt-2">
  {onSaveLeftover && (
    <button
      onClick={onSaveLeftover}
      className="bg-secondary border border-primary/30 text-primary px-4 py-2 rounded-[--radius-btn] text-sm"
    >
      Save leftover portion
    </button>
  )}
  <button onClick={onClose} ...>Done</button>
</div>
```

**D-05 "always renders" nuance:** The button only renders when the caller passes `onSaveLeftover`. Both CookModePage and RecipeBuilder MUST pass it. The prop is optional (not required) only to keep the component backward-compatible in case of unexpected future callers — but both current callers supply it.

### Step 5: Connect RecipeBuilder leftover flow

**File to modify:** `src/components/recipe/RecipeBuilder.tsx`

Add `leftoverModal` state and `AddInventoryItemModal` render below the `CookDeductionReceipt`:

```tsx
const [showLeftoverModal, setShowLeftoverModal] = useState(false)
// ...
{deductionResult && (
  <CookDeductionReceipt
    mealName={recipe?.name ?? 'Recipe'}
    result={deductionResult}
    onClose={() => setDeductionResult(null)}
    onSaveLeftover={() => setShowLeftoverModal(true)}
  />
)}
{showLeftoverModal && recipe && (
  <AddInventoryItemModal
    isOpen={showLeftoverModal}
    onClose={() => setShowLeftoverModal(false)}
    leftoverDefaults={{ recipeName: recipe.name, recipeId: recipe.id }}
  />
)}
```

## File-level Change Map

| File | Action | Justification |
|------|--------|---------------|
| `src/hooks/useCookCompletion.ts` | CREATE | D-01: shared hook encapsulating cost calc + spend + deduct. |
| `src/pages/CookModePage.tsx` | MODIFY | D-01, D-08, D-09, D-10, D-14, D-16: new completion sequence, state for receipt + leftover modal, transition guard. |
| `src/components/recipe/RecipeBuilder.tsx` | MODIFY | D-01, D-07: refactor `handleMarkAsCooked` to use the shared hook; add leftover modal plumbing. |
| `src/components/inventory/CookDeductionReceipt.tsx` | MODIFY | D-04, D-05: add `onSaveLeftover` prop + leftover button. |
| `tests/cookMode.test.tsx` | MODIFY | D-18: grep assertions on new imports + guards. |
| `tests/useCookCompletion.test.ts` (or `tests/cookCompletion.test.ts`) | CREATE | D-17: hook unit tests for call order, error semantics, cost calc. |

**Files NOT modified** (explicitly preserved):
- `src/hooks/useInventoryDeduct.ts` — already correct
- `src/hooks/useSpendLog.ts` — already correct, invalidations flow to `BudgetSummarySection` via `useWeeklySpend`
- `src/hooks/useCookSession.ts` — already correct, no new status machinery needed
- `src/components/inventory/AddInventoryItemModal.tsx` — already accepts `leftoverDefaults`
- `src/lib/queryKeys.ts` — no new keys needed

## Hook Contract — useCookCompletion

### Signature

```ts
export function useCookCompletion(): {
  runCookCompletion: (input: CookCompletionInput) => Promise<CookCompletionOutcome>
  isPending: boolean
}
```

### Input

```ts
interface CookCompletionInput {
  recipeId: string           // required — for spend_log.recipe_id
  recipeName: string         // required — for receipt display
  servings: number           // required — 0 or negative falls back to 1
  ingredients: RecipeIngredient[]  // required — from useRecipeIngredients(recipeId)
}
```

### Output

```ts
interface CookCompletionOutcome {
  deductionResult: DeductionResult | null
  // null when spend failed OR deduct threw before returning a structured result
  // {deductions:[], missing:[]} when deduct succeeded with no matches
  // {deductions:[...], missing:[...], error?} in all other cases

  isPartial: boolean
  // pricedCount < totalCount on the priced ingredients list
  // NOT related to inventory completeness (per D-13 semantics lock)

  totalCost: number
  // costPerServing × servings

  spendLogged: boolean
  // false if useCreateSpendLog.mutateAsync threw
  // Callers decide whether to surface a toast or silently drop
}
```

### Behavioural Guarantees

1. **Call order is spend → deduct, never reversed.** (Preserves RecipeBuilder.tsx:590-612 semantics exactly.)
2. **Deduct failure is non-blocking on spend.** Returned `outcome.spendLogged = true` with `outcome.deductionResult = null` is the "spend persisted, deduct failed" state.
3. **Cost calc uses `getPriceForIngredient` with no preferred store** (matches RecipeBuilder.tsx:581, which passes only 2 args).
4. **servings ≤ 0 → treated as 1.** Preserves RecipeBuilder.tsx:585.
5. **`is_partial` flags UNPRICED ingredients only** (D-13). Downstream `useWeeklySpend` consumers already interpret it this way. Do NOT repurpose.
6. The hook does NOT invalidate additional query keys beyond what `useCreateSpendLog.onSuccess` and `useInventoryDeduct.onSuccess` already invalidate (`weeklySpend.root`, `spendLogs.byWeek`, `inventory`).

### Non-Goals

- The hook does NOT manage receipt UI state. Callers own `deductionResult`.
- The hook does NOT render toasts. Callers own confirmation messaging.
- The hook does NOT check `activeSession.status` or `recipe_ids.length`. The caller (CookModePage) enforces those guards — RecipeBuilder has no session concept so the hook stays caller-agnostic.

## CookDeductionReceipt API Change

### New Prop

```ts
interface CookDeductionReceiptProps {
  mealName: string
  result: DeductionResult
  onClose: () => void
  onSaveLeftover?: () => void  // NEW — opens AddInventoryItemModal with leftover defaults
}
```

### Rendering Behaviour

- When `onSaveLeftover` is undefined: existing behaviour, single "Done" button.
- When `onSaveLeftover` is defined: render "Save leftover portion" button adjacent to "Done", left-of-Done.
- Auto-dismiss (8-second timer, lines 12-15) continues to fire. If the user has already opened the leftover modal, the receipt auto-dismiss calling `onClose` is fine — the modal remains open (it's a separate portal-like overlay).

### Backward Compatibility

Adding an optional prop does not break existing callers. Both current callers (CookModePage new, RecipeBuilder existing) will pass it per D-04/D-07. No consumers of `CookDeductionReceipt` exist outside `src/components/recipe/RecipeBuilder.tsx` (verified via grep: only the RecipeBuilder import at line 28).

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no database rename/schema change | None |
| Live service config | None — no edge function or Supabase project config change | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — hook extraction is a pure code refactor | None |

No rename or migration — only code additions + refactor. `cook_sessions.status` column already supports the idempotency check without a schema change (D-16).

## Edge Cases & Landmines

### Landmine 1: Servings data source for CookModePage

**Problem:** `useRecipeSteps(recipeId)` (already loaded) exposes `recipeStepsData?.name` and `recipeStepsData?.freezer_friendly` but does NOT carry `servings`. RecipeBuilder has access via `useRecipe(recipeId).servings`.

**Mitigation:** Add `const { data: cookingRecipe } = useRecipe(recipeIdForSteps ?? '')` to CookModePage. Pass `cookingRecipe.servings` into the hook. If `cookingRecipe` is still loading when the user taps "Finish cook session," the early-return in `runCookCompletionIfSingleRecipe` covers the gap — but that's a regression (the user hits Finish and nothing happens). Better: gate the Finish button's `disabled` state on both `cookingRecipe` and `cookingIngredients` being loaded, OR simply allow `navigate(-1)` with no spend/deduct as a degraded path. **Recommendation:** let it degrade to `navigate(-1)` silently — the user has to tap Finish with a bad network, and logging the error in dev is enough.

### Landmine 2: Meal ID vs recipe ID for plan-driven sessions

**Problem:** `/cook/:mealId` — `mealId` in the URL is a `meals.id` for plan entry, a `recipes.id` for `source=recipe` entry. The active session carries `recipe_ids: [recipeId]` regardless of entry path. `useRecipeIngredients(mealId)` would fail for plan entry because `mealId` is a `meals.id`, not a `recipes.id`.

**Mitigation:** Always resolve the recipe id as `activeSession?.recipe_ids[0] ?? mealId` (matches CookModePage.tsx:67's existing `recipeIdForSteps` variable). For `source === 'recipe'`, `activeSession` may be null on initial load (before `createSession` fires), but by the time `handlePrimaryAction` runs with `isLastStep = true`, the session must exist (otherwise there are no steps to mark complete). So `activeSession.recipe_ids[0]` is reliable at the completion moment.

**Verified:** `CookModePage.tsx:67` and `CookModePage.tsx:68` already use this pattern for `useRecipeSteps`. Reuse `recipeIdForSteps` for `useRecipeIngredients` and `useRecipe` too.

### Landmine 3: Status race between `completeSession` and the guard

**Problem:** D-16 says "only run on transition from in_progress to completed." Check is on `activeSession?.status`. After `completeSession.mutateAsync(activeSessionId)` resolves, the TanStack cache invalidates via `onSuccess` (useCookSession.ts:277-280), but `activeSession` in the component may not yet reflect `status = 'completed'` by the time the guard runs next. Worse: the realtime channel on `cook-session-${sessionId}` may fire the invalidation first.

**Mitigation:** Read `activeSession?.status` BEFORE awaiting `completeSession.mutateAsync`, not after. Execute the guard on the pre-completion snapshot:
```ts
if (activeSession?.status === 'in_progress') {
  await completeSession.mutateAsync(activeSessionId)
  await runCookCompletionIfSingleRecipe()
}
```
This is safe because the `status === 'in_progress'` check occurs in the synchronous path before any awaits. Re-entry (user navigates back into a completed session, `status === 'completed'` is cached) correctly short-circuits to `navigate(-1)`.

### Landmine 4: Receipt auto-dismiss while leftover modal is open

**Problem:** `CookDeductionReceipt` auto-dismisses after 8 seconds (line 13). If the user taps "Save leftover portion" and takes more than 8 seconds to fill the modal, the receipt calls `onClose` behind the modal. In CookModePage, `onClose` is bound to `setDeductionResult(null)` + `navigate(-1)`, which would unmount the modal.

**Mitigation:** Defer navigation until the modal also closes. Track both:
```ts
function handleReceiptClose() {
  setDeductionResult(null)
  if (!showLeftoverModal) navigate(-1)  // only navigate if modal not open
}
function handleModalClose() {
  setShowLeftoverModal(false)
  setDeductionResult(null)
  navigate(-1)
}
```
Alternative (simpler): when the user taps "Save leftover portion," cancel the receipt's auto-dismiss timer. Cleanest implementation: pass a `paused: boolean` prop to `CookDeductionReceipt` that suppresses the timer. **Recommendation:** go with the first approach (flag-based navigation) — no new prop surface, receipt component stays the same.

### Landmine 5: Combined-prep session early-return breaks `allDone` path

**Problem:** When a combined cook session (`recipe_ids.length > 1`) completes, the new guard returns early. But the existing `navigate(-1)` path at CookModePage.tsx:216 was the only code that happened after `completeSession.mutateAsync` — so the old behaviour is preserved by ensuring the multi-recipe guard still calls `navigate(-1)` at the end:
```ts
async function runCookCompletionIfSingleRecipe() {
  if (!activeSession || activeSession.recipe_ids.length !== 1) {
    // ... dev warning ...
    navigate(-1)  // preserve old nav behaviour
    return
  }
  // ... single-recipe path ...
}
```
**Verified safe:** no other consumer of "combined cook completion" exists today (Phase 28 is future work).

### Landmine 6: `ingredient_name` nullability on spend_log

**Problem:** `RecipeIngredient.ingredient_name` is `string | null | undefined`. RecipeBuilder.tsx:607 passes it as-is to `useInventoryDeduct`'s `food_name` field, which is declared `string`. TypeScript currently permits this because the hook's input type uses inference loose enough to tolerate it.

**Mitigation:** In `useCookCompletion`, coerce with `ing.ingredient_name ?? ''` to be explicit and avoid a latent type error if a stricter lint is enabled. Matches the tolerant existing behaviour.

### Landmine 7: Weekly spend invalidation already flows correctly — do not double-invalidate

**Verification:** `useCreateSpendLog.onSuccess` (useSpendLog.ts:46-56) invalidates:
- `queryKeys.weeklySpend.root(householdId, data.week_start)` → consumed by `useWeeklySpend` (useWeeklySpend.ts:10) → consumed by `BudgetSummarySection.tsx:26`.
- `queryKeys.spendLogs.byWeek(householdId, data.week_start)` → no current consumers in `src/`, but reserved.

**Mitigation:** Do NOT add manual `invalidateQueries` calls in `useCookCompletion` or `CookModePage`. The existing invalidation is sufficient. **Verified:** `grep -r "weeklySpend" src/` shows only `useWeeklySpend.ts` and `useSpendLog.ts` — one producer, one consumer.

### Landmine 8: `useInventoryDeduct` needs `useInventoryItems()` data loaded

**Problem:** `useInventoryDeduct` at line 17 does `useInventoryItems()` (no location filter). If `allItems` is still loading when `runCookCompletion` is called, line 24's guard `if (!householdId || !allItems) return { deductions: [], missing: needs.map(n => n.food_name) }` returns a zero-deduction result. User sees a receipt with all ingredients "not in inventory" even though they have matching items.

**Mitigation:** CookModePage should ensure `useInventoryItems` data is loaded before the user can finish cooking. In practice, `useInventoryItems` is not currently called in CookModePage — it's called transitively by `useInventoryDeduct`. But query caching means it probably IS loaded if the user visited Inventory previously. For cold-start UX, add `const { isPending: inventoryPending } = useInventoryItems()` in CookModePage and gate the Finish button. **Recommendation:** Acceptable degradation — matches RecipeBuilder behaviour exactly (RecipeBuilder has the same race). Do NOT add a new gating hook; this would introduce inconsistent UX vs RecipeBuilder.

### Landmine 9: L-020 worktree cleanup applies if this phase uses parallel executors

If this phase is executed with GSD worktree parallelism, the planner must include the L-020 feature-preservation warning block in subagent prompts. Particular risk files:
- `CookModePage.tsx` — 470 lines, heavy state machine, prior Phase 22 + 23 work. Explicit preservation list required: `fireStepDoneNotification`, `playTimerChime`, `handleTimerComplete`, `useEffect` for timer tracking (lines 147-162), `NotificationPermissionBanner` wiring, `InAppTimerAlert` render site, `MultiMealSwitcher` concurrency display, `MultiMealPromptOverlay` branching, resume-prompt and reheat branches.
- `RecipeBuilder.tsx` — 1000+ lines; explicit preservation list required for all existing `CookEntryPointOnRecipeDetail`, `RecipeFreezerToggle`, `RecipeStepsSection`, `NutritionBar`, `MicronutrientPanel`, `FoodSearchOverlay` wiring and `relativeTime` helper.

### Landmine 10: L-001 — worktree cleanup before vitest

Before running `npx vitest` for verification, the planner MUST include a task step that runs:
```bash
for d in .claude/worktrees/agent-*; do git worktree remove "$d" --force 2>/dev/null; done
rm -rf .claude/worktrees/agent-*
```
This is non-negotiable after any parallel GSD execution.

### Landmine 11: L-007 — Playwright UAT against claude-test account

Manual UAT for success criterion #5 (Budget → Cook → Inventory → Grocery reconciliation) uses `claude-test@nourishplan.test` / `ClaudeTest!2026` on nourishplan.gregok.ca AFTER a deploy AND after clearing the PWA cache (L-003). The UAT checklist must explicitly enumerate:
1. Pre-state check: weekly spend shown on Plan page
2. Navigate to Plan, tap Cook on a meal with priced ingredients and inventory items
3. Complete all steps in Cook Mode
4. Tap "Finish cook session"
5. Verify receipt appears with deducted items
6. Tap "Save leftover portion", fill minimal form, save
7. Verify inventory increase (leftover item present in fridge tab)
8. Verify Plan page weekly spend increased by the expected amount
9. Verify grocery list regenerated (or existing) subtracts the deducted ingredients

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + @testing-library/react |
| Config file | `vitest.config.ts` (verified exists in repo root) |
| Quick run command | `npx vitest run tests/useCookCompletion.test.ts` (new file) |
| Full suite command | `npx vitest run` |
| Worktree prereq | `for d in .claude/worktrees/agent-*; do git worktree remove "$d" --force 2>/dev/null; done; rm -rf .claude/worktrees/agent-*` (L-001) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INVT-05 | CookModePage completion calls useInventoryDeduct via shared hook | unit (hook) | `npx vitest run tests/useCookCompletion.test.ts -t "calls inventoryDeduct after spendLog succeeds"` | ❌ Wave 0 |
| INVT-05 | CookModePage imports useCookCompletion + guards recipe_ids.length === 1 | grep (file content) | `npx vitest run tests/cookMode.test.tsx -t "CookModePage wiring"` | Add to existing file |
| INVT-06 | CookDeductionReceipt renders Save leftover button when onSaveLeftover prop present | grep (file content) | `npx vitest run tests/cookMode.test.tsx -t "leftover button"` | Add to existing file |
| INVT-06 | CookModePage opens AddInventoryItemModal with leftoverDefaults on Save leftover tap | grep (file content) | `npx vitest run tests/cookMode.test.tsx -t "leftover modal plumbing"` | Add to existing file |
| BUDG-03 | Spend log payload matches RecipeBuilder exactly: source='cook', recipe_id, amount, is_partial | unit (hook) | `npx vitest run tests/useCookCompletion.test.ts -t "spend log payload shape"` | ❌ Wave 0 |
| BUDG-03 | Spend log fires even when deduct fails (non-blocking) | unit (hook) | `npx vitest run tests/useCookCompletion.test.ts -t "deduct failure does not roll back spend"` | ❌ Wave 0 |
| D-16 | Status transition guard in CookModePage.handlePrimaryAction | grep (file content) | `npx vitest run tests/cookMode.test.tsx -t "status transition guard"` | Add to existing file |
| D-01 | RecipeBuilder.handleMarkAsCooked uses useCookCompletion (no inline spend/deduct call) | grep (file content) | `npx vitest run tests/cookMode.test.tsx -t "RecipeBuilder uses shared hook"` | Add to existing file |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/useCookCompletion.test.ts tests/cookMode.test.tsx`
- **Per wave merge:** `npx vitest run` (full suite, after L-001 cleanup)
- **Phase gate:** Full suite green AND manual Playwright UAT on nourishplan.gregok.ca green (L-007, L-013, L-014).

### Wave 0 Gaps

- [ ] `tests/useCookCompletion.test.ts` — 4 unit tests covering call order, error semantics, cost calc, payload shape. Pattern: follow `tests/cookSession.test.tsx` — mock supabase client, useAuth, useHousehold; use `renderHook` + `QueryClientProvider`.
- [ ] `tests/cookMode.test.tsx` — append 4 new describe blocks for file-content grep assertions on CookModePage, RecipeBuilder, CookDeductionReceipt.

*Framework install:* Not needed — Vitest + RTL already installed per `tests/cookSession.test.tsx`.

### Manual UAT Gate (Success Criterion #5 + INVT-06 end-to-end)

Playwright-driven, credentials `claude-test@nourishplan.test` / `ClaudeTest!2026` (L-007), against deployed nourishplan.gregok.ca (L-013) AFTER clearing service worker + caches (L-003). Checklist in Landmine 11 above.

### Deployment Gate

1. Run `npx vite build` — zero errors
2. `npx vercel --prod` — successful deploy
3. Clear SW + caches in Playwright (L-003)
4. Run manual UAT checklist
5. Only then present verification checkpoint to user (L-007, L-014)

## Sources

### Primary (HIGH confidence)

- `src/components/recipe/RecipeBuilder.tsx:576-616` — canonical `handleMarkAsCooked` flow (VERIFIED: Read)
- `src/pages/CookModePage.tsx:172-218` — target `handlePrimaryAction` (VERIFIED: Read)
- `src/hooks/useInventoryDeduct.ts` — mutation contract + invalidation (VERIFIED: Read)
- `src/hooks/useSpendLog.ts:46-56` — invalidation flows into `weeklySpend.root` (VERIFIED: Read)
- `src/hooks/useCookSession.ts:263-282` — `useCompleteCookSession` contract (VERIFIED: Read)
- `src/components/inventory/CookDeductionReceipt.tsx` — existing receipt component (VERIFIED: Read)
- `src/components/inventory/AddInventoryItemModal.tsx:31-132` — leftover defaults handling (VERIFIED: Read)
- `src/hooks/useFoodPrices.ts` + `src/utils/cost.ts` — cost calc primitives (VERIFIED: Read)
- `src/lib/queryKeys.ts:49-56` — weeklySpend + spendLogs key shapes (VERIFIED: Read)
- `src/hooks/useWeeklySpend.ts` + `src/components/plan/BudgetSummarySection.tsx` — consumer chain for BUDG-03 (VERIFIED: grep)
- `src/pages/InventoryPage.tsx:1-48, 142-147` — AddInventoryItemModal local-state pattern (VERIFIED: Read)
- `tests/cookSession.test.tsx` — hook unit test pattern to mirror (VERIFIED: Read)
- `tests/cookMode.test.tsx` — grep-style assertion pattern (VERIFIED: Read)
- `.planning/phases/26-wire-cook-mode-to-inventory-and-budget/26-CONTEXT.md` — locked decisions (VERIFIED: Read)
- `.planning/REQUIREMENTS.md:130-142, 295-302` — INVT-05, INVT-06, BUDG-03 definitions (VERIFIED: Read)
- `.planning/ROADMAP.md:504-516` — Phase 26 success criteria (VERIFIED: Read)
- `.planning/v2.0-MILESTONE-AUDIT.md:216-228` — CRIT-01 evidence (VERIFIED: Read)
- `lessons.md` — L-001, L-003, L-007, L-013, L-014, L-020 (VERIFIED: Read)

### Secondary (MEDIUM confidence)

- None — everything is code-internal and verified by Read.

### Tertiary (LOW confidence)

- None.

## Assumptions Log

> All claims in this research were verified via Read/Grep against the codebase. No assumed claims requiring user confirmation.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | (empty) | — | — |

## Open Questions for Planner

1. **Receipt timer-pause vs deferred-nav for Landmine 4**
   - What we know: Receipt auto-dismisses after 8s; leftover modal is independent overlay.
   - What's unclear: Which approach is cleaner — flag-based deferred nav (no new prop on CookDeductionReceipt) or a `paused` prop on the receipt?
   - Recommendation: Flag-based deferred nav. Zero new prop surface. Preference for minimal change per code-style.md.

2. **`useCookCompletion` return: mutation object vs plain function**
   - What we know: Phase 26 CONTEXT D-02 says "The hook returns a function that resolves to `{ deductionResult, isPartial, totalCost }`."
   - What's unclear: Whether to expose `isPending` in addition (for button spinners).
   - Recommendation: Expose `{ runCookCompletion, isPending }`. No caller uses the spinner yet, but adding it is free and future-proof.

3. **Should servings be fetched fresh in CookModePage or passed from session?**
   - What we know: Cook session JSON does not snapshot servings. `useRecipe(recipeId)` loads it.
   - What's unclear: If the recipe's servings count is edited mid-cook, should the completion use the snapshot at start-of-cook or live value?
   - Recommendation: Use live value (`useRecipe(recipeId).servings`) — matches RecipeBuilder, matches the Phase 23 "R-02: live-bound, not snapshotted" pattern for steps.

4. **Leftover button wording**
   - What we know: CONTEXT doesn't prescribe the button label.
   - What's unclear: "Save leftover portion" vs "Save as leftover" vs "Save leftovers"
   - Recommendation: "Save leftover portion" — matches the "leftover portions" language in ROADMAP success criterion #4.

5. **Should `CookDeductionReceipt` prop be `onSaveLeftover: () => void` or `leftoverContext: { recipeId, recipeName }`?**
   - What we know: CONTEXT lists this as Claude's discretion.
   - What's unclear: Trade-off between "component knows nothing about leftovers, caller controls modal" (callback) vs "component self-contained" (context object + internal modal).
   - Recommendation: Callback-only (`onSaveLeftover: () => void`). The modal stays in the caller so the caller can control both modal open state and navigation. Simpler receipt component, better separation of concerns.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vitest | Unit tests | ✓ | 3.x (verified via `tests/cookSession.test.tsx` imports) | — |
| @testing-library/react | `renderHook` in hook tests | ✓ | Per existing `tests/cookSession.test.tsx` | — |
| TypeScript 5 | Compile check | ✓ | Per package.json (not re-verified; no changes affecting tsconfig) | — |
| Vercel CLI | `npx vercel --prod` deploy | ✓ | Used per CLAUDE.md "Deploy" | — |
| Supabase CLI | Not needed (no migration) | n/a | n/a | — |
| Playwright MCP | Manual UAT | ✓ | Per project session memory | — |

No missing dependencies. No fallbacks needed.

## Project Constraints (from CLAUDE.md + .claude/rules/)

- **Match existing patterns first** — new `useCookCompletion` follows the `useFoodPrices` convention (via `useHousehold()` dependencies, `queryKeys.*`, etc.). It does not need its own query key because it's a composition of existing mutations. Both mutations already pull `householdId` internally. (architecture.md, code-style.md)
- **No new top-level directories** — hook goes in existing `src/hooks/`, tests in existing `tests/`. (architecture.md)
- **Minimal changes** — do NOT refactor CookDeductionReceipt beyond adding the leftover button. Do NOT refactor RecipeBuilder beyond the `handleMarkAsCooked` rewrite. (code-style.md "Minimal Changes")
- **No premature abstraction** — do NOT extract helper utils like `buildIngredientNeeds` unless they're genuinely used in 3+ places. The hook file holds its own helpers. (code-style.md "Avoid Premature Abstraction")
- **Page spacing** — not applicable; no new pages.
- **Hook conventions** — `useFoodPrices` pattern: get `householdId` via `useHousehold()`, use `queryKeys.*`, `enabled: !!householdId`. `useCookCompletion` is a composition hook — it inherits household scoping from the underlying `useCreateSpendLog` + `useInventoryDeduct`, which both pull household internally. (CLAUDE.md "Coding Conventions")
- **Query key centralisation** — no new keys needed. `useCreateSpendLog` and `useInventoryDeduct` already handle their own invalidations via `queryKeys.*`. (CLAUDE.md "Risky Areas")
- **L-001 through L-027** — all lessons.md rules apply. L-001 (worktree cleanup before vitest), L-003 (clear SW cache before Playwright), L-007 (test DB writes with Playwright on claude-test account), L-013/L-014 (deploy + Playwright verify before user checkpoint), L-020/L-027 (feature-preservation lists in executor prompts for CookModePage + RecipeBuilder) are load-bearing.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already present in repo, no new dependencies.
- Architecture: HIGH — locked decisions D-01..D-19, canonical implementation already exists at RecipeBuilder.tsx:576-616.
- Pitfalls: HIGH — all landmines verified against live source files. Status race, servings gap, meal-vs-recipe id, weekly-spend invalidation chain all confirmed via Read.
- Tests: HIGH — patterns replicated from `tests/cookSession.test.tsx` + `tests/cookMode.test.tsx` which were both Read.
- Deployment: HIGH — unchanged from existing NourishPlan deploy flow (L-013/L-014 apply).

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (30 days — stable internal codebase, no external dependencies that could churn)

## RESEARCH COMPLETE
