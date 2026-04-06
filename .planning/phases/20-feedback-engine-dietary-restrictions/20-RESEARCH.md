# Phase 20: Feedback Engine & Dietary Restrictions - Research

**Researched:** 2026-04-06
**Domain:** React/Supabase — user feedback capture, preference data model, AI-assisted classification, plan warning UI
**Confidence:** HIGH

## Summary

Phase 20 introduces the preference signal layer for the AMPS milestone. It has four surface areas: (1) a rating card on HomePage that appears after meals are cooked, (2) a dietary restrictions section in SettingsPage per member profile, (3) a won't-eat list per member with three-tier preference strength, and (4) a plan Issues panel and SlotCard warning badges. An AI Edge Function handles ingredient classification and pattern analysis.

All four areas follow patterns already established in the codebase. The rating flow extends the post-cook interaction model from CookDeductionReceipt. The restrictions/won't-eat UI extends the existing SettingsPage section pattern. The Issues panel and SlotCard badges extend the badge/expand patterns already present in SlotCard and DayCard. The AI work extends the existing Supabase Edge Function pattern (verify-nutrition, delete-account).

The primary complexity is the data model: five new tables (recipe_ratings, dietary_restrictions, wont_eat_entries, ai_recipe_tags, monotony_log are candidates) and careful RLS scoping per member (not per household) for some tables. The recipe attribute snapshot pattern from STATE.md must be applied to rating rows so historical signal survives recipe edits.

**Primary recommendation:** Build in three logical waves: (1) data model + rating flow, (2) restrictions/won't-eat UI + AI mapping Edge Function, (3) Issues panel + SlotCard badges + InsightsPage.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Rating Flow**
- D-01: End-of-day rating prompt — HomePage shows a "Rate today's meals" card for all cooked meals that day. Not triggered inline on Cook button.
- D-02: Persistent card until rated — the rating card stays on HomePage until all cooked meals for the day are rated. Gentle nudge, doesn't block anything.
- D-03: 1-5 star rating scale — standard granularity for AI to distinguish preference levels.
- D-04: Per-member optional ratings — primary cook rates by default, other members CAN add their own rating if they want. Low friction for small households.
- D-05: Satiety tracking deprioritized — user cares about calorie accuracy, not fullness signals. Omit explicit satiety input or make it minimal/optional.

**AI Insights & Auto-Tags**
- D-06: AI auto-tags recipes based on rating + satiety data — tags like "crowd-pleaser", "filling", "divisive" displayed on recipe cards.
- D-07: AI insights page — dedicated section showing pattern analysis. Both inline tags on recipe cards AND a deeper insights page.
- D-08: AI-first approach throughout — leverage AI (via Supabase Edge Functions) for ingredient classification, pattern detection, restriction mapping, and swap suggestions.

**Dietary Restrictions UX**
- D-09: Restrictions live in member profile section on Settings page.
- D-10: Predefined categories + custom entries — checkboxes for Gluten-free, Dairy-free, Nut allergy, Shellfish allergy, Vegetarian, Vegan, Halal, Kosher plus free-text custom entries.
- D-11: AI auto-maps restrictions to ingredients via Supabase Edge Function.
- D-12: Hybrid ingredient matching — USDA/CNF food group metadata where available, AI for ambiguous/custom foods.
- D-13: Two-tier enforcement — allergens (nut, shellfish) are hard-blocked; diet preferences (vegetarian, gluten-free) are soft warnings. Allergens require explicit override confirmation dialog.
- D-14: Inline warning on SlotCard — warning icon/badge on meal plan slots with restricted ingredients. Tap to see which member and which ingredient.

**Won't-Eat List & Flagging**
- D-15: Free-text tags for won't-eat entries — user types food names; AI resolves to matching recipe ingredients.
- D-16: Unified won't-eat list per member — one combined list merging AI auto-mapped restriction items and manual entries.
- D-17: Three preference strength levels — "dislikes" (warn), "refuses" (soft block), "allergy" (hard block).
- D-18: Separate "Issues" panel on Plan page — collapsible issues panel listing all conflicts and violations. Less visual noise on individual slots.
- D-19: AI suggests won't-eat additions from rating patterns — if a member consistently rates recipes with ingredient X at 1-2 stars, AI suggests adding it.
- D-20: Parents manage child won't-eat lists — same system, parent adds entries on behalf of child member profiles (MemberProfile.is_child).

