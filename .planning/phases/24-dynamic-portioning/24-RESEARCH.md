# Phase 24: Dynamic Portioning - Research

**Researched:** 2026-04-15
**Domain:** Meal plan generation engine (AI-driven tiered recipe scheduling)
**Confidence:** HIGH

## Summary

Phase 24 is **not** what its name suggests. The user pivoted scope during discuss-phase: portions remain 100% calorie-target-driven (PORT-01 is already complete in `calcPortionSuggestions()`). PORT-02 is rewritten — "dynamic" means the **planning engine** learns which recipes to schedule based on ratings, cook frequency, and last-cooked date, using a three-tier quota model (Favorites / Liked / Novel). All learning lives inside `supabase/functions/generate-plan/index.ts` — no new DB tables, no new client-side algorithms, no changes to `portionSuggestions.ts`.

The work is almost entirely: (1) enrich the constraint snapshot fetched by `generate-plan` with cook frequency, last-cooked date, per-member ratings, ingredient lists, and cost-per-serving; (2) rewrite the AI prompts (Pass 1 shortlist + Pass 2 assign) to enforce tiered quotas; (3) add a new `RecipeMixPanel` client component whose slider values ride in the generate-plan request payload. The AI rationale strings change format but the storage column (`generation_rationale` on `meal_plan_slots`) and tooltip markup are unchanged.

**Primary recommendation:** Implement as a single feature inside `generate-plan` (additional parallel queries, enriched prompts) + one new client panel (`RecipeMixPanel`) wired into the existing `PlanGrid.tsx` generation-controls strip next to `PriorityOrderPanel`. No migration, no portion-logic changes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Scope Pivot**
- **D-01:** PORT-01 (calorie-target-driven portions) is already implemented in `calcPortionSuggestions()`. No changes needed to portion sizing. [VERIFIED: src/utils/portionSuggestions.ts]
- **D-02:** PORT-02 rewritten: the system adapts which recipes are scheduled based on ratings, cook frequency, and preference patterns — not portion sizes. Calorie targets remain the sole driver of portion suggestions.

**Adaptation Signals**
- **D-03:** Three signal sources feed recipe preference: portion gaps (suggested vs logged servings), recipe ratings (1-5 stars from Phase 20), and calorie adherence (daily target hit/miss).
- **D-04:** Calorie adherence acts as a hard guardrail — adapted suggestions never push a member over their daily calorie target.
- **D-05:** Learning is per-recipe per-member — no cross-recipe pattern inference.
- **D-06:** Baseline for uncooked recipes is the current calorie-split from `calcPortionSuggestions()`. Adaptation only kicks in after real cooking data exists.
- **D-07:** Ratings act as a confidence modifier, not a directional influence. High-rated recipes (4-5 stars) let preference learning converge faster. Low-rated recipes (1-2) dampen learning speed.

**Tiered Scheduling Model**
- **D-08:** Tiered quotas: ~50% proven favorites (4-5 stars), ~30% liked recipes (3+ stars, not recently cooked), ~20% novel suggestions (never cooked, similar to favorites). AI enforces ratios in the prompt.
- **D-09:** Novel recipe discovery uses AI similarity matching — runs inside existing generate-plan edge function.
- **D-10:** Quotas are user-adjustable — "Recipe Mix" setting on the Plan page alongside priority ordering (three sliders Favorites / Liked / Novel summing to 100%).
- **D-11:** Variety enforcement — recently-cooked recipes are less likely to be re-scheduled (last-cooked date passed to AI), complementing existing monotony detection.

**Visibility & Controls**
- **D-12:** No new visual badges on slots. Existing per-slot AI rationale (Phase 22 D-13) is enhanced to mention preference tier ("Favorite — rated 4.8 avg" / "Novel — similar to Chicken Stir Fry").
- **D-13:** Novel recipes enter rated pool after receiving a rating. Lifecycle: novel → cooked → rated → favorite/liked.
- **D-14:** No explicit "ban recipe" mechanism. Low ratings (1-2 stars) are sufficient to deprioritize.

**Data Enrichment**
- **D-15:** generate-plan edge function receives enriched data per recipe: cook frequency (from spend_logs), last-cooked date (from spend_logs), per-member ratings (from recipe_ratings), ingredient lists (from recipe_ingredients), cost per serving (from food_prices).
- **D-16:** Cost per serving included in Phase 24 scope.
- **D-17:** All enriched data computed inline via additional SQL queries. No new DB views or RPCs.

