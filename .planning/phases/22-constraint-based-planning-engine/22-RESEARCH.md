# Phase 22: Constraint-Based Planning Engine - Research

**Researched:** 2026-04-06
**Domain:** AI-driven meal plan generation via Supabase Edge Function (Deno + Anthropic API), async job pattern, constraint enforcement, nutrition gap analysis
**Confidence:** HIGH (all findings verified against codebase; no speculative library introductions)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Solver runs as a Supabase Edge Function — returns job ID immediately, client polls for completion.
- **D-02:** AI-first approach — LLM (Claude API) does both plan generation AND constraint verification.
- **D-03:** Two-stage generation: first LLM call shortlists ~30 candidate recipes; second assigns candidates to slots with constraint awareness.
- **D-04:** AI generates + AI verifies loop — up to 5 passes max (initial + 4 correction rounds). Constraint violations fed back each pass.
- **D-05:** 10-second wall-clock time budget — return best result if timeout.
- **D-06:** Claude API (Haiku for speed/cost, Sonnet for quality) — model selection based on household complexity.
- **D-07:** App-level shared Anthropic API key as Supabase Edge Function secret. Rate limiting per household.
- **D-08:** "Generate Plan" button on Plan page — user controls when AI runs.
- **D-09:** Skeleton slots + progress bar during generation — shimmer on unlocked slots with step indicators.
- **D-10:** Auto-fill slots directly on completion — generated meals appear in grid immediately.
- **D-11:** Both full-plan and per-slot regeneration supported.
- **D-12:** Overwrite unlocked, skip locked — locked slots preserved; unlocked (even occupied) get regenerated.
- **D-13:** Brief AI rationale per slot stored and shown on tap/hover.
- **D-14:** Per-member nutrition summary card below plan grid — collapsible.
- **D-15:** 90% threshold for gap flagging (stricter than existing 80% hasMacroWarning).
- **D-16:** AI suggests inline swaps for gaps with improvement numbers.
- **D-17:** Tiered hard/soft constraint classification. Hard: allergen blocks, locked slots, away status. Soft: nutrition, budget, variety, ratings, inventory.
- **D-18:** User-adjustable priority ordering for soft constraints via drag-to-reorder (5 items: Nutrition, Preferences, Budget, Variety, Inventory).
- **D-19:** Priority settings on Plan page alongside Generate button.
- **D-20:** AI matches recipe complexity to schedule status (prep/quick/consume).
- **D-21:** When <7 recipes: AI suggests well-known recipes to add alongside the plan.
- **D-22:** Generate with repeats when catalog is small.
- **D-23:** plan_generations table for job metadata (no full prompts/responses stored).

### Claude's Discretion
- Exact Claude model selection per call (Haiku vs Sonnet based on complexity)
- LLM prompt design for generation and verification passes
- Rate limiting implementation (per-household daily/weekly caps)
- Job polling mechanism (WebSocket vs interval polling)
- Progress step granularity and animation details
- plan_generations table schema and RLS policies
- How AI rationale is stored and displayed
- Recipe suggestion format and one-tap add flow
- Exact drag-to-reorder UI for priority settings
- Edge Function error handling and retry strategy

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAN-02 | User can auto-generate a meal plan optimized for nutrition, cost, schedule, and preferences | Edge Function async job pattern; two-stage AI generation (shortlist + assign); constraint tier system; D-01 through D-07 |
| PLAN-04 | Generated plan highlights nutrition gaps per member with swap suggestions | Per-member weekly nutrition aggregation from slot data; 90% threshold (D-15); AI swap suggestion (D-16); NutritionGapCard component (UI-SPEC) |
| PLAN-05 | Recipe selection can prioritize using ingredients already in inventory | inventory_items table available (Phase 17 complete); AI prompt receives inventory snapshot; soft constraint "Inventory" in priority order |
</phase_requirements>

---

## Summary

