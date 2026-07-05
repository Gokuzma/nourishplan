# Structure

Repo root: `C:\Claude\nourishplan`. Vite SPA in `src/`, Supabase backend in `supabase/`, tests in `tests/` + colocated `*.test.ts` in `src/utils/` and `src/lib/`.

```
nourishplan/
├── CLAUDE.md, lessons.md          # project rules + learned lessons (read first)
├── .planning/                      # GSD planning artifacts (phases, codebase docs)
├── src/
│   ├── main.tsx                    # entry, mounts <App/>
│   ├── App.tsx                     # ALL routes + AuthGuard/GuestGuard + QueryClient
│   ├── contexts/
│   │   └── AuthContext.tsx         # Supabase session provider, useAuth()
│   ├── lib/
│   │   ├── supabase.ts             # single Supabase client
│   │   └── queryKeys.ts            # centralised TanStack Query key factories (risky area)
│   ├── types/
│   │   └── database.ts             # DB row types
│   ├── pages/                      # one component per route
│   ├── components/                 # grouped by domain (see below)
│   ├── hooks/                      # 40+ use* hooks, one file per concern
│   ├── utils/                      # pure logic + colocated .test.ts files
│   └── styles/global.css           # Tailwind 4 @theme tokens (--radius-card etc.)
├── supabase/
│   ├── migrations/                 # 001–032, sequential SQL (irreversible in prod)
│   ├── functions/                  # 14 Deno edge functions (index.ts each)
│   └── config.toml
├── tests/                          # Vitest + Testing Library suites (+ tests/e2e)
├── public/                         # PWA assets
└── vite.config.ts                  # vite-plugin-pwa / workbox
```

## src/pages — routes

| Page | Route | Purpose |
|---|---|---|
| `AuthPage.tsx` | `/auth` | Sign in / sign up (components/auth) |
| `HouseholdSetup.tsx` | `/setup` | Create or join a household after signup |
| `WelcomePage.tsx` | `/` | Landing/dashboard after login |
| `HomePage.tsx` | `/today` | Daily food log (components/log), per-member logging |
| `RecipesPage.tsx` | `/recipes` | Recipe list; new-recipe stub creation, ImportRecipeModal, FillGapsModal |
| `RecipePage.tsx` | `/recipes/:id` | Thin wrapper around `RecipeBuilder` (edit ingredients/steps/tags) |
| `MealPage.tsx` | `/meals/:id` | Meal composition editor (MealBuilder) |
| `PlanPage.tsx` | `/plan` | Weekly plan grid, generation, budget strip, batch prep |
| `InventoryPage.tsx` | `/inventory` | Pantry/fridge/freezer items, barcode scan |
| `GroceryPage.tsx` | `/grocery` | Generated grocery list + manual items |
| `InsightsPage.tsx` | `/insights` | Ratings/AI-tag insights |
| `HouseholdPage.tsx` | `/household` | Members, invites, roles, member profiles |
| `MemberTargetsPage.tsx` | `/members/:id/targets` | Nutrition targets per member |
| `SettingsPage.tsx` | `/settings` | Dietary restrictions, won't-eat, schedule, account deletion |
| `GuidePage.tsx` | `/guide` | User guide |
| `CookModePage.tsx` | `/cook/session/:sessionId`, `/cook/:mealId` | Full-screen cook mode (outside AppShell) |
| `StandaloneCookPickerPage.tsx` | `/cook` | Pick a recipe/meal to cook ad hoc |
| `OfflinePage/NotFoundPage/ResetPasswordPage` | `/offline`, `*`, `/auth/reset-password` | Utility |

## src/components — domain groupings

- `layout/` — `AppShell.tsx` (layout route + Outlet), `Sidebar.tsx`, `MobileDrawer.tsx`, `TabBar.tsx`. Nav items grouped Daily/Workbench/Ledger; **tests assert exact nav item count** (`tests/AppShell.test.tsx`).
- `recipe/` — `RecipeBuilder.tsx` (main editor), `ImportRecipeModal.tsx`, `FillGapsModal.tsx` (AI recipe supply), `IngredientRow`, `RecipeStepsSection`/`RecipeStepRow`, `NutritionBar`, `RecipeFreezerToggle`.
- `plan/` — largest group: `PlanGrid`/`DesktopPlanGrid`/`PlanCell`/`SlotCard` (drag-and-drop, lock badges), `GeneratePlanButton` + `GenerationProgressBar`/`GenerationJobBadge`, `PriorityOrderPanel`, `RecipeMixPanel` (favorites/liked/novel sliders), `IssuesPanel`/`IssueRow` (violations), `BudgetStrip`/`BudgetSummarySection`, `BatchPrepButton`/`BatchPrepModal`, `NutritionGapCard`, `MicronutrientPanel`, `RecipeSuggestionCard`, `TemplateManager`.
- `cook/` — `CookModeShell`, `CookStepCard`, `CookStepTimer` + notifications, `MultiMealSwitcher`, `ReheatSequenceCard`, `MemberLaneHeader`.
- `meal/` — `MealBuilder`, `MealCard`, `MealItemRow`.
- `food/` — `FoodSearchOverlay` (USDA/CNF/custom search), `FoodDetailPanel`, `CustomFoodForm`.
- `inventory/` — `AddInventoryItemModal`, `BarcodeScanner`, `QuickScanMode`, `CookDeductionReceipt`, `ExpiryBadge`, `InventorySummaryWidget`.
- `grocery/` — category sections, item rows, `ManualAddItemInput`, `BudgetWarningBanner`.
- `household/` — `CreateHousehold`, `JoinHousehold`, `InviteLink`, `MemberList`/`MemberActionMenu`, `RoleBadge`/`RoleSegmentedControl`, `MemberProfileForm`.
- `settings/` — `DietaryRestrictionsSection`, `WontEatSection`, `ScheduleSection`.
- `log/` — daily log list, `LogMealModal`, `PortionStepper`, `InstallPrompt`, `OfflineBanner`.
- `feedback/` — `RateMealsCard`, `MealRatingRow`, `RecipeAITagPill`.
- `targets/` — `NutritionTargetsForm`. `auth/` — `AuthForm`, `ResetModal`. `editorial/` — shared editorial UI. `Icon.tsx` — icon set.

