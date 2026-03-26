# Phase 16: Budget Engine & Query Foundation - Research

**Researched:** 2026-03-25
**Domain:** TanStack Query key factory pattern, Supabase schema extension, cost-per-serving computation, spend tracking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Budget Display**
- D-01: Collapsible budget section below the weekly plan grid on the Plan page, expanded by default, showing weekly spend vs budget with per-day cost breakdown
- D-02: Cost per serving displayed as a subtitle line below recipe name on recipe cards and detail views (e.g., "$2.45/serving · 4 servings")
- D-03: Partial cost shown when not all ingredients are priced — display "$X.XX+ (3 of 5 priced)" indicator
- D-04: Budget amount editable from both Settings page (Household section) and inline on Plan page budget section
- D-05: Currency hardcoded to CAD ($) — no currency selection UI

**Cost Data Model**
- D-06: Global `food_prices` table (not per-ingredient on recipe) — one price per food item per store per household. Recipes compute cost by looking up each ingredient's current price from this table.
- D-07: Multi-store support — `food_prices` includes a store column so the same food can have different prices at different stores
- D-08: Per-household budget stored on the `households` table (single `weekly_budget` field)
- D-09: Price input supports either per-weight ("$4.50 per kg") or per-package ("$7.99 for 900g") — system normalises to cost_per_100g internally

**Cost Entry UX**
- D-10: Inline price prompt in recipe builder — when adding an ingredient with no price, show optional "Set price" field that saves to global food_prices table
- D-11: Dedicated "Food Prices" section in Settings page for bulk price management and seeing which foods are missing prices

**Spend Tracking**
- D-12: Plan page shows both planned/projected cost (from planned meals × ingredient prices) and actual spend (from cooked meals + logged food)
- D-13: "Cook" button on recipe view — tapping it records the recipe's ingredient cost as actual spend. Phase 17 will add ingredient deduction from inventory on top of this.
- D-14: Takeout/restaurant spend tracked through the existing food logging flow with a cost field added to log entries

**Query Key Centralisation**
- D-15: All-at-once migration: all existing hooks (8+ files) migrated from inline string arrays to centralised `src/lib/queryKeys.ts` in this phase
- D-16: Key factory pattern: `queryKeys.recipes.list(householdId)`, `queryKeys.foodLogs.byDate(householdId, date)`, etc.

### Claude's Discretion
- Query key naming convention and hierarchy structure
- Exact food_prices table schema (columns, indexes, RLS policies)
- How the price manager list/filter UI works in Settings
- How "Cook" button integrates with existing recipe detail view layout

### Deferred Ideas (OUT OF SCOPE)
- Grocery store API integration (Great Canadian Superstore / PC Express)
- Grocery order import (receipt/order parsing)
- Ingredient deduction on cook (Phase 17: Inventory Engine)
- Price history/trends
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUDG-01 | User can set a weekly household food budget | `households` table gets `weekly_budget numeric` column; Settings + inline Plan page edit via `useUpdateHousehold` mutation |
| BUDG-02 | Each recipe displays a computed cost per serving based on ingredient costs | `food_prices` table lookup by `ingredient_id`; cost_per_100g × ingredient quantity_grams / 100 / servings; CostBadge inline display |
| BUDG-03 | Plan page shows weekly spend vs budget with remaining balance | BudgetSummarySection below PlanGrid; planned cost from current week's meals × prices; actual spend from cook logs + food_log cost column |
| BUDG-04 | User can enter cost per unit/weight on recipe ingredients | InlinePriceEntry extension on IngredientRow; normalises to cost_per_100g; saves to global food_prices table |
</phase_requirements>

---

## Summary

Phase 16 has two distinct tracks that must be sequenced carefully:

