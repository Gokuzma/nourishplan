# Phase 3: Meal Planning & Targets - Research

**Researched:** 2026-03-13
**Domain:** Meal composition, weekly meal plan grid, template/instance patterns, nutrition target management, Supabase relational schema
**Confidence:** HIGH — domain is internal; all findings derived from existing codebase, established patterns, and Postgres/Supabase fundamentals

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Meal plan grid layout**
- Day cards stack layout — vertical stack of day cards, each showing all meal slots
- Mobile: swipe between days (one day card fills screen, swipe left/right, day indicator dots at top)
- Desktop: scrollable stack of all 7 day cards
- Each day card shows: per-meal calories inline + day total bar at bottom (cal/P/C/F)
- Progress rings on each day card showing how close the day's meals get to the selected member's targets
- Member selector at top of plan page to switch whose targets are displayed

**Meal slots**
- Fixed 4 default slots: Breakfast, Lunch, Dinner, Snacks
- Users can add custom slots (e.g., "Pre-workout", "Late snack")
- Empty slots show a '+' add button

**Meal composition**
- Meals are standalone, reusable entities — not just slot references
- A meal is composed of recipes and/or individual foods with quantities
- Adding food to a meal reuses the FoodSearch overlay from Phase 2 (USDA/OFF/My Foods tabs + Recipes tab)
- Meals have their own tab in main nav (alongside Home, Foods, Recipes)
- Meal nutrition displayed with same sticky NutritionBar pattern as RecipeBuilder

**Template & swap behavior**
- User builds a live plan for the week, can "Save as template" to snapshot it
- Loading a template populates the current week's plan
- Templates are read-only copies until loaded
- Swapping a meal on a specific day overrides that slot only — template is unchanged, other days keep original
- Configurable week start day (household setting) — e.g., Thursday
- On week start day, prompt appears: "Start fresh, repeat last week, or load a template?"

**Nutrition targets**
- Each member has a profile page showing their targets (accessible from household member list)
- Admins can edit any member's targets; members edit their own
- Default view: calories + macros (protein, carbs, fat)
- Expandable sections for micronutrient targets and custom goals (e.g., water intake, sugar limit)
- Preset templates available: "Adult maintenance (2000 cal)", "Weight loss", "Child 5-12", "Teen"

### Claude's Discretion
- Exact meal data model schema (tables, columns, relationships)
- How custom meal slots are stored and ordered
- Swipe gesture library or implementation for mobile day navigation
- Template storage format and versioning
- Preset target values for each template category
- Week boundary calculation logic
- How the "new week" prompt is triggered and displayed

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MEAL-01 | User can compose a meal from multiple recipes and/or individual foods | Meal entity model + meal_items join table; reuse FoodSearch overlay and RecipeBuilder patterns |
| MEAL-02 | User can create a weekly meal plan with breakfast, lunch, dinner, and snack slots | meal_plans + meal_plan_slots tables; week calculated from household week_start_day |
| MEAL-03 | Meal plan is shared across all household members automatically | household_id on meal_plans + RLS mirrors recipes policy; no explicit sharing action needed |
| MEAL-04 | User can swap individual meals on a given day without changing the template | Override row on meal_plan_slots that shadows the template slot; template_id stays untouched |
| MEAL-05 | User can save and reuse meal plan templates | meal_plan_templates table snapshotting current week; load copies slots into live plan |
| MEAL-06 | Each recipe in a meal plan displays its full nutrition breakdown | calcMealNutrition extends existing calcIngredientNutrition/calcRecipePerServing |
| TRCK-01 | Each household member can set personal calorie and macro targets | nutrition_targets table with member_id; default + custom values |
| TRCK-02 | Each household member can set micronutrient targets | micronutrient_targets jsonb column or separate rows in nutrition_targets |
| TRCK-03 | Each household member can set custom nutrition goals (water, sugar limit, etc.) | custom_goals jsonb column in nutrition_targets |
</phase_requirements>

---

## Summary