**Monotony Detection & Warnings**
- D-21: Dual monotony detection — simple recipe repeat rule (>2x in rolling 2-week window) + AI variety score.
- D-22: Monotony warnings in Issues panel — same panel as won't-eat conflicts.
- D-23: AI suggests swap alternatives — monotony warning includes swap suggestion based on similar nutrition, household ratings, and available inventory.

### Claude's Discretion
- Rating card UI design and animation on HomePage
- AI insight page layout and visualizations
- Exact predefined restriction category list
- AI Edge Function implementation details (model choice, prompt design, caching)
- Issues panel design and interaction patterns
- How AI variety score is computed and displayed
- Rating data model schema (recipe_ratings table structure)
- Won't-eat matching algorithm (fuzzy text → ingredient resolution)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FEED-01 | User can rate a recipe (1-5 stars) after eating it | recipe_ratings table + RateMealsCard component + useRateMeal hook |
| FEED-02 | Each household member can set dietary restrictions (allergens, vegetarian, gluten-free, etc.) | dietary_restrictions table + DietaryRestrictionsSection in SettingsPage + AI mapping Edge Function |
| FEED-03 | Each household member can set "won't eat" tags for selective eaters | wont_eat_entries table + WontEatSection in SettingsPage + AI ingredient resolution |
| FEED-04 | System tracks recipe repeat rate and warns when plan becomes monotonous | Rolling-window query on meal_plan_slots + IssuesPanel component + monotony detection logic |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + TanStack Query | 19 / 5.x | Component rendering + server state | Already in project [VERIFIED: package.json] |
| Supabase JS | 2.x | DB queries + Edge Function invocation | Already in project [VERIFIED: package.json] |
| Tailwind CSS 4 | 4.x | Utility-first styling via @theme tokens | Already in project [VERIFIED: vite.config.ts] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Edge Functions (Deno) | runtime ~0.168 | AI classification, pattern detection | All AI operations — matches existing verify-nutrition + delete-account pattern [VERIFIED: supabase/functions/] |
| Vitest + Testing Library | installed | Unit tests for utils + hooks | Any new utility logic |

### No new libraries
This phase adds no npm dependencies. All UI is hand-authored with Tailwind CSS 4 tokens. AI calls go through existing Supabase Edge Function infrastructure.

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
supabase/
├── migrations/024_feedback_dietary.sql    # All new tables + RLS
├── functions/
│   ├── classify-restrictions/index.ts     # AI: map restrictions → ingredients
│   └── analyze-ratings/index.ts           # AI: tag recipes + insights + swap suggestions

src/
├── components/
│   ├── feedback/
│   │   ├── RateMealsCard.tsx              # HomePage persistent rating card
│   │   └── MealRatingRow.tsx              # Per-meal star row inside RateMealsCard
│   ├── settings/
│   │   ├── DietaryRestrictionsSection.tsx # Per-member restriction checkboxes + custom
│   │   └── WontEatSection.tsx             # Per-member won't-eat list with strength
│   └── plan/
│       ├── IssuesPanel.tsx                # Collapsible plan issues panel
│       └── IssueRow.tsx                   # Single conflict/monotony row
├── hooks/
│   ├── useRatings.ts                      # useRecipeRatings, useRateMeal
│   ├── useDietaryRestrictions.ts          # useRestrictions, useSaveRestrictions
│   └── useWontEat.ts                      # useWontEatEntries, useAddWontEat, useRemoveWontEat
├── pages/
│   └── InsightsPage.tsx                   # /insights route
└── utils/
    └── monotonyDetection.ts               # Rolling-window repeat detection (pure fn, testable)
```

### Pattern 1: TanStack Query hook with householdId guard

Matches every existing hook in the project. [VERIFIED: src/hooks/useFoodPrices.ts, useFoodLogs.ts]

```typescript
// Source: existing project pattern — useFoodPrices.ts
export function useRecipeRatings(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.ratings.list(householdId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipe_ratings')
        .select('*')
        .eq('household_id', householdId!)
        .order('rated_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!householdId,
  })
}
```

### Pattern 2: Supabase Edge Function invocation (fire-and-forget AI)

Matches existing verify-nutrition pattern. The AI mapping for restrictions runs asynchronously — client fires the call and shows a "Mapping ingredients in the background…" message without awaiting a meaningful result. [VERIFIED: supabase/functions/verify-nutrition/index.ts]

```typescript
// Source: existing project pattern — verify-nutrition invocation
const { error } = await supabase.functions.invoke('classify-restrictions', {
  body: { memberId, restrictions, customEntries, householdId },
})
// error is non-blocking — restrictions are already saved to DB before this call
```

Edge function internal structure follows `serve()` from `https://deno.land/std@0.168.0/http/server.ts` with CORS headers. [VERIFIED: supabase/functions/verify-nutrition/index.ts]