## src/hooks — pattern and key hooks

Naming: one `useX.ts` file per concern. Canonical pattern (per CLAUDE.md): get `householdId` from `useHousehold()`, key via `queryKeys.*`, `enabled: !!householdId`; mutations invalidate prefix arrays like `['inventory', householdId]`.

Key hooks: `useHousehold.ts` (membership + members + invites + role RPCs), `useRecipes.ts` (CRUD + ingredients), `useImportRecipe.ts`, `useRecipeSupply.ts` (preview/commit gap recipes, classify meal_types), `useRecipeSteps.ts` (AI step generation), `useMealPlan.ts` (plan + slots + assign/clear/lock), `usePlanGeneration.ts` (invoke generate-plan, poll job, suggest alternative), `useCookSession.ts`/`useCookCompletion.ts`/`useInventoryDeduct.ts` (cook mode → inventory), `useGroceryList.ts`/`useGenerateGroceryList.ts`, `useFoodSearch.ts` (USDA/CNF edge fns), `useNutritionTargets.ts`, `useFoodLogs.ts`, `useRatings.ts`/`useAITags.ts`, `useDietaryRestrictions.ts`/`useWontEat.ts`, `useSchedule.ts`, `useFoodPrices.ts`/`useWeeklySpend.ts`/`useSpendLog.ts`, `useBatchPrepSummary.ts`, `useNutritionGaps.ts`, `useMonotonyWarnings.ts`, `usePlanViolations.ts`.

## src/utils — pure logic (unit-tested here)

`nutrition.ts`, `nutritionGaps.ts`, `macroConversion.ts`, `cost.ts`, `inventory.ts`, `groceryGeneration.ts`, `mealPlan.ts`, `schedule.ts`, `portionSuggestions.ts`, `swapSuggestions.ts`, `monotonyDetection.ts`, `recipeSteps.ts`, `recipeSupply.ts`, `foodLogs.ts`, `barcodeLookup.ts`, `theme.ts`. Colocated `*.test.ts` files plus `__tests__/`.

## supabase/

- `migrations/` — sequential `NNN_name.sql`. Landmarks: `001` foundation (households/members/invites/profiles), `004` custom_foods/recipes/recipe_ingredients, `008` meals/meal_items/meal_plans/meal_plan_slots/templates/nutrition_targets, `009` food_logs, `020` budget (food_prices, spend_logs), `021` inventory, `022` grocery, `024` ratings/restrictions/wont-eat/ai_recipe_tags, `025` schedule, `026` plan_generations, `029` cook_sessions + recipe instructions/freezer columns, `030` recipe source_url, `031` household permissions RPCs, `032` recipes.meal_types.
- `functions/<name>/index.ts` — one Deno file per function: `generate-plan`, `import-recipe`, `recipe-supply`, `create-recipe-from-suggestion`, `generate-recipe-steps`, `generate-cook-sequence`, `generate-reheat-sequence`, `compute-batch-prep`, `analyze-ratings`, `classify-restrictions`, `search-usda`, `search-cnf`, `verify-nutrition`, `delete-account`.

## tests/

Vitest (`npx vitest run`). Component/integration suites in `tests/` (AppShell, PlanGrid variants, CookModePage, recipe-builder, auth, settings, etc.), `tests/e2e/` for end-to-end, `tests/setup.ts` for globals. Pure-logic tests are colocated in `src/utils/` and `src/lib/queryKeys.test.ts`.

## Where new features slot in

1. Migration in `supabase/migrations/NNN_*.sql` (RLS policies mandatory, household-scoped).
2. Types in `src/types/database.ts`; query keys added to `src/lib/queryKeys.ts`.
3. Hook(s) in `src/hooks/useX.ts` following the `useFoodPrices` pattern.
4. Components in the matching `src/components/<domain>/` folder; page in `src/pages/` + route in `src/App.tsx` + nav entry in `Sidebar.tsx`/`MobileDrawer.tsx` (update `tests/AppShell.test.tsx` count).
5. AI/external work goes in a new `supabase/functions/<name>/index.ts` invoked via `supabase.functions.invoke`.
6. Pure logic in `src/utils/` with a colocated test; UI tests in `tests/`.
