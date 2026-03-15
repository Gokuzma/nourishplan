---
phase: 11-nutrition-calculation-fixes
plan: "01"
subsystem: food-logging
tags: [nutrition, food-logs, serving-unit, data-model, bug-fix]
dependency_graph:
  requires: []
  provides: [serving_unit-column, correct-insert-macros, dynamic-serving-display]
  affects: [food_logs, FreeformLogModal, LogMealModal, LogEntryItem, HomePage]
tech_stack:
  added: []
  patterns: [per-unit-macro-normalization, nullable-column-fallback]
key_files:
  created:
    - supabase/migrations/015_serving_unit.sql
  modified:
    - src/types/database.ts
    - src/hooks/useFoodLogs.ts
    - src/components/log/FreeformLogModal.tsx
    - src/components/log/LogMealModal.tsx
    - src/components/log/LogEntryItem.tsx
    - src/pages/HomePage.tsx
decisions:
  - "FreeformLogModal now logs servings_logged=quantity with calories_per_serving=per-unit values, fixing the double-multiplication bug in EditLogModal"
  - "serving_unit column is nullable; null means legacy entry; display fallback is 'serving'"
  - "Micronutrients in FreeformLogModal are scaled per-unit (selectedUnit.grams/100 * val) matching the new per-unit macro pattern"
  - "meal_items does not store micronutrients so LogMealModal keeps micronutrients:{} — out of scope for this phase"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-15"
  tasks_completed: 2
  files_changed: 6
  files_created: 1
---

# Phase 11 Plan 01: Food Logging Data Model Fix Summary

**One-liner:** Per-unit macro normalization in FreeformLogModal with serving_unit column and dynamic display, eliminating double-multiplication on servings edit.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB migration, type updates, and hook expansion | 2f1dc2a | 015_serving_unit.sql, database.ts, useFoodLogs.ts |
| 2 | Fix FreeformLogModal pattern, LogMealModal serving_unit, LogEntryItem display, bulk insert | 367d63a | FreeformLogModal.tsx, LogMealModal.tsx, LogEntryItem.tsx, HomePage.tsx |

## What Was Built

**Migration 015:** Added `serving_unit TEXT` column (nullable) to `food_logs`. Null means legacy entry; UI falls back to `'serving'`.

**Type update:** `FoodLog` interface now includes `serving_unit: string | null`. The `Database` type's `food_logs.Insert` inherits this via `Omit<FoodLog, ...>`.

**Hook expansion:** `InsertFoodLogParams` gains `serving_unit?: string | null`. Both `useInsertFoodLog` and `useBulkInsertFoodLogs` pass `serving_unit` to Supabase. `useUpdateFoodLog` expanded to accept optional `calories_per_serving`, `protein_per_serving`, `fat_per_serving`, `carbs_per_serving` fields for future use.

**FreeformLogModal fix:** The core bug — logging `servings_logged: 1` with pre-scaled total macros — is fixed. Now logs `servings_logged: quantity` with `calories_per_serving = (selectedUnit.grams / 100) * food.calories` (true per-unit value). EditLogModal's multiply `log.calories_per_serving * servings` now produces correct totals without double-multiplication.

**LogMealModal:** Added `serving_unit: 'serving'` to meal log inserts.

**LogEntryItem:** Replaced hardcoded `'1 serving'` / `'N servings'` with `\`${log.servings_logged} ${log.serving_unit ?? 'serving'}\`` — shows "1.5 cups", "200 g", "1 serving", etc.

**HomePage handleLogAll:** Added `serving_unit: 'serving'` to bulk insert rows.

## Verification

- `npx tsc --noEmit` passes with no errors after both tasks.
- Migration file contains `ADD COLUMN IF NOT EXISTS serving_unit TEXT`.
- `FoodLog` interface contains `serving_unit: string | null`.
- `InsertFoodLogParams` contains `serving_unit`.
- `useUpdateFoodLog` mutationFn conditionally sets `calories_per_serving` in updates.
- `FreeformLogModal` logs `servings_logged: quantity` and `calories_per_serving: (selectedUnit.grams / 100)` pattern.
- `LogEntryItem` uses `log.serving_unit` (no hardcoded `'1 serving'` fallback in display logic).
- `HomePage` handleLogAll rows include `serving_unit`.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- supabase/migrations/015_serving_unit.sql — FOUND
- src/types/database.ts — FOUND (serving_unit added to FoodLog)
- src/hooks/useFoodLogs.ts — FOUND (serving_unit in params and mutationFns)
- src/components/log/FreeformLogModal.tsx — FOUND (servings_logged: quantity, per-unit macros)
- src/components/log/LogMealModal.tsx — FOUND (serving_unit: 'serving')
- src/components/log/LogEntryItem.tsx — FOUND (log.serving_unit ?? 'serving')
- src/pages/HomePage.tsx — FOUND (serving_unit: 'serving' in handleLogAll)

Commits verified:
- 2f1dc2a: feat(11-01): add serving_unit column, update FoodLog type, expand useUpdateFoodLog
- 367d63a: feat(11-01): fix FreeformLogModal logging pattern, add serving_unit display
