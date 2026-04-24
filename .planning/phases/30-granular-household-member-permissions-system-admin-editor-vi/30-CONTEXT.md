# Phase 30: Granular Household Member Permissions - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver binary admin/member permissions with promotion, demotion, member removal, self-leave, and invite-time role selection — with DB-enforced last-admin protection. Binary model only; no tiers, no per-feature scopes, no audit log, no notifications.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**8 requirements are locked.** See `30-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `30-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Three new RPCs: `change_member_role`, `remove_household_member`, `leave_household`
- One schema migration: `household_invites.role` column (`household_role`, default `'member'`)
- One DB trigger (or equivalent) enforcing last-admin protection at table level
- New RLS policies permitting: admin UPDATE of `household_members.role`, admin DELETE of `household_members`, self-DELETE of `household_members` (for leave), admin setting `role` on invite insert
- HouseholdPage / MemberList / InviteLink UI updates
- One regression test proving promoted-admin equivalence

**Out of scope (from SPEC.md):**
- Tier-based roles (admin / editor / viewer)
- Per-feature capability scopes (e.g., `can_manage_budget`)
- Audit log (`household_audit_log` table)
- Notifications (email, push, in-app toasts) for role changes or removals
- Rewriting the 17 existing admin-gated RLS policies
- Household creator protection (no "creator" concept distinct from "admin")
- Transferring household ownership

</spec_lock>

<decisions>
## Implementation Decisions

### Admin UI interaction (MemberList + HouseholdPage)

- **D-01:** Overflow menu (⋮) per member row. Tapping the kebab icon opens a small popover with Promote/Demote + Remove for other members. For the current user's own row, the menu contains Leave (plus Demote if user is a non-last admin). Keeps the existing flat badge layout intact; minimizes mobile-space pressure vs inline pill buttons.
- **D-02:** Confirm dialog for ALL four actions — Promote, Demote, Remove, Leave. Consistent one-pattern flow; users never fire an unintended role change. No special-casing of Promote as "reversible, one-tap" — uniformity over speed.
- **D-03:** Silent refetch on success. TanStack Query `invalidateQueries({ queryKey: ['household'] })` (prefix-match to hit `useHouseholdMembers`) updates the UI automatically. Badge changes in place; removed rows disappear. No toast system exists in the codebase today and adding one is out of scope.

### Last-admin guard UX

- **D-04:** Disabled menu items + tooltip when an action would violate last-admin protection. Matches SPEC Req #6 exactly. On desktop, tooltip appears on hover. On mobile, the implementation should use tap-to-reveal (see Claude's Discretion — specific mechanic is planner's call but MUST work on touch).
- **D-05:** Tooltip copy: **"Promote another member to admin first."** Explains the fix rather than restating the DB error. The literal DB error string (`"At least one admin required"`) still propagates from the RPC — it surfaces only if a user hits the disabled state some other way (direct SQL, bypassed UI, race condition).
- **D-06:** Admin count is derived from the already-fetched `useHouseholdMembers` result: `members.filter(m => m.role === 'admin').length`. Zero new queries, zero new hooks. O(n) over a 2–5-element array. Cache staleness is identical to the list rendered on screen — UI consistency is free.
- **D-07:** Sole-admin-wants-to-exit is a **hard block** in Phase 30. Leave button disabled with the D-05 tooltip; no "delete household" escape hatch built. `delete_household` for sole-admin exit is captured in Deferred Ideas for a future phase (see `<deferred>` below).

### Regression test strategy (SPEC Req #8)

