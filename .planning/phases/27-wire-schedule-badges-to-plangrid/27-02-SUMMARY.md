---
phase: 27-wire-schedule-badges-to-plangrid
plan: 02
subsystem: ui
tags: [plan-grid, schedule, ui, regression-restore, household-aggregation, slot-card]

requires:
  - phase: 27-wire-schedule-badges-to-plangrid
    provides: "useHouseholdSchedules(householdId) hook + buildHouseholdGrid + buildHouseholdTooltips utilities (Plan 27-01); queryKeys.schedule.forHousehold cache key (Plan 27-01)"
  - phase: 21-schedule-model
    provides: "ScheduleStatus union, MemberScheduleSlot row shape, member_schedule_slots table + RLS"
provides:
  - "PlanGrid.tsx wired to useHouseholdSchedules — calls hook with (householdId) only, builds slotSchedulesByDay + slotTooltipsByDay via useMemo with Snack→Snacks normalisation and (weekStartDay + i) % 7 day-of-week key"
  - "DayCard.tsx forwards slotTooltips Map<string, string> to both default-slot and custom-slot SlotCard render sites alongside existing slotSchedules forwarding"
  - "SlotCard.tsx renders coloured dot inline (12px occupied / 10px empty) when scheduleStatus is non-prep; dot title uses scheduleTooltip when provided, falls back to Phase 21 literal otherwise"
  - "User-facing outcome: opening /plan in a browser shows coloured dots on every SlotCard where any household member has a non-prep schedule for that (day, slot); dot colour wins by precedence away > quick > consume > prep per Plan 01 buildHouseholdGrid"
affects: [27-03 (regression test asserts this wiring), any future plan that adds more slot-row visual indicators]

tech-stack:
  added: []
  patterns:
    - "Cherry-pick-then-adapt restore protocol (D-01, L-027): SlotCard dot JSX restored verbatim from 4eab9b7 (occupied) + cdf039b (empty); only the prop names + tooltip override added on top"
    - "Surgical Edit-only edits across three files; never used Write tool on existing files >200 lines (per L-027 guidance)"
    - "Import-line extension over duplicate import (W4 dedupe): existing `import type { NutritionTarget, Meal, MealItem } from '../../types/database'` extended in-place to add `ScheduleStatus` rather than creating a second import line — exactly 1 `from '../../types/database'` line in PlanGrid.tsx after edit"
    - "Day-of-week vs plan-relative key separation: schedule data is keyed by day-of-week `(weekStartDay + i) % 7` per D-10; existing slotViolationsByDay keeps using plan-relative `i` (it is built per-plan, not per-week-of-year). Two parallel keying schemes coexist on the same DayCard render."
    - "Memoised aggregation isolation: scheduleSlots → buildHouseholdGrid → byDay restructure happens in a single useMemo with `[scheduleSlots]` dep array; tooltip memo depends additionally on `memberNameById` so name changes refresh tooltips without re-running grid aggregation"

key-files:
  created:
    - ".planning/phases/27-wire-schedule-badges-to-plangrid/27-02-SUMMARY.md"
  modified:
    - "src/components/plan/SlotCard.tsx (+36 / -3 = +33 net; dot JSX in occupied + empty branches, scheduleTooltip prop)"
    - "src/components/plan/DayCard.tsx (+4 / -0 = +4 net; slotTooltips prop + destructure + 2 forwards — purely additive)"
    - "src/components/plan/PlanGrid.tsx (+47 / -1 = +46 net; useHouseholdSchedules import/call, two memos, two new <DayCard> props, types/database import extended)"

