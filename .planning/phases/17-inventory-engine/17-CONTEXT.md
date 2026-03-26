# Phase 17: Inventory Engine - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Household members can maintain a pantry/fridge/freezer inventory with quantities, units, expiry dates, storage locations, and purchase prices. Items are added via barcode scanning, food search, or manual entry. Cooking a recipe deducts ingredients from inventory (FIFO) and shows a receipt. The system tracks opened/unopened state, removal reasons (used vs discarded), and flags staple items for restock alerts. A dedicated Inventory page and Home page summary widget provide visibility into stock and expiry urgency.

</domain>

<decisions>
## Implementation Decisions

### Data Model
- **D-01:** Claude's discretion on ledger-based vs simple quantity tracking — pick based on plan deduction and leftover requirements
- **D-02:** Claude's discretion on food linking — pick based on how plan deduction and barcode scanning need to work (freeform + optional link vs strictly linked)
- **D-03:** Same food in different locations = separate inventory rows (e.g., chicken in fridge and freezer are two entries)
- **D-04:** Price stored in two places: `purchase_price` on the inventory item (what was paid) AND updates `food_prices` table (current market price for recipe cost calculations)
- **D-05:** Units support weight (g, kg), volume (ml, L), and discrete count (units/items)
- **D-06:** Track `purchased_at` date on each item (separate from expiry) — enables FIFO deduction and purchase history
- **D-07:** Track opened/unopened state on items — can adjust displayed expiry guidance
- **D-08:** Track removal reason: "Used" vs "Discarded" — feeds future waste tracking
- **D-09:** Items can be flagged as "staple" (spices, flour, sugar, etc.) — staples get low-stock restock alerts for grocery list

### Pricing & Cost Model
- **D-10:** Weekly budget on Plan page = grocery purchases only (new spend). Inventory items already owned do not count toward weekly budget.
- **D-11:** Per-meal/recipe cost = all ingredients at their prices (includes pantry items already owned). This is informational/tracking, separate from weekly spend.
- **D-12:** Price field is optional with nudge when adding inventory items ("Add price for cost tracking")

### Add-Item Experience
- **D-13:** Barcode scanning: in-app camera scanner using JS library (quagga2/zxing-js) + manual barcode entry fallback
- **D-14:** Barcode lookup auto-fills name, brand, nutrition, serving size from Open Food Facts API. User confirms/adjusts.
- **D-15:** Food search reuses existing FoodSearchOverlay component (same as recipe builder) for non-barcode adds
- **D-16:** Quick scan mode for bulk grocery unpacking — scan items in sequence, auto-add with defaults (quantity 1, no expiry), user edits details later
- **D-17:** Always create new inventory entry (no merge/duplicate detection). Simple, avoids merge logic.

### Inventory List & Expiry UX
- **D-18:** Three tabs by location: Pantry | Fridge | Freezer. Each tab shows items sorted by expiry.
- **D-19:** Claude's discretion on expiry visual treatment (color-coded badges vs banner + row styling) — fit the existing pastel theme
- **D-20:** Claude's discretion on inline editing vs detail modal — match existing app interaction patterns
- **D-21:** Claude's discretion on search/filter within inventory — decide based on expected inventory size
- **D-22:** Home page inventory summary widget: location counts at top ("Fridge: 12 | Freezer: 8 | Pantry: 15") + expiring-soon list below (top 3-5 items)

### Entry Points
- **D-23:** Dedicated Inventory page in nav (first-class section, like Recipes) + summary widget on Home page

### Plan Deduction & Leftovers
- **D-24:** Deduction happens on "Cook" button press (per-meal, tied to actual cooking). Phase 16's Cook button extended with inventory deduction.
- **D-25:** Auto-deduct exact amounts needed from inventory (no confirmation per ingredient)
- **D-26:** FIFO ordering — deduct from oldest purchased item first. Show user which specific item is being used (e.g., "Using chicken from Mar 20 purchase")
- **D-27:** Post-cook deduction receipt: show summary of what was deducted (e.g., "Deducted: 200g chicken, 100g rice, 2 eggs from Fridge")
- **D-28:** When ingredient has no matching inventory item, show in summary: "3 of 5 ingredients deducted. Missing: salt, olive oil"
- **D-29:** Leftovers: manual add as new inventory item marked as "leftover from [recipe]". No special post-cook prompt.

