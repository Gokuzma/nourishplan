---
phase: 23
plan: 02
subsystem: edge-functions
tags: [edge-functions, ai, anthropic, supabase, deno, prep-optimisation]
dependency_graph:
  requires: [23-01]
  provides: [generate-recipe-steps, compute-batch-prep, generate-cook-sequence, generate-reheat-sequence]
  affects: [plan_generations, recipes, meal_plan_slots, cook_sessions]
tech_stack:
  added: []
  patterns: [claude-haiku-4-5, claude-sonnet-4-5, adminClient.auth.getUser, kind-column rate limiting]
key_files:
  created:
    - supabase/functions/generate-recipe-steps/index.ts
    - supabase/functions/compute-batch-prep/index.ts
    - supabase/functions/generate-cook-sequence/index.ts
    - supabase/functions/generate-reheat-sequence/index.ts
  modified: []
decisions:
  - "generate-recipe-steps uses latest meal_plan for plan_generations.plan_id — step generation is recipe-scoped, not plan-scoped, so we attach to the most recent plan as a proxy"
  - "generate-cook-sequence inserts rate limit row BEFORE fast-path branch — ensures fair 20/day accounting even when Claude is skipped"
  - "generate-reheat-sequence validates storageHint against allowed values before DB access"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-12"
  tasks_completed: 4
  tasks_total: 5
  files_created: 4
  files_modified: 0
---

# Phase 23 Plan 02: AI Orchestration Edge Functions Summary

**One-liner:** Four Deno edge functions (generate-recipe-steps, compute-batch-prep, generate-cook-sequence, generate-reheat-sequence) providing Claude-powered AI orchestration with shared 20/day rate limiting and full JWT auth via adminClient.auth.getUser.

## What Was Built

Four new edge functions in `supabase/functions/`:

### 1. `generate-recipe-steps/index.ts`
- **Model:** claude-haiku-4-5
- **kind:** `'steps'`
- **Input:** `{ recipeId, householdId, recipeName, servings, ingredientsSnapshot, existingSteps?, notes? }`
- **Output:** `{ success, instructions: RecipeStep[], freezer_friendly, freezer_shelf_life_weeks, uncertain_user_additions }`
- Combines step generation AND freezer classification in one Claude call (D-09)
- Merge-intent regeneration via `existingSteps` parameter (D-04) — uses `MERGE_INTENT_PROMPT` to preserve user edits
- Assigns stable server-generated UUIDs to all steps (R-02)
- Writes `recipes.instructions`, `recipes.freezer_friendly`, `recipes.freezer_shelf_life_weeks`

### 2. `compute-batch-prep/index.ts`
- **Model:** claude-sonnet-4-5 when >4 recipes, claude-haiku-4-5 otherwise
- **kind:** `'batch_prep'`
- **Input:** `{ planId, householdId, weekStart }`
- **Output:** `{ success, sessions, reassignments, total_time_minutes }`
- Parallel fetch of meal_plan_slots + recipes + member_schedule_slots
- L-008 Snack→Snacks normalisation applied when bridging schedule data
- D-16 auto-reassignments written back to `meal_plan_slots` via UPDATE (never INSERT — L-018)
- Scoped to planId for cross-household safety (T-23-08)

### 3. `generate-cook-sequence/index.ts`
- **Model:** claude-sonnet-4-5 for multi-recipe or multi-member, claude-haiku-4-5 otherwise
- **kind:** `'cook_sequence'`
- **Input:** `{ cookSessionId, householdId, recipeIds, mode: 'combined'|'per-recipe', memberIds }`
- **Output:** `{ success, sequence, equipment_conflicts, total_duration_minutes }`
- Fast path: single recipe + single member returns instructions verbatim without Claude call (saves credits)
- Rate limit row inserted BEFORE fast-path branch for fair accounting
- References stable step IDs from input recipes (R-02, D-23)
- Per-member lane assignment via `owner_member_id`

### 4. `generate-reheat-sequence/index.ts`
- **Model:** always claude-haiku-4-5
- **kind:** `'reheat'`
- **Input:** `{ recipeId, householdId, storageHint: 'fridge'|'freezer', servings? }`
- **Output:** `{ success, steps: RecipeStep[] }`
- Fetches recipe name from DB to avoid stale client data
- 2-3 short reheat steps tailored to fridge vs freezer storage
- Assigns stable server-generated UUIDs to all steps