### Claude's Discretion
- Exact SQL queries for cook frequency, last-cooked date, per-member rating aggregation, cost-per-serving computation
- How tiered quota ratios are encoded in AI prompt
- AI prompt design for similarity-based novel recipe matching
- Recipe Mix slider UI design and interaction (three sliders summing to 100%)
- How AI rationale text incorporates preference tier information
- Edge function performance optimization (parallel queries, caching)
- Whether to batch new queries or add them to existing parallel `Promise.all`

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORT-01 | Per-person portion suggestions use calorie targets as primary driver | Already implemented — `src/utils/portionSuggestions.ts` lines 52-133 verified: calorie-remaining proportional split. No changes required. |
| PORT-02 | Portion models adapt based on feedback ratings and logged consumption history | Rewritten per D-02: adaptation applies to **recipe scheduling**, not portion sizes. Implemented via enriched AI prompt in `generate-plan` + new `RecipeMixPanel` client control. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recipe mix slider UI, persistence, validation | Browser / Client | — | Pure UX state; persists to localStorage per `PriorityOrderPanel` convention |
| Mix values → generate-plan | Frontend (request body) | — | `GeneratePlanButton` → `handleGenerate` passes payload; matches `priorityOrder` pattern |
| Cook frequency, last-cooked, rating aggregation SQL | API / Edge Function | Database | Service-role queries inside `generate-plan` edge function; bypasses RLS appropriately |
| Tiered quota enforcement (AI prompt) | API / Edge Function | — | Anthropic API call inside `generate-plan`; no client-side solver |
| Novel recipe similarity matching | API / Edge Function | — | AI analyzes ingredients/cuisine/nutrition patterns of high-rated recipes |
| AI rationale text generation | API / Edge Function | — | Returned in AssignResult and written to `meal_plan_slots.generation_rationale` [VERIFIED: supabase/functions/generate-plan/index.ts:741] |
| Rationale tooltip display | Browser / Client | — | Existing `AIRationaleTooltip` component; text-only change per UI-SPEC |

## Standard Stack

### Core (Already in Project — No New Libraries)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | existing | Edge function queries + client | Project-wide Supabase SDK [VERIFIED: package.json] |
| @tanstack/react-query | existing | Client cache for generate-plan job polling | Already pattern for `planGeneration.job` key [VERIFIED: queryKeys.ts:90-95] |
| Anthropic Messages API | claude-haiku-4-5 / claude-sonnet-4-5 | AI shortlist + assign passes | Already used in generate-plan [VERIFIED: generate-plan/index.ts:378,435] |

### No New Installations
Per CLAUDE.md "Avoid Premature Abstraction" — Phase 24 uses existing infrastructure exclusively. Native `<input type="range">` covers the slider needs (UI-SPEC confirms no slider library).

## Architecture Patterns

### System Data Flow

```
[User drags Recipe Mix sliders on Plan page]
          |
          v
[RecipeMixPanel] --persists--> localStorage (plan-recipe-mix-{householdId})
          |
          v (on Generate Plan click)
[PlanGrid.handleGenerate] ------ reads localStorage -----> mix = {favorites, liked, novel}
          |
          v (POST body)
[generate-plan edge function]
          |
          +--Promise.all--> existing queries (recipes, restrictions, wontEat, schedule, inventory, ratings, nutritionTargets, members, profiles, slots)
          |                 + NEW: spend_logs (cook frequency + last-cooked), food_prices (cost/serving), recipe_ratings extended (per-member)
          |
          v
[Build enriched recipe catalog]
  id, name, ingredient_names, avg_rating, member_ratings{}, cook_count, last_cooked_date, cost_per_serving, servings
          |
          v
[Pass 1 — Haiku shortlist]
  System prompt includes tier mix (favorites %, liked %, novel %) and instructs tier-balanced candidate selection
          |
          v
[Pass 2 — Haiku or Sonnet assign]
  System prompt:
    - Enforce tier quotas across the 28-slot week
    - Pick novels by ingredient/cuisine similarity to top-rated recipes
    - Return rationale with tier tag embedded
          |
          v
[Passes 3-5 — Correction loop] (unchanged)
          |
          v
[Bulk upsert meal_plan_slots]
  generation_rationale now contains tier-prefixed strings:
    "Favorite — avg 4.8 stars across 6 cooks"
    "Liked — last cooked 3 weeks ago"
    "Novel — similar ingredients to your top-rated Chicken Stir Fry"
          |
          v
[Client re-fetches slots → AIRationaleTooltip displays new text]
```

