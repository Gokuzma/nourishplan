# Phase 30: Granular Household Member Permissions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 30 — granular-household-member-permissions-system-admin-editor-vi
**Areas discussed:** Admin UI interaction, Last-admin guard UX, Regression test strategy, Invite role control

---

## Admin UI interaction

### Q: How should promote/demote/remove controls appear on each member row in MemberList.tsx?

| Option | Description | Selected |
|--------|-------------|----------|
| Overflow menu (⋯) | Kebab icon on each row opens a small popover menu. Compact, mobile-friendly. | ✓ |
| Inline pill buttons | Promote/Demote + Remove rendered as small pills next to the role badge. | |
| Tap row → modal | Tap member row opens a modal with role controls + Remove + details. | |

**User's choice:** Overflow menu (⋯)
**Notes:** Keeps clean badge layout, mobile-friendly, fewer buttons visible at once.

### Q: How should destructive actions (Remove, Demote-to-member, Leave) confirm?

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm dialog | Tap menu item → modal asks confirmation with Cancel/Confirm buttons. | ✓ |
| Inline 'Are you sure?' | Menu item expands inline to show a red confirm button. | |
| One-tap + toast undo | Action fires immediately; 5s toast with Undo. Requires toast infra. | |
| Confirm for destructive only | Remove/Leave confirm; Promote/Demote one-tap. | |

**User's choice:** Confirm dialog
**Notes:** Safety over speed. Two-click confirm for every state change.

### Q: Should Promote (member → admin) also show a confirm dialog, or fire one-tap?

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm dialog too | All four actions (Promote/Demote/Remove/Leave) use the same confirm pattern. | ✓ |
| One-tap promote | Only destructive actions confirm; Promote fires immediately. | |

**User's choice:** Confirm dialog too
**Notes:** Uniformity across all role-mutation actions.

### Q: What success feedback after an action completes?

| Option | Description | Selected |
|--------|-------------|----------|
| Silent refetch | TanStack Query invalidates; badges/rows update in place. No toast. | ✓ |
| Toast notification | Transient toast; requires adding a toast system. | |
| Inline status line | Small status message below the member list; fades after seconds. | |

**User's choice:** Silent refetch
**Notes:** Matches every other mutation pattern in the app today; no new infrastructure needed.

---

## Last-admin guard UX

### Q: When a control would violate last-admin protection, how should the UI behave?

| Option | Description | Selected |
|--------|-------------|----------|
| Disabled + tooltip | Menu item greyed out; tooltip explains why. | ✓ |
| Disabled + helper text row | Menu disabled; inline italic helper text below. | |
| Hidden entirely | If action would fail, don't show it. | |
| Shown but error on tap | Controls stay enabled; tap triggers DB error dialog. | |

**User's choice:** Disabled + tooltip
**Notes:** Matches SPEC Req #6 exactly. Mobile tooltip mechanic is Claude's Discretion.

### Q: What should the last-admin tooltip copy say?

| Option | Description | Selected |
|--------|-------------|----------|
| Technical & short | "At least one admin required." | |
| Explain-the-fix | "Promote another member to admin first." | ✓ |
| Both | "At least one admin required — promote another member first." | |

**User's choice:** Explain-the-fix
**Notes:** User-facing tooltip tells them how to unblock themselves. The literal DB error string still propagates from the RPC layer.

### Q: Where should the admin-count come from to drive disabled state?

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from useHouseholdMembers | Count admins in the already-fetched list. Zero new queries. | ✓ |
| Dedicated query | New useHouseholdAdminCount() for separation of concerns. | |
| Dedicated RPC | get_household_admin_count() RPC. Overkill for 2–5 member households. | |

**User's choice:** Derive from useHouseholdMembers
**Notes:** Members are already on screen; derive inline. Zero new infrastructure.

### Q: What happens when a sole admin wants to fully leave?

| Option | Description | Selected |
|--------|-------------|----------|
| Hard block — no escape | Leave disabled with tooltip. Must invite + promote first. | |
| Link to 'delete household' | Show a link to a new delete-household action. **Significantly expands scope.** | ✓ (initial) |
| Hard block + doc the gap | Same as hard block, but log the gap as a Deferred Idea. | |

**User's initial choice:** Link to 'delete household' — which the workflow flagged as scope creep.
**User's final choice after scope-creep check:** **Defer — hard block for now.**

| Scope-check option | Description | Selected |
|--------|-------------|----------|
| Defer — hard block for now | Phase 30 ships hard block only; delete-household captured as Deferred Idea. | ✓ |
| Add delete-household NOW | Expand Phase 30 — doubles the phase size (new RPC + cascade + confirm UX + re-QA). | |
| Add a stub link (no action) | Show a 'Contact support' message. Doesn't actually build deletion. | |

