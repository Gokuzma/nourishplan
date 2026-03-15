# Phase 12: Home Page & Food Search Redesign - Research

**Researched:** 2026-03-15
**Domain:** React UI component redesign — search overlay, inline portion picker, fuzzy scoring, micronutrient drill-down, navigation cleanup
**Confidence:** HIGH (all findings based on direct codebase inspection)

## Summary

Phase 12 is a pure frontend refactor with no schema or API changes. The work splits cleanly into four areas: (1) a new full-screen search overlay component that replaces FreeformLogModal and unifies with RecipeBuilder's ingredient picker, (2) client-side fuzzy relevance scoring added to useFoodSearch's useMemo merge step, (3) expandable micronutrient drill-down rows in DailyLogList/LogEntryItem, and (4) navigation cleanup removing the Foods tab and FoodsPage.

All reusable building blocks exist: PortionStepper, FoodDetailPanel, CustomFoodForm, NutrientBreakdown, MICRONUTRIENT_DISPLAY_ORDER/MICRONUTRIENT_LABELS. The new overlay is a mode-aware component (`'log' | 'select'`) that replaces both FreeformLogModal (log mode) and the FoodSearch component embedded in RecipeBuilder (select mode). FoodSearch.tsx itself can be deleted after unification — its logic migrates into the overlay.

The scoring change in useFoodSearch is a useMemo transformation on the already-merged array: score each item, sort by score descending then name length ascending within tied scores, and interleave CNF/USDA rather than keeping CNF-first grouping.

**Primary recommendation:** Build the overlay as `src/components/food/FoodSearchOverlay.tsx`, wire it into HomePage and RecipeBuilder, then apply scoring and drill-down as targeted patches to useFoodSearch.ts and LogEntryItem.tsx.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Food logging entry point**
- Replace the current "+" button area with an inline search bar on the home page, positioned where the action buttons currently are (not at the top of the page)
- Tapping the search bar opens a full-screen overlay with search input at top and results below
- Back button/arrow in overlay returns to home page
- Overlay includes both "Search" and "My Foods" tabs (same tabs as current FoodSearch component)
- Tapping a search result expands it inline with a portion stepper + unit selector + "Log" button — no separate modal
- After logging, the search overlay stays open so users can log multiple foods in one session
- The overlay supports two modes: "log" (portion picker → save to food_logs) and "select" (pick food → return result to caller, e.g. RecipeBuilder)

**Search result sorting**
- Fuzzy relevance scoring applied client-side after results return from USDA/CNF
- Scoring tiers: exact match (1.0) > starts-with (0.9) > word boundary match (0.7) > contains (0.5) > substring (0.3)
- Within the same score tier, shorter names appear first
- CNF and USDA results are interleaved by relevance score — no longer CNF-first grouping
- Deduplication still removes same-name duplicates (existing behavior)
- No typo tolerance — user must spell correctly

**Meal micronutrient drill-down**
- All logged items (both meals and individual foods) can expand inline in DailyLogList
- Tapping a logged entry expands it to show per-food micronutrient breakdown
- Expanded view shows micronutrients only (fiber, iron, calcium, vitamins, etc.) — macros already visible in the log entry row
- Collapse by tapping again
- No navigation away from home page

**Food tab removal**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UXLOG-01 | Food logging initiated directly from home page (no Foods tab navigation) | Search bar replaces "+" button area; FreeformLogModal replaced by FoodSearchOverlay in log mode |
| UXLOG-02 | Search results sorted by fuzzy relevance score with interleaved CNF/USDA | useFoodSearch useMemo merge step gains scoreFood() + sort; existing dedup preserved |
| UXLOG-03 | Logged entry rows expand inline to show per-food micronutrient breakdown | LogEntryItem gains local expanded state; reads log.micronutrients JSONB field already stored |
| UXLOG-04 | RecipeBuilder ingredient search uses same overlay as home page logging | RecipeBuilder switches from embedded FoodSearch to FoodSearchOverlay in select mode |
</phase_requirements>

---

