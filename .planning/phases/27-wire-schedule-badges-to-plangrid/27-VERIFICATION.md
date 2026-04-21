---
phase: 27-wire-schedule-badges-to-plangrid
verified: 2026-04-20T21:21:43Z
status: passed
score: 5/5 must-haves verified (ROADMAP criteria #1-5 all PASS)
overrides_applied: 0
re_verification:
  previous_status: VERIFIED
  previous_score: 5/5 (authored by Plan 03 executor)
  audit_mode: independent-cross-check
  gaps_closed: []
  gaps_remaining: []
  regressions: []
  audit_result: concur
created: 2026-04-21
type: phase-closure-verification
rubric: goal-backward
audited: 2026-04-20T21:21:43Z
auditor: gsd-verifier (independent goal-backward audit, NOT Plan 03 executor)
---

# Phase 27 — Verification

**Goal-backward rubric.** Each ROADMAP §Phase 27 acceptance criterion (post-amendment per D-08 / D-10) is mapped to the concrete evidence (commits, files, grep results, test names) that satisfies it. The phase goal is restoration of Phase 21-02 schedule-badge behaviour PLUS extension to a household-holistic view; this rubric proves both halves.

> **Audit note (2026-04-20):** This VERIFICATION.md was originally authored by the Plan 03 executor in the same session as Plan 03's commit, so it is by-construction self-attesting. An independent goal-backward audit (gsd-verifier) re-derived each verdict from the codebase state on 2026-04-20 and **concurs** with the original verdict. The audit evidence and one caveat (UI-SPEC §5 assertion #2 grep-literalism, non-blocking) are appended in the final §Independent Audit section at the bottom of this file.

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
| Both render sites covered | `src/components/plan/PlanGrid.tsx` line 557-604 (`dayCards` array built once) → rendered at lines 684 (mobile DayCarousel branch) AND 716 (desktop stack branch) | One `<DayCard>` JSX shared between both render paths via the `dayCards` array; single textual prop insertion populates both render paths — consistent with existing `slotViolations=`, `slotFreezerFriendly=`, `slotSuggestions=` pattern |
| Day-of-week computed from `dayIndex` correctly | `src/components/plan/DayCard.tsx:111` | `const dayName = DAY_NAMES[(weekStartDay + dayIndex) % 7]` (matches the data-key formula exactly) |
| Test locks the day-of-week key | `tests/PlanGrid.schedule.test.tsx` Test 6 | "places the away dot inside the Tuesday DayCard, not the Monday DayCard, when weekStartDay=1" — positive Tuesday + negative Monday, within()-scoped, runs on BOTH mobile + desktop render copies — passes |
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
| All 9 pass | `npx vitest run tests/PlanGrid.schedule.test.tsx` | `Tests: 9 passed (9)` — independently re-run 2026-04-20 21:21:35, 1.17s |
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

## Independent Audit (gsd-verifier, 2026-04-20T21:21:43Z)

An independent goal-backward audit was performed AFTER the Plan 03 executor authored the original verification above. The auditor did NOT trust SUMMARY claims; each claim was re-derived from the current codebase, tests were re-run, and the ROADMAP criteria were cross-checked against REQUIREMENTS.md (SCHED-01, SCHED-02).

### Audit method

1. Re-read all three PLAN frontmatter must_haves + acceptance_criteria.
2. Cross-checked every must_have against the actual code in `src/lib/queryKeys.ts`, `src/hooks/useSchedule.ts`, `src/utils/schedule.ts`, `src/components/plan/PlanGrid.tsx`, `src/components/plan/DayCard.tsx`, `src/components/plan/SlotCard.tsx`.
3. Cross-checked each `tests/` file for structure + it-block count + exact assertion strings.
4. Re-ran the three Phase 27 test gates:
   ```
   npx vitest run tests/PlanGrid.schedule.test.tsx src/lib/queryKeys.test.ts src/utils/schedule.household.test.ts
   Test Files 3 passed (3)
        Tests 27 passed (27)
     Duration 1.17s
   ```
5. Re-ran the full test suite (`npx vitest run tests/`): 12 failed | 209 passed | 39 todo — identical to the Plan 03 baseline; the 12 failures are in the 4 deferred-items.md files (theme, auth, AuthContext, guide).
6. Re-ran `npx vite build`: exit 0, built in 393ms, PWA precache 12 entries, no errors.
7. Re-grep'd the UI-SPEC §5 anti-regression contract.

### Independent grep results (UI-SPEC §5 assertions)

| Assertion | Required | Actual | Verdict |
|---|---|---|---|
| `grep -q "useHouseholdSchedules" src/components/plan/PlanGrid.tsx` | exit 0 | matches (count=2) | PASS |
| `grep -c "slotSchedules={" src/components/plan/PlanGrid.tsx` | ≥ 2 | **1** | **Literalism mismatch — see note below** |
| `grep -c "scheduleStatus" src/components/plan/SlotCard.tsx` | ≥ 3 | 15 | PASS |
| `test -f tests/PlanGrid.schedule.test.tsx` | exit 0 | FOUND | PASS |
| `diff against 4eab9b7 / cdf039b` | semantic match | verbatim dot JSX restoration | PASS |

### Note on UI-SPEC §5 assertion #2 (grep literalism)

The UI-SPEC asserts `grep -c "slotSchedules={" src/components/plan/PlanGrid.tsx` returns ≥ 2, expecting the prop to appear at "both the mobile `DayCarousel` path and the desktop stack path". Actual count is **1**.

**This is NOT a gap.** PlanGrid uses a single `dayCards` array (line 557, built from `Array.from(...)` with ONE `<DayCard>` JSX expression at lines 569-602) that is rendered TWICE in the JSX tree — once inside `<DayCarousel>` at line 684 (mobile, `md:hidden`) and once inside `<div className="hidden md:flex flex-col gap-4">` at line 716 (desktop). One source-code prop insertion populates both DOM render paths.

This pattern is **consistent with all existing DayCard props** — `slotViolations={`, `slotFreezerFriendly={`, `slotSuggestions={` each appear exactly once in the source for the exact same reason. The UI-SPEC assertion was written without accounting for this architectural reality (Plan 02 SUMMARY §"Deviations from Plan" already self-documented this).

**The underlying intent of ROADMAP criterion #3** ("Both the mobile (DayCarousel) and desktop render sites pass `slotSchedules={...}` to each `DayCard`") is verified by:
1. The shared `dayCards` array is rendered in BOTH render-path branches (lines 684, 716).
2. The regression test `tests/PlanGrid.schedule.test.tsx` Tests 4, 6, 7, 8 each uses `getAllByLabelText(...)` / `getAllByText(...)` + loop explicitly because both render paths are in jsdom DOM, and every loop iteration asserts the expected behaviour — proving dots render correctly in BOTH paths.

**Verdict:** accept the grep literalism as a non-blocking spec-vs-implementation wording mismatch; the semantic contract is satisfied and regression-locked.

### Independent re-verification of truths from PLAN frontmatter

All must_haves from Plans 01, 02, 03 were re-checked against the codebase:

| Source | Must-have | Evidence | Verdict |
|---|---|---|---|
| 27-01 | `queryKeys.schedule` namespace with `forMember`, `forHousehold`, `exceptionsForMember` | `src/lib/queryKeys.ts:84-91` all three keys present | PASS |
| 27-01 | `useHouseholdSchedules(householdId)` returns MemberScheduleSlot[] with `enabled: !!householdId` | `src/hooks/useSchedule.ts:81-94` — hook present, household filter + enabled guard | PASS |
| 27-01 | `buildHouseholdGrid(rows)` applies precedence away > quick > consume > prep | `src/utils/schedule.ts:37-48` — uses `precedence()` + `STATUS_CYCLE.indexOf` | PASS |
| 27-01 | `buildHouseholdTooltips` format `'Away: Dad. Quick: Sam.'` with prep omitted + UUID fallback | `src/utils/schedule.ts:56-90` — DISPLAY_ORDER array enforces precedence, TITLE_CASE map excludes prep, `.slice(0,8)` fallback | PASS |
| 27-01 | Existing `useSchedule` + `useSaveSchedule` preserved byte-identical | `src/hooks/useSchedule.ts:8-27` + `:36-79` unchanged (Plan 01 SUMMARY range-diff exit 0) | PASS |
| 27-02 | PlanGrid calls `useHouseholdSchedules(householdId)` | `src/components/plan/PlanGrid.tsx:258` | PASS |
| 27-02 | `slotSchedulesByDay` + `slotTooltipsByDay` memoised as `Map<number, Map<string, ...>>` | `PlanGrid.tsx:272-299` | PASS |
| 27-02 | DayCard receives `slotSchedules` + `slotTooltips` keyed by `(weekStartDay + i) % 7` | `PlanGrid.tsx:598-599` | PASS |
| 27-02 | Snack → Snacks normalisation applied in both memos | `PlanGrid.tsx:282, 296` — two occurrences of `slotName === 'Snack' ? 'Snacks' : slotName` | PASS |
| 27-02 | SlotCard renders 12px dot on occupied + 10px dot on empty with colour mapping | `SlotCard.tsx:110-124 + 287-301` — both branches present with exact class tokens | PASS |
| 27-02 | All 21 existing DayCard props preserved | `PlanGrid.tsx:569-602` — all 21 canonical props + 2 new (slotSchedules, slotTooltips) present; all 14 PlanGrid features preserved per SUMMARY loop | PASS |
| 27-03 | `tests/PlanGrid.schedule.test.tsx` exists with 9 it-blocks | `tests/PlanGrid.schedule.test.tsx` — file exists, 9 `it(` blocks (lines 164, 181, 193, 210, 228, 239, 275, 300, 314) | PASS |
| 27-03 | Test covers precedence D-04 | Test 3 asserts away wins over quick + consume | PASS |
| 27-03 | Test covers day-of-week key D-10 with positive + negative within() scope | Test 6 uses `tueDayCard`/`monDayCard` with compound selector `[class*="rounded-"][class*="bg-surface"]` and asserts on every mobile+desktop render | PASS |
| 27-03 | Test covers Snack → Snacks D-09 | Test 7 (line 275) | PASS |
| 27-03 | Test asserts exact tooltip "Away: Dad. Quick: Sam. Consume: Kayla." | Test 4 line 221 — exact-string match | PASS |
| 27-03 | ROADMAP criterion #1 amended per D-08 | `ROADMAP.md:529` | PASS |
| 27-03 | ROADMAP criterion #3 amended per D-10 | `ROADMAP.md:531` | PASS |

### REQUIREMENTS.md traceability

| Requirement | Status | Evidence |
|---|---|---|
| SCHED-01 ("Each household member can set availability windows per day") — visibility slice | Satisfied (visibility) | `ScheduleSection` still writes rows (Phase 21); PlanGrid now surfaces all household rows via `useHouseholdSchedules` + family-holistic dot |
| SCHED-02 ("Plan generation respects member schedule constraints") — visibility slice | Satisfied (visibility) | Household-wide schedule is now visible on PlanGrid, which is the planned Phase 27 slice. The backend generation-logic use of schedule constraints is a separate concern tracked in REQUIREMENTS.md (Phase 21, Phase 27 gap closure). |

Both requirements are mapped to "Phase 21, Phase 27 (gap closure)" in REQUIREMENTS.md §traceability (lines 317-318). The Phase 27 slice is the UI-visibility slice (CRIT-02 closure), which is the documented and shipped scope. REQUIREMENTS.md still marks these "Pending" because the generation-respects-constraints side is upstream; that status is a REQUIREMENTS.md lifecycle concern, not a Phase 27 gap.

### Independent verdict

**CONCUR — Phase 27 PASS.**

- All 5 ROADMAP §Phase 27 success criteria independently re-verified against the codebase. Each has concrete code + test evidence.
- All Plan 01/02/03 must_haves independently verified.
- Test gates re-run end-to-end: 27/27 Phase-27-specific tests pass; 209/260 full suite passes (12 failures all in deferred-items.md files, 39 todo); build exit 0.
- The single UI-SPEC §5 grep-literalism discrepancy (`slotSchedules={` count = 1 instead of ≥ 2) is explained by the existing single-JSX-shared-array architecture and does NOT indicate a functional gap; the semantic contract (both render paths receive the prop) is satisfied via JSX reuse and regression-locked via test assertions on both mobile+desktop DOM copies.

### Human UAT recommendation (non-blocking)

The regression test in `tests/PlanGrid.schedule.test.tsx` is jsdom-only — it proves prop forwarding, aria-label rendering, title attribute content, and class tokens, but does NOT visually verify actual pixel colors, dot positioning, or hover behaviour in a real browser. This is acceptable because:

- Every dot property observable from the DOM is asserted (class tokens, aria-label, title attribute, presence/absence).
- The dot JSX is **verbatim** from commits `4eab9b7` + `cdf039b`, which were themselves verified in Phase 21-02's UAT.
- The colour tokens (`bg-accent`, `bg-amber-500`, `bg-red-500`) are Tailwind utility classes already used elsewhere in production.

**Recommended but not blocking:** A single human UAT pass at `/plan` in a real browser with a household that has at least 2 members with schedules would confirm the visual presentation (dot colours against the light/dark theme, `ml-1` spacing against the `violationCount` badge, native `title` tooltip hover behaviour in the user's actual browser). This is surfaced to the developer for awareness; it does not block Phase 27 closure since the regression-test contract is comprehensive.

---

*Phase: 27-wire-schedule-badges-to-plangrid*
*Verification authored: 2026-04-21 (Plan 03 executor)*
*Independent audit: 2026-04-20T21:21:43Z (gsd-verifier)*
*Audit verdict: CONCUR — PASS*
