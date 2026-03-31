# Phase 18: Grocery List Generation - Research

**Researched:** 2026-03-30
**Domain:** Grocery list generation, Supabase realtime, unit conversion, inventory subtraction
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** On-demand generation — user clicks "Generate Grocery List" to snapshot the current plan. List is static until regenerated.
- **D-02:** Scope is the active meal plan week only.
- **D-03:** Already-cooked meals (marked via Cook button) are excluded from the grocery list.
- **D-04:** Ingredients merged across recipes with smart unit conversion (e.g., 500ml milk + 1L milk = 1.5L milk).
- **D-05:** Split view: "Already Have" (items fully/partially covered by inventory) and "Need to Buy" (remainder).
- **D-06:** Each "Need to Buy" item shows estimated cost from food_prices table. Total at top. Missing prices show "?".
- **D-07:** Grocery list is the budget-constrained artifact — over-budget warning if "Need to Buy" total exceeds weekly_budget.
- **D-08:** Basic retailer price lookup — simple integration for one or two store chains, not a full price comparison engine.
- **D-09:** Fixed predefined categories: Produce, Dairy, Meat & Seafood, Bakery, Pantry/Dry Goods, Frozen, Beverages, Condiments & Spices, Snacks, Other.
- **D-10:** Auto-assign categories from USDA/CNF food group metadata with user override. Override persists for future lists.
- **D-11:** Items sorted alphabetically within each category.
- **D-12:** Tap to check off items with a brief "Undo" toast.
- **D-13:** Checked items move to the bottom of their category with strikethrough styling.
- **D-14:** Real-time sync across household members via Supabase realtime subscriptions.
- **D-15:** No auto-add to inventory when checking off.
- **D-16:** Low-stock staple items appear mixed into "Need to Buy" with a "Restock" badge.
- **D-17:** Claude's discretion on restock threshold logic.
- **D-18:** Users can manually add free-text items.

### Claude's Discretion

- Restock threshold logic for staple items (D-17)
- Unit conversion rules and edge cases for smart merging
- Grocery list data model (grocery_lists + grocery_items tables, or single table, etc.)
- Category assignment heuristic when USDA/CNF food group data is missing
- Retailer price lookup implementation approach (API, scraping, link-out)
- Real-time subscription setup (Supabase channels)
- Query key structure for grocery hooks

### Deferred Ideas (OUT OF SCOPE)

- Full multi-retailer price comparison engine
- Price import from grocery store APIs/loyalty cards
- Recurring/scheduled grocery lists
- Store-specific aisle mapping
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GROC-01 | Grocery list is auto-generated from the active meal plan's ingredients | Generation algorithm: traverse meal_plan_slots → meals → meal_items → recipe_ingredients; aggregate quantities by food_id |
| GROC-02 | Grocery list subtracts items already in inventory ("have" vs "need to buy") | `getAvailableQuantity()` and `computeFifoDeductions()` already exist in `src/utils/inventory.ts` — reuse directly |
| GROC-03 | Grocery list items are grouped by store category (produce, dairy, etc.) | Fixed 10-category taxonomy; auto-assign from food group metadata; persist user overrides in `grocery_item_category_overrides` table |
| GROC-04 | User can check off grocery items in-store | Check state stored in `grocery_items.is_checked`; Supabase realtime subscription syncs across household members |
| GROC-05 | Grocery list can be shared with household members | RLS on `grocery_lists` and `grocery_items` uses household_id; existing household isolation pattern applies |
</phase_requirements>

---

## Summary

Phase 18 adds a grocery list feature that auto-generates from the active meal plan, subtracts inventory, categorises items, and syncs check-off state in real-time across household members. All core building blocks already exist in the codebase: inventory query utilities (`getAvailableQuantity`, `computeFifoDeductions`), food price hooks (`useFoodPrices`, `getPriceForIngredient`), meal plan hooks (`useMealPlan`, `useMealPlanSlots`), and the full household isolation pattern. The primary new work is: (1) a grocery list database schema with two tables, (2) a generation algorithm that traverses meal plan → meals → recipe ingredients, (3) Supabase realtime subscription setup (not previously used in the app), and (4) the GroceryPage UI and supporting components.

