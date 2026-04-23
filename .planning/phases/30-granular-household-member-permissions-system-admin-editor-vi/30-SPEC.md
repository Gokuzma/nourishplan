# Phase 30: Granular Household Member Permissions — Specification

**Created:** 2026-04-23
**Ambiguity score:** 0.14 (gate: ≤ 0.20)
**Requirements:** 8 locked

## Goal

Any household admin can grant admin rights to another member, demote an admin back to member, invite a new member with a pre-selected role, remove a member from the household, or leave the household themselves — with DB-enforced protection against leaving a household with zero admins.

## Background

Today (`supabase/migrations/001_foundation.sql`):
- `household_role` enum has exactly two values: `'admin' | 'member'`
- The household creator is bootstrapped as `'admin'` (policy `creator inserts self as admin`)
- Everyone joining via invite lands as `'member'` (hardcoded in `useJoinHousehold` at `src/hooks/useHousehold.ts:130`)
- **No UI exists to change a member's role** — `MemberList.tsx` only displays the role badge
- **No RPC or RLS policy permits role changes** — the `role` column is effectively immutable after insert
- **No RPC permits admins to remove members, and no self-leave action exists** — removing oneself or another requires a direct SQL DELETE that RLS blocks
- 17 RLS policies across 5 migrations gate writes on `role = 'admin'` (invites, food, recipes, meal plans, targets, household settings); these already work correctly for any admin, not just the creator
- The app has no notification system and no audit logging infrastructure

The real-world trigger (confirmed in interview): a partner needs co-admin access; a teen should remain limited to the existing `'member'` capabilities (logging meals, viewing plan); and admins need to remove members who leave the family.

## Requirements

1. **Role change RPC**: A single admin can promote another member to admin or demote an admin back to member.
   - Current: no RPC exists; `role` column is immutable in practice because no RLS policy permits UPDATE on it
   - Target: `change_member_role(member_row_id uuid, new_role household_role)` RPC — callable by any admin in the same household as the target member; updates `household_members.role`
   - Acceptance: Logged in as admin A, calling `change_member_role(<member B row id>, 'admin')` updates B's role to `'admin'`; same call with `'member'` demotes back; calls from a non-admin return a permission error

2. **Last-admin protection (DB-enforced)**: Demoting, removing, or leaving must never reduce a household's admin count to zero.
   - Current: no protection exists; there is no path that can reduce admin count today, but each new RPC/RLS in this phase could accidentally brick a household
   - Target: every role-change / removal / leave path rejects with error message `"At least one admin required"` when the operation would leave the household with zero admins. Enforcement happens inside the RPC AND is backed by a DB trigger (so direct table manipulation also fails)
   - Acceptance: Sole admin calling `change_member_role(self, 'member')`, `remove_household_member(self)`, or `leave_household()` receives error `"At least one admin required"`; no household row in test DB ever has admin count = 0 after any of these operations

3. **Remove-member RPC**: An admin can remove another member from the household.
   - Current: no RPC exists; RLS on `household_members` has no DELETE policy, so deletes are blocked for everyone
   - Target: `remove_household_member(member_row_id uuid)` RPC — callable by admins; deletes the target's `household_members` row (cascade effects from existing FK constraints). Subject to last-admin protection
   - Acceptance: Logged in as admin A, calling `remove_household_member(<member B row id>)` removes B; B's subsequent queries return no household (empty `useHousehold()` result); non-admin callers receive permission error

4. **Self-leave RPC**: Any household member (including an admin, when not the last one) can leave the household voluntarily.
   - Current: no mechanism; deletes are blocked by missing RLS DELETE policy
   - Target: `leave_household()` RPC — deletes the caller's own `household_members` row. Subject to last-admin protection. Available to all members regardless of role
   - Acceptance: Member B calling `leave_household()` removes B's membership row; B can then create or join another household. Sole admin calling it receives `"At least one admin required"` error

