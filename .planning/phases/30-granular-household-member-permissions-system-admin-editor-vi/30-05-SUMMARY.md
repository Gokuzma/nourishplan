---
phase: 30-granular-household-member-permissions-system-admin-editor-vi
plan: 05
subsystem: household-admin-ui-integration
tags: [ui, memberlist, admin-ui, confirm-dialog, overflow-menu]
requires:
  - Plan 30-03 primitives (RoleBadge, ConfirmDialog, MemberActionMenu with MemberActionMenuItemProps)
  - Plan 30-04 hooks (useChangeMemberRole, useRemoveHouseholdMember, useLeaveHousehold, useHousehold)
provides:
  - MemberList.tsx with role-sensitive overflow menu (⋮) per member row
  - Last-admin-safe action gating (Demote/Remove/Leave) with exact D-05 tooltip
  - ConfirmDialog-driven flow for Promote / Demote / Remove / Leave
  - DB-error passthrough into the dialog's error slot (covers "At least one admin required")
affects:
  - Plan 30-07 (Playwright E2E) exercises this UI end-to-end for SPEC Req #6 + #8
tech-stack:
  added: []
  patterns:
    - Discriminated union (PendingAction) to drive one-dialog-multiple-actions shape
    - useMemo-derived adminCount from useHouseholdMembers (D-06 zero-new-query pattern)
    - Module-level tooltip constant (LAST_ADMIN_TOOLTIP) reused across 4 push sites
    - isAnyPending lock pattern: mutation.isPending OR chain disables the dialog's confirm/cancel
key-files:
  created: []
  modified:
    - src/components/household/MemberList.tsx
decisions:
  - Inline adminCount derivation via useMemo (no new hook) — D-06 exact match
  - Discriminated union for PendingAction over a grab-bag object — 5 kinds, each with its own payload
  - Single ConfirmDialog in the render tree; dialogProps() returns per-kind copy + destructive flag
  - Managed Profiles JSX preserved byte-identical (L-020/L-027 guard) — only new wrapping is the outer <>…</> fragment
  - Removed the inline RoleBadge helper in favor of the ./RoleBadge import (Plan 03 extract) — callsite unchanged
metrics:
  duration_minutes: 5
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 1
  completed_date: 2026-04-23
---

# Phase 30 Plan 05: MemberList Admin UI Integration Summary

One-liner: Wired the Phase 30 overflow menu (Promote / Demote / Remove / Leave) and ConfirmDialog flow into `MemberList.tsx`, with role-sensitive item lists, DB-backed last-admin gating via derived `adminCount`, and the exact D-05 tooltip copy — zero changes outside `MemberList.tsx`, all pre-existing UI (skeleton, empty state, member row layout, Managed Profiles block) preserved.

## Baseline vs Post-Edit

| Metric                                                           | Baseline | Post-Edit |
| ---------------------------------------------------------------- | -------- | --------- |
| `wc -l src/components/household/MemberList.tsx`                  | `124`    | `295`     |
| `grep -c "^import " src/components/household/MemberList.tsx`     | `3`      | `6` (react, react-router, useHousehold barrel, useAuth, RoleBadge, ConfirmDialog, MemberActionMenu) |
| `grep -c "function RoleBadge" src/components/household/MemberList.tsx`  | `1`      | `0` (inline version deleted; now imported) |
| `grep -c "MemberActionMenu" src/components/household/MemberList.tsx` | `0`      | `3`       |
| `grep -c "ConfirmDialog" src/components/household/MemberList.tsx`  | `0`      | `2`       |
| `grep -c "LAST_ADMIN_TOOLTIP" src/components/household/MemberList.tsx` | `0`      | `5` (constant + 4 conditional references) |
| `grep -c "Set Targets" src/components/household/MemberList.tsx`    | `2`      | `2`  (preserved — member row + managed profile) |
| `grep -c "Managed Profiles" src/components/household/MemberList.tsx` | `1`      | `1`  (preserved) |
| `grep -c "map((profile)" src/components/household/MemberList.tsx`    | `1`      | `1`  (preserved) |
| `grep -c "border border-accent/30 bg-surface" src/components/household/MemberList.tsx` | `1` | `1` (Child row styling preserved) |
| `grep -c "No other members yet" src/components/household/MemberList.tsx` | `1`      | `1`  (empty state preserved) |

