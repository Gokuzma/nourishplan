# Phase 2: Food Data & Recipe Builder - Research

**Researched:** 2026-03-12
**Domain:** External food APIs (USDA FDC, Open Food Facts), Supabase Edge Functions, recursive graph algorithms, per-100g nutrition normalization
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Food search experience**
- Tabbed search interface with three tabs: USDA, Open Food Facts, My Foods
- Each result shows: food name, calories, protein, carbs, fat per 100g
- Tapping a result adds it directly with a quantity prompt (not a detail sheet)
- A "view details" button available for users who want full nutrition breakdown before adding
- AI verification runs at search time — results are pre-verified before the user sees them

**Custom food entry**
- Simple form by default: name, serving size, calories, protein, carbs, fat (required)
- Expandable "Add micronutrients" section reveals all possible nutrition label fields
- Serving size: freeform text description ("2 cookies") + gram weight (30g)
- Nutrition stored as per-100g internally, displayed in user's serving unit
- Custom foods are shared across the entire household (any member can use them)
- Edit/delete permissions: creator + household admins only; regular members can use but not modify

**Recipe builder interaction**
- Single scrollable page with sticky nutrition bar at bottom
- Sticky bar shows per-serving: calories, protein, carbs, fat — updates live as ingredients change
- Recipe name and servings count at top
- Ingredient list with inline edit (✎) and remove (✖) per row
- "Add Ingredient" opens food search (same tabbed search component reused)
- Quantity input supports multiple units: grams default, plus USDA-provided portion sizes per food (e.g., "1 cup, chopped = 140g", "1 breast = 174g"). Dropdown shows available portions for that specific food.
- Nested recipes appear inline in the ingredient list with a recipe badge icon, tappable to view sub-recipe
- Circular reference prevention enforced (recipe cannot contain itself directly or indirectly)
- Raw/cooked toggle per ingredient row — default is raw. Toggling recalculates nutrition using weight conversion factors.

**AI nutrition verification**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOOD-01 | User can search USDA FoodData Central for foods by name | USDA FDC `/foods/search` API confirmed; nutrient number mapping (208=energy, 203=protein, 204=fat, 205=carbs) documented |
| FOOD-02 | User can search additional open food databases (Open Food Facts) for broader coverage | OFF v1 search endpoint confirmed; `_100g` fields align with per-100g storage model; no-CORS via Edge Function proxy |
| FOOD-03 | User can add custom foods with name, serving size, calories, macros, and optional micronutrients | Supabase `custom_foods` table with RLS; form pattern follows existing household patterns |
| FOOD-04 | User can edit and delete their custom foods | useMutation pattern confirmed; permission check (creator OR admin) requires `created_by` + household role lookup |
| FOOD-05 | Nutrition data from multiple sources is normalized to per-100g | Both APIs return per-100g natively (USDA: `amount` in AbridgedFoodNutrient; OFF: `nutriments.{name}_100g`); no conversion needed |
| FOOD-06 | AI verification layer cross-checks nutrition data when sources disagree | Supabase Edge Function with `ANTHROPIC_API_KEY` via `Deno.env.get()` confirmed; Claude Haiku model available |
| RECP-01 | User can create a recipe by adding food items as ingredients with quantities | `recipe_ingredients` table with polymorphic `ingredient_type` (food/recipe) + `ingredient_id` |
| RECP-02 | Recipe nutrition per serving is auto-calculated from ingredients | Client-side calculation: sum (ingredient.nutrition_per_100g * quantity_grams / 100) / servings |
| RECP-03 | User can set number of servings a recipe makes | `servings` column on `recipes` table; used as divisor in nutrition calculation |
| RECP-04 | User can use another recipe as an ingredient (nested recipes) | Recursive nutrition resolution needed; circular reference detection via PostgreSQL 14+ CYCLE clause or application-layer ancestor set |
| RECP-05 | User can edit and delete their recipes | useMutation + query invalidation; soft delete pattern recommended (future meal plan references) |
| RECP-06 | Recipe handles raw vs cooked weight states for ingredients | `weight_state` column ('raw'/'cooked') on `recipe_ingredients`; conversion factor per food type needed |
</phase_requirements>

