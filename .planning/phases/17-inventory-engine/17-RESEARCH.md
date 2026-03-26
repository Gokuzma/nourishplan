# Phase 17: Inventory Engine - Research

**Researched:** 2026-03-25
**Domain:** Pantry/fridge/freezer inventory with barcode scanning, FIFO deduction, expiry tracking
**Confidence:** HIGH

## Summary

Phase 17 introduces a household pantry/inventory system. Inventory items are added via barcode scan, food search reuse (FoodSearchOverlay), or manual entry. Each item carries quantity, unit, storage location, expiry date, purchase date, purchase price, opened state, staple flag, and removal reason. The Cook button on PlanPage is extended to auto-deduct ingredients via FIFO and show a post-cook receipt. A dedicated InventoryPage and a Home page summary widget complete the surface area.

The primary data model decision (D-01, Claude's discretion) should be **ledger-based** (insert-only rows with a `removed_at` / `removed_reason` column plus a `quantity_remaining` for partial deductions). This matches the v2.0 roadmap decision logged in STATE.md ("Inventory built as ledger of events") and supports FIFO deduction and purchase history queries without requiring a separate events table. A single `inventory_items` table where rows are never deleted (only soft-removed) is simpler than a full event ledger while still satisfying all INVT requirements and the four Phase 18 query interfaces.

The food linking approach (D-02, Claude's discretion) should be **freeform with optional link**: every inventory item has a `food_name` text column plus nullable `food_id` (text, same type as food_prices.food_id to accommodate USDA, CNF, custom UUIDs). The barcode and food-search paths populate `food_id`; manual entry leaves it null. This allows deduction matching by `food_id` when available and by name fuzzy matching as a fallback.

**Primary recommendation:** Use a single `inventory_items` table with soft-removal, FIFO by `purchased_at`. Add `@zxing/browser` (0.1.5, already on npm registry) for barcode scanning — it is the modern successor to the deprecated quagga library, works in browsers without native dependencies, and is the correct choice given the React 19 + Vite 8 stack. The `@ericblade/quagga2` alternative is viable but carries legacy webpack assumptions and heavier bundle weight.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-03:** Same food in different locations = separate inventory rows (e.g., chicken in fridge and freezer are two entries)
- **D-04:** Price stored in two places: `purchase_price` on the inventory item AND updates `food_prices` table (current market price for recipe cost calculations)
- **D-05:** Units support weight (g, kg), volume (ml, L), and discrete count (units/items)
- **D-06:** Track `purchased_at` date on each item (separate from expiry) — enables FIFO deduction and purchase history
- **D-07:** Track opened/unopened state on items — can adjust displayed expiry guidance
- **D-08:** Track removal reason: "Used" vs "Discarded" — feeds future waste tracking
- **D-09:** Items can be flagged as "staple" — staples get low-stock restock alerts for grocery list
- **D-10:** Weekly budget on Plan page = grocery purchases only (new spend). Inventory items already owned do not count toward weekly budget.
- **D-11:** Per-meal/recipe cost = all ingredients at their prices (includes pantry items already owned). Informational only.
- **D-12:** Price field is optional with nudge "Add price for cost tracking"
- **D-13:** Barcode scanning: in-app camera scanner using JS library (quagga2/zxing-js) + manual barcode entry fallback
- **D-14:** Barcode lookup auto-fills name, brand, nutrition, serving size from Open Food Facts API. User confirms/adjusts.
- **D-15:** Food search reuses existing FoodSearchOverlay component (same as recipe builder)
- **D-16:** Quick scan mode for bulk grocery unpacking — scan items in sequence, auto-add with defaults, user edits later
- **D-17:** Always create new inventory entry (no merge/duplicate detection)
- **D-18:** Three tabs by location: Pantry | Fridge | Freezer. Each tab shows items sorted by expiry.
- **D-23:** Dedicated Inventory page in nav + summary widget on Home page
- **D-24:** Deduction happens on "Cook" button press (per-meal). Phase 16's Cook button extended.
- **D-25:** Auto-deduct exact amounts needed from inventory (no confirmation per ingredient)
- **D-26:** FIFO ordering — deduct from oldest purchased item first. Show user which specific item is being used.
- **D-27:** Post-cook deduction receipt: show summary of what was deducted
- **D-28:** When ingredient has no matching inventory item, show in summary: "X of Y ingredients deducted. Missing: ..."
- **D-29:** Leftovers: manual add as new inventory item marked as "leftover from [recipe]". No special post-cook prompt.
- **D-30:** Inventory exposes four query interfaces for Phase 18 (available quantity, low-stock staples, expiry priority, purchase history)
- **D-31:** Grocery list (Phase 18) based on planned meals minus inventory. Staples get restock when low.

### Claude's Discretion
- Data model: ledger-based vs simple quantity (D-01)
- Food linking approach (D-02)
- Expiry visual treatment (D-19) — decided in UI-SPEC: color-coded badges (expired/red, <3 days/accent, <7 days/primary/soft)
- Inline editing vs detail modal (D-20) — decided in UI-SPEC: tap-to-expand matching LogEntryItem pattern
- Search/filter within inventory (D-21)
- Query key naming for inventory hooks
- Inventory table schema (columns, indexes, RLS policies)
- Barcode scanner library choice (quagga2 vs zxing-js vs alternative)
- Default expiry estimates for leftovers and opened items

### Deferred Ideas (OUT OF SCOPE)
- Waste tracking dashboard (aggregate "discarded" data into waste reports/trends)
- Recipe cooking instructions (step-by-step directions)
- Grocery store API integration (auto-populate prices from store APIs)
- Smart meal suggestions based on expiring inventory (Phase 22 territory)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INVT-01 | User can add items to inventory with storage location (pantry, fridge, freezer) | `inventory_items` table with `storage_location` enum; AddInventoryItemModal; BarcodeScanner; FoodSearchOverlay reuse |
| INVT-02 | Each inventory item tracks quantity and unit (grams, units, ml) | `quantity_remaining` numeric + `unit` text CHECK constraint on inventory_items table |
| INVT-03 | Each inventory item has an optional expiry date with priority sorting | `expires_at` date column; ORDER BY expires_at NULLS LAST in query; ExpiryBadge component per UI-SPEC |
| INVT-04 | User can scan a barcode to add an item to inventory | `@zxing/browser` 0.1.5; Open Food Facts barcode API; BarcodeScanner component; manual entry fallback |
| INVT-05 | Finalizing a meal plan auto-deducts ingredient quantities from inventory | FIFO deduction logic in useInventoryDeduct hook; Cook button extension on PlanPage; CookDeductionReceipt component |
| INVT-06 | Uneaten portions from a recipe appear as leftover inventory items with expiry | Manual add path in AddInventoryItemModal with `is_leftover` flag and `leftover_from_recipe_id`; default expiry = 3 days from cook date |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.1 (existing) | Database RLS, real-time, auth | Already in project; all tables use Supabase |
| @tanstack/react-query | ^5.90.21 (existing) | Data fetching, cache invalidation | All hooks in project use TanStack Query v5 |
| @zxing/browser | 0.1.5 | In-browser barcode scanning via camera | Modern, actively maintained ZXing port; no native deps; works in Vite/React 19; lighter than quagga2 |
| react-router-dom | ^7.13.1 (existing) | New /inventory route | Already in project |
| tailwindcss | ^4.2.1 (existing) | All styling via CSS-first @theme tokens | Project standard; no shadcn |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @zxing/library | 0.21.3 | Core ZXing decode engine (peer dep of @zxing/browser) | Installed alongside @zxing/browser |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @zxing/browser | @ericblade/quagga2 1.12.1 | quagga2 uses workers+webpack assumptions; heavier bundle; ZXing is cleaner for Vite |
| @zxing/browser | html5-qrcode 2.3.8 | html5-qrcode wraps ZXing but adds opinionated UI we'd override; direct use is simpler |
| Supabase inventory_items | Separate ledger events table | Full ledger adds complexity; single-table with soft removal satisfies all INVT requirements and Phase 18 interfaces |

**Installation:**
```bash
npm install @zxing/browser @zxing/library
```

**Version verification:**
- `@zxing/browser`: 0.1.5 (verified via `npm view @zxing/browser version`)
- `@zxing/library`: 0.21.3 (verified via `npm view @zxing/library version`)
- `@ericblade/quagga2`: 1.12.1 (verified — not recommended; ZXing preferred)

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/inventory/
│   ├── InventoryItemRow.tsx        # tap-to-expand row (LogEntryItem pattern)
│   ├── AddInventoryItemModal.tsx   # bottom-sheet for add/edit
│   ├── BarcodeScanner.tsx          # full-screen camera overlay
│   ├── QuickScanMode.tsx           # sequential scan session UI
│   ├── InventorySummaryWidget.tsx  # Home page location counts + expiring list
│   ├── CookDeductionReceipt.tsx    # post-cook deduction panel
│   └── ExpiryBadge.tsx             # pill badge with urgency color
├── hooks/
│   ├── useInventory.ts             # list/add/update/remove CRUD hooks
│   └── useInventoryDeduct.ts       # FIFO deduction logic for Cook button
├── pages/
│   └── InventoryPage.tsx           # /inventory route, 3-tab location layout
└── utils/
    └── inventory.ts                # FIFO logic, expiry helpers, unit conversion
supabase/migrations/
    └── 021_inventory.sql           # inventory_items table + RLS
```

### Pattern 1: inventory_items Table Schema
**What:** Single table, soft-removal, FIFO by purchased_at
**When to use:** Always — this is the sole inventory data store

```sql
-- supabase/migrations/021_inventory.sql
CREATE TABLE public.inventory_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id          uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  added_by              uuid NOT NULL REFERENCES auth.users(id),
  -- Food identity
  food_name             text NOT NULL,
  brand                 text,
  food_id               text,                   -- nullable; matches food_prices.food_id type
  -- Quantity
  quantity_remaining    numeric NOT NULL CHECK (quantity_remaining >= 0),
  unit                  text NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'L', 'units')),
  -- Location and state
  storage_location      text NOT NULL CHECK (storage_location IN ('pantry', 'fridge', 'freezer')),
  is_opened             boolean NOT NULL DEFAULT false,
  is_staple             boolean NOT NULL DEFAULT false,
  -- Dates
  purchased_at          date NOT NULL DEFAULT CURRENT_DATE,
  expires_at            date,
  -- Price (D-04: also written to food_prices separately)
  purchase_price        numeric CHECK (purchase_price >= 0),  -- total paid for this item
  -- Removal tracking (D-08)
  removed_at            timestamptz,
  removed_reason        text CHECK (removed_reason IN ('used', 'discarded')),
  -- Leftover tracking (INVT-06)
  is_leftover           boolean NOT NULL DEFAULT false,
  leftover_from_recipe_id uuid,
  -- Metadata
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
```

**RLS pattern** — matches 020_budget_engine.sql pattern exactly:
```sql
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members read inventory_items"
  ON public.inventory_items FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM public.household_members
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "household members insert inventory_items"
  ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
    AND added_by = (SELECT auth.uid())
  );

