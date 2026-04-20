# Phase 26: Wire Cook Mode to Inventory and Budget - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 6
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/useCookCompletion.ts` | new hook (composition) | request-response (chained mutations) | `src/components/recipe/RecipeBuilder.tsx:576-616` (logic to lift) + `src/hooks/useFoodPrices.ts` (hook shape) + `src/hooks/useSpendLog.ts` + `src/hooks/useInventoryDeduct.ts` | exact-template (logic already exists inline) |
| `tests/useCookCompletion.test.tsx` | new test (vitest + renderHook) | unit | `tests/cookSession.test.tsx` | exact (same framework, same mock pattern) |
| `src/pages/CookModePage.tsx` | modified page | request-response + orchestration | `src/components/recipe/RecipeBuilder.tsx:273-277, 576-616, 1001-1008` | exact (mirrors RecipeBuilder completion flow) |
| `src/components/recipe/RecipeBuilder.tsx` | modified component (refactor) | request-response | itself (lines 273, 576-616, 1001-1008) — before/after shape | self-reference |
| `src/components/inventory/CookDeductionReceipt.tsx` | modified component (extend) | render-only | itself (current action row lines 53-60) + `AddInventoryItemModal.tsx` submit styling | self-reference |
| `tests/cookMode.test.tsx` | modified test (append describe blocks) | file-content grep | itself (existing describe blocks lines 9-122) | self-reference |

---

## Pattern Assignments

### 1. `src/hooks/useCookCompletion.ts` (NEW — composition hook)

**Primary analog (logic to lift verbatim):** `src/components/recipe/RecipeBuilder.tsx:576-616`

**Secondary analog (hook file shape):** `src/hooks/useFoodPrices.ts:1-24` (imports + export signature convention)
**Secondary analog (mutation + queryKey invalidation):** `src/hooks/useSpendLog.ts:46-57`

---

**Imports pattern — copy from `src/hooks/useSpendLog.ts:1-6` + `src/hooks/useInventoryDeduct.ts:1-6`:**

```typescript
// src/hooks/useSpendLog.ts:1-6
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import { getWeekStart } from '../utils/mealPlan'
```

```typescript
// src/hooks/useInventoryDeduct.ts:1-12 (for DeductionResult + hook composition)
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useHousehold } from './useHousehold'
import { useInventoryItems } from './useInventory'
import { computeFifoDeductions, convertToGrams } from '../utils/inventory'
import type { InventoryItem } from '../types/database'

