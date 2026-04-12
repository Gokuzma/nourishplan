---
phase: 23
plan: "04"
subsystem: recipe-editor-ui
tags: [ui, recipe-editor, steps, freezer-toggle, drag-drop, badge]
dependency_graph:
  requires: [23-01, 23-02, 23-03, 23-03b]
  provides: [FreezerBadge, RecipeStepRow, RecipeStepsSection, RecipeFreezerToggle, RecipeBuilder-steps-wire, RecipesPage-freezer-badge]
  affects: [src/components/recipe/RecipeBuilder.tsx, src/pages/RecipesPage.tsx]
tech_stack:
  added: []
  patterns: [dnd-kit/sortable vertical list, segmented radiogroup control, inline SVG badge]
key_files:
  created:
    - src/components/plan/FreezerBadge.tsx
    - src/components/recipe/RecipeStepRow.tsx
    - src/components/recipe/RecipeStepsSection.tsx
    - src/components/recipe/RecipeFreezerToggle.tsx
  modified:
    - src/components/recipe/RecipeBuilder.tsx
    - src/pages/RecipesPage.tsx
decisions:
  - "Eager step regeneration placed in onSuccess callbacks of addIngredient.mutate and updateIngredient.mutate — fires only after ingredient persistence (V-07 compliant)"
  - "ingredientsSnapshot for new-ingredient trigger merges existing ingredients + newly added item before DB confirmation to avoid stale snapshot"
  - "RecipesPage name row wrapped in flex div to inline FreezerBadge next to recipe name (single line removal, no functional change)"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-12"
  tasks: 5
  files: 6
---

# Phase 23 Plan 04: Recipe Editor UI — Steps, Freezer Toggle, FreezerBadge Summary

Built the recipe-editor surfaces for Phase 23 prep optimisation: draggable step list with AI regeneration, three-state freezer segmented control, shared FreezerBadge component, wired into RecipeBuilder and RecipesPage.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create shared FreezerBadge component | 9ca3135 | src/components/plan/FreezerBadge.tsx |
| 2 | Create RecipeStepRow + RecipeStepsSection | 0711f20 | src/components/recipe/RecipeStepRow.tsx, RecipeStepsSection.tsx |
| 3 | Create RecipeFreezerToggle | 59a48ea | src/components/recipe/RecipeFreezerToggle.tsx |
| 4 | Wire into RecipeBuilder.tsx | f8c9866 | src/components/recipe/RecipeBuilder.tsx |
| 5 | Render FreezerBadge on recipe list cards | 6548110 | src/pages/RecipesPage.tsx |

## New Component Public Props

### FreezerBadge (`src/components/plan/FreezerBadge.tsx`)
```typescript
interface FreezerBadgeProps {
  variant: 'full' | 'compact' | 'icon-only' | 'storage-freezer' | 'storage-fridge'
  shelfLifeWeeks?: number | null
  shelfLifeDays?: number | null
  className?: string
}
```
Renders nothing for invalid variants; caller decides when to render based on `freezer_friendly === true`.

### RecipeStepRow (`src/components/recipe/RecipeStepRow.tsx`)
```typescript
interface RecipeStepRowProps {
  step: RecipeStep
  index: number
  onChange: (patch: Partial<RecipeStep>) => void
  onDelete: () => void
}
```
Uses `useSortable` from @dnd-kit/sortable. Exposes drag handle, text input, duration input, active/passive toggle, delete button.

### RecipeStepsSection (`src/components/recipe/RecipeStepsSection.tsx`)
```typescript
interface RecipeStepsSectionProps {
  recipeId: string
  recipeName: string
  servings: number
  ingredientsSnapshot: { name: string; quantity_grams: number }[]
  notes?: string | null
}
```
Self-contained: fetches from `useRecipeSteps`, persists via `useUpdateRecipeSteps`, regenerates via `useRegenerateRecipeSteps`.

