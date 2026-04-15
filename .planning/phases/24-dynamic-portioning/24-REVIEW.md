---
phase: 24-dynamic-portioning
reviewed: 2026-04-15T17:30:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/components/plan/RecipeMixPanel.tsx
  - tests/RecipeMixPanel.test.tsx
  - src/components/plan/PlanGrid.tsx
  - supabase/functions/generate-plan/index.ts
findings:
  blocking: 1
  high: 1
  medium: 2
  low: 2
  info: 2
  total: 8
status: blocking
---

# Phase 24: Code Review Report

**Reviewed:** 2026-04-15T17:30:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** blocking

## Summary

Phase 24 ships a clean `RecipeMixPanel` component and a well-preserved edge function, but the end-to-end wiring is broken: **the entire Phase 24 feature does not work at runtime, and the repo does not type-check**.

The executor for Plan 24-01 wired `PlanGrid.handleGenerate` to send `recipeMix` into `generatePlan.mutateAsync(...)`, but never updated `src/hooks/usePlanGeneration.ts` (which was explicitly listed in RESEARCH §Architecture as unchanged). The hook's mutation params type and its request body construction both ignore `recipeMix`. Result:

1. `npx tsc -b` fails at `src/components/plan/PlanGrid.tsx(231,9)` — the Phase 24 diff introduces a new TypeScript compile error.
2. At runtime the `recipeMix` field is silently stripped at the hook boundary, so `body.recipeMix` on the edge function is always `undefined`, `normalizeRecipeMix` returns `{50,30,20}` defaults every time, and the user's slider changes do nothing.

The L-020 preservation list is fully intact in `supabase/functions/generate-plan/index.ts` (all 14 named symbols accounted for). The `normalizeRecipeMix` function has a residual rounding bug (can produce `novel: -1` on certain fractional inputs), and `useSuggestAlternative` never forwards `recipeMix` either, but both are downstream of the main wiring gap.

The unit-test suite for `RecipeMixPanel` is solid — 8 tests exercise render, expansion, defaults, hydration, malformed-fallback, auto-rebalance, persistence, and the `getRecipeMix` getter. They all pass locally.

## Blocking Issues

### BL-01: `recipeMix` is dropped at `useGeneratePlan` — feature is non-functional + TypeScript build is broken

**Files:**
- `src/components/plan/PlanGrid.tsx:231`
- `src/hooks/usePlanGeneration.ts:13-21` (not modified in Phase 24)

**Issue:** `PlanGrid.handleGenerate` calls `generatePlan.mutateAsync({ planId, weekStart, priorityOrder, recipeMix: ... })`, but `useGeneratePlan` was never extended to accept or forward `recipeMix`:

```typescript
// src/hooks/usePlanGeneration.ts:13-21 — UNCHANGED from pre-phase-24
mutationFn: async (params: { planId: string; weekStart: string; priorityOrder: string[] }) => {
  const { data, error } = await supabase.functions.invoke('generate-plan', {
    body: {
      householdId,
      planId: params.planId,
      weekStart: params.weekStart,
      priorityOrder: params.priorityOrder,
      // recipeMix never added
    },
  })
  ...
}
```

Two downstream consequences:

1. **TypeScript build fails.** `npx tsc -b --noEmit` reports:
   ```
   src/components/plan/PlanGrid.tsx(231,9): error TS2353: Object literal may only specify
   known properties, and 'recipeMix' does not exist in type
   '{ planId: string; weekStart: string; priorityOrder: string[]; }'.
   ```
   This error was confirmed to be introduced by phase-24 commit `d75baf4`. Other tsc errors in the tree are pre-existing.

2. **Runtime: the edge function never receives the slider values.** The body sent to `generate-plan` has no `recipeMix` field, so `normalizeRecipeMix(undefined)` returns the defaults `{50, 30, 20}` every time. The entire Phase 24 user-facing story (the panel, the rebalance math, the localStorage persistence, the tier-quota enforcement in the AI prompt) runs on defaults regardless of what the user does.

The phase's Plan 24-01 PATTERNS.md and RESEARCH.md both omitted the step to update `usePlanGeneration.ts`. The Self-Check section of `24-01-SUMMARY.md` confirms the author verified the mutation field at `PlanGrid.tsx` but never confirmed it round-trips through the hook to the edge function — a missing grep assertion that would have caught this immediately.

**Fix:** Extend the hook to accept and forward `recipeMix`:

```typescript
// src/hooks/usePlanGeneration.ts
import type { RecipeMix } from '../components/plan/RecipeMixPanel'

return useMutation({
  mutationFn: async (params: {
    planId: string
    weekStart: string
    priorityOrder: string[]
    recipeMix?: RecipeMix
  }) => {
    const { data, error } = await supabase.functions.invoke('generate-plan', {
      body: {
        householdId,
        planId: params.planId,
        weekStart: params.weekStart,
        priorityOrder: params.priorityOrder,
        recipeMix: params.recipeMix,
      },
    })
    if (error) throw error
    if (!data?.success) throw new Error(data?.error || 'Generation failed')
    return data as { success: true; jobId: string }
  },
  ...
})
```

