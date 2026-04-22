# Phase 28: Resolve Prep Sequence Edge Function Orphans - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 5 (3 new + 2 modified)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/useGenerateCookSequence.ts` (NEW) | hook (TanStack mutation over edge function) | request-response | `src/hooks/useRecipeSteps.ts` (`useRegenerateRecipeSteps`) | exact |
| `src/hooks/useGenerateReheatSequence.ts` (NEW) | hook (TanStack mutation over edge function) | request-response | `src/hooks/useImportRecipe.ts` | exact |
| `src/components/cook/CookSequenceLoadingOverlay.tsx` (NEW) | component (full-screen pending overlay) | render-only | `src/components/cook/MultiMealPromptOverlay.tsx` (structure) + `src/components/plan/GeneratePlanButton.tsx:34-48` (spinner) | exact-composite |
| `src/pages/CookModePage.tsx` (MODIFIED) | page (router-driven flowMode state machine) | orchestration | self (extend existing branches at lines 360, 393, 273) | self-analog |
| `REQUIREMENTS.md` (MODIFIED) | docs (traceability matrix) | doc-update | line 320 PREP-02 row | self-analog |

## Pattern Assignments

### `src/hooks/useGenerateCookSequence.ts` (hook, request-response mutation)

**Primary analog:** `src/hooks/useRecipeSteps.ts` (the `useRegenerateRecipeSteps` export, lines 84-118)
**Secondary analog:** `src/hooks/useImportRecipe.ts` (same shape, simpler return type)

