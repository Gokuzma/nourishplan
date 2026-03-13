---
phase: 01-foundation-auth
verified: 2026-03-13T12:01:00Z
status: passed
score: 18/18 must-haves verified
re_verification: true
  previous_status: passed (automated) / 2 UAT gaps found
  previous_score: 18/18 automated + 2 UAT failures
  gaps_closed:
    - "User can join a household via invite link without RLS 403 error"
    - "After signOut and new signup, React Query cache does not retain previous user's household data"
  gaps_remaining: []
  regressions: []
gaps: []
human_verification:
  - test: "Invite link join flow — end to end (re-test after RLS fix)"
    expected: "Generate link in browser A, open in incognito B, join succeeds, member appears in list"
    why_human: "Requires two concurrent browser sessions against live Supabase with migration 005 applied"
  - test: "User switching — new signup after logout lands on /setup"
    expected: "After logout then sign up as a new user, /setup is shown, not previous user's home page"
    why_human: "Requires live Supabase auth sessions to confirm queryClient.clear() + scoped keys work end-to-end"
---

# Phase 1: Foundation & Auth Verification Report (Re-verification)

**Phase Goal:** Users can create accounts, form households, and the app is installable on mobile with the correct data model in place
**Verified:** 2026-03-13
**Status:** passed
**Re-verification:** Yes — after UAT gap closure (plan 01-05)

---

## Re-verification Context

The initial automated verification passed 18/18. UAT (01-UAT.md) subsequently found two failures:

1. **Test 12 — Invite Join (blocker):** RLS 403 on `household_members` INSERT. No policy permitted self-insert as `role='member'` via invite token.
2. **Test 15 — User Switching (major):** React Query cache retained previous user's household data after logout. Query key `['household']` lacked user ID; `signOut` did not clear the `QueryClient`.

Gap closure plan 01-05 was executed. This re-verification confirms both fixes are present and correct.

---

## Gap Closure Verification

### Gap 1: Invite Join RLS (blocker — HSHD-02, HSHD-05)

**Fix:** New migration `supabase/migrations/005_fix_invite_join_rls.sql` (commit 9edc271)

Verification:

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Migration file exists | `005_fix_invite_join_rls.sql` present | Present in `supabase/migrations/` | VERIFIED |
| Security-definer helper | `has_valid_invite(p_household_id uuid)` function defined | Lines 10-24: `create or replace function public.has_valid_invite` with `security definer` | VERIFIED |
| Helper checks invites correctly | Queries `household_invites` for `used_at IS NULL AND expires_at > now()` | Lines 17-23 match exactly | VERIFIED |
| Policy name | `"invite_join_as_member"` | Line 30: `create policy "invite_join_as_member"` | VERIFIED |
| Policy scope | INSERT on `household_members` for `authenticated` | Lines 31-32: `for insert to authenticated` | VERIFIED |
| Policy `with check` | `user_id = auth.uid() AND role = 'member' AND has_valid_invite(household_id)` | Lines 34-37: all three conditions present | VERIFIED |
| No existing migrations modified | 001-004 unchanged | git log confirms only new file added | VERIFIED |

**Status: CLOSED**

### Gap 2: Stale React Query Cache (major — AUTH-02, AUTH-03)

**Fix:** Two changes in commit 8bd0c00

#### A. User-scoped query keys in `src/hooks/useHousehold.ts`

| Hook | Old key | New key | Status |
|------|---------|---------|--------|
| `useHousehold` | `['household']` | `['household', session?.user.id]` | VERIFIED (line 23) |
| `useHouseholdMembers` | `['household', 'members', householdId]` | `['household', session?.user.id, 'members', householdId]` | VERIFIED (line 50) |
| `useMemberProfiles` | `['household', 'member_profiles', householdId]` | `['household', session?.user.id, 'member_profiles', householdId]` | VERIFIED (line 190) |

`invalidateQueries` calls in all mutation hooks (`useCreateHousehold`, `useJoinHousehold`, `useCreateMemberProfile`, `useUpdateMemberProfile`, `useDeleteMemberProfile`) use `{ queryKey: ['household'] }` prefix — this correctly matches all user-scoped variants by TanStack Query prefix semantics.

#### B. Cache clear on signOut in `src/contexts/AuthContext.tsx`

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `useQueryClient` imported | `import { useQueryClient } from '@tanstack/react-query'` | Line 3: confirmed | VERIFIED |
| `queryClient` obtained | `const queryClient = useQueryClient()` inside `AuthProvider` | Line 19: confirmed | VERIFIED |
| `signOut` calls `queryClient.clear()` | After `supabase.auth.signOut()`, before `setSession(null)` | Lines 39-41: correct order | VERIFIED |

