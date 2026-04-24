---
phase: 30-granular-household-member-permissions-system-admin-editor-vi
plan: 04
subsystem: household-permissions-hooks
tags: [hooks, mutations, tanstack-query, supabase-rpc]
requires:
  - Plan 30-01 migration 031 (change_member_role, remove_household_member, leave_household RPCs + household_invites.role column) live in prod Supabase
  - Existing useCreateHousehold / useJoinHousehold mutation patterns in src/hooks/useHousehold.ts
provides:
  - useChangeMemberRole() — TanStack mutation wrapping supabase.rpc('change_member_role', { member_row_id, new_role })
  - useRemoveHouseholdMember() — TanStack mutation wrapping supabase.rpc('remove_household_member', { member_row_id })
  - useLeaveHousehold() — TanStack mutation wrapping supabase.rpc('leave_household') with no args
  - useCreateInvite(role?) — extended signature accepting optional 'admin' | 'member'; defaults to 'member'
  - useJoinHousehold now respects invite.role (was hardcoded 'member' at line 130)
affects:
  - Plan 30-05 (MemberList overflow-menu wire-up) consumes useChangeMemberRole + useRemoveHouseholdMember + useLeaveHousehold
  - Plan 30-06 (InviteLink segmented control + JoinHousehold role display) consumes useCreateInvite(role) + relies on useJoinHousehold honoring invite.role
  - Plan 30-07 (Playwright E2E) exercises the full round-trip via these hooks
tech-stack:
  added: []
  patterns:
    - supabase.rpc('<name>' as never, { ... } as never) — repo convention matching useJoinHousehold line 140
    - invalidateQueries({ queryKey: ['household'] }) prefix invalidation — matches D-03 (catches root + members + memberProfiles)
    - Error passthrough: mutation.error.message === 'At least one admin required' propagates verbatim from DB trigger/RPC
key-files:
  created: []
  modified:
    - src/hooks/useHousehold.ts
decisions:
  - All three new hooks co-located in useHousehold.ts (matches existing layout; CONTEXT.md "all household mutations already live in useHousehold.ts")
  - Optional role param on useCreateInvite keeps the sole current caller (InviteLink.tsx line 10 passes undefined) working verbatim — SPEC Constraint §6 no-breaking-change preserved
  - useJoinHousehold line-130 change uses `invite.role ?? 'member'` — default covers legacy invite rows that pre-date the migration 031 column addition
  - 'as never' cast retained verbatim; no types regeneration in scope for Plan 04
metrics:
  duration_minutes: 4
  tasks_completed: 2
  tasks_total: 2
  completed_date: 2026-04-23
---

# Phase 30 Plan 04: Hook Layer (Mutations) Summary

One-liner: Three new TanStack mutation hooks (useChangeMemberRole / useRemoveHouseholdMember / useLeaveHousehold) delivered in src/hooks/useHousehold.ts, plus useCreateInvite extended with optional role and useJoinHousehold fixed to respect invite.role — zero breaking changes, zero new imports, tsc clean.

## Baseline vs Post-Edit

| Metric                                              | Baseline | Post-Edit |
| --------------------------------------------------- | -------- | --------- |
| `grep -c "^export function" src/hooks/useHousehold.ts` | `9`      | `12`      |
| `wc -l src/hooks/useHousehold.ts`                   | `279`    | `344`     |
| `grep -c "invalidateQueries({ queryKey: ['household'] })"` | `5`      | `8`       |

Exactly +3 exports (useChangeMemberRole, useRemoveHouseholdMember, useLeaveHousehold), +3 invalidations (one per new hook), +65 lines net. Zero existing exports removed or renamed. All pre-existing exports (useHousehold, useHouseholdMembers, useCreateHousehold, useJoinHousehold, useCreateInvite, useMemberProfiles, useCreateMemberProfile, useUpdateMemberProfile, useDeleteMemberProfile) remain in place.

## Full Diff vs Branch Base (5a3220e → 5674804)