5. **Invite-time role selection**: Admins can choose the role (`'admin'` or `'member'`) a new member will have when they accept an invite.
   - Current: `household_invites` has no `role` column; `useJoinHousehold` hardcodes `role: 'member'` on insert
   - Target: add `household_invites.role household_role not null default 'member'` column (migration); `useCreateInvite` accepts an optional role parameter; `useJoinHousehold` reads `invite.role` and inserts the new member with that role; RLS on `household_invites` allows admins to set the role on insert
   - Acceptance: Admin generates an invite with `role='admin'`; the joining user lands with `household_members.role = 'admin'` and immediately has admin capabilities. Default (unset) invite creates a `'member'` as today

6. **Admin UI on HouseholdPage**: Admins see role-management controls inline in the member list; members do not.
   - Current: `MemberList.tsx` shows a static role badge only; no interactive controls
   - Target: for each other member, an admin sees (a) a role-change button/menu (promote/demote) and (b) a Remove button. For themselves, an admin sees a Leave button. Non-admins see only the existing read-only badges plus a Leave button for themselves. Buttons that would fail last-admin protection are disabled with a tooltip explaining why
   - Acceptance: Logged in as admin in a 2-admin household, both members show promote/demote + remove buttons; in a 1-admin household, the admin's own row's Leave button is disabled and the sole admin's self-demote control is disabled. Logged in as member, no promote/demote/remove buttons appear; only a Leave button on own row

7. **Invite form UI**: The Invite Link section on HouseholdPage lets admins choose whether the generated invite creates an admin or a member.
   - Current: `InviteLink` component generates an invite with no role choice (hardcoded 'member' server-side)
   - Target: add a role toggle / radio (default: Member) to the invite form; generated link carries the selected role server-side
   - Acceptance: Admin can toggle invite role to 'admin', generate link, and a user accepting that link becomes an admin

8. **Regression test — promoted admin equivalence**: A promoted admin has the exact same capabilities as the original creator for at least one previously-gated action.
   - Current: 17 RLS policies use `role = 'admin'` pattern and structurally work for any admin, but this has never been proven end-to-end
   - Target: one regression test (Vitest + Supabase test DB or Playwright) that promotes a member to admin and then successfully performs an action previously restricted to the creator (e.g., edit `households.weekly_budget` or create an invite)
   - Acceptance: Test passes: promoted admin can (a) create a new invite, (b) update household weekly budget, (c) edit another member's role. Test fails if any of these returns a permission error

## Boundaries

**In scope:**
- Three new RPCs: `change_member_role`, `remove_household_member`, `leave_household`
- One schema migration: `household_invites.role` column (`household_role`, default `'member'`)
- One DB trigger (or equivalent) enforcing last-admin protection at table level
- New RLS policies permitting: admin UPDATE of `household_members.role`, admin DELETE of `household_members`, self-DELETE of `household_members` (for leave), admin setting `role` on invite insert
- HouseholdPage / MemberList / InviteLink UI updates
- One regression test proving promoted-admin equivalence

**Out of scope:**
- **Tier-based roles** (admin / editor / viewer) — binary admin/member is sufficient for the stated use cases (partner co-admin + teen-as-member)
- **Per-feature capability scopes** (e.g., `can_manage_budget`) — overkill for 2–5-person families; adds 17 RLS rewrites and a new table
- **Audit log** (`household_audit_log` table) — not needed for MVP; families are small and members know each other. Can be added in a later phase if requested
- **Notifications** (email, push, in-app toasts) for role changes or removals — the app has no notification infrastructure; affected users will see changes on next query refetch, which matches every other state change today
- **Rewriting the 17 existing admin-gated RLS policies** — they already check the role column (not `user_id = creator`), so they automatically grant equal rights to any admin. Confirmed via migration inspection
- **Household creator protection** — there is no concept of "creator" distinct from "admin" in this phase; last-admin protection is the only guard
- **Transferring household ownership** — no single "owner" exists; all admins are equal

## Constraints