---

## Summary

Phase 2 builds on Phase 1's Supabase + TanStack Query + Tailwind foundation. The core complexity is threefold: proxying two external food APIs (USDA FDC and Open Food Facts) through Supabase Edge Functions to avoid CORS and protect API keys, designing a recursive recipe ingredient data model that prevents circular references, and implementing an AI verification layer via Claude Haiku without exposing the API key to the browser.

Both external APIs return nutrition data per 100g natively, which eliminates normalization complexity (FOOD-05). USDA returns `foodNutrients[].amount` mapped by nutrient number; Open Food Facts returns `nutriments.{name}_100g` fields. The custom food form and Supabase storage use the same per-100g internal representation, so all sources are consistent. Nutrition recalculation for recipes is pure client-side math: `(quantity_grams / 100) * per_100g_value`, summed across ingredients, divided by servings.

The trickiest requirement is nested recipes (RECP-04). Circular reference detection must run before saving an ingredient link — either in the application layer (traverse ancestor set) or enforced in Postgres using WITH RECURSIVE + CYCLE clause. PostgreSQL 14+ (used by Supabase) supports the CYCLE syntax natively. The raw/cooked toggle (RECP-06) uses a simple yield factor multiplier stored per ingredient row; USDA publishes cooking yield tables, but a curated set of ~20 common food-type factors (meat: 0.75, vegetables: 0.85, etc.) is sufficient for v1.

**Primary recommendation:** Implement all external API calls as Supabase Edge Functions (one per external service + one for AI verification). This keeps ANTHROPIC_API_KEY and USDA API key server-side, enables per-function caching, and avoids CORS entirely.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.1 (existing) | DB queries, RLS, Edge Function invocation | Already installed; `supabase.functions.invoke()` for Edge Function calls |
| @tanstack/react-query | ^5.90.21 (existing) | Server state, caching, loading/error states | Already the project standard; all hooks follow this pattern |
| tailwindcss | ^4.2.1 (existing) | Styling, responsive, Tailwind CSS 4 @theme tokens | Already installed with sage/cream/peach palette |
| react-router-dom | ^7.13.1 (existing) | New routes /foods, /recipes, /recipes/:id | Already installed with AppShell nested route pattern |

### Supporting (to add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new client deps needed | — | All external API calls go through Edge Functions | USDA + OFF + Claude are server-side only |

### Supabase Edge Functions (new)
| Function | Purpose |
|----------|---------|
| `search-usda` | Proxies USDA FDC `/foods/search`; returns normalized results |
| `search-off` | Proxies Open Food Facts v1 search; returns normalized results |
| `verify-nutrition` | Calls Claude Haiku to cross-check/flag nutrition data |

**No new npm packages required.** All external integrations go through Edge Functions.

**Installation (Edge Function runtime, not npm):**
```bash
# Set secrets once (production)
supabase secrets set USDA_API_KEY=your_key_here
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Local development — create supabase/functions/.env
# USDA_API_KEY=your_key_here
# ANTHROPIC_API_KEY=sk-ant-...
```

---

## Architecture Patterns

### Recommended Project Structure (additions to existing src/)
```
src/
├── components/
│   ├── food/            # FoodSearch (tabbed), FoodCard, FoodDetailSheet, CustomFoodForm
│   └── recipe/          # RecipeBuilder, IngredientRow, NutritionBar (sticky), QuantityInput
├── hooks/
│   ├── useFoodSearch.ts       # Calls Edge Functions for USDA + OFF search
│   ├── useCustomFoods.ts      # CRUD for household custom_foods table
│   └── useRecipes.ts          # CRUD for recipes + recipe_ingredients
├── pages/
│   ├── FoodsPage.tsx          # /foods — tabbed search + custom food list
│   └── RecipePage.tsx         # /recipes/:id — builder with sticky nutrition bar
├── types/
│   └── database.ts            # Extend with Food, Recipe, RecipeIngredient types
└── utils/
    └── nutrition.ts           # Pure functions: calcPerServing, resolveNested, detectCycle

supabase/
├── functions/
│   ├── search-usda/index.ts   # Edge Function: proxy USDA FDC
│   ├── search-off/index.ts    # Edge Function: proxy Open Food Facts
│   └── verify-nutrition/index.ts  # Edge Function: Claude Haiku verification
└── migrations/
    └── 004_food_recipe.sql    # New tables: custom_foods, recipes, recipe_ingredients
```

