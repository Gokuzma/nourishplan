---
phase: 20-feedback-engine-dietary-restrictions
plan: 02
subsystem: feedback-engine
tags: [hooks, components, ratings, react, tanstack-query]
dependency_graph:
  requires:
    - supabase/migrations/024_feedback_dietary.sql (Plan 01)
    - src/types/database.ts RecipeRating type (Plan 01)
    - src/lib/queryKeys.ts ratings factory (Plan 01)
  provides:
    - src/hooks/useRatings.ts (useUnratedCookedMeals, useRateMeal)
    - src/components/feedback/RateMealsCard.tsx
    - src/components/feedback/MealRatingRow.tsx
    - HomePage integration of RateMealsCard
  affects:
    - src/pages/HomePage.tsx (renders RateMealsCard)
    - Phase 22 planning engine (consumes recipe_ratings data)
    - Phase 24 dynamic portioning (consumes rating history)
tech_stack:
  added: []
  patterns:
    - TanStack Query useQuery compound queryFn (multi-step Supabase joins client-side)
    - useMutation with invalidateQueries prefix-based cache bust
    - Self-contained card component (all data fetching internal, no props)
    - Controlled hover state for star rating UX
    - Fade-out transition with onTransitionEnd hidden state toggle
key_files:
  created:
    - src/hooks/useRatings.ts
    - src/components/feedback/RateMealsCard.tsx
    - src/components/feedback/MealRatingRow.tsx
  modified:
    - src/pages/HomePage.tsx
decisions:
  - "useUnratedCookedMeals uses a 3-step compound queryFn (spend_logs → recipe_ratings filter → recipes lookup) rather than a JOIN because recipe_ratings is filtered by rated_at date which Supabase REST does not support in a single nested query"
  - "RateMealsCard computes today via UTC (getUTCFullYear/Month/Date) consistent with HomePage todayString() utility"
  - "savedIds Set tracks rated meals in component state for immediate UI feedback; unrated-cooked query invalidation provides server sync"
  - "Fade-out uses CSS opacity transition + onTransitionEnd to set hidden=true — avoids layout shift from immediate unmount"
  - "MealRatingRow uses onFocus/onBlur in addition to onMouseEnter/Leave for keyboard-accessible hover highlighting"
metrics:
  duration_minutes: 2
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_modified: 4
requirements:
  - FEED-01
---

# Phase 20 Plan 02: Rating Hooks, Components, and HomePage Integration Summary

**One-liner:** TanStack Query hooks detecting unrated cooked meals via spend_logs, star-rating card components with WCAG touch targets, and HomePage integration rendering the rating prompt after cooking.

## What Was Built

- `useUnratedCookedMeals(householdId, userId, today)` — 3-step compound query: finds today's cooked spend_logs, subtracts already-rated recipe_ids, then fetches recipe names for remaining unrated ids
- `useRateMeal()` — mutation inserting into recipe_ratings with recipe name snapshot, invalidates both `['unrated-cooked']` and `['ratings', householdId]` prefixes
- `MealRatingRow` — per-recipe star rating row with 44px touch targets (WCAG 2.5.5), hover highlighting, and "Saved" confirmation state
- `RateMealsCard` — self-contained card that renders nothing when no unrated meals exist, fades out with CSS opacity transition after all meals are rated
- `HomePage.tsx` now renders `<RateMealsCard />` after `InventorySummaryWidget`

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Rating hooks useUnratedCookedMeals + useRateMeal | 5f92671 | src/hooks/useRatings.ts |
| 2 | RateMealsCard + MealRatingRow + HomePage integration | d6734e3 | src/components/feedback/RateMealsCard.tsx, MealRatingRow.tsx, HomePage.tsx |

## Verification Results

- `grep -c "useUnratedCookedMeals\|useRateMeal" src/hooks/useRatings.ts` — 2
- All 8 acceptance criteria for Task 1 pass (export functions, spend_logs, source=cook filter, not null filter, recipe_ratings, invalidateQueries, enabled guard)
- All 8 acceptance criteria for Task 2 pass (heading text, hook usage, border-accent/30, aria-label, min-h-44px, text-primary, RateMealsCard in HomePage)
- `npx vitest run tests/ratings.test.ts tests/restrictions.test.ts tests/wontEat.test.ts src/utils/monotonyDetection.test.ts` — 10 passed, 20 todo

## Deviations from Plan

None — plan executed exactly as written.

Pre-existing test failures in `tests/theme.test.ts` (localStorage.clear not a function — `--localstorage-file` flag issue), `tests/auth.test.ts` (missing Router context), and `tests/guide.test.ts` (hash deep-link) are unrelated to this plan's changes and were present before execution.

## Known Stubs

None. The rating card renders nothing when `unratedMeals.length === 0 && savedIds.size === 0`, which is the expected behavior when no meals have been cooked for the day.

## Threat Surface Scan

No new network endpoints. `useRateMeal` inserts into `recipe_ratings` — the RLS policy from migration 024 enforces `WITH CHECK (rated_by_user_id = auth.uid())` (T-20-01) and the DB CHECK constraint enforces `rating BETWEEN 1 AND 5` (T-20-04). Both threat mitigations from the plan's threat model are enforced at the DB layer, not the client layer.

## Self-Check: PASSED

- `src/hooks/useRatings.ts` — FOUND
- `src/components/feedback/RateMealsCard.tsx` — FOUND
- `src/components/feedback/MealRatingRow.tsx` — FOUND
- `src/pages/HomePage.tsx` contains "RateMealsCard" — FOUND
- Commit 5f92671 — FOUND
- Commit d6734e3 — FOUND
