# Phase 11: Nutrition & Calculation Fixes - Research

**Researched:** 2026-03-15
**Domain:** React state propagation, Supabase schema migration, micronutrient aggregation, UI display formatting
**Confidence:** HIGH

## Summary

Phase 11 fixes three distinct bugs. All three are well-understood: the code paths, data models, and fix strategies are all visible in the codebase. No external library research is needed — every fix works within the existing stack (React state, TanStack Query, Supabase, TypeScript).

**Bug 1 (CALC-01):** Calorie/macro scaling is broken in two places. In `RecipeBuilder`, `EditQuantityModal` calls `handleEditConfirm(grams)` which mutates to the DB but `foodDataMap` and `perServingNutrition` never update until the query re-fetches — because `foodDataMap` is keyed by `ingredient_id`, not by `quantity_grams`. The nutrition bar re-renders only after TanStack Query invalidates, but the `ingredients` data from `useRecipeIngredients` then has the new `quantity_grams`, so it should actually work after re-fetch. The real gap is that `FreeformLogModal` correctly computes `scaledMacro()` in the preview but then logs `servings_logged: 1` with pre-scaled per-serving macros — this is the design, not a bug. However, the `EditLogModal` in `HomePage` only updates `servings_logged` (not the per-serving macros), so changing servings on a previously-logged freeform entry does not re-scale correctly.

**Bug 2 (CALC-02):** `FoodLog.micronutrients` column already exists in `food_logs` (created in migration 009). `FreeformLogModal.handleLog` already passes `selectedFood.micronutrients ?? {}`. The gap is that (a) `LogMealModal.handleLog` always passes `micronutrients: {}`, (b) `NutrientBreakdown` already sums `log.micronutrients` but `sumNutrient` multiplies by `servings_logged` — this is correct. The missing display layer is a micronutrient summary on `HomePage` showing all 7 tracked nutrients with progress against targets (not just inside the collapsed `NutrientBreakdown`).

**Bug 3 (CALC-03):** `LogEntryItem` hardcodes "1 serving" / "N servings". The `FoodLog` interface does not have a `serving_unit` field. A `serving_unit TEXT` column must be added to `food_logs`, snapshotted at log time from the selected `PortionUnit.description`. `LogEntryItem` then reads it.

**Primary recommendation:** Fix each bug with minimal targeted changes: (1) investigate and confirm the RecipeBuilder re-render chain, then fix EditLogModal to recalculate macros on servings change; (2) add micronutrient summary row to HomePage and fix LogMealModal to pass micros; (3) add `serving_unit` migration and wire it through.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Bug exists in both recipe builder and food logging — nutrition stays the same when quantities change
- Recipe builder: EditQuantityModal grams change doesn't propagate to recalculate per-serving nutrition summary
- Food logging: PortionStepper/FreeformLogModal portion changes don't update displayed nutrition, and saved food_log values are also wrong
- Fix must provide live nutrition updates as user adjusts quantity/servings — immediate feedback, not on-confirm-only
- Internal calculation layer (calcIngredientNutrition, per-100g normalization) appears correct — the bug is likely in the UI state propagation / re-render chain
- Add `micronutrients` JSONB column to `food_logs` table — stores `{fiber: X, sodium: Y, calcium: Z, ...}` per entry, matching how `nutrition_targets` already stores micronutrient goals
- Micronutrient values snapshot at log time (same pattern as macro snapshots) — scaled by servings_logged
- Display micronutrient progress in two layers: HomePage summary (all 7 tracked micronutrients as progress indicators below macro rings) and detail view (tap to expand into full breakdown with progress bars against targets)
- Foods with no micronutrient data contribute zero to daily totals
- Show a warning indicator when some logged foods lack micronutrient data (e.g., "Some foods lack micronutrient data — totals may be incomplete")
- Fix is specifically for food log entries (LogEntryItem) — show "1.5 cups" instead of just "1.5"
- Display format: amount + unit (e.g., "1.5 cups", "200g", "2 tbsp") — concise, no gram parenthetical
- Add `serving_unit` column to `food_logs` table — snapshot the unit used at log time
- Legacy food_log entries without serving_unit fall back to displaying "serving" (e.g., "1.5 servings")
- Unit data comes from the food source (USDA/CNF portion descriptions) or custom food portions — already available via Phase 8 work