The most complex algorithmic challenge is smart unit merging across recipes — 500ml milk + 1L milk must aggregate to 1.5L. This requires a unit normalisation pass (convert everything to a canonical unit: ml for liquids, g for weights) before summing, then format the display in the most human-readable unit.

Supabase realtime has never been used in this app before (grep confirms zero `supabase.channel` calls). The setup pattern is straightforward: `supabase.channel('grocery-{householdId}').on('postgres_changes', ...).subscribe()`. The key concern is cleanup on component unmount via `channel.unsubscribe()`.

**Primary recommendation:** Two-table data model (`grocery_lists` + `grocery_items`) with snapshot generation, not live computation. Check state and manual items live in `grocery_items`. Realtime subscription watches `grocery_items` for changes by other household members.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | installed | Database + realtime channels | Already in project; realtime is a first-class feature |
| @tanstack/react-query | installed | Server state management | Already in project; established queryKeys pattern |
| react-router-dom v7 | installed | Routing, `/grocery` route | Already in project |
| Tailwind CSS 4 | installed | Styling with @theme tokens | Already in project; no new classes needed |

No new packages required. All dependencies are already in place.

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── pages/
│   └── GroceryPage.tsx            # Main page, orchestrates all hooks
├── components/grocery/
│   ├── GroceryCategorySection.tsx # Collapsible category group
│   ├── GroceryItemRow.tsx         # Individual item row with check-off
│   ├── GroceryAlreadyHaveSection.tsx  # Collapsible "Already Have" section
│   ├── BudgetWarningBanner.tsx    # Over-budget warning
│   └── ManualAddItemInput.tsx     # Inline text input
├── hooks/
│   ├── useGroceryList.ts          # Query: fetch grocery_lists for current week
│   ├── useGroceryItems.ts         # Query: fetch grocery_items + realtime subscription
│   ├── useGenerateGroceryList.ts  # Mutation: generate snapshot
│   ├── useToggleGroceryItem.ts    # Mutation: check/uncheck item
│   └── useAddManualGroceryItem.ts # Mutation: add free-text item
├── utils/
│   └── groceryGeneration.ts       # Pure functions: aggregate, merge units, subtract inventory
└── supabase/migrations/
    └── 022_grocery_list.sql       # grocery_lists + grocery_items tables
```

### Pattern 1: Grocery List Data Model

Two tables. `grocery_lists` is the snapshot header (one per household per week). `grocery_items` holds all items — both generated and manually added — with check state.

```sql
-- grocery_lists: one snapshot per household per week
CREATE TABLE public.grocery_lists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start   date NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE (household_id, week_start)
);

-- grocery_items: line items (generated + manual)
CREATE TABLE public.grocery_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id         uuid NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  household_id    uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  food_name       text NOT NULL,
  food_id         text,               -- null for manual items
  quantity        numeric,            -- null for manual items
  unit            text,               -- 'g'|'kg'|'ml'|'L'|'units'|null
  category        text NOT NULL DEFAULT 'Other',
  category_source text NOT NULL DEFAULT 'auto',  -- 'auto'|'user'
  is_checked      boolean NOT NULL DEFAULT false,
  checked_by      uuid REFERENCES auth.users(id),
  checked_at      timestamptz,
  is_manual       boolean NOT NULL DEFAULT false,
  notes           text,               -- "Added by you" for manual items
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

**Rationale:** `UNIQUE (household_id, week_start)` on `grocery_lists` enforces one list per week per household. Regenerating upserts the `grocery_lists` row (resetting `generated_at`) and deletes+reinserts all non-manual `grocery_items`. Manual items are preserved across regeneration (filter by `is_manual = true` before delete).

### Pattern 2: Category Override Persistence

User category overrides (D-10) should persist for future lists. Two options:

**Option A (simpler):** Store `category_source='user'` in `grocery_items`. On regeneration, re-apply overrides by looking up previous items for the same `food_id` with `category_source='user'`.

