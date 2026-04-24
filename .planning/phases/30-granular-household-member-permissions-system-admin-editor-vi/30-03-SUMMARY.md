---
phase: 30-granular-household-member-permissions-system-admin-editor-vi
plan: 03
subsystem: household-ui-primitives
tags: [ui, primitives, popover, modal, segmented-control, accessibility]
requires: []
provides:
  - RoleBadge (shared role pill — MemberList, InviteLink, JoinHousehold)
  - RoleSegmentedControl (invite-time role toggle — D-12)
  - ConfirmDialog (reusable confirm modal for Promote/Demote/Remove/Leave — D-02)
  - MemberActionMenu, MemberActionMenuItem (overflow-menu popover — D-01)
affects:
  - Plans 05 and 06 (which will integrate these primitives)
tech-stack:
  added: []
  patterns:
    - ImportRecipeModal backdrop/panel + ESC handler pattern (reused for ConfirmDialog)
    - Outside-click + Escape keyboard handler for popover (MemberActionMenu)
    - Pastel Tailwind palette (bg-primary/20 text-primary | bg-secondary text-text/60)
key-files:
  created:
    - src/components/household/RoleBadge.tsx
    - src/components/household/RoleSegmentedControl.tsx
    - src/components/household/ConfirmDialog.tsx
    - src/components/household/MemberActionMenu.tsx
  modified: []
decisions:
  - Custom popover implementation (no Radix/HeadlessUI dep) — 2-4 menu items per household, new dep overkill per CLAUDE.md "avoid premature abstraction".
  - Custom ConfirmDialog instead of window.confirm — uniform UX across all four actions, supports pending-state lock and DB-trigger error surface.
  - No arrow-key nav inside MemberActionMenu for MVP — Tab/Shift-Tab reach all items for 2-4 household members. Documented as future enhancement.
  - RoleBadge extraction is a pure file move (verbatim copy) — MemberList.tsx diff will occur in Plan 05 when the duplicate is deleted and import is added.
metrics:
  tasks_completed: 3
  files_created: 4
  files_modified: 0
  completed: 2026-04-23
---

# Phase 30 Plan 03: Household UI Primitives Summary

Built the four Phase 30 UI primitives (`RoleBadge`, `RoleSegmentedControl`, `ConfirmDialog`, `MemberActionMenu`) as pure presentational components under `src/components/household/`, with no state mutation beyond local open/selection flags, no Supabase/TanStack imports, and full a11y annotations (aria-haspopup, aria-expanded, role=dialog/menu/menuitem/tooltip, aria-checked).

## Files Created

| File                                                   | Lines | Named Exports                               |
| ------------------------------------------------------ | ----- | ------------------------------------------- |
| `src/components/household/RoleBadge.tsx`               | 14    | `RoleBadge`                                 |
| `src/components/household/RoleSegmentedControl.tsx`    | 56    | `RoleSegmentedControl`                      |
| `src/components/household/ConfirmDialog.tsx`           | 102   | `ConfirmDialog`, `ConfirmDialogProps`       |
| `src/components/household/MemberActionMenu.tsx`        | 131   | `MemberActionMenu`, `MemberActionMenuItemProps`, `MemberActionMenuProps` |

Note: `MemberActionMenuItem` is not a standalone exported component — the plan's `exports: ["MemberActionMenu", "MemberActionMenuItem"]` is realized via the exported `MemberActionMenuItemProps` interface that callers pass through the `items` prop. This matches the inline code spec in `<action>` (items rendered by the parent `MemberActionMenu` from a typed item array, not as a separate wrapper component). See "Deviations from Plan" below.

## Commits (this plan)

| Task | Commit  | Message |
| ---- | ------- | ------- |
| 1    | d42cebb | feat(30-03): extract RoleBadge primitive and add RoleSegmentedControl |
| 2    | c7bd914 | feat(30-03): add ConfirmDialog reusable modal for admin actions |
| 3    | 211d2ba | feat(30-03): add MemberActionMenu overflow-menu popover primitive |

## TypeScript Check

`npx tsc --noEmit` run after each task — zero errors, zero warnings.

```
$ npx tsc --noEmit 2>&1 | tail -30
(no output — clean)
```

## A11y Attribute Verification (grep proofs)

```
$ grep -nE 'role="radiogroup"|role="radio"|aria-checked' src/components/household/RoleSegmentedControl.tsx
29:      role="radiogroup"
40:            role="radio"
42:            aria-checked={selected}

$ grep -nE 'role="dialog"|aria-modal="true"|aria-labelledby|aria-describedby' src/components/household/ConfirmDialog.tsx
64:          role="dialog"
65:          aria-modal="true"
66:          aria-labelledby="confirm-dialog-heading"
67:          aria-describedby="confirm-dialog-message"

$ grep -nE 'aria-haspopup="menu"|aria-expanded|role="menu"|role="menuitem"|role="tooltip"|aria-disabled' src/components/household/MemberActionMenu.tsx
80:        aria-haspopup="menu"
81:        aria-expanded={open}
90:          role="menu"
97:                role="menuitem"
98:                aria-disabled={item.disabled ? true : undefined}
113:                  role="tooltip"
```