export interface DeductionResult {
  deductions: { item: InventoryItem; deductAmount: number }[]
  missing: string[]
  error?: string
}
```

**Delta for new file:** `useCookCompletion` only needs `useCreateSpendLog`, `useInventoryDeduct`, `useFoodPrices` + `getPriceForIngredient`, and `computeRecipeCostPerServing`. No direct `supabase` or `useMutation` call — it is a thin composition.

---

**Core pattern — the exact sequence to lift (canonical template):**

Source: `src/components/recipe/RecipeBuilder.tsx:576-616`

```typescript
function handleMarkAsCooked() {
  if (!recipe || !ingredients) return
  const prices = foodPrices ?? []
  const ingredientsWithCost = ingredients.map(ing => ({
    quantity_grams: ing.quantity_grams,
    cost_per_100g: getPriceForIngredient(prices, ing.ingredient_id),
  }))
  const { costPerServing, pricedCount, totalCount } = computeRecipeCostPerServing(
    ingredientsWithCost,
    recipe.servings > 0 ? recipe.servings : 1
  )
  const totalCost = costPerServing * (recipe.servings > 0 ? recipe.servings : 1)
  const isPartial = pricedCount < totalCount

  spendLog.mutate(
    {
      recipe_id: recipe.id,
      amount: totalCost,
      is_partial: isPartial,
    },
    {
      onSuccess: () => {
        const msg = isPartial
          ? `Cooked — partial spend recorded (${formatCost(totalCost)} of estimated total)`
          : 'Cooked — spend recorded'
        setCookConfirmation(msg)
        setTimeout(() => setCookConfirmation(null), 2000)

        // Trigger inventory deduction (non-blocking — failure does not prevent spend log)
        const needs = (ingredients ?? []).map(ing => ({
          food_id: ing.ingredient_id,
          food_name: ing.ingredient_name,
          quantity_grams: ing.quantity_grams,
        }))
        inventoryDeduct.mutateAsync(needs)
          .then(result => setDeductionResult(result))
          .catch(() => { /* deduction failure is non-blocking */ })
      },
    }
  )
}
```

**Delta for new hook:**

1. Wrap this body in `async function runCookCompletion(input: CookCompletionInput): Promise<CookCompletionOutcome>`.
2. Replace `spendLog.mutate({...}, { onSuccess: () => { ... } })` with `await spendLog.mutateAsync({...})` followed by `await inventoryDeduct.mutateAsync(needs)`. Behaviorally identical (same order, non-blocking).
3. Remove all UI state calls (`setCookConfirmation`, `setDeductionResult`) — hook returns `{ deductionResult, isPartial, totalCost, spendLogged }` so callers own UI.
4. Do NOT add console.error or logger — keep caller-agnostic.
5. Coerce `ing.ingredient_name ?? ''` (per research Landmine 6) — tolerant of null.
6. Input is `{ recipeId, recipeName, servings, ingredients }`, not `recipe` object — decouples hook from DB row shape.

---

**Hook shape pattern — copy signature convention from `src/hooks/useFoodPrices.ts:8-24`:**

```typescript
// src/hooks/useFoodPrices.ts:8-24
export function useFoodPrices() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useQuery({
    queryKey: queryKeys.foodPrices.list(householdId),
    queryFn: async (): Promise<FoodPrice[]> => {
      const { data, error } = await supabase
        .from('food_prices')
        .select('*')
        .eq('household_id', householdId!)
        .order('food_name')
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}
```

**Delta:** `useCookCompletion` is NOT a useQuery / useMutation — it is a plain composition hook that returns `{ runCookCompletion, isPending }`. No household wiring needed at this level (inherited from `useCreateSpendLog` + `useInventoryDeduct`). No `queryKey`. No `enabled`. Just compose + expose an async function.

---

### 2. `tests/useCookCompletion.test.tsx` (NEW — hook unit test)

**Primary analog:** `tests/cookSession.test.tsx` (entire file)

**Mock boilerplate — copy verbatim from `tests/cookSession.test.tsx:1-38`:**

```typescript
// tests/cookSession.test.tsx:1-38
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock supabase before importing the hook
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}
const mockRemoveChannel = vi.fn()

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: mockRemoveChannel,
  },
}))

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ session: { user: { id: 'user-1' } } }),
}))

vi.mock('../src/hooks/useHousehold', () => ({
  useHousehold: vi.fn().mockReturnValue({
    data: { household_id: 'hh-1', role: 'admin', households: { name: 'Test Household' } },
    isPending: false,
    isError: false,
  }),
  useHouseholdMembers: vi.fn().mockReturnValue({ data: [], isPending: false }),
}))
```

**Wrapper + renderHook pattern — copy from `tests/cookSession.test.tsx:49-55`:**

```typescript
// tests/cookSession.test.tsx:49-55
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children)