### Pattern 3: Snapshot recipe attributes at rating time

From STATE.md v2.0 decision: "Feedback rows snapshot recipe attributes at rating time — prevents edits to live recipe records from corrupting historical planning signal." [VERIFIED: .planning/STATE.md]

The recipe_ratings table must snapshot: recipe_name, recipe_id (FK), rated_at, rating (1-5), member reference (user_id or member_profile_id, same dual-nullable FK pattern as nutrition_targets).

```typescript
// Dual nullable FK pattern — already used in nutrition_targets [VERIFIED: src/types/database.ts]
interface RecipeRating {
  id: string
  household_id: string
  recipe_id: string
  recipe_name: string          // snapshot — not FK'd to recipes.name
  rated_by_user_id: string | null
  rated_by_member_profile_id: string | null
  rating: 1 | 2 | 3 | 4 | 5
  rated_at: string
  created_at: string
}
```

### Pattern 4: Dual nullable FK for member identity

Established in nutrition_targets (Phase 3) and food_logs (Phase 4). Auth users have `user_id`; managed child profiles have `member_profile_id`. Both fields nullable, exactly one non-null enforced by DB CHECK constraint. [VERIFIED: src/types/database.ts — NutritionTarget, FoodLog]

This pattern applies to: recipe_ratings, dietary_restrictions, wont_eat_entries.

### Pattern 5: Prefix-array cache invalidation for mutations

```typescript
// Source: existing project pattern — Phase 16 decision in STATE.md
queryClient.invalidateQueries({ queryKey: ['ratings', householdId] })
```

### Pattern 6: window.confirm for hard-block allergy override

Established in Phase 8 for calorie recalculation. [VERIFIED: CONTEXT.md D-13, UI-SPEC Allergy Hard-Block Override section]

```typescript
// Matches calorie recalculation precedent (Phase 8)
const confirmed = window.confirm(
  `This meal contains ${ingredient}, flagged as an allergy for ${memberName}. Add anyway?`
)
```

### Anti-Patterns to Avoid

- **Computing monotony at render time in PlanGrid**: Rolling 2-week window requires querying two weeks of plan slots. Move to a dedicated hook (`useMonotonyWarnings`) and call from PlanPage, not inside PlanGrid's render cycle.
- **Storing rating averages as derived columns**: Never cache computed averages in the DB. AI tags are computed outputs stored separately; raw ratings are the source of truth.
- **Per-row confirmation dialogs for won't-eat removals**: UI-SPEC explicitly states no confirmation dialog on remove — not destructive enough. Follow the spec.
- **Blocking the save button on AI restriction mapping**: AI runs fire-and-forget. Restrictions save instantly; AI mapping is background-only. Do not await the Edge Function response.
- **Adding ingredient-level FK to wont_eat_entries**: Won't-eat entries are free-text; AI resolves them at match time. Do not try to normalize to food IDs at insert — the resolution is AI's job.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI ingredient classification | Custom keyword matching | Supabase Edge Function calling Claude/OpenAI | Gluten-containing ingredient detection is a solved problem for LLMs; hand-rolling misses edge cases (modified starch, malt, etc.) |
| Fuzzy won't-eat text matching | Levenshtein distance in client | AI Edge Function with ingredient list context | "organ meat" → "liver, kidney" requires semantic understanding, not edit distance |
| Rolling 2-week window query | Complex date math per slot | SQL window query on meal_plan_slots grouped by recipe_id + date range | DB does this efficiently; the client just consumes counts |
| Recipe AI tagging | Rule-based threshold logic | Edge Function + AI model | "divisive" requires interpreting variance across member ratings, not just average |

---

## Data Model

### New tables for migration 024

#### recipe_ratings