Phase 3 builds on a solid Phase 2 foundation. All critical patterns — TanStack Query CRUD hooks, Supabase RLS with household isolation, per-100g nutrition normalization, FoodSearch overlay, NutritionBar sticky bar, and RecipeBuilder ingredient management — are already established and ready to reuse or extend.

The core complexity in this phase is the data model for meals vs meal plans vs templates. These are three distinct entities: a **meal** (reusable named collection of foods/recipes), a **meal plan** (a live week of day+slot assignments), and a **meal plan template** (a read-only snapshot of a plan). The template/instance pattern requires careful schema design so that swapping a meal on one day does not affect other days or the template.

Nutrition targets are straightforward: a single `nutrition_targets` table per member profile (or per auth user), with macros as typed columns and micronutrients/custom goals as JSONB. The UI reuses the expandable section pattern already present in the codebase.

**Primary recommendation:** Implement in this order: (1) migration + types, (2) meals CRUD + MealBuilder page, (3) meal plan grid + week navigation, (4) template save/load + swap, (5) nutrition targets UI. This order ensures each wave is independently testable.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.1 | Database, auth, RLS | Already in use; new tables follow same patterns |
| @tanstack/react-query | ^5.90.21 | Server state, caching, mutations | Established pattern in all existing hooks |
| react-router-dom | ^7.13.1 | Routing for /meals, /meals/:id, /plan | AppShell layout route already in place |
| tailwindcss | ^4.2.1 | Styling | @theme tokens (sage/cream/peach) already defined |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new dependencies required | — | All Phase 3 features can be built with existing stack | — |

**Swipe gesture for mobile day navigation:** Use native touch events (`onTouchStart`/`onTouchEnd` delta check) rather than a library. The gesture is simple (swipe left/right > 50px threshold), one-directional, and adding a library like `react-swipeable` adds ~8KB for something trivial to implement. Keep it hand-rolled here since it's a single use case.

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── meal/
│   │   ├── MealBuilder.tsx       # Adapts RecipeBuilder pattern for meals
│   │   ├── MealItemRow.tsx       # Adapts IngredientRow for meal items
│   │   └── MealCard.tsx          # Summary card for meals list
│   ├── plan/
│   │   ├── PlanGrid.tsx          # Week view — orchestrates day cards
│   │   ├── DayCard.tsx           # Single day card with slot list + progress ring
│   │   ├── SlotCard.tsx          # Individual meal slot (empty or filled)
│   │   ├── MemberSelector.tsx    # Dropdown to switch whose targets to display
│   │   └── NewWeekPrompt.tsx     # "Start fresh / repeat / template" modal
│   └── targets/
│       └── NutritionTargetsForm.tsx  # Calorie + macro + expandable micros/custom
├── hooks/
│   ├── useMeals.ts               # CRUD for meals + meal_items
│   ├── useMealPlan.ts            # Current week's plan + slot mutations
│   ├── useMealPlanTemplates.ts   # Save/load templates
│   └── useNutritionTargets.ts   # Read/write member targets
├── pages/
│   ├── MealsPage.tsx             # /meals — list of reusable meals
│   ├── MealPage.tsx              # /meals/:id — builder
│   ├── PlanPage.tsx              # /plan — weekly grid
│   └── MemberTargetsPage.tsx    # /members/:id/targets
└── utils/
    └── nutrition.ts              # Extend with calcMealNutrition, calcDayNutrition
