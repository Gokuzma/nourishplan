# Phase 22: Constraint-Based Planning Engine - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

The app can generate a complete weekly meal plan optimised across nutrition targets, household budget, member schedules, dietary restrictions, and recipe preference signals. Generation is AI-first: an LLM (Claude API) proposes and verifies plans via a multi-pass loop running in a Supabase Edge Function. The UI returns immediately with a status indicator while the plan is generated asynchronously. After generation, per-member nutrition gaps are highlighted with inline AI swap suggestions.

</domain>

<decisions>
## Implementation Decisions

### Solver Architecture
- **D-01:** Solver runs as a Supabase Edge Function — returns job ID immediately, client polls for completion. Consistent with existing edge function pattern (analyze-ratings, classify-restrictions)
- **D-02:** AI-first approach — LLM (Claude API) does both plan generation AND constraint verification. Not a hand-coded scoring algorithm
- **D-03:** Two-stage generation: first LLM call shortlists ~30 candidate recipes from the full catalog, second call assigns candidates to slots with constraint awareness
- **D-04:** AI generates + AI verifies loop — up to 5 passes max (initial generation + up to 4 correction rounds). Each pass feeds constraint violations back to the AI for adjustment
- **D-05:** 10-second wall-clock time budget — return best result if timeout. Edge Function returns partial/best-so-far if time runs out
- **D-06:** Claude API (Haiku for speed/cost, Sonnet for quality) — Claude picks model based on household complexity
- **D-07:** App-level shared Anthropic API key stored as Supabase Edge Function secret. Rate limiting per household to control costs

### Generation Trigger & UX
- **D-08:** "Generate Plan" button on Plan page — prominent action button. User controls when AI runs
- **D-09:** Skeleton slots + progress bar during generation — plan grid shows shimmer on unlocked empty slots with step indicators ("Shortlisting recipes... Assigning to slots... Verifying constraints...")
- **D-10:** Auto-fill slots directly on completion — generated meals appear in the grid immediately. User reviews and can swap/remove any slot
- **D-11:** Both full-plan and per-slot regeneration — "Generate Plan" regenerates all unlocked slots; individual slots get a "Suggest alternative" action for targeted AI swaps
- **D-12:** Overwrite unlocked, skip locked — locked slots (Phase 19 mechanism) are preserved. All unlocked slots (even with existing meals) get regenerated. Rule: lock what you want to keep
- **D-13:** Brief AI rationale per slot — each generated slot gets a short explanation ("High protein, uses chicken from inventory, rated 4.5 by family"). Shown on tap/hover. Builds trust

### Nutrition Gap Analysis
- **D-14:** Per-member summary card below plan grid — collapsible section showing each member's weekly nutrition totals vs targets. Highlights gaps (e.g., "Dad: protein 12% below target")
- **D-15:** 90% threshold — flag when a member's weekly average for any macro falls below 90% of their target. Stricter than the existing 80% hasMacroWarning
- **D-16:** AI suggests swaps inline — gap card shows specific swap suggestion with improvement numbers ("Swap Tuesday dinner to [Recipe X] to close protein gap +18g"). User taps to accept

### Constraint Priority & Conflicts
- **D-17:** Tiered hard/soft classification — Hard constraints (must satisfy): allergen blocks, locked slots, schedule 'away' status. Soft constraints (optimisation goals): nutrition targets, budget, variety, ratings, inventory priority
- **D-18:** User-adjustable priority ordering for soft constraints — drag-to-reorder list of priorities: Nutrition, Preferences, Budget, Variety, Inventory. Top = most important
- **D-19:** Priority settings live on Plan page alongside the Generate Plan button — quick to tweak before generating. Contextual placement
- **D-20:** AI matches recipe complexity to schedule status — prep slots get complex recipes, quick slots get simple/reheatable recipes, consume slots get batch-prepped meals from preceding prep sessions

### Recipe Catalog & Small Household Handling
- **D-21:** When household has very few recipes (<7), AI suggests well-known recipes the user could add to their catalog. Includes basic recipe details so user can one-tap add. Shows alongside the generated plan
- **D-22:** Generate with repeats when catalog is small — AI generates the best plan it can, repeating recipes as needed