### Pattern 1: Edge Function Proxy for External APIs

**What:** All calls to USDA, Open Food Facts, and Claude go through Supabase Edge Functions. The React client calls `supabase.functions.invoke('search-usda', { body: { query } })`.

**When to use:** Any time an API key must stay server-side, or CORS would block browser requests (Open Food Facts has no CORS support).

**Example (Edge Function):**
```typescript
// supabase/functions/search-usda/index.ts
// Source: https://supabase.com/docs/guides/functions/secrets
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { query } = await req.json()
  const apiKey = Deno.env.get('USDA_API_KEY')

  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS),Branded&pageSize=25`
  )
  const data = await response.json()

  // Normalize to per-100g and extract key nutrients
  const results = data.foods.map((food: any) => ({
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    calories: food.foodNutrients.find((n: any) => n.number === '208')?.amount ?? 0,
    protein: food.foodNutrients.find((n: any) => n.number === '203')?.amount ?? 0,
    fat: food.foodNutrients.find((n: any) => n.number === '204')?.amount ?? 0,
    carbs: food.foodNutrients.find((n: any) => n.number === '205')?.amount ?? 0,
    portions: food.foodMeasures ?? [],
  }))

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

**Example (React client call):**
```typescript
// Source: supabase.com/docs/guides/functions (invoke pattern)
const { data, error } = await supabase.functions.invoke('search-usda', {
  body: { query: searchTerm },
})
```

### Pattern 2: TanStack Query Hook for Food Search

**What:** `useFoodSearch` debounces the query, calls the appropriate Edge Function, and returns loading/error states. Follows the same `useQuery` pattern established in `useHousehold.ts`.

**Example:**
```typescript
// src/hooks/useFoodSearch.ts
export function useFoodSearch(tab: 'usda' | 'off', query: string) {
  return useQuery({
    queryKey: ['food-search', tab, query],
    queryFn: async () => {
      if (!query.trim()) return []
      const fnName = tab === 'usda' ? 'search-usda' : 'search-off'
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { query },
      })
      if (error) throw error
      return data as NormalizedFoodResult[]
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // cache search results 5 min
  })
}
```

### Pattern 3: Per-100g Nutrition Calculation (client-side, pure)

**What:** Nutrition for a recipe is calculated entirely client-side from ingredient weights and per-100g values. No server round-trip needed. This keeps the sticky bar update instantaneous.

**Example:**
```typescript
// src/utils/nutrition.ts
export function calcIngredientNutrition(
  food: { calories: number; protein: number; fat: number; carbs: number },
  quantityGrams: number
): MacroSummary {
  const factor = quantityGrams / 100
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    fat: food.fat * factor,
    carbs: food.carbs * factor,
  }
}

export function calcRecipePerServing(
  ingredients: ResolvedIngredient[],
  servings: number
): MacroSummary {
  const total = ingredients.reduce((acc, ing) => ({
    calories: acc.calories + ing.nutrition.calories,
    protein: acc.protein + ing.nutrition.protein,
    fat: acc.fat + ing.nutrition.fat,
    carbs: acc.carbs + ing.nutrition.carbs,
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 })

  return {
    calories: total.calories / servings,
    protein: total.protein / servings,
    fat: total.fat / servings,
    carbs: total.carbs / servings,
  }
}
```

### Pattern 4: Circular Reference Detection (application layer)

**What:** Before saving a new recipe ingredient that is itself a recipe, traverse the ancestor chain. If the target recipe ID appears anywhere in the chain, reject.

**When to use:** On the client before submitting; can also add a Postgres CHECK via function for defense in depth.

