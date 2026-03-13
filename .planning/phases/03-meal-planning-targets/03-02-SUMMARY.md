---
phase: 03-meal-planning-targets
plan: 02
subsystem: ui
tags: [react, tanstack-query, supabase, tailwind, meals, nutrition]

requires:
  - phase: 03-meal-planning-targets
    plan: 01
    provides: "meals and meal_items tables with RLS, Meal/MealItem TypeScript interfaces, calcMealNutrition utility"
  - phase: 02-food-data-recipe-builder
    provides: "FoodSearch overlay component, NutritionBar component, RecipeBuilder pattern, useRecipes pattern"

provides:
  - "useMeals, useMeal, useCreateMeal, useUpdateMeal, useDeleteMeal hooks in src/hooks/useMeals.ts"
  - "useAddMealItem, useUpdateMealItem, useRemoveMealItem hooks in src/hooks/useMeals.ts"
  - "MealBuilder component with FoodSearch overlay, live NutritionBar, editable name, item list"
  - "MealItemRow component displaying per-100g snapshot macros and calculated nutrition"
  - "MealCard component with item count + calorie summary, navigates to /meals/:id"
  - "MealsPage at /meals with create button and delete confirm modal"
  - "MealPage at /meals/:id rendering MealBuilder"
  - "Routes /meals and /meals/:id wired in App.tsx inside AppShell block"

affects:
  - 03-03 (meal plan grid uses meals as slot content)
  - 03-04 (template save/load references meals)
  - 03-05 (nutrition targets may reference meals for tracking)

tech-stack:
  added: []
  patterns:
    - "MealBuilder adapts RecipeBuilder pattern but with no servings concept — NutritionBar shows total meal nutrition"
    - "MealItemRow uses per-100g macro snapshot stored in meal_items row — no live food source re-resolution"
    - "useMeals hooks follow exact useRecipes pattern: TanStack Query with household-scoped query keys"

key-files:
  created:
    - src/hooks/useMeals.ts
    - src/components/meal/MealBuilder.tsx
    - src/components/meal/MealItemRow.tsx
    - src/components/meal/MealCard.tsx
    - src/pages/MealsPage.tsx
    - src/pages/MealPage.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "MealBuilder shows total nutrition (not per-serving) — meals are atomic units placed into plan slots, not divided by servings"
  - "FoodSearch overlay reused directly from RecipeBuilder pattern with single Food tab — recipe-as-meal-item is a future extension if needed"
  - "MealCard uses meal_items embedded in useMeals query for calorie summary — avoids a second query per card"

patterns-established:
  - "Pattern: meal hooks mirror recipe hooks exactly (query keys, soft-delete, invalidation) — use same structure for future entity types"
  - "Pattern: MealBuilder/MealItemRow derive all displayed nutrition from meal_items snapshot columns — consistent with FoodDataMap approach in RecipeBuilder"

requirements-completed: [MEAL-01, MEAL-06]

duration: 3min
completed: 2026-03-13
---

# Phase 3 Plan 02: Meals CRUD and MealBuilder Summary

**Meals feature: TanStack Query CRUD hooks, MealBuilder page with FoodSearch overlay and live total NutritionBar, MealsPage list, and /meals routes wired in App.tsx**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-13T21:28:51Z
- **Completed:** 2026-03-13T21:31:20Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 8 hooks in useMeals.ts following exact useRecipes pattern: useMeals, useMeal, useCreateMeal, useUpdateMeal, useDeleteMeal, useAddMealItem, useUpdateMealItem, useRemoveMealItem
- MealBuilder adapts RecipeBuilder with inline name editing, FoodSearch overlay, live total nutrition (no servings), and per-item remove/edit
- MealsPage list with create-and-navigate, delete confirm modal, and empty state; MealPage route component

## Task Commits

1. **Task 1: Meals CRUD hooks** - `e614ef6` (feat)
2. **Task 2: MealBuilder UI, MealsPage list, routes** - `d16b768` (feat)

## Files Created/Modified

- `src/hooks/useMeals.ts` - All 8 meal hooks following useRecipes pattern
- `src/components/meal/MealBuilder.tsx` - Meal composition UI with FoodSearch, QuantityModal, EditQuantityModal, NutritionBar
- `src/components/meal/MealItemRow.tsx` - Single item row with per-100g snapshot macro calculation
- `src/components/meal/MealCard.tsx` - Summary card with item count and total calories
- `src/pages/MealsPage.tsx` - /meals route with list, create, delete
- `src/pages/MealPage.tsx` - /meals/:id route rendering MealBuilder
- `src/App.tsx` - Added /meals and /meals/:id routes inside AppShell block

## Decisions Made

- **Total nutrition in NutritionBar (not per-serving):** Meals are atomic units placed into meal plan slots. Showing per-serving nutrition would be misleading — the entire meal is one unit in the plan grid.
- **Single Food tab in FoodSearch for meals:** The plan allows USDA/OFF/My Foods/Recipes tabs. Recipes-as-meal-items requires a separate consideration (circular planning risk). Implemented with standard FoodSearch in food mode only; recipe-as-item can be extended in Plan 03-04 if needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Meals CRUD fully functional; users can create meals and add foods via FoodSearch
- Plan 03-03 (meal plan grid) can reference meals by ID for slot content
- Plan 03-04 (template save/load) can reference existing meal entities

---
*Phase: 03-meal-planning-targets*
*Completed: 2026-03-13*