CREATE POLICY "household members update inventory_items"
  ON public.inventory_items FOR UPDATE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM public.household_members
    WHERE user_id = (SELECT auth.uid())
  ));
```

### Pattern 2: FIFO Deduction Logic
**What:** Given a recipe's ingredient list, deduct from inventory rows ordered by purchased_at ASC, removed_at IS NULL
**When to use:** Cook button press (D-24)

```typescript
// src/utils/inventory.ts
export function computeFifoDeductions(
  items: InventoryItem[],       // all active items for this household
  needs: { food_id: string | null; food_name: string; quantity_grams: number }[]
): {
  deductions: { item: InventoryItem; deductAmount: number }[]
  missing: string[]             // ingredient names with no inventory match
} {
  // Match by food_id first (exact), fall back to food_name case-insensitive
  // Deduct from oldest purchased_at first (FIFO)
  // Split across multiple items if one item doesn't cover the full need
}
```

**Key insight:** Deduction is a client-side computation that produces a list of `{ id, new_quantity_remaining }` updates. The mutation sends one batch update call. If any item would go below 0, clamp at 0 and note as partial deduction.

### Pattern 3: TanStack Query Keys for Inventory
**What:** Centralised keys in queryKeys.ts following existing factory pattern

```typescript
// Add to src/lib/queryKeys.ts
inventory: {
  list: (householdId: string | undefined) =>
    ['inventory', householdId] as const,
  byLocation: (householdId: string | undefined, location: StorageLocation) =>
    ['inventory', householdId, location] as const,
  expiringSoon: (householdId: string | undefined) =>
    ['inventory', householdId, 'expiring-soon'] as const,
},
```

### Pattern 4: useInventory Hook Structure
**What:** Follows useFoodPrices.ts pattern exactly

```typescript
// src/hooks/useInventory.ts
export function useInventoryItems(location?: StorageLocation) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useQuery({
    queryKey: location
      ? queryKeys.inventory.byLocation(householdId, location)
      : queryKeys.inventory.list(householdId),
    queryFn: async (): Promise<InventoryItem[]> => {
      const query = supabase
        .from('inventory_items')
        .select('*')
        .eq('household_id', householdId!)
        .is('removed_at', null)          // active items only
        .order('expires_at', { ascending: true, nullsFirst: false })
      if (location) query.eq('storage_location', location)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}
```

### Pattern 5: BarcodeScanner with @zxing/browser
**What:** BrowserMultiFormatReader from @zxing/browser for camera stream decoding

```typescript
// src/components/inventory/BarcodeScanner.tsx
import { BrowserMultiFormatReader } from '@zxing/browser'

// Usage pattern:
const codeReader = new BrowserMultiFormatReader()
// Start scanning:
await codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
  if (result) {
    onBarcodeDetected(result.getText())
    BrowserMultiFormatReader.releaseAllStreams()
  }
})
// Cleanup on unmount:
BrowserMultiFormatReader.releaseAllStreams()
```

**Camera permission handling:** Use `navigator.mediaDevices.getUserMedia` check before mounting. If denied, show manual entry fallback immediately (per D-13 and UI-SPEC copy "Camera access is required...").

### Pattern 6: Open Food Facts Barcode Lookup
**What:** Direct client fetch to OFF API (no edge function needed — CORS is open)
**When to use:** After barcode detected, auto-fill item form

```typescript
// In BarcodeScanner or AddInventoryItemModal
async function lookupBarcode(barcode: string) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  )
  const json = await res.json()
  if (json.status !== 1) return null
  const p = json.product
  return {
    food_name: p.product_name ?? p.product_name_en ?? '',
    brand: p.brands ?? '',
    // Nutrition per 100g from nutriments
    calories: p.nutriments?.['energy-kcal_100g'] ?? null,
    protein: p.nutriments?.proteins_100g ?? null,
    fat: p.nutriments?.fat_100g ?? null,
    carbs: p.nutriments?.carbohydrates_100g ?? null,
  }
}
```

**Confidence:** MEDIUM — OFF API is documented at https://openfoodfacts.github.io/openfoodfacts-server/api/ and already used by the existing food search in Phase 2 (FOOD-02). Field names `nutriments.energy-kcal_100g` etc. are standard OFF format.

### Pattern 7: Cook Button Extension
**What:** PlanPage's Cook button calls inventory deduction after spend log creation
**When to use:** Cook button press on SlotCard/PlanGrid (D-24)

The Cook button currently calls `useCreateSpendLog`. Extend its handler to:
1. Call `useCreateSpendLog` (existing spend log — unchanged)
2. Call `useInventoryDeduct.mutateAsync(recipeIngredients)` to batch-update inventory
3. Receive deduction result `{ deductions, missing }` and show `CookDeductionReceipt`

**Integration point:** `src/pages/PlanPage.tsx` or the SlotCard/Cook button component. The Cook button location needs to be verified during planning — check `src/components/plan/SlotCard.tsx` and `PlanGrid.tsx`.

### Pattern 8: food_prices Update on Inventory Add
**What:** When a user adds an inventory item with a price, also upsert food_prices (D-04)
**When to use:** AddInventoryItemModal on submit when price + food_id are both present

```typescript
// In useAddInventoryItem mutation onSuccess:
if (params.purchase_price && params.food_id) {
  const cost_per_100g = normaliseToCostPer100g(
    params.purchase_price,
    params.quantity_in_grams,
    params.unit
  )
  await saveFoodPrice.mutateAsync({
    food_id: params.food_id,
    food_name: params.food_name,
    store: '',   // no store on inventory adds
    cost_per_100g,
  })
}
```

**Note:** `normaliseToCostPer100g` from `src/utils/cost.ts` handles unit conversion. Unit 'units' (discrete count) does not have a per-100g equivalent — skip food_prices update when unit is 'units'.

### Pattern 9: D-21 Search/Filter Decision
**What:** No inline search/filter for Phase 17
**Rationale:** Expected inventory size per location (10–30 items) is small enough that three location tabs plus expiry sort provide sufficient navigation. Adding search adds complexity with marginal benefit. This is consistent with Phase 18 grocery list where ingredient matching is done programmatically via food_id/name. Search can be added as a quick-win in a future polish phase if user feedback requests it.

### Anti-Patterns to Avoid
- **Deleting inventory rows:** Never hard-delete; always set `removed_at` + `removed_reason`. Phase 18 and waste tracking need the full history.
- **Storing quantity as event log:** A separate events table requires reconstructing current quantity on every read. Single-table with `quantity_remaining` is simpler and fast enough for household scale.
- **Unit conversion in DB:** Store `quantity_remaining` in the user's chosen unit, not normalized to grams. Deduction matching must handle unit conversion in the client (e.g., recipe needs 200g, inventory has 0.5kg — convert before comparing).
- **Blocking Cook on deduction failure:** Deduction failure should not prevent the Cook action. Log the spend, show the receipt with an error note, and let the user retry deduction manually.
- **Opening camera without permission check:** Always check `navigator.mediaDevices` existence first; iOS Safari and some desktop browsers require HTTPS and explicit permission grant.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Barcode decoding from camera stream | Custom WebRTC + canvas pixel analysis | `@zxing/browser` BrowserMultiFormatReader | ZXing handles EAN-13, UPC-A, QR, Code128, DataMatrix, dozens of formats; correct decode requires Reed-Solomon error correction |
| Unit conversion for deduction matching | Ad hoc if-else chains | `normaliseToCostPer100g` pattern already in cost.ts | Extend the same pattern; units map: g=1, kg=1000, ml=1, L=1000, units=discrete (skip weight comparison) |
| Date comparison for expiry urgency | Manual date arithmetic | `Date.UTC()` arithmetic consistent with existing getWeekStart / getDayIndex pattern | Project already has a pattern; do not introduce date-fns or dayjs |
| Cache invalidation | Custom refresh logic | `queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })` | TanStack Query prefix invalidation clears all inventory sub-keys at once |

**Key insight:** The hardest part of barcode scanning is format support and error correction, not camera access. ZXing solves both; hand-rolling either would produce an unreliable scanner.

---

## Common Pitfalls

### Pitfall 1: Unit mismatch in FIFO deduction
**What goes wrong:** Recipe ingredient is in grams (200g chicken), inventory item was added as kg (0.5 kg). Direct numeric comparison deducts 200 from 0.5 (nonsense).
**Why it happens:** Inventory stores quantity in the user's chosen unit; recipes store `quantity_grams`.
**How to avoid:** Convert inventory `quantity_remaining` to grams before comparing. Map: g→×1, kg→×1000, ml→×1 (treat as grams for deduction purposes, close enough for cooking), L→×1000, units→skip weight deduction.
**Warning signs:** Post-cook receipt shows negative quantities or 0g deducted when item clearly had stock.

### Pitfall 2: Camera stream not released
**What goes wrong:** BarcodeScanner unmounts but camera stays active (LED stays on, other apps can't use camera).
**Why it happens:** `BrowserMultiFormatReader` holds a `MediaStream`; React unmount does not auto-release it.
**How to avoid:** Always call `BrowserMultiFormatReader.releaseAllStreams()` in the `useEffect` cleanup function.
**Warning signs:** Camera LED stays on after closing BarcodeScanner; browser console warnings about MediaStream.

### Pitfall 3: Open Food Facts rate limiting on rapid scans
**What goes wrong:** Quick Scan Mode fires barcode lookups for every scan in rapid succession; OFF API returns 429 or slow responses.
**Why it happens:** OFF has a rate limit (~100 req/min per IP for the free API).
**How to avoid:** Debounce barcode lookup calls with a 500ms delay; cache lookups by barcode string in a local Map for the session; in Quick Scan Mode, queue lookups and process one at a time.
**Warning signs:** Items added with empty names during quick scan session; network errors in console.

### Pitfall 4: Deduction receipt visible behind TabBar on mobile
**What goes wrong:** `CookDeductionReceipt` panel uses `bottom-16` offset but TabBar height varies on iOS (safe area + 64px).
**Why it happens:** The existing `pb-[3xl]` (64px) bottom safe area is applied to page content, not fixed overlays.
**How to avoid:** Use `bottom-[calc(4rem+env(safe-area-inset-bottom))]` for the receipt panel, consistent with how the existing `InstallPrompt` handles safe area.
**Warning signs:** Receipt text overlaps with TabBar on iPhone with home indicator.

### Pitfall 5: RLS blocks household-wide inventory deductions
**What goes wrong:** Cook button is pressed by user A; inventory items were added by user B (different household member). Update fails with RLS error.
**Why it happens:** If the UPDATE policy uses `added_by = auth.uid()`, it will block updates to items added by other members.
**How to avoid:** The UPDATE policy should use `household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())` — same pattern as food_prices, not the creator-only pattern from custom_foods. All household members can update any item in their household's inventory.
**Warning signs:** Inventory not deducting for shared households; silent 0-rows-affected mutations.

### Pitfall 6: Off-by-one in expiry urgency thresholds
**What goes wrong:** "Expiring within 3 days" badge does not appear on the day of expiry (diff = 0 days).
**Why it happens:** `Math.ceil((expires_at - today) / 86400000)` returns 0 for today-expired items, not caught by `<= 3` check.
**How to avoid:** Treat `expires_at < today` as "expired" (red badge). Treat `expires_at >= today && daysUntilExpiry <= 3` as urgent (accent badge). `daysUntilExpiry = Math.ceil((expiryMs - todayMs) / 86400000)` where both use `Date.UTC()`.
**Warning signs:** Items expired today show no badge; items expiring tomorrow show wrong urgency tier.

---

## Code Examples

### Adding inventory_items TypeScript type to database.ts

```typescript
// Source: based on existing FoodPrice interface pattern in src/types/database.ts
export type StorageLocation = 'pantry' | 'fridge' | 'freezer'
export type InventoryUnit = 'g' | 'kg' | 'ml' | 'L' | 'units'
export type RemovalReason = 'used' | 'discarded'