key-decisions:
  - "D-01 / D-07 Option B honored: kept scheduleStatus as-is, added parallel scheduleTooltip?: string prop on SlotCard. Both dots use scheduleTooltip when provided, fall back to Phase 21 literal when absent — zero-regression on empty-household case."
  - "D-09 honored: Snack→Snacks normalisation lives in PlanGrid memo (not in src/utils/schedule.ts) — closer to the DayCard consumer that uses DEFAULT_SLOTS, matches cdf039b baseline. Applied in BOTH the slotSchedulesByDay and slotTooltipsByDay memos so a Snack-slot tooltip lands on the Snacks SlotCard."
  - "D-10 honored: day-of-week key `(weekStartDay + i) % 7` used on the new <DayCard> props — not the plan-relative `i` used by slotViolationsByDay (which is correct for violations because they are computed per-plan). The two keying schemes coexist on the same DayCard render line."
  - "W4 dedupe (anti-regression): extended existing `import type { NutritionTarget, Meal, MealItem } from '../../types/database'` in place to add `ScheduleStatus` rather than creating a second import line. Verified `grep -c \"from '../../types/database'\" src/components/plan/PlanGrid.tsx` returns exactly 1 post-edit."
  - "L-020 / L-027 discipline: ran the runnable 14-feature preservation loop after edits; all 14 features (DndContext, useGeneratePlan, useNutritionGaps, useSuggestAlternative, SlotShimmer, BatchPrepButton, PriorityOrderPanel, RecipeMixPanel, NutritionGapCard, RecipeSuggestionCard, DragOverlay, LogMealModal, slotViolationsByDay, dayFreezerFriendly) preserved at HEAD count or higher. All 21 existing DayCard props from CONTEXT.md §canonical_refs still passed. Diff stats prove additivity: 87 insertions, 4 deletions across all three files (deletions = 3 planned destructure replacements in SlotCard + 1 planned import-line extension in PlanGrid)."

patterns-established:
  - "Parallel tooltip-prop pattern for SlotCard family-view: primary status remains a tight ScheduleStatus union; rich text rides alongside as scheduleTooltip?: string. Future per-member visual signals can follow the same shape — typed-status + optional pre-built tooltip — without widening the SlotCard interface for every variant."
  - "Day-of-week key `(weekStartDay + i) % 7` is now load-bearing in PlanGrid for any household-week-of-year-keyed Map. New phase-spanning state (e.g. exceptions, holiday markers) should use the same shifted key, not the raw plan-relative `i` used by slotViolationsByDay."

requirements-completed: []  # SCHED-01 + SCHED-02 are 2/3 fulfilled (visibility primitives in 27-01 + UI wiring here in 27-02). Final closure happens in Plan 27-03 once the regression test ships and ROADMAP §Phase 27 criteria #1/#3 are amended.

metrics:
  duration: "~4 min"
  completed: "2026-04-21"
  tasks: 2
  commits: 2
  lines_changed:
    "src/components/plan/SlotCard.tsx": "+36 / -3 (net +33)"
    "src/components/plan/DayCard.tsx":  "+4 / -0 (net +4)"
    "src/components/plan/PlanGrid.tsx": "+47 / -1 (net +46)"
---

# Phase 27 Plan 02: Wire useHouseholdSchedules into PlanGrid + Restore SlotCard Dot Wiring Summary

**Cherry-picked the Phase 21-02 schedule-dot UI back into PlanGrid using Plan 01's household-holistic primitives — 12px peach/amber/red dots on occupied SlotCards and 10px dots on empty SlotCards now render whenever any household member has a non-prep schedule for that (day, slot), with the most-constraining status winning per D-04 precedence and the family-view tooltip ("Away: Dad. Quick: Sam.") flowing from PlanGrid through DayCard down to the dot's `title` attribute.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-21T00:57:00Z
- **Completed:** 2026-04-21T01:01:00Z
- **Tasks:** 2 (Task 1 SlotCard, Task 2 DayCard + PlanGrid)
- **Commits:** 2 (1 per task, both `feat(27-02): ...`)
- **Files modified:** 3 (`SlotCard.tsx`, `DayCard.tsx`, `PlanGrid.tsx`)
- **Files created:** 1 (`.planning/phases/27-wire-schedule-badges-to-plangrid/27-02-SUMMARY.md`)
- **Lines added:** 87 across the three source files
- **Lines deleted:** 4 across the three source files (all planned: 3 destructure replacements in SlotCard + 1 import-line extension in PlanGrid)

## Accomplishments