## Standard Stack

### Core (no additions required)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React | 19 | UI components | Existing |
| TanStack Query | v5 | useFoodSearch hook | Existing — no changes to query keys |
| react-router-dom | v7 | Route removal (/foods) | Existing |
| Tailwind CSS 4 | 4.x | CSS-first tokens | Existing — `fixed inset-0 z-50` pattern for overlay |

No new packages needed. All patterns are already in the codebase.

**Installation:** none required

---

## Architecture Patterns

### Recommended File Changes
```
src/
├── components/food/
│   ├── FoodSearchOverlay.tsx    ← NEW: full-screen overlay (log | select mode)
│   └── FoodSearch.tsx           ← DELETE after RecipeBuilder migration
├── components/log/
│   └── LogEntryItem.tsx         ← PATCH: add expandable micronutrient section
├── hooks/
│   └── useFoodSearch.ts         ← PATCH: add scoreFood() + sort in useMemo
├── pages/
│   ├── HomePage.tsx             ← PATCH: replace "+" button + FreeformLogModal with overlay
│   └── FoodsPage.tsx            ← DELETE
├── components/layout/
│   └── TabBar.tsx               ← PATCH: remove Foods tab entry
└── App.tsx                      ← PATCH: remove /foods route
```

### Pattern 1: FoodSearchOverlay Mode Contract

**What:** Single component with two modes — 'log' saves to food_logs, 'select' calls onSelect callback.

**Interface:**
```typescript
// src/components/food/FoodSearchOverlay.tsx
interface FoodSearchOverlayProps {
  mode: 'log' | 'select'
  // log mode props
  logDate?: string
  memberId?: string
  memberType?: 'user' | 'profile'
  onClose: () => void
  // select mode props
  onSelect?: (food: NormalizedFoodResult) => void
}
```

**Overlay structure:**
```
fixed inset-0 z-50 bg-surface flex flex-col
├── header: back arrow + "Add Food" title
├── search input (autofocus)
├── Search / My Foods tabs
└── scrollable results list
    └── each result row: name + macros
        └── [expanded] PortionStepper + unit selector + Log/Add button
```

**Key behaviors:**
- In 'log' mode: expanded row calls `useInsertFoodLog` then collapses expansion but keeps overlay open
- In 'select' mode: tapping a row calls `onSelect(food)` and closes overlay
- My Foods tab: CustomFoodForm for add/edit, same delete confirmation as existing FoodSearch
- FoodDetailPanel remains available via "Details" button (uses existing modal z-50 pattern)

### Pattern 2: Fuzzy Scoring in useFoodSearch

**What:** Replace the current CNF-first merge with a scored sort.

**Where:** Inside the existing `useMemo` in `useFoodSearch.ts`, after deduplication.

```typescript
// Scoring function — add above useMemo or extract to utils/foodSearch.ts
function scoreFood(name: string, query: string): number {
  const n = name.toLowerCase()
  const q = query.toLowerCase().trim()
  if (n === q) return 1.0
  if (n.startsWith(q)) return 0.9
  // word boundary: any word in name starts with query
  if (n.split(/\s+/).some(word => word.startsWith(q))) return 0.7
  if (n.includes(q)) return 0.5
  // substring anywhere (e.g. query is inside a longer word)
  return n.includes(q) ? 0.5 : 0.3
}

// Inside useMemo, after merged array is built:
const scored = merged.map(food => ({ food, score: scoreFood(food.name, query) }))
scored.sort((a, b) => {
  if (b.score !== a.score) return b.score - a.score
  return a.food.name.length - b.food.name.length
})
return scored.map(s => s.food)
```

**Note:** The deduplication (seenNames set) remains unchanged — it runs before scoring. CNF-first insertion order is preserved for dedup purposes but final output order is determined by score.

**useFoodSearch needs the `query` param exposed to useMemo.** Currently `query` is already in scope as the hook parameter — no signature change needed.

### Pattern 3: LogEntryItem Inline Drill-Down

