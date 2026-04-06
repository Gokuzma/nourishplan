---
phase: 22-constraint-based-planning-engine
plan: 03
subsystem: ui-generation
tags: [react, tanstack-query, dnd-kit, tailwind, hooks, components]
dependency_graph:
  requires:
    - plan_generations table (22-01)
    - PlanGeneration TypeScript interface (22-01)
    - planGeneration query key factories (22-01)
    - calcWeeklyGaps utility (22-01)
    - generate-plan edge function (22-02)
  provides:
    - useGeneratePlan mutation hook
    - useGenerationJob polling hook
    - useLatestGeneration query hook
    - useSuggestAlternative mutation hook
    - useNutritionGaps hook
    - GeneratePlanButton component
    - PriorityOrderPanel component (dnd-kit/sortable)
    - GenerationProgressBar component
    - SlotShimmer component
    - AIRationaleTooltip component
    - NutritionGapCard component
    - RecipeSuggestionCard component
    - GenerationJobBadge component
    - Updated PlanGrid integrating all generation components
    - Updated SlotCard with rationale tooltip and suggest alternative
  affects:
    - src/components/plan/PlanGrid.tsx
    - src/components/plan/SlotCard.tsx
    - src/components/plan/DayCard.tsx
    - src/types/database.ts (ScheduleStatus types restored)
tech_stack:
  added: []
  patterns:
    - "Generation polling: useGenerationJob refetchInterval returns false on terminal status (done|timeout|error)"
    - "Priority order persisted in localStorage key plan-priority-order-{householdId}"
    - "AIRationaleTooltip: auto-dismiss after 5s on mobile, click-outside dismiss on desktop"
    - "NutritionGapCard: calories null = skip member entirely (incomplete target setup)"
key_files:
  created:
    - src/hooks/usePlanGeneration.ts
    - src/hooks/useNutritionGaps.ts
    - src/utils/nutritionGaps.ts
    - src/components/plan/GeneratePlanButton.tsx
    - src/components/plan/PriorityOrderPanel.tsx
    - src/components/plan/GenerationProgressBar.tsx
    - src/components/plan/SlotShimmer.tsx
    - src/components/plan/AIRationaleTooltip.tsx
    - src/components/plan/NutritionGapCard.tsx
    - src/components/plan/RecipeSuggestionCard.tsx
    - src/components/plan/GenerationJobBadge.tsx
  modified:
    - src/components/plan/PlanGrid.tsx
    - src/components/plan/SlotCard.tsx
    - src/components/plan/DayCard.tsx
    - src/types/database.ts
    - src/lib/queryKeys.ts
key-decisions:
  - "calcWeeklyGaps skips member entirely when calories is null — null calories = incomplete target setup, no analysis"
  - "RecipeSuggestionCard onAdd is stubbed with no-op — recipe creation flow is a separate feature outside Phase 22 scope"
  - "Generation shimmer uses whole-day placeholder cards rather than per-slot shimmer — avoids DayCard refactor complexity"
metrics:
  duration: 9min
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_changed: 15
---

# Phase 22 Plan 03: UI Hooks and Components Summary

**React generation UI: useGeneratePlan/useGenerationJob/useSuggestAlternative hooks wired to generate-plan edge function, plus 8 new components (GeneratePlanButton, PriorityOrderPanel, GenerationProgressBar, SlotShimmer, AIRationaleTooltip, NutritionGapCard, RecipeSuggestionCard, GenerationJobBadge) integrated into PlanGrid with shimmer states, AI rationale tooltips, and per-slot suggest alternative.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-06T19:59:25Z
- **Completed:** 2026-04-06T20:08:00Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Created `usePlanGeneration.ts` with 4 exported hooks: `useGeneratePlan` (mutation invoking generate-plan edge function), `useGenerationJob` (polling query with refetchInterval that stops on terminal status), `useLatestGeneration` (query for most recent generation), and `useSuggestAlternative` (single-slot regeneration mutation)
- Created `useNutritionGaps.ts` wrapping `calcWeeklyGaps` with member identity assembly from `useHouseholdMembers` + `useMemberProfiles`
- Created `nutritionGaps.ts` utility with `calcWeeklyGaps` function that returns per-member nutrient gaps below 90% threshold; skips members with null calorie targets
- Built all 8 new UI components per UI-SPEC: GeneratePlanButton (aria-busy, spinner), PriorityOrderPanel (dnd-kit/sortable, localStorage), GenerationProgressBar (role=progressbar, 4 steps), SlotShimmer (animate-pulse), AIRationaleTooltip (role=tooltip, 5s auto-dismiss), NutritionGapCard (collapsible, amber warning), RecipeSuggestionCard (primary/10 buttons), GenerationJobBadge (relative time)
- Updated PlanGrid to integrate all generation components: GeneratePlanButton triggers `useGeneratePlan`, progress bar advances every 3s during generation, slot shimmer renders for unlocked slots, NutritionGapCard shows after completion, RecipeSuggestionCard shows when recipe count <7
- Updated SlotCard to show AIRationaleTooltip on hover/tap for AI-generated slots, and expose "Suggest alternative" action button
- Updated DayCard to propagate `onSuggestAlternative` callback to SlotCard

## Task Commits