**Track A — Query Key Foundation:** All 8+ existing hook files currently use inline string arrays as TanStack Query keys (`['recipes', householdId]`, `['meals', householdId]`, etc.). These are scattered with no single import contract. The key factory pattern — a `src/lib/queryKeys.ts` module exporting typed factory functions — is the industry standard for TanStack Query at scale. This migration must happen first (or in parallel as Wave 0) because every new v2.0 hook written in this phase and all subsequent phases must import from it. Doing it last would require another full migration sweep.

**Track B — Budget Engine:** Three new database objects (a `food_prices` table, a `weekly_budget` column on `households`, a `cost` column on `food_logs`, and a `spend_logs` or `recipe_cook_logs` table for cook events) plus associated hooks, utility functions, and UI components. The cost computation is pure arithmetic — no external service needed. Complexity lives in the data model decisions: price lookup is by `ingredient_id` (a text column that stores USDA numeric IDs, OFF barcodes, or custom food UUIDs), so `food_prices` must use the same `text` type for `food_id` to match.

**Primary recommendation:** Execute queryKeys.ts migration in Wave 0 (no new behaviour, pure refactor, low risk), then build the budget engine on top of the centralised key hierarchy in Waves 1–3.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | already installed | Query key factory, cache invalidation | Project dependency |
| supabase-js | already installed | DB mutations, RLS-gated reads | Project dependency |
| Tailwind CSS 4 | already installed | UI styling | Project convention |

No new npm dependencies required for this phase. All budget features are built with the existing stack.

### Key Inventory (current state before migration)

All existing query keys mapped from code reading:

| Hook file | Current key pattern |
|-----------|---------------------|
| `useRecipes.ts` | `['recipes', householdId]`, `['recipe', id]`, `['recipe-ingredients', recipeId]` |
| `useMeals.ts` | `['meals', householdId]`, `['meal', id]` |
| `useMealPlan.ts` | `['meal-plan', householdId, weekStart]`, `['meal-plan-slots', planId]` |
| `useCustomFoods.ts` | `['custom-foods', householdId]` |
| `useHousehold.ts` | `['household', userId]`, `['household', userId, 'members', householdId]`, `['household', userId, 'member_profiles', householdId]` |
| `useFoodSearch.ts` | `['food-search', 'usda', query]`, `['food-search', 'cnf', query]` |
| `useNutritionTargets.ts` | `['nutrition-targets', householdId]`, `['nutrition-target', householdId, memberId]` |
| `useFoodLogs.ts` | (not read — inferred from CONTEXT.md) `['food-logs', householdId, date, memberId]` |

New keys needed in this phase:
- `food-prices` — by householdId (+ optional store filter)
- `recipe-cost` — by recipeId (derived from food-prices + recipe-ingredients)
- `weekly-spend` — by householdId + weekStart
- `spend-logs` or `cook-logs` — by householdId + weekStart

---

## Architecture Patterns

### Recommended Project Structure

```
src/lib/
└── queryKeys.ts          # NEW — centralised key factory (Track A)

src/hooks/
├── useFoodPrices.ts      # NEW — food_prices CRUD
├── useWeeklySpend.ts     # NEW — spend vs budget for plan page
├── useSpendLog.ts        # NEW — cook events mutation
└── useHousehold.ts       # MODIFY — useUpdateHousehold mutation for weekly_budget
[all existing hooks]      # MODIFY — import keys from queryKeys.ts

src/utils/
└── cost.ts               # NEW — cost computation (cost_per_100g × grams / 100 / servings)

src/components/
├── plan/
│   └── BudgetSummarySection.tsx  # NEW — collapsible spend vs budget widget
├── recipe/
│   ├── IngredientRow.tsx         # MODIFY — add InlinePriceEntry extension
│   └── RecipeBuilder.tsx         # MODIFY — CookButton, CostBadge in recipe detail
└── settings/
    └── FoodPricesSection.tsx     # NEW — price management list in Settings

supabase/migrations/
└── 020_budget_engine.sql         # NEW — food_prices, households.weekly_budget,
                                  #       food_logs.cost, spend_logs
```

### Pattern 1: Key Factory Module