const { unmount } = renderHook(() => useCookSession('test-session-id'), { wrapper })
```

**Delta for new test file:**

1. Replace the supabase `from` mock chain to return `{ data, error }` tuples for `spend_logs.insert(...).select().single()` and `inventory_items.update(...).eq(...)`. Spy order is the assertion axis.
2. Add a mock for `../src/hooks/useInventory` → `useInventoryItems` that returns a small array of mock `InventoryItem`s (enough for FIFO to pick one match).
3. Add a mock for `../src/hooks/useFoodPrices` → `useFoodPrices` returning `{ data: [{ food_id: 'ing-1', cost_per_100g: 2.5, ... }] }` AND re-export `getPriceForIngredient` from the real module (use `vi.importActual`).
4. Use the `runCookCompletion(...)` returned from `renderHook(() => useCookCompletion())` inside an async `act(...)` or awaited promise; assert on call order (`spendLog` insert spy called before `inventory_items` update spy), on the shape of the spend-log insert payload (`source: 'cook', recipe_id, amount, is_partial`), and on the returned `outcome.deductionResult` + `outcome.spendLogged`.
5. Add test cases per D-17: (a) call order, (b) deduct failure does not roll back spend, (c) cost calc correctness for single priced ingredient, (d) `is_partial=true` when only some ingredients are priced.

---

### 3. `src/pages/CookModePage.tsx` (MODIFIED — wire completion sequence)

**Primary analog:** `src/components/recipe/RecipeBuilder.tsx` — three sites (273-277, 576-616, 1001-1008).

---

**Hook wiring pattern — copy approach from `RecipeBuilder.tsx:272-277`:**

```typescript
// src/components/recipe/RecipeBuilder.tsx:272-277
const spendLog = useCreateSpendLog()
const inventoryDeduct = useInventoryDeduct()
const { data: stepsData } = useRecipeSteps(recipeId)
const regenerateSteps = useRegenerateRecipeSteps()
const [cookConfirmation, setCookConfirmation] = useState<string | null>(null)
const [deductionResult, setDeductionResult] = useState<DeductionResult | null>(null)
```

**Delta for CookModePage:**

- Add near existing hook block (around `CookModePage.tsx:62-68` where `createSession`, `updateStep`, `completeSession`, and `recipeIdForSteps` are already declared):
  ```typescript
  const { runCookCompletion } = useCookCompletion()
  const { data: cookingRecipe } = useRecipe(recipeIdForSteps ?? '')
  const { data: cookingIngredients } = useRecipeIngredients(recipeIdForSteps ?? '')
  const [deductionResult, setDeductionResult] = useState<DeductionResult | null>(null)
  const [showLeftoverModal, setShowLeftoverModal] = useState(false)
  const [leftoverContext, setLeftoverContext] = useState<{ recipeName: string; recipeId: string } | null>(null)
  ```
- Reuse `recipeIdForSteps` (already at line 67, matches D-10 pattern `activeSession?.recipe_ids[0] ?? mealId`).
- Import `useRecipe` + `useRecipeIngredients` from `../hooks/useRecipes`, `useCookCompletion` from `../hooks/useCookCompletion`, `CookDeductionReceipt` from `../components/inventory/CookDeductionReceipt`, `AddInventoryItemModal` from `../components/inventory/AddInventoryItemModal`, and `type { DeductionResult } from '../hooks/useInventoryDeduct'`.

---

**Completion sequence pattern — adapt from `RecipeBuilder.tsx:576-616`:**

The RecipeBuilder body shown in Section 1 is the template. CookModePage's variation MUST add:

1. **Status-transition guard (D-16):** Read `activeSession?.status === 'in_progress'` BEFORE the `await completeSession.mutateAsync(...)`. Skip the hook call when already completed.
2. **Single-recipe guard (D-08/D-09):** `if (activeSession.recipe_ids.length !== 1)` → dev-only console.warn + `navigate(-1)`. Do NOT call the hook for combined sessions.
3. **Receipt overlay render:** defer `navigate(-1)` until receipt + modal close (Landmine 4 deferred-nav flag pattern).

**Target to modify — current `handlePrimaryAction` (`src/pages/CookModePage.tsx:172-218`):**

```typescript
// src/pages/CookModePage.tsx:172-218
async function handlePrimaryAction() {
  if (allDone || !activeStepId || !activeSessionId) {
    // Complete session and navigate back
    if (activeSessionId) {
      await completeSession.mutateAsync(activeSessionId)
    }
    navigate(-1)
    return
  }

  const label = derivePrimaryLabel()

  // "Start timer" — passive step with duration: record timer_started_at and start interval
  if (label === 'Start timer' && activeStep && activeStep.duration_minutes > 0) {
    // ...existing code...
    return
  }

  // Mark active step as complete
  await updateStep.mutateAsync({
    sessionId: activeSessionId,
    stepId: activeStepId,
    patch: {
      completed_at: new Date().toISOString(),
      completed_by: authSession?.user.id ?? null,
    },
  })

  if (isLastStep) {
    await completeSession.mutateAsync(activeSessionId)
    navigate(-1)
  }
}
```

**Delta:** Inject a new helper `runCookCompletionIfSingleRecipe()` (see RESEARCH.md Step 3) and call it in BOTH the `allDone` branch AND the `isLastStep` branch BEFORE `navigate(-1)`. Replace the bare `navigate(-1)` with the deferred-nav pattern: navigation happens in the receipt's `onClose` or the modal's `onClose`, not here.

---

**Receipt + modal render pattern — copy from `RecipeBuilder.tsx:1001-1008`:**

```tsx
// src/components/recipe/RecipeBuilder.tsx:1001-1008
{/* Cook deduction receipt */}
{deductionResult && (
  <CookDeductionReceipt
    mealName={recipe?.name ?? 'Recipe'}
    result={deductionResult}
    onClose={() => setDeductionResult(null)}
  />
)}
```

**Delta for CookModePage:**

1. Place render site **outside** `<CookModeShell>` but inside the top-level fragment (around `CookModePage.tsx:361-368` where `InAppTimerAlert` already renders adjacent to the shell).
2. Add `onSaveLeftover={() => setShowLeftoverModal(true)}` (the new prop from file #5 below).
3. Use `leftoverContext?.recipeName` for `mealName` instead of `recipe?.name`.
4. Add `onClose` body that does `setDeductionResult(null)` AND calls `navigate(-1)` only if `!showLeftoverModal` (Landmine 4).
5. Render `AddInventoryItemModal` immediately after the receipt (copy `InventoryPage.tsx:142-147` state pattern, see below).

---

**Modal local-state pattern — copy from `src/pages/InventoryPage.tsx:17-41, 142-147`:**

```tsx
// src/pages/InventoryPage.tsx:17-22, 37-41
const [showAddModal, setShowAddModal] = useState(false)
const [editItem, setEditItem] = useState<InventoryItem | null>(null)
// ...
function handleModalClose() {
  setShowAddModal(false)
  setEditItem(null)
  setScanResult(null)
}

