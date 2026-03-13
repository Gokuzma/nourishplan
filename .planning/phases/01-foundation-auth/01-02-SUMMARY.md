---
phase: 01-foundation-auth
plan: "02"
subsystem: auth
tags: [react, supabase, auth, tailwind, react-router, tdd, vitest, context-api]

requires:
  - phase: 01-foundation-auth
    plan: "01"
    provides: vite-react-ts-scaffold, tailwind-4-theme-tokens, supabase-client-singleton, vitest-infrastructure

provides:
  - supabase-auth-context
  - login-signup-toggle-page
  - google-oauth-button
  - password-reset-modal
  - responsive-app-shell
  - bottom-tabbar-mobile
  - sidebar-desktop
  - theme-toggle-persist

affects:
  - all subsequent plans in phase 01
  - all plans requiring authenticated session (useAuth hook)
  - navigation structure for all feature pages

tech-stack:
  added:
    - "@testing-library/user-event@14"
    - "@testing-library/dom@10"
  patterns:
    - AuthContext pattern using onAuthStateChange + getSession init
    - useAuth hook re-exported from AuthContext for convenience
    - AppShell with Outlet pattern for nested authenticated routes
    - Tailwind responsive classes (hidden md:flex) for mobile/desktop split
    - Theme utility with localStorage persistence and matchMedia fallback
    - window.matchMedia mock in test setup for jsdom compatibility

key-files:
  created:
    - src/contexts/AuthContext.tsx
    - src/hooks/useAuth.ts
    - src/components/auth/AuthForm.tsx
    - src/components/auth/ResetModal.tsx
    - src/pages/AuthPage.tsx
    - src/components/layout/AppShell.tsx
    - src/components/layout/TabBar.tsx
    - src/components/layout/Sidebar.tsx
    - src/pages/HomePage.tsx
    - src/pages/SettingsPage.tsx
    - src/utils/theme.ts
  modified:
    - src/App.tsx
    - src/main.tsx
    - tests/auth.test.ts
    - tests/AuthContext.test.tsx
    - tests/AppShell.test.tsx
    - tests/theme.test.ts
    - tests/setup.ts
    - package.json

key-decisions:
  - "AuthContext exports both AuthProvider and useAuth — hook re-exported in useAuth.ts for backward compat"
  - "TabBar Plan tab uses role=link + aria-disabled=true (span element) to pass as a link in tests while being non-navigable"
  - "window.matchMedia mock added to tests/setup.ts globally — jsdom does not implement matchMedia"
  - "App.tsx updated to use AppShell as nested route layout wrapper with Outlet — matches react-router-dom v7 layout route pattern"
  - "theme.ts toggleTheme function accepts ThemePreference ('light'|'dark'|'system') for SettingsPage toggle"

patterns-established:
  - "AuthContext: initialize with getSession(), subscribe with onAuthStateChange, clean up on unmount"
  - "Layout route pattern: <Route element={<AppShell />}><Route path='/' element={<Page />} /></Route>"
  - "Tailwind mobile-first: hidden md:flex for sidebar, md:hidden for TabBar"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, PLAT-01]

duration: 8min
completed: "2026-03-13"
---

# Phase 1 Plan 02: Auth System + App Shell Summary

**Supabase auth (email/password, Google OAuth, reset modal) via React Context, plus responsive AppShell with bottom TabBar on mobile and Sidebar on desktop, dark mode toggle persisted to localStorage.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-13T02:31:53Z
- **Completed:** 2026-03-13T02:39:30Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- AuthContext with `getSession()` init + `onAuthStateChange` subscription, exposes `{ session, loading, signOut }`
- AuthForm with login/signup toggle, Google OAuth button (`signInWithOAuth`), "Forgot password?" opens ResetModal
- ResetModal calls `resetPasswordForEmail` with redirect URL, shows success/error feedback
- AppShell renders `<Outlet />` with TabBar fixed to bottom on mobile, Sidebar on desktop (Tailwind responsive classes only)
- SettingsPage theme toggle: light/dark/system with localStorage persistence and immediate class application
- 24 TDD tests pass across all 4 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth system** - `3346669` (feat)
2. **Task 2: Responsive app shell** - `d068f77` (feat)

**Plan metadata:** (this summary commit)

_Note: TDD tasks have unified commits — RED tests written first, GREEN implementation committed together._

## Files Created/Modified