**Example:**
```typescript
// src/utils/nutrition.ts
export async function wouldCreateCycle(
  recipeId: string,
  candidateIngredientRecipeId: string,
  getAllIngredients: (id: string) => Promise<RecipeIngredient[]>
): Promise<boolean> {
  if (recipeId === candidateIngredientRecipeId) return true
  const visited = new Set<string>()
  const queue = [candidateIngredientRecipeId]
  while (queue.length) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    const ingredients = await getAllIngredients(current)
    for (const ing of ingredients) {
      if (ing.ingredient_type === 'recipe') {
        if (ing.ingredient_id === recipeId) return true
        queue.push(ing.ingredient_id)
      }
    }
  }
  return false
}
```

### Anti-Patterns to Avoid

- **Calling USDA or OFF directly from the browser:** Open Food Facts blocks CORS on browser requests; USDA API keys would be exposed in network tab. Always use Edge Functions.
- **Calculating nutrition on the server per keystroke:** The sticky bar must feel instantaneous. Keep nutrition math client-side, with ingredient data already loaded.
- **Storing nutrition per-serving in the database:** Always store per-100g and calculate display values at render time. Serving sizes change; per-100g is the stable representation.
- **Deep-fetching nested recipe nutrition on every render:** Resolve nested recipe nutrition once when the ingredient list loads, memoize with `useMemo`. Re-resolve only when ingredients change.
- **Blocking add-ingredient on circular reference check while UI waits:** Pre-fetch recipe ancestor data and run the cycle check synchronously against cached data. Show an error inline if detected.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS-safe food API access | Custom fetch wrapper with proxy | Supabase Edge Function | CORS is a browser constraint; Edge Functions run server-side by design |
| Claude API secret management | Environment variable in Vite | `Deno.env.get()` in Edge Function | Vite env vars are bundled into client JS; Deno secrets are never sent to browser |
| Nutrition number formatting | Custom rounding logic | `toFixed(1)` + locale formatting | Simple math; no library needed, but centralize in one util |
| Debounced search | Manual `setTimeout`/`clearTimeout` | TanStack Query's `enabled` + component-level `useDeferredValue` or a minimal hook | Reinventing this adds edge cases around cleanup |
| USDA nutrient number lookup table | Hardcoded map inline per component | A shared `NUTRIENT_IDS` constant in `utils/nutrition.ts` | Numbers (208, 203, 204, 205) are stable; centralize for maintainability |

**Key insight:** The "infrastructure" problems in this phase (CORS, secret management, caching) are solved by Supabase's own tooling — not by adding libraries.

---

## Common Pitfalls

### Pitfall 1: USDA Search Returns Multiple Data Types — Duplicates Appear

**What goes wrong:** A search for "chicken breast" returns the same food from Foundation, SR Legacy, and Branded — three rows that look identical to the user.
**Why it happens:** USDA FDC has four separate databases that overlap for generic foods.
**How to avoid:** In the Edge Function, filter results by dataType priority: Foundation > SR Legacy > Survey > Branded. For generic/whole foods, suppress Branded duplicates. For branded-specific queries, show Branded.
**Warning signs:** Users see 5+ near-identical results with slightly different calorie values.

### Pitfall 2: Open Food Facts Returns Incomplete Nutrition Fields

**What goes wrong:** Some OFF products have `null` or missing `_100g` fields for protein, fat, or carbs.
**Why it happens:** OFF is community-contributed; many entries are partial.
**How to avoid:** In the Edge Function, filter out any product where `energy-kcal_100g`, `proteins_100g`, `fat_100g`, AND `carbohydrates_100g` are all missing. Show partial data only if at least calories are present.
**Warning signs:** NaN propagating into recipe nutrition totals.

### Pitfall 3: Circular Recipe References Reach Database

**What goes wrong:** If cycle detection only runs client-side, a race condition (two tabs open) could save a circular reference.
**Why it happens:** Client-side-only guards are bypassable.
**How to avoid:** Add a Postgres function that validates no cycle exists before inserting into `recipe_ingredients`, called via trigger or RPC. Client-side check provides fast UX feedback; server-side check is the safety net.
**Warning signs:** Infinite loop during nested recipe nutrition resolution.

### Pitfall 4: Sticky Nutrition Bar Flickers on Ingredient Edit