**What:** Local `expanded` boolean state; tapping the row toggles it. Delete button still works independently.

**Current:** Row taps → `onEdit(log)` (opens EditLogModal)
**New:** Row taps → toggle `expanded`. Edit still accessible via "Edit" button added to the row.

```typescript
// LogEntryItem.tsx — add local state
const [expanded, setExpanded] = useState(false)

// Micronutrients available from log.micronutrients (JSONB, already fetched)
// Use MICRONUTRIENT_DISPLAY_ORDER + MICRONUTRIENT_LABELS from utils/nutrition
```

**Expanded section structure:**
```
if expanded:
  <div border-t border-secondary/30 pt-2 mt-2>
    <p class="text-xs font-semibold text-text/50 uppercase">Micronutrients</p>
    {MICRONUTRIENT_DISPLAY_ORDER.map(key => {
      const val = (log.micronutrients?.[key] ?? 0) * log.servings_logged
      if (val === 0) return null
      return <div key={key}>{MICRONUTRIENT_LABELS[key]}: {val.toFixed(1)}</div>
    })}
    {no data → "No micronutrient data for this entry"}
  </div>
```

**Impact on DailyLogList:** `onEditLog` prop and its usage in `LogEntryItem` — the edit action moves to a button within LogEntryItem rather than being triggered by a row tap. `DailyLogList` still passes `onEditLog` down; LogEntryItem calls it from an explicit Edit button.

### Pattern 4: TabBar Foods Removal

**Current tabs array (TabBar.tsx:5-10):**
```typescript
const tabs = [
  { label: 'Home', to: '/', icon: '🏠' },
  { label: 'Foods', to: '/foods', icon: '🥦' },  // ← DELETE this line
  { label: 'Recipes', to: '/recipes', icon: '📖' },
  { label: 'Plan', to: '/plan', icon: '📋' },
]
```

**App.tsx:** Remove the `<Route path="/foods" element={<FoodsPage />} />` line and its import.

### Anti-Patterns to Avoid
- **Do not keep FoodSearch.tsx alive as a wrapper.** After RecipeBuilder is migrated to FoodSearchOverlay, delete FoodSearch.tsx entirely to avoid dead code.
- **Do not re-trigger AI verification on every render.** The verification useEffect in the current SearchTab fires on `data` change — preserve this pattern in the overlay's search tab.
- **Do not change useFoodSearch query keys.** TanStack Query caching depends on `['food-search', 'usda', query]` / `['food-search', 'cnf', query]` — the scoring is a pure useMemo transform on the cached data.
- **Do not add expanded state to DailyLogList.** Keep expansion state local to LogEntryItem — no lifting needed.
- **Do not use a bottom sheet for the overlay.** Decision is full-screen (`fixed inset-0`), same as existing modals.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Portion input | Custom stepper | `PortionStepper` (src/components/log/PortionStepper.tsx) | Already handles unit selection, grams fallback |
| Food detail view | Custom nutrition table | `FoodDetailPanel` (src/components/food/FoodDetailPanel.tsx) | Verified, handles multiple sources |
| Custom food add/edit | New form | `CustomFoodForm` (src/components/food/CustomFoodForm.tsx) | Handles all fields, validation, save |
| Micronutrient labels | Hardcoded strings | `MICRONUTRIENT_DISPLAY_ORDER`, `MICRONUTRIENT_LABELS` from utils/nutrition | Consistent ordering and labels |
| Food log insert | Direct supabase call | `useInsertFoodLog` hook | Handles cache invalidation |
| Duplicate food removal | Custom dedup | Existing seenNames Set in useFoodSearch | Already handles CNF/USDA overlap correctly |

---

## Common Pitfalls

### Pitfall 1: Overlay z-index conflicts
**What goes wrong:** Fixed overlay at z-50 conflicts with FoodDetailPanel or CustomFoodForm modals (also z-50).
**How to avoid:** Use z-50 for the overlay itself; FoodDetailPanel/CustomFoodForm rendered inside the overlay use relative positioning within the overlay's stacking context, not their own fixed positioning. Or bump inner modals to z-60.