// src/pages/InventoryPage.tsx:142-147
<AddInventoryItemModal
  isOpen={showAddModal}
  onClose={handleModalClose}
  editItem={editItem}
  scanResult={scanResult}
/>
```

**Delta for CookModePage:** use `showLeftoverModal` / `setShowLeftoverModal` state pair; pass `leftoverDefaults={leftoverContext}` (not `editItem` / `scanResult`); `onClose` must also clear `deductionResult` and call `navigate(-1)` to finish the completion flow.

---

### 4. `src/components/recipe/RecipeBuilder.tsx` (MODIFIED — refactor to shared hook)

**Analog:** itself — current lines 272-277, 576-616, 1001-1008 (before/after shape).

**Before (current RecipeBuilder.tsx:272-277):**

```typescript
const spendLog = useCreateSpendLog()
const inventoryDeduct = useInventoryDeduct()
const { data: stepsData } = useRecipeSteps(recipeId)
const regenerateSteps = useRegenerateRecipeSteps()
const [cookConfirmation, setCookConfirmation] = useState<string | null>(null)
const [deductionResult, setDeductionResult] = useState<DeductionResult | null>(null)
```

**After (delta):**

- Remove `const spendLog = useCreateSpendLog()` and `const inventoryDeduct = useInventoryDeduct()`.
- Add `const { runCookCompletion } = useCookCompletion()`.
- Add `const [showLeftoverModal, setShowLeftoverModal] = useState(false)` (for the new leftover prompt).
- Keep `cookConfirmation`, `deductionResult`, `setCookConfirmation`, `setDeductionResult` — still used for the RecipeBuilder's own UI.
- Update imports at top (lines 18, 21-22): remove direct `useCreateSpendLog` and `useInventoryDeduct` imports; add `useCookCompletion` from `../../hooks/useCookCompletion`; keep `DeductionResult` type-only import (still referenced by the `deductionResult` state).

**Before (current RecipeBuilder.tsx:576-616):** see full excerpt in Section 1.

**After (delta):** replace entire `handleMarkAsCooked` body with the awaited-hook pattern from RESEARCH.md Step 2:

```typescript
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

**Before (current RecipeBuilder.tsx:1001-1008):** see full excerpt in Section 3.