### Recommended Project Structure

```
supabase/functions/generate-plan/
├── index.ts              # MODIFIED: add queries, enrich catalog, update prompts, extend request type

src/components/plan/
├── RecipeMixPanel.tsx    # NEW: three-slider panel with localStorage persistence
├── PriorityOrderPanel.tsx # UNCHANGED (reference pattern)
├── PlanGrid.tsx          # MODIFIED: render <RecipeMixPanel/>, read mix, pass to handleGenerate
├── GeneratePlanButton.tsx # UNCHANGED
├── AIRationaleTooltip.tsx # UNCHANGED (only text content changes upstream)

# NO new migrations
# NO new hooks
# NO changes to src/utils/portionSuggestions.ts
# NO changes to src/hooks/useRatings.ts
# NO new query key factories
```

### Pattern 1: localStorage-persisted Plan Control Panel
**What:** Mirror `PriorityOrderPanel` structure exactly for `RecipeMixPanel`.
**When to use:** Any user-adjustable generation input that does not need cross-device sync.
**Example from codebase:**
```typescript
// Source: src/components/plan/PriorityOrderPanel.tsx:68-85, 161-172
const storageKey = `plan-priority-order-${householdId}`
const [priorities, setPriorities] = useState<string[]>(() => {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      if (Array.isArray(parsed) && parsed.length === DEFAULT_PRIORITIES.length) return parsed
    }
  } catch {/* ignore */}
  return DEFAULT_PRIORITIES
})

// Exported helper so PlanGrid can read it synchronously at generate-time:
export function getPriorityOrder(householdId: string): string[] { /* ... */ }
```

For Phase 24, mirror as `getRecipeMix(householdId): {favorites, liked, novel}` — PlanGrid's `handleGenerate` reads it at the moment of dispatch, not via React state.

### Pattern 2: Parallel Constraint Snapshot in Edge Function
**What:** Add new Supabase queries to the existing `Promise.all` in `generate-plan`.
**When to use:** Any new data needed for AI prompt context.
**Example from codebase:**
```typescript
// Source: supabase/functions/generate-plan/index.ts:224-279
const [recipesResult, restrictionsResult, /* ... */, slotsResult] = await Promise.all([
  adminClient.from("recipes").select(/*...*/),
  /* 9 more queries */,
])
```

Phase 24 additions — append 3 queries to the array:
```typescript
// NEW: cook history (source='cook' only)
adminClient
  .from("spend_logs")
  .select("recipe_id, log_date")
  .eq("household_id", householdId)
  .eq("source", "cook")
  .not("recipe_id", "is", null),

// NEW: food prices for cost-per-serving
adminClient
  .from("food_prices")
  .select("food_id, food_name, cost_per_100g")
  .eq("household_id", householdId),

// ratings query already exists — extend select to include rated_by_user_id and rated_by_member_profile_id
// for per-member breakdown (D-15 member_ratings{})
```

### Pattern 3: Enriched Recipe Catalog (in-memory transform)
**What:** After parallel fetch, transform into tier-classified shape for AI.
```typescript
// Source: new code, patterned on generate-plan/index.ts:358-363 (recipeCatalog)
const recipeCatalog = recipes.map((r) => {
  const cookEntries = spendLogs.filter(s => s.recipe_id === r.id)
  const cookCount = cookEntries.length
  const lastCookedDate = cookEntries
    .map(e => e.log_date)
    .sort()
    .pop() ?? null

  const ratingsForRecipe = ratings.filter(rt => rt.recipe_id === r.id)
  const avgRating = ratingsForRecipe.length > 0
    ? ratingsForRecipe.reduce((a, b) => a + b.rating, 0) / ratingsForRecipe.length
    : null

  // Cost per serving: sum(ingredient quantity_grams/100 * cost_per_100g) / servings
  const costPerServing = computeCostPerServing(r, foodPrices) // helper

  // Tier classification (pre-AI hint; AI makes final tier decisions)
  let tier: "favorite" | "liked" | "novel" = "novel"
  if (cookCount === 0) tier = "novel"
  else if (avgRating !== null && avgRating >= 4) tier = "favorite"
  else if (avgRating !== null && avgRating >= 3) tier = "liked"

  return {
    id: r.id,
    name: sanitizeString(r.name),
    ingredient_names: (r.recipe_ingredients ?? []).map(ri => sanitizeString(ri.ingredient_name)),
    avg_rating: avgRating,
    cook_count: cookCount,
    last_cooked_date: lastCookedDate,
    cost_per_serving: costPerServing,
    tier_hint: tier,
    servings: r.servings,
  }
})
```

