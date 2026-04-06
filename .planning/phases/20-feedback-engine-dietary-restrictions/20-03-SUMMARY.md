---
phase: 20-feedback-engine-dietary-restrictions
plan: 03
subsystem: dietary-restrictions
tags: [hooks, ui, edge-function, dietary, settings, ai]
dependency_graph:
  requires:
    - supabase/migrations/024_feedback_dietary.sql (Plan 01)
    - src/types/database.ts DietaryRestriction, WontEatEntry (Plan 01)
    - src/lib/queryKeys.ts restrictions, wontEat factories (Plan 01)
  provides:
    - src/hooks/useDietaryRestrictions.ts (useRestrictions, useSaveRestrictions)
    - src/hooks/useWontEat.ts (useWontEatEntries, useAddWontEat, useUpdateWontEatStrength, useRemoveWontEat)
    - src/components/settings/DietaryRestrictionsSection.tsx
    - src/components/settings/WontEatSection.tsx
    - supabase/functions/classify-restrictions/index.ts
  affects:
    - src/pages/SettingsPage.tsx (added dietary/won't-eat per member)
    - Phase 22 planning engine (consumes dietary_restrictions, wont_eat_entries)
tech_stack:
  added: []
  patterns:
    - useMutation fire-and-forget for async AI classification (no await, catch silently)
    - Segmented control for three-tier preference strength (dislikes/refuses/allergy)
    - Edge Function validates memberId belongs to household before writing (T-20-07 mitigation)
    - useMemberProfiles used in SettingsPage to render per-child-profile sections
key_files:
  created:
    - src/hooks/useDietaryRestrictions.ts
    - src/hooks/useWontEat.ts
    - src/components/settings/DietaryRestrictionsSection.tsx
    - src/components/settings/WontEatSection.tsx
    - supabase/functions/classify-restrictions/index.ts
  modified:
    - src/pages/SettingsPage.tsx
decisions:
  - "classify-restrictions validates memberId against household_members/member_profiles before writing — implements T-20-07 spoofing mitigation from threat model"
  - "fire-and-forget via .catch(() => {}) — classification errors are non-blocking per research anti-pattern guidance"
  - "useSaveRestrictions accepts predefined+customEntries but passes them to mutation separately from householdId to keep cache invalidation simple via prefix array"
  - "WontEatSection uses immediate mutation on strength button click — no separate save button per plan spec (D-15)"
  - "SettingsPage child profiles section uses separate section card for member profiles vs inline with auth user"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_modified: 6
requirements:
  - FEED-02
  - FEED-03
---

# Phase 20 Plan 03: Dietary Restrictions & Won't-Eat UI Summary

**One-liner:** React hooks and Settings UI for per-member dietary restrictions with predefined checkboxes + custom entries, three-tier won't-eat list, and AI Edge Function that maps restrictions to ingredients asynchronously.

## What Was Built

All dietary preference capture features are now live in Settings:

- **`useDietaryRestrictions.ts`** — `useRestrictions` queries a member's dietary restriction record via `maybeSingle()`; `useSaveRestrictions` upserts and then fire-and-forgets the `classify-restrictions` Edge Function
- **`useWontEat.ts`** — four hooks covering the full won't-eat CRUD lifecycle: query entries ordered by creation date, add with default `dislikes` strength, update strength, and remove
- **`classify-restrictions` Edge Function** — validates the requesting member belongs to the household, calls `claude-haiku-4-5` with a structured classification prompt, and upserts AI-suggested won't-eat entries with `source: 'ai_restriction'`; returns HTTP 200 on all outcomes (non-blocking)
- **`DietaryRestrictionsSection`** — checkbox grid (2-col mobile, 3-col desktop) for 8 predefined categories, dismissible custom entry pills, save button, and 5-second "Mapping ingredients in the background..." notice after save
- **`WontEatSection`** — add-food row, entry list with food name + three-tier segmented control + remove button; AI-sourced entries show `(auto)` badge; empty state guides user
- **SettingsPage** — imports `useMemberProfiles` and renders both sections for the auth user and for each child member profile in a dedicated "Member Dietary Preferences" card

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Restriction/won't-eat hooks + AI Edge Function | f87cde7 | useDietaryRestrictions.ts, useWontEat.ts, classify-restrictions/index.ts |
| 2 | DietaryRestrictionsSection + WontEatSection + SettingsPage integration | 1a05b8b | DietaryRestrictionsSection.tsx, WontEatSection.tsx, SettingsPage.tsx |

## Verification Results

- All 14 acceptance criteria checks pass (grep counts = 1 or 3 where multiple renders expected)
- `npx vitest run` — 5 files failed / 17 passed — identical to base commit; no regressions
- Pre-existing failures: theme.test.ts (localStorage mock), auth.test.ts (Router context), AuthContext.test.tsx (getUser mock), useFoodSearch-scoring.test.ts (missing VITE_SUPABASE_URL in test env)
- SettingsPage renders `DietaryRestrictionsSection` and `WontEatSection` for both auth user (`memberType="user"`) and each child profile (`memberType="profile"`)

## Deviations from Plan

None — plan executed exactly as written.

The plan specified `onConflict` matching "the unique index on member" — implemented with dynamic column string `household_id,member_user_id` or `household_id,member_profile_id` based on `memberType`, which matches the unique indexes created in migration 024.

## Known Stubs

None. All data flows are wired: hooks query real tables, components use real hooks, Edge Function writes real `wont_eat_entries`. The `wont_eat_entries.test.ts` Wave 0 stubs from Plan 01 remain as `it.todo()` — these are intentional placeholders for Plan 02's hook test implementation and do not block this plan's goal.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: spoofing | supabase/functions/classify-restrictions/index.ts | New Edge Function endpoint that writes wont_eat_entries via service role — mitigated by household membership validation before write (T-20-07) |

T-20-07 mitigation implemented: `classify-restrictions` queries `household_members` (for `user` type) or `member_profiles` (for `profile` type) and returns early if `memberId` is not found in the caller's household before calling Anthropic or writing any rows.

## Self-Check: PASSED

- `src/hooks/useDietaryRestrictions.ts` — FOUND
- `src/hooks/useWontEat.ts` — FOUND
- `src/components/settings/DietaryRestrictionsSection.tsx` — FOUND
- `src/components/settings/WontEatSection.tsx` — FOUND
- `supabase/functions/classify-restrictions/index.ts` — FOUND
- `src/pages/SettingsPage.tsx` contains `DietaryRestrictionsSection` — FOUND
- `src/pages/SettingsPage.tsx` contains `WontEatSection` — FOUND
- Commit f87cde7 — FOUND
- Commit 1a05b8b — FOUND
