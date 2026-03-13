---
phase: 02-food-data-recipe-builder
plan: "02"
subsystem: food-data-edge-functions
tags: [edge-functions, usda, open-food-facts, anthropic, deno, api-proxy]
dependency_graph:
  requires: []
  provides: [search-usda-edge-fn, search-off-edge-fn, verify-nutrition-edge-fn]
  affects: [02-03-food-search-ui, 02-04-recipe-builder]
tech_stack:
  added: [Deno Edge Functions, USDA FDC API, Open Food Facts API, Claude Haiku]
  patterns: [server-side API proxy, per-100g normalization, graceful degradation, CORS proxy]
key_files:
  created:
    - supabase/functions/search-usda/index.ts
    - supabase/functions/search-off/index.ts
    - supabase/functions/verify-nutrition/index.ts
  modified: []
decisions:
  - "USDA deduplication uses priority map (Foundation=0, SR Legacy=1, Survey=2, Branded=3) — lower number wins on duplicate description"
  - "OFF filter keeps products with at least one nutrition field present (not all-or-nothing)"
  - "verify-nutrition adds local outlier detection (macro math, negatives, zero-calories) before calling Claude, combines both warning sets in response"
  - "Graceful degradation: verify-nutrition returns verified=false with status 200 (not error) when Anthropic key missing or API down"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-13"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
---

# Phase 2 Plan 02: Food Data Edge Functions Summary

**One-liner:** Three Supabase Edge Functions proxy USDA FDC, Open Food Facts, and Claude Haiku with per-100g normalization, deduplication, and graceful AI verification degradation.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | USDA and Open Food Facts Edge Functions | 682772c | supabase/functions/search-usda/index.ts, supabase/functions/search-off/index.ts |
| 2 | AI nutrition verification Edge Function | 89d6439 | supabase/functions/verify-nutrition/index.ts |

## What Was Built

Three Deno Edge Functions ready for `supabase functions deploy`:

**search-usda** — Accepts `{ query, pageSize? }`, calls USDA FDC `/foods/search` with all four dataTypes, deduplicates results by food description using a priority map (Foundation wins over Branded), normalizes to `{ fdcId, name, source: 'usda', dataType, calories, protein, fat, carbs, portions }`.

**search-off** — Accepts `{ query, pageSize? }`, calls Open Food Facts search with required `User-Agent` header (ToS), filters products missing all nutrition fields, normalizes to `{ id, name, source: 'off', calories, protein, fat, carbs }`.

**verify-nutrition** — Accepts `{ foodName, usdaValues?, offValues? }`, calls Claude Haiku to cross-check values, runs local outlier detection (macro math check, negatives, zero-calorie with non-zero macros), combines AI and local warnings. Degrades gracefully — returns `verified: false` with status 200 rather than an error when API key is missing or Anthropic is unavailable.

## Decisions Made

1. **USDA deduplication priority map** — Numeric rank (0-3) makes comparison straightforward and easy to extend.
2. **OFF filter threshold** — At least one nutrition field present (not requiring all four), since many real products have partial data.
3. **Local outlier detection + AI** — Local checks run even when Anthropic is unavailable, providing a baseline level of data quality warnings.
4. **verify-nutrition HTTP 200 on degradation** — Returning 200 prevents the food search UI from treating a missing AI key as an error; callers check `verified: false`.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] supabase/functions/search-usda/index.ts exists
- [x] supabase/functions/search-off/index.ts exists
- [x] supabase/functions/verify-nutrition/index.ts exists
- [x] Commits 682772c and 89d6439 exist in git log
- [x] All API keys via Deno.env.get (none hardcoded)
- [x] OPTIONS preflight handled in all three functions

## Self-Check: PASSED