`git diff --stat 2162987..HEAD -- src/components/household/MemberList.tsx`: **1 file changed, 251 insertions(+), 80 deletions(-)**. Net +171 lines.

## Commits

| Task | Commit    | Files                                       | Description                                                                                 |
| ---- | --------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1    | `ce1bd39` | `src/components/household/MemberList.tsx` | refactor(30-05): import RoleBadge + Phase-30 primitives and hooks into MemberList           |
| 2    | `292dae4` | `src/components/household/MemberList.tsx` | feat(30-05): wire overflow menu + confirm dialog for admin actions                          |

Both commits scoped to `MemberList.tsx` only. No other files touched.

## Verification

### TypeScript (tsc --noEmit)

```
$ npx tsc --noEmit
(zero output, exit 0)
```

Clean — no errors, no warnings. The new imports (`useMemo`, `useState`, `useHousehold`, the 3 mutation hooks, `RoleBadge`, `ConfirmDialog`, `MemberActionMenu`, `MemberActionMenuItemProps`) all resolve to exports confirmed in Plan 03 and Plan 04 summaries.

### Vitest regression (mocked suites)

```
$ npx vitest run tests/AppShell.test.tsx tests/settings.test.tsx
 Test Files  2 passed (2)
      Tests  8 passed (8)
   Duration  899ms
```

Zero regression from baseline. Both suites mock the supabase module and do not touch MemberList directly — they continue to pass.

### Acceptance Criteria Contract Checks

| Assertion                                                                                                 | Result    |
| --------------------------------------------------------------------------------------------------------- | --------- |
| `grep -c "function RoleBadge" src/components/household/MemberList.tsx`                                    | `0` ✓    |
| `grep "import { RoleBadge } from './RoleBadge'" src/components/household/MemberList.tsx`                  | match ✓  |
| `grep "import { ConfirmDialog } from './ConfirmDialog'" src/components/household/MemberList.tsx`          | match ✓  |
| `grep "import { MemberActionMenu" src/components/household/MemberList.tsx`                                | match ✓  |
| `grep "useChangeMemberRole" src/components/household/MemberList.tsx` (import block)                       | match ✓  |
| `grep "useRemoveHouseholdMember" src/components/household/MemberList.tsx` (import block)                  | match ✓  |
| `grep "useLeaveHousehold" src/components/household/MemberList.tsx` (import block)                         | match ✓  |
| `grep -c "LAST_ADMIN_TOOLTIP" src/components/household/MemberList.tsx`                                     | `5` (≥ 4) ✓  |
| `grep -c "'Promote another member to admin first.'" src/components/household/MemberList.tsx`              | `1` (exact) ✓ |
| `grep -F "m.role === 'admin'" src/components/household/MemberList.tsx \| grep -c "filter"`                | `1` (D-06) ✓ |
| `grep -c "Set Targets" src/components/household/MemberList.tsx`                                            | `2` ✓    |
| `grep "Managed Profiles" src/components/household/MemberList.tsx`                                          | match ✓  |
| `grep "map((profile)" src/components/household/MemberList.tsx`                                             | match ✓  |
| `grep "border border-accent/30 bg-surface" src/components/household/MemberList.tsx`                       | match ✓  |
| `grep -c "PendingAction" src/components/household/MemberList.tsx`                                         | `3` (≥ 3) ✓ |
| `grep "isAdmin = membership?.role === 'admin'" src/components/household/MemberList.tsx`                   | match ✓  |
| `grep "useChangeMemberRole()" src/components/household/MemberList.tsx`                                    | match ✓  |
| `grep "useRemoveHouseholdMember()" src/components/household/MemberList.tsx`                               | match ✓  |
| `grep "useLeaveHousehold()" src/components/household/MemberList.tsx`                                      | match ✓  |

All acceptance checks pass.

## Behavior Summary

### Admin viewing another member's row
- Member is currently `'member'`: kebab shows `[Promote to Admin, Remove from household]`
- Member is currently `'admin'`: kebab shows `[Demote to Member, Remove from household]`
- If the target is the last remaining admin (`adminCount <= 1` and `memberIsAdmin`), both Demote and Remove are disabled with tooltip "Promote another member to admin first."
- Non-last-admin targets: all items enabled; removing another admin is allowed as long as caller remains admin.

