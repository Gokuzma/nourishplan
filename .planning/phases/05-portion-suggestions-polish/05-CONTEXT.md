# Phase 5: Portion Suggestions & Polish - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

The app suggests how much each household member should eat per dish based on their personal targets, micronutrients are fully visible on recipes and in the meal plan, Open Food Facts is completely removed and replaced with Canadian Nutrient File (CNF), and the PWA passes a Lighthouse audit. No new food hierarchy features, no weekly reports, no full offline data operations.

</domain>

<decisions>
## Implementation Decisions

### Portion suggestion display
- Separate member column on each dish in the meal plan day card
- Current user's suggestion shown first; expandable to reveal all household members
- Each member shows: percentage of the whole dish + servings (e.g., "35% (1.2 svg)")
- Percentages across all members sum to ~100% (remainder shown as leftover percentage)
- Members without nutrition targets default to 1.0 serving with no special indication
- When logging a meal, the portion stepper pre-fills with the suggested value instead of defaulting to 1.0

### Suggestion algorithm
- Calorie-based split: each member's remaining daily calories / total household remaining calories, applied to the dish
- Uses remaining targets (accounts for what's already been logged earlier in the day) — suggestions update as logs are added
- Multi-dish slots: remaining calories for the meal slot are distributed proportionally across all dishes by calorie density
- Macro warning flag: if the suggested portion would put a member >20% over or under any macro target (protein, carbs, fat) for the day, show a warning indicator

### Recipe micronutrients
- Expandable section on each dish in the meal plan showing full micronutrient breakdown
- Show all available micronutrients from USDA/CNF data: fiber, sugar, sodium, calcium, iron, potassium, vitamin C, vitamin A — skip nutrients with no data
- Ordered by importance: fiber > sodium > minerals > vitamins
- Default view shows per-person values (scaled to the member's suggested portion); toggle to switch to per-serving
- Also add the same expandable micronutrient section to the recipe detail/builder page from Phase 2

### OFF removal and CNF integration
- Complete removal of Open Food Facts: delete search-off edge function, remove OFF tab from FoodSearch, delete all OFF-sourced food data from database (cascade delete from recipe ingredients)
- Replace with Canadian Nutrient File (CNF) as second data source
- Unified search: single search bar queries both USDA and CNF simultaneously, merged results with source labels (no separate tabs)
- CNF priority for deduplication — when both sources have the same food, prefer CNF data
- USDA fills gaps for foods CNF doesn't cover
- Keep verify-nutrition edge function — update to cross-check USDA vs CNF instead of USDA vs OFF

### PWA audit
- Pass Lighthouse PWA audit with installability and offline requirements met
- Existing PWA setup from Phase 4 (manifest, service worker, install prompt) serves as baseline

### Claude's Discretion
- CNF API integration details and edge function implementation
- Deduplication algorithm for USDA/CNF result merging
- Exact Lighthouse audit fixes needed (will depend on current score)
- Macro warning UI design (icon, color, tooltip content)
- Micronutrient toggle UI placement and styling
- Service worker caching improvements for Lighthouse compliance
- Migration strategy for OFF data removal

</decisions>

<specifics>
## Specific Ideas

- The expanded member column should make it immediately obvious how to divide a dish among the family — "I get 35%, Kid1 gets 20%"
- Leftover percentage is important — families often cook for more than one meal
- CNF replaces OFF because the user is Canadian — local nutrient data is more relevant than a global crowdsourced database
- Pre-filling the stepper with the suggested portion is key — removes friction for users who follow suggestions

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/log/NutrientBreakdown.tsx`: Collapsible micro display with progress bars — reuse pattern for recipe micronutrients
- `src/components/plan/ProgressRing.tsx`: Ring visualization — already used for daily summary
- `src/components/plan/MemberSelector.tsx`: Member switching UI — reuse for portion suggestion member expansion
- `src/components/plan/DayCard.tsx`: Day card layout — integration point for portion suggestions
- `src/components/log/LogMealModal.tsx`: Logging modal with stepper — modify to pre-fill with suggested portion
- `src/hooks/useNutritionTargets.ts`: Fetches member targets — needed for suggestion calculation
- `src/hooks/useFoodLogs.ts`: Fetches logged food — needed for remaining target calculation
- `src/hooks/useFoodSearch.ts`: Search hook with tab parameter — refactor for unified USDA+CNF search
- `src/utils/nutrition.ts`: `USDA_NUTRIENT_IDS` mapping and calculation utilities — extend for micro display and suggestion algorithm

### Established Patterns
- TanStack Query useQuery/useMutation wrapping Supabase client calls
- `meal_items` stores per-100g macro snapshot at insert time — suggestion reads these snapshots
- RLS with security-definer helpers (`get_user_household_id()`)
- Per-100g normalization for all nutrition data — CNF should follow same pattern
- Tailwind CSS 4 with @theme tokens (sage/cream/peach palette)

### Integration Points
- `src/components/food/FoodSearch.tsx`: Remove OFF tab, replace with unified USDA+CNF search
- `supabase/functions/search-off/`: Delete entirely
- `supabase/functions/verify-nutrition/`: Update to cross-check USDA vs CNF
- New edge function needed: `search-cnf` or unified `search-foods`
- `src/components/plan/DayCard.tsx`: Add portion suggestion display
- `src/components/recipe/RecipeBuilder.tsx`: Add micronutrient expandable section
- `vite.config.ts`: PWA config may need updates for Lighthouse compliance

</code_context>

<deferred>
## Deferred Ideas

None — CNF was incorporated into Phase 5 scope as a direct replacement for OFF.

</deferred>

---

*Phase: 05-portion-suggestions-polish*
*Context gathered: 2026-03-14*
