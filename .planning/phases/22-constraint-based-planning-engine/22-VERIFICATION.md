---
phase: 22-constraint-based-planning-engine
verified: 2026-04-06T20:50:49Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Plan page highlights nutrition gaps per member after generation and offers swap suggestions to close them"
    status: partial
    reason: "NutritionGapCard component has swap suggestion UI (SwapSuggestion interface, onApplySwap handler, swap button rendering) but PlanGrid calls it without swapSuggestions or onApplySwap props. Swap suggestions are never computed or passed — gaps are shown but no swap actions are offered."
    artifacts:
      - path: "src/components/plan/PlanGrid.tsx"
        issue: "Line 598: <NutritionGapCard gaps={gaps} /> — swapSuggestions and onApplySwap are not passed; swap suggestion data is never computed"
      - path: "src/components/plan/NutritionGapCard.tsx"
        issue: "Component API ready (swapSuggestions, onApplySwap props defined) but not wired from PlanGrid"
    missing:
      - "Compute SwapSuggestion[] from latestGeneration or meal plan data and pass as swapSuggestions to NutritionGapCard"
      - "Wire onApplySwap in PlanGrid to call useAssignSlot with the suggested recipe for the given slot"
human_verification:
  - test: "Trigger plan generation and verify end-to-end in browser"
    expected: "Generate Plan button triggers generation, shimmer appears on unlocked slots, generated meals appear after completion, locked slot is preserved, AI rationale tooltip appears on tap/hover of generated slot"
    why_human: "End-to-end generation requires live Supabase edge function + Anthropic API call — cannot verify programmatically without running the full stack"
  - test: "Verify nutrition gap card appears and content is accurate"
    expected: "After generation completes, if any member has a macro below 90% of their weekly target, the NutritionGapCard appears below the plan grid showing the member name, nutrient, and deficit amount"
    why_human: "Requires live household with nutrition targets set and a completed generation run"
  - test: "Verify locked slot is visually correct during generation"
    expected: "Locked slots should render their slot content (not shimmer), unlocked slots should shimmer. Currently the locked-slot branch renders dayCards[i] (the entire day card) rather than the individual locked slot card — verify this does not cause a visible render defect"
    why_human: "Visual rendering defect in the locked slot shimmer branch (line 554-555 and 571-572 of PlanGrid.tsx) — needs browser verification to confirm impact"
---

# Phase 22: Constraint-Based Planning Engine Verification Report

