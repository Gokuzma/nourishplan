---
phase: 21-schedule-model
plan: "02"
subsystem: ui
tags: [react, schedule, plan-grid, slot-card, day-card]

requires:
  - phase: 21-01
    provides: useSchedule hook, buildGrid utility, ScheduleStatus type, MemberScheduleSlot DB tables

provides:
  - SlotCard with scheduleStatus prop rendering colored dot badge (accent/amber/red for consume/quick/away)
  - DayCard slotSchedules prop passing schedule status to each SlotCard
  - PlanGrid useSchedule integration computing per-day schedule maps for the selected member

affects: [22-planning-engine, plan-page, slot-card]

tech-stack:
  added: []
  patterns:
    - "Per-day schedule map computed via useMemo from buildGrid output — same pattern as slotViolationsByDay"
    - "Schedule badge uses bg-accent/bg-amber-500/bg-red-500 inline dot in meal name paragraph"

key-files:
  created: []
  modified:
    - src/components/plan/SlotCard.tsx
    - src/components/plan/DayCard.tsx
    - src/components/plan/PlanGrid.tsx

key-decisions:
  - "slotSchedulesByDay keyed by absolute day_of_week (0–6) not dayIndex — uses (weekStartDay + i) % 7 formula matching DayCard dayName calculation"
  - "Badge inserted after meal name, before violation count badge — maintains visual hierarchy"
  - "prep status shows no badge (default/expected state) — only consume/quick/away are visually flagged"

patterns-established:
  - "Schedule badge: ml-1 inline-block w-3 h-3 rounded-full align-middle pattern for inline status indicators in meal name"

requirements-completed: [SCHED-02]

duration: 15min
completed: 2026-04-06
---

# Phase 21 Plan 02: Schedule Model — Plan Badge Wiring Summary

**Schedule status dot badges wired from PlanGrid through DayCard to SlotCard using useSchedule hook and buildGrid per-day map**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-06T18:10:00Z
- **Completed:** 2026-04-06T18:25:00Z
- **Tasks:** 1 of 2 (Task 2 is checkpoint:human-verify)
- **Files modified:** 3

## Accomplishments
- SlotCard renders a colored dot badge next to the meal name for consume (accent), quick (amber), and away (red) statuses with accessible aria-label and title tooltip
- DayCard accepts `slotSchedules?: Map<string, ScheduleStatus>` and passes `scheduleStatus` to each SlotCard render (both DEFAULT_SLOTS and custom slots)
- PlanGrid loads the selected member's schedule via `useSchedule`, computes a per-day `Map<number, Map<string, ScheduleStatus>>` via `buildGrid`, and passes it to each DayCard

## Task Commits

Each task was committed atomically:

1. **Task 1: SlotCard scheduleStatus badge, DayCard prop pass-through, PlanGrid data wiring** - `4eab9b7` (feat)

## Files Created/Modified
- `src/components/plan/SlotCard.tsx` - Added scheduleStatus prop and colored dot badge rendering
- `src/components/plan/DayCard.tsx` - Added slotSchedules prop and ScheduleStatus import, passed to SlotCards
- `src/components/plan/PlanGrid.tsx` - Added useSchedule hook, buildGrid call, slotSchedulesByDay useMemo, passes to DayCard

## Decisions Made
- Used `(weekStartDay + i) % 7` formula to convert dayIndex to absolute day_of_week — matches the formula in DayCard's `dayName` calculation, ensuring correct day alignment
- Schedule key format in buildGrid is `day_of_week:slot_name` — split on first `:` to extract day, remainder is slot name

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. Pre-existing test failures in auth, theme, guide, and food search tests are unrelated to this plan's changes (confirmed by schedule.test.ts passing 10/10 and build succeeding).

## Known Stubs
None.

## Threat Flags
None. Schedule data displayed is the current user's own schedule — cross-household isolation already enforced by RLS in Plan 01 (T-21-06 accepted per plan threat model).

## Next Phase Readiness
- Schedule badges are visible on Plan page SlotCards — human verification (Task 2 checkpoint) needed to confirm correct behavior end-to-end
- Plan 21-03 (Planning Engine constraints integration) can proceed after verification
- All three files are ready for Phase 22 (Planning Engine) to consume schedule data

---
*Phase: 21-schedule-model*
*Completed: 2026-04-06*