### Job Tracking
- **D-23:** Store job metadata in a plan_generations table — job ID, timestamp, constraint snapshot, pass count, final score. Don't store full AI prompts/responses. Useful for debugging and showing "generated on [date]"

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Planning — PLAN-02 (auto-generate optimised plan), PLAN-04 (nutrition gaps + swap suggestions), PLAN-05 (inventory-priority recipe selection)

### Dependency phases (read CONTEXT.md for each)
- `.planning/phases/17-inventory-engine/17-CONTEXT.md` — Inventory data model, query interfaces for available quantities (D-30), FIFO deduction pattern
- `.planning/phases/19-drag-and-drop-planner/19-CONTEXT.md` — Locked slot mechanism (D-04, D-05, D-06), `is_locked` column on meal_plan_slots
- `.planning/phases/20-feedback-engine-dietary-restrictions/20-CONTEXT.md` — Rating model (D-01–D-05), dietary restrictions (D-09–D-14), won't-eat lists (D-15–D-20), monotony detection (D-21–D-23), AI edge function pattern
- `.planning/phases/21-schedule-model/21-CONTEXT.md` — Schedule statuses (D-01: prep/consume/quick/away), batch prep linkage (D-03), per-slot granularity (D-04)

### Existing code
- `src/hooks/useMealPlan.ts` — useAssignSlot upsert pattern, useToggleLock, useMealPlanSlots query
- `src/lib/queryKeys.ts` — Centralised query keys; add `planGeneration` namespace
- `src/utils/schedule.ts` — Schedule grid utilities, status types
- `src/utils/nutrition.ts` — Nutrition calculation utilities
- `src/utils/cost.ts` — Cost calculation utilities
- `src/components/plan/PlanGrid.tsx` — Plan page grid where Generate button and gap card will live
- `src/components/plan/SlotCard.tsx` — Slot card with lock badge, violation badges — extend with AI rationale
- `src/types/database.ts` — All TypeScript types; needs PlanGeneration type
- `supabase/functions/` — Existing edge functions (analyze-ratings, classify-restrictions) — pattern for new generate-plan function

### v2.0 architectural decisions
- `.planning/STATE.md` §v2.0 Decisions — Async job pattern, locked slot flag, feedback snapshots, queryKeys centralisation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useAssignSlot` mutation: upserts on (plan_id, day_index, slot_name) — bulk slot assignment can reuse this pattern
- `useToggleLock` mutation: already reads/writes is_locked — planning engine skips slots where is_locked=true
- `useMealPlanSlots` query: joins meals with meal_items — provides the data structure the AI needs for nutrition calculation
- `queryKeys.ts`: ready for new `planGeneration` and `nutritionGaps` namespaces
- Existing Edge Functions (analyze-ratings, classify-restrictions): established Deno + Supabase client pattern with ANTHROPIC_API_KEY secret
- `SlotCard` badge system: lock icon, violation badges — extensible for AI rationale tooltip and "Suggest alternative" action

### Established Patterns
- TanStack Query with household-scoped keys and `enabled: !!householdId` pattern
- Supabase Edge Functions for AI processing with shared Anthropic API key
- Supabase RLS with `get_user_household_id()` helper
- Per-100g nutrition normalization — recipe nutrition computed from ingredient snapshots
- Realtime subscriptions (used in grocery list) — could apply to generation status updates

### Integration Points
- New `generate-plan` Supabase Edge Function (Deno)
- New `plan_generations` table for job tracking with RLS
- PlanPage: "Generate Plan" button, priority ordering section, nutrition gap summary card
- SlotCard: AI rationale on tap/hover, "Suggest alternative" per-slot action
- PlanGrid: skeleton/shimmer state during generation, progress bar component

</code_context>

<specifics>
## Specific Ideas

- "AI first approach" — the user explicitly wants AI (LLM) to be the core of the planning engine, not a hand-coded scoring algorithm. AI should match recipes with slots and constraints, then verify and adjust iteratively
- AI generates AND AI verifies — both sides of the loop are LLM-powered, not just generation with code verification
- Two-stage generation (shortlist then assign) keeps token costs manageable while giving AI full context
- Brief AI rationale per slot builds trust — users should understand WHY the AI chose each recipe
- When recipe catalog is small, AI should suggest recipes to add — goes beyond pure planning into recipe discovery, but user explicitly wants this in Phase 22
- Priority ordering (not numeric sliders) — "what does 73% mean?" problem avoided by simple drag-to-reorder

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-constraint-based-planning-engine*
*Context gathered: 2026-04-06*
