---
phase: 27-wire-schedule-badges-to-plangrid
plan: 01
subsystem: hooks
tags: [schedule, hooks, query-keys, tdd, household-aggregation, regression-restore]

requires:
  - phase: 21-schedule-model
    provides: "MemberScheduleSlot row shape, member_schedule_slots table + RLS, ScheduleStatus union, STATUS_CYCLE / SLOT_NAMES / DAY_LABELS / buildGrid / cycleStatus / getOrderedDays / ScheduleGrid utilities, useSchedule + useSaveSchedule hooks"
provides:
  - "queryKeys.schedule namespace restored with forMember + forHousehold + exceptionsForMember (T-27-02 closed via runtime test)"
  - "useHouseholdSchedules(householdId) hook — single-query SELECT * from member_schedule_slots scoped by household_id only (no member filter)"
  - "buildHouseholdGrid(rows): aggregates per-member rows into ScheduleGrid via precedence away > quick > consume > prep; drops prep entirely"
  - "buildHouseholdTooltips(rows, memberNameById): produces 'Away: Dad. Quick: Sam.' format ordered by precedence high->low; prep omitted; first-8-char UUID fallback"
  - "8 runtime tests in src/lib/queryKeys.test.ts (5 pre-existing + 3 new schedule)"
  - "10 TDD tests in src/utils/schedule.household.test.ts covering empty/single/precedence/prep-drop/tooltip-format/UUID-fallback"
affects: [27-02 (PlanGrid wiring), 27-03 (regression test), any future household-wide schedule consumers]

tech-stack:
  added: []
  patterns:
    - "Precedence-aware aggregation: STATUS_CYCLE.indexOf as single source of truth for ordering (helper precedence(s) keeps the array authoritative)"
    - "TanStack Query household-scoped factory key (queryKeys.schedule.forHousehold) with prefix-array invalidation (existing useSaveSchedule.onSuccess invalidates ['schedule', householdId] which auto-matches the new key — zero mutation changes)"
    - "Append-only file editing for L-020 / L-027 / D-06a — useSchedule.ts lines 1-79 byte-identical to HEAD (range-diff exit 0); buildGrid/STATUS_CYCLE unchanged"
    - "TDD RED commit before GREEN commit — failing test commit (d61f037) records the bug-shaped behaviour; passing implementation commit (e71c959) closes it"

key-files:
  created:
    - "src/utils/schedule.household.test.ts (10 TDD tests)"
    - ".planning/phases/27-wire-schedule-badges-to-plangrid/27-01-SUMMARY.md"
    - ".planning/phases/27-wire-schedule-badges-to-plangrid/deferred-items.md"
  modified:
    - "src/lib/queryKeys.ts (+8 lines: schedule namespace restored)"
    - "src/lib/queryKeys.test.ts (+14 lines: 3 schedule describe-it cases, existing 5 feedback engine tests preserved)"
    - "src/hooks/useSchedule.ts (+15 lines: useHouseholdSchedules appended at line 81)"
    - "src/utils/schedule.ts (+66 lines: precedence helper + buildHouseholdGrid + buildHouseholdTooltips)"

key-decisions:
  - "D-03 / D-04 honored: precedence away > quick > consume > prep, prep dropped from grid entirely"
  - "D-06 honored: single-parameter hook (householdId only); no memberId filter"
  - "D-06a honored: useSchedule + useSaveSchedule lines 1-79 byte-identical to HEAD; useHouseholdSchedules appended at line 81 — verified by range-diff exit 0"
  - "D-07 honored: tooltip format 'Away: Dad. Quick: Sam.' — Title-Case + colon + space + comma-separated names + period; prep members omitted; UUID first-8 fallback for unknown members"
  - "T-27-02 closure via runtime test: src/lib/queryKeys.test.ts queryKeys.schedule describe block fires the real factory call path (no mocks, no React, no TanStack wiring)"

patterns-established:
  - "Existing test file extension pattern: when an existing test file lacks coverage for a new namespace, append a new describe block instead of replacing the file (preserves the existing 5 feedback-engine tests in queryKeys.test.ts that the plan's 'Exact contents' directive would have destroyed)"
  - "Precedence helper centralisation: precedence(s) inline at top of utils/schedule.ts uses STATUS_CYCLE.indexOf — keeps the ordering source of truth in one place; STATUS_CYCLE itself unchanged"
  - "Tooltip display order array (DISPLAY_ORDER = ['away','quick','consume']) decoupled from STATUS_CYCLE precedence — explicit display-time ordering avoids index-math when extending statuses later"

