---
phase: 27-wire-schedule-badges-to-plangrid
plan: 03
subsystem: tests + docs
tags: [regression-test, roadmap, schedule, vitest, rtl, crit-02-closure]

requires:
  - phase: 27-wire-schedule-badges-to-plangrid
    provides: "useHouseholdSchedules hook + buildHouseholdGrid + buildHouseholdTooltips utilities (Plan 27-01); PlanGrid → DayCard → SlotCard wiring with slotSchedules + slotTooltips props (Plan 27-02)"
  - phase: 21-schedule-model
    provides: "ScheduleStatus union, MemberScheduleSlot row shape, member_schedule_slots table"
provides:
  - "tests/PlanGrid.schedule.test.tsx — 9-it regression test that locks the Phase 27 PlanGrid → DayCard → SlotCard wiring against future worktree truncation (mitigates T-27-11)"
  - "ROADMAP.md §Phase 27 criterion #1 amended in place per D-08 — references useHouseholdSchedules + precedence rule (mitigates T-27-12)"
  - "ROADMAP.md §Phase 27 criterion #3 amended in place per D-10 — uses (weekStartDay + dayIndex) % 7 day-of-week key"
  - "ROADMAP.md §Phase 27 plans counter advanced 2/3 → 3/3 complete; 27-03-PLAN.md checkbox checked"
  - "CRIT-02 closure gate in place — any future regression of the Phase 27 wiring will fail tests/PlanGrid.schedule.test.tsx"
affects: [Phase 28+ planning (CRIT-02 now provably closed); any future PR touching PlanGrid.tsx, DayCard.tsx, or SlotCard.tsx schedule wiring]

tech-stack:
  added: []
  patterns:
    - "Mutable module-level let pattern (mockScheduleRows) for per-test mock data injection — closes over the vi.mock factory, mutated in beforeEach + per-it (matches tests/PlanGrid.nutritionGap.test.tsx mockGaps + mockLatestGeneration pattern)"
    - "Dual-render-path scoping via getAllByText + per-result loop — PlanGrid renders the dayCards array twice (mobile DayCarousel + desktop stack, both in DOM with CSS visibility), so day-name lookups (Sun/Mon/Tue) and dot lookups (Schedule: away) return 2x results; tests assert positive on every match and negative on every Monday-equivalent card"
    - "Compound class-attribute selector for DayCard ancestor scoping: [class*=\"rounded-\"][class*=\"bg-surface\"] uniquely identifies DayCard root vs. inner rounded-lg slot rows (no need to add data-testid attributes to production code)"
    - "Within()-scoped positive + negative pair as the D-10 day-of-week-key gate — Tuesday DayCard MUST contain the away dot, Monday DayCard MUST NOT; catches off-by-one shifts in either direction"
    - "ROADMAP amendment in place with inline 'Amended in Phase 27 planning per D-XX' audit markers — text-search greppable, no separate changelog drift"

key-files:
  created:
    - "tests/PlanGrid.schedule.test.tsx (322 lines, 9 it() blocks)"
    - ".planning/phases/27-wire-schedule-badges-to-plangrid/27-03-SUMMARY.md (this file)"
    - ".planning/phases/27-wire-schedule-badges-to-plangrid/27-VERIFICATION.md (goal-backward rubric)"
  modified:
    - ".planning/ROADMAP.md (+4 / -4 inside §Phase 27 only — criteria #1, #3, plans counter, plan-3 checkbox)"

key-decisions:
  - "D-08 honored: ROADMAP §Phase 27 criterion #1 now references useHouseholdSchedules (not useSchedule), spells out the precedence rule away > quick > consume > prep, and carries the inline Amended marker."
  - "D-10 honored: ROADMAP §Phase 27 criterion #3 now uses (weekStartDay + dayIndex) % 7 (day-of-week key), not the plan-relative slotSchedulesByDay?.get(dayIndex), and carries the inline Amended marker."
  - "D-12 honored: tests/PlanGrid.schedule.test.tsx mocks useHouseholdSchedules (NOT useSchedule) so the test fails immediately if PlanGrid ever switches back to the single-member hook — that switch would land on the empty useSchedule mock and produce zero dots."
  - "Scoped selectors over data-testid: rather than touch Plan 02 production code by adding data-testid attributes for the within() scope, the test uses the existing compound class selector [class*=\"rounded-\"][class*=\"bg-surface\"] which already uniquely identifies DayCard roots. Zero production-code touches in Plan 03 — this is purely a test + docs plan."
  - "Dual-render-path handling via getAllByText loops: when first run, 4 of 9 tests failed because PlanGrid renders dayCards twice (mobile + desktop both in DOM). Rather than scope to one viewport via media-query mocking (fragile — would tie test to Tailwind breakpoints) or shrink to one render path, the test embraces the duplication: every Schedule:* dot assertion uses getAll + loop, asserting the SAME tooltip on EVERY copy. This is a true integration test of what the user sees, regardless of viewport."

