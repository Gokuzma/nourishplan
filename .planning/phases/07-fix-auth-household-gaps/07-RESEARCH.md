# Phase 7: Fix Auth & Household Integration Gaps - Research

**Researched:** 2026-03-15
**Domain:** Supabase Auth password reset (PKCE flow), React Router v7 route wiring, TypeScript type fixes
**Confidence:** HIGH

## Summary

Phase 7 closes two specific integration gaps identified by the v1.0 milestone audit. Both are small, precisely-scoped changes: one missing route + new page component, and one type annotation fix in a mutation hook.

**Gap 1 — AUTH-04 (BROKEN):** `ResetModal` calls `supabase.auth.resetPasswordForEmail` with `redirectTo: ${window.location.origin}/auth/reset-password`. After the user clicks the email link, Supabase appends a token to that URL and redirects the browser there. But `App.tsx` has no `<Route path="/auth/reset-password">` — React Router falls through to `<Route path="*">`, rendering `NotFoundPage`. The user cannot set a new password.

**Gap 2 — HSHD-01 (TS ERROR):** `useCreateHousehold` in `useHousehold.ts` returns a hand-constructed `Household` object from the mutation function: `{ id, name, created_at: ... }`. The `Household` interface in `database.ts` requires `week_start_day: number`, so the return is missing that field. At runtime the gap is covered because `onSuccess` calls `queryClient.invalidateQueries`, causing `useHousehold` to refetch from DB (which does have `week_start_day`). But until the refetch resolves there is a momentary TS mismatch, and the TypeScript compiler flags a type error.

**Primary recommendation:** Add `/auth/reset-password` route and a `ResetPasswordPage` component that handles Supabase's PKCE token exchange, then add `week_start_day` to the hand-built return object in `useCreateHousehold`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-04 | User can reset password via email link | Requires: new route in App.tsx + new page that calls `supabase.auth.updateUser({ password })` after token exchange |
| HSHD-01 | User can create a household | Requires: add `week_start_day: 0` (default) to the return object in `useCreateHousehold` mutationFn |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | already installed | Auth token exchange (`updateUser`) | Already in use project-wide |
| react-router-dom | v7 (already installed) | Add new route | Already defines all SPA routes |

### No new dependencies needed

Both fixes use libraries already present in the project. No `npm install` required.

## Architecture Patterns

### Recommended Project Structure

The fix adds one new page file:

```
src/
├── pages/
│   └── ResetPasswordPage.tsx    # NEW — handles /auth/reset-password
├── App.tsx                      # EDIT — add route for /auth/reset-password
└── hooks/
    └── useHousehold.ts          # EDIT — fix return object in useCreateHousehold
```

### Pattern 1: Supabase PKCE Password Reset — Two-Step Flow

**What:** Supabase password reset is a two-step process:
1. `resetPasswordForEmail(email, { redirectTo })` — sends email; no session created yet
2. User clicks link → browser lands on `redirectTo` URL with Supabase's token fragment/query params → client must call `supabase.auth.updateUser({ password: newPassword })` to finalize the reset

**How Supabase delivers the token to the page:**
Supabase embeds token data in the URL. With the default PKCE flow the `supabase.auth.onAuthStateChange` listener fires a `PASSWORD_RECOVERY` event when the client SDK parses the URL. The page only needs to:
1. Listen for the `PASSWORD_RECOVERY` event (or check `session` from `onAuthStateChange`)
2. Present a new-password form
3. Call `supabase.auth.updateUser({ password })` on submit

**When to use:** Any page that is the `redirectTo` target of `resetPasswordForEmail`.

**Example:**
```tsx
// Source: Supabase Auth docs — password recovery flow
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase SDK parses the URL hash/query and fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      navigate('/auth')
    }
    setLoading(false)
  }

  if (!ready) {
    return <p>Verifying reset link…</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>Set New Password</button>
    </form>
  )
}
```

**Critical detail:** The route must be outside both `AuthGuard` and `GuestGuard`. Supabase sets a temporary session when the user arrives from the reset link, so `GuestGuard` would redirect away before the token exchange completes. The route should be placed alongside `/offline` in the "Public utility routes" group.

### Pattern 2: Fixing useCreateHousehold Return Type

**What:** The `mutationFn` returns a hand-built `Household` object missing `week_start_day`. The fix is to add `week_start_day: 0` (matching the DB default) to the returned object literal.

**Example:**
```ts
// Before (missing week_start_day — TS error):
return { id: householdId, name, created_at: new Date().toISOString() }

// After (complete Household type):
return { id: householdId, name, week_start_day: 0, created_at: new Date().toISOString() }
```

**Why `0`:** The DB default for `week_start_day` is `0` (Sunday). The mutation does not set a custom value at creation time, so `0` is correct. The actual persisted value is confirmed by the subsequent `queryClient.invalidateQueries` refetch.

### Anti-Patterns to Avoid

- **Wrapping ResetPasswordPage in AuthGuard:** The user arrives from email with a temporary session token in the URL. AuthGuard's household check would redirect to `/setup` if the user has no household yet, or could race with session establishment. Keep the route public.
- **Wrapping ResetPasswordPage in GuestGuard:** GuestGuard redirects authenticated users to `/`. The reset link creates a temporary session, so GuestGuard would redirect the user away before they can set the password.
- **Not listening for PASSWORD_RECOVERY event:** Calling `updateUser` immediately on mount (without waiting for the SDK to parse the token) will fail because the session is not yet established.
- **Polling for session instead of using onAuthStateChange:** The auth state change listener is the correct mechanism; polling is unnecessary and fragile.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL token parsing | Custom URL hash parser | `supabase.auth.onAuthStateChange` | Supabase SDK handles PKCE token exchange, hash stripping, and session establishment automatically |
| Session check on reset page | Manual fetch to check auth | `PASSWORD_RECOVERY` event | SDK fires the event precisely when the reset session is ready |