requirements-completed: []  # SCHED-01 + SCHED-02 are partially advanced (visibility primitives ready) but neither completes until Plan 02 wires them into PlanGrid + Plan 03 ships the regression test. Final closure happens at Plan 03 completion.

metrics:
  duration: "~10 min"
  completed: "2026-04-20"
  tasks: 2
  commits: 3
  lines_changed:
    "src/lib/queryKeys.ts": "+8 / -0 (net +8)"
    "src/lib/queryKeys.test.ts": "+14 / -0 (net +14)"
    "src/hooks/useSchedule.ts": "+15 / -0 (net +15)"
    "src/utils/schedule.ts": "+66 / -0 (net +66)"
    "src/utils/schedule.household.test.ts": "+124 / -0 (net +124, new file)"
---

# Phase 27 Plan 01: Restore queryKeys.schedule + Add Household-Wide Schedule Primitives Summary

**Restored the latent `queryKeys.schedule` namespace dropped in the Phase 22 worktree truncation, added `useHouseholdSchedules(householdId)` alongside the existing single-member `useSchedule`, and shipped two pure aggregation helpers (`buildHouseholdGrid` + `buildHouseholdTooltips`) with 10 TDD tests — all foundation primitives Plan 02 will wire into PlanGrid.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2 (Task 1 standard, Task 2 TDD)
- **Commits:** 3 (1 feat + 1 test (RED) + 1 feat (GREEN))
- **Files modified:** 4 (`src/lib/queryKeys.ts`, `src/lib/queryKeys.test.ts`, `src/hooks/useSchedule.ts`, `src/utils/schedule.ts`)
- **Files created:** 1 (`src/utils/schedule.household.test.ts`)
- **Lines added:** 227 (zero deletions across all five files — strictly additive, L-020 compliant)

## Accomplishments

- **T-27-02 closed.** `queryKeys.schedule.forMember` is no longer undefined — `useSchedule.ts:14` is now safe to call. The 3 new tests in `src/lib/queryKeys.test.ts` fire the real factory call path (no mocks) and would throw `TypeError` if the namespace were absent. Pre-fix this test file would not have run; post-fix it passes 8/8.
- **Household-wide query primitive shipped.** `useHouseholdSchedules(householdId)` returns every household member's schedule rows in one query — Plan 02 will pass them through `buildHouseholdGrid` to drive the family-holistic dot.
- **Aggregation + tooltip helpers shipped.** `buildHouseholdGrid` + `buildHouseholdTooltips` cover the precedence rule (D-04), the prep-drop rule (D-04, D-11), the tooltip format (D-07, UI-SPEC §Copywriting), and the UUID fallback (existing PlanGrid `memberInputs` pattern at line 339).
- **Regression-recovery hygiene preserved.** `useSchedule.ts` lines 1-79 are byte-identical to pre-plan HEAD (verified by `diff <(git show HEAD~3:...) <(sed -n '1,79p' ...)` exit 0). `buildGrid` + `STATUS_CYCLE` + `SLOT_NAMES` + `DAY_LABELS` + `cycleStatus` + `getOrderedDays` all unchanged.

## Task Commits

1. **Task 1: Restore queryKeys.schedule namespace + runtime unit test** — `ab86db7` (feat)
2. **Task 2 RED: Failing tests for buildHouseholdGrid + buildHouseholdTooltips** — `d61f037` (test)
3. **Task 2 GREEN: Implement useHouseholdSchedules + buildHouseholdGrid + buildHouseholdTooltips** — `e71c959` (feat)

REFACTOR step skipped — implementation matched the plan's verbatim code blocks; no cleanup pass needed.

## Files Created/Modified