### Claude's Discretion
- Exact DB migration details for new columns (micronutrients JSONB, serving_unit text)
- How to propagate quantity changes through React state in recipe builder (the specific re-render fix)
- Micronutrient progress indicator design (mini bars, rings, or list format)
- Warning indicator placement and styling for incomplete micronutrient data
- Whether to backfill existing food_logs with micronutrient data or leave as null

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CALC-01 | Changing ingredient quantity shows proportionally different calories and macros | `calcIngredientNutrition` math is correct; bug is in UI state propagation — `EditQuantityModal` triggers DB update, TanStack Query re-fetches `ingredients`, `perServingNutrition` useMemo recomputes. For food logging, `EditLogModal` only updates `servings_logged` without recalculating macros when the food was logged as a unit-based entry. Fix requires auditing the exact re-render chain in RecipeBuilder and fixing EditLogModal's update logic. |
| CALC-02 | Logging a food updates the user's daily micronutrient goal progress | `food_logs.micronutrients` column already exists (migration 009). `FreeformLogModal` already passes food micros. Gap: `LogMealModal` passes `{}`. `NutrientBreakdown` already reads and sums `log.micronutrients`. New work: add 7-nutrient summary section to `HomePage` below macro rings, using existing `MICRONUTRIENT_DISPLAY_ORDER` constants and `ProgressRing` component. Add incomplete-data warning. |
| CALC-03 | Serving sizes display specific measurements instead of generic "1 serving" | `LogEntryItem` hardcodes "serving" text. `FoodLog` type and `food_logs` table lack `serving_unit`. Need: migration 015 to add `serving_unit TEXT` column; update `InsertFoodLogParams` and `FoodLog` type; pass `selectedUnit.description` from `FreeformLogModal`; update `LogEntryItem` to display `log.serving_unit ?? 'serving'`. |
</phase_requirements>

## Standard Stack

### Core (no changes needed)
| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| React | 19 | UI state, useMemo, re-renders | All bug fixes are state/prop wiring |
| TanStack Query | v5 | Server state, cache invalidation | Already handles re-fetch after mutations |
| Supabase JS | v2 | DB queries and mutations | Migration needed for `serving_unit` column |
| TypeScript | 5+ | Type safety | `FoodLog` and `InsertFoodLogParams` need `serving_unit` field |

### Existing Reusable Assets
| Asset | Location | Use in Phase 11 |
|-------|----------|-----------------|
| `calcIngredientNutrition` | `src/utils/nutrition.ts` | Already correct — no changes needed |
| `calcLogEntryNutrition` | `src/utils/nutrition.ts` | Already correct — scales per-serving by servings_logged |
| `MICRONUTRIENT_DISPLAY_ORDER` | `src/utils/nutrition.ts` | Drive micronutrient summary display order |
| `MICRONUTRIENT_LABELS` | `src/utils/nutrition.ts` | Display names for 7 tracked nutrients |
| `MICRONUTRIENT_UNITS` | `src/utils/nutrition.ts` | Units (g, mg, mcg) for display |
| `ProgressRing` | `src/components/plan/ProgressRing.tsx` | Reuse for micronutrient progress in HomePage |
| `MicronutrientPanel` | `src/components/plan/MicronutrientPanel.tsx` | Already displays nutrients — usable in detail view |
| `NutrientBreakdown` | `src/components/log/NutrientBreakdown.tsx` | Already sums `log.micronutrients` correctly |

**No new library installations required.**

## Architecture Patterns

### Pattern 1: Per-100g Normalization (Established)
**What:** All food macros stored per-100g; `calcIngredientNutrition(food, grams)` multiplies by `grams / 100`.
**When to use:** Any time nutrition is computed from raw ingredient data.
**Key fact:** This layer is correct and must not be changed.

