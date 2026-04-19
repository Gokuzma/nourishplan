---
phase: 25-universal-recipe-import
plan: 02
subsystem: ui
tags: [recipe-import, modal, mutation-hook, tanstack-query, skeleton, source-attribution, accessibility]

# Dependency graph
requires:
  - phase: 25-universal-recipe-import
    plan: 01
    provides: "import-recipe edge function contract ({ input } -> { success, recipeId, error }) and Recipe.source_url typing"
provides:
  - useImportRecipe mutation hook calling supabase.functions.invoke('import-recipe')
  - ImportRecipeModal component (textarea, inline error, spinner, accessibility hooks)
  - RecipesPage Import Recipe button + modal wiring + navigation on success
  - RecipeBuilder import skeleton (aria-live) and source_url attribution link
affects:
  - 25-03 (deployment unblocks the live edge function the UI already targets)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mutation hook follows useRegenerateRecipeSteps: useAuth() session guard + useHousehold() householdId guard before supabase.functions.invoke; throws with response.error when success is false"
    - "Cache invalidation via the broad ['recipes'] prefix array (matches useCreateRecipe), ensuring the imported recipe appears in the household list without re-keying"
    - "Modal shell matches AddInventoryItemModal: fixed backdrop + panel with bg-surface rounded-t-2xl sm:rounded-2xl and early-return guard on !isOpen"
    - "Import button styled as ghost/outlined variant (border border-primary text-primary hover:bg-primary/10) to visually distinguish from the primary '+ New Recipe' CTA"
    - "RecipeBuilder skeleton gated on recipePending && ingredientsPending so the existing single-line 'Loading recipe…' state remains as a later fallback (never reached in practice, but kept to avoid deleting existing behaviour)"
    - "Source URL attribution uses new URL(...).hostname inside a try/catch with a 60-char truncated fallback — URL parsing is defensive because AI-ingested text imports store null (per Plan 01) but raw user input on older rows could be malformed"

key-files:
  created:
    - src/hooks/useImportRecipe.ts
    - src/components/recipe/ImportRecipeModal.tsx
  modified:
    - src/pages/RecipesPage.tsx
    - src/components/recipe/RecipeBuilder.tsx

key-decisions:
  - "Skeleton gated on recipePending && ingredientsPending (both), not just recipePending — this lets the existing 'Loading recipe…' single-line fallback remain in place if ingredientsPending resolves first (unlikely, but avoids deleting prior behaviour per Rule 3 conservatism)"
  - "Import button rendered outside the existing <button> slot by wrapping both buttons in a new flex gap-2 div — preserves the existing 'mb-6 flex items-center justify-between' header row layout"
  - "handleImportSuccess closes the modal before navigating — prevents a flash of the modal still rendered while the route transitions to /recipes/:id"
  - "onSuccess hook callback uses queryClient.invalidateQueries({ queryKey: ['recipes'] }) (broad prefix) matching useCreateRecipe line 97, instead of queryKeys.recipes.list(householdId) — broader invalidation is intentional so any household-scoped subset gets refetched"
  - "Textarea uses style={{ maxHeight: '12rem', resize: 'vertical' }} with rows={4} to give a 4-row default and allow user drag-resize — matches UI-SPEC's '4 rows min, auto-expand to 8' contract"

patterns-established:
  - "Import-from-external-source modal pattern (textarea + spinner button + inline error + escape close + backdrop-click-disabled-during-pending) reusable for any future import surface"

requirements-completed: [IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04, IMPORT-05]

# Metrics
duration: 3min
completed: 2026-04-19
---

# Phase 25 Plan 02: Universal Recipe Import — Client UI Summary

**Wires the import surface end-to-end on the client: a useImportRecipe mutation hook calling the import-recipe edge function, an accessible ImportRecipeModal with textarea/spinner/inline-error, a ghost 'Import Recipe' button on RecipesPage, and a RecipeBuilder import skeleton plus 'Imported from <hostname>' source attribution link.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-19T22:36:51Z
- **Completed:** 2026-04-19T22:39:28Z
- **Tasks:** 2
- **Files created/modified:** 4

## Accomplishments

