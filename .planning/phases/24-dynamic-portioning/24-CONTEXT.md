# Phase 24: Dynamic Portioning - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

The planning engine selects recipes more intelligently by combining per-member ratings, cook frequency, recency, cost per serving, and ingredient similarity into a tiered scheduling model. Generated plans balance proven favorites, liked-but-less-recent recipes, and novel suggestions the household hasn't tried. Portions remain calorie-target-driven (PORT-01 is already implemented). PORT-02 is rewritten: instead of adapting portion sizes, the system adapts which recipes are scheduled based on consumption and preference history.

**Key pivot:** The user clarified that portions should always be calorie-driven. "Dynamic" means smarter recipe selection in the planning engine, not portion size adaptation. The learning is about what recipes to schedule, not how much to serve.

</domain>

<decisions>
## Implementation Decisions

### Phase Scope Pivot
- **D-01:** PORT-01 (calorie-target-driven portions) is already implemented in `calcPortionSuggestions()`. No changes needed to portion sizing.
- **D-02:** PORT-02 rewritten: the system adapts which recipes are scheduled based on ratings, cook frequency, and preference patterns — not portion sizes. Calorie targets remain the sole driver of portion suggestions.

### Adaptation Signals
- **D-03:** Three signal sources feed recipe preference: portion gaps (suggested vs logged servings), recipe ratings (1-5 stars from Phase 20), and calorie adherence (daily target hit/miss).
- **D-04:** Calorie adherence acts as a hard guardrail — adapted suggestions never push a member over their daily calorie target.
- **D-05:** Learning is per-recipe per-member — no cross-recipe pattern inference. Each recipe builds its own signal independently.
- **D-06:** Baseline for uncooked recipes is the current calorie-split from `calcPortionSuggestions()`. Adaptation only kicks in after real cooking data exists.
- **D-07:** Ratings act as a confidence modifier, not a directional influence. High-rated recipes (4-5 stars) let preference learning converge faster. Low-rated recipes (1-2) dampen learning speed.

### Tiered Scheduling Model
- **D-08:** Generated plans use tiered quotas: ~50% proven favorites (4-5 stars), ~30% liked recipes (3+ stars, not recently cooked), ~20% novel suggestions (never cooked, similar to favorites). AI enforces ratios in the prompt.
- **D-09:** Novel recipe discovery uses AI similarity matching — the AI analyzes top-rated recipes for ingredient, cuisine, and nutrition patterns, then selects uncooked recipes from the catalog that match those patterns. Runs inside the existing generate-plan edge function.
- **D-10:** Quotas are user-adjustable — a "Recipe Mix" setting on the Plan page alongside the existing priority ordering (Phase 22 D-19) with three sliders (Favorites / Liked / Novel) that sum to 100%.
- **D-11:** Variety enforcement — recently-cooked recipes are less likely to be re-scheduled (last-cooked date passed to AI), complementing the existing monotony detection from Phase 20.

### Visibility & Controls
- **D-12:** No new visual badges on slots. The existing per-slot AI rationale (Phase 22 D-13) is enhanced to mention the preference tier ("Favorite — rated 4.8 avg" or "Novel — similar ingredients to your top-rated Chicken Stir Fry").
- **D-13:** Novel recipes enter the rated pool after receiving a rating (via Phase 20's end-of-day rating flow). Lifecycle: novel → cooked → rated → favorite/liked based on rating.
- **D-14:** No explicit "ban recipe" mechanism. Low ratings (1-2 stars) are sufficient to deprioritize a recipe from future scheduling.

### Data Enrichment
- **D-15:** The generate-plan edge function receives enriched data per recipe: cook frequency (from spend_logs), last-cooked date (from spend_logs), per-member ratings (from recipe_ratings), ingredient lists (from recipe_ingredients), and cost per serving (from food_prices).
- **D-16:** Cost per serving is included in Phase 24 scope (was missing from Phase 22's generate-plan data despite budget being listed as a soft constraint).
- **D-17:** All enriched data is computed inline in the generate-plan edge function via additional SQL queries. No new DB views or RPCs needed.

### Claude's Discretion
- Exact SQL queries for cook frequency, last-cooked date, per-member rating aggregation, and cost-per-serving computation
- How tiered quota ratios are encoded in the AI prompt
- AI prompt design for similarity-based novel recipe matching
- Recipe Mix slider UI design and interaction (three sliders summing to 100%)
- How the AI rationale text incorporates preference tier information
- Edge function performance optimization (parallel queries, caching)
- Whether to batch the new queries or add them to existing parallel Promise.all

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Portioning — PORT-01 (calorie-target portions, already implemented), PORT-02 (rewritten: preference-based scheduling)

### Dependency phases
- `.planning/phases/20-feedback-engine-dietary-restrictions/20-CONTEXT.md` — Rating model (D-01–D-05), AI auto-tags (D-06–D-08), monotony detection (D-21–D-23)
- `.planning/phases/22-constraint-based-planning-engine/22-CONTEXT.md` — Solver architecture (D-01–D-07), priority ordering (D-17–D-19), AI rationale per slot (D-13)
- `.planning/phases/16-budget-engine-query-foundation/16-CONTEXT.md` — Cost per serving infrastructure, food_prices table

### Existing code
- `src/utils/portionSuggestions.ts` — Current calorie-split portion logic (PORT-01, no changes needed)
- `supabase/functions/generate-plan/index.ts` — Planning engine edge function (primary modification target)
- `src/hooks/useRatings.ts` — Rating data access patterns
- `src/components/plan/PortionSuggestionRow.tsx` — Portion display component (no changes needed)
- `src/types/database.ts` — RecipeRating, FoodLog, FoodPrice interfaces

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `calcPortionSuggestions()` in `src/utils/portionSuggestions.ts` — already implements PORT-01, no changes needed
- `generate-plan` edge function — already fetches `recipe_ratings` and computes `avgRatings` per recipe; this is the primary enhancement target
- `food_prices` table and `useFoodPrices` hook from Phase 16 — cost per serving data available
- `spend_logs` table — cook frequency and last-cooked date derivable from `source='cook'` entries
- Phase 22 priority ordering UI on Plan page — Recipe Mix sliders go alongside this

### Established Patterns
- Edge function data fetching: parallel `Promise.all` of Supabase queries (generate-plan already does this for ratings, inventory, schedules, etc.)
- AI prompt receives JSON context, returns structured JSON response
- Per-slot AI rationale stored alongside generated plan slots

### Integration Points
- `generate-plan` edge function — add new queries for enriched data, enhance AI prompt with tiered quotas
- Plan page UI — add Recipe Mix slider section alongside existing priority ordering
- AI rationale text — enhance to include preference tier context

</code_context>

<specifics>
## Specific Ideas

- User emphasized: "portions should be based on calorie count, period" — this is the foundational principle
- Variety and novelty are essential: "don't boil it down to just a person's favorite meals every day"
- Novel recipe suggestions should be based on "caloric, nutrition, and taste preferences" from what the person has liked in the past
- Budget is a hard constraint for meal planning — cost per serving must be included in AI context

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-dynamic-portioning*
*Context gathered: 2026-04-13*