### Pattern 2: Snapshot at Log Time (Established)
**What:** When logging food, capture the exact nutrition values (per-serving macros, micronutrients, serving_unit) as a snapshot. Future edits to the food source do not affect existing logs.
**When to use:** All log insert operations.
**Application:** `serving_unit` must be snapshotted the same way macros are — captured once at insert, never re-derived.

### Pattern 3: TanStack Query Cache Invalidation (Established)
**What:** Mutations call `queryClient.invalidateQueries` with the relevant key on success. The re-render happens automatically when the query re-fetches.
**Application for CALC-01 recipe builder:** `handleEditConfirm` calls `updateIngredient.mutate`. On success, `useRecipeIngredients` cache is invalidated. `ingredients` re-fetches with new `quantity_grams`. `perServingNutrition` useMemo recomputes. **This chain should already work** — the actual bug to investigate is whether the re-fetch is happening and whether `foodDataMap` stays stale.

### Pattern 4: Live Nutrition Preview (CALC-01 food logging)
**What:** `FreeformLogModal` already shows live nutrition preview via `scaledMacro()` — a pure function called inline during render. This pattern is already correct.
**The actual bug:** `EditLogModal` updates `servings_logged` only. For freeform foods logged as "1 serving with pre-scaled macros", changing servings in the edit modal multiplies the already-scaled per-serving value again. However, looking at the actual data model: `FreeformLogModal.handleLog` sets `servings_logged: 1` and `calories_per_serving: (grams/100) * food.calories` — so the "per serving" value is actually the total for the logged amount. The `EditLogModal` then lets users change `servings_logged`, multiplying the already-total value. This is the double-multiplication bug.

**Fix strategy for EditLogModal:** The EditLogModal should not allow changing servings independently for freeform-logged entries, OR the servings update must also update the per-serving macros. Given the snapshot pattern, the safest fix is to keep `servings_logged: 1` and update `calories_per_serving` (and other macros) when the user adjusts the amount. Alternatively, the fix could be in `FreeformLogModal`: log with actual `servings_logged` value and true per-serving macros (per-100g values), then `EditLogModal`'s servings change works correctly.

### Pattern 5: JSONB for Flexible Nutrition Data (Established)
**What:** `nutrition_targets.micronutrients` and `food_logs.micronutrients` are both JSONB columns storing `{key: value}` maps. Zero-value keys can be omitted.
**Application:** `serving_unit` is a simple `TEXT` column (nullable), not JSONB.

### Recommended Migration Pattern
```sql
-- Migration 015
ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS serving_unit TEXT;
-- No DEFAULT — null means legacy entry, display as "serving"
```

### Anti-Patterns to Avoid
- **Re-deriving serving_unit from item_id at display time:** Too fragile; unit data may not be available. Always use the snapshot.
- **Adding serving_unit to existing rows via backfill:** Not needed; null fallback is explicit in the decision.
- **Changing calcIngredientNutrition:** The math is correct. Only UI wiring bugs need fixing.
- **Adding a new hook for micronutrient summing:** `NutrientBreakdown` already has `sumNutrient(key)` — extract and share it or duplicate the pattern inline.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Micronutrient progress display | Custom progress bar component | `ProgressRing` already exists and accepts `value`/`target`/`color` |
| Nutrient label/unit lookup | String-based switch | `MICRONUTRIENT_LABELS[key]` and `MICRONUTRIENT_UNITS[key]` already defined |
| Display order for nutrients | Hardcoded array | `MICRONUTRIENT_DISPLAY_ORDER` already defined |
| Nutrition scaling math | Custom scaling function | `calcIngredientNutrition` already correct |

## Common Pitfalls

### Pitfall 1: Misdiagnosing the Recipe Builder Bug
**What goes wrong:** Assuming `perServingNutrition` useMemo doesn't update because the math is wrong. In fact, the useMemo depends on `[ingredients, recipe, foodDataMap]` — when `ingredients` re-fetches with new `quantity_grams`, the memo does recompute.
**Why it happens:** The bug may be that `foodDataMap` is populated lazily (only when foods are searched and selected). If a food was added before the current session, its entry won't be in `foodDataMap`, so nutrition shows as 0 regardless of quantity. This is a session-persistence issue, not a quantity-scaling issue.
**How to avoid:** Read `RecipeBuilder` carefully to confirm whether `foodDataMap` persists across sessions or only lives in component state. If `foodDataMap` is in-memory only, nutrition in the recipe builder only works for foods added during the current session. The fix would be to populate `foodDataMap` from persisted data (e.g., storing macros in `recipe_ingredients` or fetching them on load).
**Warning signs:** Nutrition bar shows 0 on page refresh even when ingredients exist.

