# Phase 2: Food Data & Recipe Builder - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can search for foods (USDA and Open Food Facts), add custom foods with full nutrition data, and build recipes with ingredients, quantities, nested sub-recipes, and auto-calculated per-serving nutrition. AI verifies nutrition accuracy across sources and flags outliers. No meal planning, logging, or portion suggestions — those are later phases.

</domain>

<decisions>
## Implementation Decisions

### Food search experience
- Tabbed search interface with three tabs: USDA, Open Food Facts, My Foods
- Each result shows: food name, calories, protein, carbs, fat per 100g
- Tapping a result adds it directly with a quantity prompt (not a detail sheet)
- A "view details" button available for users who want full nutrition breakdown before adding
- AI verification runs at search time — results are pre-verified before the user sees them

### Custom food entry
- Simple form by default: name, serving size, calories, protein, carbs, fat (required)
- Expandable "Add micronutrients" section reveals all possible nutrition label fields
- Serving size: freeform text description ("2 cookies") + gram weight (30g)
- Nutrition stored as per-100g internally, displayed in user's serving unit
- Custom foods are shared across the entire household (any member can use them)
- Edit/delete permissions: creator + household admins only; regular members can use but not modify

### Recipe builder interaction
- Single scrollable page with sticky nutrition bar at bottom
- Sticky bar shows per-serving: calories, protein, carbs, fat — updates live as ingredients change
- Recipe name and servings count at top
- Ingredient list with inline edit (✎) and remove (✖) per row
- "Add Ingredient" opens food search (same tabbed search component reused)
- Quantity input supports multiple units: grams default, plus USDA-provided portion sizes per food (e.g., "1 cup, chopped = 140g", "1 breast = 174g"). Dropdown shows available portions for that specific food.
- Nested recipes appear inline in the ingredient list with a recipe badge icon, tappable to view sub-recipe
- Circular reference prevention enforced (recipe cannot contain itself directly or indirectly)
- Raw/cooked toggle per ingredient row — default is raw. Toggling recalculates nutrition using weight conversion factors.

### AI nutrition verification
- Powered by Claude API (Haiku model) — ~$0.001 per verification
- Runs at search time: results shown to user are already verified
- Cross-source conflict resolution: AI silently picks the most likely correct value when USDA and OFF disagree
- Small ⓘ icon on AI-verified results — tapping shows source comparison and reasoning
- Also flags single-source outliers: impossible values (e.g., 0 cal with 50g protein), macro-calorie math mismatches
- Outlier warnings shown as ⚠️ badge with explanation text
- Requires ANTHROPIC_API_KEY environment variable (server-side calls only — key never exposed to client)

### Claude's Discretion
- Caching strategy for external API results (cache-on-use vs always-live)
- Search debounce timing and loading skeleton design
- Exact micronutrient fields in the expanded custom food form
- Error states for API failures (USDA down, OFF down, Claude API down)
- Raw/cooked weight conversion factors and data source
- Recipe deletion behavior (soft delete vs hard delete, impact on meal plans)
- Database schema design for foods, recipes, recipe_ingredients tables

</decisions>

<specifics>
## Specific Ideas

- Food search tabs should feel like switching between databases, not filtering — each tab is its own search context
- Recipe builder sticky nutrition bar should feel immediate — no loading spinners between ingredient edits
- AI verification should be invisible to the user most of the time — only the ⓘ icon hints it happened
- Warning badges (⚠️) should be non-blocking — user can still use flagged data, it's informational

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useHousehold.ts`: TanStack Query v5 pattern for Supabase queries — reuse for food/recipe hooks
- `src/lib/supabase.ts`: Typed Supabase client singleton — extend for new tables
- `src/types/database.ts`: Database type definitions — add food/recipe types
- `src/components/layout/AppShell.tsx`: Layout with Outlet — new pages slot in via routes

### Established Patterns
- TanStack Query useQuery/useMutation wrapping Supabase client calls
- Tailwind CSS 4 with @theme tokens (sage/cream/peach palette)
- Mobile-first responsive (hidden md:flex pattern)
- RLS policies per table for household isolation
- maybeSingle() for nullable queries

### Integration Points
- `src/App.tsx`: Add routes for /foods, /recipes, /recipes/:id (within AuthGuard)
- `src/components/layout/TabBar.tsx` and `Sidebar.tsx`: May need nav updates for food/recipe access
- `supabase/migrations/`: New migration for Phase 2 schema (foods, recipes, recipe_ingredients, etc.)
- New environment variable: ANTHROPIC_API_KEY for AI verification (server-side)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-food-data-recipe-builder*
*Context gathered: 2026-03-12*
