---
phase: 23-prep-optimisation
fixed_at: 2026-04-12T00:00:00Z
review_path: .planning/phases/23-prep-optimisation/23-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 7
skipped: 2
status: partial
---

# Phase 23: Code Review Fix Report

**Fixed at:** 2026-04-12
**Source review:** .planning/phases/23-prep-optimisation/23-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 7
- Skipped: 2

## Fixed Issues

### WR-01: Timer interval captures stale `handleTimerComplete` closure

**Files modified:** `src/pages/CookModePage.tsx`
**Commit:** e028a08
**Applied fix:** Replaced inline `setInterval` in `handlePrimaryAction` with a `useEffect` that tracks the active step's `timer_started_at` from persisted session state. The effect uses `setTimeout` with the exact remaining time and auto-clears when `activeStepId` changes (e.g. collaborator marks step done remotely). Removed the now-unused `timerIntervalRef`.

### WR-02: `useCompleteCookSession` missing ownership check

**Files modified:** `src/hooks/useCookSession.ts`
**Commit:** 56089ab
**Applied fix:** Added `.eq('started_by', session!.user.id)` guard to the `useCompleteCookSession` mutation so only the session creator can mark it completed. Added `useAuth()` call to access the session user.

### WR-04: `compute-batch-prep` writes slot reassignments without verifying plan ownership

**Files modified:** `supabase/functions/compute-batch-prep/index.ts`
**Commit:** ce23b2b
**Applied fix:** Added an explicit `meal_plans` query after the membership check that verifies `planId` belongs to `householdId`. Returns "Plan not found or access denied" if the check fails, preventing cross-household plan mutation via hallucinated or malicious `planId` values.

### WR-05: Cook mode routes lack `AuthGuard`

**Files modified:** `src/App.tsx`
**Commit:** 7364b62
**Applied fix:** Wrapped the three `/cook` routes in an `AuthGuard` + `Outlet` layout route. Added `Outlet` to the `react-router-dom` import. Unauthenticated users navigating to cook URLs now redirect to `/auth` instead of seeing a blank page.

### WR-06: `CookModePage` uses `mealId` UUID as the meal name display string

**Files modified:** `src/pages/CookModePage.tsx`, `src/hooks/useRecipeSteps.ts`
**Commit:** 994a83a
**Applied fix:** Extended `RecipeStepsData` interface in `useRecipeSteps.ts` to include `name` (the query already fetches `select('*')` so `recipe.name` was available but not returned). Updated both notification and header references in `CookModePage` to use `recipeStepsData?.name ?? 'Cook Mode'` instead of the raw UUID.

### WR-07: `useUpdateCookStep` read-modify-write race condition undocumented

**Files modified:** `src/hooks/useCookSession.ts`
**Commit:** add9d2b
**Applied fix:** Added documentation comment at the top of the mutation explaining the last-write-wins behavior, that realtime syncs the final state, and that a DB-side `jsonb_set` RPC should be considered for high-frequency concurrent updates.

### WR-08: `RecipeStepsSection` regeneration fires without confirmation when steps exist but are unedited

**Files modified:** `src/components/recipe/RecipeStepsSection.tsx`
**Commit:** 0cdf756
**Applied fix:** Changed the condition from `edited && steps.length > 0` to `steps.length > 0` so the confirmation dialog shows whenever existing steps would be replaced, regardless of the `edited` flag.

## Skipped Issues

### WR-03: `generate-recipe-steps` blocks if household has no meal plan

**File:** `supabase/functions/generate-recipe-steps/index.ts:191`
**Reason:** The `plan_generations.plan_id` column has a `NOT NULL` constraint (migration 026). The suggested fix of using `latestPlan?.id ?? null` would violate this DB constraint. Fixing this requires a new migration to `ALTER COLUMN plan_id DROP NOT NULL` plus updating the foreign key, which is out of scope for a code review fix (irreversible in production per CLAUDE.md risky areas). Note: the other edge functions (`generate-cook-sequence`, `generate-reheat-sequence`) already use the `?? null` pattern, meaning they would also fail at the DB layer if no plan exists -- the constraint needs to be relaxed for all three.
**Original issue:** A new household with recipes but no meal plan receives a confusing error when trying to generate recipe steps.

### WR-09: `useFreezerClassification` uses `as any` cast to bypass TypeScript

**File:** `src/hooks/useFreezerClassification.ts:17` and `39`
**Reason:** Fix caused TypeScript errors, rolled back. The `as any` cast exists because the generated Supabase types (`src/types/database.ts`) do not include `freezer_friendly` and `freezer_shelf_life_weeks` in the `recipes.Update` type. Removing the cast produces `TS2345: Argument of type '{ freezer_friendly: boolean }' is not assignable to parameter of type 'never'`. The fix requires regenerating Supabase types (`supabase gen types typescript`) which is a separate task.
**Original issue:** Type-checking is disabled for these DB calls via `as any` cast, hiding potential column name/type mismatches.

---

_Fixed: 2026-04-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