### Pitfall 2: Double-Multiplication in EditLogModal
**What goes wrong:** `FreeformLogModal` logs `servings_logged: 1` with total macros as "per serving". `EditLogModal.handleSave` updates only `servings_logged`. If user changes from 1 to 2 servings, displayed calories double (showing 2x the already-total value). Database stores `servings_logged: 2` with `calories_per_serving = totalGrams_macros` — so `calcLogEntryNutrition` gives 2x the intended amount.
**How to avoid:** The fix must either (a) change FreeformLogModal to log with true per-serving values and actual servings count, or (b) make EditLogModal update per-serving macros proportionally when servings change. Option (a) is cleaner and aligns with the `LogMealModal` pattern which correctly uses real servings.

### Pitfall 3: micronutrients Column Already Exists
**What goes wrong:** Writing a migration that tries to add the `micronutrients` column to `food_logs`, but it already exists (added in migration 009).
**How to avoid:** `food_logs.micronutrients JSONB NOT NULL DEFAULT '{}'` is already in migration 009. The `FoodLog` TypeScript type already has `micronutrients: Record<string, number>`. No migration or type change needed for this column. Only `serving_unit` needs a new migration.

### Pitfall 4: NutrientBreakdown Already Shows Micronutrients (But Gated)
**What goes wrong:** Building a new micronutrient display component from scratch when `NutrientBreakdown` already sums and shows them — but only when `target.micronutrients` has keys. Users without targets set see nothing.
**How to avoid:** For the HomePage summary layer, show all 7 nutrients unconditionally (using `MICRONUTRIENT_DISPLAY_ORDER`), summing from logs even if no target is set (target defaults to 0 = no ring). This is distinct from the existing `NutrientBreakdown` behavior.

### Pitfall 5: serving_unit Nullable vs Default
**What goes wrong:** Adding `serving_unit TEXT NOT NULL DEFAULT 'serving'` — this backfills all existing logs with "serving" which is technically correct but misleads (existing logs used "serving" implicitly). The CONTEXT.md decision is: null = legacy = display "serving". Use nullable, no default.
**How to avoid:** `ADD COLUMN IF NOT EXISTS serving_unit TEXT` (no NOT NULL, no DEFAULT). In display code: `log.serving_unit ?? 'serving'`.

## Code Examples

### CALC-01: FreeformLogModal correct logging pattern
The existing code already computes scaled macros correctly in the preview. The insert should use real per-serving values with actual servings count:
```typescript
// Current (in FreeformLogModal.handleLog) — logs total as "1 serving"
servings_logged: 1,
calories_per_serving: (grams / 100) * selectedFood.calories,

// Better — logs true per-serving values with actual servings
// (only viable if selectedUnit.grams is a real serving size)
// For freeform grams-based logging, the current pattern is actually fine
// because there's no natural "serving" to normalize against.
// The EditLogModal bug is the real fix target.
```

### CALC-01: RecipeBuilder — foodDataMap population gap
```typescript
// Current: foodDataMap only populated when food is selected in current session
// On page reload, ingredients exist in DB but foodDataMap is empty {}
// Fix: populate foodDataMap from persisted data on recipe load
// Option: store macros directly in recipe_ingredients table
// OR: fetch food macros from custom_foods / external APIs on RecipeBuilder mount
```

### CALC-02: Micronutrient summary in HomePage
```typescript
// Pattern: sum micronutrients from logs (existing NutrientBreakdown pattern)
const microTotals = MICRONUTRIENT_DISPLAY_ORDER.reduce((acc, key) => {
  acc[key] = logs.reduce((sum, log) =>
    sum + ((log.micronutrients?.[key] ?? 0) * log.servings_logged), 0)
  return acc
}, {} as Record<string, number>)

// Incomplete data warning
const hasIncompleteMicroData = logs.some(log =>
  Object.keys(log.micronutrients ?? {}).length === 0
)
```