export interface InventoryItem {
  id: string
  household_id: string
  added_by: string
  food_name: string
  brand: string | null
  food_id: string | null
  quantity_remaining: number
  unit: InventoryUnit
  storage_location: StorageLocation
  is_opened: boolean
  is_staple: boolean
  purchased_at: string            // date string YYYY-MM-DD
  expires_at: string | null       // date string YYYY-MM-DD
  purchase_price: number | null
  removed_at: string | null       // timestamptz
  removed_reason: RemovalReason | null
  is_leftover: boolean
  leftover_from_recipe_id: string | null
  created_at: string
  updated_at: string
}
```

### Expiry urgency helper

```typescript
// src/utils/inventory.ts
export type ExpiryUrgency = 'expired' | 'urgent' | 'warning' | 'ok' | 'none'

export function getExpiryUrgency(expiresAt: string | null): ExpiryUrgency {
  if (!expiresAt) return 'none'
  const todayMs = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  )
  const [y, m, d] = expiresAt.split('-').map(Number)
  const expiryMs = Date.UTC(y, m - 1, d)
  const daysUntil = Math.ceil((expiryMs - todayMs) / 86400000)
  if (daysUntil < 0) return 'expired'
  if (daysUntil <= 3) return 'urgent'
  if (daysUntil <= 7) return 'warning'
  return 'ok'
}
```

### Four Phase 18 query interfaces (D-30)

```typescript
// src/hooks/useInventory.ts — exported helper functions called by Phase 18 grocery hooks

