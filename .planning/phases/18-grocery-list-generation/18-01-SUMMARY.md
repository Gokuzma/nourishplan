---
phase: 18-grocery-list-generation
plan: 01
subsystem: grocery-generation
tags: [database, migration, typescript, tdd, pure-functions]
dependency_graph:
  requires: [Phase 17 inventory_items table, Phase 16 food_prices/spend_logs tables]
  provides: [grocery_lists table, grocery_items table, GroceryList/GroceryItem types, grocery queryKeys, groceryGeneration pure functions]
  affects: [src/lib/queryKeys.ts, src/types/database.ts]
tech_stack:
  added: []
  patterns: [TDD red-green, pure function utilities, keyword-based category assignment]
key_files:
  created:
    - supabase/migrations/022_grocery_list.sql
    - src/utils/groceryGeneration.ts
    - src/utils/groceryGeneration.test.ts
  modified:
    - src/types/database.ts
    - src/lib/queryKeys.ts
decisions:
  - household_id denormalized on grocery_items for RLS efficiency — avoids join to grocery_lists on every row-level check
  - get_user_household_id() used in RLS policies (consistent with Phase 17 pattern)
  - aggregateIngredients accepts pre-resolved slot data — caller is responsible for fetching nested recipe_ingredients
  - MAX_RECIPE_DEPTH=5 with console.warn at limit — prevents infinite recursion on circular recipe references
  - formatDisplayQuantity rounds to 1 decimal using Math.round((val * 10) / 10) pattern
metrics:
  duration_seconds: 324
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_changed: 5
---

# Phase 18 Plan 01: DB Schema, Types, Query Keys, and Generation Algorithm Summary

**One-liner:** Grocery list DB migration (grocery_lists + grocery_items with RLS/realtime), TypeScript interfaces, query key factories, and pure generation algorithm with 23 unit tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB migration, TypeScript types, and query keys | 7299521 | supabase/migrations/022_grocery_list.sql, src/types/database.ts, src/lib/queryKeys.ts |
| 2 | Grocery generation algorithm and unit tests | a827c5a | src/utils/groceryGeneration.ts, src/utils/groceryGeneration.test.ts |

## What Was Built

**Migration 022_grocery_list.sql:**
- `grocery_lists` table: one snapshot per household per week, unique on (household_id, week_start)
- `grocery_items` table: line items with category, is_checked, is_manual, is_staple_restock, estimated_cost fields
- RLS policies (read/insert/update/delete) for both tables using `get_user_household_id()`
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_items` for live sync
- `set_grocery_items_updated_at` trigger reusing the existing `set_updated_at()` function

**TypeScript types (src/types/database.ts):**
- `GroceryList` interface matching migration schema
- `GroceryItem` interface with `category_source: 'auto' | 'user'` and `is_staple_restock: boolean`
- Database table entries for `grocery_lists` and `grocery_items`

**Query keys (src/lib/queryKeys.ts):**
- `grocery.list(householdId, weekStart)` — for fetching the weekly grocery list
- `grocery.items(listId)` — for fetching items within a list

**groceryGeneration.ts pure functions:**
- `aggregateIngredients`: Traverses resolved slot data, merges food quantities by food_id, handles nested recipe traversal (depth limit 5), excludes cooked recipes, skips null meal_id slots
- `subtractInventory`: Splits into needToBuy/alreadyHave with partial coverage support; calls `getAvailableQuantity` from inventory utils
- `assignCategories`: User override check from previousItems first, then keyword matching against CATEGORY_KEYWORDS (10 categories, ~40+ keywords each), fallback to 'Other'
- `formatDisplayQuantity`: Converts >=1000g to kg or L (liquid flag), rounds to 1 decimal place
- `addRestockStaples`: Calls `getLowStockStaples(items, 100)`, filters already-in-list food IDs
- `computeItemCost`: (quantity_grams / 100) * cost_per_100g lookup, null when no price
- `STORE_CATEGORIES` constant and `CATEGORY_KEYWORDS` map exported

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test helper null handling for meal_id**
- **Found during:** Task 2 GREEN phase
- **Issue:** `makeResolvedSlot` helper used `overrides.meal_id ?? 'meal-1'` which coerces explicit `null` to `'meal-1'` — the "skips null meal_id" test always passed null slots through
- **Fix:** Changed to `'meal_id' in overrides ? (overrides.meal_id ?? null) : 'meal-1'` — checks property presence vs. nullish coalescence
- **Files modified:** src/utils/groceryGeneration.test.ts
- **Commit:** a827c5a (included in GREEN commit)

## Known Stubs

None — all functions are fully implemented. The generation functions are pure utilities; they receive pre-fetched data and return computed results. No UI wiring in this plan (Plan 02 handles that).

## Self-Check: PASSED

- supabase/migrations/022_grocery_list.sql — FOUND
- src/utils/groceryGeneration.ts — FOUND
- src/utils/groceryGeneration.test.ts — FOUND
- .planning/phases/18-grocery-list-generation/18-01-SUMMARY.md — FOUND
- commit 7299521 — FOUND
- commit a827c5a — FOUND