```diff
diff --git a/src/hooks/useHousehold.ts b/src/hooks/useHousehold.ts
index 4546935..42ef5e4 100644
--- a/src/hooks/useHousehold.ts
+++ b/src/hooks/useHousehold.ts
@@ -127,7 +127,7 @@ export function useJoinHousehold() {

       const { error: memberError } = await supabase
         .from('household_members')
-        .insert({ household_id: invite.household_id, user_id: userId, role: 'member' })
+        .insert({ household_id: invite.household_id, user_id: userId, role: invite.role ?? 'member' })

       if (memberError) {
         if (memberError.code === '23505') {
@@ -157,7 +157,7 @@ export function useCreateInvite() {
   const { data: membership } = useHousehold()

   return useMutation({
-    mutationFn: async (): Promise<HouseholdInvite> => {
+    mutationFn: async (role?: 'admin' | 'member'): Promise<HouseholdInvite> => {
       const { session } = await supabase.auth.getSession().then(r => r.data)
       const userId = session?.user.id
       if (!userId) throw new Error('Not authenticated')
@@ -167,7 +167,7 @@ export function useCreateInvite() {

       const { data, error } = await supabase
         .from('household_invites')
-        .insert({ household_id: householdId, created_by: userId })
+        .insert({ household_id: householdId, created_by: userId, role: role ?? 'member' })
         .select()
         .single()

@@ -277,3 +277,68 @@ export function useDeleteMemberProfile() {
     },
   })
 }
+
+/**
+ * Promotes a member to admin or demotes an admin to member (Phase 30 SPEC Req #1).
+ * - Callable by any admin in the same household as the target member.
+ * - DB-enforced: rejects with 'At least one admin required' (exact string) if it would
+ *   reduce the household's admin count to zero.
+ * - `member_row_id` is the `household_members.id` (the row UUID, NOT the user_id).
+ */
+export function useChangeMemberRole() {
+  const queryClient = useQueryClient()
+
+  return useMutation({
+    mutationFn: async (params: { member_row_id: string; new_role: 'admin' | 'member' }) => {
+      const { error } = await supabase
+        .rpc('change_member_role' as never, {
+          member_row_id: params.member_row_id,
+          new_role: params.new_role,
+        } as never)
+      if (error) throw error
+    },
+    onSuccess: async () => {
+      await queryClient.invalidateQueries({ queryKey: ['household'] })
+    },
+  })
+}
+
+/**
+ * Removes a member from the caller's household (Phase 30 SPEC Req #3).
+ * - Callable by any admin in the same household as the target member.
+ * - DB-enforced last-admin protection.
+ */
+export function useRemoveHouseholdMember() {
+  const queryClient = useQueryClient()
+
+  return useMutation({
+    mutationFn: async (member_row_id: string) => {
+      const { error } = await supabase
+        .rpc('remove_household_member' as never, { member_row_id } as never)
+      if (error) throw error
+    },
+    onSuccess: async () => {
+      await queryClient.invalidateQueries({ queryKey: ['household'] })
+    },
+  })
+}
+
+/**
+ * Current user leaves their household voluntarily (Phase 30 SPEC Req #4).
+ * - Callable by any member (admin OR member) — does NOT require admin role.
+ * - DB-enforced: rejects with 'At least one admin required' if caller is the sole admin.
+ */
+export function useLeaveHousehold() {
+  const queryClient = useQueryClient()
+
+  return useMutation({
+    mutationFn: async () => {
+      const { error } = await supabase
+        .rpc('leave_household' as never, {} as never)
+      if (error) throw error
+    },
+    onSuccess: async () => {
+      await queryClient.invalidateQueries({ queryKey: ['household'] })
+    },
+  })
+}
```

`git diff --stat`: `1 file changed, 68 insertions(+), 3 deletions(-)` — 65 net new lines across the two commits, all confined to `src/hooks/useHousehold.ts`. No other file modified.

## Verification

### tsc

```
npx tsc --noEmit
# (zero output, exit 0)
```

