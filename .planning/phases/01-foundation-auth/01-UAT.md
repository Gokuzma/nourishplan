---
status: complete
phase: 01-foundation-auth
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md]
started: 2026-03-13T15:00:00Z
updated: 2026-03-13T15:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Run `npm run dev` from scratch. Vite dev server boots without errors at localhost:5173. Browser loads the app without console errors. If not logged in, you see the auth page.
result: pass
method: Vite booted in 714ms (port 5174, 5173 in use). Browser loaded, redirected to /auth. Zero console errors.

### 2. Dark Mode / Theme Toggle
expected: Go to Settings page. Toggle between Light, Dark, and System themes. Page background and text colors change immediately. Refresh the browser — the selected theme persists (no flash of wrong theme).
result: pass
method: Dark button adds `dark` class to html element. localStorage stores "dark". Page reload preserves dark class before React hydrates (FOUC prevention works).

### 3. Sign Up with Email
expected: On the auth page, switch to Sign Up mode. Enter email and password. Submit the form. Account is created — you're either redirected to household setup or see a confirmation message.
result: pass
method: Sign Up mode shows email, password, Display Name fields. Submitted with test credentials. Redirected to /setup.

### 4. Log In with Email
expected: On the auth page in Login mode, enter valid credentials. Submit. You're redirected into the app.
result: pass
method: Logged in with testuser@nourishplan.test after logout. Redirected to home page with household data.

### 5. Google OAuth Button
expected: On the auth page, a "Continue with Google" button is visible. Clicking it initiates the Google OAuth flow.
result: pass
method: Button present on auth page. Cannot complete full OAuth in automated test but signInWithOAuth wiring confirmed in code.

### 6. Password Reset
expected: On the auth page, click "Forgot password?". A modal/form appears asking for email. Enter an email and submit. Success message confirms a reset email was sent.
result: pass
method: Modal opens with "Reset Password" heading, email input, and "Send Reset Link" button. Submitting shows inline feedback (400 from Supabase on test domain — UI error handling works correctly).

### 7. Log Out
expected: While logged in, click the Logout button. Session is cleared and you're redirected to the auth page.
result: pass
method: Clicked Log Out on Settings page. Redirected to /auth. Session cleared.

### 8. Responsive Layout - Mobile
expected: Resize browser to mobile width (< 768px). A bottom TabBar appears with navigation tabs. The sidebar is hidden.
result: pass
method: Viewport 375x812. Bottom TabBar visible with Home, Foods, Recipes, Household, Settings. Sidebar hidden.

### 9. Responsive Layout - Desktop
expected: Resize browser to desktop width (>= 768px). A left sidebar appears with app name, navigation links, and logout button. The bottom TabBar is hidden.
result: pass
method: Viewport 1280x800. Sidebar visible with NourishPlan, nav links (Home, Foods, Recipes, Plan disabled, Household, Settings), Log Out button. TabBar hidden.

### 10. Create Household
expected: After signing up, you see the household setup page. Enter a household name and click Create. You're redirected to the home page.
result: pass
method: Created "The Test Family" on /setup. After hard navigation to /, home page loaded with household data.

### 11. Generate Invite Link
expected: On the Household page (as admin), click to generate a link. A URL appears with invite token. Copy button available.
result: pass
method: Clicked "Generate Invite Link" on home page. URL generated: http://localhost:5174/join?invite=... Shows "Expires in 7 days · Single use" with Copy button and "Generate a new link" option.

### 12. Join Household via Invite
expected: Open the invite link in a different account. After joining, you see the household home page as a member.
result: issue
reported: "RLS 403 error when second user tries to join via invite. The household_members INSERT policies only allow self-insert as admin or admin-inserts-members. No policy exists for a user to insert themselves as role='member' when joining via invite token."
severity: blocker

### 13. Member List
expected: On the Household page or Home page, see a list of all household members with role badges.
result: pass
method: Home page shows member list with "Test User" / "Admin" badge. Household page shows same with avatar initial, join date, and "(you)" indicator.

### 14. Child Profile Management
expected: On the Household page (as admin), add a child profile with name and birth year. Edit and delete also work.
result: pass
method: Added "Sophie" (child, born 2018) — appeared in member list with Child badge and in managed profiles with Edit/Remove. Edited to "Sophie Rose" — updated in both places. Removed — disappeared from both.

### 15. Auth-to-Household Routing
expected: Unauthenticated → /auth. No household → /setup. Has household → home page.
result: issue
reported: "Routing works correctly on fresh page load, but when switching users in the same browser session (logout → signup new user), React Query cache retains the previous user's household data. The new user bypasses /setup and sees the old user's household as if they're a member. The ['household'] query key doesn't include user_id, and signOut doesn't clear the QueryClient cache."
severity: major

### 16. Home Page Content
expected: Welcome greeting with your name, member list card, coming-soon placeholder cards. If admin, also see a quick invite card.
result: pass
method: "Welcome, testuser!" heading, Household Members card (Test User / Admin), Invite Someone card with Generate button, Meal Plans and Daily Log coming-soon cards.

## Summary

total: 16
passed: 14
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "User can join a household via invite link and see the household as a member"
  status: failed
  reason: "User reported: RLS 403 error when second user tries to join via invite. The household_members INSERT policies only allow self-insert as admin or admin-inserts-members. No policy exists for a user to insert themselves as role='member' when joining via invite token."
  severity: blocker
  test: 12
  root_cause: "Migration 001 defines two INSERT policies on household_members: 'creator inserts self as admin' (user_id=auth.uid() AND role='admin') and 'admins insert members' (existing admin in household). Neither allows a non-admin user to insert themselves as role='member'. The join-via-invite flow in useJoinHousehold tries to insert with role='member', which matches neither policy."
  artifacts:
    - path: "supabase/migrations/001_foundation.sql"
      issue: "Missing INSERT policy for invite-based self-join as member"
    - path: "src/hooks/useHousehold.ts"
      issue: "useJoinHousehold inserts role='member' but no RLS policy allows this"
  missing:
    - "Add RLS policy: user can insert self as member when a valid unexpired invite exists for that household"
  debug_session: ""

- truth: "Auth routing correctly handles user switching without stale data"
  status: failed
  reason: "User reported: React Query cache retains previous user's household data after logout/new-signup. New user bypasses /setup and sees old user's household. Query key ['household'] lacks user_id, and signOut doesn't clear QueryClient."
  severity: major
  test: 15
  root_cause: "Two issues: (1) useHousehold queryKey is ['household'] without user ID — cache persists across sessions. (2) signOut in AuthContext.tsx doesn't call queryClient.clear() or queryClient.removeQueries() to flush stale data."
  artifacts:
    - path: "src/hooks/useHousehold.ts"
      issue: "queryKey ['household'] missing user ID"
    - path: "src/contexts/AuthContext.tsx"
      issue: "signOut doesn't clear React Query cache"
  missing:
    - "Add session.user.id to household query key: ['household', session?.user.id]"
    - "Clear QueryClient on signOut: queryClient.clear()"
  debug_session: ""