- **CRIT-02 user-facing fix shipped.** Opening `/plan` now renders coloured dots on every SlotCard where any household member has a non-prep schedule for that (day, slot). The Phase 21-02 visual surface is fully restored on top of the Plan 01 household-holistic data layer; this is the user-facing close of the v2.0 audit blocker.
- **D-07 family tooltip wired end-to-end.** PlanGrid builds a `Map<number, Map<string, string>>` of tooltips like `"Away: Dad. Quick: Sam."` via `buildHouseholdTooltips(scheduleSlots, memberNameById)`, threads it through DayCard's new `slotTooltips` prop, lands it on SlotCard's new `scheduleTooltip` prop, and renders it via the dot's `title` attribute. Falls back to the Phase 21 literal when absent (zero-regression on empty-household case).
- **L-020 / L-027 discipline held under fire.** The runnable 14-feature preservation loop exits 0 — every feature in PlanGrid (DnD, generation hooks, swap suggestions, batch prep, priority panel, recipe mix, nutrition gap, recipe suggestion, drag overlay, log modal, shimmer, etc.) is still present at HEAD count or higher. All 21 existing DayCard props from CONTEXT.md §canonical_refs are still passed verbatim. No regressions in the existing tests/ suite (12 pre-existing failures from Plan 01 deferred-items.md are unchanged).
- **W4 import-dedupe guard held.** Extended the existing `import type { NutritionTarget, Meal, MealItem } from '../../types/database'` in place rather than creating a duplicate import line. `grep -c "from '../../types/database'" src/components/plan/PlanGrid.tsx` = exactly 1.
- **D-09 / D-10 normalisation applied in both memos.** Snack → Snacks rewrite happens in BOTH the `slotSchedulesByDay` and `slotTooltipsByDay` memos (so a Snack-slot tooltip lands on the Snacks SlotCard, not on a phantom Snack key). Day-of-week key `(weekStartDay + i) % 7` used on both new `<DayCard>` props — distinct from the plan-relative `i` used by `slotViolationsByDay` (correct because violations are per-plan, not per-week-of-year).

## Task Commits

1. **Task 1: Cherry-pick dot JSX into SlotCard (occupied + empty branches) + add scheduleTooltip prop** — `b84ed11` (feat)
2. **Task 2: Plumb slotTooltips through DayCard + wire PlanGrid useHouseholdSchedules aggregation** — `eade152` (feat)

## Files Created/Modified

- **`src/components/plan/SlotCard.tsx`** (+36 / -3 = net +33)
  - Added `scheduleTooltip?: string` to `SlotCardProps` interface (line 33).
  - Extended `OccupiedSlotCard` destructure (line 54) to pull in `scheduleStatus` + `scheduleTooltip` — destructure goes from 16 params to 18.
  - Inserted occupied-slot 12px dot JSX between meal name and violation badge (`ml-1`, `w-3 h-3`) per UI-SPEC §Badge stacking order.
  - Replaced `{ slotName, slot, onAssign }` empty-branch destructure with `{ slotName, slot, onAssign, scheduleStatus, scheduleTooltip }`.
  - Replaced bare `<span className="text-sm text-text/50 font-sans">{slotName}</span>` with a container that holds slot name + optional 10px dot (`ml-1`, `w-2.5 h-2.5`).
  - Both dots: title prefers `scheduleTooltip`, falls back to the Phase 21 literal — zero-regression on empty-household case.
  - The 3 deletions are exactly the planned ones: (a) destructure-line replacement at line 53, (b) destructure-line replacement at line 280, (c) `<span>{slotName}</span>` swap at line 282. No L-020 contamination.

- **`src/components/plan/DayCard.tsx`** (+4 / -0 = net +4 — purely additive)
  - Added `slotTooltips?: Map<string, string>` to `DayCardProps` interface (after existing `slotSchedules`).
  - Added `slotTooltips` to the destructure block.
  - Forwarded `scheduleTooltip={slotTooltips?.get(slotName) ?? undefined}` to the default-slot `<SlotCard>` render.
  - Forwarded `scheduleTooltip={slotTooltips?.get(s.slot_name) ?? undefined}` to the custom-slot `<SlotCard>` render.
  - No deletions, no other props touched. Existing `(weekStartDay + dayIndex) % 7` day-of-week computation at line 109 left untouched (already correct per D-10).