### RecipeFreezerToggle (`src/components/recipe/RecipeFreezerToggle.tsx`)
```typescript
interface RecipeFreezerToggleProps {
  recipeId: string
  value: boolean | null
  shelfLifeWeeks: number | null
}
```
Three-state segmented control (Auto=null, Yes=true, No=false). Shelf life input shown only when `value === true`.

## RecipeBuilder.tsx Diff Summary (additions only)

Added 86 lines, zero removals of prior lines:
1. 3 new imports (RecipeStepsSection, RecipeFreezerToggle, useRecipeSteps, useRegenerateRecipeSteps)
2. 2 new hook calls (stepsData, regenerateSteps)
3. onSuccess callbacks on addIngredient.mutate (food path) — fires regenerateSteps
4. onSuccess callbacks on addIngredient.mutate (recipe-as-ingredient path) — fires regenerateSteps
5. onSuccess callbacks on updateIngredient.mutate (edit confirm path) — fires regenerateSteps
6. RecipeFreezerToggle JSX block (after cost-per-serving badge, before Mark as Cooked)
7. RecipeStepsSection JSX block (after ingredient list, before search trigger button)

## V-07 Compliance (regeneration only from ingredient mutations)

- `handleNameBlur` → calls `updateRecipe.mutate({ name })` — no regenerateSteps call
- `handleServingsBlur` → calls `updateRecipe.mutate({ servings })` — no regenerateSteps call
- `handleMarkAsCooked` — no regenerateSteps call
- Only `handleQuantityConfirm` (food add), `handleRecipeQuantityConfirm` (recipe add), and `handleEditConfirm` (quantity edit) fire regeneration, via onSuccess callbacks

## D-04 Merge-Intent Callout

RecipeStepsSection renders amber callout rows for each item in `uncertain_user_additions` returned by `useRegenerateRecipeSteps`. User can dismiss each individually with "Keep my note" or "Remove".

## Known Stubs

None — all wiring is functional. FreezerBadge reads from `stepsData.freezer_friendly` which is populated by `useRecipeSteps` from the `recipes` table (Phase 23-01 schema).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ingredientsSnapshot for eager regeneration builds from current + new ingredient**
- **Found during:** Task 4
- **Issue:** The plan's code snippet showed fetching from `recipe` and `ingredients` state — but at the point addIngredient.mutate fires, the new ingredient is not yet in the `ingredients` array (it's async). The snapshot would miss the newly added item.
- **Fix:** In `onSuccess` callbacks for add-ingredient paths, manually appended the new ingredient to the existing `ingredients` array before building the snapshot, so the AI sees the complete ingredient list.
- **Files modified:** src/components/recipe/RecipeBuilder.tsx

### Out-of-scope pre-existing TS errors

RecipeBuilder.tsx and other files had pre-existing TypeScript errors (`Property 'id' does not exist on type 'never'` in `resolveRecipeNutrition`, `useAddManualGroceryItem`) that were present before this plan. These are from Supabase DB type inference issues in the worktree and are not introduced by Plan 04.

## Self-Check

### Created files exist
- src/components/plan/FreezerBadge.tsx: FOUND
- src/components/recipe/RecipeStepRow.tsx: FOUND
- src/components/recipe/RecipeStepsSection.tsx: FOUND
- src/components/recipe/RecipeFreezerToggle.tsx: FOUND

### Commits exist
- 9ca3135: feat(23-04): add FreezerBadge
- 0711f20: feat(23-04): add RecipeStepRow and RecipeStepsSection
- 59a48ea: feat(23-04): add RecipeFreezerToggle
- f8c9866: feat(23-04): wire RecipeBuilder
- 6548110: feat(23-04): render FreezerBadge on RecipesPage

### Tests pass
- tests/AppShell.test.tsx: PASSED (5/5)
- tests/recipe-builder.test.tsx: PASSED (3/3 + 8 todo)
- tests/recipes.test.ts: PASSED (8/8 + 7 todo)

## Self-Check: PASSED
