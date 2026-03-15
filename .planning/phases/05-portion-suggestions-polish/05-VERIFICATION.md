---
phase: 05-portion-suggestions-polish
verified: 2026-03-14T23:08:00Z
status: human_needed
score: 27/27 automated must-haves verified
re_verification: false
human_verification:
  - test: "Portion suggestions display on Plan tab with real data"
    expected: "Each meal slot shows 'You: X% (Y.Z svg)' inline; expanding shows all household members; leftover percentage shown if >1%"
    why_human: "Requires live Supabase session with nutrition targets and a populated meal plan"
  - test: "LogMealModal pre-fills with suggested servings"
    expected: "Opening log modal from a plan slot shows stepper pre-filled with the suggested value, not 1.0"
    why_human: "Requires live data flow from usePortionSuggestions through PlanGrid to modal"
  - test: "Unified search returns USDA + CNF results with source badges"
    expected: "Searching 'chicken' shows results with 'USDA' and 'CNF' pill badges on respective rows"
    why_human: "CNF edge function must be deployed to Supabase; cannot test locally without deployment"
  - test: "Macro warning indicator appears when threshold exceeded"
    expected: "Amber circle with '!' visible on PortionSuggestionRow when member's logged + portion > 120% or < 80% of any macro target"
    why_human: "Requires real member data set up to exceed macro thresholds"
  - test: "MicronutrientPanel visible on recipe builder"
    expected: "Recipe detail page shows collapsible 'Micronutrients' section below macro bar when ingredients have micronutrient data; per-serving/per-person toggle works"
    why_human: "Requires recipe with CNF or USDA ingredients that include micronutrient data"
  - test: "PWA Lighthouse audit passes"
    expected: "Lighthouse installability and 'responds with 200 when offline' checks pass on production build"
    why_human: "Requires npm run build && npm run preview + Chrome DevTools Lighthouse audit"
---

# Phase 05: Portion Suggestions Polish Verification Report

**Phase Goal:** Portion suggestions per household member, CNF integration replacing OFF, micronutrient display, PWA audit fixes.
**Verified:** 2026-03-14T23:08:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

