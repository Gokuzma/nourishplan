---
phase: 20-feedback-engine-dietary-restrictions
plan: 01
subsystem: feedback-engine
tags: [database, migration, types, query-keys, monotony-detection, tdd]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/024_feedback_dietary.sql
    - src/types/database.ts (RecipeRating, DietaryRestriction, WontEatEntry, AIRecipeTag)
    - src/lib/queryKeys.ts (ratings, restrictions, wontEat, aiTags, insights factories)
    - src/utils/monotonyDetection.ts (detectMonotony)
  affects:
    - All Phase 20 plans (depend on these tables and types)
    - Phase 22 planning engine (consumes ratings + restrictions)
    - Phase 24 dynamic portioning (consumes feedback history)
tech_stack:
  added: []
  patterns:
    - Dual-nullable FK CHECK constraint for member identity (matches nutrition_targets pattern)
    - Member-scoped RLS with EXISTS subquery for parent→child writes
    - get_user_household_id() household isolation on all new tables
    - TanStack Query key factories following existing pattern
    - UTC date arithmetic for rolling window (consistent with getWeekStart)
key_files:
  created:
    - supabase/migrations/024_feedback_dietary.sql
    - src/utils/monotonyDetection.ts
    - src/utils/monotonyDetection.test.ts
    - src/lib/queryKeys.test.ts
    - tests/ratings.test.ts
    - tests/restrictions.test.ts
    - tests/wontEat.test.ts
  modified:
    - src/types/database.ts
    - src/lib/queryKeys.ts
decisions:
  - "Migration numbered 024 (skips 023 which belongs to Phase 19 DnD locked slots — that migration was on main but not in this worktree's base)"
  - "ai_recipe_tags has no UPDATE policy (tags are regenerated, not edited in place)"
  - "detectMonotony uses threshold > 2 (not >= 2) — 2 appearances is acceptable, 3+ is monotony"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_modified: 9
requirements:
  - FEED-01
  - FEED-02
  - FEED-03
  - FEED-04
---

# Phase 20 Plan 01: DB Foundation, Types, Query Keys, Monotony Detection Summary

**One-liner:** Supabase migration 024 with 4 new feedback/restriction tables + RLS, TypeScript interfaces, TanStack Query key factories, and TDD-tested monotony detection utility.

## What Was Built

All downstream Phase 20 plans now have:
- A Postgres migration creating `recipe_ratings`, `dietary_restrictions`, `wont_eat_entries`, and `ai_recipe_tags` with correct constraints, indexes, and RLS policies
- TypeScript interfaces for all four new tables plus Database.Tables entries
- TanStack Query key factories: `ratings`, `restrictions`, `wontEat`, `aiTags`, `insights`
- A pure `detectMonotony` function with rolling 2-week window logic and 5 passing unit tests
- Wave 0 test stubs for the `useRatings`, `useDietaryRestrictions`, and `useWontEat` hooks (to be filled in Plan 02)

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | DB migration, TypeScript types, query key factories | 93b0e83 | 024_feedback_dietary.sql, database.ts, queryKeys.ts |
| 2 | Monotony detection utility and Wave 0 test stubs | 5b6ed86 | monotonyDetection.ts, monotonyDetection.test.ts, tests/ratings.test.ts, tests/restrictions.test.ts, tests/wontEat.test.ts |

## Verification Results

- `npx vitest run src/utils/monotonyDetection.test.ts` — 5/5 passed
- `grep -c "create table" supabase/migrations/024_feedback_dietary.sql` — 4
- `grep -c "ENABLE ROW LEVEL SECURITY" supabase/migrations/024_feedback_dietary.sql` (case-insensitive) — 4
- All 4 TypeScript interfaces exported from `src/types/database.ts`
- All 5 query key factories present in `src/lib/queryKeys.ts`

## Deviations from Plan

None — plan executed exactly as written.

The plan referenced `supabase/migrations/023_dnd_locked_slots.sql` in `read_first` for Task 1, but that file belongs to Phase 19 and was not present in this worktree's base commit. This had no impact — the grocery list migration (022) provided sufficient RLS pattern reference.

## Known Stubs

Wave 0 test stubs in `tests/ratings.test.ts`, `tests/restrictions.test.ts`, and `tests/wontEat.test.ts` contain only `it.todo()` entries. These are intentional placeholders to be implemented in Plan 02 when the corresponding hooks are built.

## Threat Surface Scan

No new network endpoints introduced. Migration 024 adds four tables — all follow established household-scoped RLS patterns with `get_user_household_id()`. Member-scoped write policies use EXISTS subqueries matching the food_logs pattern. No new trust boundaries.

## Self-Check: PASSED

- `supabase/migrations/024_feedback_dietary.sql` — FOUND
- `src/types/database.ts` contains `export interface RecipeRating` — FOUND
- `src/types/database.ts` contains `export interface DietaryRestriction` — FOUND
- `src/types/database.ts` contains `export interface WontEatEntry` — FOUND
- `src/types/database.ts` contains `export interface AIRecipeTag` — FOUND
- `src/lib/queryKeys.ts` contains `ratings:` — FOUND
- `src/lib/queryKeys.ts` contains `wontEat:` — FOUND
- `src/utils/monotonyDetection.ts` — FOUND
- `src/utils/monotonyDetection.test.ts` (5 tests passing) — FOUND
- Commit 93b0e83 — FOUND
- Commit 5b6ed86 — FOUND
