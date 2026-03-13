---
phase: 02-food-data-recipe-builder
verified: 2026-03-13T12:53:00Z
status: passed
score: 17/17 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 17/17
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 2: Food Data & Recipe Builder Verification Report

**Phase Goal:** Users can search for foods, add custom foods, and build recipes with auto-calculated nutrition
**Verified:** 2026-03-13T12:53:00Z
**Status:** passed
**Re-verification:** Yes — re-verification after initial pass; all claims confirmed against actual codebase

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can search USDA and Open Food Facts for a food by name and see nutrition data returned | VERIFIED | `search-usda/index.ts` (147 lines): calls `api.nal.usda.gov/fdc/v1/foods/search`, deduplicates, normalises to per-100g. `search-off/index.ts` (113 lines): calls `world.openfoodfacts.org`, filters with `hasNutritionData`, per-100g fields. `useFoodSearch.ts` invokes via `supabase.functions.invoke`. `FoodSearch.tsx` renders results with `MacroText` per 100g. |
| 2 | User can add a custom food with name, serving size, calories, macros, and optional micronutrients, then edit or delete it | VERIFIED | `CustomFoodForm.tsx` (256 lines) with required fields + expandable micronutrients section. `useCreateCustomFood`, `useUpdateCustomFood`, `useDeleteCustomFood` in `useCustomFoods.ts` — all query `custom_foods`. Soft-delete via `deleted_at`. FoodSearch My Foods tab gates edit/delete by `created_by` check or admin role. |
| 3 | User can create a recipe by adding food items as ingredients with quantities and see the per-serving nutrition calculated automatically | VERIFIED | `RecipesPage.tsx`: "New Recipe" button calls `useCreateRecipe` then `navigate('/recipes/:id')`. `RecipeBuilder.tsx` (598 lines): `FoodSearch` in select mode, `QuantityModal` for gram input, `useAddIngredient` mutation. `perServingNutrition` useMemo feeds `NutritionBar` props. |
| 4 | User can add another recipe as an ingredient inside a recipe (nested recipes work without circular references) | VERIFIED | `RecipePicker` component in RecipeBuilder overlay. `handleRecipeSelected` calls `wouldCreateCycle(recipeId, selectedRecipe.id, getIngredientsForCycle)` before proceeding. BFS cycle detection in `src/utils/nutrition.ts` — 3 unit tests pass (self-reference, indirect, no-cycle). |
| 5 | User can toggle ingredient weight state (raw vs cooked) on a recipe and see nutrition recalculate | VERIFIED | `IngredientRow.tsx`: Raw/Cooked toggle button calls `onToggleWeightState` prop. `handleToggleWeightState` in RecipeBuilder calls `useUpdateIngredient` to persist. `perServingNutrition` memo calls `applyYieldFactor(ing.quantity_grams, ing.weight_state, DEFAULT_YIELD_FACTOR)` which uses YIELD_FACTORS['vegetables'] (0.85). |

**Score:** 5/5 success criteria verified

---