/** INVT query 1: How much of food X does the household have? */
export function getAvailableQuantity(
  items: InventoryItem[],
  foodId: string,
  targetUnit: InventoryUnit
): number { /* sum quantity_remaining where food_id matches, convert to targetUnit */ }

/** INVT query 2: Which staple items are below restock threshold? */
export function getLowStockStaples(
  items: InventoryItem[],
  thresholdGrams = 100
): InventoryItem[] { /* filter is_staple && quantityInGrams(item) < threshold */ }

/** INVT query 3: What items expire soon? (expiry-driven priority) */
export function getExpiringSoonItems(
  items: InventoryItem[],
  withinDays = 7
): InventoryItem[] { /* filter by getExpiryUrgency in ['urgent','warning'] */ }

/** INVT query 4: Purchase history for a food */
export function getPurchaseHistory(
  items: InventoryItem[],         // include removed items
  foodId: string
): { purchased_at: string; purchase_price: number | null; unit: InventoryUnit }[] { }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| quagga (v1, deprecated) | @zxing/browser (ZXing-JS) | ~2021 | quagga abandoned; ZXing is active, maintained, supports more formats |
| navigator.getBattery() for scan UX | Not applicable | — | No power API needed; camera access via getUserMedia is standard |
| Open Food Facts v1 API (`/api/v0/`) | Still current as of 2026 | — | v0 endpoint is stable; v2 is for commercial users |