requirements-completed: [SCHED-01, SCHED-02]  # Both requirements close at this plan: SCHED-01 (visibility of per-member availability windows on PlanGrid) and SCHED-02 (visibility of household-aggregated availability for plan-generation context) are both fulfilled by Plan 02's UI wiring + this plan's regression-test gate that prevents the wiring from silently regressing.

metrics:
  duration: "~6 min"
  started: "2026-04-21T01:08:01Z"
  completed: "2026-04-21T01:14:00Z"
  tasks: 2
  commits: 2
  lines_changed:
    "tests/PlanGrid.schedule.test.tsx": "+322 / -0 (new file)"
    ".planning/ROADMAP.md": "+4 / -4 (in-place amendments inside §Phase 27 only)"
---

# Phase 27 Plan 03: PlanGrid Schedule Regression Test + ROADMAP Amendments Summary

**Closed Phase 27 (and CRIT-02 from the v2.0 audit) by shipping a 9-it Vitest + RTL regression test at `tests/PlanGrid.schedule.test.tsx` that locks every load-bearing schedule-wiring decision (D-04 precedence, D-07 tooltip format, D-09 Snack→Snacks, D-10 day-of-week key, D-12 useHouseholdSchedules import, UUID fallback, empty-schedule no-op) against future worktree truncation, and amending ROADMAP §Phase 27 criteria #1 and #3 in place per D-08 / D-10 with inline audit markers — no other phase or production file touched.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-21T01:08:01Z
- **Completed:** 2026-04-21T01:14:00Z
- **Tasks:** 2 (Task 1 regression test, Task 2 ROADMAP amend)
- **Commits:** 2 (1 `test`, 1 `docs`)
- **Files created:** 1 production + 2 docs (the test + this SUMMARY + VERIFICATION)
- **Files modified:** 1 (ROADMAP.md — 4 lines, in-place inside §Phase 27 only)
- **Total source lines added:** 322 (test) + 4 (ROADMAP) = 326

## Accomplishments

- **CRIT-02 closure gate in place.** Any future PR that drops the `useHouseholdSchedules` import from `PlanGrid.tsx`, removes the `slotSchedules` prop from `<DayCard>`, breaks the precedence rule, breaks the (weekStartDay + dayIndex) % 7 day-of-week key, breaks the Snack→Snacks normalisation, breaks the family tooltip format, or removes the dot JSX from `SlotCard.tsx` will fail at least one of the 9 `it(...)` blocks in `tests/PlanGrid.schedule.test.tsx`. The Phase 22 worktree-truncation pattern (L-020 / L-027) that birthed CRIT-02 cannot silently recur on this surface.
- **9 of 9 tests pass on first commit.** All behaviours from the plan's `<behavior>` block are covered: useHouseholdSchedules-not-useSchedule, single-member dot, precedence away > quick > consume > prep, family tooltip exact-string match, prep-drop, day-of-week-key positive+negative within()-scoped, Snack→Snacks normalisation, UUID fallback, empty-schedule no-op.
- **ROADMAP amended in place with audit trail.** Criteria #1 and #3 now reflect the shipped behaviour, with inline `(Amended in Phase 27 planning per D-08 / D-10 — original text ...)` markers preserving the rationale chain. Criteria #2, #4, #5 are byte-identical to pre-edit. No other phase touched. Plans counter advanced 2/3 → 3/3 complete; the Plan 27-03 checkbox is now `- [x]`.
- **Zero production-code regression risk.** Plan 27-03 touches only `tests/` and `.planning/` files. Diff stat: `tests/PlanGrid.schedule.test.tsx` (+322, new) and `.planning/ROADMAP.md` (+4 / -4, in-place). No `src/` touches. The 14-feature preservation loop from Plan 02 still trivially holds (no PlanGrid edits made).