### Anti-Patterns to Avoid

- **Creating a new `portion_adaptations` table:** Decision D-02 explicitly pivots away from portion adaptation. Do not add schema.
- **Modifying `calcPortionSuggestions()`:** D-01 locks it. The existing 0.8/1.2 macro warning bounds and calorie-proportional split stay as-is.
- **Client-side tier classification or similarity matching:** D-17 says enrichment lives in the edge function. The AI does similarity; the client does not.
- **Adding `recipe_mix` as a server-persisted setting:** UI-SPEC explicitly says localStorage-only (matches `PriorityOrderPanel`). Do not add a DB column.
- **Filtering out low-rated recipes pre-AI:** D-14 says low ratings are a signal, not a ban. Pass everything; let the AI prompt weight.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tier classification algorithm | Custom scoring/weight function | AI prompt with tier_hint input | AI already handles composition per Phase 22; no test surface to cover hand-rolled logic |
| Novel recipe similarity (ingredient/cuisine/nutrition embeddings) | pgvector, cosine similarity, custom embeddings | Anthropic Haiku with structured input | D-09 explicit: AI does it inline |
| Mix slider auto-rebalance math | ad-hoc if/else | Proportional redistribution (UI-SPEC §Interaction Contract) | UI-SPEC provides the algorithm |
| Cost-per-serving computation | new utility | Existing `src/utils/cost.ts` + `food_prices` table [VERIFIED: src/utils/cost.ts exists per STATE.md Phase 16] | Phase 16 already normalized this |
| Cook-count/last-cooked queries | New table | `spend_logs` where `source='cook'` [VERIFIED: migration 020 lines 61-72, useRatings.ts:13-23 confirms pattern] | Already the canonical cook-event log |

**Key insight:** Phase 24's entire "intelligence" is an AI prompt change plus enriched input JSON. Hand-rolling classification/similarity would fight the platform.

## Common Pitfalls

### Pitfall 1: Slot count hard-coded to 28, enriched catalog explodes token budget
**What goes wrong:** Adding `cook_count`, `last_cooked_date`, `cost_per_serving`, `tier_hint`, `member_ratings{}` to every recipe in the catalog sent to Pass 1 can exceed Haiku's 1024-max-tokens response budget and blow up input size on households with 50+ recipes.
**Why it happens:** Phase 22 catalog is already sent in full to shortlist pass [VERIFIED: generate-plan/index.ts:384-397].
**How to avoid:** Keep Pass 1 input lean (id, name, ingredient_names, avg_rating, tier_hint only). Send the full enriched record **only for shortlisted recipes** in Pass 2 (where `shortlistedRecipes` is built — line 422-431).
**Warning signs:** Pass 1 response truncated, shortlist parse failures, plan_generations.pass_count stuck at 1.

### Pitfall 2: AI hallucinating recipe_ids (L-020 adjacent)
**What goes wrong:** When the prompt gets richer, Haiku/Sonnet occasionally invent recipe_ids that don't exist, especially for the "novel" tier.
**Why it happens:** The AI tries to fulfill the 20% novel quota; if shortlisted-novel pool is thin it invents.
**How to avoid:** The existing `validIds` filter at lines 484-512 already catches this and logs to `droppedAssignments`. **Do not remove that validation** when modifying Pass 2. Keep the `suggestedRecipes` escape hatch — AI describes a novel recipe it wishes existed; it does not claim a made-up id.
**Warning signs:** Empty Novel slots, `droppedAssignments` count > 0 in `constraint_snapshot`.