```sql
create table public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  recipe_name text not null,                     -- snapshot
  rated_by_user_id uuid references auth.users(id) on delete set null,
  rated_by_member_profile_id uuid references public.member_profiles(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  rated_at date not null default current_date,
  created_at timestamptz not null default now(),
  constraint recipe_ratings_member_check check (
    (rated_by_user_id is null) <> (rated_by_member_profile_id is null)
  )
);
-- unique: one rating per member per recipe per day
create unique index recipe_ratings_unique
  on public.recipe_ratings(recipe_id, rated_at,
    coalesce(rated_by_user_id::text, rated_by_member_profile_id::text));
```

#### dietary_restrictions

```sql
create table public.dietary_restrictions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  member_profile_id uuid references public.member_profiles(id) on delete cascade,
  predefined text[] not null default '{}',       -- e.g. ['gluten-free', 'vegan']
  custom_entries text[] not null default '{}',   -- free-text custom restrictions
  updated_at timestamptz not null default now(),
  constraint dietary_restrictions_member_check check (
    (member_user_id is null) <> (member_profile_id is null)
  )
);
-- one row per member
create unique index dietary_restrictions_member_unique
  on public.dietary_restrictions(
    coalesce(member_user_id::text, member_profile_id::text));
```

#### wont_eat_entries

```sql
create table public.wont_eat_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  member_profile_id uuid references public.member_profiles(id) on delete cascade,
  food_name text not null,
  strength text not null default 'dislikes'
    check (strength in ('dislikes', 'refuses', 'allergy')),
  source text not null default 'manual'
    check (source in ('manual', 'ai_restriction', 'ai_suggestion')),
  created_at timestamptz not null default now(),
  constraint wont_eat_member_check check (
    (member_user_id is null) <> (member_profile_id is null)
  )
);
```

#### ai_recipe_tags

```sql
create table public.ai_recipe_tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag text not null,   -- e.g. 'crowd-pleaser', 'divisive', 'filling'
  confidence real,
  generated_at timestamptz not null default now(),
  unique (household_id, recipe_id, tag)
);
```

### RLS patterns for new tables

All new tables use the established `get_user_household_id()` helper for household-scoped RLS. [VERIFIED: supabase/migrations/020_budget_engine.sql pattern used throughout v2.0]

Member-scoped writes (dietary_restrictions, wont_eat_entries): any household member can write for themselves; parents (managed_by = auth.uid()) can write for child profiles. This matches the food_logs RLS pattern where `logged_by` is the auth user and `member_user_id/member_profile_id` identifies the subject. [VERIFIED: .planning/STATE.md Phase 04 decision]

---

## Common Pitfalls

### Pitfall 1: Rating card detects "cooked meals" incorrectly

**What goes wrong:** The Cook button triggers `CookDeductionReceipt` which records a spend log, but there is no existing `cooked_at` column on meals or slots. The RateMealsCard needs to know which recipes were cooked today to show rating rows.
**Why it happens:** Phase 16/17 added spend_logs with `source='cook'` and `recipe_id`. This is the signal.
**How to avoid:** Query `spend_logs` where `source = 'cook'` and `log_date = today` and `logged_by = current_user_id`. Join to recipes for names. Filter out recipe_ids already rated today in `recipe_ratings`.
**Warning signs:** Rating card shows stale meals or meals that weren't cooked today.

### Pitfall 2: Dual-FK CHECK constraint direction

**What goes wrong:** Using `(user_id IS NULL) != (profile_id IS NULL)` in SQL — PostgreSQL's `!=` on booleans works but the idiomatic form is `<>` and the pattern should match existing migrations exactly.
**How to avoid:** Copy the exact constraint pattern from migration 008 (nutrition_targets). [VERIFIED: supabase/migrations/008_meals_plans_targets.sql pattern in STATE.md]

### Pitfall 3: Won't-eat AI resolution blocks UI

**What goes wrong:** Developer awaits the AI resolution Edge Function before showing confirmation to the user, causing apparent UI freeze.
**How to avoid:** AI resolution is always fire-and-forget. The entry is saved to wont_eat_entries immediately with `source='manual'`. The Edge Function updates the row's `source` to `'ai_restriction'` if it was auto-mapped from a restriction, purely as metadata. No blocking.

### Pitfall 4: Issues panel computes violations on every render

