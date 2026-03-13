# Phase 3: Meal Planning & Targets - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Households can build and share a weekly meal plan, compose meals from recipes and individual foods, swap meals on specific days, save/load meal plan templates, and set personal nutrition targets per household member. No daily logging, portion suggestions, or offline support — those are later phases.

</domain>

<decisions>
## Implementation Decisions

### Meal plan grid layout
- Day cards stack layout — vertical stack of day cards, each showing all meal slots
- Mobile: swipe between days (one day card fills screen, swipe left/right, day indicator dots at top)
- Desktop: scrollable stack of all 7 day cards
- Each day card shows: per-meal calories inline + day total bar at bottom (cal/P/C/F)
- Progress rings on each day card showing how close the day's meals get to the selected member's targets
- Member selector at top of plan page to switch whose targets are displayed

### Meal slots
- Fixed 4 default slots: Breakfast, Lunch, Dinner, Snacks
- Users can add custom slots (e.g., "Pre-workout", "Late snack")
- Empty slots show a '+' add button

### Meal composition
- Meals are standalone, reusable entities — not just slot references
- A meal is composed of recipes and/or individual foods with quantities
- Adding food to a meal reuses the FoodSearch overlay from Phase 2 (USDA/OFF/My Foods tabs + Recipes tab)
- Meals have their own tab in main nav (alongside Home, Foods, Recipes)
- Meal nutrition displayed with same sticky NutritionBar pattern as RecipeBuilder

### Template & swap behavior
- User builds a live plan for the week, can "Save as template" to snapshot it
- Loading a template populates the current week's plan
- Templates are read-only copies until loaded
- Swapping a meal on a specific day overrides that slot only — template is unchanged, other days keep original
- Configurable week start day (household setting, not per-person) — e.g., Thursday for users who plan/shop on Thursdays
- On week start day, prompt appears: "Start fresh, repeat last week, or load a template?"

### Nutrition targets
- Each member has a profile page showing their targets (accessible from household member list)
- Admins can edit any member's targets (parent sets child's); members edit their own
- Default view: calories + macros (protein, carbs, fat)
- Expandable sections for micronutrient targets and custom goals (like water intake, sugar limit)
- Preset templates available: "Adult maintenance (2000 cal)", "Weight loss", "Child 5-12", "Teen" — user picks preset then customizes

### Claude's Discretion
- Exact meal data model schema (tables, columns, relationships)
- How custom meal slots are stored and ordered
- Swipe gesture library or implementation for mobile day navigation
- Template storage format and versioning
- Preset target values for each template category
- Week boundary calculation logic
- How the "new week" prompt is triggered and displayed

</decisions>

<specifics>
## Specific Ideas

- Day cards should feel like flipping through a planner — swipe on mobile, scroll on desktop
- The "new week" prompt is important because the user does meal planning on a specific day (Thursday in their case), not necessarily Sunday
- Meals as standalone entities means users can build a "go-to breakfast" once and reuse it across weeks
- Progress rings should make it immediately obvious if a day's plan is under/over someone's targets

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/food/FoodSearch.tsx`: Tabbed search with select mode — reuse for meal composition
- `src/components/recipe/NutritionBar.tsx`: Sticky bottom bar for cal/P/C/F — reuse for meal detail view
- `src/components/recipe/RecipeBuilder.tsx`: Pattern for ingredient list + quantity management — adapt for meal builder
- `src/utils/nutrition.ts`: `calcIngredientNutrition`, `calcRecipePerServing` — extend for meal-level calculations
- `src/hooks/useRecipes.ts`: TanStack Query CRUD pattern — replicate for meals and meal plans
- `src/hooks/useHousehold.ts`: Household membership data — use for member selector and target management

### Established Patterns
- TanStack Query useQuery/useMutation wrapping Supabase client calls
- Tailwind CSS 4 with @theme tokens (sage/cream/peach palette)
- Mobile-first responsive (hidden md:flex pattern)
- RLS with security-definer helpers (`get_user_household_id()`, `get_user_household_role()`)
- Soft delete via `deleted_at` column
- Per-100g normalization for all nutrition data

### Integration Points
- `src/App.tsx`: Add routes for /meals, /meals/:id, /plan, /plan/:weekId, /members/:id
- `src/components/layout/TabBar.tsx` and `Sidebar.tsx`: Add Meals and Plan nav entries
- `supabase/migrations/`: New migration for meals, meal_plans, meal_plan_slots, nutrition_targets tables
- Household settings table or column for week_start_day preference

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-meal-planning-targets*
*Context gathered: 2026-03-13*