- **`src/components/plan/PlanGrid.tsx`** (+47 / -1 = net +46)
  - Extended existing `import type { NutritionTarget, Meal, MealItem } from '../../types/database'` to add `ScheduleStatus` (the single -1 line — replaced with the longer version of itself; W4 dedupe).
  - Added two new imports near existing hook/util imports:
    - `import { useHouseholdSchedules } from '../../hooks/useSchedule'`
    - `import { buildHouseholdGrid, buildHouseholdTooltips } from '../../utils/schedule'`
  - Added `const { data: scheduleSlots } = useHouseholdSchedules(householdId)` next to the other household-scoped hooks.
  - Added `memberNameById` useMemo that builds a `Map<string, string>` from `useHouseholdMembers` (with `profiles?.display_name ?? user_id.slice(0, 8)` fallback) + `useMemberProfiles` (with `display_name ?? id.slice(0, 8)` fallback) — matches the existing `memberInputs` UUID-slice pattern at line 491 verbatim.
  - Added `slotSchedulesByDay` useMemo that runs `buildHouseholdGrid(scheduleSlots)` and restructures to `Map<number, Map<string, ScheduleStatus>>` keyed by day-of-week, applying the `'Snack' === slotName ? 'Snacks' : slotName` normalisation per D-09.
  - Added `slotTooltipsByDay` useMemo with the same restructure-and-normalise pattern over `buildHouseholdTooltips(scheduleSlots, memberNameById)`.
  - Inserted two new props on the existing single `<DayCard>` JSX (line 596 area), between `slotViolations={slotViolationsByDay?.get(i)}` and `slotFreezerFriendly={dayFreezerFriendly}`:
    - `slotSchedules={slotSchedulesByDay?.get((weekStartDay + i) % 7)}`
    - `slotTooltips={slotTooltipsByDay?.get((weekStartDay + i) % 7)}`
  - Note: PlanGrid renders one shared `<DayCard>` JSX inside `dayCards = Array.from(...)` that feeds both the mobile DayCarousel path (~line 657) and the desktop stack path (~line 689), so a single textual prop insertion populates both render paths. This satisfies the amended ROADMAP §Phase 27 criterion #3 (visibility assertion about the rendered output, not a source-code count).

## Verification Results

### Diff stats (additive change)

```
$ git diff --stat b84ed11~1 eade152 -- src/components/plan/{SlotCard,DayCard,PlanGrid}.tsx
 src/components/plan/DayCard.tsx  |  4 ++++
 src/components/plan/PlanGrid.tsx | 48 +++++++++++++++++++++++++++++++++++++++-
 src/components/plan/SlotCard.tsx | 39 +++++++++++++++++++++++++++++---
 3 files changed, 87 insertions(+), 4 deletions(-)
```

87 insertions, 4 deletions. The 4 deletions are all planned: 3 destructure replacements in SlotCard + 1 import-line extension in PlanGrid. No L-020 contamination.

### 14-feature preservation loop (L-020 / L-027 anti-regression — exits 0)

```
=== 14-feature preservation loop ===
OK: DndContext pre=5 post=5
OK: useGeneratePlan pre=2 post=2
OK: useNutritionGaps pre=2 post=2
OK: useSuggestAlternative pre=2 post=2
OK: SlotShimmer pre=3 post=3
OK: BatchPrepButton pre=2 post=2
OK: PriorityOrderPanel pre=2 post=2
OK: RecipeMixPanel pre=2 post=2
OK: NutritionGapCard pre=3 post=3
OK: RecipeSuggestionCard pre=2 post=2
OK: DragOverlay pre=3 post=3
OK: LogMealModal pre=2 post=2
OK: slotViolationsByDay pre=3 post=3
OK: dayFreezerFriendly pre=3 post=3
OK: all 14 features preserved
```

Every one of the 14 canonical features is at the same grep count post-edit as pre-edit. Zero regressions in feature surface.

### W4 duplicate-import guard

```
$ grep -c "from '../../types/database'" src/components/plan/PlanGrid.tsx
1
```

Exactly 1. The existing import line was extended in place rather than duplicated. No second import line was created.

### 21-prop DayCard preservation (CONTEXT.md §canonical_refs)

| Prop | Count | | Prop | Count |
|---|---|---|---|---|
| dayIndex= | 1 | | onSuggestAlternative= | 1 |
| weekStart= | 2* | | pendingDropSlotKey= | 1 |
| weekStartDay= | 1 | | onDropSwap= | 1 |
| slots= | 1 | | onDropReplace= | 1 |
| memberTarget= | 1 | | onDropCancel= | 1 |
| currentUserId= | 1 | | slotViolations= | 1 |
| slotSuggestions= | 1 | | slotFreezerFriendly= | 1 |
| onAssignSlot= | 1 | | onCookSlot= | 1 |
| onClearSlot= | 1 | | key= | 8** |
| onSwapSlot= | 1 | | **+ slotSchedules=** (new) | 1 |
| onLogSlot= | 1 | | **+ slotTooltips=** (new) | 1 |
| onToggleLock= | 1 | | | |