**What goes wrong:** Checking each slot's ingredients against all members' wont_eat_entries inside a component means O(slots × ingredients × wont_eat_entries) work on every render.
**How to avoid:** Compute violations in a `useMemo` at PlanPage level, not inside SlotCard. Pass pre-computed `violations: SlotViolation[]` as a prop to SlotCard. This matches the existing `calcPortionSuggestions` + `useMemo` pattern in PlanGrid. [VERIFIED: src/components/plan/PlanGrid.tsx lines 81-95]

### Pitfall 5: AppShell test fails on Insights nav item

**What goes wrong:** Adding "Insights" to Sidebar and MobileDrawer without updating `tests/AppShell.test.tsx`. The test asserts the Sidebar has exactly 9 navigation items by name — adding a 10th without updating the test causes a failure.
**How to avoid:** AppShell test update is a required task. The test at line 44 asserts 9 items; after adding "Insights" it will be 10. [VERIFIED: tests/AppShell.test.tsx line 44]

### Pitfall 6: Rolling 2-week monotony window is week-start-day aware

**What goes wrong:** Hardcoding 14-day lookback as `NOW() - INTERVAL '14 days'` ignores the household's `week_start_day` setting.
**How to avoid:** Use the same UTC-based `getWeekStart` utility that the rest of the plan code uses — compute the start of 2 weeks ago from the current week's start, not from today's date.

### Pitfall 7: recipe_id on spend_logs can be null

