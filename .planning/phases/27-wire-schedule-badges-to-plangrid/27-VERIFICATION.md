---
phase: 27-wire-schedule-badges-to-plangrid
created: 2026-04-21
type: phase-closure-verification
rubric: goal-backward
status: VERIFIED
---

# Phase 27 — Verification

**Goal-backward rubric.** Each ROADMAP §Phase 27 acceptance criterion (post-amendment per D-08 / D-10) is mapped to the concrete evidence (commits, files, grep results, test names) that satisfies it. The phase goal is restoration of Phase 21-02 schedule-badge behaviour PLUS extension to a household-holistic view; this rubric proves both halves.

---

## Phase Goal Restatement

> The schedule set via `ScheduleSection` surfaces as coloured dot badges on PlanGrid SlotCards (peach=consume, amber=quick, red=away) so the Phase 21 data model is visible to the user — extended in this phase to a **household-holistic** signal where the dot reflects the most-constraining status across all household members for that (day, slot), not just the currently selected member.

This phase **closes CRIT-02** from the v2.0 audit (PlanGrid → useSchedule → slotSchedules prop wiring regressed by Phase 22 worktree truncation).

**Restoration component:** the visual surface (peach/amber/red dots, no dot for prep) and the `'Snack' → 'Snacks'` normalisation match Phase 21-02's `4eab9b7` + `cdf039b` baselines verbatim — same dot sizes (12px occupied / 10px empty), same colour mapping, same `aria-label` format, same inline placement (`ml-1`, between meal name and violation badge).

**Extension component:** the data source switched from per-selected-member (`useSchedule(householdId, memberId, memberType)`) to family-wide (`useHouseholdSchedules(householdId)`), with client-side aggregation via the precedence rule `away > quick > consume > prep`, and the `title` attribute carries a per-member breakdown (`"Away: Dad. Quick: Sam. Consume: Kayla."`).

---

## Goal-Backward Evidence Map

### Amended Criterion #1 (per D-08)

> **`PlanGrid.tsx` imports `useHouseholdSchedules` from `../../hooks/useSchedule` and calls it with `(householdId)`; the returned rows are aggregated into a `Map<number, Map<string, ScheduleStatus>>` using the precedence rule `away > quick > consume > prep`, memoised via `useMemo`.**

| Evidence | Source | Result |
|---|---|---|
| Import line present | `src/components/plan/PlanGrid.tsx:21` | `import { useHouseholdSchedules } from '../../hooks/useSchedule'` |
| Hook called with householdId only | `src/components/plan/PlanGrid.tsx:258` | `const { data: scheduleSlots } = useHouseholdSchedules(householdId)` |
| Map<number, Map<string, ScheduleStatus>> built | `src/components/plan/PlanGrid.tsx:272-285` | `slotSchedulesByDay = useMemo(...)` returns `byDay: Map<number, Map<string, ScheduleStatus>>` |
| Precedence rule away > quick > consume > prep | `src/utils/schedule.ts:27-48` (`buildHouseholdGrid` + `precedence` helper) | precedence helper uses `STATUS_CYCLE.indexOf` (precedence ascending: prep=0, consume=1, quick=2, away=3); buildHouseholdGrid drops prep + retains highest-precedence status per (day, slot) |
| Memoised via useMemo | `src/components/plan/PlanGrid.tsx:272` | `const slotSchedulesByDay = useMemo(() => { ... }, [scheduleSlots])` |
| Test locks the import shape | `tests/PlanGrid.schedule.test.tsx` Test 1 | "uses useHouseholdSchedules (not single-member useSchedule): mutating mockScheduleRows changes the rendered DOM" — passes |
| Test locks the precedence rule | `tests/PlanGrid.schedule.test.tsx` Test 3 | "applies precedence away > quick > consume > prep on same (day, slot)" — passes |
| Unit tests on the aggregation helper | `src/utils/schedule.household.test.ts` | 10/10 pass (Plan 27-01 baseline; precedence ladder, all-prep drop, single-member, multi-status all covered) |
| ROADMAP audit marker | `.planning/ROADMAP.md:529` | text contains `(Amended in Phase 27 planning per D-08 — original text referenced the single-member useSchedule hook.)` |