**What:** A single TypeScript module exporting an object of factory functions, each returning a typed readonly array.
**When to use:** Always — every `useQuery`/`useMutation` in the project imports from here.

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  household: {
    root: (userId: string) => ['household', userId] as const,
    members: (userId: string, householdId: string) =>
      ['household', userId, 'members', householdId] as const,
    memberProfiles: (userId: string, householdId: string) =>
      ['household', userId, 'member_profiles', householdId] as const,
  },
  recipes: {
    list: (householdId: string | undefined) => ['recipes', householdId] as const,
    detail: (id: string) => ['recipe', id] as const,
    ingredients: (recipeId: string) => ['recipe-ingredients', recipeId] as const,
    cost: (recipeId: string) => ['recipe-cost', recipeId] as const,
  },
  meals: {
    list: (householdId: string | undefined) => ['meals', householdId] as const,
    detail: (id: string) => ['meal', id] as const,
  },
  mealPlan: {
    root: (householdId: string | undefined, weekStart: string) =>
      ['meal-plan', householdId, weekStart] as const,
    slots: (planId: string | undefined) => ['meal-plan-slots', planId] as const,
  },
  customFoods: {
    list: (householdId: string | undefined) => ['custom-foods', householdId] as const,
  },
  foodSearch: {
    usda: (query: string) => ['food-search', 'usda', query] as const,
    cnf: (query: string) => ['food-search', 'cnf', query] as const,
  },
  nutritionTargets: {
    list: (householdId: string | undefined) => ['nutrition-targets', householdId] as const,
    detail: (householdId: string | undefined, memberId: string | undefined) =>
      ['nutrition-target', householdId, memberId] as const,
  },
  foodLogs: {
    byDate: (householdId: string | undefined, date: string, memberId?: string) =>
      ['food-logs', householdId, date, memberId] as const,
  },
  foodPrices: {
    list: (householdId: string | undefined) => ['food-prices', householdId] as const,
  },
  weeklySpend: {
    root: (householdId: string | undefined, weekStart: string) =>
      ['weekly-spend', householdId, weekStart] as const,
  },
  spendLogs: {
    byWeek: (householdId: string | undefined, weekStart: string) =>
      ['spend-logs', householdId, weekStart] as const,
  },
} as const
```

**Migration pattern for each hook:**
```typescript
// Before
queryKey: ['recipes', householdId]
// After
queryKey: queryKeys.recipes.list(householdId)

// Before
queryClient.invalidateQueries({ queryKey: ['recipes'] })
// After
queryClient.invalidateQueries({ queryKey: ['recipes'] })
// NOTE: partial key invalidation still works — TanStack Query matches prefix
// So ['recipes'] still invalidates ['recipes', householdId]
```

### Pattern 2: cost_per_100g Normalisation

**What:** All prices stored as cost per 100g regardless of how the user entered them. Matches existing nutrition data pattern.
**When to use:** At price save time — never store raw user input format.

```typescript
// src/utils/cost.ts
export function normaliseToCostPer100g(
  amount: number,        // e.g., 7.99
  quantityValue: number, // e.g., 900
  unit: 'g' | 'kg' | 'ml' | 'l' | 'unit'
): number {
  if (unit === 'kg') return (amount / (quantityValue * 1000)) * 100
  if (unit === 'g') return (amount / quantityValue) * 100
  // 'unit' pricing: store as-is — cost_per_100g = amount (caller passes grams/unit separately)
  return (amount / quantityValue) * 100
}

export function computeRecipeCostPerServing(
  ingredients: { quantity_grams: number; cost_per_100g: number | null }[],
  servings: number
): { costPerServing: number; pricedCount: number; totalCount: number } {
  let total = 0
  let pricedCount = 0
  for (const ing of ingredients) {
    if (ing.cost_per_100g != null) {
      total += (ing.quantity_grams / 100) * ing.cost_per_100g
      pricedCount++
    }
  }
  return {
    costPerServing: servings > 0 ? total / servings : 0,
    pricedCount,
    totalCount: ingredients.length,
  }
}
```

### Pattern 3: Database Schema for Budget Engine

**Migration number:** 020 (next after 019_add_meal_item_name.sql)

```sql
-- 020_budget_engine.sql

