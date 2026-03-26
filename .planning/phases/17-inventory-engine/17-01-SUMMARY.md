---
phase: 17-inventory-engine
plan: 01
subsystem: database
tags: [inventory, supabase, rls, typescript, vitest, zxing, fifo]

# Dependency graph
requires:
  - phase: 16-budget-engine-query-foundation
    provides: queryKeys.ts pattern, database.ts type conventions, RLS policy pattern from 020_budget_engine.sql

provides:
  - inventory_items table with RLS (household-scoped read/insert/update policies)
  - InventoryItem, StorageLocation, InventoryUnit, RemovalReason TypeScript types
  - Inventory query key namespace (list, byLocation, expiringSoon)
  - getExpiryUrgency — classifies dates into expired/urgent/warning/ok/none
  - convertToGrams — normalises g/kg/ml/L to single unit; null for discrete 'units'
  - computeFifoDeductions — FIFO deduction algorithm matching oldest-first by food_id then food_name
  - getAvailableQuantity, getLowStockStaples, getExpiringSoonItems, getPurchaseHistory — Phase 18 query interfaces
  - @zxing/browser and @zxing/library installed for barcode scanning

affects:
  - 17-02 (inventory hooks — depends on InventoryItem type and query keys)
  - 17-03 (inventory page — depends on types, hooks, utility functions)
  - 17-04 (plan deduction — depends on computeFifoDeductions)
  - 17-05 (home page widget — depends on getExpiringSoonItems, getAvailableQuantity)
  - 18-grocery-list (depends on Phase 18 query interfaces)

# Tech tracking
tech-stack:
  added:
    - "@zxing/browser ^0.1.5 — barcode scanning browser integration"
    - "@zxing/library ^0.21.3 — core barcode decoding library"
  patterns:
    - "FIFO deduction: match food_id first, fall back to case-insensitive food_name, sort by purchased_at ASC"
    - "Date.UTC arithmetic for timezone-safe expiry comparison (same as getWeekStart in mealPlan.ts)"
    - "RLS pattern: household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())"
    - "UPDATE policy allows any household member to update (not restricted to added_by) — shared pantry items"

key-files:
  created:
    - supabase/migrations/021_inventory.sql
    - src/utils/inventory.ts
    - src/utils/inventory.test.ts
  modified:
    - src/types/database.ts
    - src/lib/queryKeys.ts
    - package.json

key-decisions:
  - "Simple quantity model (not ledger-based): each inventory_items row tracks quantity_remaining directly"
  - "food_id is optional text to accommodate USDA numeric IDs, CNF IDs, and custom UUIDs"
  - "UPDATE RLS does not check added_by — any household member can update any inventory item (pantry is shared)"
  - "ExpiryUrgency bands fixed at daysUntil < 0=expired, <=3=urgent, <=7=warning, else ok"
  - "convertToGrams returns null for 'units' type — discrete counts cannot be compared by weight for FIFO deduction"

patterns-established:
  - "Inventory utility functions are pure (no Supabase calls) — tested with Vitest, no mocking needed"
  - "FIFO: sort by purchased_at ASC, deduct oldest first, spread across multiple items if needed"

requirements-completed: [INVT-01, INVT-02, INVT-03, INVT-05, INVT-06]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 17 Plan 01: Inventory Engine Foundation Summary

**inventory_items DB table with RLS, TypeScript types, FIFO deduction algorithm, expiry urgency classifier, and Phase 18 query interfaces — all covered by 22 passing Vitest unit tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T03:04:49Z
- **Completed:** 2026-03-26T03:08:49Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `supabase/migrations/021_inventory.sql` with inventory_items table (20 columns, 2 indexes, 3 RLS policies)
- Added `InventoryItem`, `StorageLocation`, `InventoryUnit`, `RemovalReason` types to `database.ts`
- Added `inventory` namespace (list, byLocation, expiringSoon) to `queryKeys.ts`
- Created `src/utils/inventory.ts` with 7 exported functions including FIFO deduction and expiry urgency
- Created `src/utils/inventory.test.ts` with 22 passing tests covering all utility functions
- Installed `@zxing/browser` and `@zxing/library` for future barcode scanning plans

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration, types, and query keys** - `07b369a` (feat)
2. **Task 2: Inventory utility functions and tests** - `7c79877` (feat)

## Files Created/Modified

- `supabase/migrations/021_inventory.sql` — inventory_items table with all columns, constraints, indexes, and RLS
- `src/types/database.ts` — Added StorageLocation, InventoryUnit, RemovalReason types and InventoryItem interface
- `src/lib/queryKeys.ts` — Added inventory namespace with list, byLocation, expiringSoon sub-keys
- `src/utils/inventory.ts` — All 7 inventory utility functions (getExpiryUrgency, convertToGrams, computeFifoDeductions, getAvailableQuantity, getLowStockStaples, getExpiringSoonItems, getPurchaseHistory)
- `src/utils/inventory.test.ts` — 22 Vitest unit tests (all passing)
- `package.json` — @zxing/browser and @zxing/library added

## Decisions Made

- Simple quantity model chosen over ledger-based: `quantity_remaining` column updated directly. Avoids complexity while supporting FIFO via `purchased_at`.
- UPDATE RLS policy does not check `added_by` — any household member can update any inventory item. Household pantry is a shared resource (Research Pitfall 5).
- `convertToGrams` returns `null` for `'units'` type — discrete counts (eggs, cans) have no weight equivalent. FIFO algorithm skips these items.
- Expiry urgency thresholds: expired (<0 days), urgent (0-3 days), warning (4-7 days), ok (>7 days).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test fixture produced false positive match**
- **Found during:** Task 2 (running tests)
- **Issue:** Test "adds to missing array when no matching food found" used item with `food_id: 'different-id'` but same `food_name: 'Chicken Breast'` as the need. FIFO algorithm correctly fell back to food_name match, causing deductions instead of missing.
- **Fix:** Changed item food_name in that test to 'Rice' so neither food_id nor food_name match.
- **Files modified:** src/utils/inventory.test.ts
- **Verification:** All 22 tests pass after fix.
- **Committed in:** 7c79877 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test fixture bug)
**Impact on plan:** Minor test fixture correction. Algorithm behavior is correct — the test was wrong, not the code.

## Issues Encountered

- Worktree was based on phase 14 state (commit 53410ac) and did not have queryKeys.ts, cost.ts, or migrations 019-020 from phases 15-16. Rebased worktree onto master before beginning execution.

## Next Phase Readiness

- Plan 17-02 (inventory hooks) can proceed immediately — InventoryItem type and query keys are ready
- Plan 17-03 (inventory page) depends on 17-02 hooks
- Plan 17-04 (plan deduction) can use computeFifoDeductions directly
- No blockers identified

---
*Phase: 17-inventory-engine*
*Completed: 2026-03-26*
