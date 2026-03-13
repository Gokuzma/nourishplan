---
phase: 03-meal-planning-targets
plan: "05"
subsystem: ui
tags: [react, tanstack-query, supabase, tailwind, meal-plan, templates, navigation]

# Dependency graph
requires:
  - phase: 03-meal-planning-targets/03-04
    provides: useMealPlan, useCreateMealPlan, PlanGrid, PlanPage scaffold
  - phase: 03-meal-planning-targets/03-02
    provides: useMeals, Meal types
  - phase: 03-meal-planning-targets/03-01
    provides: MealPlanTemplate, MealPlanTemplateSlot DB types
provides:
  - useTemplates hook — query household templates
  - useSaveAsTemplate hook — insert template + copy plan slots
  - useLoadTemplate hook — upsert template slots into existing plan
  - useDeleteTemplate hook — delete template (cascade slots)
  - useRepeatLastWeek hook — copy previous week slots into current plan
  - NewWeekPrompt component — modal with fresh/repeat/template options
  - TemplateManager component — save/load template UI with confirmation
  - Updated TabBar — Home/Foods/Recipes/Meals/Plan (5 tabs)
  - Updated Sidebar — adds Meals, Plan no longer comingSoon
  - MemberList — Set Targets links to /members/:id/targets
affects:
  - Phase 04 offline sync (template and plan slot data)
  - Phase 05 PWA (plan page is primary entry)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Template slots copied via upsert on (plan_id,day_index,slot_name) — idempotent load
    - NewWeekPrompt rendered as overlay when plan === null (after planPending resolves)
    - TemplateManager as inline section above PlanGrid — conditional on plan existence
    - Set Targets links use member.user_id for auth users, profile.id for managed profiles

key-files:
  created:
    - src/hooks/useMealPlanTemplates.ts
    - src/components/plan/NewWeekPrompt.tsx
    - src/components/plan/TemplateManager.tsx
  modified:
    - src/pages/PlanPage.tsx
    - src/components/layout/TabBar.tsx
    - src/components/layout/Sidebar.tsx
    - src/components/household/MemberList.tsx
    - tests/AppShell.test.tsx

key-decisions:
  - "useRepeatLastWeek gracefully returns when no previous plan exists — no error thrown"
  - "NewWeekPrompt shown as fixed overlay (not replacing content) — plan row creation causes re-render and prompt disappears"
  - "TemplateManager uses separate save/load modals — confirmation step for load prevents accidental overwrites"
  - "Set Targets links added to MemberList (not HouseholdPage directly) — member rows are rendered there"
  - "TabBar tests updated to match new nav: Meals+Plan replace Household+Settings on mobile"

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 3 Plan 5: Templates, New Week Prompt, and Nav Wiring Summary

**Template save/load hooks, NewWeekPrompt modal with three initialization options, TemplateManager UI, and full Phase 3 navigation wiring completing the meal planning lifecycle**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T21:38:36Z
- **Completed:** 2026-03-13T21:41:41Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Five TanStack Query hooks for template CRUD and week-repeat operations (useTemplates, useSaveAsTemplate, useLoadTemplate, useDeleteTemplate, useRepeatLastWeek)
- NewWeekPrompt modal with fresh/repeat/template branches — plan row creation closes the modal via query invalidation
- TemplateManager inline section with save-as-template (name input modal) and load-template (list + confirmation modal)
- TabBar updated: Home/Foods/Recipes/Meals/Plan — 5 mobile-first tabs
- Sidebar updated: Meals entry added, Plan comingSoon removed — fully navigable on desktop
- MemberList: "Set Targets" links on every auth member and managed profile row

## Task Commits

1. **Task 1: Template hooks and NewWeekPrompt/TemplateManager** - `9e9871a` (feat)
2. **Task 2: Nav wiring, PlanPage integration, MemberList targets links** - `9be2451` (feat)

## Files Created/Modified
- `src/hooks/useMealPlanTemplates.ts` - All template and repeat-week TanStack Query hooks
- `src/components/plan/NewWeekPrompt.tsx` - New week initialization modal (3 options)
- `src/components/plan/TemplateManager.tsx` - Save/load template UI with confirmation
- `src/pages/PlanPage.tsx` - Integrated NewWeekPrompt + TemplateManager; handles all choice callbacks
- `src/components/layout/TabBar.tsx` - 5-tab mobile nav: Home/Foods/Recipes/Meals/Plan
- `src/components/layout/Sidebar.tsx` - Added Meals, removed comingSoon from Plan
- `src/components/household/MemberList.tsx` - Set Targets links for auth users and managed profiles
- `tests/AppShell.test.tsx` - Updated to match new nav structure

## Decisions Made
- NewWeekPrompt as fixed overlay: plan row creation triggers TanStack Query invalidation → plan data returns non-null → prompt unmounts naturally
- useRepeatLastWeek returns silently when no previous plan exists — no error, user gets empty plan
- TemplateManager confirmation step: "This will replace your current plan for all 7 days" shown before load executes
- Set Targets links added in MemberList.tsx (not HouseholdPage directly) since member rows are rendered there

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated AppShell tests for new navigation structure**
- **Found during:** Task 2 verification (npm test)
- **Issue:** Two tests in AppShell.test.tsx expected old nav: Household+Settings in TabBar, and Plan with aria-disabled="true" in Sidebar
- **Fix:** Updated test assertions to expect new nav (Meals+Plan in TabBar, 7 items in Sidebar, Plan link without aria-disabled)
- **Files modified:** tests/AppShell.test.tsx
- **Commit:** 9be2451

## Issues Encountered
None beyond the test update above.

## User Setup Required
None — all changes are frontend only; uses existing DB tables (meal_plan_templates, meal_plan_template_slots) from Plan 01 migrations.

## Next Phase Readiness
- All Phase 3 features are now discoverable via navigation
- Template and plan slot data ready for Phase 4 offline sync
- Plan page is the primary daily-use screen — ready for Phase 5 PWA installability work

---
*Phase: 03-meal-planning-targets*
*Completed: 2026-03-13*