### Admin viewing own row
- If admin AND not last admin: kebab shows `[Demote to Member, Leave household]`
- If admin AND last admin (`adminCount <= 1`): kebab shows the same two items BOTH disabled with the D-05 tooltip (D-07 hard block on sole-admin exit, per SPEC).
- Non-admin own row: kebab shows `[Leave household]` only, enabled (non-admin leaving cannot reduce admin count).

### Non-admin viewing another member's row
- `items` is empty → no kebab rendered (clean row with just RoleBadge).

### Confirm flow
- Clicking any menu item opens `ConfirmDialog` with action-specific `title`, `message`, `confirmLabel`, and `destructive` flag (Promote is non-destructive; Demote/Remove/Leave are destructive).
- While a mutation is pending, both buttons are disabled; backdrop + ESC close are suppressed.
- On mutation `onSuccess` the dialog closes; on `onError` the exact `error.message` is displayed in the dialog's error slot (e.g., "At least one admin required" if the DB trigger fires because of a race).

## Deviations from Plan

None — plan executed exactly as written. Two tasks, two surgical edits, each committed individually with `--no-verify`. Inline RoleBadge deleted, new imports added, body replaced to wire the overflow menu + ConfirmDialog + disabled-state logic. All pre-existing UI (skeleton, empty state, member row layout, Managed Profiles section with `border border-accent/30 bg-surface` styling, "Set Targets" link, "Born {year}" metadata, "Child" badge) preserved byte-identical in the Managed Profiles block.

### Auth / Checkpoints

None — plan ran end to end autonomously. No auth gates, no checkpoints; all operations local/typed only (no Supabase calls, no deploys).

## Known Stubs

None. All wired items call real TanStack mutation hooks from Plan 04 which in turn call the real RPCs from Plan 01 migrations. No TODOs, no placeholder values, no hardcoded empty lists.

## Threat Flags

None. This plan is a pure UI integration against already-secured Plan 01 RPCs + RLS. No new network endpoints, no new auth paths, no new file access, no schema changes. The DB-level last-admin trigger (Plan 01) remains the authoritative guard; the UI's disabled-state + tooltip is a UX affordance ON TOP of DB enforcement. The `onError` surface in `ConfirmDialog` ensures the DB error string reaches the user verbatim if a race condition slips past the client-side check.

## L-020 / L-027 Protection Evidence

Post-edit greps confirm the four preserved-feature requirements from `<critical_l020_warning>`:

```
$ grep -c "Set Targets" src/components/household/MemberList.tsx
2        # ✓ one per member row, one per managed profile row

$ grep "Managed Profiles" src/components/household/MemberList.tsx
              Managed Profiles     # ✓ present

$ grep "No other members yet" src/components/household/MemberList.tsx
      <p className="text-sm text-text/50">No other members yet. Invite your family!</p>   # ✓ present

$ grep -c "map((profile)" src/components/household/MemberList.tsx
1        # ✓ managed profiles loop intact

$ grep -c "border border-accent/30 bg-surface" src/components/household/MemberList.tsx
1        # ✓ Child row styling preserved

$ grep -c "animate-pulse rounded-card bg-secondary" src/components/household/MemberList.tsx
1        # ✓ loading skeleton preserved
```

The Managed Profiles `<li>` remains identical: avatar initial → `<p>{profile.name}</p>` → `{profile.birth_year && <p>Born …</p>}` → Set Targets link → "Child" pastel badge.

## Self-Check: PASSED

Verified files exist:
- FOUND: src/components/household/MemberList.tsx (295 lines, 1 file changed)

Verified commits exist:
- FOUND: ce1bd39 (Task 1 — imports + tooltip + PendingAction)
- FOUND: 292dae4 (Task 2 — overflow menu + ConfirmDialog wiring)

Verified no out-of-scope modifications:
- `git diff 2162987..HEAD -- :(exclude)src/components/household/MemberList.tsx` — empty for this plan's two commits (the intervening `2bbe9c6` commit on `InviteLink.tsx` is from the parallel Wave 3 executor for plan 30-06, unrelated to 30-05).

Verified type-safety:
- `npx tsc --noEmit` — clean, zero errors, zero warnings.

Verified zero regression:
- `npx vitest run tests/AppShell.test.tsx tests/settings.test.tsx` — 2 suites / 8 tests, all passing.

Verified parallel-executor rules honored:
- No changes to STATE.md ✓
- No changes to ROADMAP.md ✓
- Both commits used `--no-verify` ✓
- Scope confined to the file listed in `files_modified` (`src/components/household/MemberList.tsx`) ✓