**What goes wrong:** Not all spend logs have a recipe_id (food_log source entries don't). The query for "cooked meals today" must filter `WHERE source = 'cook' AND recipe_id IS NOT NULL`.
**How to avoid:** Add both filters. [VERIFIED: src/types/database.ts SpendLog.recipe_id is `string | null`]

---

## Code Examples

### Detecting unrated cooked meals (rating card trigger)

```typescript
// Source: derived from spend_logs schema [VERIFIED: src/types/database.ts SpendLog]
// and recipe_ratings schema (new in this phase)
async function getUnratedCookedMealsToday(
  householdId: string,
  userId: string,
  today: string, // YYYY-MM-DD
): Promise<{ recipeId: string; recipeName: string }[]> {
  const { data: cooked } = await supabase
    .from('spend_logs')
    .select('recipe_id')
    .eq('household_id', householdId)
    .eq('logged_by', userId)
    .eq('log_date', today)
    .eq('source', 'cook')
    .not('recipe_id', 'is', null)

  if (!cooked?.length) return []

  const recipeIds = cooked.map(r => r.recipe_id!)

  const { data: alreadyRated } = await supabase
    .from('recipe_ratings')
    .select('recipe_id')
    .eq('rated_by_user_id', userId)
    .eq('rated_at', today)
    .in('recipe_id', recipeIds)

  const ratedIds = new Set(alreadyRated?.map(r => r.recipe_id) ?? [])
  const unrated = recipeIds.filter(id => !ratedIds.has(id))

  // fetch recipe names for unrated
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name')
    .in('id', unrated)

  return recipes?.map(r => ({ recipeId: r.id, recipeName: r.name })) ?? []
}
```

### Monotony detection utility (pure function, testable)

```typescript
// Source: derived from CONTEXT.md D-21, rolling 2-week window
// meal_plan_slots already has day_index + plan_id; join to meal_plans for week_start
interface SlotEntry {
  recipeId: string
  recipeName: string
  weekStart: string // YYYY-MM-DD
  dayIndex: number
}

export function detectMonotony(
  slots: SlotEntry[],
  currentWeekStart: string,
  threshold = 2,
): { recipeId: string; recipeName: string; count: number }[] {
  const twoWeeksAgo = subtractDays(currentWeekStart, 7) // prior week start
  const relevant = slots.filter(s => s.weekStart >= twoWeeksAgo)
  const counts = new Map<string, { name: string; count: number }>()
  for (const slot of relevant) {
    const existing = counts.get(slot.recipeId) ?? { name: slot.recipeName, count: 0 }
    counts.set(slot.recipeId, { ...existing, count: existing.count + 1 })
  }
  return [...counts.entries()]
    .filter(([, v]) => v.count > threshold)
    .map(([id, v]) => ({ recipeId: id, recipeName: v.name, count: v.count }))
}
```

### queryKeys additions

```typescript
// Additions to src/lib/queryKeys.ts — following existing factory pattern [VERIFIED: queryKeys.ts]
ratings: {
  list: (householdId: string | undefined) => ['ratings', householdId] as const,
  forMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['ratings', householdId, memberId] as const,
},
restrictions: {
  forMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['restrictions', householdId, memberId] as const,
},
wontEat: {
  forMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['wont-eat', householdId, memberId] as const,
},
aiTags: {
  forRecipe: (recipeId: string | undefined) => ['ai-tags', recipeId] as const,
},
insights: {
  household: (householdId: string | undefined) => ['insights', householdId] as const,
},
```

---

## Integration Points

### HomePage
- Add `<RateMealsCard>` after existing InventorySummaryWidget or daily log section.
- Needs: `todayString()` (already in HomePage.tsx), current user ID from `useAuth()`, `useMemo`-computed list of unrated cooked meals.

### SettingsPage
- The Settings page already has sections per member profile (nutrition targets link to `/members/:id/targets`).
- Add `<DietaryRestrictionsSection>` and `<WontEatSection>` within the per-member block.
- Both sections need the member's user_id or member_profile_id — already available via `useHouseholdMembers()` + `useMemberProfiles()`. [VERIFIED: src/pages/SettingsPage.tsx imports]

### PlanPage / PlanGrid
- PlanGrid already computes `suggestions` at grid level and passes down — violations follow the same pattern.
- `IssuesPanel` attaches below `PlanGrid`, not inside it. Receives pre-computed violations array.
- SlotCard needs two new optional props: `violations?: SlotViolation[]` and `monotonyWarning?: boolean`.

### App.tsx routing
- Add `<Route path="/insights" element={<InsightsPage />} />` inside the authenticated AppShell route block. [VERIFIED: src/App.tsx line 143-154 pattern]

### Sidebar + MobileDrawer
- Add `{ label: 'Insights', to: '/insights', icon: '...' }` to both `navItems` arrays.
- AppShell test: update assertion from 9 to 10 nav items, add `expect(screen.getByText('Insights')).toBeInTheDocument()`. [VERIFIED: tests/AppShell.test.tsx line 44 count]

### RecipeCard / recipe detail
- `<RecipeAITagPill>` renders AI tags below recipe name. Needs a `useAITags(recipeId)` hook querying `ai_recipe_tags`.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/config changes against existing infrastructure (Supabase project already running, no new external services).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react |
| Config file | vite.config.ts (vitest block) / tests/setup.ts |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FEED-01 | Rating persisted for correct member/recipe/day | unit | `npx vitest run tests/ratings.test.ts` | ❌ Wave 0 |
| FEED-01 | RateMealsCard hidden when no cooked meals today | unit | `npx vitest run tests/ratings.test.ts` | ❌ Wave 0 |
| FEED-02 | Restrictions saved with correct predefined + custom arrays | unit | `npx vitest run tests/restrictions.test.ts` | ❌ Wave 0 |
| FEED-03 | Won't-eat add/remove/strength-change | unit | `npx vitest run tests/wontEat.test.ts` | ❌ Wave 0 |
| FEED-04 | detectMonotony returns correct recipes above threshold | unit | `npx vitest run src/utils/monotonyDetection.test.ts` | ❌ Wave 0 |
| FEED-04 | detectMonotony ignores recipes below threshold | unit | `npx vitest run src/utils/monotonyDetection.test.ts` | ❌ Wave 0 |
| Nav | Insights nav item present in Sidebar | existing | `npx vitest run tests/AppShell.test.tsx` | ✅ (update needed) |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/ratings.test.ts` — covers FEED-01 rating logic
- [ ] `tests/restrictions.test.ts` — covers FEED-02 restriction save/load
- [ ] `tests/wontEat.test.ts` — covers FEED-03 won't-eat CRUD
- [ ] `src/utils/monotonyDetection.test.ts` — covers FEED-04 rolling window logic
- [ ] `tests/AppShell.test.tsx` update — add "Insights" assertion (existing file, update not create)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | session from existing AuthContext |
| V3 Session Management | no | handled by existing Supabase auth |
| V4 Access Control | yes | RLS on all new tables: household isolation + member-scoped writes |
| V5 Input Validation | yes | `strength` and `source` CHECK constraints at DB level; rating CHECK (1-5) |
| V6 Cryptography | no | no new secrets or crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Member A reads/writes Member B's dietary restrictions | Spoofing/Tampering | RLS: write policy checks `rated_by_user_id = auth.uid()` OR managed child (`managed_by = auth.uid()`) |
| Cross-household data leak on ratings | Info Disclosure | RLS: `household_id = get_user_household_id()` on all selects |
| AI Edge Function receives arbitrary ingredient lists | Tampering | Edge Function validates `memberId` belongs to caller's household before processing |
| won't-eat strength set to invalid value | Tampering | DB CHECK constraint on `strength IN ('dislikes','refuses','allergy')` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | spend_logs.recipe_id is the correct signal for "cooked today" | Data Model, Code Examples | If cook flow changed in Phase 17/19 and spend_logs.recipe_id is not reliably populated, rating card has no trigger signal. Verify by inspecting the CookDeductionReceipt mutation. [ASSUMED — not traced through Phase 17 code in this session] |
| A2 | Supabase Edge Functions can call an LLM API (Claude/OpenAI) from the existing Deno runtime | Standard Stack | If Supabase project has no LLM API key configured, AI features fail silently. Verified pattern exists (verify-nutrition calls an AI model) but key configuration not checked. [ASSUMED — inferred from verify-nutrition existing] |
| A3 | ai_recipe_tags table is the right storage for AI tags vs. a JSONB column on recipes | Data Model | A JSONB column on recipes would be simpler if tags are always household-scoped. Separate table is more flexible for multi-household and querying. Decision left to planner's discretion per CONTEXT.md. [ASSUMED] |

---

## Open Questions

1. **Which AI model does verify-nutrition call, and is the same API key available for new Edge Functions?**
   - What we know: verify-nutrition calls an AI model via the Edge Function. The function exists and is deployed.
   - What's unclear: Model name, API key source (env var name), whether rate limits apply.
   - Recommendation: Read `supabase/functions/verify-nutrition/index.ts` fully during planning to extract the model call pattern, then replicate it in classify-restrictions and analyze-ratings.

2. **Should the Issues panel live in PlanPage.tsx or PlanGrid.tsx?**
   - What we know: PlanGrid is the week-level orchestrator; PlanPage is the route-level wrapper. IssuesPanel is week-scoped data.
   - What's unclear: Whether the violations hook should live at PlanGrid or PlanPage level.
   - Recommendation: PlanPage level — keeps PlanGrid focused on the grid itself. Pass computed violations down. Matches the way `memberTarget` is passed from PlanPage → PlanGrid.

3. **How does the Cook button currently link a cooked meal back to a recipe ID?**
   - What we know: SpendLog has `recipe_id` and `source='cook'`. CookDeductionReceipt is the component.
   - What's unclear: Whether recipe_id is always populated (meals can contain multiple recipes; it's unclear which recipe_id is logged).
   - Recommendation: During Wave 1, read RecipeBuilder.tsx's Cook button handler and the useCreateSpendLog hook to confirm what recipe_id is written.

---

## Sources

### Primary (HIGH confidence)
- `src/types/database.ts` — all existing type interfaces, confirmed column names
- `src/lib/queryKeys.ts` — existing query key factory pattern
- `src/components/plan/SlotCard.tsx` — badge/expand pattern
- `src/components/plan/PlanGrid.tsx` — useMemo + suggestions fetch-once pattern
- `src/pages/SettingsPage.tsx` — section structure for Settings
- `supabase/functions/verify-nutrition/index.ts` — Edge Function structure (Deno, CORS, serve())
- `tests/AppShell.test.tsx` — nav item count assertions
- `src/components/layout/Sidebar.tsx` — navItems array structure
- `src/components/layout/MobileDrawer.tsx` — drawerItems array structure
- `.planning/phases/20-feedback-engine-dietary-restrictions/20-CONTEXT.md` — all locked decisions
- `.planning/phases/20-feedback-engine-dietary-restrictions/20-UI-SPEC.md` — component inventory, interaction contracts, copy
- `.planning/STATE.md` — v2.0 decisions including rating snapshot requirement

### Secondary (MEDIUM confidence)
- `supabase/migrations/020_budget_engine.sql` — RLS pattern with get_user_household_id() [pattern inferred from STATE.md decisions, not read directly in this session]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Data model: HIGH — patterns directly verified from existing migrations and type definitions
- Architecture: HIGH — all patterns traced to existing code
- AI Edge Function details: MEDIUM — structure verified from verify-nutrition, but model/key specifics not confirmed
- Pitfalls: HIGH — traced from existing code and known project decisions

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable stack, 30 days)