-- 1. Add weekly_budget to households
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS weekly_budget numeric;

-- 2. Global food price lookup table
CREATE TABLE IF NOT EXISTS public.food_prices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  food_id      text NOT NULL,          -- matches ingredient_id (text) in recipe_ingredients
  food_name    text NOT NULL,          -- denormalised for display in Settings price manager
  store        text NOT NULL DEFAULT '',
  cost_per_100g numeric NOT NULL CHECK (cost_per_100g >= 0),
  created_by   uuid NOT NULL REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, food_id, store)
);

ALTER TABLE public.food_prices ENABLE ROW LEVEL SECURITY;

-- RLS: household members read
CREATE POLICY "household members read food_prices"
  ON public.food_prices FOR SELECT TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- RLS: household members insert
CREATE POLICY "household members insert food_prices"
  ON public.food_prices FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
    AND created_by = (SELECT auth.uid())
  );

-- RLS: household members update
CREATE POLICY "household members update food_prices"
  ON public.food_prices FOR UPDATE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- RLS: household members delete
CREATE POLICY "household members delete food_prices"
  ON public.food_prices FOR DELETE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE TRIGGER food_prices_updated_at
  BEFORE UPDATE ON public.food_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Add cost column to food_logs (for takeout tracking, D-14)
ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS cost numeric;

-- 4. Spend log table (cook events, D-13)
CREATE TABLE IF NOT EXISTS public.spend_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  logged_by    uuid NOT NULL REFERENCES auth.users(id),
  log_date     date NOT NULL,
  week_start   date NOT NULL,
  source       text NOT NULL CHECK (source IN ('cook', 'food_log')),
  recipe_id    uuid,   -- null for food_log source
  amount       numeric NOT NULL CHECK (amount >= 0),
  is_partial   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spend_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members read spend_logs"
  ON public.spend_logs FOR SELECT TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "household members insert spend_logs"
  ON public.spend_logs FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
    AND logged_by = (SELECT auth.uid())
  );