**Phase Goal:** The app can generate a complete weekly meal plan optimised across nutrition targets, household budget, member schedules, dietary restrictions, and recipe preference signals — without blocking the UI
**Verified:** 2026-04-06T20:50:49Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User triggers plan generation; the UI returns immediately with a status indicator while the plan is generated asynchronously | ✓ VERIFIED | `GeneratePlanButton` + `GenerationProgressBar` wired in PlanGrid; `useGeneratePlan` mutation + `useGenerationJob` polling with `refetchInterval` stopping on terminal status; edge function returns jobId synchronously |
| 2 | Generated plan respects all household dietary restrictions and won't-eat lists — no flagged ingredients appear in any slot | ✓ VERIFIED | Edge function queries `dietary_restrictions` and `wont_eat_entries` as hard constraints in both shortlist and assign prompts; AI ID validation filters AI-returned recipe IDs against household catalog before DB writes |
| 3 | Generated plan skips locked slots (Phase 19) and only fills unlocked slots | ✓ VERIFIED | Edge function filters `is_locked` slots from `slotsToFill`; PlanGrid preserves locked slot rendering during shimmer state |
| 4 | Plan page highlights nutrition gaps per member after generation and offers swap suggestions to close them | ✗ FAILED | `NutritionGapCard` shows gaps (VERIFIED) but swap suggestions UI is not wired — `swapSuggestions` prop defaults to `[]` and `onApplySwap` is not passed from PlanGrid |
| 5 | Recipes already in inventory are weighted higher in recipe selection — ingredients the household has are preferred | ✓ VERIFIED | Edge function fetches `inventory_items` in parallel constraint assembly; passes `inventoryNames` to both shortlist and assign AI prompts with explicit instruction "prefer recipes using ingredients the household already has in inventory" |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/026_plan_generations.sql` | plan_generations table + RLS + generation_rationale column | ✓ VERIFIED | CREATE TABLE, ENABLE ROW LEVEL SECURITY, get_user_household_id() SELECT + INSERT policies, ALTER TABLE meal_plan_slots ADD COLUMN generation_rationale |
| `src/types/database.ts` | PlanGeneration interface, updated MealPlanSlot | ✓ VERIFIED | `export interface PlanGeneration`, `is_locked: boolean`, `generation_rationale: string \| null` on MealPlanSlot |
| `src/lib/queryKeys.ts` | planGeneration query key factory | ✓ VERIFIED | `planGeneration:` namespace with `job()` and `latest()` factories at line 90 |
| `src/utils/nutritionGaps.ts` | calcWeeklyGaps, WeeklyGap, MemberIdentity | ✓ VERIFIED | All three exports present, `DEFAULT_THRESHOLD = 0.9`, pure function with no Supabase imports |
| `src/utils/__tests__/nutritionGaps.test.ts` | Unit tests (6+) | ✓ VERIFIED | 51 test statement lines (well over 6 test cases) |
| `supabase/functions/generate-plan/index.ts` | AI planning edge function | ✓ VERIFIED | serve(), CORS_HEADERS, ANTHROPIC_API_KEY, api.anthropic.com/v1/messages, claude-haiku-4-5, claude-sonnet-4-5, plan_generations, meal_plan_slots, generation_rationale, hasTimeLeft() at 6000ms, rate limit check, household_members auth, is_locked, wont_eat_entries, dietary_restrictions, member_schedule_slots, inventory_items |
| `src/hooks/usePlanGeneration.ts` | useGeneratePlan, useGenerationJob, useLatestGeneration, useSuggestAlternative | ✓ VERIFIED | All 4 exports present; functions.invoke('generate-plan'), queryKeys.planGeneration, refetchInterval returning false on terminal status |
| `src/hooks/useNutritionGaps.ts` | useNutritionGaps wrapping calcWeeklyGaps | ✓ VERIFIED | export function useNutritionGaps, calcWeeklyGaps called in useMemo |
| `src/components/plan/GeneratePlanButton.tsx` | CTA button with states | ✓ VERIFIED | "Generate Plan" text, aria-busy attribute |
| `src/components/plan/PriorityOrderPanel.tsx` | Drag-to-reorder with localStorage | ✓ VERIFIED | SortableContext, useSortable, localStorage, "Planning priorities" label |
| `src/components/plan/GenerationProgressBar.tsx` | Progress steps | ✓ VERIFIED | role="progressbar", "Shortlisting recipes...", isTimeout → "Best plan found (time limit reached)" in amber |
| `src/components/plan/SlotShimmer.tsx` | animate-pulse skeleton | ✓ VERIFIED | animate-pulse, border-l-primary/20 |
| `src/components/plan/AIRationaleTooltip.tsx` | Tooltip with auto-dismiss | ✓ VERIFIED | role="tooltip", 5000ms auto-dismiss |
| `src/components/plan/NutritionGapCard.tsx` | Per-member gap panel | ✓ VERIFIED | "below nutrition target", amber styling, collapsible, swap suggestion UI present but not wired from parent |
| `src/components/plan/RecipeSuggestionCard.tsx` | Recipe suggestions for small catalogs | ✓ VERIFIED | "Add more recipes to improve suggestions" |
| `src/components/plan/GenerationJobBadge.tsx` | Relative time badge | ✓ VERIFIED | "Generated {relative time}" |
| `src/components/plan/PlanGrid.tsx` | Integration of all generation components | ✓ VERIFIED | GeneratePlanButton, useGeneratePlan, NutritionGapCard, SlotShimmer, PriorityOrderPanel, GenerationProgressBar all imported and wired |
| `src/components/plan/SlotCard.tsx` | AI rationale tooltip + Suggest alternative | ✓ VERIFIED | generation_rationale used for tooltip trigger, "Suggest alternative" action present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/usePlanGeneration.ts` | `supabase/functions/generate-plan` | `supabase.functions.invoke('generate-plan', ...)` | ✓ WIRED | Line 14 and 91 |
| `src/hooks/usePlanGeneration.ts` | `src/lib/queryKeys.ts` | `queryKeys.planGeneration.job(...)` | ✓ WIRED | Line 38 |
| `src/components/plan/PlanGrid.tsx` | `src/hooks/usePlanGeneration.ts` | useGeneratePlan, useGenerationJob, useLatestGeneration | ✓ WIRED | Lines 16, 136, 138, 148 |
| `src/components/plan/PlanGrid.tsx` | `src/components/plan/NutritionGapCard.tsx` | gaps prop only | ⚠️ PARTIAL | swapSuggestions and onApplySwap not passed (line 598) |
| `supabase/functions/generate-plan/index.ts` | `plan_generations table` | adminClient.from('plan_generations') | ✓ WIRED | Lines 154, 168, 617, 628 |
| `supabase/functions/generate-plan/index.ts` | `meal_plan_slots table` | adminClient.from('meal_plan_slots').upsert(...) | ✓ WIRED | Line 601 |
| `supabase/functions/generate-plan/index.ts` | Anthropic API | fetch("https://api.anthropic.com/v1/messages") | ✓ WIRED | Lines 347, 417, 495 |
| `src/utils/nutritionGaps.ts` | `src/types/database.ts` | NutritionTarget type import | ✓ WIRED | Line 1 of nutritionGaps.ts |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `PlanGrid.tsx` | `activeJob` | `useGenerationJob(activeJobId)` polling plan_generations | Yes — queries Supabase `plan_generations` by jobId | ✓ FLOWING |
| `PlanGrid.tsx` | `gaps` | `useNutritionGaps(planId)` → calcWeeklyGaps(slots, targets, members) | Yes — slots from useMealPlanSlots, targets from useNutritionTargets, members from useHouseholdMembers | ✓ FLOWING |
| `PlanGrid.tsx` | `suggestedRecipes` | `latestGeneration?.constraint_snapshot.suggestedRecipes` | Yes — from edge function via plan_generations constraint_snapshot | ✓ FLOWING |
| `NutritionGapCard.tsx` | `swapSuggestions` | Not passed from PlanGrid — defaults to `[]` | No — always empty; swap actions never displayed | ✗ HOLLOW_PROP |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| vite build succeeds (no type errors) | `npx vite build` | Built in 340ms, exit 0 | ✓ PASS |
| Existing tests pass (no regressions) | `npx vitest run` | 205 passing, 12 failing (all 12 pre-existing in AuthContext/auth/theme/guide test files, unchanged from pre-phase) | ✓ PASS |
| Edge function deployed | `npx supabase functions list` | SKIP — no active Supabase session | ? SKIP |
| Migration pushed to production | Supabase REST API check | SKIP — no active Supabase session | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PLAN-02 | 22-01, 22-02, 22-03 | User can auto-generate a meal plan optimized for nutrition, cost, schedule, and preferences | ✓ SATISFIED | generate-plan edge function with two-stage AI generation; PlanGrid integration with GeneratePlanButton |
| PLAN-04 | 22-01, 22-03 | Generated plan highlights nutrition gaps per member with swap suggestions | ✗ BLOCKED | Gaps are highlighted (NutritionGapCard with calcWeeklyGaps), but swap suggestions not computed or passed — `swapSuggestions` prop always empty |
| PLAN-05 | 22-02, 22-03 | Recipe selection can prioritize using ingredients already in inventory | ✓ SATISFIED | inventory_items fetched in edge function; passed to AI prompts with "prefer recipes using ingredients the household already has" instruction |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/plan/PlanGrid.tsx` | 554-555, 571-572 | Locked slot shimmer renders `dayCards[i]` (entire day card) instead of individual locked slot card | ⚠️ Warning | Visual defect — locked slot during generation shows entire day's card content nested inside the per-slot shimmer loop; unlocked slots (SlotShimmer) render correctly |
| `src/components/plan/PlanGrid.tsx` | 586-588 | `onAssign={() => {}}`, `onClear={() => {}}`, `onSwap={() => {}}` in shimmer mode | ℹ️ Info | Shimmer placeholder day card has no-op handlers — expected, since it renders only during generation when interactions should be disabled |
| `src/components/plan/PlanGrid.tsx` | 607 | `onAdd={() => {}}` on RecipeSuggestionCard | ℹ️ Info | Documented known stub in 22-03-SUMMARY.md — recipe creation from AI suggestions is out of Phase 22 scope |

### Human Verification Required

#### 1. End-to-end plan generation flow

**Test:** Log in to https://nourishplan.gregok.ca, navigate to the Plan page, lock one slot, then tap "Generate Plan"
**Expected:** Button shows "Generating..." with spinner; progress bar advances through "Shortlisting recipes...", "Assigning to slots...", etc.; unlocked slots show shimmer animation; after completion, generated meals appear in unlocked slots; locked slot is unchanged; AI rationale tooltip appears on tap/hover of any generated slot; "Generated just now" badge appears in plan header
**Why human:** Requires live edge function invocation + Anthropic API call

#### 2. Nutrition gap card accuracy

**Test:** After generation completes (with test account members having nutrition targets set), scroll below the plan grid
**Expected:** If any member's weekly macros are below 90% of target, the NutritionGapCard appears showing member name, nutrient, and deficit
**Why human:** Requires live household data with nutrition targets and a completed generation

#### 3. Locked slot shimmer rendering defect

**Test:** Lock a slot on any day, trigger generation, observe the generating state
**Expected:** The locked slot should show its slot content (not shimmer). Check if the locked slot renders correctly or shows a duplicate/corrupted day card
**Why human:** Code at PlanGrid.tsx lines 554-555 and 571-572 renders `dayCards[i]` (entire day card) for locked slots instead of the individual slot — visual impact needs browser confirmation

## Gaps Summary

**1 gap blocking goal achievement:**

**SC 4 — Swap suggestions not wired:** The roadmap requires the plan page to "offer swap suggestions to close" nutrition gaps. The `NutritionGapCard` component has the full swap suggestion UI implemented (SwapSuggestion interface, onApplySwap handler, swap button), but `PlanGrid` never computes or passes swap suggestion data. The `swapSuggestions` prop always defaults to `[]`, so the swap action buttons never appear. Nutrition gaps are shown correctly, but the "offer swap suggestions" half of SC 4 / PLAN-04 is not delivered.

**Root cause:** The plan note in 22-03 said "For now, display gaps only — swap suggestions require the AI to have returned them in the generation response." The edge function stores `suggestedRecipes` in `constraint_snapshot` (for the RecipeSuggestionCard), but does not return nutrient-specific swap slot suggestions. The swap suggestion computation (which recipe to swap into which slot to close which gap) was not implemented.

**Fix required:** Compute `SwapSuggestion[]` in PlanGrid from available data — either by having the edge function return slot-specific swap suggestions keyed by member + nutrient, or by computing them client-side from the gap data + meal plan slots + recipe nutrition data. Pass the computed `swapSuggestions` and an `onApplySwap` handler calling `useAssignSlot` to `NutritionGapCard`.

---

_Verified: 2026-04-06T20:50:49Z_
_Verifier: Claude (gsd-verifier)_