**After (delta):** add `onSaveLeftover={() => setShowLeftoverModal(true)}` to the existing `<CookDeductionReceipt>`, and render `<AddInventoryItemModal>` immediately below with `leftoverDefaults={{ recipeName: recipe.name, recipeId: recipe.id }}` and `isOpen={showLeftoverModal}`.

**Preservation list (Landmine 9 / L-020):** RecipeBuilder.tsx is 1000+ lines. Do not touch `CookEntryPointOnRecipeDetail`, `RecipeFreezerToggle`, `RecipeStepsSection`, `NutritionBar`, `MicronutrientPanel`, `FoodSearchOverlay`, `IngredientRow`, `handleEditConfirm`, `relativeTime` helper, yield-factor logic, or any nutrition memos.

---

### 5. `src/components/inventory/CookDeductionReceipt.tsx` (MODIFIED — add leftover button)

**Analog:** itself — current file (64 lines).

**Full current file for before/after context:**

```tsx
// src/components/inventory/CookDeductionReceipt.tsx:1-63 (full file)
import { useEffect } from 'react'
import type { DeductionResult } from '../../hooks/useInventoryDeduct'

interface CookDeductionReceiptProps {
  mealName: string
  result: DeductionResult
  onClose: () => void
}

export function CookDeductionReceipt({ mealName, result, onClose }: CookDeductionReceiptProps) {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 8000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 mx-4 bg-surface border border-secondary rounded-[--radius-card] p-4 shadow-xl z-50">
      <p className="font-medium text-text mb-2">Cooked: {mealName}</p>
      {/* ... error + deductions + missing ... */}
      <div className="flex justify-end mt-2">
        <button
          onClick={onClose}
          className="bg-primary text-white px-4 py-2 rounded-[--radius-btn] text-sm"
        >
          Done
        </button>
      </div>
    </div>
  )
}
```

**Delta:**

1. Extend prop interface (line 4-8):
   ```typescript
   interface CookDeductionReceiptProps {
     mealName: string
     result: DeductionResult
     onClose: () => void
     onSaveLeftover?: () => void  // NEW — D-04, D-05
   }
   ```
2. Destructure `onSaveLeftover` in the function signature (line 10).
3. Modify the action row (lines 53-60) from `<div className="flex justify-end mt-2">` to `<div className="flex justify-end gap-2 mt-2">` and conditionally render the leftover button LEFT of Done:
   ```tsx
   {onSaveLeftover && (
     <button
       onClick={onSaveLeftover}
       className="bg-secondary border border-primary/30 text-primary px-4 py-2 rounded-[--radius-btn] text-sm"
     >
       Save leftover portion
     </button>
   )}
   <button
     onClick={onClose}
     className="bg-primary text-white px-4 py-2 rounded-[--radius-btn] text-sm"
   >
     Done
   </button>
   ```
4. Do NOT touch the auto-dismiss `useEffect` (Landmine 4 resolved via caller-side deferred-nav flag, not by modifying the receipt).

**Button styling analog:** The Done button's existing `bg-primary text-white px-4 py-2 rounded-[--radius-btn] text-sm` is the primary pastel-theme button pattern. For the secondary leftover button, mirror the `bg-secondary border border-primary/30 text-primary` convention used elsewhere in the theme (inverted emphasis). Verify against adjacent files (e.g., `RecipeBuilder.tsx` button patterns) if tightening is needed.

---

### 6. `tests/cookMode.test.tsx` (MODIFIED — append grep describe blocks)

**Analog:** itself — existing describe-block pattern at lines 9-23, 25-37, 39-72, 74-85, 87-97, 99-108, 111-122.

**Exemplar describe block to match — copy the structure verbatim from `tests/cookMode.test.tsx:9-23`:**

```typescript
// tests/cookMode.test.tsx:1-23
// Cook Mode: V-05 nav count, V-06 RLS isolation, V-07 regeneration scoping,
// V-08 JSONB merge, V-09 debounce, V-10 rate limit sharing
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')

describe('Cook Mode route registration', () => {
  const appSource = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8')

  it('registers /cook/:mealId route', () => {
    expect(appSource).toContain('path="/cook/:mealId"')
  })

  it('registers /cook/session/:sessionId route', () => {
    expect(appSource).toContain('path="/cook/session/:sessionId"')
  })

  it('registers /cook standalone route', () => {
    expect(appSource).toContain('path="/cook"')
  })
})
```

