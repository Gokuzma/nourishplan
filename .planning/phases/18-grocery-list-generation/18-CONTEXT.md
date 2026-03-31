# Phase 18: Grocery List Generation - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

The app auto-generates a categorised grocery list from the active meal plan, subtracts what the household already has in inventory, and lets household members check off items while shopping. Includes budget validation against household weekly budget and basic retailer price lookup for price verification.

</domain>

<decisions>
## Implementation Decisions

### List Generation Logic
- **D-01:** On-demand generation — user clicks a "Generate Grocery List" button to snapshot the current plan. List is static until regenerated.
- **D-02:** Scope is the active meal plan week only (matches Plan page view).
- **D-03:** Already-cooked meals (marked via Cook button) are excluded from the grocery list.
- **D-04:** Ingredients are merged across recipes with smart unit conversion — same food merges even across compatible units (e.g., 500ml milk + 1L milk = 1.5L milk).
- **D-05:** Inventory subtraction displayed as split view: "Already Have" section (items fully/partially covered by inventory) and "Need to Buy" section (remainder to purchase).
- **D-06:** Each "Need to Buy" item shows estimated cost from food_prices table. Total estimated grocery cost shown at top. Items without prices show "?" but still appear.

### Budget Integration
- **D-07:** The grocery list is the budget-constrained artifact. If the "Need to Buy" total exceeds the household weekly budget, show a clear over-budget warning.
- **D-08:** Basic retailer price lookup included — allows users to check/verify prices from local retailers online. (Scope: simple integration for one or two store chains, not a full price comparison engine.)

### Store Categories & Sorting
- **D-09:** Fixed predefined categories: Produce, Dairy, Meat & Seafood, Bakery, Pantry/Dry Goods, Frozen, Beverages, Condiments & Spices, Snacks, Other.
- **D-10:** Auto-assign categories from USDA/CNF food group metadata with user override. Override persists for future lists.
- **D-11:** Items sorted alphabetically (A-Z) within each category.

### Shopping Experience
- **D-12:** Tap to check off items with a brief "Undo" toast notification to prevent accidental check-offs.
- **D-13:** Checked items move to the bottom of their category with strikethrough styling. Unchecked items stay at top.
- **D-14:** Real-time sync across household members via Supabase realtime subscriptions. When one member checks off an item, others see it update live.
- **D-15:** No auto-add to inventory when checking off — checking is purely for shopping tracking. Users add to inventory separately.

### Staple Restock
- **D-16:** Low-stock staple items (inventory items flagged as `is_staple`) appear mixed into the "Need to Buy" list with a "Restock" badge. No separate section.
- **D-17:** Claude's discretion on restock threshold logic — decide based on data model and what makes sense for typical staple quantities.

### Manual Additions
- **D-18:** Users can manually add free-text items to the grocery list (e.g., "paper towels", "birthday cake"). These are not linked to recipes or the food database.

### Claude's Discretion
- Restock threshold logic for staple items (D-17)
- Unit conversion rules and edge cases for smart merging
- Grocery list data model (grocery_lists + grocery_items tables, or single table, etc.)
- Category assignment heuristic when USDA/CNF food group data is missing
- Retailer price lookup implementation approach (API, scraping, link-out)
- Real-time subscription setup (Supabase channels)
- Query key structure for grocery hooks

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model & Types
- `src/types/database.ts` — InventoryItem type (food_id, quantity_remaining, unit, is_staple fields), FoodPrice type, MealPlan/MealPlanSlot types
- `supabase/migrations/` — existing table schemas for inventory_items, food_prices, meal_plans, meal_plan_slots, meal_items, recipe_ingredients

### Inventory Integration (Phase 17 handoff)
- `.planning/phases/17-inventory-engine/17-CONTEXT.md` §D-30, D-31 — inventory query interfaces for grocery list
- `src/hooks/useInventory.ts` — useInventoryItems() hook with location filtering
- `src/hooks/useInventoryDeduct.ts` — deduction logic (FIFO) for understanding inventory data model

### Budget Integration (Phase 16)
- `.planning/phases/16-budget-engine-query-foundation/16-CONTEXT.md` §D-06 through D-09 — food_prices table, multi-store support, cost normalisation
- `src/hooks/useFoodPrices.ts` — existing food price hooks
- `src/utils/cost.ts` — normaliseToCostPer100g utility

### Query Keys & Hooks Pattern
- `src/lib/queryKeys.ts` — centralised query key factory (inventory.*, budget.* patterns established)
- `src/hooks/useInventory.ts` — reference pattern for household-scoped hooks with queryKeys

### Meal Plan Data (generation source)
- `src/hooks/useMealPlan.ts` — meal plan query patterns
- `src/hooks/useRecipes.ts` — recipe data including ingredients

### UI Patterns
- `src/components/inventory/` — recent Phase 17 components for reference (ExpiryBadge, InventoryItemRow, etc.)
- `src/components/plan/PlanGrid.tsx` — Plan page where budget section already exists

### Requirements
- `.planning/REQUIREMENTS.md` §v2.0 — GROC-01 through GROC-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useInventoryItems()` hook — query inventory by location, already filters active items (removed_at IS NULL)
- `queryKeys.inventory.*` — established key pattern for inventory queries
- `food_prices` table + `useFoodPrices` hook — per-food pricing with multi-store support
- `normaliseToCostPer100g()` — cost normalisation utility for consistent pricing
- `ExpiryBadge` component — badge pattern reusable for "Restock" badge styling
- `InventoryItemRow` component — row layout pattern for list items
- Supabase realtime already available in the stack (used in auth context)

### Established Patterns
- Hooks: `useHousehold()` for householdId, `queryKeys.*` for cache keys, `enabled: !!householdId`
- Mutations: invalidate cache via prefix arrays
- Pages: `px-4 py-6 font-sans pb-[64px]` spacing
- Tabs: used in InventoryPage for Pantry/Fridge/Freezer — can reference for category tabs if needed

### Integration Points
- Sidebar/MobileDrawer — new "Grocery" nav item needed (update AppShell test assertions)
- Plan page — "Generate Grocery List" button or link
- Inventory hooks — query available quantities for subtraction
- food_prices hooks — query prices for cost estimates
- Supabase realtime channels — for live sync of check-off state

</code_context>

<specifics>
## Specific Ideas

- Budget is enforced at the grocery list level — the grocery list total is what gets compared against the weekly household budget. If over budget, the user needs to know clearly.
- Retailer price lookup: user wants ability to verify/check prices against local retailers online. Basic integration — not a full price comparison engine.
- Smart unit conversion for merging: 500ml + 1L = 1.5L type conversions across compatible units.

</specifics>

<deferred>
## Deferred Ideas

- Full multi-retailer price comparison engine — Phase 18 includes basic lookup only
- Price import from grocery store APIs/loyalty cards
- Recurring/scheduled grocery lists
- Store-specific aisle mapping

</deferred>

---

*Phase: 18-grocery-list-generation*
*Context gathered: 2026-03-30*