### Pitfall 3: L-020 — worktree executor regenerating generate-plan/index.ts wholesale
**What goes wrong:** generate-plan is already 800+ lines with Phase 22 solver logic, L-018 (`created_by: user.id`), L-019 (slot enumeration), wall-clock budget, droppedAssignments observability, and reused-fill fallback. An executor agent adding Phase 24 enrichments can easily strip any of these.
**How to avoid:** In the PLAN file, include a `<critical_l020_warning>` block listing the exact features to preserve:
- `WALL_CLOCK_BUDGET_MS = 90000` and `hasTimeLeft()` guard
- `droppedAssignments` / `skippedSlots` / `reusedFills` observability arrays
- `capitalize()` helper and "Snack"→"Snacks" normalization
- `pass2Completed` flag and correction-pass loop (passes 3-5)
- `validIds` filter on every AI response
- `created_by: user.id` on meals INSERT (L-018)
- `mealIdByRecipeId` pre-fetch loop (avoid per-slot round-trips)
- `--no-verify-jwt` deployment (L-025)

Use `Edit` tool, not `Write`, for index.ts.

### Pitfall 4: "Snack" vs "Snacks" slot name mismatch (L-008)
Not directly Phase 24, but the tier prompt now references schedule and slot coverage — ensure the `capitalize()` and "Snack"→"Snacks" normalization at line 326 is preserved.

### Pitfall 5: Per-member rating aggregation — dual-nullable FK
**What goes wrong:** `recipe_ratings` has both `rated_by_user_id` and `rated_by_member_profile_id` (dual-nullable check constraint [VERIFIED: migration 024 lines 9-16]). Filtering by single key misses half the household.
**How to avoid:** Build `memberKey = coalesce(rated_by_user_id::text, rated_by_member_profile_id::text)` in SQL or in-memory transform, consistent with `recipe_ratings_unique` index (line 19-21 of migration 024).

### Pitfall 6: spend_logs.recipe_id nullable — cook count inflated
**What goes wrong:** Not every cook event has a recipe_id (takeout, freeform). Counting all `source='cook'` rows overcounts.
**How to avoid:** Filter `.not("recipe_id", "is", null)` in the cook-frequency query. Confirmed pattern in `useRatings.ts:20`.

### Pitfall 7: Mix values sum to non-100 arrive at edge function
**What goes wrong:** localStorage-stored mix may be stale/corrupt (e.g., {50,30,30}).
**How to avoid:** Edge function normalizes: `total = f + l + n; favorites = f/total * 100` etc. UI-SPEC auto-rebalance keeps it at 100, but trust nothing.

## Runtime State Inventory

Not applicable — Phase 24 is a greenfield feature addition (new client panel + enriched edge function prompts). No renames, refactors, or migrations of existing persisted state.

**Explicit verification:**
- **Stored data:** No new tables, no renamed columns, no data migration. (verified against D-02, D-17)
- **Live service config:** None — only Anthropic API prompt text changes inside the edge function source.
- **OS-registered state:** None — edge functions run on Supabase, no OS registration.
- **Secrets/env vars:** `ANTHROPIC_API_KEY` already set (Phase 22). No new secrets.
- **Build artifacts:** Edge function must be redeployed with `--no-verify-jwt` per L-025. Standard deployment, not a rename.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project | All queries + edge function | ✓ | Existing | — |
| ANTHROPIC_API_KEY | generate-plan prompts | ✓ | Set in Phase 22 | Function returns early with error (existing pattern, line 107-112) |
| supabase CLI | Deploy edge function | ✓ | Existing | — |
| SUPABASE_ACCESS_TOKEN | `supabase functions deploy` | ✓ (L-017: in `.env.local`) | — | — |

No new dependencies.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `npx vitest run src/components/plan/RecipeMixPanel.test.tsx` |
| Full suite command | `npx vitest run` |