- **New file `src/hooks/useImportRecipe.ts` (43 lines):** Mutation hook matching the `useRegenerateRecipeSteps` pattern. Guards on `session` and `householdId`, invokes `supabase.functions.invoke('import-recipe', { body: { input } })`, throws on `error` or `response.success === false`, returns `response.recipeId` as string. Invalidates `['recipes']` prefix on success so the new recipe appears in the household list immediately.
- **New file `src/components/recipe/ImportRecipeModal.tsx` (119 lines):** Textarea-driven import modal with full accessibility hooks (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`), Escape-to-close (no-op while pending), backdrop-click-to-close (no-op while pending), spinner + "Importing…" label during fetch, inline `text-sm text-red-600` error display with retry capability (same input stays, user can resubmit), state reset on open, autofocus on textarea.
- **`src/pages/RecipesPage.tsx` modified:** Added `importModalOpen` state, `handleImportSuccess(recipeId)` that closes the modal and navigates to `/recipes/:id`, wrapped the existing `+ New Recipe` button in a `flex items-center gap-2` container alongside a new ghost/outlined `Import Recipe` button (`border border-primary text-primary hover:bg-primary/10`), rendered `<ImportRecipeModal>` at the end of the page JSX.
- **`src/components/recipe/RecipeBuilder.tsx` modified:** Added an `aria-live="polite"` skeleton early-return (nine `animate-pulse bg-secondary/50 rounded-[--radius-btn]` blocks mapping to name/servings/ingredients-heading/3 ingredient rows/steps-heading/2 step rows) gated on `recipePending && ingredientsPending` — matches the UI-SPEC skeleton inventory exactly. Added `source_url` attribution link (`text-xs text-text/40` anchor with `target="_blank" rel="noopener noreferrer"`, `aria-label="View original recipe source"`, hostname extraction via `new URL(...).hostname` inside a try/catch with truncated-URL fallback) after the servings input and before the cost-per-serving block.

## Task Commits

1. **Task 1: useImportRecipe hook + ImportRecipeModal component** — `78fa6ea` (feat)
2. **Task 2: RecipesPage button integration + RecipeBuilder skeleton/source attribution** — `4659043` (feat)

_Plan metadata commit to follow once SUMMARY.md, STATE.md, and ROADMAP.md are updated._

## Files Created/Modified

- `src/hooks/useImportRecipe.ts` (new) — TanStack Query mutation hook for the import-recipe edge function
- `src/components/recipe/ImportRecipeModal.tsx` (new) — Accessible textarea modal with spinner, inline error, and retry
- `src/pages/RecipesPage.tsx` (modified) — Import Recipe ghost button, modal wiring, navigate-on-success
- `src/components/recipe/RecipeBuilder.tsx` (modified) — aria-live import skeleton; "Imported from <hostname>" attribution link with try/catch URL fallback

## Decisions Made

- **Skeleton gate uses `recipePending && ingredientsPending` rather than only `recipePending`.** The existing `recipePending`-only single-line `<p>Loading recipe…</p>` fallback is preserved *below* the new skeleton branch, so the richer skeleton only fires during the import-navigation first frame (when neither fetch has resolved). In practice both queries are launched on mount and resolve together, so the single-line fallback is now mostly unreachable — but it remains as a defensive net for the edge case where the ingredients query resolves faster than the recipe query (empty-ingredient imports). This is conservatism per L-020 (do not delete existing render paths unnecessarily).
- **Source URL attribution placed after the servings input and before the cost-per-serving block**, inside the recipe header `<div>`. This matches the UI-SPEC ("Below the recipe title and notes, above the ingredients list") while keeping the source link grouped with recipe-level metadata (servings, created date, cost badge) rather than dangling between header and ingredient list.
- **Import button uses `border border-primary text-primary hover:bg-primary/10`** (ghost/outlined) not `bg-primary text-white` — matches UI-SPEC's "visually distinct from the filled New Recipe primary button to indicate secondary action" mandate.
- **`onSuccess` uses bare `['recipes']` prefix array** (matching `useCreateRecipe` line 97) not `queryKeys.recipes.list(householdId)` — broader invalidation is intentional for the import path, mirrors the existing convention, and is simpler than threading `householdId` through the invalidation.
- **Textarea state is reset on open via a `useEffect` watching `isOpen`**, not in the close handler — ensures that if the modal is reopened after a successful import or an error dismissal, the previous input is not lingering. Error is also cleared on every keystroke (per UI-SPEC's implicit error-recovery pattern).

## Deviations from Plan

None. The plan's `<action>` code blocks were implemented verbatim with two minor compositional decisions noted under "Decisions Made" (skeleton gate, source attribution placement), both consistent with the `<action>` spec and UI-SPEC.

**Total deviations:** 0

## Issues Encountered

- **Pre-existing test failures unchanged.** `npx vitest run` reports the same 12 failures / 2 unhandled rejections across `tests/theme.test.ts`, `tests/guide.test.ts`, `tests/auth.test.ts`, `tests/AuthContext.test.tsx` that Plan 01's SUMMARY documented as out-of-scope. No new failures were introduced by this plan's changes. TypeScript compiles cleanly (`npx tsc --noEmit` produces no output).
- **PreToolUse:Edit read-before-edit reminder hook fired four times** on `RecipesPage.tsx` and `RecipeBuilder.tsx` during Task 2 despite both files being Read in full at the start of the session. The reminder is advisory and every Edit succeeded; no action required. This is logged here only so future executors know the hook is a reminder, not a blocker.

## User Setup Required

None. The hook and UI are written against the `supabase.functions.invoke('import-recipe', { body: { input } })` contract from Plan 01; the edge function and migration 030 will be pushed by Plan 25-03. Until then, clicking Import Recipe with any input will fail at the `.invoke()` call with a runtime error shown inline in the modal — expected and documented behaviour.

## Next Phase Readiness

- **Ready for plan 25-03 (deployment):** The UI is fully wired and will start working the moment `supabase db push` completes migration 030 and `supabase functions deploy import-recipe --no-verify-jwt` (per L-025) completes. No further UI changes needed.
- **No blockers.** Pre-existing test failures are independent of this plan.

## Self-Check: PASSED

Files exist:
- FOUND: src/hooks/useImportRecipe.ts
- FOUND: src/components/recipe/ImportRecipeModal.tsx
- FOUND: src/pages/RecipesPage.tsx (modified — ImportRecipeModal imported, importModalOpen state, button + modal render verified via grep)
- FOUND: src/components/recipe/RecipeBuilder.tsx (modified — aria-live skeleton + source_url attribution block verified via grep)

Commits exist:
- FOUND: 78fa6ea (Task 1 — useImportRecipe + ImportRecipeModal)
- FOUND: 4659043 (Task 2 — RecipesPage + RecipeBuilder)

---
*Phase: 25-universal-recipe-import*
*Completed: 2026-04-19*
