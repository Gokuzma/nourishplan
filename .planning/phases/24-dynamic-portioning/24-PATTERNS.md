# Phase 24: Dynamic Portioning - Pattern Map

**Mapped:** 2026-04-15
**Files analyzed:** 4 (1 new component, 1 new test, 2 modified)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Status | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|--------|------|-----------|----------------|---------------|
| `src/components/plan/RecipeMixPanel.tsx` | NEW | component (client-only settings panel) | localStorage-persisted UI state | `src/components/plan/PriorityOrderPanel.tsx` | exact (intentional mirror) |
| `tests/RecipeMixPanel.test.tsx` | NEW | test (component) | render + user interaction + localStorage asserts | `tests/PlanGrid.shimmer.test.tsx` (harness shape) | role-match |
| `src/components/plan/PlanGrid.tsx` | MODIFIED | container/orchestrator | request-response (invokes edge function) | self (existing `priorityOrder` wiring) | exact (add parallel field) |
| `supabase/functions/generate-plan/index.ts` | MODIFIED | edge function (AI orchestration) | batch (parallel SQL + AI calls) | self — Phase 22 solver (L-020-sensitive, 800+ lines) | exact (extend in place) |

**Note:** No migrations, no new hooks, no new query keys, no changes to `portionSuggestions.ts` (confirmed by RESEARCH.md §Architecture).

---

## Pattern Assignments

### `src/components/plan/RecipeMixPanel.tsx` (NEW component)

**Analog:** `src/components/plan/PriorityOrderPanel.tsx` (172 lines — mirror structure line-for-line; swap drag-reorder for three range inputs)

**Imports pattern** (analog lines 1-16 — simplify; no dnd-kit needed for sliders):
```typescript
import { useState, useCallback } from 'react'
```

**localStorage-hydrated state initializer** (analog lines 69-84):
```typescript
const storageKey = `plan-priority-order-${householdId}`
const [expanded, setExpanded] = useState(false)
const [showSaved, setShowSaved] = useState(false)

const [priorities, setPriorities] = useState<string[]>(() => {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      if (Array.isArray(parsed) && parsed.length === DEFAULT_PRIORITIES.length) return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_PRIORITIES
})
```

For Phase 24, replace `string[]` with `{favorites, liked, novel}` and validate all three are numbers. Default: `{favorites: 50, liked: 30, novel: 20}` (UI-SPEC §State Inventory).

**Persist + saved-flash pattern** (analog lines 91-109):
```typescript
setPriorities(prev => {
  // ... compute next ...
  try {
    localStorage.setItem(storageKey, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
})
setShowSaved(true)
setTimeout(() => setShowSaved(false), 1500)
```

**Collapsible panel shell** (analog lines 115-157):
```typescript
return (
  <div className={expanded ? 'bg-secondary rounded-[--radius-card]' : ''}>
    <button
      className="w-full py-2.5 px-3 bg-secondary rounded-[--radius-card] flex items-center justify-between"
      onClick={() => setExpanded(e => !e)}
      aria-expanded={expanded}
    >
      <span className="text-sm font-semibold text-text font-sans">Planning priorities</span>
      <div className="flex items-center gap-2">
        {showSaved && (<span className="text-xs text-primary font-sans">Saved</span>)}
        <svg /* chevron */
          className={`transition-transform text-text/50 ${expanded ? 'rotate-180' : ''}`}>
          <path d="M2 4l4 4 4-4" />
        </svg>
      </div>
    </button>
    {expanded && (
      <div className="p-3 pt-1">
        {/* body */}
      </div>
    )}
  </div>
)
```

For Phase 24, swap header label to `"Recipe mix"` and body to three slider rows per UI-SPEC §Component Inventory.

**Auto-rebalance math** (NEW — UI-SPEC §Interaction Contract; no analog — implement directly):
```typescript
// When slider key changes to newValue: distribute (100 - newValue) across the other two
// proportionally by their current ratio. If both others are 0, split 50/50.
// Clamp to [0,100] at step=5.
```