### CALC-03: Migration 015
```sql
ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS serving_unit TEXT;
```

### CALC-03: LogEntryItem display fix
```typescript
// Current (LogEntryItem.tsx line 47-49):
{log.servings_logged === 1 ? '1 serving' : `${log.servings_logged} servings`}

// Fixed:
const unit = log.serving_unit ?? 'serving'
`${log.servings_logged} ${unit}`
// Handles: "1.5 cups", "200 g", "2 tbsp", "1 serving" (legacy)
```

### CALC-03: FreeformLogModal — pass serving_unit on insert
```typescript
// In handleLog():
await insertLog.mutateAsync({
  // ... existing fields ...
  serving_unit: selectedUnit.description,  // "cups", "g", "1 medium", etc.
})
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| micronutrients not tracked in food_logs | Already added in migration 009 (JSONB column) | Column exists; only display layer missing |
| "N servings" hardcoded in LogEntryItem | Will show "N cups" / "N g" after fix | User sees meaningful unit context |
| foodDataMap keyed by ingredient_id only | May need hydration from DB on mount | Recipe nutrition shows correctly on reload |

## Detailed Bug Analysis

### CALC-01 Recipe Builder: foodDataMap Hydration
After reading `RecipeBuilder.tsx` in full, the key finding is:

- `foodDataMap` is `useState<Record<string, FoodDataEntry>>({})` — pure in-memory, initialized empty on mount
- It is only populated when `handleQuantityConfirm` or `handleRecipeQuantityConfirm` runs — i.e., when the user adds an ingredient during the current session
- `perServingNutrition` useMemo filters with `if (!entry) return null` — so existing ingredients (loaded from DB) show 0 nutrition if the food wasn't added in this session
- `EditQuantityModal.handleEditConfirm` → `updateIngredient.mutate` → DB update → cache invalidation → `ingredients` re-fetches with new `quantity_grams`. If `foodDataMap[ing.ingredient_id]` exists (food was added this session), the nutrition recalculates correctly. If not (page reload, existing recipe), it shows 0.

**Root cause confirmed:** The bug is foodDataMap not being hydrated from persisted data on component mount.

**Fix strategy:** On `RecipeBuilder` mount, for each ingredient from `useRecipeIngredients`, fetch the food's macros. For `ingredient_type === 'food'`, query `custom_foods` for custom foods. For USDA/CNF foods (`ingredient_type === 'food'` with non-UUID IDs), macros are not stored in DB — they're only available when the user searches. The pragmatic fix for v1 is to store macros in `recipe_ingredients` at add-time (like `meal_items` does), or fetch custom food macros on mount. Since changing `recipe_ingredients` schema is a larger migration, a simpler fix: on mount, batch-fetch all `custom_food` macros for ingredient_ids in the recipe and populate `foodDataMap`.

### CALC-01 Food Logging: EditLogModal
- `EditLogModal` only sends `{ servings_logged }` to `useUpdateFoodLog`
- `useUpdateFoodLog.mutationFn` only updates `servings_logged` (and optionally `is_private`)
- `FreeformLogModal` logs `servings_logged: 1` with pre-scaled macros (total grams worth of nutrition)
- When user edits to "2 servings", `calcLogEntryNutrition` returns `calories_per_serving * 2` = 2x total

**Fix:** `FreeformLogModal.handleLog` should log with actual servings count derived from the quantity/unit, and per-serving macros should be the true per-unit values. For a grams-based freeform log (unit = grams, grams=1), the "serving" is 1g which doesn't make sense. The cleanest fix: keep `servings_logged: 1` but make EditLogModal re-derive macros from the original per-100g values when updating servings. This requires storing the original per-100g values, which the current schema doesn't have.

Alternative clean fix: Change FreeformLogModal to log `servings_logged = quantity` (the raw number) and `calories_per_serving = (selectedUnit.grams / 100) * food.calories` (per-unit calories). Then `calcLogEntryNutrition(log)` = `calories_per_serving * servings_logged` = per-unit * quantity = correct. `EditLogModal` changing servings then correctly scales.

This is the correct fix and aligns with how `LogMealModal` works (servings × per-serving macros).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (inferred from Vite project; no explicit config found) |
| Config file | Check `package.json` scripts for "test" key |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CALC-01 | `calcIngredientNutrition` scales correctly | unit | `npm test -- --run src/utils/nutrition` | Check in Wave 0 |
| CALC-01 | `calcLogEntryNutrition` multiplies correctly | unit | `npm test -- --run src/utils/nutrition` | Check in Wave 0 |
| CALC-02 | Micronutrient sum across logs | unit | `npm test -- --run` | ❌ Wave 0 |
| CALC-03 | `serving_unit` displayed in LogEntryItem | visual/manual | Manual verification via Playwright | N/A |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Confirm test framework (check `package.json` for vitest/jest setup)
- [ ] If no test file for `nutrition.ts`: create `src/utils/nutrition.test.ts` covering `calcIngredientNutrition`, `calcLogEntryNutrition`, and micronutrient aggregation

## Open Questions

1. **foodDataMap hydration for external (USDA/CNF) foods in recipe builder**
   - What we know: Custom food macros can be fetched from `custom_foods` table. USDA/CNF food macros are not stored per-row in DB.
   - What's unclear: If a recipe has USDA ingredients, they won't hydrate on mount without storing their macros.
   - Recommendation: For Phase 11, fix hydration for custom foods only (batch-fetch from `custom_foods`). For USDA/CNF ingredients, show a "Nutrition will appear after re-adding" message, or store macros in `recipe_ingredients` (schema change). The CONTEXT.md says the calculation layer is correct — so the planner should decide scope.

2. **Warning indicator for incomplete micronutrient data placement**
   - What we know: User decision says show a warning when some logged foods lack micronutrient data.
   - What's unclear: Exact placement — inline with the micronutrient summary, or as a banner?
   - Recommendation: Small inline note below the micronutrient summary list, e.g. "* Some foods have no micronutrient data".

## Sources

### Primary (HIGH confidence)
- `src/utils/nutrition.ts` — Full read; `calcIngredientNutrition`, `calcLogEntryNutrition`, all MICRONUTRIENT_* constants confirmed
- `src/types/database.ts` — Full read; `FoodLog`, `NutritionTarget`, `MacroSummary` types confirmed
- `src/components/recipe/RecipeBuilder.tsx` — Full read; `foodDataMap` state pattern confirmed, `EditQuantityModal` flow traced
- `src/components/log/FreeformLogModal.tsx` — Full read; logging pattern with `servings_logged: 1` confirmed
- `src/components/log/LogEntryItem.tsx` — Full read; hardcoded "serving" text confirmed at line 47-49
- `src/components/log/LogMealModal.tsx` — Full read; `micronutrients: {}` hardcoded confirmed at line 85
- `src/hooks/useFoodLogs.ts` — Full read; `useUpdateFoodLog` only updates `servings_logged` confirmed
- `src/hooks/useNutritionTargets.ts` — Full read; `micronutrients` field in target confirmed
- `src/pages/HomePage.tsx` — Full read; no micronutrient summary section, only macro rings confirmed
- `src/components/log/NutrientBreakdown.tsx` — Full read; already sums `log.micronutrients` correctly
- `src/components/plan/MicronutrientPanel.tsx` — Full read; display constants already imported
- `supabase/migrations/009_food_logs.sql` — Confirmed `micronutrients JSONB NOT NULL DEFAULT '{}'` already exists
- `supabase/migrations/014_v1_1_polish.sql` — Confirmed no `serving_unit` column exists yet

### Secondary (MEDIUM confidence)
- N/A — all findings are from direct code inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing code read directly
- Architecture: HIGH — bug root causes confirmed by tracing actual code paths
- Pitfalls: HIGH — identified by reading the exact lines where bugs occur
- Migration: HIGH — existing migration 009 confirmed `micronutrients` exists; `serving_unit` is new

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable codebase, no external dependencies to track)