Per L-001: remove worktree directories (`.claude/worktrees/agent-*`) before running vitest.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-01 | calcPortionSuggestions uses calorie targets proportionally | unit (regression) | `npx vitest run src/utils/portionSuggestions.test.ts` | ✅ existing (Phase 5) |
| PORT-02 | Recipe Mix slider persists to localStorage | unit | `npx vitest run src/components/plan/RecipeMixPanel.test.tsx` | ❌ Wave 0 |
| PORT-02 | Recipe Mix slider auto-rebalances to sum 100 | unit | same | ❌ Wave 0 |
| PORT-02 | getRecipeMix() reads localStorage with defaults fallback | unit | same | ❌ Wave 0 |
| PORT-02 | PlanGrid passes recipe_mix in generate-plan payload | integration | `npx vitest run src/components/plan/PlanGrid.test.tsx` (may not exist) | ❌ Wave 0 (stub) |
| PORT-02 | generate-plan includes cook_count, last_cooked, cost_per_serving in recipe catalog | edge-function unit | manual (no edge-function test harness exists in project) | manual-only — justified: project has no Deno test harness for edge functions; existing Phase 22 tests are all client-side |
| PORT-02 | AI rationale strings prefix with tier ("Favorite —", "Liked —", "Novel —") | manual UAT | Playwright on staging | manual-only — depends on live Anthropic API output |
| PORT-02 | Adaptation triggers: high-rated + cooked recipes preferred in subsequent generations | manual UAT (requires seeded rating history) | Playwright + seed script | manual-only — L-012 seed test data first |

### Sampling Rate
- **Per task commit:** `npx vitest run src/components/plan/` (scoped run, ~5s)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green + Playwright UAT on nourishplan.gregok.ca with seeded rating history before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/components/plan/RecipeMixPanel.test.tsx` — covers PORT-02 slider/persistence/rebalance
- [ ] `src/components/plan/__tests__/getRecipeMix.test.ts` — covers localStorage getter helper
- [ ] Playwright script for staging UAT (enhancement to existing seed script) — covers tier rationale + preference learning behavior
- [ ] No edge function test framework exists; generate-plan changes validated by manual UAT + `plan_generations.constraint_snapshot` debug fields (existing `_debug_rawSlots`, `_debug_validSlots`, `_debug_assignText`, `droppedAssignments`)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `adminClient.auth.getUser(token)` verification at generate-plan entry [VERIFIED: index.ts:129-135] |
| V3 Session Management | no | No new sessions |
| V4 Access Control | yes | Existing household-membership check [VERIFIED: index.ts:137-149] + RLS on `spend_logs`, `food_prices`, `recipe_ratings` [VERIFIED: migrations 020, 024] |
| V5 Input Validation | yes | `sanitizeString()` for recipe/ingredient names going into AI prompts; numeric clamp on mix values (0-100, integers, sum=100) |
| V6 Cryptography | no | Stateless; no new crypto surfaces |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client sends arbitrary mix values (e.g., negative, >100, non-numeric) | Tampering | Edge function clamps and normalizes on entry |
| Client sends other household's householdId in generate-plan body | Spoofing / Elevation | Existing membership check (index.ts:137-149) — do NOT skip |
| Prompt injection via recipe name / ingredient name / won't-eat entry | Tampering | Existing `sanitizeString()` strips control chars; Haiku/Sonnet system prompt is directive-heavy — keep existing guardrails |
| AI invents recipe_id not belonging to household | Tampering | Existing `validIds` filter (L-020 related) — preserve |
| RLS bypass via service-role queries inside edge function | Elevation | Edge function always filters by `household_id` explicitly in every `.eq()` call — verify in code review |

### Security Checklist for Implementation
- [ ] New `spend_logs`, `food_prices`, per-member ratings queries all `.eq("household_id", householdId)` before execution
- [ ] Mix values normalized server-side (do not trust client sum=100)
- [ ] No PII added to AI prompt (names are already sanitized; ratings/cook-count are non-sensitive)
- [ ] `--no-verify-jwt` deployment flag applied (L-025)

## Code Examples

Verified patterns from the codebase:

### Enriched Parallel Query Addition
```typescript
// Source: supabase/functions/generate-plan/index.ts:224-279 — EXTEND this Promise.all
const [
  recipesResult,
  restrictionsResult,
  wontEatResult,
  scheduleResult,
  inventoryResult,
  ratingsResult,         // ← extend select to include rated_by_*
  nutritionResult,
  membersResult,
  profilesResult,
  slotsResult,
  spendLogsResult,       // NEW — cook history
  foodPricesResult,      // NEW — cost per 100g
  recipeIngredientsCostResult, // NEW — already in recipes query via join
] = await Promise.all([
  /* existing 10 queries unchanged */,
  adminClient
    .from("spend_logs")
    .select("recipe_id, log_date")
    .eq("household_id", householdId)
    .eq("source", "cook")
    .not("recipe_id", "is", null),
  adminClient
    .from("food_prices")
    .select("food_id, food_name, cost_per_100g")
    .eq("household_id", householdId),
]);
```

### Client Panel (mirror PriorityOrderPanel)
```typescript
// Source: src/components/plan/PriorityOrderPanel.tsx:68-172 — pattern reference
export function RecipeMixPanel({ householdId }: { householdId: string }) {
  const storageKey = `plan-recipe-mix-${householdId}`
  const [expanded, setExpanded] = useState(false)
  const [mix, setMix] = useState<{favorites: number, liked: number, novel: number}>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (typeof parsed.favorites === 'number' && /*...*/) return parsed
      }
    } catch {}
    return { favorites: 50, liked: 30, novel: 20 }
  })
  // ... auto-rebalance (UI-SPEC §Interaction Contract), persist, show "Saved"
}