**Exported sync getter** (analog lines 161-172 — MIRROR EXACTLY, swap types):
```typescript
export function getPriorityOrder(householdId: string): string[] {
  try {
    const stored = localStorage.getItem(`plan-priority-order-${householdId}`)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      if (Array.isArray(parsed) && parsed.length === DEFAULT_PRIORITIES.length) return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_PRIORITIES
}
```

For Phase 24: `export function getRecipeMix(householdId): {favorites, liked, novel}` — validate sum ≈ 100 before returning; else return defaults.

**Slider markup** (no analog — UI-SPEC §Component Inventory is the source):
- Row wrapper: `flex items-center gap-3 px-3 py-2 min-h-[44px]`
- Label: `text-sm text-text font-sans flex-1` with `htmlFor={id}`
- `<input type="range" min="0" max="100" step="5" aria-label="Favorites percentage" className="accent-[--color-accent] active:scale-110" />`
- Value: `text-xs text-text/60 w-8 text-right` e.g. "50%"
- Validation row: `role="status"` with `text-xs text-primary` (sum=100) or `text-xs text-amber-500` (sum≠100)

---

### `tests/RecipeMixPanel.test.tsx` (NEW test)

**Analog:** `tests/PlanGrid.shimmer.test.tsx` (for harness shape — AuthContext + useHousehold mocks); analog tests at root of `tests/` directory, not alongside component.

