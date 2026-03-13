---
phase: 04-daily-logging-summary
plan: "04"
subsystem: ui
tags: [react, dashboard, food-logs, progress-rings, tanstack-query, tailwind]
dependency_graph:
  requires:
    - phase: 04-daily-logging-summary
      provides: useFoodLogs hooks, LogMealModal, FreeformLogModal, PortionStepper
    - phase: 03-meal-planning-targets
      provides: ProgressRing, MemberSelector, useMealPlan, useMealPlanSlots, useNutritionTarget
  provides:
    - Daily nutrition dashboard (HomePage)
    - LogEntryItem tappable row component
    - NutrientBreakdown collapsible micronutrient comparison
    - DailyLogList combined logged + planned slot list
  affects:
    - src/pages/HomePage.tsx
    - src/hooks/useHousehold.ts
tech_stack:
  added: []
  patterns:
    - EditLogModal defined in same file as HomePage (colocation) to avoid prop drilling
    - getDayIndex uses Date.UTC arithmetic on YYYY-MM-DD strings — no Date object construction
    - todayString uses UTC methods to produce consistent date strings across timezones
    - useDeleteFoodLog called in HomePage and passed as handleDeleteLog — not inside DailyLogList
key_files:
  created:
    - src/components/log/LogEntryItem.tsx
    - src/components/log/NutrientBreakdown.tsx
    - src/components/log/DailyLogList.tsx
  modified:
    - src/pages/HomePage.tsx
    - src/hooks/useHousehold.ts
decisions:
  - EditLogModal colocated in HomePage.tsx — keeps mutation hooks at the page level and avoids threading delete/update props through DailyLogList
  - getDayIndex computes day offset via Date.UTC millisecond arithmetic from YYYY-MM-DD strings — consistent with Phase 3 UTC decision
  - useHousehold select query extended to include week_start_day — was previously omitted, causing household week start setting to have no effect
metrics:
  duration_minutes: 4
  completed_date: "2026-03-13"
  tasks_completed: 2
  files_changed: 5
---

# Phase 4 Plan 04: Daily Dashboard Summary

**One-liner:** HomePage replaced with daily nutrition dashboard — progress rings for 4 macros, date navigation, member selector, logged entry list with edit/delete, unlogged plan slot cards, log-all-as-planned, freeform log, and collapsible micronutrient breakdown.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Create LogEntryItem, NutrientBreakdown, DailyLogList components | 440bfde | src/components/log/LogEntryItem.tsx, NutrientBreakdown.tsx, DailyLogList.tsx |
| 2 | Transform HomePage into daily dashboard | 89a6aec | src/pages/HomePage.tsx, src/hooks/useHousehold.ts |

## Decisions Made

1. **EditLogModal colocated in HomePage.tsx** — The edit/update/delete mutations naturally live at the page level. Defining the modal in the same file avoids threading `onUpdate`/`onDelete` props through `DailyLogList` → `LogEntryItem` while keeping the component tree clean.

2. **getDayIndex uses Date.UTC arithmetic on YYYY-MM-DD parts** — Splits the date string and computes millisecond offsets via `Date.UTC()`. This avoids constructing `Date` objects from YYYY-MM-DD strings (which would interpret them as UTC midnight but local timezone display could shift). Consistent with the Phase 3 UTC decision.

3. **week_start_day added to useHousehold select** — Bug fix: the Supabase query only selected `id, name, created_at` for the joined `households` row, meaning `week_start_day` was always `undefined`. The dashboard derives the week start from this value, so it was silently defaulting to Monday (1) regardless of household setting. Extended the select string to include `week_start_day`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing week_start_day in useHousehold select query**
- **Found during:** Task 2
- **Issue:** `useHousehold` select query omitted `week_start_day` from the joined `households` columns, so `membership?.households?.week_start_day` was always `undefined`. The dashboard used this value to derive `weekStart` for meal plan lookups, falling back to the hardcoded default (1 = Monday).
- **Fix:** Added `week_start_day` to the `.select()` string in `useHousehold.ts`
- **Files modified:** `src/hooks/useHousehold.ts`
- **Commit:** 89a6aec

## Verification Results

- TypeScript `tsc --noEmit`: no errors
- `npx vitest run`: 65 passed, 0 failures
- LogEntryItem: displays item name, servings, kcal total, lock icon when private, delete button
- NutrientBreakdown: default collapsed, chevron toggle, progress bars for micronutrients and custom goals, "Set targets" placeholder when no target data
- DailyLogList: logged entries sorted by created_at, unlogged plan slots with dashed border and "Tap to log" hint
- HomePage: 4 progress rings (sage/sky/amber/rose colors), date picker with formatted date label, MemberSelector, action buttons with online guard, EditLogModal with servings stepper + privacy toggle + delete

## Self-Check: PASSED