```

### Pattern 1: Meal Entity (Reusable, Standalone)

**What:** A meal is a named, reusable entity with its own list of food/recipe items. It is NOT a slot reference — it exists independently.

**When to use:** Whenever a user builds "Overnight Oats" or "Chicken Stir Fry" — these become reusable meals that can appear in multiple plan slots across weeks.

**Schema:**
```sql
create table public.meals (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by   uuid not null references auth.users(id),
  name         text not null,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.meal_items (
  id              uuid primary key default gen_random_uuid(),
  meal_id         uuid not null references public.meals(id) on delete cascade,
  item_type       text not null check (item_type in ('food', 'recipe')),
  item_id         text not null,   -- text, same as recipe_ingredients.ingredient_id
  quantity_grams  numeric not null,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
```

**RLS pattern:** Mirror `recipes` and `recipe_ingredients` policies exactly — household_id subquery select, created_by check on insert, admin-or-creator update/delete.

### Pattern 2: Meal Plan (Live Week)

**What:** One meal_plan row per household per week (identified by `week_start` date). Slots are rows in `meal_plan_slots` referencing a meal.

**Schema:**
```sql
create table public.meal_plans (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  week_start   date not null,   -- always the household's week start day for that week
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  unique (household_id, week_start)
);

create table public.meal_plan_slots (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.meal_plans(id) on delete cascade,
  day_index    integer not null check (day_index between 0 and 6),  -- 0=week start day
  slot_name    text not null,    -- 'Breakfast', 'Lunch', 'Dinner', 'Snacks', or custom
  slot_order   integer not null default 0,
  meal_id      uuid references public.meals(id) on delete set null,
  is_override  boolean not null default false,  -- true when swapped from template
  created_at   timestamptz not null default now(),
  unique (plan_id, day_index, slot_name)
);
```

**Week start calculation:**
```typescript
// Get the ISO date string for the week start containing `today`,
// given the household's preferred week start day (0=Sun, 1=Mon, ..., 6=Sat).
function getWeekStart(today: Date, weekStartDay: number): string {
  const day = today.getDay() // 0=Sun
  const diff = (day - weekStartDay + 7) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - diff)
  return start.toISOString().slice(0, 10) // 'YYYY-MM-DD'
}
```

### Pattern 3: Template/Instance Distinction

**What:** A template is a frozen snapshot of a plan. Loading a template copies its slots into the current week's live plan. Swapping a slot sets `is_override = true` on that row only.

**Schema:**
```sql
create table public.meal_plan_templates (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now()
);

create table public.meal_plan_template_slots (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.meal_plan_templates(id) on delete cascade,
  day_index    integer not null check (day_index between 0 and 6),
  slot_name    text not null,
  slot_order   integer not null default 0,
  meal_id      uuid references public.meals(id) on delete set null
);
```

**Save as template:** Copy all `meal_plan_slots` rows for the plan into `meal_plan_template_slots`. The template stores meal references — meal content is live (templates reference meals, not snapshots of meals).

**Load template:** For each template slot, upsert a `meal_plan_slots` row on `(plan_id, day_index, slot_name)`. `is_override = false` for loaded slots.

**Swap meal:** Update the specific `meal_plan_slots` row to the new `meal_id`, set `is_override = true`. Other rows and the template are untouched.

### Pattern 4: Household Settings (week_start_day)

**What:** Add `week_start_day` (integer 0-6, default 0=Sunday) to the `households` table via migration. The PlanPage reads this setting from `useHousehold()` which already joins `households`.

```sql
alter table public.households
  add column if not exists week_start_day integer not null default 0
    check (week_start_day between 0 and 6);
```

No new table or query needed — `useHousehold` already selects `households(id, name, created_at)`, extend that select to include `week_start_day`.

### Pattern 5: Nutrition Targets

**What:** Per-member nutrition targets stored in a single table. Each member has one row. Admins can write any row in their household; members write only their own.

**Schema:**
```sql
create table public.nutrition_targets (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references public.households(id) on delete cascade,
  member_id           uuid not null references auth.users(id) on delete cascade,
  calories            numeric,
  protein_g           numeric,
  carbs_g             numeric,
  fat_g               numeric,
  micronutrients      jsonb not null default '{}',  -- { "fiber_g": 25, "sodium_mg": 2300, ... }
  custom_goals        jsonb not null default '{}',  -- { "water_ml": 2000, "sugar_g": 50, ... }
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (household_id, member_id)
);
```

**RLS:**
- SELECT: household member can read any target in their household
- INSERT/UPDATE: member writes own row OR admin in same household writes any row
- Use `get_user_household_role()` security-definer helper (already exists) for admin check

**Preset templates (Claude's discretion values):**
```typescript
export const TARGET_PRESETS = {
  'Adult maintenance': { calories: 2000, protein_g: 50, carbs_g: 275, fat_g: 65 },
  'Weight loss':       { calories: 1600, protein_g: 120, carbs_g: 150, fat_g: 53 },
  'Child 5-12':        { calories: 1400, protein_g: 35, carbs_g: 195, fat_g: 47 },
  'Teen':              { calories: 2200, protein_g: 65, carbs_g: 300, fat_g: 73 },
} as const
```
Values are standard dietary reference intakes (DRI/USDA 2020-2025 guidelines), appropriate as starting defaults that users customize.

### Pattern 6: Nutrition Calculation Extensions

**What:** Add two new pure functions to `src/utils/nutrition.ts` to handle meal-level and day-level summaries.

```typescript
// Sum all items in a meal (foods at their quantity, recipes at their serving-adjusted weight)
export function calcMealNutrition(
  items: { nutrition: MacroSummary }[]
): MacroSummary {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein:  acc.protein  + item.nutrition.protein,
      fat:      acc.fat      + item.nutrition.fat,
      carbs:    acc.carbs    + item.nutrition.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )
}

