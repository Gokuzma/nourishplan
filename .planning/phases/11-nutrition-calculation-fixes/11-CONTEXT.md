# Phase 11: Nutrition & Calculation Fixes - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix three specific bugs/gaps: (1) calorie/macro nutrition doesn't scale when ingredient quantities or log portions change, (2) logged foods don't update micronutrient goal progress, and (3) food log entries show generic "1 serving" instead of specific measurement units. No new food sources, no new pages, no new food hierarchy features.

</domain>

<decisions>
## Implementation Decisions

### Calorie/macro scaling
- Bug exists in both recipe builder and food logging — nutrition stays the same when quantities change
- Recipe builder: EditQuantityModal grams change doesn't propagate to recalculate per-serving nutrition summary
- Food logging: PortionStepper/FreeformLogModal portion changes don't update displayed nutrition, and saved food_log values are also wrong
- Fix must provide live nutrition updates as user adjusts quantity/servings — immediate feedback, not on-confirm-only
- Internal calculation layer (`calcIngredientNutrition`, per-100g normalization) appears correct — the bug is likely in the UI state propagation / re-render chain

### Micronutrient goal tracking
- Add `micronutrients` JSONB column to `food_logs` table — stores `{fiber: X, sodium: Y, calcium: Z, ...}` per entry, matching how `nutrition_targets` already stores micronutrient goals
- Micronutrient values snapshot at log time (same pattern as macro snapshots) — scaled by servings_logged
- Display micronutrient progress in two layers:
  - **HomePage summary:** Show all 7 tracked micronutrients (fiber, sodium, calcium, iron, potassium, vitamin C, vitamin A) as progress indicators below macro rings
  - **Detail view:** Tap to expand into full micronutrient breakdown with progress bars against targets
- Foods with no micronutrient data contribute zero to daily totals
- Show a warning indicator when some logged foods lack micronutrient data (e.g., "Some foods lack micronutrient data — totals may be incomplete")

### Serving size display
- Fix is specifically for food log entries (LogEntryItem) — show "1.5 cups" instead of just "1.5"
- Display format: amount + unit (e.g., "1.5 cups", "200g", "2 tbsp") — concise, no gram parenthetical
- Add `serving_unit` column to `food_logs` table — snapshot the unit used at log time (e.g., "cups", "g", "tbsp")
- Legacy food_log entries without serving_unit fall back to displaying "serving" (e.g., "1.5 servings")
- Unit data comes from the food source (USDA/CNF portion descriptions) or custom food portions — already available via Phase 8 work

### Claude's Discretion
- Exact DB migration details for new columns (micronutrients JSONB, serving_unit text)
- How to propagate quantity changes through React state in recipe builder (the specific re-render fix)
- Micronutrient progress indicator design (mini bars, rings, or list format)
- Warning indicator placement and styling for incomplete micronutrient data
- Whether to backfill existing food_logs with micronutrient data or leave as null

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Nutrition calculation
- `.planning/ROADMAP.md` §Phase 11 — Success criteria (CALC-01, CALC-02, CALC-03)
- `src/utils/nutrition.ts` — All nutrition calculation functions (calcIngredientNutrition, calcRecipePerServing, calcLogEntryNutrition)
- `src/types/database.ts` — MacroSummary type, RecipeIngredient type, food_logs schema

### Recipe builder (scaling bug)
- `src/components/recipe/RecipeBuilder.tsx` — EditQuantityModal and ingredient state management
- `src/components/recipe/IngredientRow.tsx` — Ingredient display with quantity_grams

### Food logging (scaling + serving unit bugs)
- `src/components/log/FreeformLogModal.tsx` — Freeform food logging with portion input
- `src/components/log/LogMealModal.tsx` — Meal logging modal
- `src/components/log/PortionStepper.tsx` — Portion amount input component
- `src/components/log/LogEntryItem.tsx` — Log entry display (where serving unit should show)
- `src/hooks/useFoodLogs.ts` — Food log CRUD hooks

### Micronutrient tracking
- `src/hooks/useNutritionTargets.ts` — Nutrition target queries (includes micronutrient targets)
- `src/components/targets/NutritionTargetsForm.tsx` — Target setting form
- `src/components/plan/MicronutrientPanel.tsx` — Existing micronutrient display component
- `src/components/log/NutrientBreakdown.tsx` — Nutrient breakdown display
- `src/pages/HomePage.tsx` — Daily dashboard with macro progress rings

### Prior context
- `.planning/phases/08-v1-1-ui-polish-and-usability-improvements/08-CONTEXT.md` — Phase 8 measurement unit decisions (CNF serving sizes, custom food portions, PortionStepper)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `calcIngredientNutrition(food, quantityGrams)` in `nutrition.ts` — correctly scales per-100g to actual grams; the calculation itself is sound
- `calcLogEntryNutrition(log)` in `nutrition.ts` — scales per-serving macros by servings_logged
- `MICRONUTRIENT_LABELS`, `MICRONUTRIENT_UNITS`, `MICRONUTRIENT_DISPLAY_ORDER` in `nutrition.ts` — ready for display use
- `MicronutrientPanel.tsx` — existing panel for showing micronutrient data on foods/recipes
- `NutrientBreakdown.tsx` — existing component for nutrient detail display
- `ProgressRing.tsx` — reusable for micronutrient progress indicators

### Established Patterns
- Per-100g normalization for all nutrition data — calculations scale by `quantityGrams / 100`
- `food_logs` stores per-serving macro snapshots at log time — new micronutrients JSONB follows same snapshot pattern
- `nutrition_targets` stores micronutrient goals as JSONB `{fiber: X, sodium: Y}` — matching format for food_logs micros
- TanStack Query for data fetching with household-scoped cache keys
- Supabase RLS with `get_user_household_id()` security-definer helper

### Integration Points
- `HomePage.tsx` daily dashboard — add micronutrient summary section below existing macro rings
- `useFoodLogs.ts` — needs to read/write micronutrients and serving_unit columns
- `FreeformLogModal.tsx` / `LogMealModal.tsx` — need to capture micronutrient data and serving_unit at log time
- `LogEntryItem.tsx` — needs to display serving_unit from food_log entry
- `RecipeBuilder.tsx` — EditQuantityModal onConfirm needs to trigger nutrition recalculation in parent state
- New DB migration for `food_logs` table: add `micronutrients JSONB DEFAULT '{}'`, `serving_unit TEXT`

</code_context>

<specifics>
## Specific Ideas

- The scaling bug is a UI state propagation issue, not a calculation logic bug — `calcIngredientNutrition` math is correct
- Micronutrient summary should show all 7 tracked nutrients, not just ones with targets — gives users visibility even before setting goals
- Warning about incomplete micronutrient data prevents users from trusting artificially low totals

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-nutrition-calculation-fixes*
*Context gathered: 2026-03-15*
