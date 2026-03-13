---
status: complete
phase: 02-food-data-recipe-builder
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-03-13T15:00:00Z
updated: 2026-03-13T15:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Foods Navigation
expected: Foods tab appears in the bottom TabBar (mobile) and Sidebar (desktop). Clicking it navigates to the /foods page showing the food search interface.
result: pass
method: Foods tab present in both TabBar (mobile 375px) and Sidebar (desktop 1280px). Navigates to /foods with search box and USDA/OFF/My Foods tabs.

### 2. USDA Food Search
expected: On the Foods page, type a food name. Results appear with macros per 100g.
result: issue
reported: "Edge function search-usda is not deployed to Supabase. Searching returns ERR_FAILED (net::ERR_FAILED on supabase.co/functions/v1/search-usda). UI shows 'Search failed. Please try again.' — error handling works but no results possible without deployment."
severity: blocker

### 3. Open Food Facts Search
expected: Switch to OFF tab. Search for a food. Results appear with macros per 100g.
result: issue
reported: "Edge function search-off is not deployed to Supabase. Same ERR_FAILED pattern as USDA. UI shows 'Search failed. Please try again.'"
severity: blocker

### 4. Food Detail Panel
expected: Click "Details" on any search result. Panel shows full nutrition breakdown per 100g.
result: issue
reported: "Cannot test — no search results available because edge functions are not deployed. UI component exists in code (FoodDetailPanel.tsx) but untestable without data."
severity: blocker

### 5. Create Custom Food
expected: In My Foods tab, click Add. Fill form with name and macros. Submit. Food appears in list.
result: issue
reported: "403 Forbidden on custom_foods INSERT. RLS policies on custom_foods use raw subquery on household_members table (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())) instead of the security-definer helper get_user_household_id(). This causes RLS recursion/permission failure."
severity: blocker

### 6. Edit Custom Food
expected: In My Foods, click Edit. Form pre-fills. Change value and save.
result: issue
reported: "Cannot test — no custom foods exist due to INSERT failure (Test 5). Same RLS root cause."
severity: blocker

### 7. Delete Custom Food
expected: In My Foods, click Delete. Food disappears.
result: issue
reported: "Cannot test — no custom foods exist due to INSERT failure (Test 5). Same RLS root cause."
severity: blocker

### 8. My Foods Tab
expected: Click My Foods tab. See household custom foods.
result: issue
reported: "403 Forbidden on custom_foods SELECT. Same RLS subquery issue as Test 5. UI shows 'No matching custom foods' (graceful degradation) but actually failing silently."
severity: major

### 9. Recipes Navigation
expected: Recipes link appears in Sidebar and TabBar. Navigates to /recipes.
result: pass
method: Recipes tab present in both TabBar and Sidebar. Navigates to /recipes showing recipe list with "New Recipe" button.

### 10. Create Recipe
expected: Click "New Recipe". Recipe created and navigated to builder.
result: issue
reported: "403 Forbidden on recipes INSERT. Same RLS pattern — recipes table policies use raw household_members subquery instead of get_user_household_id() helper. Button click fails silently (stays on recipes page, no error shown to user)."
severity: blocker

### 11. Edit Recipe Name and Servings
expected: In recipe builder, name and servings are editable and persist.
result: issue
reported: "Cannot test — no recipes can be created (Test 10). Same RLS root cause."
severity: blocker

### 12. Add Ingredient via Food Search
expected: In recipe builder, click Add Ingredient. Search overlay opens. Select food, enter quantity.
result: issue
reported: "Cannot test — no recipes can be created (Test 10). Same RLS root cause."
severity: blocker

### 13. Live Nutrition Bar
expected: Sticky bar showing per-serving nutrition. Updates when ingredients change.
result: issue
reported: "Cannot test — no recipes can be created (Test 10). Same RLS root cause."
severity: blocker

### 14. Edit Ingredient Quantity
expected: Click edit on ingredient. Modal appears. Change quantity. Nutrition updates.
result: issue
reported: "Cannot test — no recipes can be created (Test 10). Same RLS root cause."
severity: blocker