**Option B:** Separate `grocery_category_overrides` table keyed by `(household_id, food_id)`.

**Recommendation:** Option A. The override lookup is: before inserting a new item, check if any previous `grocery_items` row for this `food_id` in this household has `category_source='user'` — if so, use that category. This avoids a third table while satisfying D-10.

### Pattern 3: Generation Algorithm

```typescript
// Source: project pattern — groceryGeneration.ts (to be created)

// Step 1: Collect all recipe_ingredients from non-cooked meal plan slots
// Step 2: Aggregate by food_id (or food_name if food_id null) with unit normalisation
// Step 3: Subtract inventory using getAvailableQuantity()
// Step 4: Split into "Need to Buy" (remainder > 0) and "Already Have" (fully covered)
// Step 5: Assign categories + apply previous user overrides
// Step 6: Add low-stock staples (getLowStockStaples()) with is_staple badge
// Step 7: Persist to grocery_lists + grocery_items tables

interface AggregatedIngredient {
  food_id: string | null
  food_name: string
  quantity_g: number          // normalised to grams/ml for arithmetic
  display_unit: string        // human-readable unit for display
  display_quantity: number    // amount in display_unit
  category: string
  category_source: 'auto' | 'user'
}
```

### Pattern 4: Unit Merging

The existing `convertToGrams()` from `src/utils/inventory.ts` handles g/kg/ml/L/units. Recipe ingredients use `quantity_grams` (always stored as grams). The merge challenge is display formatting:

- If total > 1000g: display as kg (e.g., 1500g → 1.5 kg)
- If total > 1000ml: display as L (e.g., 1500ml → 1.5 L)
- Distinguish weight (g/kg) from volume (ml/L) by food category or ingredient_type

**Key insight:** `recipe_ingredients.quantity_grams` is always grams (for weight ingredients). Merging is simple addition. The "smart unit" aspect is only in display formatting after summing.

**Edge case:** When recipe A uses milk in ml and recipe B uses milk in g — these are incompatible units. The generation algorithm should normalise to grams as the canonical unit and display the total in the most appropriate unit. If units genuinely conflict (solid vs liquid), treat as separate line items.

### Pattern 5: Supabase Realtime Subscription

Supabase realtime is not currently used in the app — this is the first use. The pattern:

```typescript
// Source: Supabase docs — postgres_changes subscription
useEffect(() => {
  if (!listId) return
  const channel = supabase
    .channel(`grocery-items-${listId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'grocery_items',
        filter: `list_id=eq.${listId}`,
      },
      (payload) => {
        // Invalidate or optimistically update TanStack Query cache
        queryClient.invalidateQueries({ queryKey: queryKeys.grocery.items(listId) })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [listId, queryClient])
```

**Important:** Supabase realtime requires the table to have `REPLICA IDENTITY FULL` set, OR the table needs to be enabled for realtime in the Supabase dashboard. For `UPDATE` events, Postgres default replica identity only sends new values (not old). For check-off toggle, new values are sufficient. Enable realtime via migration:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_items;
```

**Alternative without REPLICA IDENTITY FULL:** The `UPDATE` payload includes `new` (the new row) which is sufficient for check-off sync. No need for `old` values.

### Pattern 6: Restock Threshold Logic (D-17 Discretion)

`getLowStockStaples(items, thresholdGrams)` already exists in `src/utils/inventory.ts` with a default threshold of 100g. Recommendation: use 100g as the default threshold (existing codebase convention). Restock items are low-stock staples (is_staple=true AND quantity < 100g equivalent) that do NOT appear in the current meal plan. They are injected into the "Need to Buy" section with `is_staple_restock=true` flag at generation time.

### Pattern 7: Category Auto-Assignment

USDA food groups map to store categories. Without querying live USDA data during generation (expensive), use food_name heuristics as fallback. A lookup table approach:

```typescript
// Keyword → category mapping (fallback when no USDA food group)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Produce': ['apple', 'banana', 'carrot', 'tomato', 'spinach', 'lettuce', /* ... */],
  'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', /* ... */],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'salmon', 'shrimp', /* ... */],
  // etc.
}
```