**What goes wrong:** The bar shows stale values briefly after an ingredient is changed.
**Why it happens:** If nutrition is derived from a `useQuery` that invalidates and refetches, there's a loading gap.
**How to avoid:** Keep the nutrition bar's inputs (`ingredients` array with resolved per-100g values) in local component state. Update state synchronously on edit; persist to Supabase in the background. Do NOT derive the bar's values from a query result.
**Warning signs:** Visible 200-500ms blank/zero state in the nutrition bar after typing.

### Pitfall 5: USDA API Key Quota Exhaustion in Development

**What goes wrong:** 1,000 requests/hour/IP is shared across all developers and test runs.
**Why it happens:** If tests or hot-reload trigger real API calls, quota drains fast.
**How to avoid:** Mock Edge Function responses in tests (`vi.mock` on `supabase.functions.invoke`). Cache search results aggressively in TanStack Query (`staleTime: 5 * 60 * 1000`).
**Warning signs:** 429 errors in dev server logs.

### Pitfall 6: Raw/Cooked Weight Toggle Using Wrong Factor Direction

**What goes wrong:** When toggling to "cooked", the gram weight shown increases instead of decreases (or vice versa).
**Why it happens:** Yield factor direction is ambiguous: "chicken breast loses 25% weight when cooked" means cooked_grams = raw_grams * 0.75 (not the inverse).
**How to avoid:** Define `yield_factor` as `cooked_weight / raw_weight` (always < 1 for meat/vegetables). When `weight_state = 'cooked'`, the nutrition equivalent raw weight is `stated_grams / yield_factor`. Document the convention explicitly in `nutrition.ts`.
**Warning signs:** Nutrition values doubling or halving unexpectedly on toggle.

---

## Code Examples

### USDA Key Nutrient Numbers
```typescript
// src/utils/nutrition.ts
// Source: USDA FDC API OpenAPI spec https://fdc.nal.usda.gov/api-spec/fdc_api.html
export const USDA_NUTRIENT_IDS = {
  ENERGY_KCAL: '208',
  PROTEIN: '203',
  FAT: '204',
  CARBS: '205',
  FIBER: '291',
  SUGAR: '269',
  SODIUM: '307',
  CALCIUM: '301',
  IRON: '303',
  POTASSIUM: '306',
  VITAMIN_C: '401',
  VITAMIN_A: '318',
} as const
```

### Open Food Facts Search URL (v1, full-text, via Edge Function)
```typescript
// supabase/functions/search-off/index.ts
// Source: https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/
// Note: v1 only for full-text search; v2 search lacks full-text support
const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=25&fields=product_name,nutriments,serving_size,brands`
// Add User-Agent (required by OFF ToS)
const response = await fetch(url, {
  headers: { 'User-Agent': 'NourishPlan/1.0 (contact@nourishplan.app)' }
})
```

### Open Food Facts Nutriments Structure
```typescript
// OFF response: product.nutriments contains _100g suffix fields
// Source: https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/
interface OFFNutriments {
  'energy-kcal_100g'?: number
  'proteins_100g'?: number
  'fat_100g'?: number
  'carbohydrates_100g'?: number
  'fiber_100g'?: number
  'sugars_100g'?: number
  'sodium_100g'?: number
  // ...more micronutrients
}
```

### Supabase Edge Function — AI Verification (Claude Haiku)
```typescript
// supabase/functions/verify-nutrition/index.ts
// Source: https://supabase.com/docs/guides/functions/secrets
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': anthropicKey!,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Check these nutrition values per 100g for "${foodName}":
USDA: ${JSON.stringify(usdaValues)}
OFF: ${JSON.stringify(offValues)}
Reply JSON: { "verified": true/false, "recommended": {...per-100g values}, "reason": "..." }`
    }]
  })
})
```

### RLS Policy Pattern for Custom Foods (household-scoped)
```sql
-- supabase/migrations/004_food_recipe.sql
-- Custom foods shared across household; only creator or admin can modify
create policy "household members read custom foods"
  on public.custom_foods for select
  to authenticated
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
  );

create policy "creator or admin can modify custom foods"
  on public.custom_foods for update, delete
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = custom_foods.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );
```