After fixing, re-run `npx tsc -b` (phase-24-introduced error should disappear) and UAT the Generate Plan flow with Network tab open — the request body must contain `recipeMix: {favorites, liked, novel}`.

---

## High Issues

### HI-01: `normalizeRecipeMix` can emit `novel: -1` on fractional inputs

**File:** `supabase/functions/generate-plan/index.ts:115-128`

**Issue:** The normalization applies `Math.round` independently to `favorites` and `liked`, then computes `novel = 100 - favorites - liked`. If both roundings go UP, `novel` goes negative. Verified empirically:

```
normalizeRecipeMix({favorites: 99.5, liked: 0.5, novel: 0})
// => {favorites: 100, liked: 1, novel: -1}

normalizeRecipeMix({favorites: 0.5, liked: 99.5, novel: 0})
// => {favorites: 1, liked: 100, novel: -1}
```

The client slider uses `step="5"` and the `RecipeMixPanel` rebalancer never emits fractional values, so this doesn't fire under normal operation. However, the entire point of server-side normalization per the threat model (T-24-05, `<threat_model>` in 24-02-PLAN) is to defend against tampered/corrupt inputs coming from any client — a negative tier percentage in the AI prompt is a defect-in-defense.

**Fix:** Clamp after distribution:

```typescript
const favorites = Math.round((f / total) * 100);
const liked = Math.round((l / total) * 100);
let novel = 100 - favorites - liked;
if (novel < 0) {
  // Steal from whichever rounded-up component is larger
  if (favorites >= liked) {
    return { favorites: favorites + novel, liked, novel: 0 };
  }
  return { favorites, liked: liked + novel, novel: 0 };
}
return { favorites, liked, novel };
```

Or simply clamp all three to `[0,100]` and re-normalize once — whatever matches project convention. The key property: no returned field may be negative.

---

## Medium Issues

### ME-01: `useSuggestAlternative` does not forward `recipeMix`, so per-slot re-rolls ignore the setting

**File:** `src/hooks/usePlanGeneration.ts:78-108` (not modified in Phase 24)

**Issue:** `PlanGrid` wires `onSuggestAlternative` to `suggestAlternative.mutate({...})` (line 540). That hook fires the same `generate-plan` edge function with `singleSlot`, but never sends `recipeMix`. Swapping a single slot will ignore the user's tier preferences.

This is arguably less severe than BL-01 because `useSuggestAlternative` was outside Phase 24's documented scope, and the edge function will apply defaults. But the feature is incomplete — the intent of "user controls recipe mix" does not extend to the per-slot alternate-suggestion flow.

**Fix:** Add `recipeMix?: RecipeMix` to `useSuggestAlternative`'s params and forward it in the body. Update `PlanGrid`'s `onSuggestAlternative` call at line 540 to pass `getRecipeMix(householdId)`.

### ME-02: Test suite does not assert `recipeMix` is forwarded to the hook / edge function

**File:** `tests/RecipeMixPanel.test.tsx` (all 8 tests)

**Issue:** The tests exhaustively verify the panel's internal behavior (render, rebalance, persistence, `getRecipeMix` getter) but never verify the integration contract — that `PlanGrid` actually forwards the stored mix into the generate-plan request. This gap is exactly what allowed BL-01 to ship: no test fails if the hook drops the field.

**Fix:** Add an integration test that stubs `supabase.functions.invoke`, renders `PlanGrid`, sets slider values, clicks Generate Plan, and asserts the invoke body includes the expected `recipeMix` object. Pattern: the existing `PlanGrid.nutritionGap.test.tsx` already mocks `supabase.functions.invoke`.

---

## Low Issues

### LO-01: `showSaved` timer is not cleaned up on unmount

**File:** `src/components/plan/RecipeMixPanel.tsx:94-95`

**Issue:** Each slider change calls `setTimeout(() => setShowSaved(false), 1500)`. If the component unmounts within 1.5s of a change, React will warn `Can't perform a state update on an unmounted component`. Low probability (user would have to navigate away mid-slider-drag) but not zero, and matches the pattern in `PriorityOrderPanel.tsx:108` which has the same minor issue — so this is consistent with existing convention, not a regression. Flagging for future cleanup if a similar warning ever appears.

**Fix:** Track the latest timeout ID in a `useRef` and clear it in a cleanup effect, or convert `showSaved` to a time-based derivation. Not urgent — defer unless it surfaces in practice.

