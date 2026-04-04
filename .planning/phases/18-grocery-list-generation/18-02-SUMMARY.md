---
phase: 18-grocery-list-generation
plan: "02"
subsystem: grocery
tags: [hooks, realtime, ui, navigation, routing]
dependency_graph:
  requires: ["18-01"]
  provides: [grocery-list-ui, realtime-sync, navigation-grocery]
  affects: [App.tsx, Sidebar, MobileDrawer, AppShell tests]
tech_stack:
  added: [supabase-realtime-postgres_changes]
  patterns: [useEffect-realtime-cleanup, optimistic-toggle, undo-toast]
key_files:
  created:
    - src/hooks/useGroceryList.ts
    - src/hooks/useGroceryItems.ts
    - src/hooks/useGenerateGroceryList.ts
    - src/hooks/useToggleGroceryItem.ts
    - src/hooks/useAddManualGroceryItem.ts
    - src/pages/GroceryPage.tsx
    - src/components/grocery/GroceryCategorySection.tsx
    - src/components/grocery/GroceryItemRow.tsx
    - src/components/grocery/GroceryAlreadyHaveSection.tsx
    - src/components/grocery/BudgetWarningBanner.tsx
    - src/components/grocery/ManualAddItemInput.tsx
  modified:
    - src/components/layout/Sidebar.tsx
    - src/components/layout/MobileDrawer.tsx
    - src/App.tsx
    - tests/AppShell.test.tsx
decisions:
  - "Supabase realtime via postgres_changes on grocery_items table filtered by list_id — first realtime subscription in this project"
  - "Already Have items stored in DB with notes='inventory-covered' for snapshot consistency per D-01"
  - "Optimistic toggle with rollback on useToggleGroceryItem — realtime handles cross-member sync"
  - "Undo toast uses 4s setTimeout with cleanup on unmount; toast shows on check-off only"
metrics:
  duration_minutes: 35
  completed: "2026-04-04T17:40:00Z"
  tasks: 2
  files_created: 11
  files_modified: 4
---

# Phase 18 Plan 02: Grocery Hooks, UI, and Navigation Summary

Complete user-facing grocery list experience with Supabase realtime sync, 5 React hooks orchestrating the generation pipeline, and a full GroceryPage with category grouping, check-off, budget warnings, and manual item addition.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Grocery hooks with Supabase realtime | dd09864 | 5 hook files |
| 2 | GroceryPage UI, components, nav, and routing | 0beac85 | 11 files created, 4 modified |

## What Was Built

### Task 1: Grocery Hooks

**useGroceryList** — queries `grocery_lists` for current week. Key: `queryKeys.grocery.list(householdId, weekStart)`.

**useGroceryItems** — queries `grocery_items` ordered by category/name. Sets up Supabase realtime channel `grocery-items-{listId}` subscribed to `postgres_changes` on `grocery_items` filtered by `list_id`. On any change, invalidates the items query. Cleans up channel on unmount.

**useGenerateGroceryList** — orchestration mutation:
1. Fetches meal plan for current week
2. Fetches slots with nested meal_items
3. Fetches recipe_ingredients for all recipes used in slots (batch query)
4. Fetches spend_logs with source='cook' for current week → cookedRecipeIds set (D-03)
5. Fetches inventory, food prices, previous category overrides
6. Runs aggregateIngredients → subtractInventory → assignCategories → addRestockStaples → computeItemCost → formatDisplayQuantity
7. Upserts grocery_lists, deletes non-manual items, inserts new items
8. Already Have items stored with `notes='inventory-covered'`

**useToggleGroceryItem** — optimistic toggle with rollback. Updates cache immediately for responsive feel; realtime subscription propagates to other members.

**useAddManualGroceryItem** — inserts free-text items with `is_manual: true`, category 'Other'.

### Task 2: GroceryPage and Components

**GroceryPage** renders 4 states:
- No meal plan → empty state with "Go to Plan" CTA
- Plan exists, no list → "Generate Grocery List" full-width CTA
- List exists → cost summary bar + category sections + already have section
- Over budget → BudgetWarningBanner between cost summary and items

**GroceryCategorySection** groups items with unchecked (alphabetical) first, checked at bottom per D-11/D-13.

**GroceryItemRow** has min-h-[44px] touch target, checkbox with bg-primary fill, line-through on checked, Restock badge, formatted quantity, estimated cost or "?" placeholder, Google retailer lookup link.

**GroceryAlreadyHaveSection** collapsible, default collapsed, aria-expanded, opacity-60 items.

**BudgetWarningBanner** role="alert" aria-live="assertive" with dark mode classes.

**ManualAddItemInput** Enter-key and button submit, no empty string validation.

**Navigation** — Grocery added between Inventory and Household in Sidebar (9 items total) and MobileDrawer. Route /grocery added in App.tsx. AppShell test updated to assert 9 items including Grocery.

## Decisions Made

- Supabase realtime `postgres_changes` subscription on `grocery_items` with `list_id` filter is the first use of Supabase realtime in this project. Channel name pattern: `grocery-items-{listId}`.
- Already Have items stored in DB with `notes='inventory-covered'` (not computed client-side) per D-01 snapshot consistency requirement.
- Optimistic update on toggle for immediate UX responsiveness; realtime channel handles eventual consistency across members.
- Undo toast timer cleared on unmount to prevent setState-after-unmount warnings.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data sources are wired to live Supabase queries.

## Self-Check: PASSED