### 15. Remove Ingredient
expected: Click remove on ingredient. Ingredient removed. Nutrition recalculates.
result: issue
reported: "Cannot test — no recipes can be created (Test 10). Same RLS root cause."
severity: blocker

### 16. Recipe List
expected: All household recipes listed with name, servings, date.
result: issue
reported: "403 on recipes SELECT. Shows 'No recipes yet' but failing silently. Same RLS root cause."
severity: major

### 17. Delete Recipe
expected: Click Delete on a recipe. Recipe removed.
result: issue
reported: "Cannot test — no recipes exist. Same RLS root cause."
severity: blocker

### 18. Nested Recipe as Ingredient
expected: Add another recipe as ingredient. Shows recipe badge. Nutrition contributes.
result: issue
reported: "Cannot test — no recipes can be created. Same RLS root cause."
severity: blocker

### 19. Cycle Detection
expected: Circular reference prevented with error message.
result: issue
reported: "Cannot test — no recipes can be created. Same RLS root cause."
severity: blocker

### 20. Raw/Cooked Weight Toggle
expected: Toggle changes weight state and recalculates nutrition.
result: issue
reported: "Cannot test — no recipes can be created. Same RLS root cause."
severity: blocker

### 21. AI Verification Badges
expected: Search results show verification badges when edge function deployed. Graceful degradation otherwise.
result: issue
reported: "Cannot test badges — no search results because edge functions not deployed. The verify-nutrition function is also not deployed. However, the graceful degradation path (no badges, no errors) cannot be verified because the search itself fails."
severity: blocker

## Summary

total: 21
passed: 2
issues: 19
pending: 0
skipped: 0

## Gaps

- truth: "USDA and Open Food Facts food search returns results"
  status: failed
  reason: "Edge functions search-usda and search-off are not deployed to Supabase. All API-based food search fails with net::ERR_FAILED."
  severity: blocker
  test: 2
  root_cause: "Edge functions exist in supabase/functions/ but were never deployed via 'supabase functions deploy'. The Supabase project has no running edge functions."
  artifacts:
    - path: "supabase/functions/search-usda/index.ts"
      issue: "Not deployed"
    - path: "supabase/functions/search-off/index.ts"
      issue: "Not deployed"
  missing:
    - "Deploy edge functions: supabase functions deploy search-usda && supabase functions deploy search-off"
    - "Set USDA_API_KEY secret in Supabase edge function environment"
  debug_session: ""

- truth: "Custom food CRUD operations work for household members"
  status: failed
  reason: "403 Forbidden on all custom_foods operations. RLS policies use raw subquery on household_members instead of security-definer helper."
  severity: blocker
  test: 5
  root_cause: "Migration 004 (custom_foods, recipes, recipe_ingredients) RLS policies reference household_members with raw subquery: 'household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())'. Migration 002 established get_user_household_id() as the fix for this exact pattern, but migration 004 was written without using it. The raw subquery hits RLS on household_members which causes permission failure."
  artifacts:
    - path: "supabase/migrations/004_food_recipe.sql"
      issue: "All 8 policies use raw household_members subquery instead of get_user_household_id()"
  missing:
    - "Create migration 005 that drops and recreates all custom_foods/recipes/recipe_ingredients RLS policies using public.get_user_household_id() and public.get_user_household_role() helpers"
  debug_session: ""

- truth: "Recipe CRUD operations work for household members"
  status: failed
  reason: "403 Forbidden on recipes INSERT/SELECT. Same RLS pattern as custom_foods."
  severity: blocker
  test: 10
  root_cause: "Same as custom_foods gap — migration 004 policies on recipes table use raw household_members subquery."
  artifacts:
    - path: "supabase/migrations/004_food_recipe.sql"
      issue: "recipes policies use raw household_members subquery"
  missing:
    - "Included in migration 005 fix above"
  debug_session: ""
