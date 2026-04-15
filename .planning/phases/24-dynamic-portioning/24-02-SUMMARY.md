---
phase: 24-dynamic-portioning
plan: 02
subsystem: edge-function
tags: [supabase, deno, haiku, sonnet, two-pass-ai, tier-scheduling]

requires:
  - phase: 22-constraint-based-planning-engine
    provides: two-pass AI generation pipeline with constraint_snapshot observability
  - phase: 24-dynamic-portioning/plan-01
    provides: recipeMix field in generate-plan request body
provides:
  - enriched constraint snapshot with cook_count, last_cooked_date, per-member ratings, cost_per_serving, tier_hint
  - Pass 1 tier-aware shortlist selection driven by recipeMix ratios
  - Pass 2 tier quota enforcement with tier-prefixed generation_rationale
affects: [future-rationale-UI-consumers, plan_generations observability]

tech-stack:
  added: []
  patterns:
    - "spend_logs + food_prices enrichment queries added to existing Promise.all block"
    - "Deno-safe inline copy of computeRecipeCostPerServing (cannot import src/)"
    - "Lean Pass 1 catalog (tier_hint only) → enriched Pass 2 shortlist"
    - "Tier-prefixed rationale strings stored verbatim in meal_plan_slots.generation_rationale"

key-files:
  created: []
  modified:
    - supabase/functions/generate-plan/index.ts

key-decisions:
  - "All 14 Edits (A-N minus deploy) applied surgically via Edit tool, preserving the full L-020 feature list"
  - "recipeMix normalization: clamp negatives to 0, proportional scale to sum=100, fallback to {50,30,20} on any invalid input (Pitfall 7)"
  - "Tier heuristic: cook_count=0 → novel; avg_rating>=4 → favorite; avg_rating>=3 OR cooked-without-rating → liked (AI makes final assignment)"
  - "Pass 1 receives only lean fields (id, name, ingredient_names, avg_rating, tier_hint) to respect Haiku token budget (Pitfall 1)"
  - "Per-member rating key uses coalesce(rated_by_user_id, rated_by_member_profile_id) matching the unique index on recipe_ratings"

patterns-established:
  - "Enrichment query append to existing Promise.all (not a new block) — keeps observability timing consistent"
  - "Tier-quota + rationale-format instructions live in the Pass 2 system prompt, not code logic — AI is the policy engine"

requirements-completed: [PORT-02]
requirements-touched: [PORT-01]

duration: ~7min (agent interrupted mid-task by usage limit; orchestrator finalized)
completed: 2026-04-15
---

# Phase 24 Plan 02: Tier-Aware generate-plan Edge Function Summary

**Edge function now consumes `recipeMix` from request body, enriches the constraint snapshot with cook history / member ratings / cost / tier hints, and enforces Favorites/Liked/Novel quotas through AI prompt policy with tier-prefixed rationale strings.**

## Performance

- **Started:** 2026-04-15T20:51:00Z (agent spawn)
- **Completed (code):** 2026-04-15T20:59:14Z (commit 2f48b13)
- **Tasks:** 1 (bundled Edits A-M)
- **Files modified:** 1 (+155 / -19)

## Accomplishments

- `GenerateRequest` interface extended with optional `recipeMix: {favorites, liked, novel}` field
- `normalizeRecipeMix` helper inlined with clamp + sum-to-100 + default fallback defense (client-side normalization in Plan 24-01 is not trusted)
- `Promise.all` constraint query block extended with `spend_logs` (cook history) and `food_prices` (cost lookup) queries
- `recipe_ratings` select extended with `rated_by_user_id, rated_by_member_profile_id` for per-member rating attribution
- `recipes` select extended with `food_id` on `recipe_ingredients` for cost join
- `computeRecipeCostPerServing` helper inline-copied from `src/utils/cost.ts` (Deno cannot import src/)
- Derived maps built: `cookCountByRecipe`, `lastCookedByRecipe`, `memberRatingsByRecipe`, `costByRecipe`, `priceByFoodId`
- `recipeCatalog` objects extended with `cook_count`, `last_cooked_date`, `member_ratings`, `cost_per_serving`, `tier_hint`
- Pass 1 kept LEAN (id, name, ingredient_names, avg_rating, tier_hint only + recipeMix) — respects Haiku token budget
- Pass 2 receives full enriched records for shortlisted recipes + recipeMix
- Pass 1 system prompt extended with tier-balance selection instruction
- Pass 2 system prompt extended with tier quotas, 14-day liked-dedupe, novel ingredient-similarity instruction, and three exact rationale formats:
  - `"Favorite — avg {N} stars across {N} cooks"`
  - `"Liked — last cooked {N} weeks ago"`
  - `"Novel — similar ingredients to your top-rated {Recipe Name}"`
- `constraint_snapshot` now persists `recipeMix` for observability / UAT

## Task Commits

1. **Task 1 — enrich constraint snapshot + rewrite AI prompts** — `2f48b13` (feat, +155 / -19)

## Files Created/Modified

- `supabase/functions/generate-plan/index.ts` — MODIFIED: +155 / -19. Surgical edits; no deletions of L-020 preservation items; all 16 grep assertions from the plan's `<verify><automated>` block pass (recipeMix, spend_logs, food_prices, rated_by_user_id, tier_hint, cook_count, cost_per_serving, WALL_CLOCK_BUDGET_MS, pass2Completed, droppedAssignments, validIds, DEFAULT_SLOT_NAMES, created_by, mealIdByRecipeId, capitalize, sanitizeString).

