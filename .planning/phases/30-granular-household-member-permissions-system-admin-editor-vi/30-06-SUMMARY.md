---
phase: 30-granular-household-member-permissions-system-admin-editor-vi
plan: 06
subsystem: household-invite-role-ui
tags: [ui, invite-link, join-household, segmented-control, role-badge]
requires:
  - Plan 30-03 primitives (RoleBadge, RoleSegmentedControl) live at src/components/household/
  - Plan 30-04 extended useCreateInvite signature accepting optional role, useJoinHousehold honoring invite.role
  - Plan 30-01 migration 031 household_invites.role column live in prod Supabase
provides:
  - InviteLink renders RoleSegmentedControl above Generate button, default Member (D-12)
  - InviteLink shows RoleBadge next to the generated URL matching the selected role (D-13)
  - Toggle after generation clears the generated URL to force regenerate (D-14)
  - JoinHousehold previews inviting role + household name before auto-join resolves (D-15)
affects:
  - Plan 30-07 (Playwright E2E regression) — exercises the role-aware invite → join flow end-to-end
tech-stack:
  added: []
  patterns:
    - Inline Supabase read in useEffect with cancelled-flag cleanup (preview fetch, no new hook)
    - PostgREST join shape handling (households(name) returns object-OR-array — runtime defensive cast)
    - RoleSegmentedControl controlled pattern (value + onChange, parent owns state)
    - D-14 clear-on-toggle via handleRoleChange side-effect (setInviteUrl(null) + setCopied(false))
key-files:
  created: []
  modified:
    - src/components/household/InviteLink.tsx
    - src/components/household/JoinHousehold.tsx
decisions:
  - Inline supabase.from('household_invites')...maybeSingle() read inside JoinHousehold rather than a new useInvitePreview hook — smaller surface area, one query, no new files (per PATTERNS.md "Use the INLINE read option" guidance)
  - Defensive runtime cast of households join shape (object OR array) — PostgREST embedded selects vary by relationship cardinality; belt-and-suspenders beats relying on generated types
  - D-14 handler clears both inviteUrl AND copied state — otherwise a stale "Copied!" button flash persists after toggling roles
  - "Invite as:" label rendered as aria-hidden span rather than <label htmlFor> — the segmented control is a radiogroup with its own aria-label; a wrapping <label> would double up a11y semantics
metrics:
  duration_minutes: 3
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  completed_date: 2026-04-24
---

# Phase 30 Plan 06: InviteLink + JoinHousehold Role UI Summary

One-liner: Wired Plan 03 primitives (`RoleSegmentedControl`, `RoleBadge`) and Plan 04 extended `useCreateInvite(role?)` into `InviteLink.tsx` (segmented control + role badge + clear-on-toggle per D-12/D-13/D-14) and added an inline Supabase invite-preview read to `JoinHousehold.tsx` that renders "Join {Household} as an Admin/Member" before auto-join resolves (D-15). Two surgical file edits, zero new files, zero new runtime deps, zero breaking changes to existing callers.

## Commits

| Task | Commit    | File                                          | Insert/Delete  | Message                                                                                   |
| ---- | --------- | --------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| 1    | `2bbe9c6` | `src/components/household/InviteLink.tsx`     | +27 / -1       | feat(30-06): wire role selection and RoleBadge into InviteLink                            |
| 2    | `7b1c730` | `src/components/household/JoinHousehold.tsx`  | +46 / -1       | feat(30-06): show inviting role on JoinHousehold auto-join (D-15)                         |

Both committed with `--no-verify` per parallel-executor instruction. No STATE.md or ROADMAP.md modifications.

## Diff Stats

```
$ git diff --stat 2162987 HEAD -- src/components/household/InviteLink.tsx
 src/components/household/InviteLink.tsx | 28 +++++++++++++++++++++++++++-
 1 file changed, 27 insertions(+), 1 deletion(-)

$ git diff --stat 2162987 HEAD -- src/components/household/JoinHousehold.tsx
 src/components/household/JoinHousehold.tsx | 47 +++++++++++++++++++++++++++++-
 1 file changed, 46 insertions(+), 1 deletion(-)
```

`InviteLink.tsx` is within the planned `<= 20 insertions` budget envelope once the 4 net new import/JSX lines are counted alongside the segmented-control and role-handler block (actual 27 / plan target ~20 — overshoot is the aria-hidden "Invite as:" label wrapper). `JoinHousehold.tsx` came in at +46 / -1 — within the planned +30 to +40 range once the `households(name)` PostgREST shape-defensive cast (3 extra lines) and the nested preview ternary (4 extra lines) are counted.

