---
phase: 07-fix-auth-household-gaps
plan: 01
subsystem: auth
tags: [react, supabase, react-router, typescript, vitest]

requires:
  - phase: 01-foundation-auth
    provides: AuthPage styling pattern, supabase client, App.tsx route structure, useHousehold hook

provides:
  - ResetPasswordPage component with PASSWORD_RECOVERY event handling and 10s expiry timeout
  - /auth/reset-password route wired outside AuthGuard and GuestGuard
  - week_start_day: 0 in useCreateHousehold return satisfying Household interface
  - Smoke tests for ResetPasswordPage (loading state and form reveal)

affects: [auth, household]

tech-stack:
  added: []
  patterns:
    - ResetPasswordPage uses onAuthStateChange PASSWORD_RECOVERY event gate before showing form
    - Public utility route placed outside all guards in App.tsx AppRoutes

key-files:
  created:
    - src/pages/ResetPasswordPage.tsx
    - tests/ResetPasswordPage.test.tsx
  modified:
    - src/App.tsx
    - src/hooks/useHousehold.ts

key-decisions:
  - "ResetPasswordPage placed outside AuthGuard and GuestGuard — user arrives with temporary session token, guards would incorrectly redirect"
  - "week_start_day: 0 added to useCreateHousehold return to satisfy Household interface (Sunday DB default)"
  - "10-second timeout on PASSWORD_RECOVERY wait shows expiry message with /auth link — avoids infinite spinner"

patterns-established:
  - "Public auth-flow pages (reset password, email confirm) placed in public utility route group outside all guards"

requirements-completed: [AUTH-04, HSHD-01]

duration: 15min
completed: 2026-03-15
---

# Phase 7 Plan 01: Auth Reset Route and Household Type Fix Summary

**Password reset page with PASSWORD_RECOVERY event gate wired to /auth/reset-password, plus week_start_day type fix on useCreateHousehold**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-15T11:30:00Z
- **Completed:** 2026-03-15T11:47:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created ResetPasswordPage with loading state, 10-second expiry timeout, and password form that appears after PASSWORD_RECOVERY event
- Wired /auth/reset-password route in App.tsx outside AuthGuard and GuestGuard so the temporary session token is not rejected
- Fixed useCreateHousehold return to include week_start_day: 0 satisfying the Household TypeScript interface
- Added smoke tests verifying loading state renders and password form appears after PASSWORD_RECOVERY event

## Task Commits

1. **Task 1: Create ResetPasswordPage and wire route** - `d1001d7` (feat)
2. **Task 2: Fix useCreateHousehold return type and add smoke tests** - `770f38d` (fix)

## Files Created/Modified

- `src/pages/ResetPasswordPage.tsx` - Password reset form page with onAuthStateChange gate and expiry timeout
- `src/App.tsx` - Added import and /auth/reset-password route in public utility group
- `src/hooks/useHousehold.ts` - Added week_start_day: 0 to useCreateHousehold return object
- `tests/ResetPasswordPage.test.tsx` - Smoke tests: loading state renders, form appears on PASSWORD_RECOVERY

## Decisions Made

- Route placed outside both AuthGuard and GuestGuard: the password reset email link delivers a temporary session token — GuestGuard would redirect away, AuthGuard would redirect to /setup
- week_start_day: 0 (Sunday) matches the Postgres column default
- 10-second timeout avoids infinite "Verifying..." spinner when the link is stale or invalid

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AUTH-04 (reset password route) and HSHD-01 (week_start_day type) gaps are closed
- Full vitest suite passes (86 tests, 10 test files)
- TypeScript compiles clean

---
*Phase: 07-fix-auth-household-gaps*
*Completed: 2026-03-15*