### Polymorphic recipe_ingredients Schema
```sql
-- recipe_ingredients: ingredient_type distinguishes food vs recipe rows
create table public.recipe_ingredients (
  id              uuid primary key default gen_random_uuid(),
  recipe_id       uuid not null references public.recipes(id) on delete cascade,
  ingredient_type text not null check (ingredient_type in ('food', 'recipe')),
  ingredient_id   uuid not null,  -- refs custom_foods.id OR recipes.id
  quantity_grams  numeric not null,
  weight_state    text not null default 'raw' check (weight_state in ('raw', 'cooked')),
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Calling food APIs directly from browser | Edge Function proxy | Always best practice; CORS requirement makes it mandatory for OFF | No client-side API keys; OFF CORS bypassed |
| Full text search via OFF v2 | Use OFF v1 (`/cgi/search.pl`) | v2 never had full-text; v1 still canonical | Must use v1 URL pattern, not v2/search endpoint |
| Manual fetch + useEffect for search | TanStack Query `useQuery` + `enabled` | TanStack Query v5 (current) | Built-in caching, deduplication, staleTime |
| Nutrition calculated server-side per request | Client-side pure math, server stores per-100g | Project architecture decision | Instant sticky bar updates, no server round-trip |

**Deprecated/outdated:**
- Open Food Facts v2 `search` endpoint: Does NOT support full-text search. Use v1 CGI endpoint (`/cgi/search.pl?search_terms=...`) for name-based lookup.
- Storing nutrition per-serving: Anti-pattern. Serving size changes; per-100g is canonical.

---

## Open Questions

1. **Exact micronutrient fields in the custom food form**
   - What we know: The expanded form should show "all possible nutrition label fields"
   - What's unclear: Exact set — US nutrition label has ~14 mandatory fields + optional micronutrients; EU differs
   - Recommendation: Use US nutrition label as baseline: calories, total fat, saturated fat, trans fat, cholesterol, sodium, total carbs, dietary fiber, total sugars, added sugars, protein, vitamin D, calcium, iron, potassium. Planner should decide field list.

2. **Raw/cooked yield factors — data source**
   - What we know: USDA publishes cooking yields for meat and poultry (PDF). Generic factors work for v1.
   - What's unclear: Whether to use USDA table or a hardcoded approximation
   - Recommendation: Use curated static map in `utils/nutrition.ts` for v1: meat=0.75, poultry=0.75, fish=0.80, vegetables=0.85, legumes=2.5 (absorb water), grains=2.5. Expose as editable constants.

3. **Recipe deletion and downstream impact**
   - What we know: Recipes can be ingredients in other recipes; meal plans (Phase 3) will reference them
   - What's unclear: Hard delete would break recipe_ingredients foreign keys; soft delete requires `deleted_at` column
   - Recommendation: Soft delete (`deleted_at` timestamp). RLS SELECT policy filters out deleted rows. This is left to Claude's discretion but affects the migration.

4. **USDA API key for development**
   - What we know: data.gov API keys are free; signup is instant
   - What's unclear: Whether the project has an API key registered
   - Recommendation: Developer must obtain a free key at https://fdc.nal.usda.gov/api-key-signup/ and add to `supabase/functions/.env` for local dev. The DEMO_KEY (no signup) is rate-limited to 30 req/hour — insufficient for development.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + @testing-library/react 16.x |
| Config file | `vitest.config.ts` (root) — `environment: 'jsdom'`, `setupFiles: ['./tests/setup.ts']` |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOOD-01 | USDA search hook returns normalized results | unit | `npm test -- tests/food-search.test.ts -t usda` | ❌ Wave 0 |
| FOOD-02 | OFF search hook returns normalized results | unit | `npm test -- tests/food-search.test.ts -t off` | ❌ Wave 0 |
| FOOD-03 | Custom food form submits correct payload | unit | `npm test -- tests/custom-food.test.ts` | ❌ Wave 0 |
| FOOD-04 | Edit/delete respects creator-or-admin permission | unit | `npm test -- tests/custom-food.test.ts -t permissions` | ❌ Wave 0 |
| FOOD-05 | Nutrition normalization: calcIngredientNutrition(food, grams) | unit | `npm test -- tests/nutrition.test.ts` | ❌ Wave 0 |
| FOOD-06 | AI verification Edge Function returns verified flag | manual-only | N/A — requires live Claude API key | N/A |
| RECP-01 | Recipe builder adds ingredient and updates list | unit | `npm test -- tests/recipe-builder.test.tsx` | ❌ Wave 0 |
| RECP-02 | calcRecipePerServing sums ingredients and divides by servings | unit | `npm test -- tests/nutrition.test.ts -t recipe` | ❌ Wave 0 |
| RECP-03 | Changing servings count updates per-serving display | unit | `npm test -- tests/recipe-builder.test.tsx -t servings` | ❌ Wave 0 |
| RECP-04 | wouldCreateCycle detects direct and indirect cycles | unit | `npm test -- tests/nutrition.test.ts -t cycle` | ❌ Wave 0 |
| RECP-05 | Delete recipe sets deleted_at (soft delete) | unit | `npm test -- tests/recipes.test.ts -t delete` | ❌ Wave 0 |
| RECP-06 | Raw/cooked toggle recalculates with yield factor | unit | `npm test -- tests/nutrition.test.ts -t yield` | ❌ Wave 0 |

**Note on FOOD-06:** AI verification runs via live Edge Function with real Claude API. No viable unit test without a live key. Manual verification: trigger a search, confirm ⓘ icon appears, confirm ⚠️ appears on seeded outlier data.

### Sampling Rate
- **Per task commit:** `npm test -- tests/nutrition.test.ts` (pure function tests, sub-2s)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/nutrition.test.ts` — covers FOOD-05, RECP-02, RECP-04, RECP-06 (pure util functions, no mocks needed)
- [ ] `tests/food-search.test.ts` — covers FOOD-01, FOOD-02 (mock `supabase.functions.invoke`)
- [ ] `tests/custom-food.test.ts` — covers FOOD-03, FOOD-04 (mock supabase client)
- [ ] `tests/recipe-builder.test.tsx` — covers RECP-01, RECP-03 (render RecipeBuilder with mocked hooks)
- [ ] `tests/recipes.test.ts` — covers RECP-05 (mock supabase mutation)