## Shared Shell Pattern (All Four Functions)

All functions replicate the `generate-plan/index.ts` shell verbatim for:
- CORS OPTIONS preflight
- Deno imports (std@0.168.0, @supabase/supabase-js@2)
- JWT extraction from Authorization header
- `adminClient.auth.getUser(token)` internal auth (L-025, deployed with `--no-verify-jwt`)
- `household_members` membership check
- Shared 20/day rate limit via `plan_generations` count in 24h window (R-01 raised cap)
- `plan_generations` row insert with `kind` column BEFORE Claude call
- Claude API fetch with `anthropic-version: 2023-06-01`
- Regex JSON parse from response text
- `plan_generations` row update to `done` or `error` on completion
- 200 response with `{ success, ... }` or `{ success: false, error }` shape

## Deviations from Plan

None — plan executed exactly as written. All four functions match the verbatim implementations specified in the plan's `<action>` blocks.

## Known Stubs

None — no UI rendering paths created. These are server-side edge functions only.

## Threat Surface

All STRIDE mitigations from the plan's threat model are implemented:
- T-23-07 (spoofing): adminClient.auth.getUser + household_members check
- T-23-08 (tampering): compute-batch-prep UPDATEs scoped with .eq("plan_id", planId)
- T-23-09 (info disclosure): keys only in server-side env; sanitizeString on all user input
- T-23-10 (DoS): rate limit check before Claude call; insert before fast-path in cook-sequence
- T-23-11 (repudiation): plan_generations.triggered_by + kind on every row
- T-23-12 (prompt injection): sanitizeString applied to all user-sourced strings
- T-23-13 (malformed JSON): regex match + try/catch; plan_generations status='error' on failure
- T-23-14 (ES256 JWT): deployed with --no-verify-jwt flag (L-025)
- T-23-15 (phantom meals): compute-batch-prep uses UPDATE not INSERT (L-018)

## Task 5 Status: Awaiting Deployment

Task 5 (deploy + smoke test) is a `checkpoint:human-verify` gate. The four function files are created and ready. Deployment requires:

```bash
# Source Supabase access token (L-017)
export $(grep SUPABASE_ACCESS_TOKEN .env.local | xargs)

# Push migration 029 (if not already done by 23-01)
npx supabase db push

# Deploy all four functions with --no-verify-jwt (L-025)
PROJECT_REF=$(grep 'project_id\|project-ref' supabase/config.toml 2>/dev/null | head -1 | awk -F '"' '{print $2}')
npx supabase functions deploy generate-recipe-steps --project-ref "$PROJECT_REF" --no-verify-jwt
npx supabase functions deploy compute-batch-prep --project-ref "$PROJECT_REF" --no-verify-jwt
npx supabase functions deploy generate-cook-sequence --project-ref "$PROJECT_REF" --no-verify-jwt
npx supabase functions deploy generate-reheat-sequence --project-ref "$PROJECT_REF" --no-verify-jwt
```

Post-deploy verification (SQL queries in Supabase dashboard):
1. `select id, kind, status, created_at from plan_generations order by created_at desc limit 5;`
2. `select count(*) from cook_sessions;` — expected: 0
3. `select column_name, data_type from information_schema.columns where table_name='recipes' and column_name in ('instructions','freezer_friendly','freezer_shelf_life_weeks');` — expected: 3 rows
4. `select column_name from information_schema.columns where table_name='plan_generations' and column_name='kind';` — expected: 1 row

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 4327b1b | feat(23-02): add generate-recipe-steps edge function |
| Task 2 | f343818 | feat(23-02): add compute-batch-prep edge function |
| Task 3 | a3b734e | feat(23-02): add generate-cook-sequence edge function |
| Task 4 | 877dfe9 | feat(23-02): add generate-reheat-sequence edge function |

## Self-Check

Files exist:
- supabase/functions/generate-recipe-steps/index.ts — FOUND
- supabase/functions/compute-batch-prep/index.ts — FOUND
- supabase/functions/generate-cook-sequence/index.ts — FOUND
- supabase/functions/generate-reheat-sequence/index.ts — FOUND