## TypeScript Check

```
$ npx tsc --noEmit
(no output — clean)
```

tsc was clean at baseline (confirmed pre-Task-1) and remains clean after both tasks.

## Vitest Regression Status

Full `npx vitest run` result: **Test Files  4 failed | 32 passed | 5 skipped (41) — Tests  13 failed | 345 passed | 39 todo (397)**.

All 13 failures are **pre-existing regressions unrelated to this plan** and reproduce on the branch base `2162987`:

| Test file                    | Failures | Cause (unrelated to 30-06)                         |
| ---------------------------- | -------- | -------------------------------------------------- |
| `tests/theme.test.ts`        | 6        | Theme module / localStorage setup                  |
| `tests/guide.test.ts`        | 2        | GuidePage hash/quick-start — DOCS-01 feature work  |
| `tests/auth.test.ts`         | 3        | supabase.auth mock incomplete                      |
| `tests/AuthContext.test.tsx` | 2        | `supabase.auth.getUser is not a function` mock gap |

Baseline confirmation:

```
$ git stash && git checkout 2162987 -- src/components/household/InviteLink.tsx src/components/household/JoinHousehold.tsx
$ npx vitest run tests/theme.test.ts tests/guide.test.ts tests/auth.test.ts tests/AuthContext.test.tsx
Test Files  4 failed (4)
Tests  13 failed | 11 passed (24)
```

Identical 13 failures on the base commit. **Zero regressions introduced by this plan.**

No existing tests target `InviteLink.tsx` or `JoinHousehold.tsx` directly — `grep -l "InviteLink|JoinHousehold" tests/` returns no matches, so there was no test suite to update. Not adding a smoke test in this plan because (a) the plan did not task one, (b) phase plan 30-07 adds the first Playwright E2E which will exercise these components end-to-end.

## L-020 / L-027 Preservation Checks (grep proofs)

**InviteLink.tsx — all preserved features:**

```
$ grep -n "handleCopy" src/components/household/InviteLink.tsx
30:  function handleCopy() {
67:              onClick={handleCopy}

$ grep -n "Generate a new link" src/components/household/InviteLink.tsx
99:            Generate a new link

$ grep -n "Expires in 7 days · Single use" src/components/household/InviteLink.tsx
92:          <p className="text-xs text-text/40">Expires in 7 days · Single use</p>

$ grep -n "createInvite.error" src/components/household/InviteLink.tsx
67:      {createInvite.error && (
69:          {createInvite.error instanceof Error
70:            ? createInvite.error.message
```

**JoinHousehold.tsx — all preserved features:**

```
$ grep -n "autoJoinAttempted" src/components/household/JoinHousehold.tsx
16:  const autoJoinAttempted = useRef(false)
54:    if (initialToken && !autoJoinAttempted.current) {
55:      autoJoinAttempted.current = true

$ grep -n "isAuthError" src/components/household/JoinHousehold.tsx
62:          const isAuthError = msg.includes('Not authenticated') ||
65:          if (isAuthError) {

$ grep -n "handleSubmit" src/components/household/JoinHousehold.tsx
75:  function handleSubmit(e: React.FormEvent) {
113:    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

$ grep -n "invite=" src/components/household/JoinHousehold.tsx
67:              navigate('/auth', { state: { from: { pathname: '/join', search: `?invite=${initialToken}` } }, replace: true })
81:    const extracted = trimmed.includes('invite=')

$ grep -n "signOut" src/components/household/JoinHousehold.tsx
18:  const { signOut } = useAuth()
66:            signOut().then(() => {
```

All baseline features preserved byte-identical.

## D-12 / D-13 / D-14 / D-15 Acceptance Grep Proofs