## Task Commits

1. **Task 1: Add tests/PlanGrid.schedule.test.tsx regression test** — `1e9325f` (test)
2. **Task 2: Amend ROADMAP §Phase 27 criteria #1 + #3 per D-08 / D-10** — `f7589b9` (docs)

## Files Created/Modified

- **`tests/PlanGrid.schedule.test.tsx`** (+322 lines, new file)
  - Architectural scaffolding copied verbatim from `tests/PlanGrid.shimmer.test.tsx` lines 1-124: every `vi.mock` block (AuthContext, useHousehold family, useMealPlan family, useMeals, useFoodLogs, useNutritionTargets, usePlanGeneration, useNutritionGaps, supabase, DayCarousel, @dnd-kit/core), the `MemoryRouter` + `QueryClientProvider` wiring, the dynamic `await import('../src/components/plan/PlanGrid')` in `renderPlanGrid`.
  - One new `vi.mock('../src/hooks/useSchedule', ...)` block that exports `useHouseholdSchedules` (returning `mockScheduleRows`), `useSchedule` (returning `[]` no-op), and `useSaveSchedule` (no-op mutate).
  - `useHouseholdMembers` mock returns 2 named users (Dad, Sam); `useMemberProfiles` returns 1 named profile (Kayla) — three named members enable the precedence + tooltip tests.
  - `mockScheduleRows: let` at module level, reset in `beforeEach`, mutated per-test before each `renderPlanGrid()` call.
  - 9 `it(...)` blocks, one per behaviour from the plan `<behavior>` block.
  - Test 6 uses `getAllByText('Tue') + getAllByText('Mon')` and loops because PlanGrid renders dayCards twice (mobile DayCarousel + desktop stack, both in jsdom DOM); positive Tuesday assertion + negative Monday assertion run on every render path.
  - Test 7 uses the same loop pattern for Sun, asserts dot count equals `sunHeadings.length` so a phantom Snack-key duplicate would surface as 2x.