**Imports pattern** (`src/hooks/useRecipeSteps.ts:1-7`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
```
For the new hook, drop `useQuery` (mutation-only) and `queryKeys` is optional — no matching cache key exists yet; on success we invalidate `['cook-session', ...]` via prefix.

**Household + auth guard** (`src/hooks/useRecipeSteps.ts:85-93`):
```typescript
const queryClient = useQueryClient()
const { session } = useAuth()
const { data: membership } = useHousehold()
const householdId = membership?.household_id

return useMutation({
  mutationFn: async (params: RegenerateParams): Promise<RegenerateResponse> => {
    if (!session) throw new Error('Not authenticated')
    if (!householdId) throw new Error('No household found')
```

**Edge-function invoke + success-flag throw** (`src/hooks/useRecipeSteps.ts:94-110`):
```typescript
const { data, error } = await supabase.functions.invoke('generate-recipe-steps', {
  body: {
    recipeId: params.recipeId,
    householdId,
    recipeName: params.recipeName,
    servings: params.servings,
    ingredientsSnapshot: params.ingredientsSnapshot,
    existingSteps: params.existingSteps,
    notes: params.notes,
  },
})
if (error) throw error
const response = data as RegenerateResponse
if (!response.success) {
  throw new Error(response.error ?? 'Step regeneration failed')
}
return response
```

**onSuccess invalidation (prefix-array)** (`src/hooks/useRecipeSteps.ts:112-116`):
```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.recipeSteps.detail(variables.recipeId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(variables.recipeId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) })
},
```
For `useGenerateCookSequence` the analogous invalidation is `queryKeys.cookSession.detail(variables.cookSessionId)` and `queryKeys.cookSession.active(householdId)` — both already exist in `src/lib/queryKeys.ts:104-112`.

**Target hook shape (derived for planner — copy verbatim intent):**
```typescript
interface CookSequenceParams {
  cookSessionId: string
  recipeIds: string[]
  mode: 'combined' | 'per-recipe'
  memberIds: string[]
}
interface SequenceItem {
  step_id: string
  recipe_id: string
  owner_member_id: string | null
}
interface CookSequenceResponse {
  success: boolean
  sequence?: SequenceItem[]
  equipment_conflicts?: string[]
  total_duration_minutes?: number
  error?: string
}
```
Edge function name string: `'generate-cook-sequence'` (matches `supabase/functions/generate-cook-sequence/index.ts`).
Request body omits `householdId` from caller-supplied params — hook injects it from `useHousehold()` per `useRecipeSteps.ts:96-97`. **But** the edge function signature at `supabase/functions/generate-cook-sequence/index.ts:30-36` declares `{cookSessionId, householdId, recipeIds, mode, memberIds}` — all required; the hook populates `householdId` from context.

---

### `src/hooks/useGenerateReheatSequence.ts` (hook, request-response mutation)

**Primary analog:** `src/hooks/useImportRecipe.ts` (exact same template — simpler return than `useRegenerateRecipeSteps`)

**Full analog body** (`src/hooks/useImportRecipe.ts:17-43` — the canonical short mutation):
```typescript
export function useImportRecipe() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useMutation({
    mutationFn: async ({ input }: { input: string }): Promise<string> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase.functions.invoke('import-recipe', {
        body: { input },
      })
      if (error) throw error

      const response = data as ImportRecipeResponse
      if (!response.success || !response.recipeId) {
        throw new Error(response.error ?? 'Import failed')
      }
      return response.recipeId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
```

**Target hook shape (derived for planner):**
```typescript
interface ReheatSequenceParams {
  recipeId: string
  storageHint: 'fridge' | 'freezer'
  servings?: number
}
interface ReheatStepFromEdge {
  text: string
  duration_minutes: number
  is_active: boolean
  ingredients_used: string[]
  equipment: string[]
}
interface ReheatSequenceResponse {
  success: boolean
  steps?: ReheatStepFromEdge[]
  error?: string
}
```
Edge function name string: `'generate-reheat-sequence'` (matches `supabase/functions/generate-reheat-sequence/index.ts`).
Body injects `householdId` from context (same as `useImportRecipe`'s implicit pattern — not in caller params).
No `onSuccess` invalidation needed: the reheat response is ephemeral UI data, not cached server state. Omit `queryClient` or keep it and leave `onSuccess` empty — matches the fact that `useImportRecipe.ts:39-41` only invalidates because the server row it creates is cached elsewhere; the reheat response has no analogous cached consumer.

---

### `src/components/cook/CookSequenceLoadingOverlay.tsx` (component, render-only full-screen overlay)

**Primary structural analog:** `src/components/cook/MultiMealPromptOverlay.tsx` (same backdrop + panel recipe)
**Spinner SVG analog:** `src/components/plan/GeneratePlanButton.tsx:34-48` (scaled 3× to 48px)
**Pending-discipline analog:** `src/components/recipe/ImportRecipeModal.tsx:24-32, 52-56` (no dismissal while loading)

**Backdrop + container pattern** (`src/components/cook/MultiMealPromptOverlay.tsx:18-20`):
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
  <div className="max-w-sm w-full bg-surface rounded-2xl shadow-xl p-6 flex flex-col gap-4">
```
**Adaptations required by UI-SPEC lines 140-141:** add `items-center text-center` to the inner panel div (UI-SPEC: "mirrors prompt panel exactly except: `items-center text-center`"). Keep `z-50`, `bg-black/40 backdrop-blur-sm`, `max-w-sm w-full bg-surface rounded-2xl shadow-xl p-6` verbatim.

**Spinner SVG pattern** (`src/components/plan/GeneratePlanButton.tsx:34-48`):
```tsx
<svg
  width="16"
  height="16"
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  className="animate-spin shrink-0"
  aria-hidden="true"
>
  <circle cx="8" cy="8" r="6" strokeOpacity="0.3" />
  <path d="M8 2a6 6 0 0 1 6 6" strokeLinecap="round" />
</svg>
```
**Scaling per UI-SPEC line 142:** change `width`/`height` to `48` and `className` to include `h-12 w-12 text-primary animate-spin shrink-0`. Preserve the two-segment circle (`strokeOpacity="0.3"` base + 1/4 stroke overlay) — UI-SPEC calls out this exact pattern as the spinner geometry.

**Pending-state a11y attributes** (from `GeneratePlanButton.tsx:30-31` + UI-SPEC lines 156-161):
```tsx
role="status"
aria-busy="true"
aria-live="polite"
aria-label="Planning your cook session"
tabIndex={-1}
```
Attach to the inner panel div. Spinner SVG carries `aria-hidden="true"` (matches `GeneratePlanButton.tsx:43`).

**What this component MUST NOT have (from UI-SPEC lines 147-151 + 302):**
- No `onClose` prop
- No `onClick` on the backdrop div
- No `onKeyDown` / Escape handler
- No close button anywhere
- No `isOpen` prop — parent controls mount/unmount via `isPending` flag (UI-SPEC line 134)

**Copy (UI-SPEC lines 257-259, LOCKED — do not paraphrase):**
- Headline: `Planning your cook session…` (U+2026 ellipsis, NOT three ASCII periods)
- Sub-line: `This usually takes a few seconds.`
- `aria-label`: `Planning your cook session` (no ellipsis)

**Target component signature (derived for planner — no props):**
```typescript
export function CookSequenceLoadingOverlay() { ... }
```
UI-SPEC line 134: "Mounted when: `useGenerateCookSequence.isPending === true`" — parent decides mount, component takes no props.

---

### `src/pages/CookModePage.tsx` (MODIFIED — three existing branches wire the new mutations)

**Self-analog** — extend existing state machine at `src/pages/CookModePage.tsx` lines 29, 273, 360, 393.

#### Wire-in point 1: hook declarations near existing mutation list (around line 67-69)

**Existing pattern** (`src/pages/CookModePage.tsx:67-69`):
```typescript
const createSession = useCreateCookSession()
const updateStep = useUpdateCookStep()
const completeSession = useCompleteCookSession()
```
**Add two new lines** in the same block, preserving existing three (L-020 / L-027 anti-regression):
```typescript
const generateCookSequence = useGenerateCookSequence()
const generateReheatSequence = useGenerateReheatSequence()
```
Import additions at top of file (line 4-11 area):
```typescript
import { useGenerateCookSequence } from '../hooks/useGenerateCookSequence'
import { useGenerateReheatSequence } from '../hooks/useGenerateReheatSequence'
import { CookSequenceLoadingOverlay } from '../components/cook/CookSequenceLoadingOverlay'
```

#### Wire-in point 2: `handleStartCook` (line 273-291) — invoke cook-sequence

**Existing function** (`src/pages/CookModePage.tsx:273-291`):
```typescript
async function handleStartCook(mode: 'combined' | 'per-recipe' | null) {
  if (!mealId) return
  const isFromRecipe = source === 'recipe'
  const recipeId = isFromRecipe ? mealId : (recipeIdForSteps ?? null)
  const recipeIds = recipeId ? [recipeId] : []
  const stepsByRecipeId: Record<string, RecipeStep[]> = {}
  if (recipeId && liveSteps.length > 0) {
    stepsByRecipeId[recipeId] = liveSteps
  }
  const newSession = await createSession.mutateAsync({
    meal_id: isFromRecipe ? null : mealId,
    recipe_id: recipeIds[0] ?? null,
    recipe_ids: recipeIds,
    stepsByRecipeId,
    mode,
  })
  setActiveSessionId(newSession.id)
  setFlowMode('cook')
}
```

**Graceful fallback shape** (from D-05 and UI-SPEC lines 196-208) — pseudocode the planner writes verbatim:
```typescript
// After newSession is created and mode !== null (combined / per-recipe path):
if (mode !== null && recipeIds.length > 1) {
  try {
    await generateCookSequence.mutateAsync({
      cookSessionId: newSession.id,
      recipeIds,
      mode,
      memberIds: [], // or household member ids from useHouseholdMembers
    })
    // On success: AI sequence is persisted/returned; transition as today
  } catch (err) {
    console.error('[Phase 28] generate-cook-sequence failed', err)
    // D-05 silent fall-through: per-recipe concatenation already matches createSession's default step_state.order
  }
}
setActiveSessionId(newSession.id)
setFlowMode('cook')
```
**D-05 fallback is "no action needed"** — `useCreateCookSession.mutateAsync` already constructs `step_state.order` as naive per-recipe concatenation at `src/hooks/useCookSession.ts:131-144`. On AI failure, the cook session already has a working step order; silent fall-through simply does NOT overwrite it.

#### Wire-in point 3: `flowMode === 'multi-meal-prompt'` branch (lines 393-404) — render loading overlay during pending

**Existing branch** (`src/pages/CookModePage.tsx:393-404`):
```tsx
if (flowMode === 'multi-meal-prompt') {
  return (
    <>
      <div className="min-h-screen bg-background" />
      <MultiMealPromptOverlay
        recipeCount={2}
        onCombined={() => handleStartCook('combined')}
        onPerRecipe={() => handleStartCook('per-recipe')}
      />
    </>
  )
}
```

**Wire-in per UI-SPEC lines 196-208:**
```tsx
if (flowMode === 'multi-meal-prompt') {
  return (
    <>
      <div className="min-h-screen bg-background" />
      <MultiMealPromptOverlay
        recipeCount={2}
        onCombined={() => handleStartCook('combined')}
        onPerRecipe={() => handleStartCook('per-recipe')}
      />
      {generateCookSequence.isPending && <CookSequenceLoadingOverlay />}
    </>
  )
}
```
UI-SPEC line 140: "if both render simultaneously due to a transient state, the loading overlay sits at the same z-50 and natural DOM order puts it above" — so rendering both is safe; the overlay-after-prompt order handles stacking.

#### Wire-in point 4: `flowMode === 'reheat'` branch (lines 360-390) — three-state pending/success/error render

**Existing branch** (`src/pages/CookModePage.tsx:360-390` — full block preserved below so the planner does not accidentally drop the sticky top bar or `navigate(-1)` exit button; L-020 concern):
```tsx
if (flowMode === 'reheat') {
  const reheatSteps = liveSteps.length > 0
    ? liveSteps.map(s => ({ id: s.id, text: s.text }))
    : [
        { id: 'reheat-1', text: 'Remove from storage and place in a microwave-safe container.' },
        { id: 'reheat-2', text: 'Heat on medium power, stirring halfway through.' },
        { id: 'reheat-3', text: 'Check temperature is hot throughout before serving.' },
      ]

  const storage = (recipeStepsData?.freezer_friendly) ? 'freezer' : 'fridge'

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <div className="sticky top-0 z-40 bg-surface border-b border-accent/20 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Exit cook mode" className="p-1 -ml-1 text-text/60 hover:text-text transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-text">Reheat</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <ReheatSequenceCard
          storage={storage}
          steps={reheatSteps}
          onDone={() => navigate(-1)}
        />
      </div>
    </div>
  )
}
```

**Wire-in per UI-SPEC lines 172-192:**
1. **Mutation auto-fire on branch entry** — use `useEffect` keyed on `flowMode === 'reheat'` + `recipeIdForSteps`. Pattern matches the existing `useEffect` at lines 85-117 that mirrors `flowMode` decisions.
2. **Three states in the branch body:**
   - `generateReheatSequence.isPending` → render skeleton (new `ReheatSkeletonCard` — UI-SPEC lines 184-190)
   - `generateReheatSequence.isSuccess` → render `ReheatSequenceCard` with `steps` mapped from AI response: `aiSteps.map((s, idx) => ({ id: \`reheat-ai-${idx}\`, text: s.text }))` (UI-SPEC line 181)
   - `generateReheatSequence.isError` OR no call yet → render `ReheatSequenceCard` with the existing hardcoded 3-step fallback array (UI-SPEC line 182)

**D-02 fallback gate (critical — anti-regression grep-guard 4 at UI-SPEC line 298):** the hardcoded `reheat-1/2/3` array MUST be inside an `isError` / fallback-comment guarded branch, not a bare fallthrough. Suggested shape:
```typescript
const HARDCODED_REHEAT_FALLBACK = [/* the 3 existing entries */]
// ...
const aiSteps = generateReheatSequence.isSuccess && generateReheatSequence.data?.steps
  ? generateReheatSequence.data.steps.map((s, idx) => ({ id: `reheat-ai-${idx}`, text: s.text }))
  : null
const reheatSteps = aiSteps ?? (generateReheatSequence.isError ? HARDCODED_REHEAT_FALLBACK : /* liveSteps preferred pre-fetch */ HARDCODED_REHEAT_FALLBACK)
```
Either pattern satisfies the grep-guard: `grep -B3 "reheat-1" CookModePage.tsx | grep -cE "(isError|catch|fallback)"` must return ≥ 1.

**Skeleton card shape (UI-SPEC lines 184-190, inline JSX or co-located helper — planner's discretion):**
```tsx
<div
  role="status"
  aria-busy="true"
  aria-label="Loading reheat instructions"
  className="bg-surface rounded-[--radius-card] px-4 py-4 flex flex-col gap-4"
>
  <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
  {[0, 1, 2].map(i => (
    <div key={i} className="flex items-start gap-3">
      <div className="w-5 h-5 rounded border border-accent/40 bg-background" />
      <div className="h-4 flex-1 bg-secondary rounded animate-pulse" />
    </div>
  ))}
</div>
```

**Silent fall-through discipline** (UI-SPEC lines 210-229 + anti-regression grep-guard 7): NO `toast`, NO `role="alert"`, NO `text-red-*`, NO `aria-live="assertive"`. Only `console.error(...)` for dev diagnosis.

---

### `REQUIREMENTS.md` (MODIFIED — one-line traceability row update)

**Self-analog** — line 320 of `.planning/REQUIREMENTS.md`.

**Existing row:**
```
| PREP-02 | Phase 23, Phase 28 (gap closure) | Pending |
```

**CONTEXT.md D-06 + "Specific Ideas" prescribes:** change `Phase 28 (gap closure)` to `Phase 28 (wire-in)` and mark status `Validated` after Phase 28 ships. Planner updates the label only; status flip is a post-ship verification-agent task.

**Target row after Phase 28 plans ship (label update only during planning):**
```
| PREP-02 | Phase 23, Phase 28 (wire-in) | Pending |
```

**Post-validation row (after `28-VERIFICATION.md` passes):**
```
| PREP-02 | Phase 23, Phase 28 (wire-in) | Validated |
```

**Note:** the current row already reads `Phase 28 (gap closure)` in the source file (`REQUIREMENTS.md:320`) — the Phase 28 edit flips `(gap closure)` → `(wire-in)` per CONTEXT.md "Specific Ideas" line 128. This is a one-token substitution on a single line.

---

## Shared Patterns

### Edge-Function Consumer Hook (cross-cutting)

**Source:** `src/hooks/useImportRecipe.ts:17-43` and `src/hooks/useRecipeSteps.ts:84-118`
**Apply to:** Both new hooks (`useGenerateCookSequence`, `useGenerateReheatSequence`)

Canonical shape, extracted across both analogs:
```typescript
export function useXyz() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useMutation({
    mutationFn: async (params: Params): Promise<Response> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')
      const { data, error } = await supabase.functions.invoke('<function-name>', {
        body: { /* spread params + householdId */ },
      })
      if (error) throw error
      const response = data as Response
      if (!response.success) throw new Error(response.error ?? '<fallback message>')
      return response
    },
    onSuccess: () => {
      // Prefix-array invalidation for any affected cache keys
    },
  })
}
```

### Full-Screen Cook-Mode Overlay

**Source:** `src/components/cook/MultiMealPromptOverlay.tsx:19-20` and `src/components/cook/CookModeShell.tsx:106-107`
**Apply to:** `CookSequenceLoadingOverlay.tsx`

Two verbatim confirmations of the backdrop + panel recipe:
```tsx
// MultiMealPromptOverlay:19-20
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
  <div className="max-w-sm w-full bg-surface rounded-2xl shadow-xl p-6 flex flex-col gap-4">

// CookModeShell:106-107 (exit-confirm overlay)
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
  <div className="max-w-sm w-full bg-surface rounded-2xl shadow-xl p-6 flex flex-col gap-4">
```
Identical class strings — this is the locked cook-mode overlay vocabulary.

### Pending-Window Discipline

**Source:** `src/components/recipe/ImportRecipeModal.tsx:28, 54`
**Apply to:** `CookSequenceLoadingOverlay.tsx` + both mutation call sites

Escape gated on `isPending`:
```typescript
if (e.key === 'Escape' && !isPending) onClose()
```
Backdrop click gated on `isPending`:
```tsx
onClick={isPending ? undefined : onClose}
```
For Phase 28 the overlay takes this one step further — `onClose` does not exist at all (D-04 permanent lockout until mutation resolves), so the pattern simplifies to "no handlers, no dismiss surface."

### Inline Spinner SVG

**Source:** `src/components/plan/GeneratePlanButton.tsx:34-48`
**Apply to:** `CookSequenceLoadingOverlay.tsx` (scaled to 48px), and potentially the reheat skeleton (though UI-SPEC line 187 uses `animate-pulse` blocks instead of a spinner SVG — skeleton ≠ spinner here)

Two-segment circle pattern (base ring at 30% opacity, 1/4 stroke at full opacity, `animate-spin`):
```tsx
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin shrink-0" aria-hidden="true">
  <circle cx="8" cy="8" r="6" strokeOpacity="0.3" />
  <path d="M8 2a6 6 0 0 1 6 6" strokeLinecap="round" />
</svg>
```

### Edge-Function Deployment (out-of-code shared pattern, D-07 + L-025)

**Source:** `lessons.md` L-025 (lines 187-195)
**Apply to:** Deployment step of Phase 28 plan (verification step, not code)

Command:
```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy generate-cook-sequence --no-verify-jwt
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy generate-reheat-sequence --no-verify-jwt
```
Both edge functions do their own `adminClient.auth.getUser(token)` inside the handler (confirmed at `supabase/functions/generate-reheat-sequence/index.ts:90-100`), so `--no-verify-jwt` is required — the ES256/HS256 runtime mismatch described in L-025 applies.

## No Analog Found

All five files have strong codebase analogs. No files require planner to fall back to RESEARCH.md patterns — every pattern in this phase is already established in `src/hooks/`, `src/components/cook/`, `src/components/recipe/`, or `src/components/plan/`.

## L-020 / L-027 Anti-Regression Preservation List

Per lessons L-020 and L-027 and UI-SPEC Anti-Regression Contract section (lines 291-304), the following `src/pages/CookModePage.tsx` features MUST be preserved verbatim by any executor modifying the file:

1. **All existing `FlowMode` union members** (`src/pages/CookModePage.tsx:29`): `'loading' | 'resume-prompt' | 'multi-meal-prompt' | 'reheat' | 'cook' | 'error'` — do not add a new `'generating-sequence'` mode (UI-SPEC chose pending-flag rendering inside existing branches; no new mode).
2. **The `useEffect` at lines 85-117** routing `flowMode` based on `scheduleStatus` + `routeSession`/`existingSession`.
3. **`handleTimerComplete`** and the timer `useEffect` (lines 144-173).
4. **`runCookCompletionIfSingleRecipe`** (lines 240-271) including the `[CookMode] Combined cook session ... Phase 28's scope` dev-only `console.warn` at lines 243-247 — note: this log line specifically calls out Phase 28; keep it.
5. **The `flowMode === 'resume-prompt'` branch** (lines 324-357).
6. **All `stepOrder.map(...)` rendering** in the main `flowMode === 'cook'` branch (lines 458-519).
7. **Both `CookDeductionReceipt` and `AddInventoryItemModal` mounts** at the bottom (lines 522-544).
8. **Every existing import** (lines 1-26) — planner adds three new imports (`useGenerateCookSequence`, `useGenerateReheatSequence`, `CookSequenceLoadingOverlay`) without removing any existing import. The L-020 failure mode is import-stripping; the executor must use `Edit` tool, not `Write`.

For the executor: `CookModePage.tsx` is 547 lines — L-027 rule applies ("use Edit tool, never Write tool for any file >200 lines"). This is a high-risk file modified by Phase 21, 22, 23, 24, 25+ — at least 5 prior phases touched it.

## Metadata

**Analog search scope:**
- `src/hooks/` (hook patterns, 22 files scanned via Grep)
- `src/components/cook/` (overlay + card analogs)
- `src/components/recipe/` (pending-modal discipline)
- `src/components/plan/` (spinner SVG)
- `supabase/functions/generate-cook-sequence/` + `generate-reheat-sequence/` (request/response shapes)
- `src/lib/queryKeys.ts` (cache-key registry)

**Files scanned:** ~30 (hook analogs + all files in `src/components/cook/` + UI-SPEC reference files)
**Pattern extraction date:** 2026-04-22