**Deprecated/outdated:**
- `quagga` (original): abandoned, security vulnerabilities; use `@ericblade/quagga2` if ZXing is unacceptable
- `instascan`: abandoned, WebAssembly-based, no longer maintained
- OFF v2 API (`api/v2/product/`): requires registration for high-volume usage; v0 is sufficient for household-scale barcode lookups

---

## Open Questions

1. **Cook button exact location**
   - What we know: PlanPage.tsx imports BudgetSummarySection; Cook button is referenced in CONTEXT.md as living on PlanPage/RecipePage
   - What's unclear: Whether Cook is in PlanGrid, SlotCard, or elsewhere — needs file read during planning
   - Recommendation: Planner reads `src/components/plan/SlotCard.tsx` and `PlanGrid.tsx` before designing the Cook-extension task

2. **Default leftover expiry estimate (D-29)**
   - What we know: Leftovers are manually added; no post-cook prompt
   - What's unclear: Should the AddInventoryItemModal pre-fill expiry as "today + 3 days" for leftovers?
   - Recommendation: Pre-fill `expires_at = today + 3` when `is_leftover = true`; user can edit. 3 days is a conservative fridge leftover estimate for cooked proteins.

3. **Opened item expiry adjustment (D-07)**
   - What we know: `is_opened` flag is tracked
   - What's unclear: Should the app auto-adjust displayed expiry guidance (e.g., "Best used within 3 days of opening") or just show the original expiry date?
   - Recommendation: Phase 17 — show original expiry date only. Display a small "Opened" badge next to the expiry badge when `is_opened = true`. Actual expiry guidance logic is a future enhancement.