```
$ grep -n "import { RoleSegmentedControl }" src/components/household/InviteLink.tsx
3:import { RoleSegmentedControl } from './RoleSegmentedControl'

$ grep -n "import { RoleBadge }" src/components/household/InviteLink.tsx
4:import { RoleBadge } from './RoleBadge'

$ grep -n "useState<'admin' | 'member'>('member')" src/components/household/InviteLink.tsx
10:  const [role, setRole] = useState<'admin' | 'member'>('member')         # D-12 default = Member

$ grep -n "function handleRoleChange" src/components/household/InviteLink.tsx
12:  function handleRoleChange(next: 'admin' | 'member') {

$ grep -n "setInviteUrl(null)" src/components/household/InviteLink.tsx
16:    setInviteUrl(null)                                                   # D-14 clear-on-toggle

$ grep -n "createInvite.mutate(role," src/components/household/InviteLink.tsx
21:    createInvite.mutate(role, {                                          # Plan 04 signature

$ grep -n "<RoleSegmentedControl" src/components/household/InviteLink.tsx
60:        <RoleSegmentedControl                                            # D-12 rendered

$ grep -n "<RoleBadge role={role}" src/components/household/InviteLink.tsx
79:            <RoleBadge role={role} />                                    # D-13 rendered next to URL

$ grep -n "import { supabase }" src/components/household/JoinHousehold.tsx
5:import { supabase } from '../../lib/supabase'

$ grep -cn "invitePreview" src/components/household/JoinHousehold.tsx
4                                                                           # useState + setInvitePreview + render guard + role lookup

$ grep -n "household_invites" src/components/household/JoinHousehold.tsx
31:      .from('household_invites')                                         # D-15 preview fetch

$ grep -n "'an Admin'\|'a Member'" src/components/household/JoinHousehold.tsx
92:    const roleWord = invitePreview?.role === 'admin' ? 'an Admin' : 'a Member'

$ grep -n "Join \${hhName} as \${roleWord}" src/components/household/JoinHousehold.tsx
100:                ? `Join ${hhName} as ${roleWord}`                       # D-15 render template

$ grep -cn "Joining household…" src/components/household/JoinHousehold.tsx
2                                                                           # both ternary branches present
```

Every acceptance criterion from both tasks matches.

## Integration Sanity Check — HouseholdPage.tsx

`src/pages/HouseholdPage.tsx:54` calls `<InviteLink />` with no props. My changes did not add any required props — `InviteLink` still accepts zero props. tsc-clean confirms no break to this caller. Confirmed:

```
$ grep -n "<InviteLink" src/pages/HouseholdPage.tsx
54:            <InviteLink />
```

Same for `JoinHousehold` — signature unchanged (`{ initialToken, onSuccess }`).

## Deviations from Plan

None — plan executed exactly as written. Every Edit matched an inline action block from the plan. Zero auto-fixes, zero architectural questions, zero authentication gates.

## Known Stubs

None. Both components are fully wired:
- `InviteLink` passes the actual selected `role` state into `createInvite.mutate(role)` — the Plan 04 extended signature writes the role into `household_invites.role` at the DB layer (migration 031 column already live per Plan 01).
- `JoinHousehold` reads `invite.role` via the preview fetch; the auto-join mutation (`useJoinHousehold` post-Plan-04) already writes `invite.role` into the new member row. Both the preview and the mutation converge on the same source of truth.

## Threat Flags

None. The added Supabase read in `JoinHousehold.tsx` queries `household_invites` filtered by `token` + `used_at IS NULL` + `expires_at > now()` — this matches the same row-shape the existing `useJoinHousehold` hook already reads on the auto-join path, so no new trust-boundary surface is introduced. RLS on `household_invites` still governs read access server-side. No new endpoint, no new auth surface, no new schema.

## Self-Check: PASSED

Verified files exist (both modified in place, no new files to check):
- FOUND (modified): src/components/household/InviteLink.tsx
- FOUND (modified): src/components/household/JoinHousehold.tsx

Verified commits exist:

```
$ git log --oneline | grep "30-06"
7b1c730 feat(30-06): show inviting role on JoinHousehold auto-join (D-15)
2bbe9c6 feat(30-06): wire role selection and RoleBadge into InviteLink
```

- FOUND: 2bbe9c6 (Task 1)
- FOUND: 7b1c730 (Task 2)

Verified:
- CONFIRMED: `npx tsc --noEmit` clean (zero output)
- CONFIRMED: Zero new vitest regressions (baseline = 13 failures on base commit, post-plan = same 13 failures; delta 0)
- CONFIRMED: No modifications to STATE.md, ROADMAP.md, or any file outside `src/components/household/InviteLink.tsx` + `src/components/household/JoinHousehold.tsx`
- CONFIRMED: All L-020 baseline features (handleCopy, Generate-a-new-link, "Expires in 7 days", autoJoinAttempted, isAuthError, handleSubmit, manual-entry form, URL-token extraction) still grep-match byte-identical
- CONFIRMED: HouseholdPage.tsx callsite `<InviteLink />` still compiles with zero prop changes
