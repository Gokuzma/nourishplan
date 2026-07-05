# Architecture

NourishPlan is a single-page PWA: Vite 8 + React 19 client talking directly to Supabase (Postgres + RLS, Auth, Edge Functions). There is no custom backend server — all server logic lives in Postgres policies/RPCs and Deno edge functions.

## SPA Routing (`src/App.tsx`)

react-router-dom v7 with `BrowserRouter`. Three route tiers, all defined in `src/App.tsx`:

1. **Guest-only** — `/auth` wrapped in `GuestGuard` (redirects authed users away).
2. **Auth-required, household-optional** — `/setup` (HouseholdSetup), `/join` (invite-token join). `AuthGuard` redirects unauthenticated users to `/auth` and household-less users to `/setup`.
3. **Auth + household required, inside `AppShell` layout route** (`src/components/layout/AppShell.tsx`, renders `Outlet` + Sidebar/MobileDrawer/TabBar):
   - `/` WelcomePage, `/today` HomePage (daily food log), `/recipes`, `/recipes/:id`, `/meals/:id`, `/plan`, `/inventory`, `/grocery`, `/insights`, `/household`, `/settings`, `/guide`, `/members/:id/targets`.
4. **Cook Mode** — full-page routes outside AppShell: `/cook` (StandaloneCookPickerPage), `/cook/session/:sessionId` and `/cook/:mealId` (CookModePage).
5. **Public utility** — `/offline`, `/auth/reset-password`, `*` NotFound.

## State Management

- **Server state**: TanStack Query exclusively. `QueryClient` configured in `App.tsx` (staleTime 5 min, retry 1).
- **Query keys**: centralised in `src/lib/queryKeys.ts` — one namespaced factory per domain (recipes, meals, mealPlan, inventory, grocery, ratings, schedule, cookSession, planGeneration, etc.). Almost every key embeds `householdId` so cache is naturally tenant-scoped.
- **Hook pattern** (the `useFoodPrices` convention, per CLAUDE.md): each hook gets `householdId` from `useHousehold()`, uses `queryKeys.*`, and sets `enabled: !!householdId`. Mutations invalidate via prefix arrays, e.g. `queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })`.
- **Local/UI state**: plain React state; the only context is `AuthContext`.

## Auth Flow

- `src/contexts/AuthContext.tsx` — `AuthProvider` holds the Supabase session (`supabase.auth.onAuthStateChange`), exposes `useAuth()` returning `{ session, loading }`. Several tests mock this (see CLAUDE.md Risky Areas).
- `src/lib/supabase.ts` — the single Supabase client.
- `AuthGuard`/`GuestGuard` in `App.tsx` gate routes on `session` + `useHousehold()` membership.
- Password reset via `/auth/reset-password`; account deletion via the `delete-account` edge function (extracts user id from JWT, uses service-role client).

## Household Model (multi-tenancy)

Defined in `supabase/migrations/001_foundation.sql`:

- `households` — name, `week_start_day`, `weekly_budget`.
- `household_members` — (household_id, user_id, role `admin`|`member`). One household per user (`useJoinHousehold` treats duplicate insert as "already a member").
- `household_invites` — token-based invites with expiry, `role` column added in `031_household_permissions.sql`.
- `member_profiles` — managed non-login members (children), `managed_by` a user.
- `profiles` — public per-user profile (display name) created by trigger.

**Isolation is enforced by RLS on every table**: policies check `household_id in (select household_id from household_members where user_id = auth.uid())`. Child tables (recipe_ingredients, meal_items, meal_plan_slots, grocery_items) check via a join to their parent.

**Permissions (Phase 30, `031_household_permissions.sql`)**: DB-enforced last-admin guard trigger, plus RPCs `change_member_role`, `remove_household_member`, `leave_household` (client hooks in `src/hooks/useHousehold.ts`). Update/delete on recipes and meals is restricted to creator-or-admin in RLS. The error string `'At least one admin required'` is contractual with the UI.

`src/hooks/useHousehold.ts` is the hub: `useHousehold()` (membership row + household), `useHouseholdMembers()`, `useMemberProfiles()`, create/join/invite/role-change mutations.

## Data Flow

Client → Supabase happens two ways:

1. **Direct PostgREST reads/writes** via `supabase.from(...)` inside hooks (`src/hooks/*.ts`). RLS is the authorization layer.
2. **Edge function invocations** via `supabase.functions.invoke(...)` for anything needing AI (Anthropic API), external APIs (USDA/CNF), or service-role privileges. Functions verify the caller's JWT and household membership themselves, then use the service-role client.

Async AI jobs (plan generation) are tracked in the `plan_generations` table (`026_plan_generations.sql`: status running/done/timeout/error, `pass_count`, `constraint_snapshot`); the client polls via `useGenerationJob` in `src/hooks/usePlanGeneration.ts`.

## Edge Functions (`supabase/functions/`)

All are Deno `serve` handlers with CORS headers; AI ones call the Anthropic API with `ANTHROPIC_API_KEY`.

