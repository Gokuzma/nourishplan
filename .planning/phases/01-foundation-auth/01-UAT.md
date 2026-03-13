---
status: complete
phase: 01-foundation-auth
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md]
started: 2026-03-12T00:00:00Z
updated: 2026-03-12T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Run `npm run dev` from scratch. Vite starts without errors, browser loads localhost:5173, and the app renders without a blank screen or console errors.
result: pass

### 2. Auth Page — Login/Signup Toggle
expected: Unauthenticated user lands on /auth. Page shows a login form with email and password fields. A toggle or link switches between Login and Sign Up modes. Google OAuth button is visible.
result: pass

### 3. Password Reset Modal
expected: On the auth page, clicking "Forgot password?" opens a modal with an email input. Submitting shows success or error feedback inline.
result: pass

### 4. Signup and Login Flow
expected: Sign up with email/password creates an account. After signup, user is authenticated and redirected away from /auth. Logging out returns to /auth. Logging back in with same credentials works.
result: skipped
reason: Requires Supabase auth — no test credentials available

### 5. Household Setup — Create
expected: After first login (no household), user is redirected to /setup. The setup page shows two options: Create a household or Join one. Creating a household with a name succeeds and redirects to the home page.
result: skipped
reason: Requires Supabase auth — no test credentials available

### 6. Household Setup — Join via Invite
expected: A user without a household can paste an invite token or full invite URL on /setup (Join tab). Submitting a valid token joins the household and redirects to home. Expired or used tokens show an error.
result: skipped
reason: Requires Supabase auth — no test credentials available

### 7. Responsive App Shell — Mobile TabBar
expected: On a mobile-width viewport (< 768px), a fixed bottom TabBar appears with navigation tabs (Home, Household, etc.). The sidebar is hidden.
result: pass

### 8. Responsive App Shell — Desktop Sidebar
expected: On a desktop-width viewport (>= 768px), a left sidebar appears with app name, navigation links, and a logout button. The bottom TabBar is hidden.
result: pass

### 9. Dark Mode Toggle
expected: On the Settings page, a theme toggle allows switching between Light, Dark, and System. Selecting Dark applies dark theme immediately. Refreshing the page preserves the choice (no flash of wrong theme).
result: pass

### 10. Household Page — Member List
expected: Navigating to /household shows the household name and a list of members with role badges (Admin/Member). Loading state shows skeletons.
result: skipped
reason: Requires Supabase auth — no test credentials available

### 11. Invite Link Generation (Admin Only)
expected: On /household, an admin sees an "Invite Link" card. Clicking generate creates a shareable URL. A copy button copies it to clipboard. Non-admin members do not see this card.
result: skipped
reason: Requires Supabase auth — no test credentials available

### 12. Member Profile Management (Admin Only)
expected: On /household, an admin sees a "Managed Profiles" card. They can add a new profile (name, is_child toggle, birth_year), edit an existing one, and remove one. Non-admin members do not see this card.
result: skipped
reason: Requires Supabase auth — no test credentials available

### 13. Route Guards
expected: Unauthenticated users visiting any protected route (/, /household) are redirected to /auth. Authenticated users without a household are redirected to /setup. Authenticated users with a household can access / and /household normally.
result: skipped
reason: Requires Supabase auth — no test credentials available

## Summary

total: 13
passed: 6
issues: 0
pending: 0
skipped: 7

## Gaps

[none yet]
