# Phase 25: Universal Recipe Import - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can paste a URL (blog, YouTube) or raw recipe text into a modal, and the AI extracts a complete recipe with ingredients, macros, cooking steps, and instructions — auto-saved to the recipe library via RecipeBuilder. Instagram support is deferred. No new database tables or migrations required (success criterion 5).

</domain>

<decisions>
## Implementation Decisions

### Entry Point & Flow
- **D-01:** Primary "Import Recipe" button on RecipesPage, visible alongside existing "Create Recipe" button
- **D-02:** Button opens a modal with a single text input field (accepts URLs or raw text)
- **D-03:** After submission, navigate to RecipeBuilder with a loading skeleton — fields populate as the AI responds
- **D-04:** Auto-detect input type (blog URL, YouTube URL, raw text) — no user selection needed

### Source Handling
- **D-05:** Server-side fetch in a new Supabase edge function (follows `create-recipe-from-suggestion` pattern)
- **D-06:** For YouTube URLs, extract video transcript/captions and have AI parse recipe from transcript text
- **D-07:** Instagram support deferred — too fragile (auth/API requirements, scraping blocks)
- **D-08:** Single unified AI prompt handles all source types (blog HTML, YouTube transcripts, raw text)
- **D-09:** Always use AI for extraction — skip JSON-LD/Schema.org structured data parsing
- **D-10:** On fetch failure: clear error message suggesting user copy-paste recipe text as raw text fallback
- **D-11:** Store source URL on the recipe record for attribution

### Review & Save
- **D-12:** Auto-save as draft — recipe is created in DB immediately, user lands in RecipeBuilder with all fields populated for editing
- **D-13:** Source link displayed on recipe detail page only (no badge on recipe cards)
- **D-14:** Extract both ingredients AND cooking steps from the source
- **D-15:** Set servings to household member count (per-person calorie adjustment handled by Phase 24's dynamic portioning)

### Nutrition Accuracy
- **D-16:** AI estimates macros (calories/protein/fat/carbs per 100g) for each ingredient — same pattern as `create-recipe-from-suggestion`
- **D-17:** No confidence indicator — treat AI-estimated nutrition identically to other recipes
- **D-18:** AI converts all ingredient quantities to grams regardless of source format (matches `recipe_ingredients.quantity_grams` column)
- **D-19:** For unknown ingredients, create custom_food entries with AI-estimated macros
- **D-20:** Apply existing yield factors (YIELD_FACTORS from nutrition.ts) — AI categorizes each ingredient for raw-to-cooked conversion
- **D-21:** Match existing custom_food entries by name before creating new ones to avoid duplicates

### Claude's Discretion
- Loading skeleton design in RecipeBuilder during import
- Error state design in the import modal
- Exact AI prompt engineering and response parsing
- YouTube transcript API approach (iframe API, oEmbed, or third-party)
- Edge function timeout and retry strategy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing AI recipe generation
- `supabase/functions/create-recipe-from-suggestion/index.ts` — Existing edge function pattern: auth, household lookup, Anthropic API call, recipe + custom_food + recipe_ingredient creation in Supabase. The new import edge function should follow this exact pattern.

### Recipe data model
- `src/types/database.ts` — Recipe, RecipeIngredient, CustomFood type definitions. Import must create records matching these types.
- `src/hooks/useRecipes.ts` — Recipe CRUD hooks (useRecipes, useRecipe, useRecipeIngredients, useAddIngredient). Import should work with existing hooks.

### Recipe UI
- `src/components/recipe/RecipeBuilder.tsx` — Full recipe editing component. Import navigates here with populated data.
- `src/components/recipe/RecipeStepsSection.tsx` — Cooking steps display/edit. Import populates steps here.
- `src/pages/RecipesPage.tsx` — Recipe listing page where the Import button will be added.

### Nutrition utilities
- `src/utils/nutrition.ts` — calcIngredientNutrition, calcRecipePerServing, YIELD_FACTORS. Import must use these for consistent nutrition calculation.

### Query keys
- `src/lib/queryKeys.ts` — Cache key patterns for recipe-related queries. Import must invalidate correctly.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `create-recipe-from-suggestion` edge function: Complete pattern for AI → recipe creation pipeline (auth, AI call, DB writes). New import function extends this.
- `RecipeBuilder.tsx`: Full recipe editing with ingredients, nutrition bars, steps, cost tracking. Import lands users here.
- `useRecipes.ts`: All recipe CRUD hooks including `useRecipeIngredients`, `useAddIngredient`. Import should use these or follow the same Supabase patterns.
- `RecipeStepsSection.tsx` + `useRecipeSteps.ts`: Cooking step management. Import populates steps via the same data path.
- `YIELD_FACTORS` in `nutrition.ts`: Existing raw-to-cooked conversion factors by food category.

### Established Patterns
- Edge functions use Deno, CORS headers, bearer token auth, household membership lookup
- AI calls use Anthropic API with `claude-haiku-4-5`, JSON response parsing
- Recipe ingredients stored as `custom_food` entries with per-100g macros + `recipe_ingredients` join records
- TanStack Query cache invalidation via `queryKeys.recipes.*` prefix arrays

### Integration Points
- RecipesPage: Add "Import Recipe" button alongside existing recipe management UI
- RecipeBuilder: Navigate here after import with pre-populated recipe ID
- Recipe detail page: Show source URL attribution link
- Recipe DB table: May need a `source_url` column (or use existing metadata field)

</code_context>

<specifics>
## Specific Ideas

- Servings should match household member count so the portioning system (Phase 24) can adjust per-person
- User explicitly wants the import to feel seamless — paste a URL, land in RecipeBuilder with everything filled in
- Match existing custom foods by name to keep the food library clean (no duplicates)

</specifics>

<deferred>
## Deferred Ideas

- Instagram recipe import — requires auth/API access for scraping, too fragile for v1
- JSON-LD/Schema.org structured data extraction as a fast path before AI — user chose "always use AI" for simplicity
- USDA/CNF database matching for imported ingredients — could improve accuracy but adds complexity

</deferred>

---

*Phase: 25-universal-recipe-import*
*Context gathered: 2026-04-15*
