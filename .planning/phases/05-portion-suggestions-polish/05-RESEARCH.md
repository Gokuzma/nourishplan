# Phase 5: Portion Suggestions & Polish - Research

**Researched:** 2026-03-14
**Domain:** Portion suggestion algorithm, CNF API integration, micronutrient display, PWA audit, OFF removal
**Confidence:** HIGH (core algorithms and OFF removal), MEDIUM (CNF API architecture), HIGH (PWA)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Portion suggestion display:**
- Separate member column on each dish in the meal plan day card
- Current user's suggestion shown first; expandable to reveal all household members
- Each member shows: percentage of the whole dish + servings (e.g., "35% (1.2 svg)")
- Percentages across all members sum to ~100% (remainder shown as leftover percentage)
- Members without nutrition targets default to 1.0 serving with no special indication
- When logging a meal, the portion stepper pre-fills with the suggested value instead of defaulting to 1.0

**Suggestion algorithm:**
- Calorie-based split: each member's remaining daily calories / total household remaining calories, applied to the dish
- Uses remaining targets (accounts for what's already been logged earlier in the day) — suggestions update as logs are added
- Multi-dish slots: remaining calories for the meal slot are distributed proportionally across all dishes by calorie density
- Macro warning flag: if the suggested portion would put a member >20% over or under any macro target (protein, carbs, fat) for the day, show a warning indicator

**Recipe micronutrients:**
- Expandable section on each dish in the meal plan showing full micronutrient breakdown
- Show all available micronutrients from USDA/CNF data: fiber, sugar, sodium, calcium, iron, potassium, vitamin C, vitamin A — skip nutrients with no data
- Ordered by importance: fiber > sodium > minerals > vitamins
- Default view shows per-person values (scaled to the member's suggested portion); toggle to switch to per-serving
- Also add the same expandable micronutrient section to the recipe detail/builder page from Phase 2

**OFF removal and CNF integration:**
- Complete removal of Open Food Facts: delete search-off edge function, remove OFF tab from FoodSearch, delete all OFF-sourced food data from database (cascade delete from recipe ingredients)
- Replace with Canadian Nutrient File (CNF) as second data source
- Unified search: single search bar queries both USDA and CNF simultaneously, merged results with source labels (no separate tabs)
- CNF priority for deduplication — when both sources have the same food, prefer CNF data
- USDA fills gaps for foods CNF doesn't cover
- Keep verify-nutrition edge function — update to cross-check USDA vs CNF instead of USDA vs OFF

**PWA audit:**
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

### Deferred Ideas (OUT OF SCOPE)
None — CNF was incorporated into Phase 5 scope as a direct replacement for OFF.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRCK-05 | System suggests portion sizes per person per dish based on their individual targets | Calorie-based proportional split algorithm; reads from `useNutritionTargets` + `useFoodLogs`; integrated into `DayCard` / `SlotCard` with pre-fill for `LogMealModal` |
</phase_requirements>

---

## Summary

Phase 5 delivers the core value proposition of NourishPlan: personalized portion suggestions per family member. It also replaces Open Food Facts with the Canadian Nutrient File, surfaces full micronutrient breakdowns on the plan UI, and polishes the PWA to pass Lighthouse audit.

The most architecturally significant finding is the CNF API's search limitation. The CNF REST API does not support free-text food search by name — the `/food/` endpoint returns the full list of 5,690 foods or a single item by numeric food_code. The edge function must therefore fetch the full food list, filter server-side by keyword against `food_description`, and then fetch nutrient amounts for the top N matches. This is the primary design decision for the CNF integration.

The portion suggestion algorithm is pure client-side arithmetic on data already available in the app: `useNutritionTargets` (household-wide targets) and `useFoodLogs` (already-logged calories per member per day). No new database tables or queries are needed beyond what Phase 4 delivered. The macro warning flag adds one computed boolean per member per slot.

**Primary recommendation:** Implement the CNF edge function with server-side text filter over the full food list (fetched from `food/` endpoint, filtered by keyword, nutrient amounts fetched per match in parallel). Keep all other features client-side using existing hooks.

---

## Standard Stack

### Core (unchanged from existing codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI rendering | Project standard |
| TanStack Query | v5 | Data fetching / cache | Project standard |
| Supabase Edge Functions | Deno | CNF + verify-nutrition proxy | Project standard for edge logic |
| Tailwind CSS 4 | 4.x | Styling with @theme tokens | Project standard |
| vite-plugin-pwa | installed | PWA manifest + service worker | Project standard |
| Vitest | ^4.1.0 | Test runner | Project standard (`npm test`) |

### CNF API (new integration)
| Endpoint | URL | Notes |
|----------|-----|-------|
| All foods list | `https://food-nutrition.canada.ca/api/canadian-nutrient-file/food/?lang=en&type=json` | Returns all 5,690 foods as `[{food_code, food_description}]` |
| Single food nutrients | `https://food-nutrition.canada.ca/api/canadian-nutrient-file/nutrientamount/?id={food_code}&lang=en&type=json` | Returns `[{food_code, nutrient_name_id, nutrient_value, ...}]` |
| Nutrient names | `https://food-nutrition.canada.ca/api/canadian-nutrient-file/nutrientname/?lang=en&type=json` | Returns all nutrient definitions |

**No authentication required. No documented rate limits. No CORS policy documented — edge function proxy is the correct pattern (avoids CORS issues).**

### CNF Nutrient ID Mapping
| Nutrient | CNF nutrient_name_id | USDA nutrient number | Match? |
|----------|---------------------|---------------------|--------|
| Energy (kcal) | 208 | 208 | Identical |
| Protein | 203 | 203 | Identical |
| Total Fat | 204 | 204 | Identical |
| Carbohydrate | 205 | 205 | Identical |
| Fiber | 291 | 291 | Identical |
| Sodium | 307 | 307 | Identical |
| Calcium | 301 | 301 | Identical |
| Iron | 303 | 303 | Identical |
| Potassium | 306 | 306 | Identical |
| Vitamin C | 401 | 401 | Identical |
| Vitamin A (retinol) | 319 | 318 (RAE) | **DIFFERENT** |

**Confidence: HIGH** — Verified by direct API call to CNF nutrientname endpoint. Nutrient IDs 208, 203, 204, 205, 291, 307, 301, 303, 306, 401 are identical between CNF and USDA. Vitamin A uses ID 319 in CNF vs 318 in USDA — this needs handling in the normalization layer. The existing `USDA_NUTRIENT_IDS` constant in `src/utils/nutrition.ts` maps `vitamin_a: 318`; CNF normalization uses 319.

### Installation
No new npm packages required. All functionality uses existing dependencies.

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
supabase/functions/
├── search-usda/          # existing — unchanged
├── search-cnf/           # NEW: replaces search-off
├── verify-nutrition/     # existing — update to use cnfValues instead of offValues
└── search-off/           # DELETE entirely

src/
├── hooks/
│   ├── useFoodSearch.ts  # update: 'usda' | 'cnf' tabs → unified parallel search
│   └── usePortionSuggestions.ts  # NEW: computes per-member portion suggestions
├── components/
│   ├── plan/
│   │   ├── DayCard.tsx   # update: add portion suggestion column to SlotCard
│   │   ├── SlotCard.tsx  # update: show suggestions, trigger expandable
│   │   └── PortionSuggestionRow.tsx  # NEW: per-member percentage + servings display
│   ├── log/
│   │   └── LogMealModal.tsx  # update: accept suggestedServings prop, pre-fill stepper
│   ├── food/
│   │   └── FoodSearch.tsx   # update: remove OFF tab, unified USDA+CNF search
│   └── recipe/
│       └── RecipeBuilder.tsx  # update: add expandable micronutrient section
└── utils/
    └── nutrition.ts      # update: add calcPortionSuggestion, CNF_NUTRIENT_IDS, micronutrient display helpers
```

### Pattern 1: CNF Edge Function — Fetch-All-Then-Filter
**What:** CNF has no text search. The edge function fetches all 5,690 food names (~200KB JSON), filters by keyword in Deno, then fetches nutrient amounts for top 25 matches in parallel.

**When to use:** Every CNF search request.

**Architecture:**
```typescript
// supabase/functions/search-cnf/index.ts
// Step 1: Fetch all food names (cache in module scope between invocations)
const allFoods = await fetchAllCnfFoods(); // [{food_code, food_description}]

// Step 2: Filter by keyword — case-insensitive, all terms must appear
const keywords = query.toLowerCase().split(/\s+/);
const matches = allFoods.filter(f => {
  const desc = f.food_description.toLowerCase();
  return keywords.every(kw => desc.includes(kw));
}).slice(0, 25);

// Step 3: Fetch nutrient amounts for matches in parallel
const results = await Promise.all(
  matches.map(food => fetchCnfNutrients(food.food_code))
);
```

**Performance note:** The full food list (~200KB) should be cached at module level in the Deno edge function between requests. Deno edge function instances are reused within a session, making this feasible. Response time: ~200-500ms on cold start, ~50-100ms warm.

**Confidence: MEDIUM** — The fetch-all-then-filter approach is the only viable architecture given the CNF API has no text search endpoint (confirmed: `?id=apple` returns HTTP 400). Module-level caching is standard Deno edge function practice but has not been tested against Supabase's specific invocation model.

### Pattern 2: Portion Suggestion Algorithm
**What:** Pure client-side calculation. For each member, compute their remaining calories and express the dish as a fraction of total household remaining calories.

**When to use:** In `usePortionSuggestions` hook, called from PlanGrid/DayCard.

```typescript
// src/hooks/usePortionSuggestions.ts
// Source: algorithm from 05-CONTEXT.md decisions

export interface MemberSuggestion {
  memberId: string
  memberName: string
  memberType: 'user' | 'profile'
  percentage: number       // 0–100, share of the dish
  servings: number         // percentage applied to total meal servings
  hasMacroWarning: boolean // any macro would go >20% over/under daily target
}

function calcRemainingCalories(
  target: NutritionTarget | null,
  logsToday: FoodLog[],
): number {
  if (!target?.calories) return 0
  const logged = logsToday.reduce((sum, l) => sum + l.calories_per_serving * l.servings_logged, 0)
  return Math.max(0, target.calories - logged)
}

function calcSuggestion(
  memberRemaining: number,
  totalHouseholdRemaining: number,
): number {
  if (totalHouseholdRemaining <= 0) return 0
  return memberRemaining / totalHouseholdRemaining  // fraction 0–1
}
```

**Members without targets:** Default to 1.0 serving (no percentage shown). This avoids division-by-zero and matches the locked decision.

**Leftover percentage:** `100 - sum(member percentages)`. Show as "leftover" if > 1%.

### Pattern 3: Unified USDA + CNF Search
**What:** `useFoodSearch` hook fires both `search-usda` and `search-cnf` edge functions in parallel. Results are merged and deduplicated with CNF priority.

**Deduplication:** Exact name match (case-insensitive) — CNF result wins over USDA result for the same food description.

```typescript
// src/hooks/useFoodSearch.ts
export function useFoodSearch(query: string) {
  const usdaQuery = useQuery({ queryKey: ['food-search', 'usda', query], ... })
  const cnfQuery  = useQuery({ queryKey: ['food-search', 'cnf',  query], ... })

  const merged = useMemo(() => {
    const results: NormalizedFoodResult[] = []
    const seen = new Map<string, 'usda' | 'cnf'>()
    // CNF first (priority)
    for (const f of cnfQuery.data ?? []) {
      seen.set(f.name.toLowerCase(), 'cnf')
      results.push(f)
    }
    // USDA: skip if CNF already has it
    for (const f of usdaQuery.data ?? []) {
      if (!seen.has(f.name.toLowerCase())) results.push(f)
    }
    return results
  }, [usdaQuery.data, cnfQuery.data])

  return { data: merged, isLoading: usdaQuery.isLoading || cnfQuery.isLoading, ... }
}
```

**Query key change:** Old signature `useFoodSearch(tab: 'usda' | 'off', query)` becomes `useFoodSearch(query)`. `FoodSearch.tsx` must be updated accordingly.

### Pattern 4: Micronutrient Display on Recipe
**What:** Reuse the `NutrientBreakdown.tsx` collapsible pattern. New `RecipeMicronutrients` component receives a `micronutrients` map and a `servings` multiplier.

**Per-person vs per-serving toggle:** Local `useState` in the component. Per-person = scale by member's suggested servings; per-serving = use raw recipe values.

**Display order (locked):** fiber > sodium > calcium > iron > potassium > vitamin_c > vitamin_a. Skip any key with null/zero value.

### Pattern 5: PWA Offline Fallback
**What:** Add `navigateFallback` to vite-plugin-pwa workbox config. This is the single most common reason PWA audits fail for SPAs.

**Current gap:** `vite.config.ts` has no `navigateFallback`. Lighthouse "responds with 200 when offline" check requires it.

```typescript
// vite.config.ts additions
VitePWA({
  registerType: 'autoUpdate',
  manifest: { /* existing */ },
  workbox: {
    navigateFallback: '/index.html',         // ADD: offline SPA fallback
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],  // ADD: precache assets
    runtimeCaching: [
      // existing navigateFallback entry can be removed once globPatterns covers it
    ],
  },
})
```

**Lighthouse installability checklist (verified against official docs):**
- Web app manifest with `name`, `short_name`, `start_url`, `display: standalone`, `icons` (192px + 512px) — all present
- Service worker registered — present via vite-plugin-pwa
- Page responds with 200 when offline — **MISSING: requires `navigateFallback`**
- Icons maskable or purpose not set — worth adding `purpose: 'any maskable'` to icons

### Anti-Patterns to Avoid
- **Fetching all 5,690 CNF foods on every search without caching:** Will cause 200–500ms latency per request. Cache the list at module scope in the Deno function.
- **Calling CNF nutrientamount serially:** Fetch the top 25 results in parallel with `Promise.all`, not sequentially.
- **Running Lighthouse audit on dev build:** Must run on production build (`npm run build && npm run preview`). Dev builds always fail PWA audits.
- **Modifying the portion stepper default before suggestion is ready:** The `suggestedServings` prop to `LogMealModal` must be optional — fall back to 1.0 if suggestions haven't loaded yet.
- **Including `purpose: 'any maskable'` without verifying icons have safe zone:** The current icons are solid sage green squares — they are safe for maskable use.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker offline caching | Custom SW cache logic | `vite-plugin-pwa` workbox `navigateFallback` + `globPatterns` | Workbox handles cache versioning, cleanup, and update flows correctly |
| CNF text search indexing | In-memory trie/inverted index | Simple `Array.filter` + `String.includes` on 5,690 items | 5,690 items filter in < 5ms; no index needed |
| Deduplication across USDA + CNF | Fuzzy matching library | Exact lowercase name match | Food names are standardized; fuzzy matching adds false positives |
| Macro arithmetic | Custom formula | Extend `calcLogEntryNutrition` in `src/utils/nutrition.ts` | Pattern already established for per-serving scaling |

---

## Common Pitfalls

### Pitfall 1: CNF API Has No Text Search
**What goes wrong:** Calling `food/?id=apple` or similar text parameters returns HTTP 400. There is no query string for keyword search.
**Why it happens:** The CNF API was designed as a data retrieval API, not a search API. Search is only available through the official web interface.
**How to avoid:** Edge function fetches all foods (`/food/` with no `id`), filters in Deno, fetches nutrient amounts for top N results.
**Warning signs:** HTTP 400 responses when passing non-numeric `id` values.

### Pitfall 2: Division by Zero in Portion Suggestions
**What goes wrong:** If all household members have zero remaining calories (everyone has hit their target), `totalHouseholdRemaining = 0` causes division by zero.
**Why it happens:** Perfectly logged day, or members with no targets set.
**How to avoid:** Guard with `if (totalHouseholdRemaining <= 0) return defaultSuggestion`. Default suggestion = 1.0 serving.
**Warning signs:** NaN/Infinity in percentage display.

### Pitfall 3: Stale Food Logs Cause Wrong Suggestions
**What goes wrong:** Suggestions don't update after a member logs food because the TanStack Query cache isn't invalidated correctly.
**Why it happens:** `useFoodLogs` is keyed by `[householdId, date, memberId]`. If a suggestion hook fetches logs for all members, each member needs their own query.
**How to avoid:** `usePortionSuggestions` must call `useFoodLogs` for each household member separately, or fetch logs for all household members in a single broad query keyed at the household+date level.
**Warning signs:** Suggestions don't change after logging a meal.

### Pitfall 4: OFF Data Cascade Delete
**What goes wrong:** Deleting OFF-sourced food data from `custom_foods` or recipe_ingredients without checking what it's linked to can orphan meal_items or break recipes silently.
**Why it happens:** OFF foods may have been added to recipes or meal items by users.
**How to avoid:** Migration should cascade: remove all `food_logs`, `meal_items`, and `recipe_ingredients` that reference OFF food IDs (identifiable by source='off' if stored, or by the numeric barcode-format `ingredient_id`). Since this is a development app with demo data only (demo@nourishplan.test), a destructive migration is acceptable.
**Warning signs:** Foreign key violations or silent broken recipe references.

### Pitfall 5: NormalizedFoodResult `source` Type Mismatch
**What goes wrong:** `NormalizedFoodResult.source` is typed as `'usda' | 'off' | 'custom'`. Adding CNF requires updating this union type and any code that switches on it.
**Why it happens:** TypeScript union type in `src/types/database.ts` line 193.
**How to avoid:** Update type to `'usda' | 'cnf' | 'custom'` early. Search all switch/if-else on `.source` before completing integration.
**Warning signs:** TypeScript errors on source comparison, or CNF results displayed without source label.

### Pitfall 6: Lighthouse PWA Audit Requires Production Build
**What goes wrong:** Running Lighthouse on `localhost:5173` (dev server) always fails because service workers don't register on HTTP and vite-plugin-pwa is disabled in dev.
**Why it happens:** PWA features intentionally disabled in development.
**How to avoid:** Always test PWA with `npm run build && npm run preview`, then run Lighthouse against `localhost:4173`.
**Warning signs:** "Service worker not found" in Lighthouse on dev server.

---

## Code Examples

### CNF Edge Function — Core Search Loop
```typescript
// supabase/functions/search-cnf/index.ts
// Fetch all foods once; cache at module scope
let cnfFoodsCache: Array<{ food_code: number; food_description: string }> | null = null;

async function getAllCnfFoods() {
  if (cnfFoodsCache) return cnfFoodsCache;
  const res = await fetch(
    "https://food-nutrition.canada.ca/api/canadian-nutrient-file/food/?lang=en&type=json"
  );
  cnfFoodsCache = await res.json();
  return cnfFoodsCache!;
}

async function getCnfNutrients(foodCode: number): Promise<NormalizedFood | null> {
  const res = await fetch(
    `https://food-nutrition.canada.ca/api/canadian-nutrient-file/nutrientamount/?id=${foodCode}&lang=en&type=json`
  );
  const nutrients: Array<{ nutrient_name_id: number; nutrient_value: number }> = await res.json();
  const get = (id: number) => nutrients.find(n => n.nutrient_name_id === id)?.nutrient_value ?? 0;
  return {
    id: `cnf-${foodCode}`,
    name: /* from allFoods lookup */ "",
    source: "cnf",
    calories: get(208),
    protein: get(203),
    fat: get(204),
    carbs: get(205),
    fiber: get(291) || undefined,
    sodium: get(307) || undefined,
    // NOTE: CNF vitamin A uses 319, not 318 (USDA)
    micronutrients: {
      calcium: get(301), iron: get(303), potassium: get(306),
      vitamin_c: get(401), vitamin_a: get(319),
    },
  };
}
```

### Portion Suggestion Hook
```typescript
// src/hooks/usePortionSuggestions.ts
export function usePortionSuggestions(
  householdId: string | undefined,
  logDate: string,
  slotCalories: number,  // total calories of the dish for the slot
  members: Array<{ id: string; type: 'user' | 'profile'; name: string }>,
) {
  // Fetch targets and today's logs for all members
  const { data: allTargets } = useNutritionTargets(householdId)

  // One log query per member (follows existing useFoodLogs pattern)
  // In practice: fetch at household+date level to avoid N queries
  // Returns MemberSuggestion[] — see type definition above
}
```

### LogMealModal Pre-fill
```typescript
// LogMealModal.tsx change: add suggestedServings prop
interface LogMealModalProps {
  // ... existing props
  suggestedServings?: number  // optional — defaults to 1.0
}

// Change initial useState:
const [servings, setServings] = useState(suggestedServings ?? 1.0)
// Note: useEffect to sync if suggestedServings arrives after mount
```

### Micronutrient Display Order
```typescript
// src/utils/nutrition.ts addition
export const MICRONUTRIENT_DISPLAY_ORDER = [
  'fiber', 'sodium', 'calcium', 'iron', 'potassium', 'vitamin_c', 'vitamin_a',
] as const

export const MICRONUTRIENT_LABELS: Record<string, string> = {
  fiber: 'Fiber',
  sodium: 'Sodium',
  calcium: 'Calcium',
  iron: 'Iron',
  potassium: 'Potassium',
  vitamin_c: 'Vitamin C',
  vitamin_a: 'Vitamin A',
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Open Food Facts (OFF) | Canadian Nutrient File (CNF) | Phase 5 | Better Canadian food coverage; controlled government source vs crowdsourced |
| Separate USDA / OFF tabs | Unified parallel search with source labels | Phase 5 | Single search UX, no tab switching |
| LogMealModal defaults to 1.0 servings | Pre-fills with suggested portion | Phase 5 | Removes manual calculation step for users |

**Deprecated/outdated in Phase 5:**
- `supabase/functions/search-off/`: Delete entirely
- `NormalizedFoodResult.source = 'off'`: Replace with `'cnf'` everywhere
- `useFoodSearch(tab: 'usda' | 'off', query)`: Refactor to `useFoodSearch(query)` with unified results
- `verify-nutrition` `offValues` parameter: Rename to `cnfValues`

---

## Open Questions

1. **CNF module-level cache in Supabase Edge Functions**
   - What we know: Deno edge function instances are reused within a session, so module-level variables persist between requests on the same instance.
   - What's unclear: How long Supabase keeps an edge function instance alive and whether the 5,690-item cache will persist long enough to matter.
   - Recommendation: Implement module-level cache anyway. Cache miss (refetch all foods) is acceptable — worst case adds ~200ms. Cache hit saves the same.

2. **Existing OFF-sourced food data in production database**
   - What we know: The demo account (demo@nourishplan.test) may have used OFF foods in recipes or meal items.
   - What's unclear: Exact volume and what tables reference them.
   - Recommendation: Write migration to identify and remove OFF-sourced records. Since this is a development/demo app, destructive migration is safe. Check `food_logs`, `meal_items`, `recipe_ingredients` for items with numeric barcode-format `item_id` / `ingredient_id`.

3. **Exact Lighthouse PWA score before Phase 5 changes**
   - What we know: vite-plugin-pwa is configured, manifest has all required fields, icons exist.
   - What's unclear: Whether the offline fallback test passes. `navigateFallback` is absent from current `vite.config.ts`.
   - Recommendation: Add `navigateFallback: '/index.html'` and `globPatterns` to workbox config. Run `npm run build && npm run preview`, audit with Lighthouse. The offline test is the most likely failure point.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | `vitest.config.ts` (or via `vite.config.ts`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRCK-05 | `calcPortionSuggestion` returns correct percentage and servings | unit | `npm test -- --reporter=verbose tests/nutrition.test.ts` | ✅ extend existing |
| TRCK-05 | Division by zero guard (all members at target) | unit | `npm test -- --reporter=verbose tests/nutrition.test.ts` | ✅ extend existing |
| TRCK-05 | Members without targets default to 1.0 serving | unit | `npm test -- --reporter=verbose tests/nutrition.test.ts` | ✅ extend existing |
| TRCK-05 | Macro warning flag fires at >20% over/under | unit | `npm test -- --reporter=verbose tests/nutrition.test.ts` | ✅ extend existing |
| FOOD-02 (replace) | CNF search returns normalized results with `source: 'cnf'` | unit | `npm test -- --reporter=verbose tests/food-search.test.ts` | ✅ exists (update todos) |
| FOOD-02 (replace) | Unified search merges USDA + CNF, CNF wins on dupe | unit | `npm test -- --reporter=verbose tests/food-search.test.ts` | ✅ exists (update todos) |
| PLAT-03/04 | PWA audit passes (installable, offline) | manual | Run Lighthouse on `npm run preview` at port 4173 | manual only |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + manual Lighthouse audit before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/nutrition.test.ts` — add `calcPortionSuggestion` tests (file exists; add new describe block)
- [ ] `tests/food-search.test.ts` — update OFF todos to CNF + unified search tests (file exists; replace todo bodies)

*(No new test files needed — existing infrastructure covers all phase requirements)*

---

## Sources

### Primary (HIGH confidence)
- CNF API direct responses — `food/`, `nutrientamount/`, `nutrientname/` endpoints tested via WebFetch
- Existing codebase: `src/utils/nutrition.ts`, `src/hooks/useFoodLogs.ts`, `src/hooks/useNutritionTargets.ts`, `src/components/plan/DayCard.tsx`, `src/components/log/LogMealModal.tsx`, `vite.config.ts`

### Secondary (MEDIUM confidence)
- [CNF API Documentation](https://produits-sante.canada.ca/api/documentation/cnf-documentation-en.html) — confirmed no text search endpoint
- [Chrome Lighthouse PWA docs](https://developer.chrome.com/docs/lighthouse/pwa/works-offline) — offline requirements
- [web.dev PWA checklist](https://web.dev/articles/pwa-checklist) — installability criteria

### Tertiary (LOW confidence)
- Supabase Edge Function module-level caching behavior — inferred from Deno runtime docs, not Supabase-specific documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing project stack unchanged; CNF endpoint confirmed by live API calls
- CNF nutrient IDs: HIGH — verified by direct API call to `/nutrientname/` endpoint
- CNF search architecture (fetch-all-filter): MEDIUM — confirmed no text search exists; module-level cache pattern is standard but Supabase-specific behavior not tested
- Portion suggestion algorithm: HIGH — pure arithmetic on existing data structures; no unknowns
- PWA gaps: HIGH — `navigateFallback` absence confirmed in `vite.config.ts`; missing `globPatterns` confirmed
- Architecture: HIGH — all integration points identified from live codebase read

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (CNF API is a stable government endpoint; unlikely to change)