---

## Environment Availability

Step 2.6: SKIPPED for most dependencies — project is a Vite 8 + React 19 + Supabase webapp with all tooling already installed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @zxing/browser | INVT-04 barcode scanning | Not yet installed | 0.1.5 (registry) | Manual barcode entry (D-13) — always available |
| @zxing/library | Peer dep of @zxing/browser | Not yet installed | 0.21.3 (registry) | Same as above |
| Open Food Facts API | INVT-04 barcode auto-fill | External / HTTPS | Stable free tier | Manual form entry — barcode found but lookup fails shows manual form |
| Camera (getUserMedia) | INVT-04 scanning | Runtime browser | N/A | Manual barcode number entry input |

**Missing dependencies with no fallback:** None — barcode scanning has an explicit manual entry fallback per D-13.

**Missing dependencies with fallback:**
- `@zxing/browser` + `@zxing/library`: must be installed (`npm install @zxing/browser @zxing/library`) in Wave 0 before BarcodeScanner component is built

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | `vite.config.ts` (vitest config embedded) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INVT-01 | Add item with storage location | unit | `npx vitest run src/utils/inventory.test.ts -t "add item"` | No — Wave 0 |
| INVT-02 | Quantity + unit tracking | unit | `npx vitest run src/utils/inventory.test.ts -t "quantity"` | No — Wave 0 |
| INVT-03 | Expiry sort + urgency badges | unit | `npx vitest run src/utils/inventory.test.ts -t "expiry"` | No — Wave 0 |
| INVT-04 | Barcode scan + OFF lookup | manual-only | N/A — requires live camera + physical barcode | N/A |
| INVT-05 | FIFO deduction logic | unit | `npx vitest run src/utils/inventory.test.ts -t "fifo"` | No — Wave 0 |
| INVT-06 | Leftover item creation | unit | `npx vitest run src/utils/inventory.test.ts -t "leftover"` | No — Wave 0 |

