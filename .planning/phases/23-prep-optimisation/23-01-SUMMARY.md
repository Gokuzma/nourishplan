---
phase: 23
plan: 01
subsystem: prep-optimisation
tags: [schema, types, queryKeys, foundation]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/029_prep_optimisation.sql
    - src/types/database.ts (RecipeStep, CookSession, CookSessionStepState, extended Recipe)
    - src/utils/recipeSteps.ts (parseStepsSafely, isValidRecipeStep, generateStepId)
    - src/lib/queryKeys.ts (cookSession, batchPrep, recipeSteps namespaces)
  affects:
    - supabase/migrations/029_prep_optimisation.sql (new)
    - src/types/database.ts (extended)
    - src/lib/queryKeys.ts (extended)
    - src/utils/recipeSteps.ts (new)
tech_stack:
  added: []
  patterns:
    - Supabase RLS via get_user_household_id() — reused from Phase 21/22 pattern
    - Supabase Realtime publication — reused from Phase 18 grocery list pattern
    - Hand-rolled type guard (no zod) — project convention
key_files:
  created:
    - supabase/migrations/029_prep_optimisation.sql
    - src/utils/recipeSteps.ts
  modified:
    - src/types/database.ts
    - src/lib/queryKeys.ts
decisions:
  - "Migration 029 uses IF NOT EXISTS / DROP-then-recreate pattern for full idempotency"
  - "CookSession.step_state uses Record<string, CookSessionStepState> keyed by stable step id (R-02: live-bind, not snapshot)"
  - "plan_generations.kind column defaults to 'plan' — existing rows unaffected; edge function rate-limit raise deferred to Plan 02"
  - "Pre-existing TypeScript errors (111) are unrelated to Phase 23 changes — no new errors introduced"
metrics:
  duration: "~7 minutes"
  completed: "2026-04-12"
  tasks: 3
  files: 4
---

# Phase 23 Plan 01: Schema + Types + QueryKeys Foundation Summary

Migration 029, RecipeStep/CookSession TypeScript interfaces, and cookSession/batchPrep/recipeSteps queryKey namespaces — the schema and type foundation every subsequent Phase 23 plan depends on.

## What Was Built

### Task 1 — Migration 029 (commit 2a17a98)

File: `supabase/migrations/029_prep_optimisation.sql`

Schema delta:
- `recipes.instructions JSONB` — null until AI generates steps; shape is `RecipeStep[]` per D-01
- `recipes.freezer_friendly BOOLEAN` — null until classified; D-02
- `recipes.freezer_shelf_life_weeks INTEGER` — null until classified; D-02
- Partial filter index `recipes_freezer_friendly_idx` on `(household_id, freezer_friendly) WHERE freezer_friendly = true` — batch prep modal filtering
- New table `cook_sessions` — live cook state with per-member step ownership (D-22, D-23, D-26, R-02)
  - `step_state JSONB` shape: `{ steps: { "<stable_id>": CookSessionStepState }, order: string[] }`
  - RLS: select/insert/update/delete via `get_user_household_id()`
  - Realtime publication: `alter publication supabase_realtime add table public.cook_sessions`
  - Indexes: `cook_sessions_active_idx (household_id, meal_id, status)`, `cook_sessions_started_by_idx (started_by, status)`
  - `updated_at` trigger reuses existing `set_updated_at()` helper
- `plan_generations.kind TEXT NOT NULL DEFAULT 'plan'` — tracks which Phase 23 AI call type used the shared rate-limit counter (R-01)
  - CHECK constraint: `('plan', 'steps', 'batch_prep', 'cook_sequence', 'reheat')`
  - Index: `plan_generations_kind_idx (household_id, kind, created_at DESC)`

Dry-run: `npx supabase db push --dry-run` exited 0.

### Task 2 — TypeScript types (commit b7a2122)

**New interfaces in `src/types/database.ts`:**

