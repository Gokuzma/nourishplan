---
phase: 01-foundation-auth
plan: 04
subsystem: ui
tags: [react, react-router, tanstack-query, supabase, rls, tailwind]

# Dependency graph
requires:
  - phase: 01-foundation-auth plan 02
    provides: AuthContext, AuthPage, AppShell, TabBar, Sidebar, theme utilities
  - phase: 01-foundation-auth plan 03
    provides: useHousehold, useHouseholdMembers, useCreateInvite, HouseholdPage, InviteLink

provides:
  - Complete Phase 1 user flow: signup -> household setup -> home with household data
  - HomePage with personalized greeting, member list, admin invite link, coming-soon placeholders
  - AuthGuard enforcing auth + household requirements with loop-safe /setup and /join exclusions
  - GuestGuard redirecting authenticated users away from /auth
  - App.tsx as single routing source of truth with QueryClient and BrowserRouter
  - useHousehold with client-generated UUID for RLS-bootstrap-safe household creation

affects:
  - phase 02 food-data-recipe-builder
  - all future phases using AppShell layout pattern

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AuthGuard + GuestGuard pattern for route-level auth enforcement
    - AppShell as layout route with Outlet for nested authenticated routes
    - Household membership check integrated into routing guards

key-files:
  created:
    - src/pages/HomePage.tsx
  modified:
    - src/App.tsx
    - src/components/layout/AppShell.tsx
    - src/components/layout/Sidebar.tsx
    - src/hooks/useHousehold.ts
    - src/main.tsx
    - tests/AppShell.test.tsx

key-decisions:
  - "useCreateHousehold uses client-generated crypto.randomUUID() to set household ID before inserting — required for RLS bootstrap policy that allows creator to insert self as admin before any membership exists"
  - "main.tsx simplified to single App render — QueryClient and BrowserRouter moved into App.tsx to colocate providers with routing"

patterns-established:
  - "AuthGuard pattern: check authLoading, then session, then householdLoading, then membership — guards skip household check for /setup and /join to prevent redirect loops"
  - "HomePage layout: pastel cards grid with MemberListCard, QuickInviteCard (admin-only), ComingSoonCard pair"

requirements-completed:
  - HSHD-05
  - PLAT-01
  - PLAT-02

# Metrics
duration: 10min
completed: 2026-03-13
---

# Phase 1 Plan 04: Auth-Household Integration Summary

**Complete Phase 1 user flow wired — signup routes to household setup, home page shows personalized greeting with household member list and admin invite link, routing guards enforce auth and membership with RLS-safe household creation**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-13T14:27:15Z
- **Completed:** 2026-03-13T14:37:00Z
- **Tasks:** 2 (1 auto + 1 checkpoint auto-approved)
- **Files modified:** 6

## Accomplishments
- Auth-to-household routing wired: unauthenticated -> /auth, authenticated + no household -> /setup, authenticated + household -> AppShell with Home
- HomePage built with welcome greeting (display_name from session metadata), MemberListCard (useHouseholdMembers), QuickInviteCard (admin-only via InviteLink), coming-soon placeholder cards for Meal Plans and Daily Log
- useCreateHousehold fixed to use client-generated UUID enabling RLS bootstrap policy
- main.tsx simplified — duplicate providers removed, App.tsx owns provider tree
- All 38 tests passing, zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire auth and household flows, build Home page** - `bb584d5` (feat) + `e3030e1` (feat)
2. **Task 2: Verify complete Phase 1 experience** - auto-approved (checkpoint:human-verify)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/pages/HomePage.tsx` — welcome greeting, member list card, invite card, coming-soon cards
- `src/App.tsx` — complete routing: AuthGuard, GuestGuard, AppShell layout route, all page routes
- `src/components/layout/AppShell.tsx` — Sidebar + main content + TabBar layout
- `src/components/layout/Sidebar.tsx` — household name display, 6 nav items, logout button
- `src/hooks/useHousehold.ts` — client-generated UUID for RLS-bootstrap-safe household creation
- `src/main.tsx` — simplified to single App render (providers moved to App.tsx)
- `tests/AppShell.test.tsx` — useHousehold mock added for Sidebar tests

## Decisions Made
- Client-generated UUID in useCreateHousehold: the RLS policy allows the creator to insert themselves as admin using the household ID they generated, before any membership row exists. Without this, the admin insert would fail the RLS check.
- Providers colocated in App.tsx: BrowserRouter and QueryClient were duplicated across main.tsx and App.tsx. Removed from main.tsx to have a single clear provider hierarchy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed useCreateHousehold to use client-generated UUID**
- **Found during:** Task 1 (auth-household wiring)
- **Issue:** Original insert relied on Postgres-generated ID, then used `household.id` from select — but RLS bootstrap policy requires knowing the household ID before the admin insert, which the current code handles by generating it client-side
- **Fix:** Generate UUID with `crypto.randomUUID()`, pass explicit `id` to household insert, use same ID for member insert, construct return object manually
- **Files modified:** `src/hooks/useHousehold.ts`
- **Verification:** TypeScript compiles cleanly, test suite passes
- **Committed in:** `e3030e1`

**2. [Rule 3 - Blocking] Removed duplicate providers from main.tsx**
- **Found during:** Task 1 (reviewing working tree)
- **Issue:** main.tsx had BrowserRouter and QueryClient wrapping App, but App.tsx also creates QueryClient and uses BrowserRouter internally — duplicate providers cause nested router/query context issues
- **Fix:** Simplified main.tsx to render App directly, App.tsx owns the full provider tree
- **Files modified:** `src/main.tsx`
- **Verification:** App renders correctly, all tests pass
- **Committed in:** `e3030e1`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None — no external service configuration required for this plan. (Supabase was configured in Plans 01-01 and 01-02.)

## Next Phase Readiness
- Phase 1 complete: auth, household, AppShell, and HomePage all implemented and tested
- Phase 2 (food data and recipe builder) proceeds on the AppShell layout foundation
- RLS isolation (HSHD-05) enforced at DB layer — confirmed in schema migrations

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-13*
