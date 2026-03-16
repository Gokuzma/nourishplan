# Phase 13: Recipe, Meal Plan & Account Management - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix recipe builder navigation (ingredient drill-down return), add recipe notes and date created, enable meal plan start date selection, add print meal plan, enable deletion of meals/recipes/foods, and add account deletion with household admin transfer. Six distinct improvements spanning recipe UX, meal planning, deletion management, and account management.

</domain>

<decisions>
## Implementation Decisions

### Deletion flows
- All deletions (meals, recipes, foods) require inline confirmation — "Delete [name]? Yes / Cancel" appearing where the item is, no modal overlay
- Deleting a recipe used in meal plans: soft-remove from plans — mark recipe as deleted but keep it visible in meal plans as "(Deleted recipe)". Plans stay intact
- Permissions: only the item creator or household admin can delete. Others see no delete button
- Use existing `deleted_at` soft-delete column pattern from Phase 2

### Account deletion & admin transfer
- "Danger Zone" section at the bottom of the existing Settings page
- Immediate deletion with final confirmation — user types "DELETE" to confirm, no grace period
- Admin transfer: show list of household members, admin picks who gets admin rights before confirming deletion
- Last member in household: delete the household entirely with clear warning — "This will delete the entire household and all its data"
- Non-admin members can delete their own account without transfer flow

### Meal plan print
- Print content: meal grid (days × meals) + daily nutrition totals (calories, protein, carbs, fat per day)
- No shopping list, no expanded recipe details
- Use browser print dialog (window.print()) with print-optimized CSS — no PDF library needed
- Print button in overflow/⋮ menu on the plan page
- B&W with borders — clean black text on white, table borders for structure. No color accents

### Recipe metadata & notes
- Notes field: auto-expanding textarea — starts as single line, grows as user types. Appears as subtitle directly under the recipe name in the builder
- Date created: relative + absolute format — "Created 3 days ago" with full date on hover/tap
- Date shown on recipe list cards (RecipesPage), alongside existing servings info
- Notes field is optional — empty by default, placeholder like "Add notes or variations..."

### Recipe builder navigation fix
- Clicking away from an ingredient detail view returns to the search view within the overlay, not back to the recipe page
- This is a navigation stack fix within FoodSearchOverlay's select mode

### Meal plan start date
- User can choose the start date when creating or editing a meal plan
- Date picker UI follows existing date input pattern (like the nutrition targets date picker)

### Claude's Discretion
- Exact print CSS styling and layout grid
- Migration details for `notes` column on recipes table
- Recipe builder navigation stack implementation approach
- Date picker component choice for meal plan start date
- Supabase RPC/function approach for account deletion cascade

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and ROADMAP.md success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FoodSearchOverlay.tsx`: Unified search overlay with log/select modes — navigation fix applies here
- `QuantityModal` in `RecipeBuilder.tsx`: Existing modal pattern (though deletion uses inline confirmation instead)
- `MealCard.tsx`: Has existing delete button with `onDelete` callback and `e.stopPropagation()` pattern
- `LogEntryItem.tsx`: Delete button with `hover:text-red-400` styling
- `FoodSearchOverlay.tsx`: Custom food deletion confirmation pattern with `deleteConfirm` state
- `SettingsPage.tsx`: Existing settings page — account deletion section goes at bottom
- `PlanGrid.tsx` / `DayCard.tsx` / `SlotCard.tsx`: Meal plan display components for print layout

### Established Patterns
- TanStack Query `useMutation` for all CRUD operations (useRecipes, useMeals, useMealPlan hooks)
- Soft delete via `deleted_at` column with RLS policies using `get_user_household_id()`
- Tailwind CSS 4 with `@theme` tokens for consistent styling
- `useHousehold()` hook for household membership and admin detection

### Integration Points
- `src/hooks/useRecipes.ts` — add `useDeleteRecipe` mutation
- `src/hooks/useMeals.ts` — add `useDeleteMeal` mutation
- `src/hooks/useCustomFoods.ts` — add/update `useDeleteCustomFood` mutation
- `src/pages/SettingsPage.tsx` — add danger zone section
- `src/pages/PlanPage.tsx` — add print button to overflow menu and print-optimized CSS
- `supabase/migrations/` — add `notes` column to recipes table, account deletion RPC

</code_context>

<specifics>
## Specific Ideas

- Inline delete confirmation (not modal) — "Delete [name]? Yes / Cancel" appearing in-place
- Recipe notes as auto-expanding subtitle under recipe name, not a separate section
- Print output should be printer-friendly — B&W, borders, no app chrome
- Account deletion requires typing "DELETE" for final confirmation
- Deleted recipes remain visible in meal plans as "(Deleted recipe)" rather than breaking the plan

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-recipe-meal-plan-account-management*
*Context gathered: 2026-03-16*