\* `weekStart=` count of 2 includes the prop usage + a string concat reference for `weekStartDate = new Date(weekStart + 'T00:00:00Z')`. \*\* `key=` count of 8 includes shimmer-loop keys.

All 21 props from CONTEXT.md §canonical_refs preserved. Two new props added: `slotSchedules` and `slotTooltips`.

### Acceptance grep checks (all thresholds met)

| Check | Threshold | Result | Pass |
|---|---|---|---|
| `grep -c "scheduleStatus" src/components/plan/SlotCard.tsx` | ≥ 4 | 15 | ✓ |
| `grep -c "scheduleTooltip" src/components/plan/SlotCard.tsx` | ≥ 4 | 5 | ✓ |
| `grep -cE "bg-accent\|bg-amber-500\|bg-red-500" src/components/plan/SlotCard.tsx` | ≥ 3 | 8 | ✓ |
| `grep -c "w-3 h-3 rounded-full align-middle" src/components/plan/SlotCard.tsx` | ≥ 1 | 1 | ✓ |
| `grep -c "w-2.5 h-2.5 rounded-full align-middle" src/components/plan/SlotCard.tsx` | ≥ 1 | 1 | ✓ |
| `grep -c 'aria-label={\`Schedule:' src/components/plan/SlotCard.tsx` | ≥ 2 | 2 | ✓ |
| `grep -c "useHouseholdSchedules" src/components/plan/PlanGrid.tsx` | ≥ 2 | 2 | ✓ |
| `grep -c "slotSchedules" src/components/plan/PlanGrid.tsx` | ≥ 2 | 2 | ✓ |
| `grep -c "slotTooltipsByDay" src/components/plan/PlanGrid.tsx` | ≥ 2 | 2 | ✓ |
| `grep -F "slotSchedulesByDay?.get((weekStartDay + i) % 7)" src/components/plan/PlanGrid.tsx` | matches | 1 match | ✓ |
| `grep -cF "slotName === 'Snack' ? 'Snacks' : slotName" src/components/plan/PlanGrid.tsx` | == 2 | 2 | ✓ |
| `grep -c "buildHouseholdGrid" src/components/plan/PlanGrid.tsx` | ≥ 2 | 2 | ✓ |
| `grep -c "buildHouseholdTooltips" src/components/plan/PlanGrid.tsx` | ≥ 2 | 2 | ✓ |
| `grep -c "from '../../types/database'" src/components/plan/PlanGrid.tsx` | == 1 | 1 | ✓ (W4 guard) |
| `grep -c "slotTooltips" src/components/plan/DayCard.tsx` | ≥ 4 | 4 | ✓ |
| `grep -c "scheduleTooltip" src/components/plan/DayCard.tsx` | ≥ 2 | 2 | ✓ |

**Note on `slotSchedulesByDay` count.** Plan-stated threshold was ≥ 3 expecting "memo decl + prop usage + dep array / return", but my dep array is `[scheduleSlots]` (correctly — depending on `slotSchedulesByDay` would be incorrect React semantics). Actual count is 2 (declaration line + prop attribute). The functional shape is correct: declaration + DayCard prop. The load-bearing UI-SPEC §5 anti-regression contract is satisfied via the `slotSchedules` umbrella check (count = 2 ≥ 2 threshold). PATTERNS.md §PlanGrid "Prop forwarding" anticipated exactly this when it said "counts the prop and the memo variable name, so threshold holds."

### Build + tests

```
$ npx vite build
✓ built in 393ms
PWA v1.2.0 — precache 12 entries (1353.37 KiB)
EXIT: 0
```

```
$ npx tsc --noEmit 2>&1 | grep -iE "planGrid|dayCard|slotCard"
(no output — zero new errors in the three touched files)
```

```
$ npx vitest run tests/
Test Files   4 failed | 21 passed | 5 skipped (30)
     Tests   12 failed | 200 passed | 39 todo (251)
```

