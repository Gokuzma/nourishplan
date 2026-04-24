---
phase: 30-granular-household-member-permissions-system-admin-editor-vi
plan: 01
subsystem: household-permissions-db
tags: [supabase, migration, rls, rpc, security-definer, trigger, permissions, types]
requires:
  - household_role enum (from migration 001)
  - household_members + household_invites tables (from migration 001)
provides:
  - supabase/migrations/031_household_permissions.sql — DB layer for Phase 30
  - change_member_role(member_row_id uuid, new_role public.household_role) RPC
  - remove_household_member(member_row_id uuid) RPC
  - leave_household() RPC
  - enforce_last_admin() trigger function + enforce_last_admin_trg trigger
  - household_invites.role column (household_role, NOT NULL, default 'member')
  - RLS policies: "admins update member roles", "admins delete members", "members delete self"
  - HouseholdInvite.role typed field (src/types/database.ts)
affects:
  - Every downstream Phase 30 plan (02-07) depends on the RPCs + role column being live in prod
tech-stack:
  added: []
  patterns:
    - security-definer + SET search_path = '' + fully-qualified identifiers (stricter than mark_invite_used)
    - defense-in-depth: pre-flight admin-count check in each RPC + BEFORE trigger on household_members
    - exact contractual error string 'At least one admin required' (5 occurrences)
key-files:
  created:
    - supabase/migrations/031_household_permissions.sql
  modified:
    - src/types/database.ts
decisions:
  - Combined migration (column + trigger + 3 RPCs + RLS) matches 020_budget_engine.sql single-file precedent
  - Enum household_role NOT altered (preserves all 17 existing admin-gated RLS policies)
  - Live RPC smoke test deferred to Plan 07 Playwright spec (service role key not available at Wave 1 per checker W-12)
metrics:
  duration_minutes: 3
  tasks_completed: 2
  tasks_total: 3
  completed_date: 2026-04-24
---

# Phase 30 Plan 01: Household Permissions DB Layer Summary

One-liner: One combined migration (column + last-admin trigger + 3 security-definer RPCs + 3 RLS policies) delivered + HouseholdInvite type carries the new role field; Supabase push gated behind human-verify checkpoint.

## What Shipped (code-level, committed to this worktree branch)

### Task 1 — supabase/migrations/031_household_permissions.sql (commit `49359ea`)

Single migration file with 7 sections in the exact order specified by the plan:

1. **Section 1 — `ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS role public.household_role NOT NULL DEFAULT 'member';`** Satisfies SPEC Req #5.
2. **Section 2 — `enforce_last_admin()` trigger function + `enforce_last_admin_trg` BEFORE UPDATE OR DELETE trigger on household_members.** The function guards only the two admin-dropping code paths (UPDATE that demotes an admin, DELETE of an admin row); all other ops fast-path return. Counts OTHER admin rows (`id <> old.id`) and raises the exact contractual string `'At least one admin required'` with errcode P0001 when zero. Satisfies SPEC Req #2 + SPEC Constraint §2 (DB-level enforcement).
3. **Section 3 — `change_member_role(member_row_id uuid, new_role public.household_role) → void` RPC.** Cross-household guard: reads the target's `household_id` first, then verifies caller is admin in THAT household (not just any household) — SPEC Req #1 + threat register T-30-03.
4. **Section 4 — `remove_household_member(member_row_id uuid) → void` RPC.** Same cross-household guard + defense-in-depth last-admin check when target is an admin. Satisfies SPEC Req #3.
5. **Section 5 — `leave_household() → void` RPC.** Self-DELETE; does NOT require admin (SPEC Constraint §4). Defense-in-depth last-admin check when caller is an admin. Satisfies SPEC Req #4.
6. **Section 6 — RLS UPDATE policy `"admins update member roles"` on household_members.** Both `using` and `with check` EXISTS-subquery verify caller is admin in the same household.
7. **Section 7 — RLS DELETE policies `"admins delete members"` + `"members delete self"`.** Admin branch mirrors Section 6; self branch restricted to `user_id = (select auth.uid())`.

All three RPCs and the trigger function use `SECURITY DEFINER SET search_path = ''` (stricter than the legacy `mark_invite_used` pattern which uses `= public`) and fully qualify every identifier (`public.household_members`, `public.household_role`, `auth.uid()`). Grants: `grant execute on function … to authenticated` on all three RPCs.

**Verification (all grep assertions passed before commit):**
- `'At least one admin required'` appears 5 times (plan required ≥4 — trigger + 3 RPC pre-flight checks; the 5th is inside the check branch of change_member_role, an additional safety margin).
- `set search_path = ''` appears 4 times (trigger fn + 3 RPCs).
- `alter type household_role` absent — enum preserved per SPEC Constraint §1.
- `alter table public.household_invites` present with `add column if not exists role public.household_role not null default 'member'`.
- All three `create policy` statements present.
- All three `grant execute on function` statements present.