**Harness pattern** (analog lines 1-6):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
```

**Coverage** (per RESEARCH.md §Phase Requirements → Test Map):
- Renders collapsed with default label "Recipe mix"
- Expands to reveal three sliders (Favorites / Liked / Novel)
- Initial values from localStorage if valid (`plan-recipe-mix-{householdId}`)
- Falls back to `{50, 30, 20}` on missing / malformed localStorage
- Adjusting one slider auto-rebalances the other two to keep sum=100
- Persists to localStorage on change
- `getRecipeMix()` returns stored values when valid; defaults when missing/invalid

**No AuthContext/useHousehold mocks needed** — component accepts `householdId` as prop. Simpler than analog.

---

### `src/components/plan/PlanGrid.tsx` (MODIFIED — add mix wiring)

**Analog:** self — Phase 22 `priorityOrder` wiring (existing pattern to mirror).

**Import addition** (current line 33):
```typescript
import { PriorityOrderPanel, getPriorityOrder } from './PriorityOrderPanel'
```
Add alongside:
```typescript
import { RecipeMixPanel, getRecipeMix } from './RecipeMixPanel'
```

**State initializer** (current lines 186-188):
```typescript
const [priorityOrder, setPriorityOrder] = useState<string[]>(() =>
  householdId ? getPriorityOrder(householdId) : []
)
```
Mirror alongside:
```typescript
const [recipeMix, setRecipeMix] = useState(() =>
  householdId ? getRecipeMix(householdId) : { favorites: 50, liked: 30, novel: 20 }
)
```

**handleGenerate payload** (current lines 219-232):
```typescript
const handleGenerate = useCallback(async () => {
  if (!planId) return
  setGenerationError(null)
  try {
    const result = await generatePlan.mutateAsync({
      planId,
      weekStart,
      priorityOrder: householdId ? getPriorityOrder(householdId) : priorityOrder,
    })
    setActiveJobId(result.jobId)
  } catch {
    setGenerationError('Plan generation failed. Try again.')
  }
}, [planId, weekStart, householdId, priorityOrder, generatePlan])
```
Add `recipeMix: householdId ? getRecipeMix(householdId) : recipeMix` to the mutateAsync arg and `recipeMix` to the deps array. **Read via `getRecipeMix(householdId)` synchronously at dispatch time — do not trust React state** (RESEARCH.md Pattern 1).

**Panel render** (current lines 587-592):
```typescript
{householdId && (
  <PriorityOrderPanel
    householdId={householdId}
    onOrderChange={setPriorityOrder}
  />
)}
```
Add sibling directly below (UI-SPEC §Plan Page Layout):
```typescript
{householdId && (
  <RecipeMixPanel
    householdId={householdId}
    onMixChange={setRecipeMix}
  />
)}
```

**CRITICAL L-020 features to preserve in PlanGrid.tsx** (per lessons.md L-020, L-027):
- `useNavigate` + `supabase` imports for recipe-suggestion navigation
- `AIRationaleTooltip` wiring in SlotCard children
- `reassignmentToast` / `batchPrepOpen` state
- `useGenerationJob` polling + completion cleanup (lines 208-217)
- All `useMemo` blocks for `suggestedRecipes`, `recipeCount`
- `DndContext` / `handleDragStart` / `handleDragEnd` blocks
- Shimmer rendering while `isGenerating`

**Tool:** Use `Edit`, NEVER `Write` (file is >600 lines, veteran of Phases 5, 20, 22, 23).

---

### `supabase/functions/generate-plan/index.ts` (MODIFIED — extend in place)

**Analog:** self. File is 808 lines, L-020 hotspot. All edits must be surgical `Edit` calls.

**Request type extension** (current lines 9-14):
```typescript
interface GenerateRequest {
  householdId: string;
  planId: string;
  weekStart: string;
  priorityOrder: string[];
}
```
Add optional `recipeMix?: { favorites: number; liked: number; novel: number }`. Server-side normalize (RESEARCH.md Pitfall 7): clamp negatives to 0, divide each by sum, scale to 100.

**Body destructure** (current line 97):
```typescript
const { householdId, planId, weekStart, priorityOrder } = body;
```
Add `recipeMix` to the destructure with normalization + default `{50, 30, 20}`.

**Parallel query snapshot extension** (current lines 224-279):
```typescript
const [
  recipesResult,
  restrictionsResult,
  wontEatResult,
  scheduleResult,
  inventoryResult,
  ratingsResult,
  nutritionResult,
  membersResult,
  profilesResult,
  slotsResult,
] = await Promise.all([
  adminClient.from("recipes").select("id, name, servings, recipe_ingredients(ingredient_name, quantity_grams, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g)").eq("household_id", householdId).is("deleted_at", null),
  // ... 9 more queries ...
]);
```

Phase 24 additions (RESEARCH.md Pattern 2 + Pitfall 6):
1. **Extend `recipes` select to include `food_id` join** on `recipe_ingredients` for cost lookup
2. **Extend `ratings` select** to include `rated_by_user_id, rated_by_member_profile_id` for per-member breakdown (per-member aggregation uses `coalesce(rated_by_user_id::text, rated_by_member_profile_id::text)` per RESEARCH.md Pitfall 5)
3. **Add `spendLogsResult`:**
   ```typescript
   adminClient
     .from("spend_logs")
     .select("recipe_id, log_date")
     .eq("household_id", householdId)
     .eq("source", "cook")
     .not("recipe_id", "is", null),  // Pitfall 6: must filter nulls
   ```
   Pattern verified from `src/hooks/useRatings.ts:13-23`:
   ```typescript
   const { data: spendLogs } = await supabase
     .from('spend_logs')
     .select('recipe_id')
     .eq('household_id', householdId!)
     .eq('source', 'cook')
     .not('recipe_id', 'is', null)
   ```
4. **Add `foodPricesResult`:**
   ```typescript
   adminClient
     .from("food_prices")
     .select("food_id, food_name, cost_per_100g")
     .eq("household_id", householdId),
   ```

**Cost-per-serving computation** (DON'T hand-roll — call existing helper from `src/utils/cost.ts:24-41`):
```typescript
export function computeRecipeCostPerServing(
  ingredients: { quantity_grams: number; cost_per_100g: number | null }[],
  servings: number
): { costPerServing: number; pricedCount: number; totalCount: number } {
  let total = 0
  let pricedCount = 0
  for (const ing of ingredients) {
    if (ing.cost_per_100g != null) {
      total += (ing.quantity_grams / 100) * ing.cost_per_100g
      pricedCount++
    }
  }
  return {
    costPerServing: servings > 0 ? total / servings : 0,
    pricedCount,
    totalCount: ingredients.length,
  }
}
```
**Caveat:** edge function runs in Deno, cannot import from `src/utils`. Inline-copy this function (≤15 lines) into generate-plan rather than introducing a Deno bundler step. Cite source in inline comment.

**Enriched catalog transform** (new code; pattern lifted from current lines 306-363):
```typescript
// Current avg-rating loop (preserve):
const avgRatings: Record<string, number> = {};
const ratingGroups: Record<string, number[]> = {};
for (const r of ratings) {
  if (!ratingGroups[r.recipe_id]) ratingGroups[r.recipe_id] = [];
  ratingGroups[r.recipe_id].push(r.rating);
}
for (const [id, vals] of Object.entries(ratingGroups)) {
  avgRatings[id] = vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Current catalog (extend):
const recipeCatalog = recipes.map((r) => ({
  id: r.id,
  name: sanitizeString(r.name),
  ingredient_names: (r.recipe_ingredients ?? []).map((ri) => sanitizeString(ri.ingredient_name)),
  avg_rating: avgRatings[r.id] ?? null,
}));
```

Phase 24 additions (RESEARCH.md Pattern 3, Pitfall 1):
- Compute `cookCount` from `spendLogs.filter(s => s.recipe_id === r.id).length`
- Compute `lastCookedDate` from sorted `log_date`
- Compute `memberRatings` map via coalesce key
- Compute `costPerServing` via inlined helper against `foodPrices`
- Compute `tier_hint` ∈ {"favorite","liked","novel"} based on cookCount + avgRating

**Pitfall 1 guard:** Pass 1 receives LEAN catalog (existing shape + `tier_hint`). Pass 2 receives FULL enriched record only for shortlisted recipes (current shortlistedRecipes build at lines 422-431).

**AI prompt extensions** (current line 381 Pass 1 system, line 450 Pass 2 system):
- Pass 1: append "Return candidates balanced across preference tiers roughly matching {favorites, liked, novel} ratios provided in constraints."
- Pass 2: append tier quota enforcement + similarity-matching instruction + rationale tier-tag requirement (UI-SPEC §Copywriting Contract gives exact formats: `"Favorite — avg {N} stars across {N} cooks"` / `"Liked — last cooked {N} weeks ago"` / `"Novel — similar ingredients to your top-rated {Recipe Name}"`).
- Pass 2 user content: include `recipeMix` object and `tier_hint` per candidate.

**CRITICAL L-020 / L-027 features that MUST BE PRESERVED** (per RESEARCH.md Pitfall 3; lessons.md L-018, L-019, L-020, L-025, L-027):
- `WALL_CLOCK_BUDGET_MS = 90000` constant + `hasTimeLeft()` guard (lines 193-197)
- `pass2Completed` flag + `correctionPassesSkippedForTime` (lines 204, 615-621)
- `droppedAssignments` / `skippedSlots` / `reusedFills` arrays + observability writes (lines 208-222, 481-512, 583-598, 766-776)
- `validIds` filter on every AI response (lines 412-413, 484-512, 584-598)
- `capitalize()` helper + "Snack"→"Snacks" normalization (lines 319, 326, L-008)
- `DEFAULT_SLOT_NAMES` 28-slot enumeration (lines 332-344, L-019)
- `created_by: user.id` on meals INSERT (line 722, L-018)
- `mealIdByRecipeId` pre-fetch loop (lines 708-727)
- `auth.getUser(token)` + membership check (lines 129-149)
- Rate limiting 10/24h (lines 152-164)
- Slot-level reuse fallback (lines 630-705)
- Bulk upsert `onConflict: "plan_id,day_index,slot_name"` (lines 748-754)
- CORS headers on every response path
- All correction-pass loop structure (lines 531-608)

**Tool:** Use `Edit` exclusively. NEVER `Write` this file. Sub-agent prompts must list the above features by name (L-027).

**Deploy flag:** `npx supabase functions deploy generate-plan --project-ref <ref> --no-verify-jwt` (L-025).

---

## Shared Patterns

### Pattern: localStorage-persisted plan control panel
**Source:** `src/components/plan/PriorityOrderPanel.tsx` lines 68-172
**Apply to:** `RecipeMixPanel.tsx`
**Key mechanics:** try/catch around both getItem read and setItem write; synchronous initializer function to `useState`; exported read-only getter function for consumers that cannot use hooks.

### Pattern: Synchronous read at dispatch time
**Source:** `src/components/plan/PlanGrid.tsx` line 226
**Apply to:** `handleGenerate` addition for `recipeMix`
```typescript
priorityOrder: householdId ? getPriorityOrder(householdId) : priorityOrder,
```
Rationale: avoid stale React state; `localStorage` is the source of truth at request time.

### Pattern: Edge function parallel snapshot
**Source:** `supabase/functions/generate-plan/index.ts` lines 224-279
**Apply to:** generate-plan snapshot extension
**Key mechanics:** append queries to the existing `Promise.all` array. Every query `.eq("household_id", householdId)`. Every table with a nullable FK needs `.not("<col>", "is", null)` where counting is intended.

### Pattern: AI response ID validation
**Source:** `supabase/functions/generate-plan/index.ts` lines 484-512
**Apply to:** Any new AI response parsing in Pass 2
```typescript
const validIds = new Set(recipes.map((r) => r.id));
for (const s of (parsed.slots ?? [])) {
  if (!s.recipe_id || !validIds.has(s.recipe_id)) {
    droppedAssignments.push({ /* ... */ reason: !s.recipe_id ? "missing_recipe_id" : "invalid_recipe_id" });
    continue;
  }
  validSlots.push(s);
}
```
**NEVER remove this.** AI hallucinates recipe_ids especially in the Novel tier (RESEARCH.md Pitfall 2).

### Pattern: sanitizeString on all AI-prompt inputs
**Source:** `supabase/functions/generate-plan/index.ts` lines 86-88, 347-361
```typescript
function sanitizeString(s: string): string {
  return s.replace(/[\x00-\x1F\x7F]/g, "");
}
```
Apply to any new string fields added to the catalog (recipe names, ingredient names, member names).

### Pattern: Test harness for component + hook mocks
**Source:** `tests/PlanGrid.shimmer.test.tsx` lines 1-40
**Apply to:** `tests/RecipeMixPanel.test.tsx` (simpler — no AuthContext mock needed since component takes `householdId` as prop)

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All Phase 24 work maps cleanly to existing analogs. |

---

## Project Constraints Applied

- **CLAUDE.md:** "Match existing patterns in the codebase before introducing new ones" → `RecipeMixPanel` mirrors `PriorityOrderPanel` exactly
- **`.claude/rules/code-style.md`:** "Only change what is necessary" → edit generate-plan in place, do not restructure
- **`.claude/rules/architecture.md`:** "Respect existing structure" → new component goes in `src/components/plan/`; no new top-level dirs
- **lessons.md L-020/L-027:** generate-plan/index.ts and PlanGrid.tsx are L-020 hotspots; surgical `Edit` only, plan must list features to preserve
- **lessons.md L-025:** Redeploy edge function with `--no-verify-jwt`
- **lessons.md L-017:** Source `SUPABASE_ACCESS_TOKEN` from `.env.local` before `supabase functions deploy`
- **lessons.md L-001:** Remove worktrees before running vitest post-merge

---

## Metadata

**Analog search scope:** `src/components/plan/`, `supabase/functions/generate-plan/`, `src/hooks/`, `src/utils/`, `tests/`
**Files read:** CONTEXT.md, RESEARCH.md, UI-SPEC.md, lessons.md, PriorityOrderPanel.tsx, generate-plan/index.ts, PlanGrid.tsx (excerpts), cost.ts, useRatings.ts (excerpt), PlanGrid.shimmer.test.tsx (excerpt)
**Pattern extraction date:** 2026-04-15