### LO-02: `tier_hint` heuristic treats any cooked-but-unrated recipe as `"liked"`

**File:** `supabase/functions/generate-plan/index.ts:470-474`

**Issue:** The tier heuristic is:

```typescript
if (cookCount === 0) tierHint = "novel";
else if (avgRating !== null && avgRating >= 4) tierHint = "favorite";
else tierHint = "liked";
```

A recipe cooked many times but never rated, or cooked and rated 1-2 stars, will be tagged `"liked"` — inflating the liked pool and working against the user's intent. D-14 says "low ratings are a signal to deprioritize"; giving them the same `tier_hint` label as legitimately liked recipes (3-4 stars) means the AI prompt has to do extra work to distinguish them.

This matches the plan's explicit comment "cooked but unrated or low-rated → liked by default" (24-02-PLAN Edit H), so it's intentional — but the AI's tier-quota enforcement becomes noisier as a result.

**Fix (optional):** Introduce a fourth hint `"deprioritized"` for `avgRating !== null && avgRating < 3`, and exclude those from the liked count when the AI computes quotas. Or pass raw `avg_rating` to Pass 1 so the AI can distinguish. Not a bug, but an accuracy improvement.

---

## Info

### IN-01: `recipeMix` destructure mixes body types

**File:** `supabase/functions/generate-plan/index.ts:137-138`

The destructure reads `body.recipeMix` via `normalizeRecipeMix(body.recipeMix)` rather than via the destructure. This is consistent with the defensive approach (don't trust the type) and matches the rest of the function's pattern. No change needed — noting for future readers.

### IN-02: Per-member ratings are sent to AI by UUID key with no name mapping

**File:** `supabase/functions/generate-plan/index.ts:476-480, 489`

The `member_ratings` map has UUID keys (`coalesce(rated_by_user_id, rated_by_member_profile_id)`). These keys are never resolved to display names before being sent to the AI, so when the AI generates rationale like `"Novel — similar to your top-rated X"`, it cannot reference "Alice liked this" by name. Acceptable for Phase 24 scope (the AI prompt doesn't require names, and Plan 24-02 §T-24-09 explicitly calls out "only memberKey UUID sent, never display names"). Noting for future phases that want personalized rationale text.

---

## What Was Checked

- L-020 preservation list in `supabase/functions/generate-plan/index.ts` — **all 14 symbols present** (`WALL_CLOCK_BUDGET_MS`, `hasTimeLeft`, `pass2Completed`, `validIds` (6 occurrences), `DEFAULT_SLOT_NAMES`, `capitalize` (9 occurrences), `sanitizeString` (8 occurrences), `created_by`, `mealIdByRecipeId`, `droppedAssignments`, `skippedSlots`, `reusedFills`, `onConflict`, `CORS_HEADERS`, `priorityOrder` still threaded through all 3 prompt passes).
- RLS scoping on new queries — **clean**: both `spend_logs` and `food_prices` queries chain `.eq("household_id", householdId)` before execution. `spend_logs` also filters `.not("recipe_id", "is", null)` per Pitfall 6.
- `normalizeRecipeMix` tampering defense — **partially broken** (see HI-01).
- `validIds` filter on AI responses — preserved in both Pass 2 (line 620, 637) and correction passes 3-5 (line 720).
- `sanitizeString` applied to all new string fields in enriched catalog — yes (recipe names, ingredient names).
- Pitfall 1 (Pass 1 must stay lean) — **correctly implemented**: `recipeCatalog` at line 497-503 is a projection of the enriched records containing only `id, name, ingredient_names, avg_rating, tier_hint`. Pass 2 receives the full `shortlistedRecipes` array (line 591 → `recipeEnriched.filter(...)` at line 566).
- Pitfall 7 (server-side mix normalization) — implemented via `normalizeRecipeMix`, but with HI-01 defect.
- RecipeMixPanel: 8 tests verify render/expand/defaults/hydration/malformed/rebalance/persistence/getter. Confirmed passing locally via `npx vitest run tests/RecipeMixPanel.test.tsx`.
- Rebalance math: tested 10 edge cases (100/0/0, all-zeros, over-100 clamp, decimal snapping, etc.) — all produce sum-100 outputs.
- TypeScript build status: `npx tsc -b` fails with a Phase-24-introduced error (BL-01).

## What Was Skipped

- Performance review (O(n²), memory leaks) — out of v1 scope per review spec. The enriched-catalog build is O(recipes × ratings) which is acceptable for household-scale data.
- Edge-function test coverage — project has no Deno test harness; validation is manual UAT per RESEARCH §Validation Architecture.
- Playwright UAT of the live `Generate Plan` flow — cannot run here; `24-02-SUMMARY.md` already flags this as pending post-deploy.

---

_Reviewed: 2026-04-15T17:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
