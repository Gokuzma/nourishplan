---
phase: 17-inventory-engine
plan: 02
subsystem: frontend
tags: [inventory, react, hooks, ui, navigation, tanstack-query]

# Dependency graph
requires:
  - phase: 17-01
    provides: InventoryItem type, query keys, getExpiryUrgency, useFoodPrices pattern

provides:
  - useInventoryItems: household-scoped query by location with expiry sorting
  - useAddInventoryItem: insert with D-04 price integration
  - useUpdateInventoryItem: partial update with cache invalidation
  - useRemoveInventoryItem: soft-delete with reason
  - ExpiryBadge: urgency-colored pill badge component
  - InventoryItemRow: tap-to-expand item row with inline remove confirm
  - AddInventoryItemModal: bottom sheet for add/edit with all fields
  - InventoryPage: /inventory route with 3-tab location strip
  - Navigation: Inventory link in MobileDrawer and Sidebar

affects:
  - 17-03 (barcode scanner — depends on InventoryPage and AddInventoryItemModal)
  - 17-04 (plan cook deduction — depends on hooks)
  - 17-05 (home page widget — depends on useInventoryItems)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useInventoryItems accepts optional StorageLocation to switch between list and byLocation query keys"
    - "D-04 price integration: mutationFn returns params for onSuccess to call saveFoodPrice with lowercase unit"
    - "Inline remove confirm: -mt-px border-t-0 pattern from Phase 13, confirm before reason selection"
    - "InventoryUnit 'L' lowercased to 'l' before passing to normaliseToCostPer100g (cost.ts uses lowercase)"

key-files:
  created:
    - src/hooks/useInventory.ts
    - src/components/inventory/ExpiryBadge.tsx
    - src/components/inventory/InventoryItemRow.tsx
    - src/components/inventory/AddInventoryItemModal.tsx
    - src/pages/InventoryPage.tsx
  modified:
    - src/App.tsx
    - src/components/layout/MobileDrawer.tsx
    - src/components/layout/Sidebar.tsx

key-decisions:
  - "useAddInventoryItem returns { data, params, householdId } from mutationFn so onSuccess can call saveFoodPrice with the original params"
  - "InventoryUnit 'L' (uppercase in DB types) lowercased before passing to normaliseToCostPer100g which expects lowercase 'l'"
  - "Pre-existing test failures (AppShell 'Foods' and GuidePage hash) confirmed pre-existing, not caused by Plan 02 changes"

# Metrics
duration: 11min
completed: 2026-03-26
---

# Phase 17 Plan 02: Inventory CRUD UI Summary

**Full inventory CRUD UI: four TanStack Query hooks, ExpiryBadge, tap-to-expand item rows, add/edit bottom sheet, 3-tab location page, and navigation wiring in MobileDrawer and Sidebar**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-26T03:04:49Z
- **Completed:** 2026-03-26T03:15:16Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created `src/hooks/useInventory.ts` with 4 hooks: useInventoryItems, useAddInventoryItem, useUpdateInventoryItem, useRemoveInventoryItem
- Created `src/components/inventory/ExpiryBadge.tsx` — urgency-colored pill (expired=red, urgent=accent, warning=primary, ok=plain text)
- Created `src/components/inventory/InventoryItemRow.tsx` — tap-to-expand with Staple/Opened badges, Edit + Remove, inline reason confirmation
- Created `src/components/inventory/AddInventoryItemModal.tsx` — bottom sheet with all 7 fields per UI-SPEC, add and edit modes
- Created `src/pages/InventoryPage.tsx` — /inventory page with 3-tab strip (Pantry/Fridge/Freezer), ARIA roles, empty states
- Updated `src/App.tsx` — registered /inventory route after /guide
- Updated `src/components/layout/MobileDrawer.tsx` — Inventory nav item before Household
- Updated `src/components/layout/Sidebar.tsx` — Inventory nav item after Plan

## Task Commits

Each task was committed atomically:

1. **Task 1: Inventory CRUD hooks** — `7db1b77` (feat)
2. **Task 2: Inventory page, components, and navigation wiring** — `c3efcad` (feat)

## Files Created/Modified

- `src/hooks/useInventory.ts` — All 4 CRUD hooks following useFoodPrices pattern
- `src/components/inventory/ExpiryBadge.tsx` — Expiry urgency badge per UI-SPEC color section
- `src/components/inventory/InventoryItemRow.tsx` — Tap-to-expand row per LogEntryItem pattern
- `src/components/inventory/AddInventoryItemModal.tsx` — Full add/edit form, bottom sheet layout
- `src/pages/InventoryPage.tsx` — Location tab strip, item list, modal orchestration
- `src/App.tsx` — /inventory route added to AppShell routes
- `src/components/layout/MobileDrawer.tsx` — Inventory item added (Meals, Inventory, Household, Settings, User Guide)
- `src/components/layout/Sidebar.tsx` — Inventory item added (Home, Recipes, Meals, Plan, Inventory, Household, Settings, User Guide)

## Decisions Made

- `useAddInventoryItem` mutationFn returns `{ data, params, householdId }` rather than just `data`, so `onSuccess` can access original params to call `saveFoodPrice` without needing closure state.
- `InventoryUnit` uses uppercase `'L'` in `database.ts` but `normaliseToCostPer100g` in `cost.ts` expects lowercase `'l'`. Applied `.toLowerCase()` cast in the price integration path.
- Pre-existing test failures confirmed pre-existing by stash check — `AppShell.test.tsx` expected "Foods" nav item (removed in Phase 2) and `guide.test.ts` expected `window.location.hash` (code uses `useLocation` hook). No new failures introduced.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written. One observation noted:

**[Observation] InventoryUnit 'L' vs cost.ts lowercase 'l'**
- **Found during:** Task 1 implementation
- **Issue:** `database.ts` defines `InventoryUnit = 'g' | 'kg' | 'ml' | 'L' | 'units'` with uppercase `'L'` for litres, but `normaliseToCostPer100g` in `cost.ts` expects `'l'` (lowercase).
- **Fix:** Added `.toLowerCase() as 'g' | 'kg' | 'ml' | 'l'` cast before passing to `normaliseToCostPer100g`. No type changes needed.
- **Files modified:** `src/hooks/useInventory.ts`

## Known Stubs

None. All UI elements are wired to live hooks. The "Scan" button is visually disabled (`opacity-50 pointer-events-none`) per plan specification — it is intentionally disabled until Plan 03 (barcode scanner) and is documented in the plan as such.

## Next Phase Readiness

- Plan 17-03 (barcode scanner) can proceed immediately — InventoryPage and AddInventoryItemModal are complete
- Plan 17-04 (cook deduction) can use useRemoveInventoryItem hook directly
- Plan 17-05 (home page widget) can use useInventoryItems() with no location filter

---

## Self-Check: PASSED

Files exist:
- FOUND: src/hooks/useInventory.ts
- FOUND: src/components/inventory/ExpiryBadge.tsx
- FOUND: src/components/inventory/InventoryItemRow.tsx
- FOUND: src/components/inventory/AddInventoryItemModal.tsx
- FOUND: src/pages/InventoryPage.tsx

Commits exist:
- FOUND: 7db1b77 (Task 1)
- FOUND: c3efcad (Task 2)

---
*Phase: 17-inventory-engine*
*Completed: 2026-03-26*