**Notes:** Household deletion captured in Deferred Ideas for a future phase.

---

## Regression test strategy

### Q: How should we build the SPEC Req #8 regression test?

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright E2E (Recommended) | Playwright test using existing test account. UI-level assertions. | ✓ |
| Vitest + real Supabase | New vitest with service-role key; first integration test in repo. | |
| pgTAP in migration | SQL-level assertions in migration or sibling test migration. | |
| HUMAN-UAT only | Manual checklist in 30-HUMAN-UAT.md. No automation. | |

**User's choice:** Playwright E2E
**Notes:** Reuses existing test account infrastructure (`claude-test@nourishplan.test`); matches how v2.0 Playwright UAT was done.

### Q: How should the 2nd test user be provisioned?

| Option | Description | Selected |
|--------|-------------|----------|
| Seed 2nd fixed account | Permanent test account via seed/migration. | ✓ |
| Create + teardown per run | Fresh auth user each run; hermetic. Needs service-role key + cleanup. | |
| Use real existing member | Depend on manual test data. Fragile. | |

**User's choice:** Seed 2nd fixed account (`claude-test-member@nourishplan.test`)
**Notes:** Reusable across future multi-user E2E tests.

### Q: Where should the Playwright test live + how should it run?

| Option | Description | Selected |
|--------|-------------|----------|
| tests/e2e/ — run on demand | Manual `npx playwright test` before merge. No CI gate. | ✓ |
| tests/e2e/ + CI gate | Gates merges in GitHub Actions. More robust; more complexity. | |
| Add Playwright config fresh | First Playwright test — adds config + dep. (Not mutually exclusive with others.) | — |

**User's choice:** tests/e2e/ — run on demand
**Notes:** Phase 30 adds the first `playwright.config.ts` + deps. CI gating deferred.

---

## Invite role control

### Q: How should the role picker appear on the InviteLink form?

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented control | Two-button toggle [Member | Admin], default Member. | ✓ |
| Radio buttons | Stacked radios with helper text. More vertical space. | |
| Checkbox ('Make admin') | Single checkbox; frames Member as default. | |
| Separate buttons | Two CTAs: [Generate Member Invite] / [Generate Admin Invite]. | |

**User's choice:** Segmented control
**Notes:** Compact; shows both options; matches minimalist pastel aesthetic.

### Q: After a link is generated, should the UI show which role it carries?

| Option | Description | Selected |
|--------|-------------|----------|
| Show role badge next to link | URL row gets a pastel badge ([Admin] or [Member]). | ✓ |
| Show role in helper text | Helper text mentions the granted role. | |
| Don't show | Rely on segmented control being visible. | |

**User's choice:** Show role badge next to link
**Notes:** Reuses existing RoleBadge component; eliminates confusion when admin copies multiple links.

### Q: When the segmented control is toggled after a link is generated, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Clear existing link | Toggling clears the URL; user must re-generate. | ✓ |
| Keep link + show warning | URL stays; warning about role mismatch. | |
| Auto-regenerate | Toggle auto-invalidates previous + generates new. | |

**User's choice:** Clear existing link
**Notes:** Safest; prevents stale badge/URL pairing.

### Q: Should the join page show the role the joiner is about to receive?

| Option | Description | Selected |
|--------|-------------|----------|
| Show role on join page | 'Join [Household] as an Admin/Member' before accept. | ✓ |
| Don't show | Joiner accepts; role becomes apparent after. | |

**User's choice:** Show role on join page
**Notes:** Small scope increment to JoinHousehold.tsx; sets expectations for incoming admins.

---

## Claude's Discretion

Areas where user deferred to Claude / planner:
- RPC error signaling mechanism (RAISE exception vs return JSON; SPEC's exact error string must surface)
- Migration packaging (one file vs split)
- Confirm dialog component implementation (new <ConfirmDialog> vs native confirm() vs existing modal)
- Overflow menu / popover primitive (custom vs headless lib vs CSS disclosure)
- Mobile tooltip mechanic (tap-to-reveal vs long-press vs inline)
- Playwright login helper shape (fixture vs beforeAll vs utility)
- Mutation hook granularity (three separate hooks vs one polymorphic)
- Exact cache invalidation keys (planner to verify against queryKeys.ts)

## Deferred Ideas

- Household deletion (for sole-admin exit) — own phase
- Toast notification system — generalizable primitive, future phase
- CI gate for Playwright E2E — future hardening phase
- Tier-based / per-feature roles — per SPEC out-of-scope
- Audit log — per SPEC out-of-scope
- Notifications for role changes — per SPEC out-of-scope
- Retrofit `mark_invite_used` to stricter `SET search_path = ''` — minor consistency cleanup