- **`src/lib/queryKeys.ts`** (+8 lines) — Inserted `schedule:` namespace between `wontEat` and `aiTags` per plan's "alphabetically adjacent" instruction; matches existing `inventory` factory style (`as const` tuples).
- **`src/lib/queryKeys.test.ts`** (+14 lines) — Appended `describe('queryKeys.schedule')` with 3 it cases. Existing `describe('queryKeys - feedback engine keys')` (ratings/restrictions/wontEat/aiTags/insights, 5 tests) preserved verbatim — see Deviations §1.
- **`src/hooks/useSchedule.ts`** (+15 lines) — Appended `useHouseholdSchedules` at line 81 (after the `}` closing `useSaveSchedule` at line 79). Lines 1-79 byte-identical to HEAD per D-06a. Hook reuses imports already present (`useQuery`, `supabase`, `queryKeys`, `MemberScheduleSlot`).
- **`src/utils/schedule.ts`** (+66 lines) — Appended `precedence(s)` helper (inline, uses `STATUS_CYCLE.indexOf`), `buildHouseholdGrid` (precedence-aware aggregation, drops prep), `buildHouseholdTooltips` (precedence-ordered tooltip strings, omits prep, UUID fallback). All existing exports unchanged.
- **`src/utils/schedule.household.test.ts`** (+124 lines, new) — 10 TDD tests covering the 10 behaviours listed in plan `<behavior>` block. Uses `makeRow` helper (mirrors `inventory.test.ts` `makeItem` pattern).
- **`.planning/phases/27-wire-schedule-badges-to-plangrid/deferred-items.md`** (new) — Logs 12 pre-existing test failures discovered during verification (theme, auth, AuthContext, guide) — out of scope for Phase 27.

## Verification Results

### Range-diff guard (D-06a byte-identical lines 1-79 of useSchedule.ts)

```
$ diff <(git show HEAD~3:src/hooks/useSchedule.ts | sed -n '1,79p') <(sed -n '1,79p' src/hooks/useSchedule.ts)
EXIT: 0
```

Lines 1-79 of `src/hooks/useSchedule.ts` are byte-identical to pre-plan HEAD (commit `22d383d`). `useHouseholdSchedules` is appended at line 81. `useSchedule` (lines 8-27) and `useSaveSchedule` (lines 36-79) untouched.

### Schedule TDD test (10/10)

```
$ npx vitest run src/utils/schedule.household.test.ts
 Test Files  1 passed (1)
      Tests  10 passed (10)
   Duration  519ms
```

All 10 behaviours from plan `<behavior>` block pass:
1. `buildHouseholdGrid([])` returns empty Map (no crash)
2. Single member single row -> `'1:Dinner' -> 'away'`
3. Precedence: quick beats consume
4. Precedence ladder: away wins over [consume, quick, away, prep]
5. All-prep -> no entry (Map is empty)
6. Prep + consume -> consume wins
7. Single away member 'Dad' -> `'Away: Dad.'`
8. Multi-status -> `'Away: A. Quick: B. Consume: C.'` (precedence-ordered)
9. Prep members omitted -> `'Away: A.'` (not `'Away: A. Prep: B.'`)
10. Unknown member id -> first 8 chars of UUID (`'Quick: abcdef12.'`)

### queryKeys runtime test (8/8 — T-27-02 behavioural gate)

```
$ npx vitest run src/lib/queryKeys.test.ts
 Test Files  1 passed (1)
      Tests  8 passed (8)
   Duration  520ms
```

3 new schedule tests + 5 pre-existing feedback engine tests all pass. The `queryKeys.schedule.forMember('h', 'm')` call would have thrown `TypeError: Cannot read properties of undefined (reading 'forMember')` against pre-plan HEAD — this test file is the behavioural proof that T-27-02 is closed.

### Acceptance grep checks (all pass)