export function getRecipeMix(householdId: string): {favorites: number, liked: number, novel: number} {
  try {
    const stored = localStorage.getItem(`plan-recipe-mix-${householdId}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (/*validation*/) return parsed
    }
  } catch {}
  return { favorites: 50, liked: 30, novel: 20 }
}
```

### PlanGrid wiring
```typescript
// Source: src/components/plan/PlanGrid.tsx:187, 226, 540 — pattern for priorityOrder
// Add alongside existing getPriorityOrder calls:
const recipeMix = householdId ? getRecipeMix(householdId) : { favorites: 50, liked: 30, novel: 20 }

// In handleGenerate payload:
body: JSON.stringify({
  householdId,
  planId,
  weekStart,
  priorityOrder: /* existing */,
  recipeMix,  // NEW
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static calorie-split portions only | Calorie split + AI-enriched recipe scheduling | Phase 24 scope pivot (2026-04-13) | Portion math unchanged; recipe selection smarter |
| Pre-Phase-22: manual plan construction | AI two-pass shortlist + assign with correction loop | Phase 22 (2026-04-06) | Baseline for Phase 24 |
| Pre-Phase-20: no rating/cook signal | `recipe_ratings` + `spend_logs` tracked per household | Phase 20 / Phase 16 | Data exists, just needs to flow into prompt |

**Deprecated/outdated:** None — Phase 24 is purely additive.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `cost.ts` utility and `useFoodPrices` hook correctly compute cost-per-serving from `food_prices` table | Don't Hand-Roll | Medium — if cost-per-serving computation has bugs, Phase 24 inherits them; mitigated by reusing Phase 16 code, not rewriting |
| A2 | Anthropic `claude-haiku-4-5` (Pass 1) can handle an extra ~5 fields per recipe in catalog without exceeding response token budget for 50-recipe households | Pitfall 1 | Low-Medium — Pitfall 1 proposes keeping Pass 1 lean; risk concentrated in Pass 2 where `max_tokens=4096` is already set |
| A3 | `avg_rating` in existing code (index.ts:307-315) is household-average, not per-member; CONTEXT D-15 asks for per-member ratings to be passed to AI | Standard Stack | Low — simply extend the aggregation to produce both `avg_rating` and `member_ratings` map; no new schema |
| A4 | No existing test harness for edge functions means PORT-02 validation is manual UAT only | Validation Architecture | Low — consistent with Phase 22 validation approach (accepted precedent) |

## Open Questions

1. **How strictly should tier quotas be enforced?**
   - What we know: D-08 says "~50/30/20"; UI allows user-adjustable sliders
   - What's unclear: If the household's recipe catalog has only 2 cooked recipes (both 4+ stars), 50% favorites × 28 slots = 14 slots → must repeat; does that contradict D-11 variety?
   - Recommendation: Treat mix as aspirational; allow AI to fall back to "repeats allowed when catalog too small" (existing Phase 22 D-22 pattern — `smallCatalog` flag already in constraint snapshot at line 293-300). Planner should resolve before execution.

2. **Per-member ratings: do ratings on the same recipe by multiple members average or vote?**
   - What we know: D-05 "Learning is per-recipe per-member"
   - What's unclear: Household plan is shared across all members; when scheduling a single recipe, whose rating drives tier classification?
   - Recommendation: Pass both `avg_rating` (household) and `member_ratings{}` (per-member breakdown) to AI; let the prompt weight by who is at the meal (schedule). Flag for discuss-phase if this wasn't resolved.

3. **"Last cooked" threshold for Liked tier deprioritization?**
   - What we know: D-11 "recently-cooked recipes are less likely to be re-scheduled"
   - What's unclear: Is "recent" 7, 14, 28 days? Already-existing monotony detection uses 14-day rolling window (Phase 20 `detectMonotony`).
   - Recommendation: Pass raw `last_cooked_date` to AI, don't pre-bucket. Prompt says "consider recency"; AI infers. Alternative: use 14-day threshold matching Phase 20.

## Sources

### Primary (HIGH confidence)
- `src/utils/portionSuggestions.ts` — calcPortionSuggestions implementation (PORT-01 complete)
- `supabase/functions/generate-plan/index.ts` — full edge function logic, all patterns
- `supabase/migrations/020_budget_engine.sql` — spend_logs + food_prices schema
- `supabase/migrations/024_feedback_dietary.sql` — recipe_ratings schema + RLS
- `src/components/plan/PriorityOrderPanel.tsx` — exact pattern to mirror for RecipeMixPanel
- `src/components/plan/PlanGrid.tsx` — integration points (lines 187, 226, 540, 559-592)
- `src/hooks/useRatings.ts` — rating + spend_logs query patterns
- `src/hooks/useSpendLog.ts` — spend_logs write pattern (source='cook')
- `src/lib/queryKeys.ts` — existing key factory namespaces
- `.planning/phases/24-dynamic-portioning/24-CONTEXT.md` — locked decisions D-01 through D-17
- `.planning/phases/24-dynamic-portioning/24-UI-SPEC.md` — RecipeMixPanel contract
- `.planning/phases/22-constraint-based-planning-engine/22-01-SUMMARY.md` — plan_generations table + calcWeeklyGaps
- `.planning/phases/20-feedback-engine-dietary-restrictions/20-01-SUMMARY.md` — dual-nullable FK patterns on recipe_ratings
- `lessons.md` — L-008 (slot names), L-017 (SUPABASE_ACCESS_TOKEN), L-018 (created_by), L-019 (slot enumeration), L-020 (executor contamination), L-025 (--no-verify-jwt), L-027 (subagent feature-preservation)

### Secondary (MEDIUM confidence)
- Anthropic Messages API behavior under tier-enforcement prompts — based on Phase 22 production behavior (validated in prior deploys)

### Tertiary (LOW confidence)
None — all major claims verified against codebase or project docs.

## Project Constraints (from CLAUDE.md)

- Use existing `useFoodPrices` / `useXxx` hook pattern where hooks are introduced (Phase 24 introduces NO new hooks — all new logic in edge function)
- Query keys centralised in `src/lib/queryKeys.ts` — no new keys needed for Phase 24
- Pages use `px-4 py-6 font-sans pb-[64px]` — not applicable (no new page; `RecipeMixPanel` is embedded)
- Mutations invalidate via prefix arrays — not applicable (no new mutations)
- Match existing patterns before introducing new ones — `RecipeMixPanel` mirrors `PriorityOrderPanel` line-by-line
- Do not add comments/docstrings to unchanged code
- Only change what is necessary; keep diffs small and focused
- L-020: Never blindly merge worktree work on `generate-plan/index.ts` or `PlanGrid.tsx` — both are 3+ phase veterans
- L-027: Executor prompts targeting these files must include explicit feature-preservation lists
- L-025: Redeploy edge function with `--no-verify-jwt`
- L-017: Source `SUPABASE_ACCESS_TOKEN` from `.env.local`, never ask user
- L-001: Remove worktrees before running vitest
- L-022: No `jq` in shell scripts; use `node` for JSON parsing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified in existing code
- Architecture: HIGH — patterns lifted directly from PriorityOrderPanel + generate-plan
- Pitfalls: HIGH — L-020 recurrence risk well documented in lessons.md; AI hallucination mitigation already implemented and must be preserved

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable — no fast-moving dependencies)

## RESEARCH COMPLETE