// Sum all meal nutritions across all slots in a day
export function calcDayNutrition(
  mealNutritions: MacroSummary[]
): MacroSummary {
  return mealNutritions.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein:  acc.protein  + m.protein,
      fat:      acc.fat      + m.fat,
      carbs:    acc.carbs    + m.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )
}
```

### Pattern 7: Progress Ring Component

**What:** SVG-based circular progress indicator. Used on each DayCard to show how close a day's total is to the selected member's targets.

```typescript
// Simple SVG ring — no library needed
interface ProgressRingProps {
  value: number    // actual (e.g. 1650 cal)
  target: number   // goal (e.g. 2000 cal)
  size?: number    // px, default 40
  strokeWidth?: number
  color?: string   // tailwind or hex
}

export function ProgressRing({ value, target, size = 40, strokeWidth = 4, color = '#A8C5A0' }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = target > 0 ? Math.min(value / target, 1) : 0
  const dash = pct * circumference
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E8B4A2" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
    </svg>
  )
}
```

No library needed. The pattern is simple enough that hand-rolling avoids a dependency.

### Anti-Patterns to Avoid

- **Storing meal nutrition at rest:** Do NOT persist computed meal totals in the database. Always calculate from live items at query time, exactly as RecipeBuilder does with `foodDataMap`. Storing derived data creates stale-data bugs.
- **Using meal_plan_slots.meal_id as a foreign key with cascade delete:** Meals are reusable. If a meal is deleted (soft-deleted), slots should have `meal_id = null` (already modeled with `on delete set null`), not cause plan deletion.
- **Template snapshots of meal content:** Templates reference meal IDs, not copies of meal items. If the user wants a frozen nutrition snapshot, that is a v2 concern (deferred). Keep it simple.
- **One plan row per day:** Use one plan per week (week_start date). Do not create daily plan rows — it complicates week-view queries and template loading.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calorie/macro scaling | Custom math | `calcIngredientNutrition` (already exists) | Handles per-100g → quantity correctly |
| Recipe nutrition total | Custom loop | `calcRecipePerServing` (already exists) | Already handles servings division |
| Food search with tabs | New search UI | `FoodSearch` component (already exists) | USDA/OFF/My Foods/Recipes tabs, select mode |
| Sticky nutrition display | Custom bar | `NutritionBar` component (already exists) | Already positioned above TabBar |
| Query caching / mutations | Direct supabase calls in components | `useMutation` + `useQuery` (TanStack) | Automatic cache invalidation, loading states |
| Progress rings | Canvas or third-party chart | SVG circle with stroke-dasharray | Simple, no dependency, matches design |
| Swipe detection | `react-swipeable` or HammerJS | Native touch events delta check | One use case, ~5 lines, zero bundle cost |
| Week start calculation | date-fns or moment | Inline JS Date arithmetic | Simple modular arithmetic, no dependency |

---

## Common Pitfalls

### Pitfall 1: meal_plan upsert race condition on first plan creation
**What goes wrong:** Two household members open the plan page simultaneously on the first week. Both try to insert a meal_plans row with the same `(household_id, week_start)`. One fails with unique constraint violation.
**Why it happens:** No plan exists for this week yet; both trigger creation.
**How to avoid:** Use Supabase `upsert` with `onConflict: 'household_id,week_start'` and `ignoreDuplicates: true`, then re-fetch. Or use a DB function. The unique constraint on `(household_id, week_start)` ensures data integrity regardless.
**Warning signs:** "duplicate key value violates unique constraint" errors in production.

### Pitfall 2: Member selector showing auth users only — missing child profiles
**What goes wrong:** Member selector on PlanPage only shows `household_members` (auth users), missing `member_profiles` (managed children added in Phase 1).
**Why it happens:** Two separate tables represent "household members": `household_members` (auth) and `member_profiles` (managed, non-auth).
**How to avoid:** Build the member selector from both sources — union `useHouseholdMembers()` result with `useMemberProfiles()` result. Display children under their parent's name.
**Warning signs:** Child profiles exist in household page but don't appear in plan target selector.

### Pitfall 3: nutrition_targets RLS — admin check needs security-definer
**What goes wrong:** Admin tries to update another member's targets. RLS check for `get_user_household_role()` fails or causes recursion.
**Why it happens:** Direct join in RLS policy hits infinite recursion on `household_members`.
**How to avoid:** Use the existing `get_user_household_role()` security-definer function (already present from Phase 1) in the policy. Do NOT write an inline subquery joining `household_members` in the targets policy.
**Warning signs:** 403 errors when admin saves a child's targets.

### Pitfall 4: Week boundary prompt shown on every load, not just once per week
**What goes wrong:** The "Start fresh / repeat / load template?" prompt fires every time the user navigates to /plan.
**Why it happens:** No tracking of whether the prompt was already dismissed for this week.
**How to avoid:** After the user makes a choice, upsert the meal_plan row immediately (even if empty). The presence of a meal_plan row for this week_start signals the prompt was already handled. Check `meal_plan` existence before showing the prompt.
**Warning signs:** Users report the prompt appearing repeatedly.

### Pitfall 5: Loading a template overwrites in-progress plan edits
**What goes wrong:** User has manually arranged Monday and Tuesday, then loads a template — all their work is overwritten.
**Why it happens:** Template load does a full upsert across all 7 days.
**How to avoid:** Show a confirmation modal before loading: "This will replace your current plan for all 7 days. Continue?" Make this explicit.
**Warning signs:** User complaints about lost plan data.

### Pitfall 6: FoodDataMap not populated for meal items on page load
**What goes wrong:** Meal nutrition displays as 0 on first load even though items exist.
**Why it happens:** `foodDataMap` is local React state (as in RecipeBuilder). On initial render, items exist in DB but macros aren't loaded yet — they're only captured at add-time.
**How to avoid:** For meals (unlike RecipeBuilder, which is edit-only), we need a way to resolve nutrition on load. Options: (a) store macros snapshot in `meal_items` at add-time (denormalized but fast), or (b) resolve at query time by joining custom_foods. **Recommended: store macros snapshot** (`calories_per_100g`, `protein_per_100g`, `fat_per_100g`, `carbs_per_100g`) in `meal_items` at insert time. This mirrors how `FoodDataMap` works in RecipeBuilder but persists it. This is acceptable because meal item nutrition is already source-of-truth at add-time (same decision as Phase 2's `FoodDataMap` approach).
**Warning signs:** Meal nutrition shows 0 on plan page even with items added.

---

## Code Examples

### TanStack Query hook for meals (follows useRecipes.ts pattern exactly)
```typescript
// src/hooks/useMeals.ts
export function useMeals() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: ['meals', householdId],
    queryFn: async (): Promise<Meal[]> => {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}