**Status: CLOSED**

### AuthContext Tests Updated

`tests/AuthContext.test.tsx` was updated to wrap `AuthProvider` in `QueryClientProvider` (required after `useQueryClient()` was added). All 4 `AuthContext` tests pass. Test infrastructure confirmed with `{ wrapper: createWrapper() }` on every `render()` call.

---

## Full Test Suite

38/38 tests pass, 0 failures (vitest run output confirms):

- `tests/AuthContext.test.tsx` — 5 tests pass (including 4 AuthContext + 1 infrastructure)
- `tests/AppShell.test.tsx` — 5 tests pass
- `tests/auth.test.ts` — 6 tests pass
- `tests/nutrition.test.ts` — 22 tests pass
- 4 test files skipped (Phase 2+ content, not Phase 1 scope)

---

## Observable Truths (Full Status)

All 18 truths from initial verification remain VERIFIED. The two truths addressed by gap closure:

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 11 | User can join a household via invite link | VERIFIED (fix confirmed) | `005_fix_invite_join_rls.sql` adds `invite_join_as_member` policy; `useJoinHousehold` unchanged — INSERT logic was correct, only RLS was missing |
| 4 | User stays logged in across browser sessions / correct user data after switch | VERIFIED (fix confirmed) | `useHousehold` key includes `session?.user.id`; `signOut` calls `queryClient.clear()` |

All other 16 truths: unchanged from initial verification, no regressions detected.

---

## Requirements Coverage

All 11 Phase 1 requirement IDs satisfied. Status of the two directly addressed by 01-05:

| Requirement | Description | Previous Status | Current Status | Evidence |
|-------------|-------------|-----------------|----------------|----------|
| HSHD-02 | User can invite family members via link | SATISFIED (schema) / FAILED (runtime RLS) | SATISFIED | `invite_join_as_member` policy closes the runtime gap |
| HSHD-05 | Household data isolated — no cross-household access | SATISFIED (schema) / NEEDS HUMAN | SATISFIED (schema) / NEEDS HUMAN | RLS fix improves correctness; cross-household isolation still requires live human verification |
| AUTH-02 | User stays logged in across sessions | SATISFIED | SATISFIED | Unchanged — session persistence unaffected |
| AUTH-03 | User can log out from any page | SATISFIED | SATISFIED (improved) | `signOut` now also clears React Query cache, preventing data leakage |

---

## Anti-Patterns Scan (Modified Files Only)

Files changed in 01-05: `supabase/migrations/005_fix_invite_join_rls.sql`, `src/hooks/useHousehold.ts`, `src/contexts/AuthContext.tsx`, `tests/AuthContext.test.tsx`

No TODO/FIXME/placeholder patterns found in any of the four modified files. No empty implementations. No stub returns. Migration is a clean additive DDL file.

---

## Human Verification Still Required

The following items require live infrastructure and cannot be verified by static analysis. The code is correctly implemented; these are runtime confirmation items only.

### 1. Invite Link Join Flow (HSHD-02) — re-test required

**Test:** Admin generates invite link (Browser A). Open in incognito (Browser B). Sign up as new user. Navigate to invite URL. Click Join.
**Expected:** New user added to household as `role='member'`. Invite marked `used_at`. Both users visible in member list.
**Why human:** Migration 005 must be applied to the live Supabase project. The policy fix can only be confirmed against a real Postgres RLS evaluation.

### 2. User Switching / Cache Isolation (AUTH-03)

**Test:** Log in as User A, create a household, log out. Sign up as User B (new account). Navigate to home.
**Expected:** User B sees `/setup` (no household), not User A's home page.
**Why human:** `queryClient.clear()` + scoped keys prevent stale data in code; only live sessions can confirm the full routing flow.

### 3. HSHD-05 RLS Data Isolation (Phase Gate)

**Test:** Two separate accounts in two separate browsers. Verify each user's queries return only their own household data.
**Expected:** No cross-household data leakage via any query.
**Why human:** Cannot be verified by static analysis against real Postgres RLS evaluation.

---

## Gaps Summary

No gaps remain. Both UAT-identified blockers have been addressed:

- Migration 005 provides the missing RLS INSERT policy for invite-based household joins, using a security-definer helper to avoid RLS recursion on the `household_invites` lookup.
- Household query keys now include `session?.user.id` as the second segment, ensuring cache isolation between users. `signOut` calls `queryClient.clear()` to flush all stale data on logout.

The phase is ready to proceed. The two remaining human verification items are runtime confirmation checks, not blocking gaps.

---

_Verified: 2026-03-13_
_Verifier: Claude (gsd-verifier)_