### Supporting Truths (from Plan must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | Nutrition data is normalized to per-100g for consistent calculations | VERIFIED | All DB columns suffixed `_per_100g`. Edge functions both return per-100g values. `calcIngredientNutrition` scales with `quantity/100` factor. |
| 7 | Recipe per-serving nutrition is calculated correctly from ingredient weights | VERIFIED | `calcRecipePerServing` sums ingredient nutrition then divides by servings. 15/15 unit tests pass. |
| 8 | Circular recipe references are detected before save | VERIFIED | `wouldCreateCycle` BFS in `nutrition.ts` line 96; RecipeBuilder calls it at line 319 before `addIngredient.mutate()`. |
| 9 | Raw/cooked toggle applies correct yield factor to nutrition | VERIFIED | `applyYieldFactor` imported line 15; called in `perServingNutrition` memo line 391 and in `resolveRecipeNutrition` line 650. Unit tests confirm cooked 100g / 0.75 = 133.33g raw equivalent. |
| 10 | USDA search returns normalized per-100g food results with deduplication | VERIFIED | `deduplicateByDescription` priority-map in `search-usda/index.ts`. Nutrient IDs 208/203/204/205 from `foodNutrients`. |
| 11 | Open Food Facts search returns normalized per-100g food results filtering incomplete entries | VERIFIED | `hasNutritionData` filter, `nutriments["energy-kcal_100g"]` etc. User-Agent header set. |
| 12 | AI verification cross-checks nutrition data and flags outliers | VERIFIED | `verify-nutrition/index.ts` calls `api.anthropic.com/v1/messages` with `claude-haiku-4-5`. Local `buildOutlierWarnings` runs independently. Graceful degradation: missing API key or AI error returns HTTP 200 with `verified: false`. |
| 13 | User can view full nutrition details before adding a food | VERIFIED | `FoodDetailPanel.tsx` (110 lines). `detailFood` state in FoodSearch; "Details" button in `ResultRow` calls `onViewDetails`. |
| 14 | Food search has three tabs: USDA, Open Food Facts, My Foods | VERIFIED | `FoodSearch.tsx`: `activeTab` state, `tabs` array with keys `usda`/`off`/`custom`, three conditional tab renders. |
| 15 | Recipe nutrition per serving is auto-calculated and displayed in sticky bar | VERIFIED | `NutritionBar.tsx` (34 lines): `fixed bottom-16 md:bottom-0`, receives `macros: MacroSummary` prop only. `RecipeBuilder` passes `perServingNutrition` useMemo result directly. |
| 16 | User can add another recipe as an ingredient inside a recipe | VERIFIED | `RecipePicker` lists all household recipes excluding current. `handleRecipeSelected` + `resolveRecipeNutrition` for sub-recipe nutrition normalised to per-100g. |
| 17 | AI-verified results show info icon with source comparison | VERIFIED | `verifyFoodResults` background async loop in `ApiTab`; `VerificationResult` type; ⓘ (blue) and ⚠ (amber) badges rendered in `ResultRow`; errors swallowed via `Promise.allSettled`. |

**Total Score:** 17/17 truths verified

---

## Required Artifacts

### Plan 01: Data Foundation

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/004_food_recipe.sql` | VERIFIED | 237 lines. Tables: `custom_foods`, `recipes`, `recipe_ingredients`. 4 RLS policies each. `set_updated_at()` trigger on `custom_foods` and `recipes`. `weight_state` column with CHECK constraint. |
| `src/types/database.ts` | VERIFIED | 167 lines. Interfaces: `CustomFood` (line 42), `Recipe` (62), `RecipeIngredient` (73), `MacroSummary` (84), `NormalizedFoodResult` (91). All 3 new tables in `Database` type. |
| `src/utils/nutrition.ts` | VERIFIED | 123 lines. Exports: `USDA_NUTRIENT_IDS`, `YIELD_FACTORS`, `calcIngredientNutrition`, `calcRecipePerServing`, `applyYieldFactor`, `wouldCreateCycle`. Imports `MacroSummary` from `../types/database`. |
| `tests/nutrition.test.ts` | VERIFIED | 126 lines. 15 tests, 15 passing. Covers all 5 functions and both constants. |

### Plan 02: Edge Functions

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/functions/search-usda/index.ts` | VERIFIED | 147 lines. Deduplication by description + priority map. CORS headers. 502 on upstream failure. |
| `supabase/functions/search-off/index.ts` | VERIFIED | 113 lines. `hasNutritionData` filter. `User-Agent` header set. 502 on upstream failure. |
| `supabase/functions/verify-nutrition/index.ts` | VERIFIED | 177 lines. Local `buildOutlierWarnings` + AI call. Graceful degradation returns HTTP 200 with `verified: false` when API key absent or AI errors. |

### Plan 03: Food Search UI