```

### Upsert-or-create current week's plan
```typescript
// src/hooks/useMealPlan.ts
export function useMealPlan(weekStart: string) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: ['meal-plan', householdId, weekStart],
    queryFn: async (): Promise<MealPlan | null> => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('household_id', householdId!)
        .eq('week_start', weekStart)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!householdId && !!weekStart,
  })
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (weekStart: string): Promise<MealPlan> => {
      const { data, error } = await supabase
        .from('meal_plans')
        .upsert(
          { household_id: membership!.household_id, week_start: weekStart, created_by: session!.user.id },
          { onConflict: 'household_id,week_start', ignoreDuplicates: true }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', membership?.household_id, data.week_start] })
    },
  })
}
```

### Assign (or swap) a meal into a slot
```typescript
export function useAssignSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      planId,
      dayIndex,
      slotName,
      slotOrder,
      mealId,
      isOverride = false,
    }: {
      planId: string
      dayIndex: number
      slotName: string
      slotOrder: number
      mealId: string | null
      isOverride?: boolean
    }) => {
      const { data, error } = await supabase
        .from('meal_plan_slots')
        .upsert(
          { plan_id: planId, day_index: dayIndex, slot_name: slotName, slot_order: slotOrder, meal_id: mealId, is_override: isOverride },
          { onConflict: 'plan_id,day_index,slot_name' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan-slots', planId] })
    },
  })
}
```

### Nutrition targets upsert
```typescript
export function useUpsertNutritionTargets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (targets: {
      householdId: string
      memberId: string
      calories?: number
      protein_g?: number
      carbs_g?: number
      fat_g?: number
      micronutrients?: Record<string, number>
      custom_goals?: Record<string, number>
    }) => {
      const { data, error } = await supabase
        .from('nutrition_targets')
        .upsert(
          {
            household_id: targets.householdId,
            member_id: targets.memberId,
            calories: targets.calories,
            protein_g: targets.protein_g,
            carbs_g: targets.carbs_g,
            fat_g: targets.fat_g,
            micronutrients: targets.micronutrients ?? {},
            custom_goals: targets.custom_goals ?? {},
          },
          { onConflict: 'household_id,member_id' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-targets', data.household_id] })
    },
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Storing computed nutrition totals in DB | Calculate at query-time from normalized per-100g data | Eliminates stale-data bugs; established in Phase 2 |
| Separate plan per user | One plan per household per week | Enables MEAL-03 (shared visibility) automatically via RLS |
| Template = copy of food data | Template = copy of meal references | Simpler, smaller storage; meals remain living entities |

---

## Open Questions

1. **Nutrition target for auth users vs member_profiles**
   - What we know: `household_members` tracks auth users; `member_profiles` tracks managed children (non-auth). Nutrition targets need to work for both.
   - What's unclear: Should `nutrition_targets.member_id` reference `auth.users(id)` (works for auth users only) or use a unified "person" concept?
   - Recommendation: Use a composite approach — `nutrition_targets` has two nullable FK columns: `user_id uuid references auth.users(id)` and `member_profile_id uuid references member_profiles(id)`. Exactly one must be non-null (DB check constraint). This avoids creating a unified person table and stays consistent with the existing two-table approach. Unique constraint on `(household_id, user_id)` and `(household_id, member_profile_id)` separately.

2. **Meal item macros snapshot approach**
   - What we know: RecipeBuilder uses in-memory `foodDataMap` captured at add-time; this doesn't persist across sessions.
   - What's unclear: Whether to snapshot macros in `meal_items` columns at insert time or resolve at load time.
   - Recommendation: Snapshot at insert time (add `calories_per_100g`, `protein_per_100g`, `fat_per_100g`, `carbs_per_100g` columns to `meal_items`). This is simpler, consistent with how USDA/OFF foods aren't stored server-side, and avoids complex re-resolution logic. Low risk of staleness since per-100g values don't change.

3. **Custom slot ordering persistence**
   - What we know: Default slots are Breakfast/Lunch/Dinner/Snacks. Users can add custom slots.
   - What's unclear: Where to store the household's slot configuration vs. just per-plan slot rows.
   - Recommendation (Claude's discretion): Store custom slots directly as rows in `meal_plan_slots` with `slot_order` determining display sequence. Do not create a separate "slot configuration" table. The 4 default slots are rendered by convention if no slot rows exist; custom slots appear as additional rows.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEAL-01 | `calcMealNutrition` sums items correctly | unit | `npm test -- nutrition.test.ts -t "calcMealNutrition"` | ❌ Wave 0 |
| MEAL-02 | `getWeekStart` returns correct ISO date for various start days | unit | `npm test -- meal-plan.test.ts -t "getWeekStart"` | ❌ Wave 0 |
| MEAL-03 | RLS: household member can read plan; non-member cannot | manual-only | N/A — requires live Supabase | manual |
| MEAL-04 | Swap sets `is_override=true` on target slot only | unit (hook) | `npm test -- meal-plan.test.ts -t "swap slot"` | ❌ Wave 0 |
| MEAL-05 | Save template copies slot rows; load template upserts back | unit (hook) | `npm test -- meal-plan.test.ts -t "template"` | ❌ Wave 0 |
| MEAL-06 | `calcDayNutrition` sums meal nutritions | unit | `npm test -- nutrition.test.ts -t "calcDayNutrition"` | ❌ Wave 0 |
| TRCK-01 | Upsert targets saves calories + macros | unit (hook) | `npm test -- nutrition-targets.test.ts` | ❌ Wave 0 |
| TRCK-02 | Micronutrient targets stored/retrieved from JSONB | unit | `npm test -- nutrition-targets.test.ts -t "micronutrients"` | ❌ Wave 0 |
| TRCK-03 | Custom goals stored/retrieved from JSONB | unit | `npm test -- nutrition-targets.test.ts -t "custom goals"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- nutrition.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/nutrition.test.ts` — extend with `calcMealNutrition` and `calcDayNutrition` tests (REQ MEAL-01, MEAL-06)
- [ ] `tests/meal-plan.test.ts` — `getWeekStart` pure function tests, slot swap logic (REQ MEAL-02, MEAL-04, MEAL-05)
- [ ] `tests/nutrition-targets.test.ts` — upsert hook mocks, JSONB field handling (REQ TRCK-01, TRCK-02, TRCK-03)

---

## Sources

### Primary (HIGH confidence)
- Existing codebase (`src/hooks/useRecipes.ts`, `src/utils/nutrition.ts`, `src/components/recipe/RecipeBuilder.tsx`, `src/types/database.ts`) — direct read, patterns verified
- Existing migrations (`supabase/migrations/004_food_recipe.sql`) — RLS policy patterns, schema conventions
- `src/styles/global.css` — @theme tokens for design consistency

### Secondary (MEDIUM confidence)
- Supabase `upsert` with `onConflict` + `ignoreDuplicates` — documented behavior, consistent with supabase-js v2 API used in project
- Postgres `unique` constraint on composite keys + `on delete set null` — standard Postgres, no library-specific risk

### Tertiary (LOW confidence — acceptable, well-established standards)
- Dietary Reference Intakes (DRI) preset values — USDA 2020-2025 Dietary Guidelines, used as starting defaults only; users customize

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns exist in codebase
- Architecture (schema): HIGH — modeled on established Phase 2 patterns with clear extensions
- Pitfalls: HIGH — identified from direct code inspection and known Supabase/RLS edge cases
- Preset DRI values: MEDIUM — standard reference values, suitable as defaults

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (stable domain — Supabase, React 19, TanStack Query v5 are all stable)