- **D-08:** Playwright E2E test. Uses the existing Supabase test account (`claude-test@nourishplan.test`) as the promoting admin. Test flow: log in as admin A → promote member B via the new UI → sign in as B → perform at least three previously-admin-gated actions (create invite, update `households.weekly_budget`, change another member's role) → assert each succeeds. UI-level assertions; no direct RPC calls. Covers both the DB layer and the new UI.
- **D-09:** Seed a second fixed test account — **`claude-test-member@nourishplan.test`** — via a Supabase admin-SDK seed script (checked into the repo under `scripts/` or equivalent). One-time provisioning; reused across all future multi-user E2E tests. Document the credentials in project memory after seeding.
- **D-10:** Test file location: `tests/e2e/household-permissions.spec.ts`. Runs on-demand (`npx playwright test`) before merge. **No CI gate in Phase 30** — matches the v2.0 Playwright UAT convention. CI gating is captured as a Deferred Idea.
- **D-11:** This is the **first Playwright E2E test in the repo**. Phase 30 adds `playwright.config.ts` + the Playwright devDependency + a helper for the login flow. Sets the pattern for all future E2E work. Phase 30 does NOT retrofit any existing test to Playwright — only the new regression test.

### Invite role control (InviteLink)

- **D-12:** Segmented control `[Member | Admin]` above the Generate button. Default = Member (per SPEC). Two-option toggle matches the binary choice; compact on mobile; no extra checkbox/radio verbosity.
- **D-13:** After generation, the displayed URL row shows a role badge next to the link: `https://…/join?invite=abc • [Admin]`. Uses the same pastel badge styling as `MemberList` RoleBadge. Eliminates "which role did I just generate?" ambiguity when an admin has multiple copied links.
- **D-14:** Toggling the segmented control AFTER a link has been generated **clears the displayed link** and forces the admin to press Generate again. Prevents the badge/URL from going stale. Existing invites are not proactively revoked; they remain valid until expiry / use.
- **D-15:** The `/join` page (JoinHousehold) displays the inviting role before the joiner accepts: *"Join [Household Name] as an Admin"* or *"…as a Member."* Sets expectations so a promoted-admin user isn't confused when they see additional capabilities. Small scope increment to `JoinHousehold.tsx` beyond what SPEC explicitly mentioned — kept in scope because it's a direct UX consequence of D-12.

### Claude's Discretion

- **RPC error signaling mechanism** — planner picks between `raise exception '%', 'At least one admin required' using errcode = 'P0001'` versus returning `{ ok: false, error: "…" }`. SPEC requires the exact string `"At least one admin required"` to surface to the caller; implementation pattern can match existing RPCs (`mark_invite_used` uses plain exceptions) or improve on them.
- **Migration packaging** — one file `031_household_permissions.sql` combining invite-role column + trigger + all three RPCs + RLS policies, versus split migrations. Single-file is simpler to roll back and matches the `020_budget_engine.sql` / `021_inventory.sql` pattern.
- **Confirm dialog component** — build a small reusable `<ConfirmDialog>` component versus inline native `confirm()` versus an existing modal pattern (check `ImportRecipeModal` from Phase 25 for precedent). Planner's call.
- **Overflow menu / popover primitive** — no existing kebab-menu pattern in the codebase. Planner decides between building a minimal custom popover, using a headless primitive (Radix / Headless UI), or a CSS-only disclosure. Accessibility (keyboard nav, ARIA) must be handled either way.
- **Mobile tooltip mechanic** — tap-to-reveal vs long-press vs inline helper text when a menu item is disabled. Must work on touch; desktop hover is straightforward.
- **Specific Playwright login helper shape** — whether to factor login into a shared fixture, a `beforeAll` hook, or a utility function. Planner's call.
- **Whether `useChangeMemberRole` / `useRemoveMember` / `useLeaveHousehold` are three hooks or one polymorphic hook** — all three are TanStack mutations invalidating `['household']`; planner picks based on parameter shape clarity.
- **Exact invalidation keys** — likely `['household']` prefix catches `useHousehold`, `useHouseholdMembers`, `useMemberProfiles`. Planner verifies via `queryKeys.ts`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements (read first)
- `.planning/phases/30-granular-household-member-permissions-system-admin-editor-vi/30-SPEC.md` — **MANDATORY.** 8 locked requirements, boundaries, constraints, acceptance criteria.
- `.planning/ROADMAP.md` §Phase 30 — phase goal + dependency on Phase 29.

### DB schema + RLS (the code that changes)
- `supabase/migrations/001_foundation.sql` lines 80–192 — `household_role` enum, `household_members` table + RLS, `household_invites` table + RLS. The three admin-gated write policies (`admins create invites`, `admins insert members`, `admins update invites`) are the template for the new UPDATE/DELETE policies this phase adds.
- `supabase/migrations/002_fix_household_members_rls.sql` — prior RLS fix on member table; shows RLS iteration pattern.
- `supabase/migrations/005_fix_invite_join_rls.sql` — security-definer helper pattern that bypasses RLS for the join flow. Same pattern applies to `leave_household()` (self-DELETE needs to bypass admin-DELETE gate).
- `supabase/migrations/012_fix_invite_update_rls.sql` — most recent invite RLS touch; establishes admin-UPDATE policy shape.
- `supabase/migrations/013_fix_profile_trigger_security.sql` lines 47–61 — `mark_invite_used` reference RPC. **Note:** uses `SET search_path = public`; SPEC.md Constraint §3 requires new RPCs in this phase to use `SET search_path = ''` (stricter). Existing RPC is not retroactively changed; new RPCs follow the stricter pattern.

### Frontend targets (the code that changes)
- `src/pages/HouseholdPage.tsx` — page shell; role label already shown at line 40. Admin-gated sections exist at lines 51 + 59.
- `src/components/household/MemberList.tsx` — read-only badges today. The overflow-menu UI (D-01) + confirm dialogs (D-02) land here. `RoleBadge` (lines 5–18) is reused for D-13.
- `src/components/household/InviteLink.tsx` — `handleGenerate` at line 9 currently passes `undefined` to the mutation. Segmented control (D-12) + role badge (D-13) + clear-on-toggle (D-14) land here.
- `src/components/household/JoinHousehold.tsx` — receives the joiner; add role display per D-15.
- `src/hooks/useHousehold.ts` — all existing patterns for new mutation hooks. Key landmarks:
  - `useHouseholdMembers` (lines 45–64) — admin-count derivation source per D-06.
  - `useCreateInvite` (lines 156–178) — extend to accept optional `role` parameter per SPEC Req #5.
  - `useJoinHousehold` (lines 108–150) — `role: 'member'` hardcoded at line 130 must be replaced with `invite.role ?? 'member'` per SPEC Req #5.
  - `useCreateHousehold` (lines 71–100) — role: 'admin' insert pattern (unchanged by this phase).
- `src/lib/queryKeys.ts` — verify `['household']` prefix catches members/memberProfiles for invalidation per D-03.
- `src/types/database.ts` — `HouseholdInvite` type needs a `role` field added alongside the column migration.

### Testing target
- `tests/AppShell.test.tsx`, `tests/settings.test.tsx` — examples of mocked Vitest tests in the repo (for context; Phase 30 adds the first Playwright E2E, not more mocked Vitest).
- No existing `playwright.config.ts` — Phase 30 adds it.

### Memory reference (credentials)
- Test account: `claude-test@nourishplan.test` / `ClaudeTest!2026` — existing admin of "Test Household" (ID `8782ee1f-057b-4a1e-8c43-206c7bc1dbc0`).
- Second account to seed in Phase 30 per D-09: `claude-test-member@nourishplan.test` (credentials chosen during implementation).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **TanStack Query mutation pattern** (`useCreateInvite`, `useCreateHousehold`) — template for the three new mutation hooks (`useChangeMemberRole`, `useRemoveHouseholdMember`, `useLeaveHousehold`).
- **`supabase.rpc()` invocation pattern** — used by `useJoinHousehold` at line 140 (`supabase.rpc('mark_invite_used' as never, { invite_id } as never)`). The `as never` cast is repo convention when the generated types haven't been regenerated — the three new RPCs will follow the same pattern until types are regenerated.
- **`RoleBadge` component** (`MemberList.tsx` lines 5–18) — reused verbatim for D-13 invite link role badge.
- **Section card pattern** (`HouseholdPage.tsx` lines 51–67) — `rounded-card border border-accent/40 bg-surface p-5 shadow-sm` for new grouped UI (e.g., if a Leave section is needed separate from the menu).
- **`useAuth()`** — for identifying the current user vs others in MemberList (already used; line 21 of MemberList).

### Established Patterns
- **Mocked Vitest tests** — everything under `tests/` mocks the supabase module. Phase 30 departs from this only for the E2E regression test (real Supabase via Playwright).
- **Admin-gated UI via role check** — `HouseholdPage` already gates sections by `membership.role === 'admin'`. Same check drives per-menu-item visibility in D-01.
- **Security definer + SET search_path** — all RPCs must use this. SPEC mandates the stricter `= ''` form for new RPCs.
- **Cache invalidation by prefix** — `queryClient.invalidateQueries({ queryKey: ['household'] })` already used by `useCreateHousehold` / `useJoinHousehold` (lines 96–98 + 146–148). Prefix-match ensures members + memberProfiles + root all refetch together. Applied identically for D-03.

### Integration Points
- `HouseholdPage.tsx` — no new sections; existing `<section>` for Members absorbs the new overflow-menu UI. Existing Admin-only sections (Invite Link + Managed Profiles) absorb the segmented control (D-12).
- `supabase/migrations/031_household_permissions.sql` (new) — standalone migration; no other migrations depend on it.
- `src/types/database.ts` — `HouseholdInvite` type update + possibly `HouseholdMember.role` unchanged (enum values preserved per SPEC Constraint §1).

### Creative Options Enabled
- Reusing TanStack's `invalidateQueries` with the existing `['household']` prefix means all three new mutation hooks can land without a single change to `queryKeys.ts` or any other hook's caching logic.
- Reusing the existing `RoleBadge` for D-13 means zero new design work for the invite-link badge — color + shape already match the member list.
- The binary model preserves the 17 existing admin-gated RLS policies unchanged, so promoted admins automatically inherit all current admin capabilities the moment the role column flips — no RLS rewrites, no re-QA of existing gates (though Req #8's regression test proves this end-to-end for the first time).

### Creative Options Constrained
- No toast system exists, so D-03 is silent refetch rather than "removed Partner — undo" toasts.
- No popover / kebab-menu primitive exists, so D-01 requires building one (or adding a dep).
- No Playwright setup exists, so D-08 requires new infrastructure (config + dep + helper).

</code_context>

<specifics>
## Specific Ideas

- The user referenced a specific real-world trigger: **partner as co-admin, teen stays a member**. Every UI decision in this phase should preserve the simplicity of that flow — one admin promoting one person, rarely, in a 2–5-person household. Over-engineering is the main risk.
- The **exact DB error string `"At least one admin required"`** is load-bearing — it's the acceptance criterion for SPEC Req #2 + Req #4. All three RPCs + the trigger must emit that exact string. D-05's friendlier tooltip is the UI layer on top, not a replacement.
- Segmented control visual style should **match the `RoleBadge` pastel palette** — pastel primary when selected, pastel secondary when not. Keeps the app's minimalist pastel aesthetic consistent.

</specifics>

<deferred>
## Deferred Ideas

These came up during discussion and are intentionally NOT in Phase 30. Captured here so they aren't lost.

- **Household deletion for sole-admin exit** — a `delete_household()` RPC with cascade across ~20 tables (household_members, household_invites, meals, meal_plans, meal_logs, targets, recipes, food_logs, inventory, grocery lists, schedules, plan_generations, feedback, dietary restrictions, member_profiles, etc.), plus a confirm-by-typing-name UX and re-QA. Size ≈ Phase 30 itself. Defer to its own phase when a user actually needs it.
- **Toast notification system** — a generalizable toast primitive (success / error / undo). Useful for many future actions beyond this phase.
- **CI gate for Playwright E2E** — Phase 30 adds on-demand Playwright; future hardening phase wires it into GitHub Actions with CI secrets for Supabase + a deterministic test DB snapshot.
- **Tier-based / per-feature roles** (admin / editor / viewer, `can_manage_budget`, etc.) — already marked out-of-scope in SPEC.md. Re-surfaces only when a real-world use case (bigger households, caregivers, guests) forces it.
- **Audit log** (`household_audit_log` table) + **notifications** (email/push/in-app) for role changes — already out-of-scope per SPEC. Revisit if families outgrow "we all know each other" trust.
- **Retrofit existing `mark_invite_used` RPC** to the stricter `SET search_path = ''` convention — not blocking Phase 30, but a minor consistency cleanup.

</deferred>

---

*Phase: 30-granular-household-member-permissions-system-admin-editor-vi*
*Context gathered: 2026-04-23*
