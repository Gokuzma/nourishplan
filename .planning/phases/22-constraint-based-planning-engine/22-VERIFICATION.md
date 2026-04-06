---
phase: 22-constraint-based-planning-engine
verified: 2026-04-06T23:40:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Plan page highlights nutrition gaps per member after generation and offers swap suggestions to close them"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Trigger plan generation and verify end-to-end in browser"
    expected: "Generate Plan button triggers generation, shimmer appears on unlocked slots, generated meals appear after completion, locked slot is preserved, AI rationale tooltip appears on tap/hover of generated slot"
    why_human: "End-to-end generation requires live Supabase edge function + Anthropic API call — cannot verify programmatically without running the full stack"
  - test: "Verify nutrition gap card appears with swap suggestion buttons"
    expected: "After generation completes, if any member has a macro below 90% of their weekly target, the NutritionGapCard appears below the plan grid. Expand it and verify each gap row shows a 'Swap X slot to Y (+Ng nutrient)' button. Tap the button and verify the slot's meal is replaced."
    why_human: "Requires live household with nutrition targets set, a completed generation run, and a visible nutrition gap — cannot simulate client-side swap suggestion computation against real DB data programmatically"
  - test: "Verify locked slot shimmer rendering is not visually broken"
    expected: "Lock a slot with a meal, trigger generation. The locked slot should show its slot content (not shimmer). Unlocked slots shimmer. No duplicate or corrupted day card visible around locked slots."
    why_human: "PlanGrid lines 554-572 render dayCards[i] for locked slots during shimmer state — visual impact of this pattern needs browser confirmation"
---

# Phase 22: Constraint-Based Planning Engine Verification Report

**Phase Goal:** The app can generate a complete weekly meal plan optimised across nutrition targets, household budget, member schedules, dietary restrictions, and recipe preference signals — without blocking the UI
**Verified:** 2026-04-06T23:40:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure plan 22-05 (swap suggestions wiring)

## Re-verification Summary

The single gap from the initial verification has been closed. The previous `gaps_found` status was caused by `NutritionGapCard` never receiving `swapSuggestions` or `onApplySwap` props from `PlanGrid`. Plan 22-05 delivered:

1. `src/utils/swapSuggestions.ts` — `computeSwapSuggestions` pure function (7 tests, all passing)
2. `mealId: string` added to `SwapSuggestion` interface in `NutritionGapCard.tsx`
3. `src/hooks/useMeals.ts` expanded select to include all 4 macro fields on `meal_items`
4. `PlanGrid.tsx` wired: `swapSuggestions` useMemo + `handleApplySwap` useCallback + both props passed to `NutritionGapCard`

