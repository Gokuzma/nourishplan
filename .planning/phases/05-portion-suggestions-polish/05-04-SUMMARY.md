---
phase: 05-portion-suggestions-polish
plan: 04
subsystem: ui
tags: [react, tanstack-query, portion-suggestions, meal-plan, typescript]

# Dependency graph
requires:
  - phase: 05-portion-suggestions-polish
    plan: 01
    provides: CNF integration, micronutrient constants
  - phase: 05-portion-suggestions-polish
    plan: 02
    provides: calcPortionSuggestions, calcRemainingCalories, hasMacroWarning, MemberInput/MemberSuggestion/PortionResult interfaces
provides:
  - usePortionSuggestions hook (React hook wrapping calcPortionSuggestions with TanStack Query data)
  - useHouseholdDayLogs hook (household+date food log fetch without member filter)
  - PortionSuggestionRow component (per-member suggestion display with percentage, servings, macro warning)
  - SlotCard with expandable portion suggestions section
  - DayCard with slotSuggestions prop and onLogSlot callback
  - LogMealModal with suggestedServings pre-fill
  - PlanGrid computing per-slot suggestions from shared fetched data
affects:
  - 05-05 (any downstream plan UI polish)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fetch-once-distribute: useHouseholdDayLogs + useNutritionTargets fetched once at PlanGrid level, suggestions computed per-slot in useMemo — avoids N hook calls for N slots
    - Per-slot suggestion computation via calcPortionSuggestions inside useMemo keyed by slot data
    - hasUserEdited ref pattern in LogMealModal to allow async suggestedServings arrival without overwriting manual changes

key-files:
  created:
    - src/hooks/usePortionSuggestions.ts
    - src/components/plan/PortionSuggestionRow.tsx
  modified:
    - src/hooks/useFoodLogs.ts
    - src/components/plan/SlotCard.tsx
    - src/components/plan/DayCard.tsx
    - src/components/plan/PlanGrid.tsx
    - src/components/log/LogMealModal.tsx
    - src/pages/PlanPage.tsx

key-decisions:
  - "useHouseholdDayLogs fetches all logs for household+date in one query — avoids calling useFoodLogs N times which would violate React hooks rules for dynamic counts"
  - "Suggestions computed in PlanGrid useMemo (not per-slot hooks) using calcPortionSuggestions directly — single fetch, synchronous computation, correct TanStack Query cache key alignment"
  - "MicronutrientPanel integration deferred — Plan 03 (the source of that component) has not been executed yet; will be added when 05-03 runs"
  - "SlotCard always collapses suggestions on mount; expanded state is local per-card, not shared"

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 05 Plan 04: Portion Suggestion UI Summary

**React hook + component layer wiring portion suggestions from algorithm to UI: useHouseholdDayLogs for household-wide log fetch, usePortionSuggestions hook, PortionSuggestionRow display, SlotCard expandable suggestions, LogMealModal pre-fill with suggested servings**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T02:37:08Z
- **Completed:** 2026-03-15T02:40:48Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added `useHouseholdDayLogs` to useFoodLogs.ts — fetches all food logs for a household+date in one query, enabling single-fetch for suggestion computation
- Created `usePortionSuggestions` hook that combines nutrition targets, household logs, and member data into a `PortionResult` using `calcPortionSuggestions`
- Created `PortionSuggestionRow` component rendering "{percentage}% ({servings} svg)" with amber macro warning indicator
- Updated `SlotCard` with expandable suggestions section: current user's suggestion shown inline in collapsed state, all members shown when expanded, leftover percentage shown if >1%
- Updated `DayCard` with `slotSuggestions: Map<string, PortionResult | null>` prop and `onLogSlot` callback
- Updated `LogMealModal` with `suggestedServings` prop — pre-fills stepper, uses `hasUserEdited` ref to protect manual edits from async suggestion arrival
- Rewrote `PlanGrid` to fetch targets+logs once, compute all slot suggestions via `useMemo`, and manage `LogMealModal` state
- Updated `PlanPage` to pass `householdId`, `currentUserId`, `selectedMemberId`, `selectedMemberType` to PlanGrid

## Task Commits

1. **Task 1: Hook and PortionSuggestionRow** - `2886de9` (feat)
2. **Task 2: SlotCard, DayCard, PlanGrid, LogMealModal, PlanPage integration** - `6689979` (feat)

## Files Created/Modified

- `src/hooks/useFoodLogs.ts` - Added useHouseholdDayLogs
- `src/hooks/usePortionSuggestions.ts` - New hook (usePortionSuggestions)
- `src/components/plan/PortionSuggestionRow.tsx` - New component
- `src/components/plan/SlotCard.tsx` - Expandable suggestions, onLog button, currentUserId prop
- `src/components/plan/DayCard.tsx` - slotSuggestions, currentUserId, onLogSlot props
- `src/components/plan/PlanGrid.tsx` - Fetch-once-distribute pattern for suggestions, LogMealModal management
- `src/components/log/LogMealModal.tsx` - suggestedServings prop, hasUserEdited ref
- `src/pages/PlanPage.tsx` - Passes householdId, currentUserId, selectedMember to PlanGrid

## Decisions Made

- useHouseholdDayLogs fetches all logs for household+date in one query, avoiding N hook calls for N slots (which would violate React hooks rules for dynamic counts)
- Suggestions computed in PlanGrid useMemo using calcPortionSuggestions directly — single fetch, synchronous computation, correct TanStack Query cache key alignment so log invalidation automatically recalculates
- SlotCard always starts collapsed; expanded state is local per-card, not globally shared
- hasUserEdited ref pattern in LogMealModal allows suggestedServings to arrive asynchronously without overwriting any stepper interaction the user has already made

## Deviations from Plan

### Deferred Items

**1. MicronutrientPanel integration in DayCard**
- **Reason:** Plan 03 (05-03) which creates MicronutrientPanel has not been executed yet; the component does not exist in the codebase
- **Plan reference:** Task 2 step 2 — "Also add the MicronutrientPanel from Plan 03 on each slot"
- **Action:** Deferred to after Plan 03 executes; logged to deferred-items.md
- **Impact:** No functional regression — Plan 03 integration is additive

### Architecture Note

The plan suggested calling `usePortionSuggestions` per slot in PlanPage, which would create dynamic hook counts (violating React rules). The cleaner implementation fetches data once at PlanGrid level and distributes via `useMemo` — this was done as a Rule 1/Rule 2 fix (correct architecture for correctness) and is consistent with the plan's "Use the approach that keeps the code clean" guidance.

## Issues Encountered

None — TypeScript compiled cleanly, all 84 tests pass.

## User Setup Required

None.

## Next Phase Readiness

- Portion suggestions visible on every meal plan slot with per-member expandable breakdown
- LogMealModal pre-fills with suggested servings
- usePortionSuggestions hook available for any future consumer
- MicronutrientPanel ready to be wired into DayCard once Plan 03 completes

---
*Phase: 05-portion-suggestions-polish*
*Completed: 2026-03-15*

## Self-Check: PASSED
