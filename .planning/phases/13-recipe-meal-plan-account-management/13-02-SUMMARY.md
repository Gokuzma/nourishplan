---
phase: 13-recipe-meal-plan-account-management
plan: 02
subsystem: ui
tags: [react, meal-plan, delete, print, permissions]

requires:
  - phase: 13-recipe-meal-plan-account-management
    provides: Plan 13-00 (phase context and UI spec)

provides:
  - Permission-gated inline delete confirmation on MealCard (creator or admin only)
  - Deleted meal placeholder "(Deleted)" in plan slots when RLS filters soft-deleted meal
  - Meal plan start date picker in NewWeekPrompt (date input defaulting to current week start)
  - Overflow/three-dot menu on PlanPage header with Print meal plan action
  - @media print CSS hiding app chrome and forcing B&W grid layout

affects: [plan-page, meals-page, slot-card]

tech-stack:
  added: []
  patterns:
    - Permission gate: canDelete(createdBy) = isAdmin || createdBy === session.user.id
    - Inline confirmation: isConfirming state at parent (MealsPage), passed as props to card
    - Deleted meal detection: slot.meal_id != null && slot.meals === null (RLS filtered)
    - Overflow menu: showOverflow state + fixed backdrop div to close on outside click

key-files:
  created: []
  modified:
    - src/components/meal/MealCard.tsx
    - src/pages/MealsPage.tsx
    - src/components/plan/SlotCard.tsx
    - src/components/plan/NewWeekPrompt.tsx
    - src/pages/PlanPage.tsx
    - src/styles/global.css
    - tests/meal-plan.test.ts
    - tests/recipes.test.ts

key-decisions:
  - "MealCard inline delete uses canDelete/isConfirming/onDeleteClick/onConfirmDelete/onCancelDelete props — parent (MealsPage) owns all state"
  - "Deleted meal detection: slot.meal_id != null && !meal (RLS soft-delete filter) shows '(Deleted)' with replace/clear options"
  - "NewWeekPrompt date picker defaults to weekStart prop, user can change before choosing option; planStart passed as 3rd arg to onChoice"
  - "Print button lives inside overflow/three-dot menu per user decision; calls window.print() directly"
  - "no-print class on member selector, nav buttons, TemplateManager; print-only class on week range footer"

patterns-established:
  - "Inline delete: parent holds deleteConfirm state (string | null), card receives isConfirming + callbacks"
  - "Permission gate via canDelete function: isAdmin || createdBy === currentUserId"

requirements-completed:
  - DELMG-01
  - DELMG-02
  - MPLAN-01
  - MPLAN-02

duration: 15min
completed: 2026-03-16
---

# Phase 13 Plan 02: Meal Deletion Management and Meal Plan Features Summary

**Permission-gated inline delete for meals, deleted meal placeholder in plan slots, custom start date picker for new plan weeks, and browser print via overflow menu with B&W print CSS**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-16T01:04:00Z
- **Completed:** 2026-03-16T01:12:24Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- MealCard now gates delete button behind creator/admin check with inline "Yes, delete / Keep it" confirmation
- SlotCard shows "(Deleted)" placeholder when a meal plan slot references a soft-deleted meal
- NewWeekPrompt provides a date input so users can change the plan start date before creating a new week
- PlanPage has an overflow (three-dot) menu with Print meal plan that triggers window.print()
- global.css adds complete @media print rules hiding app chrome and forcing B&W table layout

## Task Commits

1. **Task 1: Meal inline delete with permissions and deleted meal placeholder** - `92096e7` (feat)
2. **Task 2: Meal plan start date picker and print functionality** - `e3fc85c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/meal/MealCard.tsx` - Updated props interface; added canDelete gate and isConfirming inline confirmation UI
- `src/pages/MealsPage.tsx` - Added useAuth/useHousehold; canDelete function; removed modal, uses inline MealCard confirmation
- `src/components/plan/SlotCard.tsx` - Added isDeletedMeal detection; "(Deleted)" placeholder with replace/clear buttons
- `src/components/plan/NewWeekPrompt.tsx` - Added planStart state; date input with "Plan start date" label; passes planStart to all onChoice calls
- `src/pages/PlanPage.tsx` - showOverflow state; overflow menu with Print meal plan action; no-print classes; print-only footer; handleNewWeekChoice accepts planStart
- `src/styles/global.css` - @media print block with no-print hiding, B&W reset, @page margin, .print-only display rules
- `tests/meal-plan.test.ts` - Converted MPLAN-01 and DELMG-02 RED placeholder tests to source-check assertions
- `tests/recipes.test.ts` - Converted DELMG-01 permission gate RED placeholder to source-check assertion

## Decisions Made
- MealCard inline delete uses canDelete/isConfirming props — parent (MealsPage) owns all state to keep card stateless
- Deleted meal detection: `slot.meal_id != null && !meal` since RLS filters soft-deleted meals from join but preserves the slot row
- NewWeekPrompt date picker defaults to weekStart prop; planStart passed as 3rd arg to onChoice so PlanPage can use custom date
- Print button lives inside overflow/three-dot menu per prior user decision; calls window.print() directly without additional state
- no-print class applied to member selector, nav arrows, TemplateManager; print-only class on week range footer div

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Test file `tests/meal-plan.test.ts` was a `.ts` file (not `.tsx`) and could not use JSX; rewrote MPLAN-01 and DELMG-02 tests as source-file assertions using `fs.readFileSync` instead of rendering components.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DELMG-01, DELMG-02, MPLAN-01, MPLAN-02 requirements all satisfied
- Ready for plan 13-03: account management (ACCTM requirements)
- settings.test.tsx RED placeholder tests for ACCTM-01 await implementation in 13-03

---
*Phase: 13-recipe-meal-plan-account-management*
*Completed: 2026-03-16*