**Status:** PASS

---

### Amended Criterion #3 (per D-10)

> **Both the mobile (DayCarousel) and desktop render sites pass `slotSchedules={slotSchedulesByDay?.get((weekStartDay + dayIndex) % 7)}` to each `DayCard` (day-of-week key, not plan-relative day index — required when `weekStartDay !== 0`).**

| Evidence | Source | Result |
|---|---|---|
| Day-of-week key used | `src/components/plan/PlanGrid.tsx:598` | `slotSchedules={slotSchedulesByDay?.get((weekStartDay + i) % 7)}` |
| Both render sites covered | `src/components/plan/PlanGrid.tsx` line 568-604 (`dayCards` array) → rendered inline at lines 684 (mobile DayCarousel branch) AND 716 (desktop stack branch) | One `<DayCard>` JSX shared between both render paths; single textual prop insertion populates both — visibility-criterion satisfied |
| Day-of-week computed from `dayIndex` correctly | `src/components/plan/DayCard.tsx:111` | `const dayName = DAY_NAMES[(weekStartDay + dayIndex) % 7]` (matches the data-key formula exactly) |
| Test locks the day-of-week key | `tests/PlanGrid.schedule.test.tsx` Test 6 | "places the away dot inside the Tuesday DayCard, not the Monday DayCard, when weekStartDay=1" — positive Tuesday + negative Monday, within()-scoped — passes |
| ROADMAP audit marker | `.planning/ROADMAP.md:531` | text contains `(Amended in Phase 27 planning per D-10 — original text used a plan-relative key that would shift incorrectly for Monday-start households.)` |

**Status:** PASS

---

### Unchanged Criterion #2 (D-08 covers it)

> **`PlanGrid.tsx` builds a `Map<number, Map<string, ScheduleStatus>>` keyed by day-of-week and slot name via `buildGrid` (or equivalent), memoised via `useMemo`.**

| Evidence | Source | Result |
|---|---|---|
| Map shape | `src/components/plan/PlanGrid.tsx:275` | `const byDay = new Map<number, Map<string, ScheduleStatus>>()` |
| Built via "buildGrid (or equivalent)" | `src/components/plan/PlanGrid.tsx:274` | `const grid = buildHouseholdGrid(scheduleSlots)` — `buildHouseholdGrid` is the household-aware equivalent of `buildGrid` (D-04 precedence-aware) |
| useMemo wrapping | `src/components/plan/PlanGrid.tsx:272-285` | yes |

