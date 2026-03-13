---
phase: 01-foundation-auth
plan: "03"
subsystem: household
tags: [react, tanstack-query, supabase, routing, household, rls]
dependency_graph:
  requires:
    - vite-react-ts-scaffold
    - supabase-client-singleton
    - phase1-database-types
    - phase1-migration
    - auth-context-provider
  provides:
    - household-hooks
    - household-create-join-flow
    - household-page
    - invite-link-flow
    - member-profile-management
    - app-routing
  affects:
    - all subsequent plans requiring household context
tech_stack:
  added: []
  patterns:
    - TanStack Query v5 useQuery/useMutation wrapping Supabase client (Pattern 5)
    - AuthGuard/GuestGuard components for route-level auth and household checks
    - QueryClientProvider at App root with 5-minute staleTime
    - BrowserRouter with react-router-dom v7
    - maybeSingle() for nullable single-row queries
key_files:
  created:
    - src/hooks/useHousehold.ts
    - src/hooks/useAuth.ts
    - src/pages/HouseholdSetup.tsx
    - src/pages/HouseholdPage.tsx
    - src/components/household/CreateHousehold.tsx
    - src/components/household/JoinHousehold.tsx
    - src/components/household/MemberList.tsx
    - src/components/household/InviteLink.tsx
    - src/components/household/MemberProfileForm.tsx
  modified:
    - src/App.tsx
decisions:
  - "Used maybeSingle() instead of single() for useHousehold to return null when user has no household, avoiding a thrown error on the happy path for new users"
  - "useAuth.ts stub immediately updated to re-export from AuthContext since Plan 02 had already completed; no stub lifecycle needed"
  - "JoinHousehold component accepts full invite URLs or raw tokens to improve UX when users paste full links"
  - "AuthGuard detects /setup and /join routes to avoid redirect loop when household-less user visits those pages"
  - "Added full mutation hooks (useCreateMemberProfile, useUpdateMemberProfile, useDeleteMemberProfile) beyond the plan's useCreateInvite minimum to support MemberProfileForm fully"
metrics:
  duration_seconds: 245
  completed_date: "2026-03-12"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 1
---

# Phase 1 Plan 03: Household System Summary

**One-liner:** TanStack Query hooks for household CRUD with invite-link flow, member list, child profile management, and full react-router-dom v7 routing with AuthGuard/GuestGuard protecting all routes.

## What Was Built

### Task 1: Household hooks and create/join flow

- `src/hooks/useHousehold.ts` — 8 TanStack Query hooks:
  - `useHousehold()` — fetches current user's membership row joined with household name; returns null for new users
  - `useHouseholdMembers()` — fetches all members of the user's household joined with profiles
  - `useCreateHousehold()` — inserts household row + assigns creator as admin; invalidates `['household']`
  - `useJoinHousehold()` — validates invite token (expiry + used_at check), inserts membership as member, marks invite used
  - `useCreateInvite()` — inserts household_invites row and returns the token
  - `useMemberProfiles()` — fetches member_profiles managed by current user
  - `useCreateMemberProfile()` — inserts child/managed member profile
  - `useUpdateMemberProfile()` / `useDeleteMemberProfile()` — edit and remove managed profiles

- `src/hooks/useAuth.ts` — thin re-export from `AuthContext` (Plan 02 already completed when this executed; the original stub was superseded)

- `src/pages/HouseholdSetup.tsx` — two-card layout (Create / Join fork), reads `?invite=` from URL and auto-fills JoinHousehold, navigates to `/` on success

- `src/components/household/CreateHousehold.tsx` — name input + Create button, loading and error states

- `src/components/household/JoinHousehold.tsx` — accepts raw tokens or full invite URLs, pre-fills from `initialToken` prop, error states for expired/already-used/already-member

### Task 2: Household page, member list, invite generation, member profile management, routing

- `src/components/household/MemberList.tsx` — uses `useHouseholdMembers()` and `useMemberProfiles()`; renders members with role badges (Admin/Member), loading skeletons, child profiles with Child badge

- `src/components/household/InviteLink.tsx` — admin-only; generates URL `{origin}/join?invite={token}`, copy-to-clipboard with fallback, expiry note, option to generate a new link

- `src/components/household/MemberProfileForm.tsx` — admin-only; lists managed profiles with inline Edit/Remove; add/edit form with name, is_child toggle, birth_year

- `src/pages/HouseholdPage.tsx` — household name header, Members section, admin-only Invite Link card, admin-only Managed Profiles card

- `src/App.tsx` updated with:
  - `QueryClientProvider` at root with 5-minute staleTime
  - `BrowserRouter` + `AuthProvider` wrapping all routes
  - `AuthGuard` — redirects unauthenticated to `/auth`; redirects household-less users to `/setup` (skips redirect if already on `/setup` or `/join`)
  - `GuestGuard` — redirects authenticated users away from `/auth`
  - Routes: `/auth` (guest), `/setup` (auth), `/join` (auth), `/` (auth+household), `/household` (auth+household), `*` → `/`

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS — zero type errors |
| `npx vitest run` (auth.test.ts, AuthContext.test.tsx) | PASS — 11 tests pass |
| AppShell.test.tsx, theme.test.ts | Pre-existing failures from Plan 02 missing deliverables (TabBar, Sidebar, src/utils/theme) — out of scope |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added update and delete mutations for member profiles**
- **Found during:** Task 2 (MemberProfileForm requires edit and delete operations)
- **Issue:** Plan specified `useMutation to insert into member_profiles` but MemberProfileForm needs update and delete to fulfill the "Edit and delete existing managed profiles" done criterion
- **Fix:** Added `useUpdateMemberProfile()` and `useDeleteMemberProfile()` hooks alongside the required `useCreateMemberProfile()`
- **Files modified:** `src/hooks/useHousehold.ts`
- **Commit:** 3ef4358

**2. [Rule 2 - Missing functionality] JoinHousehold accepts full invite URLs**
- **Found during:** Task 1
- **Issue:** Users copying the full invite URL (e.g. `https://app.example.com/join?invite=abc123`) would fail because only raw tokens were handled
- **Fix:** Added URL parsing to extract token from `?invite=` parameter if a full URL is pasted
- **Files modified:** `src/components/household/JoinHousehold.tsx`
- **Commit:** 3ef4358

### Plan 02 Parallel Execution

- AuthContext was already built when Plan 03 executed (both Wave 2, Plan 02 completed first)
- The `useAuth.ts` stub was immediately superseded; it was updated to re-export from `contexts/AuthContext` without any code duplication

### Pre-existing Test Failures (Deferred)

`AppShell.test.tsx` and `theme.test.ts` fail due to missing `src/components/layout/TabBar`, `src/components/layout/Sidebar`, and `src/utils/theme` — these are Plan 02 deliverables not yet built. Logged in deferred-items.md.

## Self-Check: PASSED

- `src/hooks/useHousehold.ts` — FOUND
- `src/hooks/useAuth.ts` — FOUND
- `src/pages/HouseholdSetup.tsx` — FOUND
- `src/pages/HouseholdPage.tsx` — FOUND
- `src/components/household/CreateHousehold.tsx` — FOUND
- `src/components/household/JoinHousehold.tsx` — FOUND
- `src/components/household/MemberList.tsx` — FOUND
- `src/components/household/InviteLink.tsx` — FOUND
- `src/components/household/MemberProfileForm.tsx` — FOUND
- Task 1 commit 3ef4358 — verified
- Task 2 commit 9a64767 — verified
