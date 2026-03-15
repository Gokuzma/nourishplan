---
phase: 08-v1-1-ui-polish-and-usability-improvements
plan: 01
subsystem: database
tags: [postgres, supabase, rls, typescript, migrations]

# Dependency graph
requires:
  - phase: 07-fix-auth-household-gaps
    provides: Stable auth and household foundation with RLS fixes

provides:
  - custom_foods.portions jsonb column for user-defined measurement units
  - nutrition_targets.macro_mode column (grams | percent) for display preference
  - Profiles household-member RLS policy for cross-member visibility
  - Households admin UPDATE RLS policy for household renaming
  - Profiles self-update RLS policy (idempotent recreate)
  - TypeScript types synced to all new DB columns

affects: [08-02, 08-03, 08-04, 08-05, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DROP POLICY IF EXISTS before CREATE POLICY for idempotent policy management
    - ADD COLUMN IF NOT EXISTS for safe incremental migrations

key-files:
  created:
    - supabase/migrations/014_v1_1_polish.sql
  modified:
    - src/types/database.ts

key-decisions:
  - "Used DROP POLICY IF EXISTS before recreating 'users update own profile' since 001_foundation.sql already defines it — ensures migration is idempotent on fresh deployments"
  - "macro_mode CHECK constraint enforces DB-level validity (grams | percent) — no application-layer enforcement needed"
  - "portions column defaults to empty array '[]'::jsonb — existing custom foods unaffected, no backfill needed"

patterns-established:
  - "Additive migrations: use IF NOT EXISTS / IF EXISTS guards for all schema changes"

requirements-completed: [POLISH-01, POLISH-05, POLISH-09, POLISH-10]

# Metrics
duration: 1min
completed: 2026-03-15
---

# Phase 8 Plan 01: v1.1 Polish Schema Foundation Summary

**Postgres migration adding custom_foods.portions (jsonb), nutrition_targets.macro_mode (grams|percent), and three RLS policies for household member visibility and admin household editing, with TypeScript types synced.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-15T17:46:16Z
- **Completed:** 2026-03-15T17:47:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Migration 014 created with 2 ALTER TABLE and 3 CREATE POLICY statements covering all Phase 8 schema needs
- TypeScript types updated: `portions` on `CustomFood`, `macro_mode` on `NutritionTarget`
- `Profile` type already had `display_name` and `avatar_url` — confirmed, no change needed
- TypeScript compiler passes cleanly with no errors after type additions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 014_v1_1_polish.sql** - `a28d746` (feat)
2. **Task 2: Update TypeScript types for new DB columns** - `c29775c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `supabase/migrations/014_v1_1_polish.sql` - Phase 8 schema foundation: portions column, macro_mode column, 3 RLS policies
- `src/types/database.ts` - Added `portions` to `CustomFood`, `macro_mode` to `NutritionTarget`

## Decisions Made
- Used `DROP POLICY IF EXISTS` before recreating the profiles UPDATE policy since `001_foundation.sql` already defines it — prevents duplicate policy error and keeps migration idempotent on fresh deployments.
- `macro_mode` CHECK constraint (grams | percent) enforced at the DB level — downstream code can trust the value without extra validation.
- `portions` defaults to `'[]'::jsonb` — safe for existing rows, no backfill needed.

## Deviations from Plan

None - plan executed exactly as written.

(Minor: the plan's Task 1 item 5 would have failed on existing deployments due to the pre-existing policy from migration 001. Added `DROP POLICY IF EXISTS` before the `CREATE POLICY` to make it idempotent. This is a correctness fix within the task, not a scope change.)

## Issues Encountered
None.

## User Setup Required
Migration 014 must be applied to the Supabase project before downstream Phase 8 plans are deployed. Run via the Supabase Dashboard SQL editor or `supabase db push`.

## Next Phase Readiness
- All schema changes for Phase 8 are in place
- TypeScript types are fully synced — downstream plans can use `portions` and `macro_mode` immediately
- Plans 08-02 through 08-06 can proceed without migration dependencies

---
*Phase: 08-v1-1-ui-polish-and-usability-improvements*
*Completed: 2026-03-15*