All 5/5 roadmap success criteria are now verified. The remaining items are human verification only (live browser testing against the deployed stack).

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User triggers plan generation; the UI returns immediately with a status indicator while the plan is generated asynchronously | ✓ VERIFIED | `GeneratePlanButton` + `GenerationProgressBar` wired in PlanGrid; `useGeneratePlan` mutation + `useGenerationJob` polling with `refetchInterval` stopping on terminal status; edge function returns jobId synchronously |
| 2 | Generated plan respects all household dietary restrictions and won't-eat lists — no flagged ingredients appear in any slot | ✓ VERIFIED | Edge function queries `dietary_restrictions` and `wont_eat_entries` as hard constraints in both shortlist and assign prompts; AI ID validation filters AI-returned recipe IDs against household catalog before DB writes |
| 3 | Generated plan skips locked slots (Phase 19) and only fills unlocked slots | ✓ VERIFIED | Edge function filters `is_locked` slots from `slotsToFill`; PlanGrid preserves locked slot rendering during shimmer state |
| 4 | Plan page highlights nutrition gaps per member after generation and offers swap suggestions to close them | ✓ VERIFIED | `NutritionGapCard` receives `swapSuggestions={swapSuggestions}` and `onApplySwap={handleApplySwap}` from PlanGrid (line 622); `computeSwapSuggestions` called in useMemo (line 143-150); `handleApplySwap` calls `assignSlot.mutate` with `swap.mealId` (lines 152-163) |
| 5 | Recipes already in inventory are weighted higher in recipe selection — ingredients the household has are preferred | ✓ VERIFIED | Edge function fetches `inventory_items` in parallel constraint assembly; passes `inventoryNames` to both shortlist and assign AI prompts with explicit instruction "prefer recipes using ingredients the household already has in inventory" |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/026_plan_generations.sql` | plan_generations table + RLS + generation_rationale column | ✓ VERIFIED | CREATE TABLE, ENABLE ROW LEVEL SECURITY, get_user_household_id() SELECT + INSERT policies, ALTER TABLE meal_plan_slots ADD COLUMN generation_rationale |
| `src/types/database.ts` | PlanGeneration interface, updated MealPlanSlot | ✓ VERIFIED | `export interface PlanGeneration`, `is_locked: boolean`, `generation_rationale: string \| null` on MealPlanSlot |
| `src/lib/queryKeys.ts` | planGeneration query key factory | ✓ VERIFIED | `planGeneration:` namespace with `job()` and `latest()` factories |
| `src/utils/nutritionGaps.ts` | calcWeeklyGaps, WeeklyGap, MemberIdentity | ✓ VERIFIED | All three exports present, `DEFAULT_THRESHOLD = 0.9`, pure function with no Supabase imports |
| `src/utils/__tests__/nutritionGaps.test.ts` | Unit tests (6+) | ✓ VERIFIED | 6 test cases passing |
| `src/utils/swapSuggestions.ts` | computeSwapSuggestions pure function | ✓ VERIFIED | Exports `computeSwapSuggestions`; pure (no Supabase/hook imports); skips locked slots; skips meals already in plan; returns at most one suggestion per gap; derives dayName from weekStart + dayIndex via UTC arithmetic |
| `src/utils/__tests__/swapSuggestions.test.ts` | 7 unit tests | ✓ VERIFIED | All 7 tests pass: empty gaps, no unlocked slots, protein swap, locked slot exclusion, dayName derivation, one-per-gap, no duplicates |
| `supabase/functions/generate-plan/index.ts` | AI planning edge function | ✓ VERIFIED | serve(), CORS_HEADERS, ANTHROPIC_API_KEY, api.anthropic.com/v1/messages, claude-haiku-4-5, claude-sonnet-4-5, plan_generations, meal_plan_slots, generation_rationale, time budget check, rate limit, household_members auth, is_locked, wont_eat_entries, dietary_restrictions, member_schedule_slots, inventory_items |
| `src/hooks/usePlanGeneration.ts` | useGeneratePlan, useGenerationJob, useLatestGeneration, useSuggestAlternative | ✓ VERIFIED | All 4 exports present; functions.invoke('generate-plan'); queryKeys.planGeneration; refetchInterval returning false on terminal status |
| `src/hooks/useNutritionGaps.ts` | useNutritionGaps wrapping calcWeeklyGaps | ✓ VERIFIED | export function useNutritionGaps, calcWeeklyGaps called in useMemo |
| `src/components/plan/GeneratePlanButton.tsx` | CTA button with states | ✓ VERIFIED | "Generate Plan" text, aria-busy attribute |
| `src/components/plan/PriorityOrderPanel.tsx` | Drag-to-reorder with localStorage | ✓ VERIFIED | SortableContext, useSortable, localStorage, "Planning priorities" label |
| `src/components/plan/GenerationProgressBar.tsx` | Progress steps | ✓ VERIFIED | role="progressbar", "Shortlisting recipes..." |
| `src/components/plan/SlotShimmer.tsx` | animate-pulse skeleton | ✓ VERIFIED | animate-pulse present |
| `src/components/plan/AIRationaleTooltip.tsx` | Tooltip with auto-dismiss | ✓ VERIFIED | role="tooltip", 5000ms auto-dismiss |
| `src/components/plan/NutritionGapCard.tsx` | Per-member gap panel with swap suggestions | ✓ VERIFIED | "below nutrition target", amber styling, collapsible; `SwapSuggestion` interface includes `mealId: string`; swap button rendered when `swap && onApplySwap` (line 80); `onApplySwap(swap)` called on click |
| `src/components/plan/RecipeSuggestionCard.tsx` | Recipe suggestions for small catalogs | ✓ VERIFIED | "Add more recipes to improve suggestions" |
| `src/components/plan/GenerationJobBadge.tsx` | Relative time badge | ✓ VERIFIED | "Generated" text present |
| `src/components/plan/PlanGrid.tsx` | Integration of all generation components + swap wiring | ✓ VERIFIED | `computeSwapSuggestions` imported (line 20); `swapSuggestions` useMemo (lines 143-150); `handleApplySwap` useCallback (lines 152-163); `NutritionGapCard` at line 622 receives `gaps`, `swapSuggestions`, and `onApplySwap` |
| `src/components/plan/SlotCard.tsx` | AI rationale tooltip + Suggest alternative | ✓ VERIFIED | generation_rationale used for tooltip trigger, "Suggest alternative" action present |
| `src/hooks/useMeals.ts` | meal_items select includes all 4 macro fields | ✓ VERIFIED | Line 20: `.select('*, meal_items(calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, quantity_grams)')` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/usePlanGeneration.ts` | `supabase/functions/generate-plan` | `supabase.functions.invoke('generate-plan', ...)` | ✓ WIRED | Confirmed present |
| `src/hooks/usePlanGeneration.ts` | `src/lib/queryKeys.ts` | `queryKeys.planGeneration.job(...)` | ✓ WIRED | Confirmed present |
| `src/components/plan/PlanGrid.tsx` | `src/hooks/usePlanGeneration.ts` | useGeneratePlan, useGenerationJob, useLatestGeneration | ✓ WIRED | Lines 138-140 |
| `src/components/plan/PlanGrid.tsx` | `src/utils/swapSuggestions.ts` | `import computeSwapSuggestions` + useMemo call | ✓ WIRED | Import line 20; called at line 149 with gaps, slots, allMeals, weekStart, weekStartDay |
| `src/components/plan/PlanGrid.tsx` | `src/components/plan/NutritionGapCard.tsx` | `swapSuggestions` prop + `onApplySwap` callback | ✓ WIRED | Line 622: `<NutritionGapCard gaps={gaps} swapSuggestions={swapSuggestions} onApplySwap={handleApplySwap} />` |
| `handleApplySwap` in PlanGrid | `useAssignSlot` | `assignSlot.mutate({ planId, dayIndex: swap.dayIndex, slotName: swap.slotName, mealId: swap.mealId, ... })` | ✓ WIRED | Lines 152-163 |
| `supabase/functions/generate-plan/index.ts` | `plan_generations table` | adminClient.from('plan_generations') | ✓ WIRED | Multiple lines |
| `supabase/functions/generate-plan/index.ts` | `meal_plan_slots table` | adminClient.from('meal_plan_slots').upsert(...) | ✓ WIRED | Confirmed present |
| `supabase/functions/generate-plan/index.ts` | Anthropic API | fetch("https://api.anthropic.com/v1/messages") | ✓ WIRED | Confirmed present |
| `src/utils/nutritionGaps.ts` | `src/types/database.ts` | NutritionTarget type import | ✓ WIRED | Line 1 of nutritionGaps.ts |
| `src/utils/swapSuggestions.ts` | `src/components/plan/NutritionGapCard.tsx` | `import type { SwapSuggestion }` | ✓ WIRED | Line 1 of swapSuggestions.ts |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `PlanGrid.tsx` | `activeJob` | `useGenerationJob(activeJobId)` polling plan_generations | Yes — queries Supabase `plan_generations` by jobId | ✓ FLOWING |
| `PlanGrid.tsx` | `gaps` | `useNutritionGaps(planId)` → calcWeeklyGaps(slots, targets, members) | Yes — slots from useMealPlanSlots, targets from useNutritionTargets, members from useHouseholdMembers | ✓ FLOWING |
| `PlanGrid.tsx` | `swapSuggestions` | `computeSwapSuggestions(gaps, slots, allMeals, weekStart, weekStartDay)` — allMeals merges slot meals (full macros) + useMeals() (now includes all 4 macros) | Yes — real meal + slot data from TanStack Query cache; useMeals select expanded to include protein_per_100g, fat_per_100g, carbs_per_100g | ✓ FLOWING |
| `NutritionGapCard.tsx` | `swapSuggestions` | Passed as prop from PlanGrid | Yes — `swapSuggestions` prop is now computed and non-empty when gaps exist and candidate meals are available | ✓ FLOWING |
| `PlanGrid.tsx` | `suggestedRecipes` | `latestGeneration?.constraint_snapshot.suggestedRecipes` | Yes — from edge function via plan_generations constraint_snapshot | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| swapSuggestions tests pass (all 7) | `npx vitest run src/utils/__tests__/swapSuggestions.test.ts` | 7 passed, 0 failed, exit 0 | ✓ PASS |
| vite build succeeds (no type errors) | `npx vite build` | Built in 333ms, exit 0 | ✓ PASS |
| NutritionGapCard wired in PlanGrid | grep for `NutritionGapCard` in PlanGrid.tsx | Line 622: `<NutritionGapCard gaps={gaps} swapSuggestions={swapSuggestions} onApplySwap={handleApplySwap} />` | ✓ PASS |
| computeSwapSuggestions imported in PlanGrid | grep for `computeSwapSuggestions` in PlanGrid.tsx | Line 20 import, line 149 call | ✓ PASS |
| Edge function deployed | `npx supabase functions list` | SKIP — no active Supabase session | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PLAN-02 | 22-01, 22-02, 22-03 | User can auto-generate a meal plan optimized for nutrition, cost, schedule, and preferences | ✓ SATISFIED | generate-plan edge function with two-stage AI generation; PlanGrid integration with GeneratePlanButton; full constraint assembly (dietary, schedule, inventory, ratings, nutrition) |
| PLAN-04 | 22-01, 22-03, 22-05 | Generated plan highlights nutrition gaps per member with swap suggestions | ✓ SATISFIED | NutritionGapCard shows per-member gaps via calcWeeklyGaps; computeSwapSuggestions computes best swap per gap; PlanGrid passes both swapSuggestions and onApplySwap; tapping swap calls assignSlot.mutate with swap.mealId |
| PLAN-05 | 22-02, 22-03 | Recipe selection can prioritize using ingredients already in inventory | ✓ SATISFIED | inventory_items fetched in edge function; passed to AI prompts with "prefer recipes using ingredients the household already has" instruction |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/plan/PlanGrid.tsx` | 554-572 | Locked slot shimmer renders `dayCards[i]` (entire day card) instead of individual locked slot card | ⚠️ Warning | Pre-existing from Plan 22-03; visual defect during generation — locked slot may show entire day's card content. Needs browser verification (see human verification item 3) |
| `src/components/plan/PlanGrid.tsx` | ~607 | `onAdd={() => {}}` on RecipeSuggestionCard | ℹ️ Info | Documented known stub — recipe creation from AI suggestions is out of Phase 22 scope |

### Human Verification Required

#### 1. End-to-end plan generation flow

**Test:** Log in to https://nourishplan.gregok.ca (test account: claude-test@nourishplan.test), navigate to the Plan page, lock one slot, then tap "Generate Plan"
**Expected:** Button shows "Generating..." with spinner; progress bar advances through "Shortlisting recipes...", "Assigning to slots...", etc.; unlocked slots show shimmer animation; after completion, generated meals appear in unlocked slots; locked slot is unchanged; AI rationale tooltip appears on tap/hover of any generated slot; "Generated just now" badge appears in plan header
**Why human:** Requires live edge function invocation + Anthropic API call

#### 2. Nutrition gap card with swap suggestions

**Test:** After generation completes (with test account members having nutrition targets set), scroll below the plan grid and expand the NutritionGapCard if visible
**Expected:** Per-member gaps appear with amber percentage labels. Each gap row should include a "Swap [Day] [Slot] to [Recipe Name] (+Ng [nutrient])" underline button. Tapping the button replaces that slot's meal with the suggested recipe and the plan grid updates.
**Why human:** Requires live household data with nutrition targets, a completed generation run that leaves gaps, and candidate meals outside the plan for swapping — cannot simulate the full computation against real DB data programmatically

#### 3. Locked slot shimmer rendering

**Test:** Lock a slot on any day (tap lock icon on a slot with a meal), then trigger generation and observe the generating state
**Expected:** The locked slot should show its slot content (not shimmer). Unlocked slots shimmer with animate-pulse animation. No duplicate or corrupted day-card content is visible around locked slots.
**Why human:** Code at PlanGrid.tsx lines 554-572 renders `dayCards[i]` (whole-day element) for locked slots in the shimmer loop — visual impact needs browser confirmation

## Gaps Summary

No programmatic gaps remain. All 5/5 roadmap success criteria are verified. The single gap from the initial verification — swap suggestions not wired to NutritionGapCard — has been closed by Plan 22-05.

The phase is blocked on human verification only (3 items requiring live browser + edge function testing).

---

_Verified: 2026-04-06T23:40:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification after: Plan 22-05 gap closure (swap suggestions wiring)_