This is LOW confidence as a complete solution — a short keyword list will miss many items. Default to 'Other' when no match. User override (D-10) corrects mistakes.

### Pattern 8: Retailer Price Lookup (D-08)

The deferred decision: simple link-out is the lowest-risk approach. Options:
1. **Link-out (recommended):** Generate a Google Shopping or store website search URL for the item name. No API key required, no scraping. Users tap the item to open the retailer search in a new tab.
2. **Hardcoded store search URLs:** e.g., `https://www.walmart.ca/search?q={food_name}`, `https://www.costco.ca/s?keyword={food_name}`.

Link-out avoids API dependencies, rate limits, and CORS issues. Implemented as a small "🔍" icon on each GroceryItemRow that opens an external search URL.

### Anti-Patterns to Avoid

- **Live computation on render:** Do not recompute the grocery list from meal plan + inventory on every render. Snapshot it to the DB on generation (D-01). Subsequent renders query the snapshot.
- **Querying recipe_ingredients inside GroceryPage:** All ingredient data needed for generation should be fetched once in the generation mutation, not split across multiple hooks called in the page component.
- **Realtime without cleanup:** Failing to call `supabase.removeChannel(channel)` on unmount causes memory leaks and stale subscriptions. Always return cleanup from useEffect.
- **Breaking prefix invalidation:** New query keys must follow the `['grocery', householdId, ...]` prefix pattern so `queryClient.invalidateQueries({ queryKey: ['grocery', householdId] })` clears all grocery queries.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Inventory availability check | Custom availability logic | `getAvailableQuantity()` in `src/utils/inventory.ts` | Already tested, handles FIFO, unit conversion, removed items |
| FIFO deduction for "Already Have" calc | Custom deduction logic | `computeFifoDeductions()` in `src/utils/inventory.ts` | Already handles multi-item FIFO, unit='units' edge case |
| Weight/volume conversion | Custom unit math | `convertToGrams()` in `src/utils/inventory.ts` | Already handles g/kg/ml/L/units, returns null for 'units' |
| Cost per 100g normalisation | Custom price math | `normaliseToCostPer100g()` in `src/utils/cost.ts` | Already handles g/kg/ml/l units |
| Price lookup | Custom price resolution | `getPriceForIngredient()` in `src/hooks/useFoodPrices.ts` | Already handles multi-store, preferred store, returns null |
| Low-stock detection | Custom threshold logic | `getLowStockStaples()` in `src/utils/inventory.ts` | Already tested with 100g default threshold |
| Cost formatting | Custom format fn | `formatCost()` in `src/utils/cost.ts` | Already formats as CAD `$X.XX` |

**Key insight:** Phase 17 built all the inventory utilities specifically to support this phase (confirmed by `.planning/phases/17-inventory-engine/17-CONTEXT.md` §D-30, D-31). The generation algorithm primarily orchestrates existing utilities.

---

## Common Pitfalls

### Pitfall 1: Recipe Ingredients vs. Meal Items

**What goes wrong:** Confusing `meal_items` (the foods/recipes in a meal) with `recipe_ingredients` (the foods inside a recipe). For grocery generation, you need `recipe_ingredients`, not `meal_items`.

**Why it happens:** The data model has two layers: MealItem (top-level food/recipe in a meal) and RecipeIngredient (ingredient inside a recipe). Grocery items come from recipe_ingredients of any recipes referenced in meal_items.

**How to avoid:** Generation traversal: `meal_plan_slots → meal_items (where item_type='recipe') → recipe_ingredients`. MealItems with `item_type='food'` are also ingredients (direct foods logged to a meal).

**Warning signs:** If the grocery list is too short or missing items, check whether recipe-type meal items are being traversed to their recipe_ingredients.

### Pitfall 2: Nested Recipes

**What goes wrong:** A recipe can have another recipe as an ingredient (`ingredient_type='recipe'` in `recipe_ingredients`). A naive one-level traversal misses sub-recipe ingredients.