**Exemplar for import-level grep — copy from `tests/cookMode.test.tsx:87-97`:**

```typescript
// tests/cookMode.test.tsx:87-97
describe('JSONB concurrent write safety (V-08)', () => {
  it('useUpdateCookStep merges partial state into steps[stepId] using spread', () => {
    const hookSource = fs.readFileSync(path.join(ROOT, 'src/hooks/useCookSession.ts'), 'utf8')
    // Spread of existing steps plus merge of patch into the target step
    expect(hookSource).toContain('...currentState.steps')
    expect(hookSource).toContain('...existing, ...params.patch')
    // Optimistic update path also merges correctly
    expect(hookSource).toContain('onMutate')
    expect(hookSource).toContain('setQueryData')
  })
})
```

**Delta — append these new describe blocks at the end of the file:**

1. `describe('CookModePage wiring (Phase 26, INVT-05)', ...)` — read `src/pages/CookModePage.tsx`; assert `expect(source).toContain('useCookCompletion')`, `expect(source).toContain('CookDeductionReceipt')`, `expect(source).toContain('recipe_ids.length !== 1')` or the exact guard string, and `expect(source).toContain('AddInventoryItemModal')`.
2. `describe('RecipeBuilder uses shared hook (Phase 26, D-01)', ...)` — read `src/components/recipe/RecipeBuilder.tsx`; assert `expect(source).toContain('useCookCompletion')` AND `expect(source).not.toMatch(/spendLog\.mutate\(\s*\{/)` (no inline inline mutation call anymore) — choose the exact regex that matches the post-refactor shape.
3. `describe('CookDeductionReceipt leftover button (Phase 26, INVT-06)', ...)` — read `src/components/inventory/CookDeductionReceipt.tsx`; assert `expect(source).toContain('onSaveLeftover')` and `expect(source).toContain('Save leftover portion')`.
4. `describe('Status transition guard (Phase 26, D-16)', ...)` — read `src/pages/CookModePage.tsx`; assert `expect(source).toMatch(/activeSession.*status.*in_progress/)` or equivalent — use a string match that the executor's exact guard expression satisfies.

**Follow existing style:** single-line `it(...)` titles, use `expect(source).toContain(...)` or `expect(source).toMatch(regex)`, read files via `fs.readFileSync(path.join(ROOT, 'src/...'), 'utf8')`. No new imports beyond `fs`/`path`/vitest (already at top of file).

---

## Shared Patterns

### Shared Pattern A — Mutation Composition (spend → deduct, non-blocking)

**Source:** `src/components/recipe/RecipeBuilder.tsx:590-615`

**Apply to:** `src/hooks/useCookCompletion.ts` (primary), `src/pages/CookModePage.tsx` (call site), `src/components/recipe/RecipeBuilder.tsx` (refactor call site).

**Semantic rule:** Spend logs first. Deduct runs only after spend success (or the awaited resolution of `spendLog.mutateAsync`). Deduct failure is caught and does NOT roll back the spend. Preserve this order byte-for-byte — downstream `useWeeklySpend` consumers rely on the "spend persisted even if deduct fails" guarantee (D-12).

### Shared Pattern B — Hook Scoping via `useHousehold()` (inherited)

**Source:** `src/hooks/useInventoryDeduct.ts:14-17` + `src/hooks/useSpendLog.ts:8-12` + `src/hooks/useFoodPrices.ts:8-10`

**Apply to:** `src/hooks/useCookCompletion.ts` inherits household scoping transitively from `useCreateSpendLog` + `useInventoryDeduct`. Do NOT add a second `useHousehold()` call inside `useCookCompletion` — it would create redundant subscriptions. The composition hook is household-scoped automatically.

### Shared Pattern C — Query Invalidation via Prefix Arrays

**Source:** `src/hooks/useInventoryDeduct.ts:59-64` + `src/hooks/useSpendLog.ts:46-56`

```typescript
// src/hooks/useInventoryDeduct.ts:59-64
onSuccess: () => {
  const householdId = membership?.household_id
  if (householdId) {
    queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })
  }
},
```