```

### Pattern 4: Price Lookup Join Strategy

**Problem:** `food_prices` stores `food_id` (text). `recipe_ingredients` stores `ingredient_id` (text). Lookup on client side avoids a Postgres function.

**Client-side approach (recommended for this phase):**
```typescript
// In useFoodPrices hook — fetch all prices for household (typically < 100 rows)
// Then recipe cost computation joins in-memory:
function getPriceForIngredient(
  prices: FoodPrice[],
  ingredientId: string,
  preferredStore?: string
): number | null {
  const matching = prices.filter(p => p.food_id === ingredientId)
  if (matching.length === 0) return null
  if (preferredStore) {
    const storeMatch = matching.find(p => p.store === preferredStore)
    if (storeMatch) return storeMatch.cost_per_100g
  }
  // Default: use first available price (cheapest or most recent)
  return matching[0].cost_per_100g
}
```

**Why client-side:** Price table is small per household. No Supabase RPC needed. Consistent with existing pattern of client-side nutrition computation from snapshots.

### Anti-Patterns to Avoid

- **Storing cost_per_serving on the recipe table:** Makes costs stale when ingredients change. Always compute at render time from `food_prices` lookup.
- **Per-ingredient price on `recipe_ingredients`:** D-06 explicitly decided against this. Global `food_prices` means updating a price propagates to all recipes using that food.
- **New query key strings that diverge from factory:** All hooks after Wave 0 must use `queryKeys.*` — never add raw strings.
- **Invalidating overly broad keys on price save:** A price save should invalidate `food-prices` and `recipe-cost` — not `recipes` (the recipe list does not change).
- **Trying to use a Postgres view for cost computation:** The price table is small; client-side join is simpler and avoids view maintenance burden.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Partial key invalidation | Custom cache clearing logic | TanStack Query's built-in prefix matching | `invalidateQueries({ queryKey: ['recipes'] })` already invalidates all `['recipes', *]` entries |
| Currency formatting | Custom `$` string concat | Native `Intl.NumberFormat` | Handles rounding edge cases, locale-safe even if hardcoded to CAD |
| Week date boundaries for spend | Custom date math | Reuse `getWeekStart` from `src/utils/mealPlan.ts` | Already UTC-safe, established pattern |
| Price normalisation edge cases | Bespoke unit parser | Simple 3-case switch (g/kg/per-package) | The D-09 spec is exact — two input fields, not free-text unit parsing |

**Key insight:** TanStack Query's partial key invalidation is the mechanism that makes the key factory valuable — the factory ensures the prefix structure is always consistent so invalidation works predictably.

---

## Common Pitfalls

### Pitfall 1: ingredient_id Type Mismatch
**What goes wrong:** `food_prices.food_id` created as `uuid` instead of `text` — fails to match USDA numeric IDs (e.g., `"748967"`) and OFF barcode IDs.
**Why it happens:** The original schema decision (migration 007) widened `recipe_ingredients.ingredient_id` from `uuid` to `text`. The new `food_prices` table must match this.
**How to avoid:** Schema declares `food_id text NOT NULL` — confirmed by reading migration 007 and `RecipeIngredient.ingredient_id: string` in database.ts.
**Warning signs:** Price lookup always returns null despite prices existing in DB.

### Pitfall 2: Unique Constraint Collision on Upsert
**What goes wrong:** User enters a price for a food that already has a price at the same store — INSERT fails with unique violation.
**Why it happens:** `UNIQUE (household_id, food_id, store)` blocks duplicate inserts.
**How to avoid:** Use Supabase upsert with `onConflict: 'household_id,food_id,store'` in `useSaveFoodPrice` mutation. This matches the pattern used in `useAssignSlot` and `useCreateMealPlan`.
**Warning signs:** "duplicate key value" error in browser console when saving a price the second time.

### Pitfall 3: Stale cache after queryKeys.ts Migration
**What goes wrong:** A hook is partially migrated — queryKey changed in `useQuery` but `invalidateQueries` in a mutation still uses the old raw string. Cache is never invalidated after mutation.
**Why it happens:** The migration touches both the `queryKey:` line and every `invalidateQueries` call. Missing one leaves a cache coherence gap.
**How to avoid:** For each hook file, grep all `invalidateQueries` calls and verify they also use the factory. The factory functions return identical arrays to the previous raw arrays, so no behaviour change occurs — only the import source changes.
**Warning signs:** Data does not refresh after save; hard reload shows correct data.

### Pitfall 4: Households Query Missing weekly_budget
**What goes wrong:** `useHousehold` fetches `households(id, name, week_start_day, created_at)` — the new `weekly_budget` column is omitted from the select.
**Why it happens:** The Supabase joined select in `useHousehold` explicitly names columns. New columns are not auto-included.
**How to avoid:** Update the `useHousehold` select to add `weekly_budget` to the households join: `households(id, name, week_start_day, weekly_budget, created_at)`. Also add `weekly_budget?: number | null` to the `Household` type and `HouseholdWithName`.
**Warning signs:** `membership?.households?.weekly_budget` is always undefined even after setting a budget.

### Pitfall 5: Spend vs Budget Double-Counting
**What goes wrong:** Plan page adds food_log costs AND spend_log costs for the same meal, double-counting when a user both logs food and taps "Mark as Cooked" for the same recipe.
**Why it happens:** Two separate spend sources exist — `spend_logs` (cook events) and `food_logs.cost` (takeout). Without clear UI separation, users may trigger both.
**How to avoid:** Phase scope is: cook button records to `spend_logs`; takeout food logging records cost to `food_logs.cost`. The BudgetSummarySection sums both but these represent different meal events. Weekly spend query should use: `SUM(spend_logs.amount) + SUM(food_logs.cost)` filtered by week_start.
**Warning signs:** Weekly spend appears twice what it should be.

### Pitfall 6: Household type not extended before usage
**What goes wrong:** TypeScript error — `Property 'weekly_budget' does not exist on type 'Household'` in Settings or Plan page components.
**Why it happens:** `src/types/database.ts` `Household` type does not have `weekly_budget` until it is added.
**How to avoid:** Database.ts update (adding `weekly_budget?: number | null` to `Household`) must happen in Wave 0 alongside the migration — before any UI code references it.

---

## Code Examples

### queryKeys.ts — Partial Key Invalidation Still Works
```typescript
// Source: TanStack Query docs — key factory pattern
// After migration, broad invalidation still works via prefix matching:
queryClient.invalidateQueries({ queryKey: ['recipes'] })
// Matches: ['recipes', householdId], ['recipe', id], etc.
// i.e. queryKeys.recipes.list() starts with 'recipes' — still invalidated

