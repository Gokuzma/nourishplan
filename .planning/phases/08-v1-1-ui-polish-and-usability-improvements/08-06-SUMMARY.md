---
phase: 08-v1-1-ui-polish-and-usability-improvements
plan: "06"
subsystem: nutrition-targets
tags: [macro-conversion, form, tdd, utility, persistence]
dependency_graph:
  requires: ["08-01"]
  provides: ["macro-percent-toggle", "macro-conversion-utils"]
  affects: ["src/components/targets/NutritionTargetsForm.tsx", "src/hooks/useNutritionTargets.ts"]
tech_stack:
  added: []
  patterns: ["pure-utility-functions", "tdd-red-green", "real-time-cross-calculation"]
key_files:
  created:
    - src/utils/macroConversion.ts
    - src/utils/__tests__/macroConversion.test.ts
  modified:
    - src/components/targets/NutritionTargetsForm.tsx
    - src/hooks/useNutritionTargets.ts
decisions:
  - "macros state always holds grams even in percent mode — handlePercentageChange keeps grams in sync, submit always sends absolute grams"
  - "calorie change in percent mode uses window.confirm for recalculation prompt; declining switches to grams mode to avoid stale percentages"
  - "pctToGrams returns 0 for zero calories (guard against division by zero before Math.round)"
metrics:
  duration_minutes: 10
  completed_date: "2026-03-15"
  tasks_completed: 2
  files_changed: 4
---

# Phase 8 Plan 06: Macro Percentage Scaling Toggle Summary

Grams/percent macro input toggle with real-time cross-calculation, P+C+F=100% validation, calorie-change confirmation, and DB persistence of macro_mode preference.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create macro conversion utility functions (TDD) | 070cdaa | src/utils/macroConversion.ts, src/utils/__tests__/macroConversion.test.ts |
| 2 | Add grams/percent toggle to NutritionTargetsForm and persist macro_mode | 9ad84cd | src/components/targets/NutritionTargetsForm.tsx, src/hooks/useNutritionTargets.ts |

## What Was Built

**macroConversion.ts** — Pure utility module exporting:
- `pctToGrams(pct, calories, kcalPerGram)` — converts percentage to absolute grams, rounded
- `gramsToPct(grams, calories, kcalPerGram)` — converts grams to percentage, rounded; returns 0 on zero calories
- `isMacroSumValid(p, c, f)` — validates P+C+F sums to 100 within 0.5% tolerance
- `PROTEIN_KCAL_PER_G=4`, `CARBS_KCAL_PER_G=4`, `FAT_KCAL_PER_G=9` constants
- 14 TDD tests covering all behavior and edge cases

**NutritionTargetsForm.tsx** — Added:
- `macroMode` state (`'grams' | 'percent'`) initialized from `target.macro_mode`
- `percentages` state with real-time sync with `macros` grams state
- Grams/Percent toggle buttons (active = `bg-primary text-white`, inactive = bordered)
- Labels switch between "Protein (g)" and "Protein (%)" based on mode
- Inline error: "Percentages must sum to 100% (currently X%)" when `!isMacroSumValid`
- `window.confirm` prompt on calorie change in percent mode — yes recalculates grams, no switches to grams mode
- `macro_mode` included in upsert payload on save

**useNutritionTargets.ts** — Added `macro_mode?: 'grams' | 'percent'` to mutation params; included in upsert payload when provided.

## Decisions Made

- Grams state is always kept in sync even in percent mode so the form can always submit absolute grams without a final conversion step on submit.
- `window.confirm` chosen for calorie-change confirmation — simple, no dependency on a modal component, matches the existing pattern used in the codebase for confirmation dialogs.
- `pctToGrams` guards `kcalPerGram` too (returns 0 if zero) to avoid NaN for edge case inputs.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- 14/14 macroConversion tests pass: `npx vitest run src/utils/__tests__/macroConversion.test.ts`
- TypeScript: `npx tsc --noEmit` reports no errors in modified files
- Grep confirms all required imports/usage in NutritionTargetsForm.tsx: `macro_mode`, `macroMode`, `pctToGrams`, `gramsToPct`, `isMacroSumValid`

## Self-Check: PASSED

- `src/utils/macroConversion.ts` — FOUND
- `src/utils/__tests__/macroConversion.test.ts` — FOUND
- `src/components/targets/NutritionTargetsForm.tsx` — FOUND (modified)
- `src/hooks/useNutritionTargets.ts` — FOUND (modified)
- Commit 070cdaa — FOUND
- Commit 9ad84cd — FOUND