**INVT-04 manual-only justification:** Camera API and network requests to Open Food Facts cannot be unit-tested without mocking the entire WebRTC stack. Acceptance verified manually by scanning a real barcode and confirming form pre-fill.

### Sampling Rate
- **Per task commit:** `npx vitest run src/utils/inventory.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/utils/inventory.test.ts` — covers INVT-01/02/03/05/06 (expiry urgency, FIFO deduction, unit conversion, leftover flag)
- [ ] Framework already installed — no additional install needed

---

## Project Constraints (from CLAUDE.md)

- Match existing patterns: TanStack Query hooks, household-scoped RLS, queryKeys.ts factory, CSS-first Tailwind 4 tokens
- No new top-level directories without discussion
- Prefer editing existing files (App.tsx for route, queryKeys.ts for keys, database.ts for types)
- Keep commits small and focused — one logical change per commit
- No force push, no --no-verify
- Do not create README files
- Migration numbering: next is `021_inventory.sql`
- Food price integration: use `normaliseToCostPer100g` from `src/utils/cost.ts`; update `food_prices` table via `useSaveFoodPrice` (already exists in `src/hooks/useFoodPrices.ts`)
- Route pattern: add `/inventory` to `src/App.tsx` under the `AppShell` layout route (same pattern as `/guide` in Phase 14)
- Nav addition: add to MobileDrawer (in AppShell) and Sidebar, not to TabBar (3 primary slots are full)