| Check | Result | Threshold |
|-------|--------|-----------|
| `grep -c "schedule:" src/lib/queryKeys.ts` | 1 | ≥ 1 |
| `grep -c "forHousehold" src/lib/queryKeys.ts` | 1 | ≥ 1 |
| `grep -c "forMember: (householdId" src/lib/queryKeys.ts` | 4 | ≥ 1 (matches schedule + ratings + restrictions + wontEat) |
| `grep -c "exceptionsForMember" src/lib/queryKeys.ts` | 1 | ≥ 1 |
| `test -f src/lib/queryKeys.test.ts` | exit 0 | exit 0 |
| `grep -c "useHouseholdSchedules" src/hooks/useSchedule.ts` | 1 | ≥ 1 |
| `grep -c "export function useSchedule" src/hooks/useSchedule.ts` | 1 | ≥ 1 |
| `grep -c "export function useSaveSchedule" src/hooks/useSchedule.ts` | 1 | ≥ 1 |
| `grep -c "buildHouseholdGrid" src/utils/schedule.ts` | 1 | ≥ 1 |
| `grep -c "buildHouseholdTooltips" src/utils/schedule.ts` | 1 | ≥ 1 |
| `grep -c "export function buildGrid" src/utils/schedule.ts` | 1 | ≥ 1 (preserved, L-020) |
| `grep -c "STATUS_CYCLE" src/utils/schedule.ts` | 5 | ≥ 2 (original decl + precedence helper + 3 misc refs) |
| `grep "queryKeys\.schedule\.forHousehold" src/hooks/useSchedule.ts` | matches | matches |
| `npx tsc --noEmit src/lib/queryKeys.ts` | exit 0 | exit 0 |
| `npx vite build` | exit 0 (built in 499ms) | exit 0 |

### Full test suite (no regressions)

```
$ npx vitest run tests/
 Test Files  4 failed | 21 passed | 5 skipped (30)
      Tests  12 failed | 200 passed | 39 todo (251)
```

**Identical 12-fail count on pre-plan HEAD `22d383d` (verified via `git stash` + re-run).** All 12 failures live in 4 files NOT touched by Plan 27-01:
- `tests/theme.test.ts` (6 failures, dark-mode toggle)
- `tests/auth.test.ts` (3 failures, signUp / signIn / OAuth)
- `tests/AuthContext.test.tsx` (2 failures, session init / signOut)
- `tests/guide.test.ts` (1 failure, GuidePage hash deep-link)

These pre-existing failures are logged in `.planning/phases/27-wire-schedule-badges-to-plangrid/deferred-items.md` and are explicitly out of scope per execute-plan SCOPE BOUNDARY rule.

## Decisions Made

- **Append schedule namespace alphabetically adjacent to `wontEat`** (per plan instruction) — placed between lines 83 and 84 of pre-plan `queryKeys.ts`, matching the existing `inventory` factory shape.
- **Append schedule describe block to existing `queryKeys.test.ts`** rather than overwriting — preserves the existing 5 feedback-engine tests. See Deviations §1.
- **Precedence helper as inline `function precedence(s: ScheduleStatus)`** rather than exported — keeps `STATUS_CYCLE.indexOf` as the single source of truth without leaking implementation detail to consumers. Future refactors can extract to a named export if a third caller appears (premature abstraction avoided per project code-style.md).
- **Tooltip `DISPLAY_ORDER` array hardcoded `['away','quick','consume']`** rather than computed from reversed `STATUS_CYCLE` — explicit display-time ordering avoids slicing/index-math, matches the `Exclude<ScheduleStatus, 'prep'>` `TITLE_CASE` map type for compile-time exhaustiveness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `queryKeys.test.ts` already exists; plan's "Exact contents" directive would have destroyed 5 passing feedback-engine tests**

- **Found during:** Task 1 Part B
- **Issue:** Plan instructed "Create a new file `src/lib/queryKeys.test.ts`" with explicit "Exact contents" showing only the 3 schedule it cases. But the file already exists with 5 passing tests for `ratings`, `restrictions`, `wontEat`, `aiTags`, `insights` namespaces (added in an earlier phase). Following the plan literally via `Write` would have destroyed those tests.
- **Fix:** Used `Edit` to APPEND the new `describe('queryKeys.schedule')` block after the existing `describe('queryKeys - feedback engine keys')` block. The test file now has 8 passing tests instead of 3 + lost 5.
- **Files modified:** `src/lib/queryKeys.test.ts`
- **Verification:** `npx vitest run src/lib/queryKeys.test.ts` → 8 passed (5 pre-existing + 3 new). Pre-plan grep `grep -c "ratings.list" src/lib/queryKeys.test.ts` returns 1 both before and after (proves preservation).
- **Committed in:** `ab86db7` (Task 1 commit)

### Authentication gates

None — no Supabase / external service calls fired during execution.

### Out-of-scope discoveries (logged to deferred-items.md, NOT fixed per scope boundary)

- 12 pre-existing test failures in `tests/theme.test.ts`, `tests/auth.test.ts`, `tests/AuthContext.test.tsx`, `tests/guide.test.ts`. Documented in `deferred-items.md`. None caused by Plan 27-01 — confirmed by `git stash` + re-run against HEAD.