- **`.planning/ROADMAP.md`** (+4 / -4 inside §Phase 27 only)
  - Line 529: criterion #1 replaced with the D-08 amendment (useHouseholdSchedules + precedence + audit marker)
  - Line 531: criterion #3 replaced with the D-10 amendment ((weekStartDay + dayIndex) % 7 + audit marker)
  - Line 534: `**Plans**: 3 plans (2/3 complete)` → `**Plans**: 3 plans (3/3 complete)`
  - Line 539: 27-03-PLAN.md checkbox `- [ ]` → `- [x]`
  - Lines 530, 532, 533 (criteria #2, #4, #5) byte-identical to pre-edit.
  - No edits anywhere outside lines 529-539; `git diff` confirms.
- **`.planning/phases/27-wire-schedule-badges-to-plangrid/27-03-SUMMARY.md`** (new — this file)
- **`.planning/phases/27-wire-schedule-badges-to-plangrid/27-VERIFICATION.md`** (new — goal-backward rubric mapping every amended ROADMAP criterion + the regression test to the evidence that satisfies it)

## Verification Results

### `npx vitest run tests/PlanGrid.schedule.test.tsx` (9/9 pass)

After the L-001 worktree cleanup (`for d in .claude/worktrees/agent-*; do git worktree remove "$d" --force; done; rm -rf .claude/worktrees/agent-*`):

```
$ npx vitest run tests/PlanGrid.schedule.test.tsx
 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  21:11:30
   Duration  1.14s (transform 155ms, setup 51ms, import 129ms, tests 500ms, environment 361ms)
```

All 9 it() blocks pass:

1. uses useHouseholdSchedules (not single-member useSchedule): mutating mockScheduleRows changes the rendered DOM
2. renders a single member away dot with bg-red-500 + aria-label "Schedule: away"
3. applies precedence away > quick > consume > prep on same (day, slot)
4. renders family tooltip with Title-Case statuses, comma-separated names, period terminators
5. drops prep entirely — two prep rows on the same (day, slot) render no dot
6. places the away dot inside the Tuesday DayCard, not the Monday DayCard, when weekStartDay=1
7. normalises Snack -> Snacks so a slot_name='Snack' row surfaces on the Snacks SlotCard (D-09)
8. falls back to first-8-char UUID slice in tooltip when member_user_id is unknown
9. renders no Schedule:* dots when mockScheduleRows is empty

### `npx vitest run tests/` (no new regressions)

```
$ npx vitest run tests/
 Test Files   4 failed | 22 passed | 5 skipped (31)
      Tests   12 failed | 209 passed | 39 todo (260)
```

**12 failed | 209 passed** matches the Plan 02 baseline of `12 failed | 200 passed` exactly. The +9 passing tests are exactly the 9 new tests in `tests/PlanGrid.schedule.test.tsx`. **Zero new regressions.**

The 12 failures all live in 4 files NOT touched by Plan 27-03 (or any Phase 27 plan): `tests/theme.test.ts` (6 dark-mode toggle), `tests/auth.test.ts` (3 signUp/signIn/OAuth), `tests/AuthContext.test.tsx` (2 session init / signOut), `tests/guide.test.ts` (1 hash deep-link). These are the same 12 pre-existing failures logged in `.planning/phases/27-wire-schedule-badges-to-plangrid/deferred-items.md`.

### Acceptance grep contract for Task 1 (all pass)

| Check | Threshold | Result | Pass |
|---|---|---|---|
| `test -f tests/PlanGrid.schedule.test.tsx` | exit 0 | FOUND | yes |
| `grep -c "^  it(" tests/PlanGrid.schedule.test.tsx` | ≥ 9 | 9 | yes |
| `grep -c "mockScheduleRows" tests/PlanGrid.schedule.test.tsx` | ≥ 10 | 16 | yes |
| `grep -c "useHouseholdSchedules" tests/PlanGrid.schedule.test.tsx` | ≥ 2 | 3 | yes |
| `grep -F "Away: Dad. Quick: Sam. Consume: Kayla." tests/PlanGrid.schedule.test.tsx` | matches | 2 lines match | yes |
| `grep -F "weekStartDay: 1" tests/PlanGrid.schedule.test.tsx` | matches | 1 line | yes |
| `grep -F "slot_name: 'Snack'" tests/PlanGrid.schedule.test.tsx` | matches | 1 line | yes |
| `grep -F "abcd1234" tests/PlanGrid.schedule.test.tsx` | matches | 2 lines | yes |
| `grep -c "within(" tests/PlanGrid.schedule.test.tsx` | ≥ 2 | 3 | yes |
| `grep -F '[class*="rounded-"][class*="bg-surface"]' tests/PlanGrid.schedule.test.tsx` | matches | 3 matches | yes |
| `grep -F "queryByLabelText('Schedule: away')" tests/PlanGrid.schedule.test.tsx` | matches | 1 (Test 6 negative) | yes |
| `grep -F "getByLabelText('Schedule: away')" tests/PlanGrid.schedule.test.tsx` | matches | 1 (Test 6 positive) | yes |

### Acceptance grep contract for Task 2 (all pass)

| Check | Result |
|---|---|
| `grep -F "useHouseholdSchedules" .planning/ROADMAP.md` | matches (criterion #1 amended + 3 lines in plan list) |
| `grep -F "(weekStartDay + dayIndex) % 7" .planning/ROADMAP.md` | matches (criterion #3 amended) |
| `grep -F "Amended in Phase 27 planning per D-08" .planning/ROADMAP.md` | matches |
| `grep -F "Amended in Phase 27 planning per D-10" .planning/ROADMAP.md` | matches |
| `grep -cF "27-01-PLAN.md" .planning/ROADMAP.md` | 1 |
| `grep -cF "27-02-PLAN.md" .planning/ROADMAP.md` | 1 |
| `grep -cF "27-03-PLAN.md" .planning/ROADMAP.md` | 1 |
| `**Plans**: TBD` for Phase 27 | 0 (the placeholder was already replaced in Plan 01; this plan advanced 2/3 → 3/3) |
| `git diff .planning/ROADMAP.md` scope | only inside §Phase 27 (lines 529-539); no other phase touched |

### Phase-wide UI-SPEC §5 anti-regression contract (all pass)

| Check | Threshold | Result |
|---|---|---|
| `grep -c "useHouseholdSchedules" src/components/plan/PlanGrid.tsx` | ≥ 2 | 2 |
| `grep -c "slotSchedules" src/components/plan/PlanGrid.tsx` | ≥ 2 | 2 |
| `grep -c "scheduleStatus" src/components/plan/SlotCard.tsx` | ≥ 4 | 15 |
| `grep -cE "bg-accent\|bg-amber-500\|bg-red-500" src/components/plan/SlotCard.tsx` | ≥ 3 | 8 |
| `test -f tests/PlanGrid.schedule.test.tsx` | exit 0 | FOUND |

## Decisions Made

- **Test 6 + Test 7 use `getAllByText` + per-element loops to handle PlanGrid's dual mobile/desktop render path.** First test run failed 4/9 because PlanGrid renders the `dayCards` array twice (mobile DayCarousel + desktop stack, both in jsdom DOM). Rather than (a) mock the responsive media query and force one render path (fragile, ties tests to Tailwind breakpoints), or (b) scope the test to a specific viewport which would weaken coverage to one of the two render paths the user actually sees, the test embraces the duplication: every Schedule:* assertion uses `getAll*` and asserts the same expected outcome on every match. This is a stronger integration assertion (proves the dot renders consistently in both paths) and trivially future-proofs against the responsive layout being refactored.
- **Compound class selector `[class*="rounded-"][class*="bg-surface"]` over data-testid additions.** PATTERNS.md anticipated this exact selector and noted it uniquely identifies the DayCard root (inner slot rows use `rounded-lg` but not `bg-surface`). Adding `data-testid` to DayCard production code was rejected as needless production-code surface for a test-only need.
- **`useHouseholdSchedules` is the mock target, not `useSchedule`.** D-12 specifies the test must lock the household-wide hook. The mock module exports both `useHouseholdSchedules` (live data path) AND `useSchedule` (no-op `[]`) so a future regression that switches PlanGrid back to `useSchedule` would land on the empty no-op and produce zero dots, failing 8 of 9 tests immediately.
- **Tooltip tests assert the exact string `'Away: Dad. Quick: Sam. Consume: Kayla.'`** — Title-Case status word, colon + space, comma-separated names, period terminator, single space between status clauses, no Oxford "and", no trailing filler. Locks the UI-SPEC §Copywriting Contract format byte-for-byte.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] First test run failed 4/9 because PlanGrid renders dayCards in BOTH mobile and desktop paths**

- **Found during:** Task 1 verification (first vitest run after writing the test file)
- **Issue:** `screen.getByText('Sun')`, `screen.getByText('Tue')`, `screen.getByLabelText('Schedule: away')` (single-element queries) all threw `Found multiple elements` errors because PlanGrid renders the `dayCards` array twice in the DOM — once inside the mobile `<DayCarousel>` (CSS `md:hidden`) and once in the desktop stack (CSS `hidden md:flex`). Both renders are in jsdom even though only one is visible at any viewport. Tests 4, 6, 7, 8 hit this.
- **Fix:** Replaced `getByText` / `getByLabelText` (single-element queries) with `getAllByText` / `getAllByLabelText` plus a `for` loop that asserts the expected outcome on EVERY element. Test 6 (positive Tuesday + negative Monday) now loops over `tueHeadings` + `monHeadings`. Test 7 (Snacks dot + count check) loops over `sunHeadings` and asserts total count equals `sunHeadings.length`. Tests 4 and 8 loop over `awayDots` and assert the same tooltip string on every dot.
- **Files modified:** `tests/PlanGrid.schedule.test.tsx` (revisions made before the first commit)
- **Verification:** Re-run `npx vitest run tests/PlanGrid.schedule.test.tsx` → 9 passed (9). Logged + committed inside `1e9325f`.
- **Why this is stronger than the plan's intent:** The plan's `<action>` Step 7 anticipated needing to "inspect via screen.debug() once and adjust the selector — but do NOT weaken the assertion. The positive+negative scoping is the whole D-10 gate." The fix preserves the positive-Tuesday + negative-Monday gate, but extends it to assert on EVERY mobile/desktop copy, which catches a broader class of regressions (e.g., a future refactor that splits the data-source between the two render paths would fail this test).

### Authentication gates

None — no Supabase calls, no auth flows in the test file. All data is synthetic mock objects.

### Out-of-scope discoveries

None new. The 12 pre-existing test failures in `tests/theme.test.ts`, `tests/auth.test.ts`, `tests/AuthContext.test.tsx`, `tests/guide.test.ts` remain unchanged from Plan 01's `deferred-items.md`. Out of scope per execute-plan SCOPE BOUNDARY rule.

## Issues Encountered

One — the dual-render-path issue documented in Deviations above. Fixed with single-test-file edits before the first Task 1 commit; landed clean inside `1e9325f`.

## Self-Check: PASSED

- **Files created:**
  - `tests/PlanGrid.schedule.test.tsx` — FOUND
  - `.planning/phases/27-wire-schedule-badges-to-plangrid/27-03-SUMMARY.md` — FOUND (this file)
  - `.planning/phases/27-wire-schedule-badges-to-plangrid/27-VERIFICATION.md` — FOUND
- **Files modified (1):**
  - `.planning/ROADMAP.md` — criteria #1 + #3 amended in place; plans counter 2/3 → 3/3; plan-3 checkbox checked; only lines 529-539 touched (verified via `git diff`)
- **Commits exist:**
  - `1e9325f` test(27-03): add PlanGrid schedule wiring regression test — FOUND
  - `f7589b9` docs(27-03): amend ROADMAP §Phase 27 criteria #1 + #3 per D-08 / D-10 — FOUND
- **Test gates:**
  - `npx vitest run tests/PlanGrid.schedule.test.tsx` — 9/9 pass
  - `npx vitest run tests/` — 12 failed | 209 passed | 39 todo (zero new regressions vs Plan 02 baseline of 12 failed | 200 passed | 39 todo; +9 = exactly the new tests)
- **Acceptance grep contract for Task 1** — all 12 checks pass
- **Acceptance grep contract for Task 2** — all 9 checks pass; ROADMAP scope guard (`git diff` shows only §Phase 27 changes) holds
- **UI-SPEC §5 phase-wide anti-regression contract** — all 5 checks pass

## Phase Closure Note

**CRIT-02 closure gate is in place.** Any future PR that regresses the Phase 27 wiring (drops `useHouseholdSchedules` from PlanGrid, removes `slotSchedules` from `<DayCard>`, breaks the precedence aggregation, breaks the (weekStartDay + dayIndex) % 7 day-of-week key, breaks the Snack→Snacks normalisation, breaks the family tooltip format, or removes the dot JSX from SlotCard) will fail at least one of the 9 `it(...)` blocks in `tests/PlanGrid.schedule.test.tsx`. The Phase 22 worktree-truncation pattern (L-020 / L-027) that birthed CRIT-02 cannot silently recur on this surface.

Phase 27 is **complete** (3/3 plans):
- Plan 01: queryKeys.schedule restored + `useHouseholdSchedules` + `buildHouseholdGrid` + `buildHouseholdTooltips` (foundation)
- Plan 02: PlanGrid → DayCard → SlotCard wiring + dot JSX (user-facing fix)
- Plan 03: Regression test + ROADMAP amendment (closure gate + audit reconciliation)

SCHED-01 + SCHED-02 visibility slice is now closed and locked.

## Threat Flags

None — Plan 27-03 introduced no new network endpoints, no new auth paths, no file access patterns, no schema changes. The test file uses only synthetic mock data (`hh-1`, `u-dad`, `mp-kayla`, etc.) and never touches Supabase, the file system, or any external service. The ROADMAP edit is purely documentation reconciliation. T-27-11 (worktree-truncation regression reintroduction) is mitigated by the new test; T-27-12 (ROADMAP audit gap) is mitigated by the inline "Amended in Phase 27 planning per D-XX" markers.

---
*Phase: 27-wire-schedule-badges-to-plangrid*
*Plan: 03*
*Completed: 2026-04-21*
