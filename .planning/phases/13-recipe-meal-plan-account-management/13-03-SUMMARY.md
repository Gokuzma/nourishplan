---
phase: 13-recipe-meal-plan-account-management
plan: "03"
subsystem: account-management
tags: [edge-function, settings, account-deletion, danger-zone, admin-transfer]
dependency_graph:
  requires: [13-00]
  provides: [ACCTM-01-delete-account-edge-function, ACCTM-01-danger-zone-ui]
  affects: [src/pages/SettingsPage.tsx, supabase/functions/delete-account/index.ts]
tech_stack:
  added: []
  patterns: [Supabase Edge Function with service_role key, multi-step modal with typed confirmation]
key_files:
  created:
    - supabase/functions/delete-account/index.ts
  modified:
    - src/pages/SettingsPage.tsx
decisions:
  - "User ID always extracted from JWT via adminClient.auth.getUser(), never from request body — prevents privilege escalation"
  - "Household deleted before auth user to ensure FK cascades clean up all child data first"
  - "householdDisplayName derived inline (not from householdName state) to avoid conflict with existing householdName edit state variable"
metrics:
  duration: 334s
  completed_date: "2026-03-16T01:08:23Z"
  tasks: 2
  files: 2
requirements:
  - ACCTM-01
---

# Phase 13 Plan 03: Account Deletion — Edge Function and Danger Zone UI Summary

Account deletion implemented via a new Supabase Edge Function (`delete-account`) that uses service_role key for admin auth operations, paired with a Danger Zone section in SettingsPage supporting three deletion flows (admin transfer, last member, non-admin) all requiring typed "DELETE" confirmation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Edge function for account deletion with admin transfer | 96a4ec7 | supabase/functions/delete-account/index.ts |
| 2 | SettingsPage Danger Zone with admin transfer and typed confirmation | 19aed57 | src/pages/SettingsPage.tsx |

## What Was Built

### Edge Function (`supabase/functions/delete-account/index.ts`)

- Extracts user ID from JWT via `adminClient.auth.getUser()` — never from request body
- Reads `newAdminUserId` from request body (only safe field to accept)
- Three deletion scenarios:
  - Last member: deletes household first (triggers FK cascade for all child data — recipes, meals, food_logs, custom_foods)
  - Admin with other members: transfers admin role to `newAdminUserId`, then removes own membership
  - Non-admin: removes own membership directly
- Auth user deletion via `adminClient.auth.admin.deleteUser(userId)` cascades profiles table via FK
- CORS headers match existing edge function pattern
- Full error handling with appropriate HTTP status codes at each step

### SettingsPage Danger Zone

- "Danger Zone" section with red border at bottom of Settings, below Account section
- "Delete my account" button opens a two-step modal
- Admin flow (admin + other members): Step 1 picks new admin from member list, Step 2 types DELETE
- Last member flow: Step 1 skipped, Step 2 shows household deletion warning with household name
- Non-admin flow: Step 1 skipped, Step 2 direct confirmation
- DELETE typed confirmation: final button disabled until `deleteConfirmText === 'DELETE'`
- Calls `supabase.functions.invoke('delete-account', { body: { newAdminUserId } })` then `signOut()`
- Modal: backdrop blur, bottom sheet on mobile / centered on desktop, dismissible while not deleting

## Decisions Made

- User ID always extracted from JWT (never body) to prevent privilege escalation attacks
- Household deleted before auth user so FK cascade order is correct (child data cleaned before user row)
- `householdDisplayName` used as derived variable name (not `householdName`) to avoid collision with existing edit form state

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `supabase/functions/delete-account/index.ts` exists
- [x] Contains `auth.admin.deleteUser` call
- [x] Contains `authHeader = req.headers.get('Authorization')`
- [x] Contains `SUPABASE_SERVICE_ROLE_KEY`
- [x] SettingsPage contains "Danger Zone" heading with `text-red-600`
- [x] SettingsPage contains `deleteConfirmText !== 'DELETE'` check
- [x] SettingsPage contains `supabase.functions.invoke('delete-account'`
- [x] SettingsPage imports `useHouseholdMembers`
- [x] SettingsPage contains "Transfer admin before leaving" heading
- [x] Commits 96a4ec7 and 19aed57 exist

## Self-Check: PASSED