Clean. The extended `useCreateInvite` payload `role: role ?? 'member'` compiles because the `HouseholdInvite` `Insert` helper (updated in Plan 30-01, src/types/database.ts lines 384-394) already declares `role?: 'admin' | 'member'`. The three new RPCs use the `as never` cast convention and bypass the generated types, matching the existing `mark_invite_used` call on line 140.

### Vitest regression (mocked suites)

```
npx vitest run tests/settings.test.tsx tests/AppShell.test.tsx
# Test Files  2 passed (2)
# Tests       8 passed (8)
```

Zero regressions from baseline. Both suites mock the supabase module and do not touch the new hooks — pre-existing behavior intact.

### Contract checks

| Assertion                                                                    | Result |
| ---------------------------------------------------------------------------- | ------ |
| `grep -c "^export function" src/hooks/useHousehold.ts`                       | `12`   |
| `grep "^export function useChangeMemberRole" src/hooks/useHousehold.ts`      | match  |
| `grep "^export function useRemoveHouseholdMember" src/hooks/useHousehold.ts` | match  |
| `grep "^export function useLeaveHousehold" src/hooks/useHousehold.ts`        | match  |
| `grep -n "invite.role" src/hooks/useHousehold.ts` → line 130                 | match  |
| `grep -n "role: role" src/hooks/useHousehold.ts` → line 170                  | match  |
| `grep -n "async (role" src/hooks/useHousehold.ts` → line 160                 | match  |
| `grep -n ".rpc('change_member_role' as never" src/hooks/useHousehold.ts`    | line 294 |
| `grep -n ".rpc('remove_household_member' as never" src/hooks/useHousehold.ts`| line 317 |
| `grep -n ".rpc('leave_household' as never" src/hooks/useHousehold.ts`       | line 337 |

### Remaining `role: '...'` literals

`grep -n "role: '" src/hooks/useHousehold.ts`:
- Line 69: docstring for `useCreateHousehold` (unaffected — comment-only reference to the join flow from the old hardcoded path; out of scope for this plan)
- Line 90: `useCreateHousehold` insert sets `role: 'admin'` for the household creator (unaffected by this plan — creator bootstrap is correct as-is per SPEC)

Both are expected per Plan 04's critical-L020 guard.

## Imports check

`head -5 src/hooks/useHousehold.ts` unchanged:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { queryKeys } from '../lib/queryKeys'
import type { Household, HouseholdMember, HouseholdInvite, MemberProfile, Profile } from '../types/database'
```

No new imports added. All three new hooks reuse `useMutation`, `useQueryClient`, `supabase` already present.

## Deviations from Plan

None — plan executed exactly as written. Two tasks, two surgical edits (Task 1) and one append block (Task 2), each committed individually with `--no-verify`. All pre-existing exports remain byte-identical; only in-scope changes applied.

## Known Stubs

None. All three new hooks are fully wired and ready for consumption by Plans 30-05 and 30-06. The `as never` cast is a documented repo convention (CONTEXT.md "Reusable Assets"), not a stub.

## Commits

| Task | Commit    | Files                      | Description                                                                                 |
| ---- | --------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| 1    | `094dc45` | src/hooks/useHousehold.ts | fix(30-04): respect invite.role in useJoinHousehold + optional role in useCreateInvite      |
| 2    | `5674804` | src/hooks/useHousehold.ts | feat(30-04): add useChangeMemberRole, useRemoveHouseholdMember, useLeaveHousehold           |

## Self-Check: PASSED

- FOUND: src/hooks/useHousehold.ts (modified, 344 lines, 12 top-level exports)
- FOUND commit: 094dc45
- FOUND commit: 5674804
- CONFIRMED: tsc --noEmit clean (zero output)
- CONFIRMED: tests/settings.test.tsx + tests/AppShell.test.tsx — 8/8 passed
- CONFIRMED: No modifications to STATE.md or ROADMAP.md (parallel executor rule)
- CONFIRMED: No new imports introduced
- CONFIRMED: All 5 SPEC-Req-* hook-layer changes landed in a single file