- `src/contexts/AuthContext.tsx` - Session state with onAuthStateChange, AuthProvider, useAuth export
- `src/hooks/useAuth.ts` - Re-export of useAuth from AuthContext
- `src/components/auth/AuthForm.tsx` - Login/signup toggle form with Google OAuth and reset link
- `src/components/auth/ResetModal.tsx` - Inline password reset modal
- `src/pages/AuthPage.tsx` - Centered card layout wrapping AuthForm
- `src/components/layout/AppShell.tsx` - Responsive layout with Outlet, TabBar + Sidebar
- `src/components/layout/TabBar.tsx` - Fixed bottom bar with 4 tabs, Plan tab aria-disabled
- `src/components/layout/Sidebar.tsx` - Left sidebar with app name, nav links, logout button
- `src/pages/HomePage.tsx` - Welcome page with coming-soon placeholder cards
- `src/pages/SettingsPage.tsx` - Theme toggle (light/dark/system) + logout
- `src/utils/theme.ts` - toggleTheme and applyStoredTheme utilities
- `src/App.tsx` - Routing updated: AppShell as layout route for authenticated routes
- `src/main.tsx` - Added QueryClientProvider + BrowserRouter wrapping
- `tests/setup.ts` - Added window.matchMedia mock for jsdom

## Decisions Made

- `TabBar` Plan tab is a `<span role="link" aria-disabled="true">` — makes it accessible as disabled link while preventing navigation. Tested via `getByRole('link', { name: /plan/i })`
- `window.matchMedia` mocked globally in `tests/setup.ts` — jsdom does not implement matchMedia; mock returns `matches: false` by default
- App.tsx routing uses nested Route with element=AppShell as layout route — standard react-router-dom v7 pattern for shared shell layout

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @testing-library/user-event**
- **Found during:** Task 1 (writing TDD tests)
- **Issue:** `@testing-library/user-event` not in package.json; tests use `userEvent.type/click` for realistic interaction testing
- **Fix:** `npm install -D @testing-library/user-event --legacy-peer-deps`
- **Files modified:** package.json, package-lock.json
- **Verification:** Import succeeds, tests run
- **Committed in:** 3346669 (Task 1 commit)

**2. [Rule 3 - Blocking] Installed missing @testing-library/dom**
- **Found during:** Task 1 verification run
- **Issue:** `@testing-library/react` peer requires `@testing-library/dom` — was not in devDependencies
- **Fix:** `npm install -D @testing-library/dom --legacy-peer-deps`
- **Files modified:** package.json, package-lock.json
- **Verification:** Test suite runs without module resolution error
- **Committed in:** 3346669 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed AuthContext.test.tsx vi.mock hoisting issue**
- **Found during:** Task 1 RED phase
- **Issue:** `vi.mock` factory referenced `mockOnAuthStateChange` variable defined after it — hoisting causes "Cannot access before initialization" error
- **Fix:** Replaced extracted variables with inline `vi.fn()` calls in mock factory; moved mock setup to `beforeEach`
- **Files modified:** tests/AuthContext.test.tsx
- **Verification:** All 5 AuthContext tests pass
- **Committed in:** 3346669 (Task 1 commit)

**4. [Rule 1 - Bug] Added window.matchMedia mock for jsdom**
- **Found during:** Task 2 theme test — `toggleTheme` test failure
- **Issue:** jsdom does not implement `window.matchMedia`; `applyStoredTheme` calls it for system preference detection
- **Fix:** Added matchMedia mock to `tests/setup.ts` returning `matches: false` by default
- **Files modified:** tests/setup.ts
- **Verification:** All 6 theme tests pass
- **Committed in:** d068f77 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** All fixes necessary for test infrastructure correctness. No scope creep.

## Issues Encountered

- App.tsx was modified by a linter/formatter mid-execution with an advanced routing structure (including household guards and routes from Plan 03). This pre-existing modification included complete routing with AuthGuard, GuestGuard, and household pages. The current task's AppShell integration was wired into this existing structure rather than replacing it.

## User Setup Required

None — no external service configuration required for this plan. Supabase credentials and Google OAuth must be configured in Supabase project dashboard (documented in 01-CONTEXT.md).

## Next Phase Readiness

- Auth flow complete: signup, login, Google OAuth, password reset, logout
- AppShell navigation ready for all Phase 1 feature pages
- `useAuth()` hook available project-wide for session access
- Dark mode toggle wired end-to-end with localStorage persistence
- Plan 03 (household system) can use AppShell routes and useAuth directly

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-13*