- **Preserve the `household_role` enum values** (`'admin' | 'member'`) — no ALTER TYPE ADD VALUE. This keeps all 17 existing RLS policies functional without rewrites
- **Last-admin protection MUST be enforced at the DB level** (trigger or CHECK-equivalent on `household_members`), not only in RPC logic — a future code path that bypasses the RPC must still fail
- **All three RPCs MUST run with `security definer` and `set search_path = ''`** per existing RPC conventions in this project (see `mark_invite_used` for the reference pattern)
- **Self-leave via RPC MUST NOT require admin privileges** — a regular member must be able to call `leave_household()` on their own row
- **UI controls MUST reflect DB state, not client assumptions** — disabled state for last-admin buttons must be driven by a query (admin count) so the UI cannot get out of sync with the DB trigger
- **No breaking change to existing `useCreateInvite` / `useJoinHousehold` callers** — the invite role parameter must be optional and default to `'member'`; join flow must tolerate legacy invites rows that pre-date the new `role` column (the default covers this)

## Acceptance Criteria

- [ ] `change_member_role` RPC promotes a member to admin when called by an existing admin; caller receives permission error otherwise
- [ ] `change_member_role` demotes an admin to member when called by an existing admin; rejects if it would leave zero admins
- [ ] `remove_household_member` removes a non-last-admin member when called by an admin; removed user's `useHousehold()` query returns null afterwards
- [ ] `leave_household` removes the caller's own membership row; rejects with `"At least one admin required"` if caller is the sole admin
- [ ] `household_invites.role` column exists with default `'member'`; admin can specify `'admin'` when generating an invite; joiner lands with that role
- [ ] HouseholdPage admin sees promote/demote and Remove buttons for other members; disabled controls for last-admin edge cases carry a tooltip
- [ ] Non-admin household members see read-only role badges plus a Leave button on their own row only
- [ ] Regression test passes: a member promoted to admin successfully creates an invite AND updates `households.weekly_budget` AND changes another member's role

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                           |
|--------------------|-------|------|--------|-----------------------------------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      | 8 falsifiable requirements, explicit RPCs and UI targets        |
| Boundary Clarity   | 0.88  | 0.70 | ✓      | 7-item out-of-scope list with reasoning                         |
| Constraint Clarity | 0.80  | 0.65 | ✓      | Enum preserved; DB-level protection mandated; RPC conventions   |
| Acceptance Criteria| 0.85  | 0.70 | ✓      | 8 pass/fail checkboxes                                          |
| **Ambiguity**      | 0.14  | ≤0.20| ✓      | All dimensions above minimum                                    |

## Interview Log

| Round | Perspective         | Question summary                                     | Decision locked                                                                  |
|-------|---------------------|------------------------------------------------------|----------------------------------------------------------------------------------|
| 1     | Researcher          | Which permissions model (binary / tiers / scopes)?   | Binary admin/member with promotion — reuses existing 17 RLS checks unchanged     |
| 1     | Researcher          | Real-world trigger?                                  | Partner co-admin + teen-stays-member + edit plans + manage budget/inventory      |
| 2     | Boundary Keeper     | Last-admin protection?                               | Block with error — enforced in RPC and DB trigger                                |
| 2     | Simplifier          | Invite-time role selection?                          | Yes — add `role` column to `household_invites`                                   |
| 2     | Researcher          | Member removal scope?                                | Yes + self-leave — three RPCs (change_role, remove, leave); last-admin blocks    |
| 3     | Failure Analyst     | Audit trail in this phase?                           | No — deferred; families are small, no accountability infrastructure exists       |
| 3     | Failure Analyst     | Notification when role changes?                      | Silent — relies on existing query refetch; no new notification system            |
| 3     | Boundary Keeper     | Existing 17 RLS policies need rewriting?             | No — all check `role` column, structurally work for any admin; no rewrites       |

---

*Phase: 30-granular-household-member-permissions-system-admin-editor-vi*
*Spec created: 2026-04-23*
*Next step: /gsd-discuss-phase 30 — implementation decisions (RPC signatures, migration sequencing, test infrastructure)*
