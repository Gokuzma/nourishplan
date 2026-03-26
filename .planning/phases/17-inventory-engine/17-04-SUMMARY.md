---
phase: 17-inventory-engine
plan: 04
subsystem: frontend
tags: [inventory, fifo, deduction, recipe, homepage, leftover]

# Dependency graph
requires:
  - phase: 17-01
    provides: computeFifoDeductions, convertToGrams, getExpiringSoonItems from inventory.ts
  - phase: 17-02
    provides: useInventoryItems, useUpdateInventoryItem, ExpiryBadge, AddInventoryItemModal

provides:
  - useInventoryDeduct: FIFO batch deduction mutation (non-blocking on failure)
  - CookDeductionReceipt: fixed bottom panel listing deducted items and missing items
  - InventorySummaryWidget: home page card with location counts and expiring-soon list
  - RecipeBuilder: Mark as Cooked now triggers inventory deduction with post-cook receipt
  - AddInventoryItemModal: leftoverDefaults prop pre-fills name, fridge location, 3-day expiry

affects:
  - 17-05 (home page widget already done here — may reference InventorySummaryWidget)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deduction non-blocking: spendLog.mutate fires first; deduction via mutateAsync in onSuccess; .catch() swallows deduction errors"
    - "DeductionResult type exported from useInventoryDeduct for CookDeductionReceipt props"
    - "InventorySummaryWidget fetches all items (no location filter) then groups by storage_location"
    - "leftoverDefaults prop in AddInventoryItemModal: pre-fills name with Leftover: prefix, fridge, +3 days expiry via UTC arithmetic"

key-files:
  created:
    - src/hooks/useInventoryDeduct.ts
    - src/components/inventory/CookDeductionReceipt.tsx
    - src/components/inventory/InventorySummaryWidget.tsx
  modified:
    - src/components/recipe/RecipeBuilder.tsx
    - src/pages/HomePage.tsx
    - src/components/inventory/AddInventoryItemModal.tsx

key-decisions:
  - "Deduction failure is non-blocking: spendLog always fires first; deduction runs in onSuccess callback; errors caught silently; receipt shows error state if deduction failed"
  - "CookDeductionReceipt uses fixed bottom panel (not toast) to accommodate multiple deduction rows"
  - "InventorySummaryWidget placed between micronutrient section and action buttons in HomePage — natural break between progress and log actions"
  - "leftoverDefaults pre-fill uses UTC date arithmetic (setUTCDate) consistent with getWeekStart/getDayIndex UTC pattern"

# Metrics
duration: 7min
completed: 2026-03-26
---

# Phase 17 Plan 04: Cook Deduction and Home Page Widget Summary

**FIFO inventory deduction on cook, post-cook receipt panel, home page inventory summary widget, and leftover pre-fill support in AddInventoryItemModal**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-26T03:19:00Z
- **Completed:** 2026-03-26T03:26:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `src/hooks/useInventoryDeduct.ts` — FIFO batch deduction mutation using `computeFifoDeductions` and `convertToGrams`; batch Supabase updates with cache invalidation
- Created `src/components/inventory/CookDeductionReceipt.tsx` — fixed bottom panel showing deducted items with purchase dates, missing items with warning icons, error message, 8-second auto-dismiss, Done button
- Created `src/components/inventory/InventorySummaryWidget.tsx` — card with location count row (Fridge/Freezer/Pantry), expiring-soon list (top 5, sorted by date), View all link, empty state with Add items link
- Modified `src/components/recipe/RecipeBuilder.tsx` — imports `useInventoryDeduct` and `CookDeductionReceipt`; added `inventoryDeduct` hook instance and `deductionResult` state; `handleMarkAsCooked` triggers deduction in spendLog's `onSuccess` callback; renders `CookDeductionReceipt` when `deductionResult` is set; also removed duplicate `useFoodPrices` declaration
- Modified `src/pages/HomePage.tsx` — imports and renders `InventorySummaryWidget` between micronutrient section and action buttons
- Modified `src/components/inventory/AddInventoryItemModal.tsx` — added `leftoverDefaults` prop; pre-fills food name with `Leftover: {recipeName}`, sets fridge location, computes +3 day UTC expiry; passes `is_leftover: true` and `leftover_from_recipe_id` on submit; shows "Leftover from: {recipeName}" label above name field

## Task Commits

Each task was committed atomically:

1. **Task 1: Inventory deduction hook, cook receipt, RecipeBuilder integration** — `8adeaf3` (feat)
2. **Task 2: Home page inventory summary widget and leftover support** — `c2378ad` (feat)

## Files Created/Modified

- `src/hooks/useInventoryDeduct.ts` — FIFO deduction mutation with batch Supabase updates
- `src/components/inventory/CookDeductionReceipt.tsx` — Post-cook panel per UI-SPEC
- `src/components/inventory/InventorySummaryWidget.tsx` — Home page inventory summary card
- `src/components/recipe/RecipeBuilder.tsx` — Mark as Cooked now deducts inventory + shows receipt
- `src/pages/HomePage.tsx` — InventorySummaryWidget rendered as a card section
- `src/components/inventory/AddInventoryItemModal.tsx` — leftoverDefaults pre-fill support added

## Decisions Made

- Deduction is non-blocking: `spendLog.mutate` fires first; `inventoryDeduct.mutateAsync` called in `onSuccess` callback; `.catch()` swallows deduction errors silently. Receipt shows error state if deduction failed but spend was logged.
- `CookDeductionReceipt` uses a fixed bottom panel rather than a standard toast — needed to accommodate multiple deduction/missing rows which wouldn't fit in a single-line toast.
- `InventorySummaryWidget` inserted between micronutrient section and action buttons in `HomePage` — avoids interrupting the primary daily log flow while keeping inventory visible on daily check-in.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate `useFoodPrices` declaration in RecipeBuilder**
- **Found during:** Task 1 (reading RecipeBuilder.tsx)
- **Issue:** `const { data: foodPrices } = useFoodPrices()` was declared twice (lines 261 and 266 in the worktree's version), which would cause a TypeScript duplicate declaration error.
- **Fix:** Removed the duplicate during the hook additions for Task 1.
- **Files modified:** `src/components/recipe/RecipeBuilder.tsx`
- **Committed in:** 8adeaf3 (Task 1 commit)

## Known Stubs

None. All UI elements are wired to live hooks. `InventorySummaryWidget` fetches real data via `useInventoryItems`. `leftoverDefaults` pre-fill is fully functional. `CookDeductionReceipt` shows real deduction results.

---

## Self-Check: PASSED

Files exist:
- FOUND: src/hooks/useInventoryDeduct.ts
- FOUND: src/components/inventory/CookDeductionReceipt.tsx
- FOUND: src/components/inventory/InventorySummaryWidget.tsx

Commits exist:
- FOUND: 8adeaf3 (Task 1)
- FOUND: c2378ad (Task 2)

---
*Phase: 17-inventory-engine*
*Completed: 2026-03-26*