// More precise invalidation (preferred):
queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) })
```

### Supabase Upsert for Food Price
```typescript
// useFoodPrices.ts — upsert pattern matching useAssignSlot
const { data, error } = await supabase
  .from('food_prices')
  .upsert(
    {
      household_id: householdId,
      food_id: ingredientId,
      food_name: ingredientName,
      store: store.trim(),
      cost_per_100g: normalisedCost,
      created_by: userId,
    },
    { onConflict: 'household_id,food_id,store' }
  )
  .select()
  .single()
```

### CostBadge Inline Display (no separate component)
```typescript
// Per UI-SPEC — inline <p> matching existing subtitle pattern
const { costPerServing, pricedCount, totalCount } = computeRecipeCostPerServing(ingredients, recipe.servings)
const isPartial = pricedCount < totalCount && pricedCount > 0
const hasAnyPrice = pricedCount > 0

// Render:
{hasAnyPrice && (
  <p className="text-xs text-text/50 font-sans">
    {isPartial
      ? `$${costPerServing.toFixed(2)}+/serving · (${pricedCount} of ${totalCount} priced)`
      : `$${costPerServing.toFixed(2)}/serving · ${recipe.servings} servings`
    }
  </p>
)}
```

### Weekly Spend Query
```typescript
// useWeeklySpend.ts — fetches both spend sources for the week
const { data: cookSpend } = await supabase
  .from('spend_logs')
  .select('amount')
  .eq('household_id', householdId)
  .eq('week_start', weekStart)

const { data: foodLogSpend } = await supabase
  .from('food_logs')
  .select('cost')
  .eq('household_id', householdId)
  .gte('log_date', weekStart)
  .lt('log_date', nextWeekStart)
  .not('cost', 'is', null)

const totalSpend =
  (cookSpend ?? []).reduce((sum, r) => sum + r.amount, 0) +
  (foodLogSpend ?? []).reduce((sum, r) => sum + (r.cost ?? 0), 0)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline string arrays as query keys | Key factory function pattern | TanStack Query v4+ conventions | Enables type-safe invalidation, prevents typos, single source of truth |
| Per-ingredient price stored on recipe | Global price lookup table | D-06 decision | Price updates propagate to all recipes automatically |

**Deprecated/outdated:**
- Raw `['recipes', householdId]` inline arrays: Replace with `queryKeys.recipes.list(householdId)` in Wave 0 migration.

---

## Open Questions

1. **useFoodLogs.ts query key pattern**
   - What we know: CONTEXT.md states pattern is `['food-logs', householdId, date, memberId]`
   - What's unclear: The actual hook file was not in the canonical refs list — file path not confirmed (may be `src/hooks/useFoodLogs.ts`)
   - Recommendation: Read `src/hooks/useFoodLogs.ts` at plan time to confirm key shape before writing the factory entry