---

**Total deviations:** 1 auto-fixed (Rule 1 — preserve existing test coverage)
**Impact on plan:** No scope creep. The fix preserves 5 pre-existing tests that the plan's "Exact contents" directive would have destroyed; the 3 new schedule tests still land verbatim from the plan.

## Issues Encountered

None — plan executed in 2 atomic tasks (3 commits) with no blockers. All grep + range-diff + test gates passed on first run.

## Self-Check: PASSED

- **Files created:**
  - `src/utils/schedule.household.test.ts` — FOUND
  - `.planning/phases/27-wire-schedule-badges-to-plangrid/27-01-SUMMARY.md` — FOUND (this file)
  - `.planning/phases/27-wire-schedule-badges-to-plangrid/deferred-items.md` — FOUND
- **Files modified (all 4):**
  - `src/lib/queryKeys.ts` — schedule namespace present at line 84-91
  - `src/lib/queryKeys.test.ts` — schedule describe at line 26-39 (existing block intact at 1-24)
  - `src/hooks/useSchedule.ts` — useHouseholdSchedules at line 81-94 (lines 1-79 byte-identical to HEAD)
  - `src/utils/schedule.ts` — precedence at line 27, buildHouseholdGrid at 31-43, buildHouseholdTooltips at 51-91 (existing buildGrid at 9-15 untouched)
- **Commits exist:**
  - `ab86db7` feat(27-01): restore queryKeys.schedule namespace + forHousehold sibling — FOUND
  - `d61f037` test(27-01): add failing tests for buildHouseholdGrid + buildHouseholdTooltips — FOUND
  - `e71c959` feat(27-01): add useHouseholdSchedules hook + buildHouseholdGrid/Tooltips — FOUND
- **Range-diff D-06a guard:** exit 0
- **TDD test (`schedule.household.test.ts`):** 10/10 passing
- **Runtime namespace test (`queryKeys.test.ts`):** 8/8 passing (3 new + 5 pre-existing)
- **Existing tests/ suite:** 200 passing (12 pre-existing failures unrelated to this plan)
- **`npx vite build`:** exit 0

## Hand-off to Plan 02

Import the three primitives shipped here in PlanGrid.tsx:

```typescript
import { useHouseholdSchedules } from '../../hooks/useSchedule'
import { buildHouseholdGrid, buildHouseholdTooltips } from '../../utils/schedule'
```

Then per the plan / patterns:
- Call `const { data: scheduleSlots } = useHouseholdSchedules(householdId)` near the other household-scoped hooks (`useNutritionTargets`, `useFoodPrices`).
- Build `slotSchedulesByDay` via `useMemo` using `buildHouseholdGrid(scheduleSlots)` (replaces the historical `buildGrid` in the 4eab9b7 baseline) — remember the `'Snack' -> 'Snacks'` normalisation per L-008 / D-09 and the `(weekStartDay + dayIndex) % 7` key shift per D-10.
- Build a parallel `slotTooltipsByDay` via `buildHouseholdTooltips(scheduleSlots, memberNameById)` where `memberNameById` is built from `useHouseholdMembers()` + `useMemberProfiles()` (both already present in PlanGrid).
- Forward both as `slotSchedules={slotSchedulesByDay?.get((weekStartDay + i) % 7)}` and `slotTooltips={slotTooltipsByDay?.get((weekStartDay + i) % 7)}` to each `<DayCard>`.
- Restore the SlotCard occupied + empty dot JSX from `4eab9b7` / `cdf039b` per UI-SPEC §Anti-Regression Contract.

The `useSaveSchedule.onSuccess` invalidator (`['schedule', householdId]` prefix) already covers the new `forHousehold` cache key — no mutation changes needed.

## Threat Flags

None — Plan 27-01 introduced no new network endpoints, no new auth paths, no file access patterns, no schema changes. The single new SELECT (`useHouseholdSchedules`) hits the existing `member_schedule_slots` table that is already covered by Phase 21 RLS + the threat model in `27-01-PLAN.md` `<threat_model>` (T-27-01 mitigated via `.eq('household_id', householdId!)` + DB RLS).

---
*Phase: 27-wire-schedule-badges-to-plangrid*
*Plan: 01*
*Completed: 2026-04-20*