All automated checks pass. Six items require human testing with a live running application.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CNF edge function returns normalized food results with source 'cnf' | VERIFIED | `supabase/functions/search-cnf/index.ts` — full implementation with module-level cache, fetch-all-filter, `source: "cnf"` in NormalizedFood interface |
| 2 | OFF edge function directory is deleted | VERIFIED | `ls supabase/functions/` shows only `search-cnf`, `search-usda`, `verify-nutrition` — no `search-off` |
| 3 | NormalizedFoodResult.source type includes 'cnf' and excludes 'off' | VERIFIED | `src/types/database.ts:193` — `source: 'usda' \| 'cnf' \| 'custom'` |
| 4 | OFF-sourced data is removed from database | VERIFIED | `supabase/migrations/011_remove_off_add_cnf.sql` — `DELETE FROM food_logs WHERE item_type = 'off'` |
| 5 | Micronutrient display constants exist in nutrition.ts | VERIFIED | `src/utils/nutrition.ts` — `CNF_NUTRIENT_IDS`, `MICRONUTRIENT_DISPLAY_ORDER`, `MICRONUTRIENT_LABELS`, `MICRONUTRIENT_UNITS` all exported |
| 6 | calcRemainingCalories returns target minus logged calories | VERIFIED | 5 passing tests covering normal path, over-limit clamp, null target, empty logs, null calorie target |
| 7 | calcPortionSuggestions returns percentage and servings per member | VERIFIED | 6 passing tests covering proportional split, current user sorting, leftover calculation |
| 8 | Members without targets default to 1.0 serving | VERIFIED | `portionSuggestions.ts:107-117` — no-target branch sets `servings: 1.0`, `percentage: null` |
| 9 | Division by zero returns default suggestion | VERIFIED | `portionSuggestions.ts:80-82` — `allZero` guard returns 1.0 for all members |
| 10 | hasMacroWarning flags when any macro exceeds 20% over/under target | VERIFIED | 8 passing tests covering over/under thresholds for each macro independently |
| 11 | Single search bar queries both USDA and CNF simultaneously | VERIFIED | `src/hooks/useFoodSearch.ts:14-41` — two parallel `useQuery` calls, one per source |
| 12 | Search results show source labels (USDA or CNF) | VERIFIED | `src/components/food/FoodSearch.tsx:50-57` — `SourceBadge` component renders 'CNF' or 'USDA' pill |
| 13 | CNF results take priority when both sources have the same food | VERIFIED | `useFoodSearch.ts:56-69` — CNF fills `seenNames` first; USDA items with same name are skipped |
| 14 | No OFF tab or OFF references remain in FoodSearch UI | VERIFIED | `grep "'off'"` in `FoodSearch.tsx` and `useFoodSearch.ts` returns no matches; `ActiveTab = 'search' \| 'custom'` |
| 15 | Recipe builder shows expandable micronutrient breakdown | VERIFIED | `RecipeBuilder.tsx:22` imports `MicronutrientPanel`; line 540-542 renders it below macro summary when `perServingMicronutrients` is non-null |
| 16 | Micronutrients ordered: fiber > sodium > minerals > vitamins | VERIFIED | `MicronutrientPanel.tsx:31` filters on `MICRONUTRIENT_DISPLAY_ORDER` = `['fiber','sodium','calcium','iron','potassium','vitamin_c','vitamin_a']` |
| 17 | verify-nutrition cross-checks USDA vs CNF instead of USDA vs OFF | VERIFIED | `verify-nutrition/index.ts` — `cnfValues` parameter, prompt references "Canadian Nutrient File", no OFF references |
| 18 | Each dish in the meal plan shows per-member portion suggestions | VERIFIED (code) | `SlotCard.tsx:63-83` renders current user's suggestion inline; `PlanGrid.tsx:206-246` computes `slotSuggestionsMap` and passes to `DayCard` |
| 19 | Current user's suggestion shown first | VERIFIED | `portionSuggestions.ts:120-124` — sort places `currentUserId` at index 0 |
| 20 | Each member shows percentage + servings ("35% (1.2 svg)") | VERIFIED | `PortionSuggestionRow.tsx:19-22` — formats `"{percentage}% ({servings} svg)"` |
| 21 | Members without targets show 1.0 serving with no percentage | VERIFIED | `PortionSuggestionRow.tsx:21-22` — `percentage !== null` guard; no-target path shows only servings |
| 22 | Leftover percentage displayed when > 1% | VERIFIED | `SlotCard.tsx:167-171` — `suggestions.leftoverPercentage > 1` guard |
| 23 | Macro warning indicator visible when suggestion exceeds 20% threshold | VERIFIED | `SlotCard.tsx:79-81` and `PortionSuggestionRow.tsx:30-37` — amber circle with '!' rendered when `hasMacroWarning` is true |
| 24 | LogMealModal pre-fills stepper with suggested portion | VERIFIED | `LogMealModal.tsx:43-55` — `useState(suggestedServings ?? 1)` + `useEffect` with `hasUserEdited` guard |
| 25 | Suggestions update when food logs change (cache invalidation) | VERIFIED | `usePortionSuggestions.ts` uses `useHouseholdDayLogs` (TanStack Query) keyed on `householdId + logDate`; log mutations invalidate this key |
| 26 | PWA passes Lighthouse installability check | VERIFIED (config) | `vite.config.ts:20-21` — `purpose: 'any maskable'`; `navigateFallback` and `globPatterns` present |
| 27 | App responds with 200 when offline (navigateFallback) | VERIFIED (config) | `vite.config.ts:25` — `navigateFallback: '/index.html'` |

