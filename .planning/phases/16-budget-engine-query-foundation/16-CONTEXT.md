# Phase 16: Budget Engine & Query Foundation - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Households can track ingredient costs, see cost per recipe serving, and monitor weekly spend against a household budget. All v2.0 queries share a centralised key hierarchy preventing cache incoherence. Cost data comes from manual entry at purchase time (grocery API/import deferred to later phases).

</domain>

<decisions>
## Implementation Decisions

### Budget Display
- **D-01:** Collapsible budget section below the weekly plan grid on the Plan page, expanded by default, showing weekly spend vs budget with per-day cost breakdown
- **D-02:** Cost per serving displayed as a subtitle line below recipe name on recipe cards and detail views (e.g., "$2.45/serving · 4 servings")
- **D-03:** Partial cost shown when not all ingredients are priced — display "$X.XX+ (3 of 5 priced)" indicator
- **D-04:** Budget amount editable from both Settings page (Household section) and inline on Plan page budget section
- **D-05:** Currency hardcoded to CAD ($) — no currency selection UI

### Cost Data Model
- **D-06:** Global `food_prices` table (not per-ingredient on recipe) — one price per food item per store per household. Recipes compute cost by looking up each ingredient's current price from this table.
- **D-07:** Multi-store support — `food_prices` includes a store column so the same food can have different prices at different stores
- **D-08:** Per-household budget stored on the `households` table (single `weekly_budget` field)
- **D-09:** Price input supports either per-weight ("$4.50 per kg") or per-package ("$7.99 for 900g") — system normalises to cost_per_100g internally

### Cost Entry UX
- **D-10:** Inline price prompt in recipe builder — when adding an ingredient with no price, show optional "Set price" field that saves to global food_prices table
- **D-11:** Dedicated "Food Prices" section in Settings page for bulk price management and seeing which foods are missing prices

### Spend Tracking
- **D-12:** Plan page shows both planned/projected cost (from planned meals × ingredient prices) and actual spend (from cooked meals + logged food)
- **D-13:** "Cook" button on recipe view — tapping it records the recipe's ingredient cost as actual spend. Phase 17 will add ingredient deduction from inventory on top of this.
- **D-14:** Takeout/restaurant spend tracked through the existing food logging flow with a cost field added to log entries

### Query Key Centralisation
- **D-15:** All-at-once migration: all existing hooks (8+ files) migrated from inline string arrays to centralised `src/lib/queryKeys.ts` in this phase
- **D-16:** Key factory pattern: `queryKeys.recipes.list(householdId)`, `queryKeys.foodLogs.byDate(householdId, date)`, etc.

### Claude's Discretion
- Query key naming convention and hierarchy structure
- Exact food_prices table schema (columns, indexes, RLS policies)
- How the price manager list/filter UI works in Settings
- How "Cook" button integrates with existing recipe detail view layout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model
- `src/types/database.ts` — All current TypeScript types; RecipeIngredient, Household, FoodLog types need extending
- `supabase/migrations/004_food_recipe.sql` — recipe_ingredients table definition and RLS policies

### Existing Hooks (query key migration targets)
- `src/hooks/useRecipes.ts` — ['recipes', householdId] pattern
- `src/hooks/useMeals.ts` — ['meals', householdId] pattern
- `src/hooks/useMealPlan.ts` — meal plan query patterns
- `src/hooks/useFoodLogs.ts` — ['food-logs', householdId, date, memberId] pattern
- `src/hooks/useCustomFoods.ts` — ['custom-foods', householdId] pattern
- `src/hooks/useHousehold.ts` — ['household', userId] pattern with sub-keys
- `src/hooks/useFoodSearch.ts` — ['food-search', source, query] pattern
- `src/hooks/useNutritionTargets.ts` — nutrition targets query pattern

### UI Integration Points
- `src/components/plan/PlanGrid.tsx` — Plan page where budget section will be added
- `src/components/recipe/RecipeBuilder.tsx` — Recipe detail where cost/serving subtitle and Cook button go
- `src/components/recipe/IngredientRow.tsx` — Ingredient row where inline price entry appears
- `src/pages/SettingsPage.tsx` — Where budget field and Food Prices section go
- `src/pages/RecipesPage.tsx` — Recipe cards where cost/serving subtitle appears

### Requirements
- `.planning/REQUIREMENTS.md` §v2.0 — BUDG-01 through BUDG-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `IngredientRow.tsx` — Can be extended with optional price input field
- `PlanGrid.tsx` — Budget section slots in below the existing grid
- `SettingsPage.tsx` — Existing Household section pattern for budget field; page structure for new Food Prices section
- `useRecipes.ts` / `useMeals.ts` — Pattern for household-scoped TanStack Query hooks (reuse for budget/price hooks)
- `ProgressRing.tsx` — Could be reused for budget progress visualization

### Established Patterns
- TanStack Query with household-scoped keys and `useQueryClient().invalidateQueries()`
- Supabase RLS with `get_user_household_id()` helper for household isolation
- Per-100g normalization for all food data — cost_per_100g aligns naturally
- Soft delete via `deleted_at` column pattern
- Types defined in `src/types/database.ts`, Database type maps all tables

### Integration Points
- `households` table gets `weekly_budget` column
- New `food_prices` table with RLS matching existing household isolation pattern
- `food_logs` table gets optional `cost` column for takeout/restaurant spend tracking
- New `recipe_cook_logs` or similar table for recording when recipes are cooked (spend events)
- `src/lib/queryKeys.ts` — new file, imported by all existing and new hooks

</code_context>

<specifics>
## Specific Ideas

- User shops primarily at Great Canadian Superstore — multi-store support designed with future grocery API integration in mind
- Budget is about total weekly food spend including takeout/restaurants, not just home-cooked meals
- "Cook" button on recipes is a key interaction — recording spend and (in Phase 17) deducting inventory
- Price entry should feel lightweight in recipe builder — optional, not blocking

</specifics>

<deferred>
## Deferred Ideas

- **Grocery store API integration** — Great Canadian Superstore / PC Express API for live ingredient prices (future phase after budget foundation)
- **Grocery order import** — Parse receipt/order data from online grocery orders to auto-populate food prices (future phase)
- **Ingredient deduction on cook** — When "Cook" is tapped, deduct ingredient quantities from inventory (Phase 17: Inventory Engine)
- **Price history/trends** — Track price changes over time, show "chicken was $4.50 last week" (future enhancement after food_prices is stable)

</deferred>

---

*Phase: 16-budget-engine-query-foundation*
*Context gathered: 2026-03-25*
