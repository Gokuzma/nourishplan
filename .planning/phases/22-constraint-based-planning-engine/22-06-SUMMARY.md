---
phase: 22-constraint-based-planning-engine
plan: "06"
subsystem: planning-engine
tags: [edge-function, timeout, status-semantics, planning-engine, migration]
dependency_graph:
  requires: [22-04-SUMMARY]
  provides: [WALL_CLOCK_BUDGET_MS, partial-status, migration-028]
  affects: [22-07-PLAN, 22-08-PLAN]
tech_stack:
  added: []
  patterns: [named-constant-budget, two-flag-status-tracking, partial-status-enum]
key_files:
  created:
    - supabase/migrations/028_plan_generations_partial_status.sql
  modified:
    - supabase/functions/generate-plan/index.ts
    - src/types/database.ts
    - src/hooks/usePlanGeneration.ts
    - src/components/plan/PlanGrid.tsx
decisions:
  - "WALL_CLOCK_BUDGET_MS = 90000 (90s) — 150s platform ceiling minus 60s headroom for DB writes"
  - "pass2Completed + correctionPassesSkippedForTime flags determine status instead of hasTimeLeft() check after passes 3-5"
  - "partial status means assignment is written but correction passes skipped; done means all passes ran or no violations found"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-10"
  tasks_completed: 1
  files_changed: 5
---

# Phase 22 Plan 06: Wall-Clock Budget Fix and Partial Status Summary

**One-liner:** Raised wall-clock budget from 6s to 90s via `WALL_CLOCK_BUDGET_MS` constant and introduced `partial` status for runs where Pass 2 completed but correction passes were skipped for time.

## Objective

Close UAT Gap B (test 1): every recent `plan_generations` row was stuck at `status='timeout'` with `pass_count=2` because the self-imposed 6-second budget expired during Pass 2, mislabeling successful 2-pass runs as failures.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Raise wall-clock budget, fix status semantics, extend PlanGeneration union, push migration 028 | 3b77045 | supabase/functions/generate-plan/index.ts, src/types/database.ts, src/hooks/usePlanGeneration.ts, src/components/plan/PlanGrid.tsx, supabase/migrations/028_plan_generations_partial_status.sql |

## Changes Made

### Edge Function (`supabase/functions/generate-plan/index.ts`)

- Replaced 6000ms magic number with `WALL_CLOCK_BUDGET_MS = 90000` constant with comment referencing 150s platform ceiling
- Added `pass2Completed` and `correctionPassesSkippedForTime` boolean flags
- `pass2Completed = true` set inside the Pass 2 success branch (after `suggestedRecipes = parsed.suggestedRecipes`)
- `correctionPassesSkippedForTime = true` set when passes 3-5 loop breaks due to time
- Status determination logic rewritten:
  - `!pass2Completed` → `'timeout'`
  - `correctionPassesSkippedForTime` → `'partial'`
  - otherwise → `'done'`

### TypeScript Types (`src/types/database.ts`)

- `PlanGeneration.status` union: `'running' | 'done' | 'timeout' | 'partial' | 'error'`
- `plan_generations` Insert signature status field also updated with `'partial'`

### Hook (`src/hooks/usePlanGeneration.ts`)

- `refetchInterval` terminal check now includes `'partial'`: stops polling when generation reaches any of `done | partial | timeout | error`

### Component (`src/components/plan/PlanGrid.tsx`)

- `isGenerationComplete` now covers both `'done'` and `'partial'`
- `useEffect` cleanup condition handles `done | partial | timeout | error`

### Migration (`supabase/migrations/028_plan_generations_partial_status.sql`)

- Drops and recreates `plan_generations_status_check` to accept `'partial'` as a valid status value
- Pushed to live Supabase

## Deployment

- Migration 028 pushed via `npx supabase db push` from worktree root — confirmed applied
- Edge function redeployed via `npx supabase functions deploy generate-plan --no-verify-jwt` — confirmed deployed to project `qyablbzodmftobjslgri`
- `npx vite build` succeeded with no TypeScript errors

## Deviations from Plan

None — plan executed exactly as written. The capitalization WIP from `f8d7a8b` was preserved: `pass2Completed = true` was inserted after the existing `suggestedRecipes = parsed.suggestedRecipes` line without disturbing any surrounding code.

## Known Stubs

None. No placeholder data or hardcoded empty values introduced.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes beyond the planned `plan_generations_status_check` constraint update.

## Self-Check: PASSED

- [x] `supabase/migrations/028_plan_generations_partial_status.sql` exists
- [x] `WALL_CLOCK_BUDGET_MS` constant in edge function (`grep` confirmed: line 188)
- [x] No `< 6000` remaining in edge function
- [x] `pass2Completed` and `correctionPassesSkippedForTime` flags present
- [x] `finalStatus = "partial"` branch present
- [x] `'running' | 'done' | 'timeout' | 'partial' | 'error'` in `src/types/database.ts`
- [x] `status === 'partial'` in `src/hooks/usePlanGeneration.ts`
- [x] `activeJob?.status === 'partial'` in both places in `src/components/plan/PlanGrid.tsx`
- [x] Commit 3b77045 exists: `git log --oneline | grep 3b77045` confirmed
- [x] `npx vite build` succeeded (546ms, no errors)
