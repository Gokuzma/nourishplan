---
phase: 21-schedule-model
plan: "01"
subsystem: schedule
tags: [schedule, settings, migration, hooks, ui]
dependency_graph:
  requires: []
  provides: [member_schedule_slots, ScheduleSection, useSchedule, useSaveSchedule]
  affects: [src/pages/SettingsPage.tsx, src/lib/queryKeys.ts, src/types/database.ts]
tech_stack:
  added: []
  patterns: [TDD red-green, upsert-onConflict, partial-unique-index, XOR-member-constraint]
key_files:
  created:
    - supabase/migrations/025_schedule.sql
    - src/utils/schedule.ts
    - src/hooks/useSchedule.ts
    - src/components/settings/ScheduleSection.tsx
    - tests/schedule.test.ts
  modified:
    - src/types/database.ts
    - src/lib/queryKeys.ts
    - src/pages/SettingsPage.tsx
decisions:
  - "Separate partial unique indexes (WHERE member_user_id IS NOT NULL / WHERE member_profile_id IS NOT NULL) used instead of coalesce expression index — Supabase upsert onConflict requires simple column references, not expressions"
  - "useSaveSchedule builds all 28 rows (7 days x 4 slots) on every save — full upsert is simpler than diffing and avoids orphaned rows for un-toggled cells"
  - "weekStartDay passed from membership.households.week_start_day in SettingsPage — avoids a separate useHousehold call in ScheduleSection itself"
metrics:
  duration_seconds: 199
  completed_at: "2026-04-06T18:06:46Z"
  tasks_completed: 2
  files_changed: 8
---

# Phase 21 Plan 01: Schedule Data Layer and Grid Picker UI Summary

One-liner: DB migration with two RLS-protected schedule tables, TypeScript types, TDD-verified utilities, hooks, and a 7x4 tap-to-cycle grid picker component integrated into SettingsPage.

## What Was Built

**DB migration** (`025_schedule.sql`): Two tables — `member_schedule_slots` (recurring weekly pattern) and `member_schedule_exceptions` (date-specific overrides). Both have XOR member constraint (exactly one of member_user_id or member_profile_id), CHECK constraints on status and day_of_week, separate partial unique indexes for upsert onConflict routing, and full RLS (SELECT/INSERT/UPDATE/DELETE) following the Phase 20 dietary_restrictions pattern.

**Types** (`src/types/database.ts`): Added `ScheduleStatus` union type and `MemberScheduleSlot`, `MemberScheduleException` interfaces.

**Query keys** (`src/lib/queryKeys.ts`): Added `schedule.forMember` and `schedule.exceptionsForMember` factory functions.

**Utilities** (`src/utils/schedule.ts`): `buildGrid` converts DB rows to a `Map<string, ScheduleStatus>` keyed by `"day:slot"`. `cycleStatus` advances through the prep → consume → quick → away → prep cycle. `getOrderedDays` returns 7 ordered day indices from a given week start.

**Tests** (`tests/schedule.test.ts`): 10 unit tests covering all utility functions — TDD green.

**Hooks** (`src/hooks/useSchedule.ts`): `useSchedule` query fetches member slots by user or profile column. `useSaveSchedule` mutation upserts all 28 rows with the correct onConflict column for partial index routing.

**ScheduleSection** (`src/components/settings/ScheduleSection.tsx`): 7-column x 4-row grid picker with overflow-x-auto for mobile. Day headers ordered by weekStartDay. Each cell is a button with 44px min-height, aria-label, role=gridcell. Status-specific Tailwind classes per UI-SPEC. Save button with pending state.

**SettingsPage integration**: ScheduleSection added after WontEatSection for the current user and after each managed member profile's WontEatSection.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — ScheduleSection reads from and writes to the live member_schedule_slots table via useSchedule/useSaveSchedule hooks.

## Threat Flags

No new threat surface beyond what the plan's threat model covered. All T-21-01 through T-21-05 mitigations are in place in the migration.

## Self-Check

Checking created files and commits...

## Self-Check: PASSED

All 5 created files verified on disk. Both task commits (ec9a0c4, 20a5acf) present in git log.