```typescript
RecipeStep {
  id: string                 // stable UUID — survives recipe edits (R-02)
  text: string
  duration_minutes: number
  is_active: boolean         // hands-on vs passive waiting
  ingredients_used: string[]
  equipment: string[]
}

Recipe (extended with 3 nullable fields):
  instructions: RecipeStep[] | null     // D-01
  freezer_friendly: boolean | null      // D-02
  freezer_shelf_life_weeks: number | null  // D-02

CookSessionStepState {
  completed_at: string | null
  completed_by: string | null
  timer_started_at: string | null
  owner_member_id: string | null
  recipe_id: string
}

CookSession {
  ... (full row shape matching migration 029 cook_sessions table)
  step_state: { steps: Record<string, CookSessionStepState>; order: string[] }
  status: 'in_progress' | 'completed' | 'abandoned'
  mode: 'combined' | 'per-recipe' | null
}
```

All pre-existing exports preserved (L-020).

**New file `src/utils/recipeSteps.ts`:**

```typescript
isValidRecipeStep(v: unknown): v is RecipeStep   // type guard
parseStepsSafely(raw: unknown): RecipeStep[] | null  // runtime JSONB validator
generateStepId(): string  // stable step id generator (crypto.randomUUID fallback)
```

`parseStepsSafely` contract for downstream plans:
- Returns `null` for null/undefined input
- Returns `null` for non-array input
- Returns `null` if any element fails `isValidRecipeStep`
- Returns typed `RecipeStep[]` if all elements pass validation
- Used by Cook Mode (Plan 06) before rendering step list from DB JSONB

### Task 3 — queryKey namespaces (commit 8552963)

Added to `src/lib/queryKeys.ts` after `planGeneration` block:

```typescript
cookSession: {
  detail(sessionId)           // ['cook-session', sessionId]
  list(householdId)           // ['cook-session', householdId, 'list']
  active(householdId)         // ['cook-session', householdId, 'active']
  latestForMeal(householdId, mealId)  // ['cook-session', householdId, 'meal', mealId, 'latest']
}
batchPrep: {
  summary(householdId, planId)  // ['batch-prep', householdId, planId]
}
recipeSteps: {
  detail(recipeId)  // ['recipe-steps', recipeId]
}
```

All 21 pre-existing namespaces preserved.

## TypeScript Build Notes

Pre-existing TypeScript errors: 111 (present before any Phase 23 changes — stem from Supabase generated types having `never` for some tables, unrelated `RecipeBuilder.tsx` inference issues). Our Recipe extension introduced 0 new errors.

These pre-existing errors do not block builds (Vercel build uses `vite build` not `tsc`), but Plan 04 authors should be aware they exist.

## Deviations from Plan

None — plan executed exactly as written.

Migration dry-run passed on first attempt. TypeScript verification confirmed zero new errors from our changes.

## Threat Coverage

Per the plan's threat model:
- **T-23-01 (Tampering, instructions JSONB):** `parseStepsSafely` + `isValidRecipeStep` are implemented and exported. Plan 06 Cook Mode will use `parseStepsSafely` before rendering any steps.
- **T-23-02 (Spoofing, cook_sessions household_id):** All four RLS policies use `get_user_household_id()` — verified in migration.
- **T-23-06 (Tampering, idempotency):** Every statement uses `IF NOT EXISTS` or `DROP IF EXISTS / CREATE` pattern.

## Known Stubs

None — this plan creates no UI and wires no data rendering paths.

## Self-Check: PASSED

- FOUND: supabase/migrations/029_prep_optimisation.sql
- FOUND: src/types/database.ts
- FOUND: src/utils/recipeSteps.ts
- FOUND: src/lib/queryKeys.ts
- FOUND: .planning/phases/23-prep-optimisation/23-01-SUMMARY.md
- FOUND: commit 2a17a98 (migration 029)
- FOUND: commit b7a2122 (types + recipeSteps.ts)
- FOUND: commit 8552963 (queryKeys namespaces)