---

## Sources

### Primary (HIGH confidence)
- `src/types/database.ts` — existing type contracts; InventoryItem type designed to match
- `src/hooks/useFoodPrices.ts` — hook pattern to replicate for useInventory
- `src/utils/cost.ts` — normaliseToCostPer100g for price integration
- `supabase/migrations/020_budget_engine.sql` — RLS policy patterns to replicate
- `src/lib/queryKeys.ts` — factory pattern; inventory keys added here
- `17-UI-SPEC.md` — expiry badge colors (D-19), inline edit pattern (D-20), component list
- `17-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- npm registry: `npm view @zxing/browser version` → 0.1.5; `npm view @zxing/library version` → 0.21.3 (verified live)
- npm registry: `npm view @ericblade/quagga2 version` → 1.12.1 (verified live, not recommended)
- Open Food Facts API v0 — standard barcode product endpoint `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`; CORS open; already used by the project in Phase 2

### Tertiary (LOW confidence)
- @zxing/browser `BrowserMultiFormatReader` API signatures — from docs patterns; verify against actual package during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library versions verified via npm registry
- Architecture: HIGH — directly derived from existing project patterns; no speculation
- Pitfalls: HIGH — derived from known ZXing/camera/RLS patterns with codebase-specific analysis
- FIFO logic: HIGH — algorithm is straightforward; documented edge cases (unit mismatch) are concrete

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain; @zxing and OFF API are slow-moving)