**Why it happens:** Phase 2 decision: polymorphic `recipe_ingredients.ingredient_id` with `ingredient_type` discriminator allows recipe nesting (RECP-04).

**How to avoid:** Use recursive ingredient resolution. If a recipe_ingredient has `ingredient_type='recipe'`, fetch that sub-recipe's ingredients recursively. Set a recursion depth limit (e.g., 5 levels) to prevent infinite loops.

**Warning signs:** Grocery list missing ingredients that exist only in sub-recipes.

### Pitfall 3: Supabase Realtime Requires Table Publication

**What goes wrong:** Subscribing to `postgres_changes` for `grocery_items` silently produces no events if the table is not added to the `supabase_realtime` publication.

**Why it happens:** Supabase realtime only broadcasts changes for tables explicitly added to the publication (or enabled via the dashboard). This is a DB-level setting, not a client-side concern.

**How to avoid:** Add to migration 022:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_items;
```

**Warning signs:** Channel connects (no error) but UPDATE events never fire when another member checks off an item.

### Pitfall 4: Regeneration Wipes Checked State

**What goes wrong:** Regenerating the grocery list deletes all grocery_items rows, losing which items were checked off.

**Why it happens:** D-01 says the list is a snapshot regenerated on demand. D-13 shows checked items stay at bottom. On regenerate, the user is warned "checked items will be reset" (per UI-SPEC copywriting).

**How to avoid:** Regeneration flow: (1) show inline confirm warning per UI-SPEC, (2) on confirm: upsert grocery_lists row, delete non-manual grocery_items, re-insert freshly generated items with is_checked=false, (3) preserve manual items (is_manual=true). This matches D-01's "static snapshot" model.

**Warning signs:** Users complain checked items disappear unexpectedly — that's intentional per the confirmed design, but the warning must be shown.

### Pitfall 5: AppShell Test Failure

**What goes wrong:** After adding "Grocery" nav item to Sidebar, `tests/AppShell.test.tsx` fails because the test asserts exactly 8 nav items by name.

**Why it happens:** The Sidebar test at line 44 (`'Sidebar renders 8 navigation items including...'`) checks specific nav labels. Adding "Grocery" changes the count.

**How to avoid:** Update AppShell test in the same task that modifies Sidebar and MobileDrawer. The test currently asserts: Home, Recipes, Meals, Plan, Inventory, Household, Settings, User Guide. After adding Grocery, update to assert 9 items including "Grocery".

**Warning signs:** `npx vitest run tests/AppShell.test.tsx` fails immediately after nav changes.

### Pitfall 6: food_prices Table Uses `cost_per_100g` Not Per-Serving

**What goes wrong:** Computing grocery item cost requires knowing the ingredient quantity_grams from recipe_ingredients, then multiplying by `cost_per_100g / 100`. Using the price directly without the per-100g scaling produces wildly wrong costs.

**Why it happens:** Phase 16 decision: all prices stored as `cost_per_100g` for consistent comparison across different package sizes. The `normaliseToCostPer100g()` utility normalises user-entered prices to this format.

**How to avoid:** Item cost = `(quantity_grams / 100) * cost_per_100g`. This is the same formula used in `computeRecipeCostPerServing()` in `src/utils/cost.ts`.

### Pitfall 7: MealPlanSlot `meal_id` Can Be Null

**What goes wrong:** Generation crashes on null `meal_id` slots.

**Why it happens:** `MealPlanSlot.meal_id` is nullable (empty slots have `meal_id = null`). The `useMealPlanSlots` query returns all slots including empty ones.

**How to avoid:** Filter slots: `slots.filter(s => s.meal_id !== null && s.meals !== null)` before traversing to meal_items.

---

## Code Examples

### Existing Utilities to Reuse

```typescript
// Source: src/utils/inventory.ts
// Check total available quantity for a food_id (in grams/ml)
getAvailableQuantity(inventoryItems, foodId)  // returns number (grams)

// Check low-stock staples
getLowStockStaples(inventoryItems, 100)  // threshold: 100g