2. **Store selector: how to populate datalist**
   - What we know: UI-SPEC says use `<datalist>` of existing stores for the household
   - What's unclear: Whether to fetch distinct stores via a Supabase `SELECT DISTINCT store` or derive from loaded food_prices
   - Recommendation: Derive from already-loaded `food_prices` query result (no extra DB call needed since the list is already fetched)

3. **Per-day cost breakdown in BudgetSummarySection**
   - What we know: D-01 says "per-day cost breakdown" shown as chips
   - What's unclear: Whether per-day cost is planned cost (from meal plan slots × ingredient prices) or actual spend (from spend_logs by day)
   - Recommendation: Show planned cost per day (derived from slot meals × prices, which is computed client-side from already-loaded data). Actual spend per day is a Phase 17+ enhancement.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code and schema changes. No new external tools, runtimes, or services are required beyond the existing Supabase project.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (inferred from Vite 7 + React 19 project) |
| Config file | check `vitest.config.ts` or `vite.config.ts` — see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUDG-01 | `weekly_budget` field saves and is readable | manual/integration | verify via Supabase dashboard + UI | N/A — migration |
| BUDG-02 | `computeRecipeCostPerServing` returns correct value for full and partial pricing | unit | `npx vitest run src/utils/cost.test.ts` | ❌ Wave 0 |
| BUDG-02 | Partial cost badge renders "+" and count | unit (component) | `npx vitest run src/components/recipe/` | ❌ Wave 0 |
| BUDG-03 | Weekly spend totals cook + food_log costs | unit | `npx vitest run src/utils/cost.test.ts` | ❌ Wave 0 |
| BUDG-04 | `normaliseToCostPer100g` handles g/kg/per-package cases | unit | `npx vitest run src/utils/cost.test.ts` | ❌ Wave 0 |
| D-15/D-16 | queryKeys factories return correct arrays | unit | `npx vitest run src/lib/queryKeys.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/utils/cost.test.ts src/lib/queryKeys.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/utils/cost.test.ts` — covers BUDG-02, BUDG-03, BUDG-04 (normalisation, cost-per-serving, partial count)
- [ ] `src/lib/queryKeys.test.ts` — verifies factory functions return expected arrays (regression guard for migration)
- [ ] Confirm test runner: check `package.json` scripts for `"test"` entry to verify Vitest is installed

---

## Sources

### Primary (HIGH confidence)
- Source code read directly: `src/hooks/useRecipes.ts`, `useMeals.ts`, `useMealPlan.ts`, `useHousehold.ts`, `useCustomFoods.ts`, `useFoodSearch.ts`, `useNutritionTargets.ts`
- Source code read directly: `src/types/database.ts`, `src/components/recipe/IngredientRow.tsx`, `src/components/recipe/RecipeBuilder.tsx`
- Migration files: `004_food_recipe.sql`, numbered sequence 001–019 confirmed
- `.planning/phases/16-budget-engine-query-foundation/16-CONTEXT.md` — decisions D-01 through D-16
- `.planning/phases/16-budget-engine-query-foundation/16-UI-SPEC.md` — component visual contracts
- `.planning/STATE.md` — v2.0 decisions (cost_per_100g, ingredient_id text type)

### Secondary (MEDIUM confidence)
- TanStack Query key factory pattern — standard documented pattern in TanStack Query v4/v5 docs; confirmed from STATE.md decision `queryKeys.ts centralised before any v2.0 feature queries`

### Tertiary (LOW confidence)
- Vitest as test framework inferred from Vite 7 project and Vitest being standard for Vite projects — not confirmed by reading `package.json` directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all existing
- Architecture: HIGH — key factory pattern is direct and verified; schema decisions match existing patterns
- Pitfalls: HIGH — ingredient_id type mismatch documented in STATE.md; others derived from direct code reading
- Test framework: MEDIUM — Vitest inferred, not confirmed from package.json

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable stack, 30-day window appropriate)