**Status:** PASS (criterion text unchanged; satisfied transitively by criterion #1's amendment)

---

### Unchanged Criterion #4

> **SlotCards display the correct coloured dot when a schedule row exists for that day/slot; prep shows no dot.**

| Evidence | Source | Result |
|---|---|---|
| Dot JSX present on occupied SlotCard | `src/components/plan/SlotCard.tsx:110-124` | conditional `<span>` rendered when `scheduleStatus && scheduleStatus !== 'prep'` |
| Dot JSX present on empty SlotCard | `src/components/plan/SlotCard.tsx:287-301` | conditional `<span>` rendered when `scheduleStatus && scheduleStatus !== 'prep'` |
| Colour mapping consume → bg-accent | both branches | `scheduleStatus === 'consume' ? 'bg-accent'` |
| Colour mapping quick → bg-amber-500 | both branches | `scheduleStatus === 'quick' ? 'bg-amber-500'` |
| Colour mapping away → bg-red-500 | both branches | `: 'bg-red-500'` (default after consume + quick) |
| Prep renders no dot | both branches | `scheduleStatus !== 'prep'` short-circuit + `buildHouseholdGrid` drops prep entirely from the source map |
| Test locks the bg-red-500 paint | `tests/PlanGrid.schedule.test.tsx` Test 2 | "renders a single member away dot with bg-red-500 + aria-label 'Schedule: away'" — passes |
| Test locks the prep-drop | `tests/PlanGrid.schedule.test.tsx` Test 5 | "drops prep entirely — two prep rows on the same (day, slot) render no dot" — passes |
| Test locks the empty-schedule no-op | `tests/PlanGrid.schedule.test.tsx` Test 9 | "renders no Schedule:* dots when mockScheduleRows is empty" — passes |

**Status:** PASS

---

### Unchanged Criterion #5

> **Test covers PlanGrid → DayCard prop forwarding so this regression cannot silently recur.**

| Evidence | Source | Result |
|---|---|---|
| Test file exists | `tests/PlanGrid.schedule.test.tsx` | FOUND (322 lines) |
| 9 it() blocks | `grep -c "^  it(" tests/PlanGrid.schedule.test.tsx` | 9 |
| All 9 pass | `npx vitest run tests/PlanGrid.schedule.test.tsx` | `Tests: 9 passed (9)` |
| Locks the import (`useHouseholdSchedules`) | Test 1 | passes |
| Locks the precedence rule (D-04) | Test 3 | passes |
| Locks the tooltip format (D-07) | Test 4 | passes (asserts exact `"Away: Dad. Quick: Sam. Consume: Kayla."`) |
| Locks the prep-drop | Test 5 | passes |
| Locks the day-of-week key (D-10) | Test 6 | passes (positive Tuesday + negative Monday, within()-scoped) |
| Locks the Snack→Snacks normalisation (D-09) | Test 7 | passes |
| Locks the UUID fallback | Test 8 | passes |
| Locks the empty-schedule no-op | Test 9 | passes |
| Future regression of any of these surfaces → test fails | — | by construction; tested by the 9 it() blocks |

**Status:** PASS

---

## Restoration Half — Phase 21-02 Visual Baseline

| Phase 21-02 Artifact | Phase 27 Equivalent | Match |
|---|---|---|
| Occupied dot JSX size 12px (`w-3 h-3`) | `src/components/plan/SlotCard.tsx:112` | exact (`w-3 h-3 rounded-full align-middle`) |
| Empty dot JSX size 10px (`w-2.5 h-2.5`) | `src/components/plan/SlotCard.tsx:289` | exact (`w-2.5 h-2.5 rounded-full align-middle`) |
| `consume` → `bg-accent` (peach) | both branches | exact |
| `quick` → `bg-amber-500` | both branches | exact |
| `away` → `bg-red-500` | both branches | exact |
| `prep` → no dot | both branches + `buildHouseholdGrid` drops prep | exact |
| Inline placement after meal/slot name with `ml-1` (4px gap) | both branches | exact |
| `aria-label="Schedule: {status}"` | both branches | exact |
| `'Snack' → 'Snacks'` normalisation | `src/components/plan/PlanGrid.tsx:282 + 296` | exact (applied in BOTH the slotSchedulesByDay AND slotTooltipsByDay memos so a Snack-slot tooltip lands on the Snacks SlotCard) |

**Restoration verdict:** PASS. Phase 21-02's verified visual surface (`21-VERIFICATION.md` rubric) is restored byte-for-byte.

---

## Extension Half — Household-Holistic View

| Extension | Implementation | Coverage |
|---|---|---|
| Family-wide hook | `useHouseholdSchedules(householdId)` in `src/hooks/useSchedule.ts:81-94` | unit-tested via runtime call in `src/lib/queryKeys.test.ts` (T-27-02 closure); integration-tested via Test 1 of `tests/PlanGrid.schedule.test.tsx` |
| Precedence aggregation away > quick > consume > prep | `buildHouseholdGrid` in `src/utils/schedule.ts:37-48` | 10 unit tests in `src/utils/schedule.household.test.ts` (Plan 27-01) + integration Test 3 in `tests/PlanGrid.schedule.test.tsx` |
| Per-member tooltip ("Away: Dad. Quick: Sam. Consume: Kayla.") | `buildHouseholdTooltips` in `src/utils/schedule.ts:56-90` | unit-tested in `src/utils/schedule.household.test.ts` (Plan 27-01) + integration Test 4 in `tests/PlanGrid.schedule.test.tsx` (exact-string match) + Test 8 (UUID fallback for unknown members) |
| Day-of-week key `(weekStartDay + dayIndex) % 7` | `src/components/plan/PlanGrid.tsx:598-599` | locked by Test 6 (positive Tuesday + negative Monday with weekStartDay=1) |
| `useSchedule` retained for `ScheduleSection` per D-06a | `src/hooks/useSchedule.ts:8-27` byte-identical to pre-plan HEAD | verified by range-diff exit 0 in `27-01-SUMMARY.md` |
| User-visible outcome | rendered DOM contains coloured dot reflecting most-constraining household status per (day, slot) | proven by all 9 integration tests passing |

**Extension verdict:** PASS. Family-holistic semantics are present, aggregated correctly, and locked against regression.

---

## Phase 27 Plan-By-Plan Closure Map

| Plan | Provides | Verification |
|---|---|---|
| 27-01 | `queryKeys.schedule.{forMember, forHousehold, exceptionsForMember}` namespace; `useHouseholdSchedules(householdId)` hook; `buildHouseholdGrid` + `buildHouseholdTooltips` utilities | `src/lib/queryKeys.test.ts` 8/8 pass; `src/utils/schedule.household.test.ts` 10/10 pass; range-diff guard exit 0 |
| 27-02 | PlanGrid wired to `useHouseholdSchedules` with `slotSchedulesByDay` + `slotTooltipsByDay` memos; SlotCard occupied + empty dot JSX restored from `4eab9b7` / `cdf039b`; DayCard `slotTooltips` forwarding | 14-feature preservation loop exit 0; W4 import-dedupe guard count = 1; `npx vite build` exit 0; full tests/ suite zero new regressions |
| 27-03 | `tests/PlanGrid.schedule.test.tsx` 9-it regression test; ROADMAP §Phase 27 criteria #1 + #3 amended in place per D-08 / D-10 | this file; `tests/PlanGrid.schedule.test.tsx` 9/9 pass; `git diff .planning/ROADMAP.md` scope = §Phase 27 only |

---

## Outstanding / Deferred

- **12 pre-existing test failures** in `tests/theme.test.ts`, `tests/auth.test.ts`, `tests/AuthContext.test.tsx`, `tests/guide.test.ts` — unchanged from Plan 01 baseline; logged in `.planning/phases/27-wire-schedule-badges-to-plangrid/deferred-items.md`. Out of scope per execute-plan SCOPE BOUNDARY rule. Should be addressed in a dedicated test-infrastructure-repair phase.
- **No other deferrals from Phase 27.** All in-scope behaviour verified.

---

## Phase 27 Final Verdict

**PASS — CRIT-02 closed and locked.**

- All 5 ROADMAP §Phase 27 success criteria satisfied (criteria #1 and #3 in their D-08 / D-10 amended form).
- Both the restoration half (Phase 21-02 visual baseline) and the extension half (household-holistic precedence + per-member tooltip) are verified end-to-end.
- The regression-test gate (`tests/PlanGrid.schedule.test.tsx`) prevents silent recurrence of the Phase 22 worktree-truncation pattern (L-020 / L-027) on this surface.
- Zero new regressions in the existing test suite; zero production-code changes in Plan 27-03.
- ROADMAP audit trail intact via inline "Amended in Phase 27 planning per D-XX" markers; no other phase touched.

SCHED-01 and SCHED-02 visibility slice is **closed**.

---

*Phase: 27-wire-schedule-badges-to-plangrid*
*Verification authored: 2026-04-21*