---

## Sources

### Primary (HIGH confidence)
- USDA FDC OpenAPI spec https://fdc.nal.usda.gov/api-spec/fdc_api.html — endpoint structure, nutrient numbers, data types, rate limits
- USDA FDC API Guide https://fdc.nal.usda.gov/api-guide/ — authentication, rate limits (1,000/hr), CC0 license
- Supabase Edge Function Secrets docs https://supabase.com/docs/guides/functions/secrets — `Deno.env.get()`, CLI secrets commands
- Open Food Facts API tutorial https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/ — nutriments `_100g` field structure confirmed
- TanStack Query v5 optimistic updates https://tanstack.com/query/v5/docs/react/guides/optimistic-updates — onMutate/rollback pattern

### Secondary (MEDIUM confidence)
- OFF v1 vs v2 full-text limitation — multiple sources agree: only v1 CGI endpoint supports full-text name search
- PostgreSQL CYCLE clause (Postgres 14+) — supported by Supabase per community documentation
- Open Food Facts User-Agent requirement — documented in OFF API tutorial

### Tertiary (LOW confidence)
- USDA dataType deduplication priority (Foundation > SR Legacy > Branded for generic foods) — inferred from USDA documentation on data type purposes; not an official API recommendation
- Yield factors (meat=0.75 etc.) — based on USDA cooking yields PDF summary; exact values need validation against real data

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; Edge Functions pattern confirmed in Supabase docs
- Architecture: HIGH — polymorphic recipe_ingredients and per-100g storage are established patterns; confirmed by project STATE.md
- Pitfalls: MEDIUM-HIGH — API CORS and key exposure confirmed; deduplication and yield factor pitfalls inferred from API docs
- External API field names: HIGH — both USDA and OFF field structures confirmed from official docs

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days — USDA and OFF APIs are stable; Claude model names may change)
