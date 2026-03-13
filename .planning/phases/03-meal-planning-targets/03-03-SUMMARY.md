---
phase: 03-meal-planning-targets
plan: 03
subsystem: nutrition-targets
tags: [react, tanstack-query, supabase, tailwind, nutrition, targets]

requires:
  - phase: 03-meal-planning-targets
    plan: 01
    provides: "NutritionTarget type, buildTargetUpsertPayload, TARGET_PRESETS, nutrition_targets table with RLS"

provides:
  - "useNutritionTargets(householdId): query all household nutrition targets"
  - "useNutritionTarget(householdId, memberId, memberType): query single member target with maybeSingle"
  - "useUpsertNutritionTargets(): upsert mutation with dual onConflict paths"
  - "NutritionTargetsForm: preset selector, calorie/macro inputs, expandable micronutrients and custom goals"
  - "MemberTargetsPage: /members/:id/targets route for per-member target management"

affects:
  - 03-04 (meal plan grid: reads nutrition_targets for progress rings)

tech-stack:
  added: []
  patterns:
    - "useNutritionTarget uses maybeSingle() to return null gracefully when no target set yet"
    - "useUpsertNutritionTargets passes memberId separately from upsert payload for cache invalidation"
    - "NutritionTargetsForm controls expansion via local useState toggle (no library)"
    - "MemberTargetsPage resolves memberType by checking householdMembers first, then memberProfiles"

key-files:
  created:
    - src/hooks/useNutritionTargets.ts
    - src/components/targets/NutritionTargetsForm.tsx
    - src/pages/MemberTargetsPage.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "useUpsertNutritionTargets accepts memberId as a separate param (not part of buildTargetUpsertPayload) — needed for cache invalidation key after upsert"
  - "NutritionTargetsForm initializes with DEFAULT_MICROS keys pre-rendered — avoids blank form for first-time users unfamiliar with micronutrient names"
  - "MemberTargetsPage resolves memberType dynamically from hooks — avoids encoding type in the URL which would break bookmarked links if member type changes"

metrics:
  duration: 2min
  completed: 2026-03-13
  tasks: 2
  files: 4
---

# Phase 3 Plan 03: Nutrition Targets UI Summary

**Per-member nutrition targets with TanStack Query hooks, preset selector, expandable micronutrient and custom goals sections, and MemberTargetsPage at /members/:id/targets**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-13T21:28:54Z
- **Completed:** 2026-03-13T21:30:48Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Three hooks exported from useNutritionTargets.ts: useNutritionTargets (all household targets), useNutritionTarget (single member via user_id or member_profile_id), useUpsertNutritionTargets (upsert with dual onConflict column paths)
- NutritionTargetsForm provides preset template selector, four macro inputs, expandable micronutrients section with 5 defaults + add-custom, expandable custom goals section with add/remove rows, and inline "Saved" indicator
- MemberTargetsPage resolves member name and type from existing household hooks; enforces canEdit for admin or self-edit; back button to /household
- Route `/members/:id/targets` added inside AppShell block in App.tsx
- All 58 existing tests pass; TypeScript compiles with no errors

## Task Commits

1. **Task 1: Nutrition targets hook** - `e650ee8` (feat)
2. **Task 2: NutritionTargetsForm, MemberTargetsPage, and route** - `775cf21` (feat)

## Files Created/Modified

- `src/hooks/useNutritionTargets.ts` - Three query/mutation hooks for nutrition_targets table
- `src/components/targets/NutritionTargetsForm.tsx` - Full form with presets, macros, micros, custom goals
- `src/pages/MemberTargetsPage.tsx` - Route component for /members/:id/targets
- `src/App.tsx` - Added /members/:id/targets route inside AppShell

## Decisions Made

- **memberId as separate mutation param:** buildTargetUpsertPayload builds the DB payload (without memberId), but the mutation needs memberId separately to correctly invalidate the `['nutrition-target', householdId, memberId]` cache key after upsert completes.
- **DEFAULT_MICROS always rendered:** Five standard micronutrient fields (fiber, sodium, calcium, iron, vitamin C) are always shown in the expanded section rather than waiting for user to add them — reduces friction for first-time setup.
- **memberType resolved from hooks at page level:** Checking `householdMembers` first (auth users) then `memberProfiles` (managed profiles) to determine memberType avoids encoding the type in the URL, keeping bookmarked links valid.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- useNutritionTargets and useNutritionTarget hooks ready for Plan 04 meal plan grid to read progress data
- MemberTargetsPage accessible; HouseholdPage can link to /members/:id/targets when Plan 04 wires up the full member list