```typescript
// src/hooks/useSpendLog.ts:46-56
onSuccess: (data) => {
  const householdId = membership?.household_id
  if (householdId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.weeklySpend.root(householdId, data.week_start),
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.spendLogs.byWeek(householdId, data.week_start),
    })
  }
},
```

**Apply to:** Do NOT add new invalidations in `useCookCompletion` or `CookModePage`. The wrapped mutations already invalidate `inventory`, `weeklySpend.root`, and `spendLogs.byWeek` (per research Landmine 7 — verified single-producer / single-consumer). Additional calls would be redundant.

### Shared Pattern D — Modal Local-State Trio

**Source:** `src/pages/InventoryPage.tsx:17-48, 142-147`

**Apply to:** `src/pages/CookModePage.tsx` (new `showLeftoverModal` state + render), `src/components/recipe/RecipeBuilder.tsx` (new `showLeftoverModal` state + render). Use three state slots: `showLeftoverModal`, `leftoverContext` (for CookModePage — not needed in RecipeBuilder since `recipe` is already in scope), `deductionResult`.

### Shared Pattern E — Receipt Overlay Rendering

**Source:** `src/components/recipe/RecipeBuilder.tsx:1001-1008`

**Apply to:** `src/pages/CookModePage.tsx`. Render `<CookDeductionReceipt>` as a top-level sibling of the main shell — NOT inside the shell's children, so it overlays via its own `position: fixed`. CookModePage's fragment at lines 361-368 (where `InAppTimerAlert` already renders adjacent to `CookModeShell`) is the exact slot.

### Shared Pattern F — Idempotency via Status Snapshot (NEW, no prior analog)

**Source:** No direct analog — this is the one pattern without a codebase precedent. Derive from D-16 + Landmine 3.

**Apply to:** `src/pages/CookModePage.tsx`. Read `activeSession?.status` SYNCHRONOUSLY before any `await`. Only run the `useCookCompletion` sequence when `status === 'in_progress'`. Re-entry to a `completed` session short-circuits to `navigate(-1)`. Do NOT add a ref-based guard or a DB column (D-16 rejects the marker-column approach).

```typescript
// Derived pattern — no existing analog, this is the new convention:
if (activeSession?.status === 'in_progress') {
  await completeSession.mutateAsync(activeSessionId)
  await runCookCompletionIfSingleRecipe()
  // receipt render drives navigation on dismiss
  return
}
navigate(-1)
```

---

## No Analog Found

None. Every new/modified file has a concrete, load-bearing analog in the codebase.

The one pattern without a codebase precedent is the **status-snapshot idempotency guard** (Shared Pattern F), which the planner/executor derives from CONTEXT D-16 + RESEARCH Landmine 3 rather than copying. This is intentional — it is a single conditional, not a subsystem, and inventing a convention file for it would be premature abstraction per `code-style.md`.

---

## Metadata

**Analog search scope:** `src/hooks/**`, `src/pages/**`, `src/components/recipe/**`, `src/components/inventory/**`, `src/components/cook/**`, `src/utils/**`, `src/lib/**`, `tests/**`.

**Files read during mapping:**
- `src/components/recipe/RecipeBuilder.tsx` (lines 1-40, 260-289, 570-629, 995-1014)
- `src/pages/CookModePage.tsx` (lines 1-90, 160-229, 355-470)
- `src/hooks/useInventoryDeduct.ts` (full — 67 lines)
- `src/hooks/useSpendLog.ts` (full — 59 lines)
- `src/hooks/useFoodPrices.ts` (full — 92 lines)
- `src/components/inventory/CookDeductionReceipt.tsx` (full — 63 lines)
- `src/components/inventory/AddInventoryItemModal.tsx` (lines 1-60)
- `src/pages/InventoryPage.tsx` (lines 1-50, 135-154)
- `tests/cookSession.test.tsx` (full — 79 lines)
- `tests/cookMode.test.tsx` (full — 122 lines)
- `.planning/phases/26-.../26-CONTEXT.md` (full)
- `.planning/phases/26-.../26-RESEARCH.md` (full)
- `CLAUDE.md` (full)

**Pattern extraction date:** 2026-04-19

## PATTERN MAPPING COMPLETE