## No-Side-Effects Verification

```
$ git diff src/components/household/MemberList.tsx src/components/household/InviteLink.tsx src/components/household/JoinHousehold.tsx
(empty — Plans 05 and 06 will integrate these primitives)

$ grep -E "supabase|@tanstack" src/components/household/RoleBadge.tsx src/components/household/RoleSegmentedControl.tsx src/components/household/ConfirmDialog.tsx src/components/household/MemberActionMenu.tsx
(empty — all four components are pure UI)

$ grep -E "@radix-ui|@headlessui" src/components/household/MemberActionMenu.tsx
(empty — no new runtime deps)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking/Spec Nit] `MemberActionMenuItem` frontmatter export reconciled with inline code**
- **Found during:** Task 3 acceptance-criteria review.
- **Issue:** Plan frontmatter `exports: ["MemberActionMenu", "MemberActionMenuItem"]` listed `MemberActionMenuItem` as an export, but the inline code block in `<action>` defines only `MemberActionMenuItemProps` (an interface describing each item in the `items[]` prop), no separate `MemberActionMenuItem` component. The plan's intent is clear: callers pass a typed array of action descriptors; the parent renders them.
- **Fix:** Followed the inline code exactly. Exported `MemberActionMenuItemProps` (the type contract described in frontmatter) and kept the rendering inside `MemberActionMenu`. This matches the plan's own acceptance criteria, which only require `export interface MemberActionMenuItemProps` and `export function MemberActionMenu` — no `MemberActionMenuItem` component is asserted.
- **Files modified:** `src/components/household/MemberActionMenu.tsx` (as originally specified, no additional changes).
- **Commit:** 211d2ba
- **Impact on downstream plans:** None. Plans 05/06 call `<MemberActionMenu items={[{ label, onSelect, disabled, ... }]} />` — the `items` contract is expressed by `MemberActionMenuItemProps`.

No other deviations. Each file matches the inline code in the plan's `<action>` block character-for-character.

## Key Design Notes (for Plans 05 and 06)

- **`RoleBadge`** is a verbatim move — MemberList's current callsite (line 77 at plan start) will continue to compile unchanged once Plan 05 deletes the inline function (lines 5-18) and adds `import { RoleBadge } from './RoleBadge'`.
- **`RoleSegmentedControl`** uses `value` + `onChange` (controlled). Parent owns state; no internal default. Pair with `idPrefix` when multiple controls coexist on the same page (e.g., if we ever add per-member role toggles).
- **`ConfirmDialog`** accepts an `error` slot. Plan 04 (mutation hooks) can surface the DB trigger's `"At least one admin required"` message verbatim by passing `error={mutation.error?.message ?? null}`.
- **`MemberActionMenu`** closes on outside `mousedown` (earlier than `click`) — important because `click` after item selection would otherwise race the `setOpen(false)` inside `handleItemClick`. Mobile disabled-item tooltip is tap-to-reveal (persists until next interaction), desktop is CSS hover via `group-hover:block`.
- **Keyboard nav scope:** Tab/Shift-Tab reach all menu items; Escape closes. Arrow-key navigation inside the popover is **not** implemented — 2-4 items per household makes Tab order sufficient for MVP. Flag for post-MVP audit.

## Threat Flags

None. All four components are pure presentational React — no network, no storage, no auth boundary. The UI disabled-state is a UX affordance only; server-side enforcement lives in Plan 01 (DB triggers + RLS) and Plan 04 (mutation hooks with RPC pre-flight checks).

## Self-Check: PASSED

Verified files exist:
- FOUND: src/components/household/RoleBadge.tsx
- FOUND: src/components/household/RoleSegmentedControl.tsx
- FOUND: src/components/household/ConfirmDialog.tsx
- FOUND: src/components/household/MemberActionMenu.tsx

Verified commits exist:
- FOUND: d42cebb (Task 1)
- FOUND: c7bd914 (Task 2)
- FOUND: 211d2ba (Task 3)

Verified no side effects:
- `git diff src/components/household/MemberList.tsx` — empty (unchanged)
- `git diff src/components/household/InviteLink.tsx` — empty (unchanged)
- `git diff src/components/household/JoinHousehold.tsx` — empty (unchanged)

Verified type-safety:
- `npx tsc --noEmit` — clean, zero errors.
