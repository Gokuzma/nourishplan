# Phase 12: Home Page & Food Search Redesign - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove the Food tab from navigation and integrate food search/logging directly on the home page. Improve search result sorting with fuzzy relevance scoring. Add per-food micronutrient drill-down on logged entries. Unify the search overlay so both home page logging and RecipeBuilder use the same component.

</domain>

<decisions>
## Implementation Decisions

### Food logging entry point
- Replace the current "+" button area with an inline search bar on the home page, positioned where the action buttons currently are (not at the top of the page)
- Tapping the search bar opens a full-screen overlay with search input at top and results below
- Back button/arrow in overlay returns to home page
- Overlay includes both "Search" and "My Foods" tabs (same tabs as current FoodSearch component)
- Tapping a search result expands it inline with a portion stepper + unit selector + "Log" button — no separate modal
- After logging, the search overlay stays open so users can log multiple foods in one session
- The overlay supports two modes: "log" (portion picker → save to food_logs) and "select" (pick food → return result to caller, e.g. RecipeBuilder)

### Search result sorting
- Fuzzy relevance scoring applied client-side after results return from USDA/CNF
- Scoring tiers: exact match (1.0) > starts-with (0.9) > word boundary match (0.7) > contains (0.5) > substring (0.3)
- Within the same score tier, shorter names appear first
- CNF and USDA results are interleaved by relevance score — no longer CNF-first grouping
- Deduplication still removes same-name duplicates (existing behavior)
- No typo tolerance — user must spell correctly

### Meal micronutrient drill-down
- All logged items (both meals and individual foods) can expand inline in DailyLogList
- Tapping a logged entry expands it to show per-food micronutrient breakdown
- Expanded view shows micronutrients only (fiber, iron, calcium, vitamins, etc.) — macros already visible in the log entry row
- Collapse by tapping again
- No navigation away from home page

### Food tab removal
- Remove "Foods" tab from TabBar — navigation becomes Home / Recipes / Plan / More
- Fully delete FoodsPage.tsx and remove the /foods route from App.tsx — /foods URL returns 404
- Custom food management (add/edit/delete) lives in the "My Foods" tab of the search overlay
- RecipeBuilder's ingredient search is unified with the new full-screen search overlay (same component, "select" mode)

### Claude's Discretion
- Exact search overlay transition/animation
- How to handle the inline portion picker layout within search results
- Scoring formula implementation details
- How to extract per-food micronutrients from meal_items for drill-down display
- Whether to refactor FoodSearch.tsx into the new overlay or create a fresh component

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Home page and logging
- `src/pages/HomePage.tsx` — Current home page with macro rings, micronutrient summary, action buttons, DailyLogList
- `src/components/log/FreeformLogModal.tsx` — Current freeform food logging modal (being replaced by search overlay)
- `src/components/log/DailyLogList.tsx` — Log entry list (needs drill-down expansion)
- `src/components/log/LogEntryItem.tsx` — Individual log entry display
- `src/components/log/PortionStepper.tsx` — Portion input component (reused in inline picker)

### Food search
- `src/components/food/FoodSearch.tsx` — Current food search with Search/My Foods tabs, ResultRow, custom food CRUD
- `src/hooks/useFoodSearch.ts` — USDA+CNF parallel search with CNF-first merge (sorting changes here)
- `src/components/food/FoodDetailPanel.tsx` — Food nutrition detail panel
- `src/components/food/CustomFoodForm.tsx` — Custom food add/edit form

### Navigation
- `src/components/layout/TabBar.tsx` — Tab bar with Foods tab to remove
- `src/pages/FoodsPage.tsx` — Page to delete
- `src/App.tsx` — Route definitions (/foods route to remove)

### Recipe builder (search unification)
- `src/components/recipe/RecipeBuilder.tsx` — Currently uses FoodSearch in 'select' mode for ingredients

### Phase 11 context (prior decisions)
- `.planning/phases/11-nutrition-calculation-fixes/11-CONTEXT.md` — Micronutrient display and serving unit decisions

### Roadmap
- `.planning/ROADMAP.md` §Phase 12 — Success criteria (UXLOG-01, UXLOG-02, UXLOG-03, UXLOG-04)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FoodSearch` component: Has Search/My Foods tabs, ResultRow, verification badges, custom food CRUD — core logic reusable in new overlay
- `PortionStepper`: Reusable for inline portion picker in search results
- `FoodDetailPanel`: Nutrition detail modal — can still be used from search overlay
- `CustomFoodForm`: Add/edit form — works inside the overlay's My Foods tab
- `NutrientBreakdown`: Existing micronutrient display component — reusable for drill-down
- `ProgressRing`: Used for micronutrient progress indicators
- `MICRONUTRIENT_DISPLAY_ORDER`, `MICRONUTRIENT_LABELS`: Display constants for micronutrient rendering

### Established Patterns
- `useFoodSearch` fires parallel USDA+CNF queries with TanStack Query — sorting logic fits in the existing useMemo merge step
- `FoodSearch` mode prop ('browse' | 'select') — new overlay extends this to ('log' | 'select')
- food_logs stores micronutrients as JSONB — drill-down reads from this field
- LogEntryItem already shows per-entry macros — drill-down adds expandable micronutrient section

### Integration Points
- HomePage.tsx: Replace "+" button area with search bar trigger, wire up search overlay
- TabBar.tsx: Remove Foods entry from tabs array
- App.tsx: Remove /foods route
- RecipeBuilder.tsx: Switch from inline FoodSearch to new search overlay in "select" mode
- useFoodSearch.ts: Add relevance scoring in the useMemo merge step
- DailyLogList / LogEntryItem: Add expandable micronutrient drill-down

</code_context>

<specifics>
## Specific Ideas

- Search bar positioned where the current "+" button / action buttons are, not at the very top of the page
- Full-screen overlay for search (not bottom sheet or inline dropdown)
- Inline portion picker expands within search results — no separate modal for portion selection
- Search overlay stays open after logging so users can log multiple foods
- Both home page logging and RecipeBuilder ingredient selection share the same overlay component

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-home-page-food-search-redesign*
*Context gathered: 2026-03-15*