### Task 2 — src/types/database.ts (commit `4f1c5d0`)

Two minimal additions (net +3 / -1 lines):

**Diff (HouseholdInvite interface, lines 24–33):**
```diff
 export interface HouseholdInvite {
   id: string
   household_id: string
   token: string
   created_by: string
   expires_at: string
   used_at: string | null
+  role: 'admin' | 'member'
   created_at: string
 }
```

**Diff (household_invites Insert helper, lines 384–394):**
```diff
       household_invites: {
         Row: HouseholdInvite
-        Insert: Omit<HouseholdInvite, 'id' | 'token' | 'created_at' | 'used_at'> & {
+        Insert: Omit<HouseholdInvite, 'id' | 'token' | 'created_at' | 'used_at' | 'role'> & {
           id?: string
           token?: string
           created_at?: string
           used_at?: string | null
+          role?: 'admin' | 'member'
         }
         Update: Partial<Omit<HouseholdInvite, 'id'>>
       }
```

`npx tsc --noEmit` returns clean (zero output / exit 0). No other line in the file is touched — `HouseholdMember.role` (line 20), `household_role` enum entry, and every other table's Insert helper are byte-identical.

## Checkpoint Gated — Task 3 (supabase db push)

Task 3 is `type="checkpoint:human-verify"` with `gate="blocking"` and `autonomous: false` at the plan level. Per the plan-specific notes in the executor prompt:

> "When you hit the checkpoint for the push (the plan task that requires pushing the migration to live Supabase), STOP and return a checkpoint handoff — do NOT attempt the push yourself, since you don't have the access token."

I did not run `npx supabase db push`. The migration file is committed on this worktree branch (`49359ea`) and will reach `main` after the orchestrator merges, but the schema is NOT yet live in the prod Supabase project (`qyablbzodmftobjslgri`). TypeScript will compile because the types come from `src/types/database.ts` — this is a load-bearing false-positive state per the plan objective. Plans 02–07 cannot pass Playwright verification until the push lands.

**To unblock downstream plans, run (from repo root, after worktree merges):**
```bash
export $(grep SUPABASE_ACCESS_TOKEN .env.local | xargs)
test -n "$SUPABASE_ACCESS_TOKEN" || { echo "Token missing from .env.local"; exit 1; }
npx supabase db push
npx supabase migration list | grep -E "031[_-]household_permissions"
```

Expected success signal:
- `npx supabase db push` prints `Applying migration 031_household_permissions.sql...` and exits 0.
- `npx supabase migration list` shows `031_household_permissions` in the applied column.

Per checker note W-12, `SUPABASE_ACCESS_TOKEN` is the only Supabase credential in `.env.local`; no `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` export is needed for `db push` + `migration list`. Live RPC smoke testing is deferred to Plan 07's Playwright spec (which has access to real auth + RPC calls via a logged-in browser session).

## Deviations from Plan

None — plan executed exactly as written. The migration file is a verbatim implementation of Patterns A–E from 30-PATTERNS.md with the exact error strings and policy shapes specified. The types edit is a surgical 3-line addition bounded by the plan's `acceptance_criteria` line-count limit (`<= 4`).

## Security Checklist Confirmation (threat_model)

- [x] All three RPCs declare `SECURITY DEFINER` and `SET search_path = ''`
- [x] All three RPCs fully qualify `public.household_members`, `auth.uid()`
- [x] `change_member_role` and `remove_household_member` verify caller is admin of the TARGET's household (not any household)
- [x] `leave_household` does NOT require admin
- [x] Last-admin check present in BOTH each RPC body AND the trigger
- [x] Exact string `'At least one admin required'` present in trigger + all three RPCs
- [x] RLS UPDATE policy on `household_members` requires caller = admin in same household
- [x] RLS DELETE policy admin branch requires caller = admin in same household
- [x] RLS DELETE policy self branch restricted to `user_id = (select auth.uid())`
- [x] `grant execute … to authenticated` present for all three RPCs

## Known Stubs

None. All work committed is production-bound — migration is an executable SQL file, the type addition is referenced by downstream hooks (starting with Plan 02).

## Commits

| Task | Commit | Files | Description |
|------|--------|-------|-------------|
| 1 | `49359ea` | supabase/migrations/031_household_permissions.sql | Migration: column + trigger + 3 RPCs + RLS policies |
| 2 | `4f1c5d0` | src/types/database.ts | HouseholdInvite.role + Insert helper |
| 3 | — (blocking checkpoint) | — | `supabase db push` — human-verify gate |

## Self-Check: PASSED

- FOUND: supabase/migrations/031_household_permissions.sql
- FOUND: src/types/database.ts (modified)
- FOUND commit: 49359ea
- FOUND commit: 4f1c5d0
- CONFIRMED: No modifications to STATE.md or ROADMAP.md (parallel executor rule)
- CONFIRMED: Task 3 not executed (access-token checkpoint, orchestrator relays to user)