12 failed / 200 passed — **identical to Plan 01's recorded baseline.** All 12 failures live in 4 files NOT touched by Plan 27-02 (theme.test.ts, auth.test.ts, AuthContext.test.tsx, guide.test.ts) and are the same pre-existing failures logged in `.planning/phases/27-wire-schedule-badges-to-plangrid/deferred-items.md`. **Zero new regressions** introduced by Plan 02.

## Decisions Made

- **Extended `types/database` import in place rather than adding a second line** (W4 dedupe). The existing `import type { NutritionTarget, Meal, MealItem } from '../../types/database'` was extended to `import type { NutritionTarget, Meal, MealItem, ScheduleStatus } from '../../types/database'` — this is the canonical TypeScript import-grouping convention and the plan explicitly required exactly 1 import line from that module post-edit.
- **Placed the two new useMemo blocks immediately after `useHouseholdMembers` + `useMemberProfiles`** rather than near `useNutritionTargets` higher up. Reason: the `slotTooltipsByDay` memo depends on `memberNameById`, which depends on the household + profile hooks. Placing the memos directly after their data sources keeps the cause-effect chain readable top-to-bottom. The plan suggested "near the existing household-scoped hooks cluster" — both placements satisfy that; the chosen placement minimises mental jumps for future readers.
- **Single `<DayCard>` JSX block reused for both mobile and desktop render paths** (per existing PlanGrid architecture). Did NOT inline the JSX twice — the existing `dayCards = Array.from(...)` builds an array of JSX nodes that is rendered inline at both the mobile (`DayCarousel`) and desktop stack sites. One textual prop insertion populates both render paths. This satisfies the visibility-asserting amended ROADMAP §Phase 27 criterion #3 without doubling the source-code surface area or risking divergence.
- **Kept the SlotCard prop interface as `scheduleStatus + scheduleTooltip`** (D-07 Option B) rather than widening to a richer object shape (`{ aggregate; byMember: [...] }`). Two-prop sibling pattern is simpler, has zero impact on the existing SlotCard prop typing surface for callers that don't care about the tooltip, and matches the exact shape the planner pre-flagged as "simpler, recommended" in PATTERNS.md.

## Deviations from Plan

None — plan executed exactly as written. All four surgical changes in Task 1 and all 5 sub-steps in Task 2 landed verbatim from the plan's `<action>` blocks.