**Score:** 27/27 truths have passing automated evidence

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/search-cnf/index.ts` | CNF food search with module-level cache | VERIFIED | 172 lines; module-level `cnfFoodsCache`; `getAllCnfFoods()` fetches and caches; parallel nutrient fetch; `source: "cnf"` |
| `supabase/migrations/011_remove_off_add_cnf.sql` | Migration removing OFF data | VERIFIED | Exists; `DELETE FROM food_logs WHERE item_type = 'off'`; documents why recipe_ingredients not touched |
| `src/types/database.ts` | Updated NormalizedFoodResult source union | VERIFIED | `source: 'usda' \| 'cnf' \| 'custom'` at line 193 |
| `src/utils/nutrition.ts` | CNF_NUTRIENT_IDS and MICRONUTRIENT_DISPLAY_ORDER | VERIFIED | All four constants exported; vitamin_a correctly 319 for CNF vs 318 for USDA |
| `src/utils/portionSuggestions.ts` | Pure calculation functions | VERIFIED | Exports `calcRemainingCalories`, `calcPortionSuggestions`, `hasMacroWarning`, `MemberInput`, `MemberSuggestion`, `PortionResult` |
| `tests/portionSuggestions.test.ts` | Unit tests for all functions | VERIFIED | 19 tests, all passing |
| `src/hooks/useFoodSearch.ts` | Unified parallel USDA+CNF search | VERIFIED | Two parallel `useQuery` calls; CNF priority merge in `useMemo` |
| `src/components/food/FoodSearch.tsx` | Single-tab unified search with source labels | VERIFIED | `ActiveTab = 'search' \| 'custom'`; `SourceBadge` component; no OFF references |
| `src/components/plan/MicronutrientPanel.tsx` | Reusable expandable micronutrient component | VERIFIED | Collapsible; follows `MICRONUTRIENT_DISPLAY_ORDER`; per-person/per-serving toggle; hides when no data |
| `src/components/recipe/RecipeBuilder.tsx` | Recipe builder with micronutrient section | VERIFIED | Imports `MicronutrientPanel`; `FoodDataEntry` carries `micronutrients`; `perServingMicronutrients` useMemo |
| `src/hooks/usePortionSuggestions.ts` | React hook wrapping calcPortionSuggestions | VERIFIED | Fetches targets + logs; builds `MemberInput[]`; calls `calcPortionSuggestions` |
| `src/components/plan/PortionSuggestionRow.tsx` | Per-member suggestion display | VERIFIED | Renders percentage + servings format; amber macro warning indicator |
| `src/components/plan/SlotCard.tsx` | Slot card with expandable suggestions | VERIFIED | Inline current user suggestion; expandable section with all members; leftover guard |
| `src/components/log/LogMealModal.tsx` | Modal with suggestedServings pre-fill | VERIFIED | `suggestedServings` prop; `useState(suggestedServings ?? 1)`; `hasUserEdited` ref |
| `vite.config.ts` | Updated PWA config | VERIFIED | `navigateFallback`, `globPatterns`, `purpose: 'any maskable'` all present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `search-cnf/index.ts` | `food-nutrition.canada.ca` | HTTP fetch with module-level cache | WIRED | `getAllCnfFoods()` fetches `food-nutrition.canada.ca/api/canadian-nutrient-file/food/`; nutrient fetch per match |
| `useFoodSearch.ts` | `supabase/functions/search-cnf` | `supabase.functions.invoke('search-cnf')` | WIRED | Line 32: `supabase.functions.invoke('search-cnf', { body: { query } })` |
| `MicronutrientPanel.tsx` | `src/utils/nutrition.ts` | imports MICRONUTRIENT_DISPLAY_ORDER | WIRED | Lines 2-6: imports `MICRONUTRIENT_DISPLAY_ORDER`, `MICRONUTRIENT_LABELS`, `MICRONUTRIENT_UNITS`; used at line 31 |
| `usePortionSuggestions.ts` | `src/utils/portionSuggestions.ts` | imports calcPortionSuggestions | WIRED | Line 5: `import { calcPortionSuggestions }` |
| `usePortionSuggestions.ts` | `useNutritionTargets.ts` | calls useNutritionTargets | WIRED | Line 2+26: `import { useNutritionTargets }` and `useNutritionTargets(householdId)` |
| `usePortionSuggestions.ts` | `useFoodLogs.ts` | fetches household day logs | WIRED | Line 3+27: `import { useHouseholdDayLogs }` and `useHouseholdDayLogs(householdId, logDate)` |
| `SlotCard.tsx` | `PortionSuggestionRow.tsx` | renders suggestion rows | WIRED | Line 3 import; line 161 renders `<PortionSuggestionRow>` for each suggestion |
| `LogMealModal.tsx` | `suggestedServings prop` | pre-fills useState | WIRED | `useState(suggestedServings ?? 1.0)` + `useEffect` for async arrival |
| `portionSuggestions.ts` | `src/types/database.ts` | imports NutritionTarget and FoodLog | WIRED | Line 1: `import type { NutritionTarget, FoodLog, MacroSummary }` |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TRCK-05 | 05-01, 05-02, 05-03, 05-04, 05-05 | System suggests portion sizes per person per dish based on individual targets | SATISFIED | Algorithm in portionSuggestions.ts; wired to UI via usePortionSuggestions + SlotCard + PlanGrid; 19 passing unit tests |

All five plans claim TRCK-05. No orphaned requirements — REQUIREMENTS.md maps TRCK-05 to Phase 5 and marks it Complete.

---

### Anti-Patterns Found

No blocker anti-patterns found in key phase files. No TODO/FIXME/placeholder comments. No stub implementations. No empty return bodies.

**Noted deferrals (not blockers):**

| Item | Reason | Impact |
|------|--------|--------|
| MicronutrientPanel not wired into SlotCard/DayCard (plan view) | MealItem table has no micronutrient columns; panel would always render null | Not a blocker — Plan 04 explicitly deferred with documented reason; recipe builder panel works correctly |

---

### Human Verification Required

The following items have correct code implementation but require a live running application to confirm end-to-end behavior.

#### 1. Portion Suggestions on Plan Tab

**Test:** Log in, ensure at least 2 household members have nutrition targets set. Assign a meal to a slot on the current week. Navigate to the Plan tab.
**Expected:** Each filled slot shows "You: X% (Y.Z svg)" inline below the meal name. Tapping the expand chevron reveals all members with percentage + servings. If leftover > 1%, "Leftover: N%" appears.
**Why human:** Requires live Supabase session with nutrition targets, food logs for today, and a populated meal plan.

#### 2. LogMealModal Pre-fill

**Test:** From the Plan tab, tap the log button (+) on a slot with an assigned meal. Observe the stepper's initial value.
**Expected:** Stepper shows the suggested serving count (e.g., 1.3) instead of 1.0. Manually adjusting the stepper before suggestion data arrives should not be overwritten.
**Why human:** Requires live data flow from PlanGrid through DayCard and SlotCard to LogMealModal with real suggestion data.

#### 3. Unified Search with Source Badges

**Test:** Navigate to Foods tab. Search for "chicken".
**Expected:** Results show a mix of entries with "USDA" and "CNF" pill badges. No "OFF" tab or Open Food Facts references anywhere in the UI.
**Why human:** CNF edge function must be deployed to Supabase project; local dev may not have the function deployed.

#### 4. Macro Warning Indicator

**Test:** Set up a member with a protein target of 100g. Log 85g of protein for today. Open the plan view and check a slot with a meal that adds ~25g protein per serving.
**Expected:** Amber circle with "!" appears next to that member's portion suggestion (85+25=110g, over 120% of 100g target).
**Why human:** Requires precise data setup to trigger the threshold.

#### 5. MicronutrientPanel on Recipe Builder

**Test:** Open a recipe that contains USDA or CNF foods with micronutrient data. Navigate to the recipe builder/detail page.
**Expected:** A collapsible "Micronutrients" section appears below the nutrition bar. Expanding it shows fiber, sodium, calcium, iron, etc. in that order. Values are per serving by default.
**Why human:** Requires recipe ingredients sourced from USDA/CNF foods that include micronutrient data in the API response.

#### 6. PWA Lighthouse Audit

**Test:** Run `npm run build && npm run preview`. Open Chrome DevTools > Lighthouse, select "Progressive Web App". Run audit.
**Expected:** Installability passes. "Responds with 200 when offline" passes.
**Why human:** Requires production build and Chrome DevTools; cannot be automated in this environment.

---

## Commits Verified

All documented commits exist in git log:

| Commit | Plan | Description |
|--------|------|-------------|
| `6df19f8` | 05-01 | feat: create CNF edge function and remove OFF |
| `6a3b0c4` | 05-01 | feat: update types and add micronutrient constants |
| `0e15ac6` | 05-02 | test: failing tests for portionSuggestions |
| `109dc5d` | 05-02 | feat: implement portionSuggestions pure functions |
| `3de6056` | 05-03 | feat: unified USDA+CNF search, remove OFF |
| `51bc253` | 05-03 | feat: MicronutrientPanel and RecipeBuilder integration |
| `2886de9` | 05-04 | feat: usePortionSuggestions hook and PortionSuggestionRow |
| `6689979` | 05-04 | feat: integrate portion suggestions into plan UI |
| `8abf69b` | 05-05 | feat: navigateFallback, globPatterns, maskable icons |
| `6ea7f7c` | 05-05 | fix: unified search resilient to CNF deployment failure |
| `87ab133` | 05-05 | fix: stabilize unified search, round suggested servings |

---

## TypeScript and Tests

- `npx tsc --noEmit` — passes with no output (zero errors)
- `npm test -- tests/portionSuggestions.test.ts` — 19/19 tests pass

---

_Verified: 2026-03-14T23:08:00Z_
_Verifier: Claude (gsd-verifier)_