Phase 22 builds a constraint-based meal plan generator on top of a fully-prepared dependency stack. Phases 17 (inventory), 19 (locked slots), 20 (dietary restrictions + ratings), and 21 (schedule model) are all implemented. The database schema, TypeScript types, and query key infrastructure are ready. The edge function pattern (Deno + Anthropic API + service-role client) is battle-tested across three existing functions: `analyze-ratings`, `classify-restrictions`, and `verify-nutrition`.

The architecture is well-defined: a new `generate-plan` Supabase Edge Function accepts a request and returns a job ID immediately. The function runs the two-stage AI generation loop (shortlist then assign) asynchronously, writing progress to a `plan_generations` table. The React client polls this table via TanStack Query until the job completes, then bulk-writes slot assignments using the existing `useAssignSlot` mutation pattern. The UI renders shimmer skeletons on unlocked slots during generation, then resolves them to populated `SlotCard` components.

The primary complexity is in the Edge Function: assembling the constraint snapshot (dietary restrictions, won't-eat entries, schedule statuses, inventory, ratings), driving the generation/verification loop within the 10-second budget, and returning partial results gracefully on timeout. The React side is additive — new components (GeneratePlanButton, PriorityOrderPanel, GenerationProgressBar, NutritionGapCard, etc.) follow the existing UI-SPEC contract exactly.

**Primary recommendation:** Implement the `generate-plan` edge function as the core deliverable; all UI pieces are straightforward extensions of existing patterns.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions (Deno) | in use | Async AI job runner | Established pattern; `analyze-ratings`, `classify-restrictions`, `verify-nutrition` all use this |
| Anthropic API (REST) | `2023-06-01` header | LLM calls for generation + verification | Already used across all 3 AI edge functions; `ANTHROPIC_API_KEY` secret in place |
| @supabase/supabase-js | `^2.99.1` | DB access, Realtime (polling fallback via `supabase.channel`) | In use across whole project |
| @tanstack/react-query | `^5.90.21` | Polling job status, caching slot data | All server state uses TanStack Query |
| @dnd-kit/sortable | `^10.0.0` | Priority reorder in PriorityOrderPanel | Already in project (Phase 19 DnD); no new dep needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `deno.land/std@0.168.0/http/server.ts` | 0.168.0 | Deno serve() — matches existing functions | Use same version as existing functions |
| `esm.sh/@supabase/supabase-js@2` | 2 | Supabase client in Deno context | Same import path as existing edge functions |
| localStorage | browser native | Priority order persistence (`plan-priority-order-{householdId}`) | Per UI-SPEC; no DB write needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Interval polling | Supabase Realtime subscription on `plan_generations` | Realtime is already used in grocery list (Phase 18); either works. Interval polling is simpler for a single-job pattern — no channel cleanup needed. Both viable per Claude's Discretion. |
| Inline slot rationale in `meal_plan_slots` | Separate `slot_rationale` JSONB column | Adding a `rationale` column to `meal_plan_slots` is cleanest (no separate table, no JOIN); alternative is storing in `plan_generations` result blob |

**Installation:** No new packages needed — all dependencies already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure
```
supabase/functions/
└── generate-plan/
    └── index.ts              # Edge Function: job intake + AI loop

supabase/migrations/
└── 026_plan_generations.sql  # plan_generations table + rationale column

src/
├── hooks/
│   ├── usePlanGeneration.ts  # useGeneratePlan mutation + useGenerationJob polling
│   └── useNutritionGaps.ts   # Per-member gap calculation hook
├── components/plan/
│   ├── GeneratePlanButton.tsx
│   ├── PriorityOrderPanel.tsx
│   ├── GenerationProgressBar.tsx
│   ├── SlotShimmer.tsx
│   ├── AIRationaleTooltip.tsx
│   ├── NutritionGapCard.tsx
│   └── RecipeSuggestionCard.tsx
└── types/database.ts          # Add PlanGeneration interface
```

### Pattern 1: Supabase Edge Function Async Job (existing pattern, extended)

**What:** Edge function writes a job row immediately and returns its ID. Client polls until `status = 'done' | 'timeout' | 'error'`. Function runs AI loop and updates the row.

**When to use:** Any AI task with unpredictable latency where the UI must stay responsive.

**Example (matches existing functions):**
```typescript
// Source: supabase/functions/analyze-ratings/index.ts (established pattern)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  // ...
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  // Insert job row, return { jobId } immediately
  // Then run AI loop, update job row on completion
});
```

### Pattern 2: Two-Stage AI Generation

**What:** Pass 1 shortlists ~30 candidate recipes (fast, small prompt). Pass 2 assigns candidates to specific slots (larger context, constraint-aware). Up to 4 additional verification/correction passes.

**When to use:** When the full recipe catalog is too large for a single LLM call but constraint checking requires full context.

**Prompt structure (design guidance):**
```
Pass 1 — Shortlist:
  System: "You are a meal planner. Given household constraints, return a JSON array of recipe IDs
           that are good candidates for this week's plan."
  User:   { recipes: [{ id, name, ingredients, avg_rating, tags }], constraints: { restrictions, wontEat } }
  Output: { candidates: string[] }  // ~30 recipe IDs

Pass 2 — Assign:
  System: "Assign recipes to meal slots respecting hard constraints.
           Return { slots: [{ day_index, slot_name, recipe_id, rationale }], violations: [] }"
  User:   { candidates: [...], slots_to_fill: [...], schedule, inventory, priorities }
  Output: { slots, violations }

Pass 3+ — Correct (up to 4 times):
  System: Same
  User:   { previous_assignment, violations: [...] }  // feed violations back
  Output: { slots, violations }
```

### Pattern 3: TanStack Query Polling (existing pattern)

**What:** useQuery with `refetchInterval` polls until job terminal state is reached.

**When to use:** Waiting for async job completion without WebSocket.

**Example:**
```typescript
// Source: TanStack Query docs pattern; consistent with all project hooks
function useGenerationJob(jobId: string | null) {
  return useQuery({
    queryKey: queryKeys.planGeneration.job(jobId),
    queryFn: async () => { /* fetch from plan_generations */ },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'done' || status === 'timeout' || status === 'error') return false
      return 2000  // poll every 2s
    },
  })
}
```

### Pattern 4: Bulk Slot Assignment (extends existing useAssignSlot)

**What:** After generation completes, the client calls `useAssignSlot` for each generated slot in the result. No new endpoint needed — reuse the existing upsert pattern.

**Key constraint:** `useAssignSlot` upserts on `(plan_id, day_index, slot_name)`. For bulk assignment, call each in sequence or use a Promise.all with careful error handling to avoid overwhelming the DB.

**Better approach:** Add a single `bulk-assign-slots` operation in the edge function itself — write all slots directly to `meal_plan_slots` using the service role client before returning, then client just invalidates the query. This avoids N round-trips from the browser.

### Pattern 5: Per-Member Nutrition Gap Calculation

**What:** Aggregate weekly slot nutrition per member using existing `calcMealNutrition` / `calcIngredientNutrition` utilities. Compare to `NutritionTarget` at 90% threshold.

**When to use:** After generation completes; rendered in NutritionGapCard.

```typescript
// Source: src/utils/nutrition.ts (existing utilities)
// Weekly target = daily target * 7
// Gap = (weeklyActual / weeklyTarget) < 0.90
function calcWeeklyGaps(slots: SlotWithMeal[], targets: NutritionTarget[], threshold = 0.9) {
  // aggregate nutrition across 7 days per member
  // compare each macro to target * 7
}
```

### Anti-Patterns to Avoid
- **Storing full prompts/responses in DB:** Per D-23, only store job metadata (job ID, timestamp, constraint snapshot, pass count, final score). Full prompts waste storage and leak meal planning context.
- **Synchronous generation:** The edge function MUST return immediately with a job ID. Never wait for the AI loop to complete before responding — Vercel/Supabase has execution time limits and mobile clients will timeout.
- **N+1 polling queries:** Poll the single `plan_generations` row, not individual slot assignments. Slot data is fetched via the existing `useMealPlanSlots` query once the job completes.
- **Running generation loop on the client:** All AI calls must go through the edge function. The Anthropic API key is a server-side secret only.
- **Verifying constraints in code instead of AI:** Per D-02, AI does BOTH generation AND verification. Don't add a separate code-based constraint checker — feed violations back to the AI for correction.
- **Not short-circuiting on timeout:** The function must track wall-clock time from the start of the request and return best-so-far when approaching 10 seconds. Don't wait for the current pass to finish.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Priority drag-reorder UI | Custom drag implementation | `@dnd-kit/sortable` (already in project from Phase 19) | Already installed; same sensor config as PlanGrid |
| Nutrition calculation | Custom macro math | `calcMealNutrition`, `calcIngredientNutrition` in `src/utils/nutrition.ts` | Already handles per-100g normalization, yield factors, snapshot macros |
| AI response JSON parsing | Custom regex parser | Pattern from `classify-restrictions` (`text.match(/\[[\s\S]*\]/)`) | Existing functions handle malformed AI JSON gracefully |
| Slot upsert logic | New DB write pattern | `useAssignSlot` (or service-role bulk insert in edge function) | Upserts on correct conflict key `(plan_id, day_index, slot_name)` |
| Schedule constraint lookup | New schedule query | `useSchedule` hook + `buildGrid` utility (Phase 21) | Already returns `ScheduleGrid` Map keyed by `day:slot` |
| Won't-eat/restriction data | New query | `wont_eat_entries` + `dietary_restrictions` tables (Phase 20) | Tables, RLS, and hooks all in place |
| Inventory availability | New inventory system | `inventory_items` table (Phase 17) | `food_id`, `food_name`, `quantity_remaining` already stored |

**Key insight:** This phase is the *consumer* of 4 previous phases. Nearly all data acquisition is done — the complexity is in the prompt design and the async job orchestration.

---

## Common Pitfalls

### Pitfall 1: Deno Edge Function 10-Second Timeout
**What goes wrong:** The AI generation loop (up to 5 passes) may exceed Supabase Edge Function's wall-clock limit, leaving the job row in a stuck `running` state with no terminal status.
**Why it happens:** Each Anthropic API call takes 1-4 seconds; 5 passes × 2 calls = up to 40 seconds worst-case without time management.
**How to avoid:** Record `const startTime = Date.now()` at the top of the function. Before starting each pass, check `Date.now() - startTime > 8500` — if so, write best-so-far and return with `status: 'timeout'`. The 10-second budget (D-05) is a hard constraint.
**Warning signs:** Job row stuck in `status: 'running'` indefinitely; client polls forever.

### Pitfall 2: `is_locked` Column Not in MealPlanSlot TypeScript Type
**What goes wrong:** `useMealPlanSlots` returns `SlotWithMeal[]` typed against `MealPlanSlot`. The DB has `is_locked` (migration 023) but `database.ts` `MealPlanSlot` interface does not include it yet — the generation code reading `slot.is_locked` will get `undefined`.
**Why it happens:** Migration 023 added the column; the TypeScript interface has not been updated yet (this phase must add it).
**How to avoid:** Update `MealPlanSlot` interface in `src/types/database.ts` to include `is_locked: boolean`. Also update the `meal_plan_slots` Insert/Update Database union types.
**Warning signs:** TypeScript errors on `slot.is_locked`; or silent `undefined` treated as falsy.

### Pitfall 3: Recipe Count Check Uses Household Recipes, Not Meals
**What goes wrong:** D-21 triggers the "small catalog" path when household has fewer than 7 recipes. If checking `meals` table instead of `recipes`, the count will be wrong (meals are compositions of recipes).
**Why it happens:** Terminology confusion — the AI generates plans from *recipes* as the atomic units, not *meals*.
**How to avoid:** Query `recipes` table with `household_id` filter and `deleted_at IS NULL`. Count <7 triggers `RecipeSuggestionCard`.

### Pitfall 4: Constraint Snapshot Must Be Assembled Before Starting AI Loop
**What goes wrong:** Making Supabase queries inside each verification pass (to re-check won't-eat entries, inventory, etc.) multiplies DB round-trips and pushes the function past the time budget.
**Why it happens:** Treating constraint data as dynamic rather than as a snapshot at job-start time.
**How to avoid:** At job start, fetch ALL constraint data in parallel (dietary restrictions, won't-eat entries, schedule, inventory, ratings, nutrition targets). Serialize to a constraint object and pass it through every AI pass. Only the slot assignments change across passes.

### Pitfall 5: "Snack" vs "Snacks" Slot Name Mismatch (Existing Lesson)
**What goes wrong:** `schedule.ts` and the DB constraint use `"Snack"` (singular); `mealPlan.ts DEFAULT_SLOTS` uses `"Snacks"` (plural). The generation prompt must normalize this.
**Why it happens:** Historical inconsistency documented in CLAUDE.md lessons.
**How to avoid:** When passing slot names to the AI prompt, normalize `"Snacks"` → `"Snack"`. When writing results back to `meal_plan_slots`, use the DB-expected `slot_name` value.

### Pitfall 6: Rate Limiting — Per-Household Cost Control
**What goes wrong:** A household could trigger repeated generations, incurring unbounded Anthropic API costs.
**Why it happens:** D-07 requires rate limiting but leaves implementation to Claude's Discretion.
**How to avoid:** On job creation, check `plan_generations` for jobs from this household in the last N hours. If exceeded, return a rate-limit error before starting any AI calls. Store this threshold as a constant in the edge function (e.g., 10 generations per household per 24 hours).

### Pitfall 7: Slot Rationale Storage
**What goes wrong:** If rationale text is stored only in the `plan_generations.result` blob (JSONB), there's no clean way to surface it per-slot in `SlotCard`.
**Why it happens:** Ambiguity in D-13 about where rationale lives.
**How to avoid:** Add a `generation_rationale` text column to `meal_plan_slots` (nullable). The edge function writes rationale when bulk-inserting slots. The existing `SlotCard` props can then receive it directly without a secondary query.

---

## Code Examples

Verified patterns from existing codebase:

### Edge Function Skeleton (match existing functions)
```typescript
// Source: supabase/functions/analyze-ratings/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  try {
    const { householdId, planId, weekStart } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // ... job creation, AI loop, slot bulk-insert
    return new Response(JSON.stringify({ jobId }), {
      status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
```

### Anthropic API Call (match existing model ID convention)
```typescript
// Source: supabase/functions/classify-restrictions/index.ts
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5",    // or "claude-sonnet-4-5" for high-complexity
    max_tokens: 2048,
    system: "...",
    messages: [{ role: "user", content: "..." }],
  }),
});
```

### TanStack Query Poll Pattern
```typescript
// Source: pattern consistent with all project hooks in src/hooks/
function useGenerationJob(jobId: string | null, householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.planGeneration.job(jobId, householdId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_generations')
        .select('*')
        .eq('id', jobId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!jobId && !!householdId,
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return (s === 'done' || s === 'timeout' || s === 'error') ? false : 2000
    },
  })
}
```

### queryKeys Extension (follow existing factory pattern)
```typescript
// Source: src/lib/queryKeys.ts (existing pattern)
planGeneration: {
  job: (jobId: string | null, householdId: string | undefined) =>
    ['plan-generation', householdId, jobId] as const,
  latest: (householdId: string | undefined, weekStart: string) =>
    ['plan-generation', householdId, weekStart, 'latest'] as const,
},
```

### MealPlanSlot Type Update Required
```typescript
// Source: src/types/database.ts — MealPlanSlot interface needs this field added
export interface MealPlanSlot {
  id: string
  plan_id: string
  day_index: number
  slot_name: string
  slot_order: number
  meal_id: string | null
  is_override: boolean
  is_locked: boolean           // <-- ADD THIS (migration 023 added the column)
  generation_rationale: string | null  // <-- ADD THIS (new in phase 22 migration)
  created_at: string
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-coded scoring algorithm | AI-first: LLM generates AND verifies | Phase 22 design (D-02) | No custom constraint solver needed; prompt engineering is the primary skill |
| Synchronous solver (would timeout) | Async job with polling | v2.0 roadmap decision | Client never blocks; partial results possible |

**Model IDs in use:** All three existing edge functions use `claude-haiku-4-5` with `anthropic-version: 2023-06-01`. The generate-plan function should use the same version header. Model choice per call is Claude's Discretion (D-06).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Edge Function can run for up to ~10 seconds before being terminated | Pitfall 1, D-05 | If limit is lower (e.g., 5s), the time budget in D-05 must be adjusted; generation loop would need to be faster or use fewer passes |
| A2 | `claude-haiku-4-5` and `claude-sonnet-4-5` are valid model IDs for the current Anthropic API | Code Examples | If model IDs changed, all AI calls would fail with 400 errors; verify against Anthropic docs before deploying |
| A3 | Phases 19, 20, 21 are fully implemented (DB tables, TS types, hooks) before Phase 22 execution begins | Standard Stack | If any upstream phase is incomplete, the constraint snapshot assembly will fail at runtime |

---

## Open Questions

1. **Where to store `generation_rationale` per slot**
   - What we know: D-13 requires brief AI rationale per slot; UI-SPEC shows it in an `AIRationaleTooltip`
   - What's unclear: Whether to add a column to `meal_plan_slots` or embed in `plan_generations.result` JSONB
   - Recommendation: Add `generation_rationale TEXT NULL` to `meal_plan_slots` in migration 026. Cleanest access pattern for `SlotCard`.

2. **Polling vs Realtime subscription for job status**
   - What we know: Both are available; Realtime is already used (grocery list Phase 18); interval polling is simpler
   - What's unclear: User preference; both satisfy D-09
   - Recommendation: Interval polling (simpler cleanup, no channel management). Can be upgraded later.

3. **Complexity threshold for Haiku vs Sonnet**
   - What we know: D-06 says Claude picks model based on household complexity; left to Claude's Discretion
   - What's unclear: What "complexity" means concretely (member count? restriction count? catalog size?)
   - Recommendation: Use Haiku for Pass 1 (shortlisting, small context). Use Haiku for verification passes. Reserve Sonnet only for Pass 2 (slot assignment) when household has 3+ members with active dietary restrictions — single condition, easy to implement.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Anthropic API key (`ANTHROPIC_API_KEY`) | Edge Function AI calls | ✓ (existing secret) | — | Graceful degradation (return error, same as existing functions) |
| Supabase Edge Functions runtime | `generate-plan` function | ✓ (3 functions deployed) | Deno (version managed by Supabase) | — |
| `@dnd-kit/sortable` | PriorityOrderPanel | ✓ (`^10.0.0` in package.json) | 10.0.0 | — |
| `plan_generations` table | Job tracking (D-23) | ✗ — created in migration 026 | — | Cannot omit — required for async pattern |
| `is_locked` column on `meal_plan_slots` | Skip locked slots | ✓ (migration 023) | — | — |
| `wont_eat_entries` table | Hard constraint: allergen blocks | ✓ (migration 024) | — | — |
| `member_schedule_slots` table | Schedule-aware assignment (D-20) | ✓ (migration 025) | — | — |
| `inventory_items` table | Inventory priority signal (PLAN-05) | ✓ (migration 021) | — | — |
| `recipe_ratings` table | Rating-weighted recipe selection | ✓ (migration 024) | — | — |

**Missing dependencies with no fallback:**
- `plan_generations` table (migration 026) — must be created before edge function can run

**Missing dependencies with fallback:**
- None (all other dependencies are in place)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts at repo root) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/planGeneration.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-02 | Nutrition gap calculation returns correct gaps at 90% threshold | unit | `npx vitest run src/utils/nutritionGaps.test.ts` | ❌ Wave 0 |
| PLAN-02 | Priority order round-trips via localStorage | unit | `npx vitest run tests/planGeneration.test.ts` | ❌ Wave 0 |
| PLAN-04 | Weekly nutrition aggregation from slot data | unit | `npx vitest run src/utils/nutritionGaps.test.ts` | ❌ Wave 0 |
| PLAN-05 | Inventory-priority scoring filters correctly | unit | `npx vitest run tests/planGeneration.test.ts` | ❌ Wave 0 |

**Note:** The edge function itself (AI generation loop, constraint assembly, two-stage prompting) is not unit-testable in isolation — it requires a live Anthropic API key and Supabase instance. Testing strategy for the edge function is integration/manual: trigger via the UI and verify the `plan_generations` table is populated correctly with the expected slot assignments.

### Sampling Rate
- **Per task commit:** `npx vitest run src/utils/nutritionGaps.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/utils/nutritionGaps.ts` — pure utility for weekly gap calculation; testable without DB
- [ ] `src/utils/nutritionGaps.test.ts` — covers PLAN-02 gap threshold, PLAN-04 weekly aggregation
- [ ] `tests/planGeneration.test.ts` — covers priority localStorage persistence, PLAN-05 inventory scoring logic
- [ ] Migration 026 (`supabase/migrations/026_plan_generations.sql`) — `plan_generations` table + `generation_rationale` column on `meal_plan_slots`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Edge function validates via adminClient only |
| V3 Session Management | no | Stateless edge function |
| V4 Access Control | yes | Validate `householdId` belongs to requesting user before starting job (pattern from `classify-restrictions`: check `household_members` table) |
| V5 Input Validation | yes | Validate `planId`, `householdId`, `weekStart` present and correctly-typed before DB writes |
| V6 Cryptography | no | No key material handled in this phase |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Household ID spoofing in generation request | Elevation of Privilege | Verify `householdId` against `household_members` table for the requesting user's JWT (match `classify-restrictions` pattern) |
| Prompt injection via recipe names / won't-eat entries | Tampering | Sanitize user-controlled strings before embedding in AI prompts; don't include them verbatim in system prompts |
| Unbounded API cost via repeated generation | Denial of Service | Rate limiting per household on `plan_generations` insert (per D-07); check recent job count before accepting new job |
| AI-generated recipe suggestions injecting malicious content | Tampering | Treat AI-suggested recipe text as untrusted user input; sanitize before storing/rendering |

---

## Sources

### Primary (HIGH confidence)
- `supabase/functions/analyze-ratings/index.ts` — Deno edge function pattern, Anthropic API call structure, CORS headers, error handling
- `supabase/functions/classify-restrictions/index.ts` — Constraint assembly pattern, household membership validation, JSON parsing from AI response
- `src/hooks/useMealPlan.ts` — `useAssignSlot` upsert conflict key, `useToggleLock` pattern, `useMealPlanSlots` join shape
- `src/lib/queryKeys.ts` — All existing query key factories; where to add `planGeneration` namespace
- `src/types/database.ts` — `MealPlanSlot` (missing `is_locked`), all dependency phase types confirmed present
- `src/utils/nutrition.ts` — `calcMealNutrition`, `calcIngredientNutrition`, `MacroSummary` — confirmed available for gap calculation
- `src/utils/schedule.ts` — `buildGrid`, `ScheduleGrid`, `SLOT_NAMES` — confirmed API for schedule constraint access
- `supabase/migrations/023_dnd_locked_slots.sql` — `is_locked` column exists on `meal_plan_slots`
- `package.json` — All library versions confirmed; no new dependencies needed
- `.planning/phases/22-constraint-based-planning-engine/22-UI-SPEC.md` — Component inventory, interaction contracts, copywriting

### Secondary (MEDIUM confidence)
- `.planning/phases/19-21-CONTEXT.md` files — Dependency phase decisions confirmed; implementations assumed complete per STATE.md progress tracking

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against package.json; no new deps proposed
- Architecture: HIGH — edge function pattern verified against 3 existing functions; hook patterns verified against existing hooks
- Pitfalls: HIGH (from codebase) / MEDIUM (timeout behavior) — Deno limits assumed from project context and prior decisions; actual wall-clock limit should be verified against Supabase docs before final prompt design
- Security: HIGH — patterns match exactly what classify-restrictions does

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable stack; Anthropic model IDs may change faster — verify before deploy)