| Function | Purpose | Client caller |
|---|---|---|
| `generate-plan` | Constraint-based weekly meal-plan generation (see below) | `usePlanGeneration.ts` |
| `import-recipe` | Import a recipe from a URL or pasted text: fetches page, Claude extracts name/servings/ingredients (with per-100g macros)/steps/`meal_types`, inserts `recipes` + `recipe_ingredients` | `useImportRecipe.ts` → `ImportRecipeModal` |
| `recipe-supply` | "Fill gaps": AI proposes slot-appropriate recipes (preview) then commits them; also classifies untagged recipes into `meal_types` | `useRecipeSupply.ts` → `FillGapsModal`, SettingsPage |
| `create-recipe-from-suggestion` | Materialise an AI plan suggestion (name/description/mealTypes) into a full recipe with generated ingredients | `PlanGrid.tsx` |
| `generate-recipe-steps` | AI generates structured `RecipeStep[]` (`instructions` jsonb) from ingredient snapshot + notes | `useRecipeSteps.ts` |
| `generate-cook-sequence` | Interleave steps of multiple recipes into one cook sequence (multi-meal cook mode) | `useGenerateCookSequence.ts` |
| `generate-reheat-sequence` | AI reheat steps for fridge/freezer leftovers | `useGenerateReheatSequence.ts` |
| `compute-batch-prep` | Group upcoming plan slots into batch-prep sessions (shared ingredients, freezer-friendly) | `useBatchPrepSummary.ts` |
| `analyze-ratings` | AI tags recipes from household rating patterns (`ai_recipe_tags`) | `useAITags.ts` |
| `classify-restrictions` | AI expands dietary restrictions/custom entries into concrete ingredient avoid-lists | `useDietaryRestrictions.ts` |
| `search-usda` / `search-cnf` | Proxy food-database search (USDA FDC, Canadian Nutrient File), normalised per-100g macros | `useFoodSearch.ts` |
| `verify-nutrition` | Sanity-check/reconcile USDA vs CNF macro values | `FoodSearchOverlay.tsx` |
| `delete-account` | Service-role account deletion, user id from JWT only | SettingsPage |

## Recipes Domain (key detail)

**Schema** (`004_food_recipe.sql` + later alters):
- `recipes`: id, household_id, created_by, name, servings, `notes` (016), `instructions` jsonb — array of RecipeStep `{id, text, duration_minutes, is_active, ingredients_used, equipment}` (029), `freezer_friendly` + `freezer_shelf_life_weeks` (029), `source_url` (030), `meal_types text[]` (032 — values Breakfast/Lunch/Dinner/Snacks, GIN-indexed; empty = unrestricted), soft-delete `deleted_at`.
- `recipe_ingredients`: recipe_id, ingredient_type (`food`|`recipe`), ingredient_id (text since 007), quantity_grams, weight_state (raw/cooked), plus **denormalised snapshots** (018): `ingredient_name`, `calories/protein/fat/carbs_per_100g`, `micronutrients` jsonb. The planner and cook mode read the snapshots, not a foods table.
- `custom_foods`: household-scoped food entries with per-100g macros + micronutrients; USDA/CNF results feed these.

**How recipes are created today** (four paths):
1. **Manual** — RecipesPage `useCreateRecipe()` inserts a stub then navigates to `/recipes/:id` where `RecipeBuilder` (`src/components/recipe/RecipeBuilder.tsx`) edits ingredients (via FoodSearchOverlay → USDA/CNF/custom foods), steps, meal_types, freezer flags.
2. **URL/text import** — `ImportRecipeModal` → `import-recipe` edge function (AI extraction, strict meal_types prompt: "Never put soups... in Breakfast").
3. **Fill-gaps supply** — `FillGapsModal` → `recipe-supply` (preview proposals per slot, then commit); same function also back-classifies untagged recipes.
4. **From plan suggestion** — `create-recipe-from-suggestion` when accepting an AI suggestion in `PlanGrid`.

**Meals vs recipes**: a `meal` (008) is a composition of `meal_items` (food or recipe references with macro snapshots) that gets placed in plan slots. `generate-plan` wraps each chosen recipe in a new single-item meal (`meals` + `meal_items` inserts around line 858–926 of `generate-plan/index.ts`) and assigns `meal_plan_slots.meal_id`.

## Meal Plan Generation (`generate-plan`, ~1050 lines)

Multi-pass AI pipeline with a 90 s wall-clock budget, job row in `plan_generations`, rate-limited per household per 24 h:
1. Loads recipes (+ingredient snapshots, meal_types), dietary restrictions, wont-eat lists, member schedules, inventory, ratings, nutrition targets, locked slots.
2. Computes per-recipe tier hints from ratings + cook history and normalises the requested **recipe mix** (favorites/liked/novel, default 50/30/20).
3. **Pass 1 (Haiku)**: shortlist from a lean recipe catalog. **Pass 2 (Haiku or Sonnet by household complexity)**: assign recipes to the enumerated 7×4 slot grid (skipping locked slots and schedule "out" slots), with rationale per slot (`meal_plan_slots.generation_rationale`). **Passes 3–5**: verify-and-correct loops when violations exist.
4. All AI-returned recipe IDs are validated against the household catalog; invalid ones are logged as dropped, never silently inserted. A deterministic slot guardrail enforces meal_types fit (recent commit fbb140f).
5. Violations are persisted for the `IssuesPanel`/`PlanViolations` UI.

## Other Domains (brief)

- **Inventory** (`021`): `inventory_items` with pantry/fridge/freezer locations; cook completion deducts via `useInventoryDeduct` and shows `CookDeductionReceipt`.
- **Budget** (`020`): `food_prices` + `spend_logs`; plan generation computes cost/serving; `BudgetStrip` on PlanPage, weekly spend hooks.
- **Grocery** (`022`): `grocery_lists`/`grocery_items` generated from the plan minus inventory (`src/utils/groceryGeneration.ts`).
- **Cook Mode** (`029`): `cook_sessions` with jsonb `step_state` keyed by stable step ids; supports multi-recipe combined sequences, timers, member lanes; full-screen routes outside AppShell.
- **Feedback/dietary** (`024`): `recipe_ratings`, `dietary_restrictions`, `wont_eat_entries`, `ai_recipe_tags` — all inputs to plan generation.
- **Schedule** (`025`): per-member weekly slot statuses + exceptions (who eats which meal at home).
- **Logs/targets** (`008`/`009`): `nutrition_targets` per member, `food_logs` per day — HomePage daily log and Insights.