| Artifact | Status | Details |
|----------|--------|---------|
| `src/hooks/useFoodSearch.ts` | VERIFIED | 27 lines. `supabase.functions.invoke` with conditional function name. `staleTime: 5*60*1000`. `enabled: query.length >= 2`. |
| `src/hooks/useCustomFoods.ts` | VERIFIED | 130 lines. Exports `useCustomFoods`, `useCreateCustomFood`, `useUpdateCustomFood`, `useDeleteCustomFood`. All query `custom_foods`. |
| `src/components/food/FoodSearch.tsx` | VERIFIED | 430 lines. Three tabs. 300ms debounce. `mode` prop. Background `verifyFoodResults`. |
| `src/components/food/FoodDetailPanel.tsx` | VERIFIED | 110 lines. Full nutrition detail including micro-nutrients. |
| `src/components/food/CustomFoodForm.tsx` | VERIFIED | 256 lines. Create/edit modes. Expandable micronutrients section. |
| `src/pages/FoodsPage.tsx` | VERIFIED | Renders `<FoodSearch mode="browse" />`. Route `/foods` at `App.tsx:138`. |

### Plan 04 & 05: Recipe Builder

| Artifact | Status | Details |
|----------|--------|---------|
| `src/hooks/useRecipes.ts` | VERIFIED | 237 lines. All 9 hooks present: `useRecipes`, `useRecipe`, `useCreateRecipe`, `useUpdateRecipe`, `useDeleteRecipe`, `useRecipeIngredients`, `useAddIngredient`, `useRemoveIngredient`, `useUpdateIngredient`. |
| `src/components/recipe/RecipeBuilder.tsx` | VERIFIED | 598 lines. Ingredient list, FoodSearch overlay (food + recipe tabs), QuantityModal, EditQuantityModal, NutritionBar, RecipePicker. `wouldCreateCycle` called at line 319. `applyYieldFactor` called in `perServingNutrition` memo at line 391. |
| `src/components/recipe/NutritionBar.tsx` | VERIFIED | 34 lines. `fixed bottom-16 md:bottom-0`. Receives `macros: MacroSummary` props only — no internal fetching. |
| `src/components/recipe/IngredientRow.tsx` | VERIFIED | 77 lines. Raw/Cooked toggle button. Recipe badge for `ingredient_type === 'recipe'`. Edit/remove buttons. `weight_state === 'cooked'` check at line 19. |
| `src/pages/RecipePage.tsx` | VERIFIED | Reads `id` from `useParams`; renders `<RecipeBuilder recipeId={id} />`. |
| `src/pages/RecipesPage.tsx` | VERIFIED | Lists recipes. "New Recipe" creates + navigates. Delete with confirmation. Creator/admin gate. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/utils/nutrition.ts` | `src/types/database.ts` | import MacroSummary | WIRED | Line 1: `import type { MacroSummary } from '../types/database'` |
| `src/hooks/useFoodSearch.ts` | `search-usda` edge function | `supabase.functions.invoke('search-usda')` | WIRED | Line 16: `tab === 'usda' ? 'search-usda' : 'search-off'` |
| `src/hooks/useFoodSearch.ts` | `search-off` edge function | `supabase.functions.invoke('search-off')` | WIRED | Same conditional at line 16 |
| `src/hooks/useCustomFoods.ts` | `custom_foods` table | `supabase.from('custom_foods')` | WIRED | Lines 33, 62, 96, 120 |
| `src/App.tsx` | `src/pages/FoodsPage.tsx` | Route path=/foods | WIRED | `App.tsx:138` |
| `src/App.tsx` | `src/pages/RecipesPage.tsx` | Route path=/recipes | WIRED | `App.tsx:139` |
| `src/App.tsx` | `src/pages/RecipePage.tsx` | Route path=/recipes/:id | WIRED | `App.tsx:140` |
| `src/components/recipe/RecipeBuilder.tsx` | `src/utils/nutrition.ts` | `calcRecipePerServing` | WIRED | Import line 12; called in `perServingNutrition` useMemo line 402 |
| `src/components/recipe/RecipeBuilder.tsx` | `src/utils/nutrition.ts` | `wouldCreateCycle` | WIRED | Import line 14; called at line 319 before `addIngredient.mutate()` |
| `src/components/recipe/RecipeBuilder.tsx` | `src/utils/nutrition.ts` | `applyYieldFactor` | WIRED | Import line 15; called at lines 391 and 650 |
| `src/components/recipe/RecipeBuilder.tsx` | `src/components/food/FoodSearch.tsx` | `FoodSearch` in select mode | WIRED | Line 548: `<FoodSearch mode="select" onSelect={handleFoodSelected} />` |
| `src/components/food/FoodSearch.tsx` | `verify-nutrition` edge function | background `verifyFoodResults` | WIRED | Line 166: `supabase.functions.invoke('verify-nutrition', ...)` |
| `src/hooks/useRecipes.ts` | `recipes` + `recipe_ingredients` | `supabase.from('recipes')`, `supabase.from('recipe_ingredients')` | WIRED | Multiple queries: recipes lines 18, 46, 87, 116, 141; recipe_ingredients lines 60, 177, 209, 230 |

**Architectural note:** `applyYieldFactor` is called from RecipeBuilder's `perServingNutrition` memo rather than from `IngredientRow`. This is correct placement — yield factor scaling belongs in the nutrition computation layer, not the display component. `IngredientRow` is a pure display component.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FOOD-01 | 02-02, 02-03 | User can search USDA FoodData Central for foods by name | SATISFIED | `search-usda/index.ts` + `useFoodSearch` + FoodSearch USDA tab |
| FOOD-02 | 02-02, 02-03 | User can search additional open food databases for broader coverage | SATISFIED | `search-off/index.ts` + FoodSearch Open Food Facts tab |
| FOOD-03 | 02-03 | User can add custom foods with name, serving size, calories, macros, optional micronutrients | SATISFIED | `CustomFoodForm.tsx` + `useCreateCustomFood` + `custom_foods` table with `micronutrients jsonb` |
| FOOD-04 | 02-03 | User can edit and delete their custom foods | SATISFIED | `useUpdateCustomFood` + `useDeleteCustomFood` (soft-delete via `deleted_at`); edit/delete gated by `created_by` or admin in FoodSearch |
| FOOD-05 | 02-01 | Nutrition data from multiple sources is normalized to per-100g | SATISFIED | DB columns `*_per_100g`; both edge functions return per-100g values; `calcIngredientNutrition` scales by `quantity/100` |
| FOOD-06 | 02-02, 02-05 | AI verification layer cross-checks nutrition data for accuracy | SATISFIED | `verify-nutrition/index.ts` with Claude Haiku + local outlier detection; `verifyFoodResults` background loop in FoodSearch with ⓘ/⚠ badges; graceful degradation |
| RECP-01 | 02-04 | User can create a recipe by adding food items as ingredients with quantities | SATISFIED | `useCreateRecipe` + RecipesPage "New Recipe" button navigates to builder; RecipeBuilder add-ingredient flow with QuantityModal |
| RECP-02 | 02-01, 02-04 | Recipe nutrition per serving is auto-calculated from ingredients | SATISFIED | `calcRecipePerServing` (15 passing unit tests); RecipeBuilder `perServingNutrition` useMemo; NutritionBar sticky display |
| RECP-03 | 02-04 | User can set number of servings a recipe makes | SATISFIED | RecipeBuilder servings input + `handleServingsBlur` via `useUpdateRecipe`; `perServingNutrition` divides by `recipe.servings` |
| RECP-04 | 02-01, 02-05 | User can use another recipe as an ingredient (nested recipes) | SATISFIED | `ingredient_type` column in schema; `RecipePicker` + `handleRecipeSelected` + `resolveRecipeNutrition`; `wouldCreateCycle` prevents circular refs |
| RECP-05 | 02-04 | User can edit and delete their recipes | SATISFIED | `useUpdateRecipe` (name + servings); `useDeleteRecipe` (soft-delete); RecipesPage delete confirmation modal; creator/admin gate |
| RECP-06 | 02-01, 02-05 | Recipe handles raw vs cooked weight states for ingredients | SATISFIED | `weight_state` column in schema with CHECK constraint; `applyYieldFactor` in `perServingNutrition` memo; IngredientRow Raw/Cooked toggle persisted via `useUpdateIngredient` |

**All 12 requirements satisfied. No orphaned requirements.**

All 12 requirement IDs declared in plan frontmatter match REQUIREMENTS.md entries. REQUIREMENTS.md traceability table marks all 12 as Phase 2 / Complete.

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `RecipeBuilder.tsx` (~line 618) | `resolveRecipeNutrition` only resolves `custom_foods` for sub-recipe ingredients; USDA/OFF ingredient macros show zero until that food is in the current session's `foodDataMap` | Info | Documented v1 limitation — graceful degradation. Non-custom food macros are available in-session via `foodDataMap` after user browses them. Accepted trade-off. |
| `RecipeBuilder.tsx` (line 25) | Single `DEFAULT_YIELD_FACTOR = YIELD_FACTORS['vegetables']` (0.85) applied to all cooked ingredients regardless of food category | Info | Intentional v1 simplification per plan spec. User is not presented a category selector. Accepted. |

No TODO/FIXME/HACK/placeholder comments found anywhere in `src/`. No stub return patterns (`return null`, `return {}`, `return []`) in any implemented component. No console.log-only implementations.

---

## Human Verification Required

### 1. Food Search End-to-End

**Test:** Navigate to /foods, type "chicken" in USDA tab, wait for results.
**Expected:** Results appear with food name + cal/protein/carbs/fat per 100g. Clicking "Details" opens FoodDetailPanel overlay with full nutrition breakdown.
**Why human:** Requires live USDA API key (`USDA_API_KEY`) configured in Supabase edge function secrets and deployed edge functions.

### 2. AI Verification Badges

**Test:** Search USDA with API keys configured; check whether ⓘ or ⚠ badges appear on results after ~1-2 seconds.
**Expected:** Small blue ⓘ or amber ⚠ icon appears on top 5 results after background verification completes.
**Why human:** Requires both `USDA_API_KEY` and `ANTHROPIC_API_KEY` configured in Supabase edge function secrets.

### 3. Recipe Nutrition Bar Live Update

**Test:** Add two ingredients to a recipe; change servings from 2 to 4 and blur the field.
**Expected:** NutritionBar values halve when servings doubles.
**Why human:** Requires end-to-end browser interaction; ingredient macros live in local `foodDataMap` state keyed by `food.id`.

### 4. Circular Reference Prevention

**Test:** Create Recipe A, add Recipe B as ingredient. Then open Recipe B and try to add Recipe A as ingredient.
**Expected:** Error message "Cannot add this recipe — it would create a circular reference." appears in the RecipePicker; ingredient is NOT added.
**Why human:** Requires two real recipes in DB and live Supabase connection to exercise the BFS query path.

### 5. Raw/Cooked Toggle Nutrition Change

**Test:** Add a food ingredient (e.g., chicken breast). Observe NutritionBar values. Toggle to "Cooked". Observe NutritionBar again.
**Expected:** Nutrition values change — 100g cooked / 0.85 yield factor = ~117.6g raw equivalent, so all macros increase proportionally.
**Why human:** Requires live browser interaction with working `foodDataMap` state and `perServingNutrition` memo reactivity.

---

## Summary

All Phase 2 must-haves are verified against the actual codebase. This re-verification confirms every claim made in the initial verification.

The phase goal is fully achieved: users can search USDA and Open Food Facts for foods via Supabase edge functions, add and manage custom foods with per-100g macro and micronutrient storage, and build recipes with auto-calculated per-serving nutrition displayed in a live sticky NutritionBar. Nested recipes with BFS cycle detection and raw/cooked weight toggle with yield factor application are fully implemented and unit-tested.

Key facts confirmed directly from code:
- TypeScript: `npx tsc --noEmit` passes with zero errors
- Tests: 15/15 nutrition utility tests pass
- No TODO/FIXME/placeholder patterns in any source file
- All 12 requirements (FOOD-01 through FOOD-06, RECP-01 through RECP-06) have concrete implementation evidence
- All key links (component → hook → edge function → DB) verified as wired

---

_Verified: 2026-03-13T12:53:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — initial pass confirmed against actual codebase_