// Source: src/hooks/useFoodPrices.ts
// Look up price for an ingredient
getPriceForIngredient(prices, foodId)  // returns cost_per_100g or null

// Source: src/utils/cost.ts
// Compute item cost
const itemCost = (quantity_grams / 100) * cost_per_100g
formatCost(itemCost)  // "$X.XX"
```

### Supabase Realtime Setup (first use in project)

```typescript
// Source: Supabase docs — postgres_changes for UPDATE events
// Pattern for useGroceryItems hook
useEffect(() => {
  if (!listId || !householdId) return

  const channel = supabase
    .channel(`grocery-items-${listId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'grocery_items',
        filter: `list_id=eq.${listId}`,
      },
      (_payload) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.grocery.items(listId),
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [listId, householdId, queryClient])
```

### Query Key Pattern (follow existing convention)

```typescript
// Add to src/lib/queryKeys.ts
grocery: {
  list: (householdId: string | undefined, weekStart: string) =>
    ['grocery', householdId, weekStart] as const,
  items: (listId: string | undefined) =>
    ['grocery-items', listId] as const,
},
```

### Generation Traversal Skeleton

```typescript
// groceryGeneration.ts — pure function, no hooks
export async function generateGroceryItems(
  slots: SlotWithMeal[],
  inventoryItems: InventoryItem[],
  foodPrices: FoodPrice[],
  previousItems: GroceryItem[]  // for category override lookup
): Promise<AggregatedIngredient[]> {
  // 1. Filter cooked slots (D-03): exclude slots marked as cooked
  // 2. Flatten: collect all recipe_ingredients from recipe-type meal_items
  //    Also collect food-type meal_items as direct ingredients
  // 3. Aggregate by food_id (null → group by food_name case-insensitive)
  //    Sum quantity_grams; track source recipe names
  // 4. Subtract inventory: getAvailableQuantity() per food_id
  // 5. Split: "Need to Buy" (need > 0) vs "Already Have" (fully covered)
  // 6. Assign categories: check previousItems for user overrides, else auto-assign
  // 7. Add low-stock staples not already in the list
  // 8. Return typed list ready to insert into grocery_items
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual grocery lists | Auto-generated from meal plan | Phase 18 (this phase) | First time this feature exists |
| No realtime in app | Supabase realtime channels | Phase 18 (this phase) | First use of realtime subscriptions |

**No existing grocery list state to migrate.** This is a greenfield feature — no runtime state inventory needed.

---

## Open Questions

1. **Cook button exclusion (D-03)**
   - What we know: D-03 says "already-cooked meals are excluded from the grocery list"
   - What's unclear: The `meal_plan_slots` schema has no `is_cooked` column. Phase 17 introduced a "Cook" button but the cooked state may be tracked differently. Need to verify: is there a `cooked_at` column on `meal_plan_slots`, or is it tracked via `spend_logs`?
   - Recommendation: Read the Phase 17 implementation to find where the "Cook" button stores state before implementing the exclusion filter. If the field doesn't exist yet, the generation algorithm can skip this filter in Wave 0 and add it once confirmed.

2. **Nested recipe traversal depth**
   - What we know: `recipe_ingredients.ingredient_type='recipe'` enables nesting (RECP-04). No depth limit is documented.
   - What's unclear: In practice, how deep are household recipe stacks? Infinite recursion is theoretically possible.
   - Recommendation: Implement with a depth limit of 5 levels with a console.warn at the limit. Document the limit in code comments.

3. **Retailer price lookup implementation**
   - What we know: D-08 says "basic integration for one or two store chains, not a full price comparison engine"
   - What's unclear: Whether this means a link-out URL, a hardcoded search URL template, or something else.
   - Recommendation: Implement as a link-out: tap an icon on a grocery item row → opens `https://www.google.com/search?q=buy+{food_name}+grocery` in a new tab. Zero API dependency, works immediately. The planner can confirm or refine this in PLAN.md.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond the existing Supabase stack, which is already in production use).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (jsdom environment) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/utils/groceryGeneration.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GROC-01 | Ingredients aggregated from meal plan slots | unit | `npx vitest run src/utils/groceryGeneration.test.ts` | ❌ Wave 0 |
| GROC-01 | Empty slots (null meal_id) are skipped | unit | `npx vitest run src/utils/groceryGeneration.test.ts` | ❌ Wave 0 |
| GROC-01 | Quantities for same food_id are summed | unit | `npx vitest run src/utils/groceryGeneration.test.ts` | ❌ Wave 0 |
| GROC-02 | "Already Have" items fully covered by inventory | unit | `npx vitest run src/utils/groceryGeneration.test.ts` | ❌ Wave 0 |
| GROC-02 | "Need to Buy" shows partial remainder when inventory partially covers | unit | `npx vitest run src/utils/groceryGeneration.test.ts` | ❌ Wave 0 |
| GROC-03 | Items sorted alphabetically within category | unit | `npx vitest run src/utils/groceryGeneration.test.ts` | ❌ Wave 0 |
| GROC-04 | Check-off mutation sets is_checked=true | manual-only | — | N/A — requires live Supabase |
| GROC-04 | Undo toast reverts check state | manual-only | — | N/A — requires DOM timing |
| GROC-05 | Grocery items visible to all household members | manual-only | — | N/A — requires RLS test |

### Sampling Rate
- **Per task commit:** `npx vitest run src/utils/groceryGeneration.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/utils/groceryGeneration.test.ts` — covers GROC-01, GROC-02, GROC-03 unit logic
- [ ] Framework install: none required — Vitest already installed

---

## Project Constraints (from CLAUDE.md)

The following directives from CLAUDE.md apply to this phase:

- **Hook pattern:** `useHousehold()` for householdId, `queryKeys.*` for cache keys, `enabled: !!householdId`
- **Mutation invalidation:** invalidate via prefix arrays (e.g., `['grocery', householdId]`)
- **Page spacing:** `px-4 py-6 font-sans pb-[64px]`
- **queryKeys.ts is risky:** Any changes to `src/lib/queryKeys.ts` affect every hook — add grocery keys carefully without altering existing keys
- **Sidebar/MobileDrawer nav count:** Adding "Grocery" nav item requires updating `tests/AppShell.test.tsx` — the test currently asserts 8 nav items in Sidebar (Home, Recipes, Meals, Plan, Inventory, Household, Settings, User Guide)
- **No new top-level directories without discussion:** `src/components/grocery/` follows the existing per-feature pattern (same as `src/components/inventory/`)
- **Minimal diffs:** Do not refactor adjacent code; only add what Phase 18 needs
- **After worktree merges:** Run `npm install` and clean worktrees before running vitest

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/utils/inventory.ts` — all inventory utility functions verified by reading source
- Direct code inspection: `src/hooks/useInventory.ts`, `src/hooks/useFoodPrices.ts`, `src/hooks/useMealPlan.ts` — hook patterns confirmed
- Direct code inspection: `src/lib/queryKeys.ts` — existing query key structure confirmed
- Direct code inspection: `src/types/database.ts` — all TypeScript types confirmed
- Direct code inspection: `supabase/migrations/020_budget_engine.sql`, `021_inventory.sql` — DB schema confirmed
- Direct code inspection: `tests/AppShell.test.tsx` — test assertions on nav count confirmed (line 44: "8 navigation items")
- Direct code inspection: `src/components/layout/Sidebar.tsx`, `MobileDrawer.tsx` — current nav items confirmed

### Secondary (MEDIUM confidence)
- Supabase realtime `postgres_changes` subscription pattern — standard documented approach; zero existing usage in project confirmed by grep

### Tertiary (LOW confidence)
- Category keyword heuristic for auto-assignment — heuristic-based, will have gaps; user override (D-10) is the correction mechanism

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already in project, versions confirmed
- Architecture: HIGH — data model follows established project patterns; realtime pattern is documented Supabase feature
- Pitfalls: HIGH — most derived from direct code inspection of actual codebase
- Test strategy: HIGH — Vitest already configured; utility function test pattern follows `src/utils/inventory.test.ts`

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack; Supabase realtime API is mature)