### Phase 18 Interface (Grocery List Handoff)
- **D-30:** Inventory exposes four query interfaces for Phase 18:
  1. Available quantity per food — "How much of food X does the household have?"
  2. Low-stock staple alerts — "Which staple items are below restock threshold?"
  3. Expiry-driven priority — "What items expire soon?" (influences meal plan suggestions)
  4. Purchase history — "What did we buy last time and at what price/store?"
- **D-31:** Grocery list (Phase 18) based on planned meals' ingredients minus inventory. Bulk staples get restock suggestions when low. Regular ingredients only appear if needed for planned meals.

### Claude's Discretion
- Data model: ledger-based vs simple quantity (D-01)
- Food linking approach (D-02)
- Expiry visual treatment (D-19)
- Inline editing vs detail modal (D-20)
- Search/filter within inventory (D-21)
- Query key naming for inventory hooks
- Inventory table schema (columns, indexes, RLS policies)
- Barcode scanner library choice (quagga2 vs zxing-js vs alternative)
- Default expiry estimates for leftovers and opened items

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model
- `src/types/database.ts` — All current TypeScript types; needs new InventoryItem type
- `supabase/migrations/004_food_recipe.sql` — Food/recipe table definitions and RLS patterns to follow
- `src/hooks/useFoodPrices.ts` — food_prices hook pattern, inventory price updates must integrate
- `src/hooks/useSpendLog.ts` — Spend logging pattern, Cook button deduction builds on this
- `src/utils/cost.ts` — Cost calculation utilities

### Query Infrastructure
- `src/lib/queryKeys.ts` — Centralised query key factory; add inventory keys here

### UI Components
- `src/components/food/FoodSearchOverlay.tsx` — Reuse for inventory food search (D-15)
- `src/pages/PlanPage.tsx` — Cook button lives here; extend with inventory deduction
- `src/pages/HomePage.tsx` — Add inventory summary widget
- `src/pages/SettingsPage.tsx` — Existing page structure patterns

### Phase 16 Foundation
- `.planning/phases/16-budget-engine-query-foundation/16-CONTEXT.md` — Budget decisions this phase builds on

### Requirements
- `.planning/REQUIREMENTS.md` §Inventory — INVT-01 through INVT-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FoodSearchOverlay.tsx` — Reuse for searching/adding foods to inventory without barcode
- `useSpendLog.ts` / `useFoodPrices.ts` — Pattern for household-scoped cost hooks; inventory hooks follow same pattern
- `queryKeys.ts` — Add `inventory` namespace for all new queries
- `cost.ts` — Cost calculation utils; extend for per-meal cost vs grocery-only spend distinction

### Established Patterns
- TanStack Query with household-scoped keys and centralised `queryKeys.ts`
- Supabase RLS with `get_user_household_id()` helper for household isolation
- Per-100g normalization for food data — inventory quantities need conversion for deduction matching
- Tab-based navigation pattern (existing in app)
- Toast notifications for feedback (use for deduction receipt)

### Integration Points
- New `inventory_items` table with RLS matching existing household isolation pattern
- "Cook" button on PlanPage/RecipePage extended to trigger inventory deduction
- New Inventory page added to app navigation
- Home page gets inventory summary widget section
- `food_prices` table updated when inventory items include purchase price

</code_context>

<specifics>
## Specific Ideas

- Spices, salt, pepper, flour, sugar etc. must be trackable as inventory items — flagged as "staples" for restock alerts
- Quick scan mode is important for real-world grocery unpacking workflow — scan many items fast, edit details later
- FIFO deduction should visually tell the user which specific item is being used ("Using chicken from Mar 20") — builds trust in the system
- Weekly budget is strictly grocery spend; per-meal cost is all ingredients — two different lenses on the same data
- Inventory items already in pantry don't count as new spend — only new purchases contribute to weekly budget

</specifics>

<deferred>
## Deferred Ideas

- **Waste tracking dashboard** — Aggregate "discarded" removal data into waste reports/trends. New phase in roadmap.
- **Recipe cooking instructions** — Adding step-by-step cooking directions to recipes. New capability, separate phase.
- **Grocery store API integration** — Auto-populate prices from store APIs (carried from Phase 16 deferred)
- **Smart meal suggestions based on expiring inventory** — "Use your chicken before Thursday" type suggestions (Phase 22 planning engine territory)

</deferred>

---

*Phase: 17-inventory-engine*
*Context gathered: 2026-03-25*