1. **Task 1: Hooks (usePlanGeneration, useNutritionGaps)** - `a28a39d` (feat) + `ab15f50` (fix: restore accidentally deleted files)
2. **Task 2: All UI components and PlanGrid/SlotCard integration** - `c221429` (feat)

## Files Created/Modified

- `src/hooks/usePlanGeneration.ts` - useGeneratePlan, useGenerationJob, useLatestGeneration, useSuggestAlternative
- `src/hooks/useNutritionGaps.ts` - useNutritionGaps wrapping calcWeeklyGaps
- `src/utils/nutritionGaps.ts` - calcWeeklyGaps pure utility, MemberIdentity, WeeklyGap interfaces
- `src/components/plan/GeneratePlanButton.tsx` - CTA button with idle/loading/complete states
- `src/components/plan/PriorityOrderPanel.tsx` - dnd-kit/sortable reorder with localStorage
- `src/components/plan/GenerationProgressBar.tsx` - 4-step progress with role=progressbar
- `src/components/plan/SlotShimmer.tsx` - animate-pulse skeleton for unlocked slots
- `src/components/plan/AIRationaleTooltip.tsx` - role=tooltip with click-outside and 5s auto-dismiss
- `src/components/plan/NutritionGapCard.tsx` - collapsible per-member gap panel
- `src/components/plan/RecipeSuggestionCard.tsx` - AI recipe suggestions for small catalogs
- `src/components/plan/GenerationJobBadge.tsx` - relative time badge "Generated N min ago"
- `src/components/plan/PlanGrid.tsx` - integration of all generation components
- `src/components/plan/SlotCard.tsx` - generation_rationale tooltip + Suggest alternative
- `src/components/plan/DayCard.tsx` - onSuggestAlternative prop propagation
- `src/types/database.ts` - PlanGeneration type, is_locked/generation_rationale on MealPlanSlot, ScheduleStatus types, planGeneration in Database type
- `src/lib/queryKeys.ts` - planGeneration query key factories

## Decisions Made

- calcWeeklyGaps skips member entirely when calories is null — null calories indicates incomplete target setup, no gap analysis makes sense
- RecipeSuggestionCard onAdd is a no-op stub — recipe creation from AI suggestions requires a separate recipe-add flow outside Phase 22 scope
- Generation shimmer renders whole-day placeholder sections during generation to avoid deeply threading shimmer state through DayCard per-slot rendering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 01 artifacts not in this worktree's base commit**
- **Found during:** Task 1 start
- **Issue:** `src/utils/nutritionGaps.ts`, `PlanGeneration` type in `database.ts`, and `planGeneration` query keys were not present — Plan 01 ran in a separate worktree and the base commit `131f95a` lacked these additions despite merging Plan 02
- **Fix:** Created `nutritionGaps.ts`, added `PlanGeneration` type and updated `MealPlanSlot` in `database.ts`, added `planGeneration` to `queryKeys.ts`, restored `ScheduleStatus`/`MemberScheduleSlot` types missing from Phase 21
- **Files modified:** `src/types/database.ts`, `src/lib/queryKeys.ts`, `src/utils/nutritionGaps.ts`
- **Commit:** a28a39d

**2. [Rule 3 - Blocking] `git reset --soft` caused unintended file deletions on commit**
- **Found during:** Task 1 commit
- **Issue:** The branch base check reset committed the working tree's staged deletions (planning docs, schedule files) along with the intended new files
- **Fix:** Used `git checkout <base> -- <files>` to restore all accidentally deleted files from the base commit
- **Commit:** ab15f50

**3. [Rule 1 - Bug] `calcWeeklyGaps` failed test: null calories should skip member entirely**
- **Found during:** Task 2 verification
- **Issue:** Test 3 in nutritionGaps.test.ts expected 0 gaps for a member with `calories: null` but my implementation only skipped the calories nutrient, returning 3 gaps for protein/fat/carbs
- **Fix:** Added guard in `calcWeeklyGaps` — if `target.calories` is null/0, skip the member entirely
- **Files modified:** `src/utils/nutritionGaps.ts`

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `onAdd={() => {}}` | `src/components/plan/PlanGrid.tsx` | ~607 | RecipeSuggestionCard "Add to my recipes" requires a recipe creation flow outside Phase 22 scope; AI-suggested recipes need to be turned into full Recipe objects which is a complex UX flow |

## Threat Flags

No new threat surface introduced. All AI-generated text (rationale, recipe suggestions) is rendered via React JSX (auto-escaped), mitigating T-22-06 and T-22-07 from the plan's threat model.

## Self-Check: PASSED

- [x] `src/hooks/usePlanGeneration.ts` exists and exports all 4 hooks
- [x] `src/hooks/useNutritionGaps.ts` exists
- [x] `src/utils/nutritionGaps.ts` exists with calcWeeklyGaps
- [x] All 8 new components exist in `src/components/plan/`
- [x] Commit a28a39d exists
- [x] Commit ab15f50 exists
- [x] Commit c221429 exists
- [x] `npx vite build` exits 0 — no type errors
- [x] `npx vitest run` — 197 passing, 12 failing (all 12 in pre-existing failing test files)
- [x] All acceptance criteria patterns present in files