## Common Pitfalls

### Pitfall 1: Route Guard Conflict
**What goes wrong:** Placing `/auth/reset-password` inside `AuthGuard` or `GuestGuard` causes an immediate redirect before the Supabase SDK can exchange the reset token.
**Why it happens:** The reset email link establishes a temporary session. AuthGuard's household check may redirect to `/setup`; GuestGuard redirects authenticated sessions to `/`.
**How to avoid:** Place the route in the "Public utility routes" group alongside `/offline`, outside all guards.
**Warning signs:** Page redirects immediately after clicking email link, never shows the password form.

### Pitfall 2: PASSWORD_RECOVERY Event Not Received
**What goes wrong:** `onAuthStateChange` listener set up after the SDK has already fired the event.
**Why it happens:** If the component mounts before the Supabase client initializes, the event fires and is lost.
**How to avoid:** Set up the `onAuthStateChange` subscription in a `useEffect` on mount. In practice Supabase fires this event slightly after the client parses the URL so the timing is fine as long as the subscription is created synchronously in `useEffect`.
**Warning signs:** `ready` state never becomes `true`; form never appears.

### Pitfall 3: TypeScript Widening Masking the HSHD-01 Bug
**What goes wrong:** The type error in `useCreateHousehold` may be masked if the return type was implicitly widened or the caller ignored the mutation `data` field.
**Why it happens:** `useMutation` in TanStack Query infers the return type from `mutationFn`. If `data` is accessed downstream, the missing `week_start_day` causes a compile error.
**How to avoid:** Fix the return object literal as described. The explicit `Promise<Household>` annotation on `mutationFn` already flags the error correctly.

## Code Examples

Verified patterns from project source:

### Current ResetModal redirectTo (confirmed in source)
```tsx
// src/components/auth/ResetModal.tsx:21
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
})
```
This confirms the exact path that needs a route: `/auth/reset-password`.

### Current useCreateHousehold return (confirmed in source)
```ts
// src/hooks/useHousehold.ts:93
return { id: householdId, name, created_at: new Date().toISOString() }
// Missing: week_start_day (required by Household interface in database.ts:8-13)
```

### App.tsx Route Pattern for Public Utility Pages (confirmed in source)
```tsx
// src/App.tsx:157-158 — existing pattern to follow
{/* Public utility routes */}
<Route path="/offline" element={<OfflinePage />} />
```
The new route follows the same pattern:
```tsx
<Route path="/auth/reset-password" element={<ResetPasswordPage />} />
```

### Household interface (confirmed in source)
```ts
// src/types/database.ts:8-13
export interface Household {
  id: string
  name: string
  week_start_day: number   // <-- required field
  created_at: string
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Implicit PKCE handled via hash fragment | Supabase SDK fires `PASSWORD_RECOVERY` auth state event | Supabase JS v2+ | Developers listen for event rather than parsing URL manually |

## Open Questions

1. **Should ResetPasswordPage redirect to `/` or `/auth` after success?**
   - What we know: After `updateUser` the session remains active (user is logged in)
   - What's unclear: UX preference — send to home (they're now logged in) or auth page
   - Recommendation: Redirect to `/` since the user is authenticated post-reset; this matches standard auth flow. If household is missing, AuthGuard handles the redirect to `/setup`.

2. **Does Supabase's invite-only setting block password reset emails?**
   - What we know: Supabase `disable_signup` blocks new account creation, not password resets for existing users
   - What's unclear: Not confirmed against the live Supabase project config
   - Recommendation: Assume reset works for existing users; no change needed to Supabase config.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (detected from project) |
| Config file | vite.config.ts (inline test config) or vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-04 | Password reset route exists and renders without crashing | smoke (render test) | `npx vitest run --reporter=verbose` | Wave 0 |
| AUTH-04 | Full reset flow (email → link → new password) | manual E2E | N/A — requires live Supabase + email delivery | manual only |
| HSHD-01 | `useCreateHousehold` returns object satisfying `Household` type | unit (TypeScript compile) | `npx tsc --noEmit` | existing TS config |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (catches the HSHD-01 type error immediately)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** TypeScript clean + manual E2E of password reset flow before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/ResetPasswordPage.test.tsx` — smoke render test for the new page component (AUTH-04)

*(The TypeScript fix for HSHD-01 is validated purely by `tsc --noEmit` — no new test file needed.)*

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/App.tsx` — confirmed no `/auth/reset-password` route exists
- Codebase inspection: `src/components/auth/ResetModal.tsx:21` — confirmed `redirectTo` target is `/auth/reset-password`
- Codebase inspection: `src/hooks/useHousehold.ts:93` — confirmed return object missing `week_start_day`
- Codebase inspection: `src/types/database.ts:8-13` — confirmed `Household` interface requires `week_start_day: number`
- `.planning/v1.0-MILESTONE-AUDIT.md` — audit evidence for both gaps

### Secondary (MEDIUM confidence)
- Supabase Auth docs (general knowledge, verified against SDK usage already in codebase): `onAuthStateChange` fires `PASSWORD_RECOVERY` event after reset link is clicked; `updateUser({ password })` finalizes the reset

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both fixes use libraries already installed; no ecosystem uncertainty
- Architecture: HIGH — route pattern and auth event pattern are confirmed from existing codebase and Supabase SDK behavior
- Pitfalls: HIGH — route guard conflict is directly observable from reading App.tsx; type fix is mechanically certain

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable APIs; Supabase JS v2 PKCE flow is stable)