## Decisions Made

- **All edits bundled into one commit** instead of per-letter (A, B, C, …). The plan's task contract was "one task = one commit"; the 14 Edit letters are sub-steps of Task 1, not separate tasks.
- **recipeMix normalization trusted on the server** — the client can send malformed values (negatives, non-numbers, sum≠100), so the edge function normalizes defensively rather than trusting Plan 24-01's client-side rounding alone.
- **Tier-quota enforcement via prompt, not code** — AI is the policy engine for Phase 24 per D-09. The server provides ratios and records; the model produces assignments. Correction passes still run if tier quotas drift.

## Deviations from Plan

### Deferred to Orchestrator

**1. [Edit N — Redeploy] Edge function deploy not executed inside plan**
- **Reason:** Agent process terminated by usage limit (`You've hit your limit · resets 5pm (America/Toronto)`) before the deploy step completed.
- **State at termination:** All code edits saved + committed (2f48b13). Redeploy (`npx supabase functions deploy generate-plan --no-verify-jwt`) not run.
- **Remediation:** Orchestrator to run redeploy immediately after merging this worktree. Deploy is additive (new request field optional, new snapshot fields additive, prompts append-only) — no breaking change for in-flight plans using the old payload shape.
- **Tracked under:** "User Setup Required" below.

### Auto-fixed Issues

None. All 16 grep assertions passed first try, and the L-020 preservation list is intact.

---

**Total deviations:** 1 deferred-to-orchestrator (Edit N / redeploy). No code deviations.
**Impact on plan:** Plan scope is complete from a code standpoint. Functional verification depends on the redeploy, which the orchestrator will handle.

## Issues Encountered

- **Agent process terminated mid-task by usage limit.** Claude Code reported `You've hit your limit · resets 5pm (America/Toronto)` at ~7 min 28 s into execution. Code work and commit succeeded; SUMMARY.md write + edge function redeploy did not run inside the worktree. The orchestrator detected this via spot-check, wrote SUMMARY.md from the committed state, and handles the redeploy post-merge.

## Known Stubs

None in the code itself. The novel-tier similarity recommendation ("similar ingredients to your top-rated {Recipe Name}") is implemented as a prompt instruction, not an explicit algorithm — the AI computes similarity directly from the `ingredient_names` arrays supplied in the enriched catalog.

## Threat Flags

- **T-24-02 (recipeMix injection) — mitigated.** `normalizeRecipeMix` clamps negatives to 0, coerces non-numbers to 0, scales any positive-sum triple to 100, and falls back to `{50, 30, 20}` defaults on empty or zero-sum input. Matches the threat model entry for `client → edge function body` trust boundary.
- **T-24-03 (AI recipe_id hallucination) — existing `validIds` filter retained.** Novel-tier recipes are at higher risk of being hallucinated; the pre-existing `validIds = new Set(recipeCatalog.map(r => r.id))` check on every Pass 1 / Pass 2 / correction-pass response stays in place (verified via grep).
- No new RLS surface — all new queries (`spend_logs`, `food_prices`) explicitly filter by `household_id` matching the existing pattern.

## User Setup Required

- **Redeploy edge function** (agent was interrupted before executing):
  ```bash
  export $(grep SUPABASE_ACCESS_TOKEN .env.local | xargs)
  npx supabase functions deploy generate-plan --no-verify-jwt
  ```
  L-017 + L-025 apply. If deploy fails, do NOT retry with `--verify-jwt` — investigate the error.
- **Manual UAT** (after deploy): trigger Generate Plan from the live app; inspect `plan_generations.constraint_snapshot` for `recipeMix`, `cook_count`, `tier_hint` fields; verify `meal_plan_slots.generation_rationale` rows start with "Favorite —", "Liked —", or "Novel —" prefixes.

## Next Phase Readiness

- Downstream consumer `AIRationaleTooltip` (src/components/plan/) already renders `generation_rationale` verbatim — no UI changes needed.
- Future phases that want to tune tier thresholds (currently hardcoded: `avg_rating >= 4` for favorite, `>= 3` for liked) can do so by editing the `tier_hint` heuristic block — but the AI's final tier assignment will usually override.
- No blockers. `package.json` unchanged (zero new npm dependencies; all new code is server-side Deno).

## Self-Check: PASSED (code), PENDING (deploy)

**Files modified:**
- FOUND: supabase/functions/generate-plan/index.ts (+155 / -19)

**Commits:**
- FOUND: 2f48b13 (feat(24-02): enrich constraint snapshot and rewrite AI prompts for tiered scheduling)

**Done criteria from plan:**
- PASS: All 16 grep assertions from `<verify><automated>` pass (recipeMix, spend_logs, food_prices, rated_by_user_id, tier_hint, cook_count, cost_per_serving, WALL_CLOCK_BUDGET_MS, pass2Completed, droppedAssignments, validIds, DEFAULT_SLOT_NAMES, created_by, mealIdByRecipeId, capitalize, sanitizeString)
- PASS: `src/utils/portionSuggestions.test.ts` unchanged (PORT-01 regression proof — this plan touches no portion math)
- PENDING: Edge function redeploy (agent interrupted; orchestrator to run)
- PENDING: Manual UAT confirming `constraint_snapshot.recipeMix` + rationale tier prefixes (post-deploy, user-driven)
- PASS: `git diff --stat` shows 155 additions vs 19 deletions (additive >> deletive as required)

---
*Phase: 24-dynamic-portioning*
*Completed: 2026-04-15 (code); deploy pending orchestrator action*