### Pitfall 2: Expanded row in search collapses on re-render
**What goes wrong:** If expanded food state is keyed to a result row index rather than food.id, list re-renders (from TanStack Query partial updates) collapse the open row.
**How to avoid:** Track expanded food by `food.id` (string), not index.

### Pitfall 3: scoreFood fires for every keystroke with stale query
**What goes wrong:** The `query` captured in useMemo is the raw query passed to the hook, which may lag behind the debounced query used in the API call.
**How to avoid:** Pass `debouncedQuery` (not raw query) to `useFoodSearch` — this is already how FoodSearch.tsx calls the hook. The scoring will always score against the same query that produced the results.

### Pitfall 4: Micronutrient drill-down shows 0s for meal entries
**What goes wrong:** Meal-type food_logs store `micronutrients: {}` (empty object, see HomePage.tsx:250). Expanding a meal entry shows blank or zeros.
**How to avoid:** In the expanded section, show "No micronutrient data for this entry" when `Object.keys(log.micronutrients ?? {}).length === 0`. This is already flagged in the existing `hasIncompleteMicroData` logic.

### Pitfall 5: RecipeBuilder passes onSelect but overlay needs different close behavior
**What goes wrong:** In 'select' mode, onSelect fires and the overlay should close immediately. But in 'log' mode, it stays open. If close logic is mixed, RecipeBuilder leaves a phantom overlay.
**How to avoid:** In 'select' mode: call `onSelect(food)` then `onClose()` immediately. In 'log' mode: insert log, show brief success indicator, keep overlay open.

### Pitfall 6: /foods route returns blank page not 404
**What goes wrong:** Removing the Route in App.tsx but leaving the import, or Vercel SPA rewrite catching /foods and serving the app shell with no matching route.
**How to avoid:** Check that App.tsx has a catch-all `<Route path="*" element={<NotFoundPage />} />` — the existing 404 page (from Phase 6) handles this.

---

## Code Examples

### Inline expanded portion picker (log mode)
```typescript
// Pattern for result row inline expansion in FoodSearchOverlay
const [expandedId, setExpandedId] = useState<string | null>(null)

function handleRowTap(food: NormalizedFoodResult) {
  setExpandedId(prev => prev === food.id ? null : food.id)
}

// In render:
{expandedId === food.id && (
  <div className="mt-2 pt-2 border-t border-secondary/40 flex flex-col gap-2">
    <PortionStepper value={quantity} onChange={setQuantity} units={buildUnits(food)} />
    <button
      onClick={() => handleLog(food)}
      className="w-full rounded-[--radius-btn] bg-primary text-white py-2 text-sm font-semibold"
    >
      Log
    </button>
  </div>
)}
```

### Scoring + sort in useFoodSearch useMemo
```typescript
// Replace current merged return with scored sort
const scored = merged.map(food => ({
  food,
  score: scoreFood(food.name, query),
}))
scored.sort((a, b) =>
  b.score !== a.score
    ? b.score - a.score
    : a.food.name.length - b.food.name.length
)
return scored.map(s => s.food)
```

