---
phase: 01-foundation-auth
plan: 05
subsystem: auth-household
tags: [rls, react-query, auth, household, invite, cache]
dependency_graph:
  requires: [01-01, 01-02, 01-03, 01-04]
  provides: [invite-join-rls, user-scoped-query-keys, cache-clear-on-signout]
  affects: [household-join-flow, user-switching]
tech_stack:
  added: []
  patterns: [security-definer-rls-helper, tanstack-query-user-scoped-keys]
key_files:
  created:
    - supabase/migrations/005_fix_invite_join_rls.sql
  modified:
    - src/hooks/useHousehold.ts
    - src/contexts/AuthContext.tsx
    - tests/AuthContext.test.tsx
decisions:
  - "has_valid_invite() security-definer helper avoids RLS recursion when checking household_invites from a household_members policy"
  - "invalidateQueries calls for member_profiles updated to use ['household'] prefix since user.id is now second segment"
  - "AuthContext tests wrapped in QueryClientProvider after useQueryClient() was added to AuthProvider"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-13"
  tasks_completed: 2
  files_changed: 4
---

# Phase 1 Plan 5: UAT Gap Closure — Invite Join RLS and Cache Stale Data Summary

One-liner: RLS invite-join policy with security-definer helper and user-scoped React Query cache keys with signOut clear.

## What Was Built

Two UAT-identified gaps in Phase 1 fixed:

1. **RLS 403 on invite join** — A new migration adds a `has_valid_invite()` security-definer function that checks `household_invites` without triggering RLS recursion, and an `invite_join_as_member` INSERT policy on `household_members` that allows authenticated users to self-insert as `member` when a valid unexpired invite exists.

2. **Stale cache after signOut** — All household-related query keys now include `session?.user.id` as the second segment so different users get isolated cache entries. `AuthContext.signOut()` calls `queryClient.clear()` before `setSession(null)` to purge all cached data on logout.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add RLS policy for invite-based self-join | 9edc271 | supabase/migrations/005_fix_invite_join_rls.sql |
| 2 | Fix stale cache on signOut + user-scoped query keys | 8bd0c00 | src/hooks/useHousehold.ts, src/contexts/AuthContext.tsx, tests/AuthContext.test.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AuthContext tests broke after adding useQueryClient()**
- **Found during:** Task 2 verification
- **Issue:** All four AuthContext tests failed with "No QueryClient set, use QueryClientProvider to set one" because tests rendered `AuthProvider` without a `QueryClientProvider` wrapper.
- **Fix:** Added `createWrapper()` helper to `tests/AuthContext.test.tsx` that creates a fresh `QueryClient` per test and returns a `QueryClientProvider` wrapper. Added `{ wrapper: createWrapper() }` to all four `render()` calls.
- **Files modified:** tests/AuthContext.test.tsx
- **Commit:** 8bd0c00

**2. [Rule 2 - Missing] invalidateQueries prefix mismatch for member_profiles**
- **Found during:** Task 2 implementation
- **Issue:** Three `invalidateQueries({ queryKey: ['household', 'member_profiles'] })` calls would no longer match the new key structure `['household', userId, 'member_profiles', householdId]` since userId is now the second segment.
- **Fix:** Updated all three calls to use `['household']` prefix which correctly invalidates all household queries.
- **Files modified:** src/hooks/useHousehold.ts
- **Commit:** 8bd0c00

## Verification

- `grep "invite_join_as_member" supabase/migrations/005_fix_invite_join_rls.sql` — policy exists
- `grep "session?.user.id" src/hooks/useHousehold.ts` — user ID in query keys (3 query hooks)
- `grep "queryClient.clear" src/contexts/AuthContext.tsx` — cache cleared on signOut
- `npx vitest run` — 38/38 tests pass, 0 failures

## Self-Check: PASSED
