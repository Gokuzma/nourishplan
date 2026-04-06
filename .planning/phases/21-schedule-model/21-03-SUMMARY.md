---
plan: 21-03
title: Push schedule migration to production
status: complete
started: 2026-04-06T18:25:00Z
completed: 2026-04-06T18:25:30Z
---

## What was built

Pushed `025_schedule.sql` migration to the production Supabase database using `supabase db push`. This created:

- `member_schedule_slots` table with RLS policies
- `member_schedule_exceptions` table with RLS policies
- Partial unique indexes for user/profile member types

## Key files

No new files — migration was already created in Plan 21-01.

## Deviations

- Migration push was executed during the Plan 21-02 checkpoint verification when we discovered the save feature wasn't working because the tables didn't exist yet.
- Also discovered and fixed a bug: Supabase `onConflict` doesn't work with partial unique indexes. Switched `useSaveSchedule` to delete-then-insert strategy (committed separately).

## Self-Check: PASSED

Migration applied successfully. Save-reload cycle verified via Playwright with test account.