### LogEntryItem with expand toggle
```typescript
const [expanded, setExpanded] = useState(false)

// Row click → toggle expand (remove onEdit from row click)
<div onClick={() => setExpanded(v => !v)} ...>
  {/* existing content */}
  <button onClick={e => { e.stopPropagation(); onEdit(log) }}>Edit</button>

  {expanded && (
    <div className="col-span-full mt-2 pt-2 border-t border-secondary/30">
      {MICRONUTRIENT_DISPLAY_ORDER.map(key => {
        const val = (log.micronutrients?.[key] ?? 0) * log.servings_logged
        return val > 0 ? (
          <div key={key} className="flex justify-between text-xs text-text/60">
            <span>{MICRONUTRIENT_LABELS[key]}</span>
            <span>{val.toFixed(1)}</span>
          </div>
        ) : null
      })}
    </div>
  )}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| FreeformLogModal (2-step: search → confirm modal) | FoodSearchOverlay (inline expand in result row, overlay stays open) | Fewer taps to log multiple foods |
| CNF-first grouping (CNF block, then USDA block) | Interleaved by relevance score | Most relevant result appears first regardless of source |
| Food tab (separate /foods route) | No Foods tab; custom food management inside search overlay My Foods tab | Reduces navigation depth |
| onEdit opens EditLogModal | Row tap expands micronutrients; Edit button opens EditLogModal | Drill-down without leaving home page |

---

## Open Questions

1. **Edit log button placement in LogEntryItem**
   - What we know: Currently tapping the row opens EditLogModal. With drill-down on row tap, edit needs its own affordance.
   - Recommendation: Add a small "Edit" text button or pencil icon inside the row (right side, before delete). Keep `onEdit` prop unchanged — just move the call site from row click to button click.

2. **Overlay animation (Claude's Discretion)**
   - What we know: Existing modals slide up from bottom on mobile (`items-end`). Full-screen overlay could slide from right or fade in.
   - Recommendation: Simple fade-in (`opacity-0 → opacity-100` with CSS transition) — lowest implementation risk, avoids animation library dependency.

3. **RecipeBuilder's current FoodSearch embed**
   - What we know: RecipeBuilder uses `<FoodSearch onSelect={...} mode="select" />` inline (not as a modal). The new overlay is full-screen. This changes the UX slightly — ingredient search becomes a full-screen takeover.
   - Recommendation: This is an acceptable UX trade-off given the unification decision. Trigger the overlay with a "Search ingredients" button in RecipeBuilder.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (inferred from Vite 8 stack — check for vitest.config.ts) |
| Config file | See Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UXLOG-01 | Search bar renders on home page; FreeformLogModal removed | unit | `npx vitest run src/pages/HomePage` | ❌ Wave 0 |
| UXLOG-02 | scoreFood returns correct tier values; sort order correct | unit | `npx vitest run src/hooks/useFoodSearch` | ❌ Wave 0 |
| UXLOG-03 | LogEntryItem expands on click to show micronutrients | unit | `npx vitest run src/components/log/LogEntryItem` | ❌ Wave 0 |
| UXLOG-04 | FoodSearch.tsx deleted; RecipeBuilder uses overlay | manual | Verify no FoodsPage/FoodSearch imports remain | manual |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` (targeted test file)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/hooks/useFoodSearch.test.ts` — scoreFood unit tests (UXLOG-02)
- [ ] `tests/components/LogEntryItem.test.tsx` — expand/collapse behavior (UXLOG-03)
- [ ] `tests/pages/HomePage.test.tsx` — search bar presence, FreeformLogModal absence (UXLOG-01)
- [ ] Verify vitest is installed: check `package.json` for `"vitest"` dependency

---

## Sources

### Primary (HIGH confidence)
- Direct read of `src/pages/HomePage.tsx` — current action button area, state, modals
- Direct read of `src/components/food/FoodSearch.tsx` — tab structure, ResultRow, verification, CustomFoodForm integration
- Direct read of `src/hooks/useFoodSearch.ts` — useMemo merge, query keys, dedup logic
- Direct read of `src/components/log/DailyLogList.tsx` — props interface, render structure
- Direct read of `src/components/log/LogEntryItem.tsx` — current row structure, click handler
- Direct read of `src/components/layout/TabBar.tsx` — tabs array, Foods entry location
- Direct read of `src/components/log/FreeformLogModal.tsx` — step flow, PortionStepper usage
- Direct read of `.planning/config.json` — nyquist_validation: true confirmed

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions log — Phase 04/05/08/11 patterns for food_logs schema, serving_unit, micronutrients JSONB

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — based on direct code reading, all integration points confirmed
- Pitfalls: HIGH — derived from existing codebase patterns and known decisions
- Scoring algorithm: HIGH — formula specified verbatim in CONTEXT.md decisions

**Research date:** 2026-03-15
**Valid until:** 60 days (stable codebase, no external API changes)