The single notable threshold mismatch (`grep -c "slotSchedulesByDay"` returning 2 instead of the plan's stated ≥ 3) is documented in the verification table above — it reflects a planner-overcount, not an implementation gap. The functional contract (declaration + DayCard prop wiring with day-of-week key) is satisfied; the load-bearing UI-SPEC §5 anti-regression count threshold (`slotSchedules` ≥ 2) passes cleanly.

### Authentication gates

None — no external service calls fired during execution. `useHouseholdSchedules` is a pure local hook call that runs against TanStack Query cache (no network in test/build context).

### Out-of-scope discoveries

None new. The 12 pre-existing test failures noted in Plan 01's deferred-items.md remain unchanged — they are out of scope per execute-plan SCOPE BOUNDARY rule.

## Issues Encountered

None — all four edit operations on each of the three files landed first-try via the `Edit` tool. Diff inspection after each task confirmed zero unrelated truncations (L-020 / L-024 discipline). The 14-feature preservation loop returned `OK: all 14 features preserved` on the first run.

## Self-Check: PASSED

- **Files created:**
  - `.planning/phases/27-wire-schedule-badges-to-plangrid/27-02-SUMMARY.md` — FOUND (this file)
- **Files modified (all 3):**
  - `src/components/plan/SlotCard.tsx` — scheduleTooltip prop at line 33; OccupiedSlotCard destructure at line 53 includes scheduleStatus + scheduleTooltip; occupied dot JSX at lines 110-123; empty-branch destructure at line 280 includes scheduleStatus + scheduleTooltip; empty dot JSX at lines 286-299
  - `src/components/plan/DayCard.tsx` — slotTooltips prop in interface (line 75); destructured (line 102); forwarded to default-slot SlotCard (line 174); forwarded to custom-slot SlotCard (line 210)
  - `src/components/plan/PlanGrid.tsx` — useHouseholdSchedules + buildHouseholdGrid + buildHouseholdTooltips imports (lines 21-22); ScheduleStatus added to existing types/database import (line 42); useHouseholdSchedules call (line 258); memberNameById memo (lines 260-270); slotSchedulesByDay memo (lines 272-285); slotTooltipsByDay memo (lines 287-299); slotSchedules + slotTooltips props on <DayCard> (lines 597-598)
- **Commits exist:**
  - `b84ed11` feat(27-02): cherry-pick schedule dot JSX into SlotCard occupied + empty branches — FOUND
  - `eade152` feat(27-02): wire useHouseholdSchedules into PlanGrid + plumb slotTooltips through DayCard — FOUND
- **14-feature preservation loop:** OK on all 14 (exit 0)
- **W4 import-dedupe guard:** count = 1 (exit 0)
- **`npx vite build`:** exit 0 (built in 393ms)
- **`npx tsc --noEmit` for the three touched files:** zero new errors
- **Existing tests/ suite:** 12 failed / 200 passed (identical to Plan 01 baseline — zero new regressions)

## Hand-off to Plan 03

Plan 03 should add `tests/PlanGrid.schedule.test.tsx` per CONTEXT.md D-12 + PATTERNS.md "tests/PlanGrid.schedule.test.tsx — CREATE" section. Specifically:

- **Mock `../src/hooks/useSchedule`** so `useHouseholdSchedules` returns 2-3 `MemberScheduleSlot` rows with conflicting statuses on the same (day, slot) — e.g. `{ A: away, B: quick, C: consume }` on Monday Dinner.
- **Render PlanGrid** via the dynamic-import + `MemoryRouter` + `QueryClientProvider` helper pattern from `tests/PlanGrid.shimmer.test.tsx` lines 98-124.
- **Assert** `screen.getByLabelText('Schedule: away')` is rendered for the highest-precedence status (`away` wins over `quick` over `consume`); assert that `bg-red-500` class is on the resolved dot. This is the narrow prop-forwarding regression guard that would have caught the Phase 22 truncation that birthed CRIT-02.
- **Precedence test:** `{ A: away, B: quick, C: consume }` on the same (day, slot) → red dot, NOT amber or peach (D-04).
- **`weekStartDay !== 0` test:** render with `weekStartDay: 1` and a row with `day_of_week: 2` (Tuesday) → that dot must appear on the **second** visible day column, not the third (D-10). This tests the `(weekStartDay + i) % 7` wiring landed in this plan.
- **Snack → Snacks test:** row with `slot_name: 'Snack'` surfaces as a dot on the `Snacks` SlotCard (D-09). This tests the normalisation in both memos landed in this plan.
- **Family tooltip test:** assert the dot's `title` attribute is the precedence-ordered `"Away: A. Quick: B. Consume: C."` string from `buildHouseholdTooltips`, not the Phase 21 literal fallback.

Plan 03 should also amend ROADMAP.md §Phase 27 acceptance criteria #1 and #3 per D-08 / D-10:
- Criterion #1 → "PlanGrid.tsx imports `useHouseholdSchedules` from `../../hooks/useSchedule` and calls it with `(householdId)`; the returned rows are aggregated into a `Map<number, Map<string, ScheduleStatus>>` using the precedence rule `away > quick > consume > prep`, memoised via `useMemo`."
- Criterion #3 → "Both the mobile (DayCarousel) and desktop render sites pass `slotSchedules={slotSchedulesByDay?.get((weekStartDay + dayIndex) % 7)}` to each `DayCard` (day-of-week key, not plan-relative day index)."

L-001 reminder for Plan 03: clean `.claude/worktrees/agent-*` before running `npx vitest run tests/PlanGrid.schedule.test.tsx`.

## Threat Flags

None — Plan 27-02 introduced no new network endpoints, no new auth paths, no file access patterns, and no schema changes. The single new SELECT (`useHouseholdSchedules`) was already shipped + RLS-mitigated in Plan 01 (T-27-01). T-27-06 (XSS via tooltip) is mitigated by React auto-escaping `title` attribute values; `buildHouseholdTooltips` composes only member display names + Title-Case literals + punctuation, never raw HTML. T-27-07 (DoS via unknown status) is mitigated by the SlotCard switch defaulting to `bg-red-500` for any non-`consume` / non-`quick` non-`prep` value plus the wrapping `scheduleStatus && scheduleStatus !== 'prep'` short-circuit. All `<threat_model>` register entries from the plan are honored as written.

---
*Phase: 27-wire-schedule-badges-to-plangrid*
*Plan: 02*
*Completed: 2026-04-21*
