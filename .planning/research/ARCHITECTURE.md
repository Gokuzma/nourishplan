# Architecture Research

**Domain:** Family meal planning — v2.0 AMPS integration architecture
**Researched:** 2026-03-25
**Confidence:** HIGH (existing codebase analysed directly; integration points derived from code, not speculation)

---

## Context: What Already Exists

This document focuses on **how v2.0 features integrate with the existing NourishPlan architecture**. The existing system is fully built and production-deployed. New features must bolt onto it, not replace it.

**Existing stack (locked):**
- Vite + React 19 SPA, react-router-dom v7
- Supabase (Postgres + RLS + Auth + Edge Functions)
- TanStack Query — household-scoped cache keys (`['recipes', householdId]`, `['meal-plan', householdId, weekStart]`)
- Tailwind CSS 4, CSS-first `@theme` tokens
- PWA via workbox, deployed on Vercel

**Existing data model (do not break):**
- `custom_foods` — per-100g normalization, `household_id` scoped
- `recipes` / `recipe_ingredients` — polymorphic `ingredient_type: 'food'|'recipe'`, `ingredient_id: text`
- `meals` / `meal_items` — snapshot nutrition at insert (`calories_per_100g` stored on row)
- `meal_plans` / `meal_plan_slots` — `week_start date`, `unique(household_id, week_start)`
- `meal_plan_templates` / `meal_plan_template_slots`
- `nutrition_targets` — per `user_id` or `member_profile_id`, not both
- `food_logs` — full audit log with snapshot nutrient values at log time
- `member_profiles` — `is_child`, `managed_by`, for non-auth household members

**Existing hook pattern (all new hooks must match):**
```typescript
// Every hook reads householdId from useHousehold(), never passed as prop
const { data: membership } = useHousehold()
const householdId = membership?.household_id
useQuery({ queryKey: ['domain-entity', householdId, ...], enabled: !!householdId })
```

---

## System Overview: v2.0 Added Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Client Layer (existing PWA)                       │
├────────────────┬───────────────┬───────────────┬────────────────────┤
│  EXISTING      │  NEW v2.0     │  NEW v2.0     │  NEW v2.0          │
│  Pages/Views   │  Budget/Inv   │  Planner UX   │  Schedule/Feedback │
│  (unchanged)   │  Pages        │  (D&D upgrade)│  Pages             │
├────────────────┴───────────────┴───────────────┴────────────────────┤
│                    TanStack Query Cache (household-scoped)           │
│  existing keys          new keys:                                   │
│  ['recipes', hid]       ['inventory', hid]                          │
│  ['meal-plan', hid, w]  ['grocery-list', hid, weekStart]            │
│  ['meals', hid]         ['recipe-costs', hid]                       │
│                         ['member-schedules', hid]                   │
│                         ['feedback', hid, recipeId]                 │
├─────────────────────────────────────────────────────────────────────┤
│                    Existing hooks (unchanged)                        │
│  useRecipes  useMeals  useMealPlan  useHousehold  useNutritionTargets│
├─────────────────────────────────────────────────────────────────────┤
│                    NEW hooks (follow same pattern)                   │
│  useInventory  useRecipeCosts  useGroceryList                        │
│  useMemberSchedules  useFeedback  useBudget                          │
│  usePlannerEngine (constraint solver, client-side)                  │
├─────────────────────────────────────────────────────────────────────┤
│                    Supabase Backend                                  │
│  Auth  |  Postgres + RLS  |  Edge Functions                         │
│  (existing)               |  search-usda (existing)                 │
│                            |  generate-plan (NEW — constraint solver)|
└─────────────────────────────────────────────────────────────────────┘
```

---

## New Feature Integration Map

### 1. Budget Engine

**What it adds:** Cost per recipe/serving, weekly budget target, spend-vs-budget tracking.

**DB changes (new tables):**
```sql
-- Recipe cost: user-entered cost per batch, references existing recipes table
recipe_costs (
  id uuid PK,
  household_id uuid FK households,
  recipe_id uuid FK recipes,
  cost_per_batch numeric NOT NULL,       -- in household's currency
  servings_per_batch integer NOT NULL,   -- denominator for cost per serving
  notes text,
  updated_at timestamptz
)

-- Weekly budget target per household
household_budgets (
  id uuid PK,
  household_id uuid FK households UNIQUE,
  weekly_budget numeric NOT NULL,
  currency_code text NOT NULL DEFAULT 'CAD',
  updated_at timestamptz
)
```

**Existing tables modified:**
- None. Cost is stored in `recipe_costs` (separate from `recipes`) to avoid coupling nutrition and cost concerns.

**New hooks:**
- `useRecipeCosts(recipeId?)` — reads all `recipe_costs` for household or a single recipe
- `useHouseholdBudget()` — reads/upserts `household_budgets`
- `useWeeklySpend(weekStart)` — derived: joins `meal_plan_slots` → `meals` → `meal_items` → `recipe_costs`; returns estimated weekly spend from current plan

**Integration with existing system:**
- `RecipeBuilder` page gets a new "Cost" tab/section — calls `useRecipeCosts` and mutation to upsert
- `PlanPage` gets a budget summary row below the calendar — calls `useWeeklySpend`
- No changes to `useMealPlan` or `useMealPlanSlots`

**New component location:** `src/components/budget/` — `BudgetBar.tsx`, `RecipeCostForm.tsx`

---

### 2. Inventory Engine

**What it adds:** Pantry/fridge/freezer tracking with quantities and expiry priority.

**DB changes (new tables):**
```sql
inventory_items (
  id uuid PK,
  household_id uuid FK households,
  -- polymorphic: links to custom_foods or usda food (by string id)
  item_type text CHECK (item_type IN ('food', 'custom_food')),
  item_id text NOT NULL,               -- fdc_id string or custom_food uuid
  item_name text NOT NULL,             -- snapshot name at entry time
  quantity_grams numeric NOT NULL,
  location text CHECK (location IN ('pantry', 'fridge', 'freezer')),
  expiry_date date,
  created_at timestamptz,
  updated_at timestamptz
)
```

**Integration with existing system:**
- Grocery List generation (feature 3) reads inventory to flag items already on hand
- Planning Engine (feature 7) uses inventory as a constraint input (prefer recipes using near-expiry items)
- `FoodSearchOverlay` can be reused as the item picker for adding inventory items — same search flow, different destination

**New page:** `src/pages/InventoryPage.tsx`
**New hook:** `useInventory()` — CRUD for `inventory_items`, scoped to household

**Key design decision:** `item_id` is a text field (same pattern as `recipe_ingredients.ingredient_id`) to support both USDA fdcId strings and custom_food UUIDs without a polymorphic FK constraint.

---

### 3. Grocery List Generation

**What it adds:** Auto-aggregated grocery list from the current week's meal plan, categorized, with inventory deduction.

**How it works:**
1. Walk `meal_plan_slots` → `meals` → `meal_items` for the target week
2. For `item_type = 'recipe'` items: expand via `recipe_ingredients` to leaf foods
3. Aggregate quantities by food identity (same `item_id`)
4. Subtract matching `inventory_items.quantity_grams` — result is "still need to buy"
5. Categorize: pantry staples / produce / protein / dairy / other (heuristic or user tag)

**DB changes:**
```sql
-- Persisted grocery lists (generated + user-edited)
grocery_lists (
  id uuid PK,
  household_id uuid FK households,
  week_start date NOT NULL,
  generated_at timestamptz,
  UNIQUE (household_id, week_start)
)

grocery_list_items (
  id uuid PK,
  list_id uuid FK grocery_lists,
  item_name text NOT NULL,
  item_id text,                -- nullable: null for freeform user additions
  quantity_grams numeric,
  display_quantity text,       -- "2 cups", "300g" — user-friendly
  category text,
  checked boolean DEFAULT false,
  from_inventory boolean DEFAULT false,  -- flagged as already owned
  sort_order integer
)
```

**Generation approach:** Client-side computation preferred for v2 (avoids Edge Function latency for a synchronous user action). New `src/utils/groceryList.ts` utility — pure function that takes `SlotWithMeal[]` + `RecipeIngredient[][]` + `InventoryItem[]` and returns aggregated items. TanStack Query wraps it with `queryFn` calling the util, `enabled` when plan slots and ingredients are loaded.

**Alternative (Edge Function):** Only needed if the aggregation query becomes too large for client-side joins. Flag for reassessment if recipes routinely exceed 20 ingredients.

**New hooks:** `useGroceryList(weekStart)` — reads/generates list; `useGroceryListItems(listId)` — CRUD for items including user check-off and freeform additions

**New page:** `src/pages/GroceryPage.tsx`

---

### 4. Prep Optimization

**What it adds:** Prep schedule, task sequencing, batch cooking opportunities, equipment tracking.

**DB changes (new tables):**
```sql
-- Prep tasks linked to recipes (user-entered or generated)
recipe_prep_tasks (
  id uuid PK,
  household_id uuid FK households,
  recipe_id uuid FK recipes,
  task_name text NOT NULL,
  duration_minutes integer,
  equipment text[],            -- ['oven', 'stand_mixer']
  can_batch boolean DEFAULT false,
  day_offset integer DEFAULT 0  -- 0=same day, -1=day before, etc.
)

-- Weekly prep schedule (which tasks to do on which day)
prep_schedule_slots (
  id uuid PK,
  plan_id uuid FK meal_plans,
  task_id uuid FK recipe_prep_tasks,
  scheduled_day integer,       -- 0-6 day index
  scheduled_at time,
  completed boolean DEFAULT false
)
```

**Integration with existing system:**
- `PlanPage` gets a "Prep" tab showing the generated prep schedule for the week
- Prep schedule is derived from `meal_plan_slots` + `recipe_prep_tasks`; generation is client-side logic in `src/utils/prepSchedule.ts`

**New hooks:** `usePrepTasks(recipeId)`, `usePrepSchedule(planId)`

**Build order note:** Prep tasks are recipe metadata — build after Budget and Inventory are stable since prep optimization is low-urgency compared to cost and grocery tracking.

---

### 5. Schedule Model

**What it adds:** Per-member weekly schedule (work/school days, eating patterns, prep availability) as planning constraints.

**DB changes (new tables):**
```sql
member_schedules (
  id uuid PK,
  household_id uuid FK households,
  -- polymorphic member ref (same pattern as nutrition_targets)
  user_id uuid REFERENCES auth.users,
  member_profile_id uuid REFERENCES member_profiles,
  day_index integer CHECK (day_index BETWEEN 0 AND 6),
  is_work_day boolean DEFAULT false,
  available_for_prep boolean DEFAULT true,
  preferred_slots text[],      -- ['Breakfast', 'Lunch', 'Dinner']
  notes text,
  CONSTRAINT member_schedules_one_owner CHECK (
    (user_id IS NOT NULL AND member_profile_id IS NULL)
    OR (user_id IS NULL AND member_profile_id IS NOT NULL)
  )
)
```

**Integration with existing system:**
- `SettingsPage` or new `SchedulePage` page for schedule entry
- Planning Engine (feature 7) reads `member_schedules` as a constraint input
- `useNutritionTargets` is the precedent pattern for the polymorphic owner constraint — reuse the same check constraint pattern

**New hook:** `useMemberSchedules()` — CRUD, scoped to household, same polymorphic owner pattern as `nutrition_targets`

---

### 6. Feedback and Learning Engine

**What it adds:** Recipe ratings, satiety feedback, repeat rate tracking. Used by the planning engine to weight future suggestions.

**DB changes (new tables):**
```sql
recipe_feedback (
  id uuid PK,
  household_id uuid FK households,
  recipe_id uuid FK recipes,
  -- polymorphic member ref
  user_id uuid REFERENCES auth.users,
  member_profile_id uuid REFERENCES member_profiles,
  rating integer CHECK (rating BETWEEN 1 AND 5),   -- NULL = not rated
  satiety_score integer CHECK (satiety_score BETWEEN 1 AND 5), -- NULL = not rated
  log_date date NOT NULL,          -- which day this feedback is from
  notes text,
  created_at timestamptz
)
```

**Integration with existing system:**
- `food_logs` already captures what was eaten and when — feedback is a separate signal linked by `recipe_id` and `log_date` rather than `food_log_id`, to avoid coupling
- `HomePage` (daily log view) gets a "Rate this meal" affordance after logging
- Planning Engine reads `recipe_feedback` to compute a household preference score per recipe: `AVG(rating)` weighted by recency

**New hook:** `useFeedback(recipeId?)` — submit and read feedback

**Note on learning:** "AI-driven optimization" is out of scope per PROJECT.md. The learning here is simple statistical weighting (average rating, recency decay) — no ML required. Implement as a pure function in `src/utils/plannerScoring.ts`.

---

### 7. Constraint-Based Planning Engine

**What it adds:** Generates a weekly meal plan optimized against nutrition targets, budget, schedule, inventory, and feedback signals.

**Architecture decision: client-side vs Edge Function**

The constraint solver must run somewhere. The constraints are:
- Nutrition: each day's meals must hit ~80-120% of each member's calorie/macro target
- Budget: weekly cost ≤ `household_budgets.weekly_budget`
- Schedule: don't schedule a complex-prep meal on work days
- Inventory: prefer recipes using near-expiry inventory items
- Feedback: downweight recipes rated < 3, avoid repeats within 2 weeks

**Recommendation: Edge Function** for generation, not client-side.

Rationale: The solver must read `meal_plan_slots`, `meals`, `recipe_costs`, `inventory_items`, `member_schedules`, `recipe_feedback`, and `nutrition_targets` — 6+ tables. A client-side solver requires loading all this data before computing, resulting in large query payloads and slow initial load. An Edge Function can do a single server-side query across all tables and return a proposed plan. The client just shows the result and lets the user accept/modify.

```
New Edge Function: supabase/functions/generate-plan/index.ts

Input:  { householdId, weekStart, constraints: { budgetEnabled, scheduleEnabled, feedbackEnabled } }
Output: { proposed_slots: [{ day_index, slot_name, meal_id, reason }] }

Server-side reads:
  - SELECT FROM meals WHERE household_id = $1 (candidate pool)
  - SELECT FROM recipe_costs WHERE household_id = $1
  - SELECT FROM inventory_items WHERE household_id = $1
  - SELECT FROM member_schedules WHERE household_id = $1
  - SELECT FROM recipe_feedback WHERE household_id = $1
  - SELECT FROM nutrition_targets WHERE household_id = $1
  - SELECT FROM meal_plans WHERE household_id = $1 (last 4 weeks, for repeat avoidance)

Algorithm: greedy assignment with scoring (not true constraint satisfaction for v2)
  For each slot (day × slot_name):
    Score each candidate meal:
      + nutrition fit score (how close to member targets)
      + budget score (cost per serving vs. remaining budget)
      - schedule penalty (complex prep on work day)
      + inventory score (uses near-expiry items)
      + feedback score (average rating, recency weighted)
      - repeat penalty (appeared in last 2 weeks)
    Assign highest-scoring meal to slot
```

**DB changes:** None for generation. The output is written as regular `meal_plan_slots` rows via the existing `useAssignSlot` mutation.

**New hooks:** `useGeneratePlan(weekStart)` — calls the Edge Function, returns proposed slots; separate from `useAssignSlot` (which commits individual slots)

**New component:** `src/components/plan/GeneratePlanModal.tsx` — shows proposed plan with reasons, allows user to accept all / accept partial / reject

---

### 8. Dynamic Portioning

**What it adds:** Advanced per-person portion models beyond current "servings × calories_per_serving" suggestions.

**Integration with existing system:**
- Current: `useMealPlanSlots` returns `meal_items` with `calories_per_100g`; portion suggestion is computed in the UI as `(target_calories × meal_fraction) / calories_per_serving`
- v2.0: Add `portion_mode` to `nutrition_targets` (e.g., `'calorie_match' | 'macro_split' | 'fixed_grams'`) to allow different suggestion strategies

**DB changes (existing table modified):**
```sql
-- Add to nutrition_targets
ALTER TABLE nutrition_targets
  ADD COLUMN portion_mode text NOT NULL DEFAULT 'calorie_match'
    CHECK (portion_mode IN ('calorie_match', 'macro_split', 'fixed_grams'));
```

**Integration point:** `src/utils/portionSuggestion.ts` — new utility (or extension of existing logic) that accepts `NutritionTarget` (with `portion_mode`) and computes suggested grams. Called from `LogMealModal` and plan display components.

**New component change:** `MemberTargetsPage` gets a `portion_mode` selector.

---

### 9. Drag-and-Drop Planner

**What it adds:** UX upgrade for meal plan editing — drag meals between slots.

**Integration with existing system:**
- Current: `PlanPage` uses `SlotCard` with explicit meal picker modal for assignment
- v2.0: Wrap the plan grid with a drag-and-drop library; drop calls the existing `useAssignSlot` mutation

**Library choice:** `@dnd-kit/core` + `@dnd-kit/sortable` — framework-agnostic, works with React 19, no HTML5 drag-and-drop hacks, accessible, touch-friendly (required for mobile-first PWA). Do NOT use `react-beautiful-dnd` (unmaintained).

**DB changes:** None. Drag-and-drop is a UI layer — it calls the existing `useAssignSlot` and `useClearSlot` mutations.

**Components modified:**
- `src/pages/PlanPage.tsx` — add `DndContext` wrapper
- `src/components/plan/SlotCard.tsx` — add `useDraggable` / `useDroppable`
- `src/components/plan/DayCard.tsx` — becomes a droppable zone per day

**Note:** `@dnd-kit/core` is currently at v6 and stable; install `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.

---

### 10. Child/Selective Eater Support

**What it adds:** Expanded dietary accommodation for children and picky eaters — food exclusions, texture preferences, allergen flags.

**DB changes (new tables):**
```sql
member_dietary_restrictions (
  id uuid PK,
  household_id uuid FK households,
  user_id uuid REFERENCES auth.users,
  member_profile_id uuid REFERENCES member_profiles,
  restriction_type text NOT NULL,   -- 'allergen', 'dislike', 'texture', 'vegetarian', etc.
  food_id text,                     -- nullable: specific food exclusion (fdc_id or custom_food uuid)
  food_group text,                  -- nullable: category exclusion (e.g., 'seafood')
  notes text,
  CONSTRAINT member_dietary_one_owner CHECK (
    (user_id IS NOT NULL AND member_profile_id IS NULL)
    OR (user_id IS NULL AND member_profile_id IS NOT NULL)
  )
)
```

**Integration with existing system:**
- `MemberTargetsPage` (or new `MemberProfilePage`) gets a dietary restrictions section
- Planning Engine reads `member_dietary_restrictions` to filter candidate meals
- `PlanPage` can show a warning icon if a planned meal contains an excluded food for any member

**New hook:** `useDietaryRestrictions(memberId?)` — CRUD, scoped to household

---

## Component Boundaries

| Component | Responsibility | Status | Communicates With |
|-----------|---------------|--------|-------------------|
| `BudgetBar` | Displays weekly spend vs. budget on PlanPage | NEW | `useWeeklySpend`, `useHouseholdBudget` |
| `RecipeCostForm` | Cost entry on RecipeBuilder | NEW | `useRecipeCosts` (mutation) |
| `InventoryPage` | CRUD for pantry/fridge/freezer items | NEW | `useInventory`, `FoodSearchOverlay` (reused) |
| `GroceryPage` | Generated + editable grocery list | NEW | `useGroceryList`, `useGroceryListItems` |
| `GeneratePlanModal` | Shows proposed plan, accept/reject UI | NEW | `useGeneratePlan`, `useAssignSlot` |
| `PlanPage` (modified) | Add DndContext, GeneratePlan button, BudgetBar | MODIFIED | All plan hooks + new ones |
| `MemberTargetsPage` (modified) | Add portion_mode selector, dietary restrictions | MODIFIED | `useNutritionTargets`, `useDietaryRestrictions` |
| `SettingsPage` (modified) | Add member schedule entry | MODIFIED | `useMemberSchedules` |
| `SlotCard` (modified) | Add draggable handle | MODIFIED | `@dnd-kit/core` |
| `FoodSearchOverlay` | Reused as food picker for inventory entry | UNCHANGED | Already generic |

---

## Recommended Project Structure (additions only)

```
src/
├── components/
│   ├── budget/            # NEW — BudgetBar, RecipeCostForm
│   ├── inventory/         # NEW — InventoryItem, InventoryList, InventoryForm
│   ├── grocery/           # NEW — GroceryListItem, GroceryCategory
│   ├── prep/              # NEW — PrepTaskForm, PrepScheduleView
│   └── plan/
│       └── GeneratePlanModal.tsx  # NEW
├── hooks/
│   ├── useBudget.ts        # NEW — useHouseholdBudget, useWeeklySpend
│   ├── useRecipeCosts.ts   # NEW
│   ├── useInventory.ts     # NEW
│   ├── useGroceryList.ts   # NEW
│   ├── usePrepTasks.ts     # NEW
│   ├── useMemberSchedules.ts  # NEW
│   ├── useFeedback.ts      # NEW
│   └── useDietaryRestrictions.ts  # NEW
├── pages/
│   ├── InventoryPage.tsx   # NEW
│   └── GroceryPage.tsx     # NEW
├── utils/
│   ├── groceryList.ts      # NEW — pure aggregation function
│   ├── prepSchedule.ts     # NEW — pure prep task ordering
│   └── plannerScoring.ts   # NEW — meal scoring for planning engine
└── types/
    └── database.ts         # MODIFIED — add new table types
supabase/
└── functions/
    └── generate-plan/
        └── index.ts        # NEW — constraint solver Edge Function
```

---

## Data Flow: Key New Flows

### Plan Generation Flow
```
User clicks "Generate Plan" on PlanPage
    ↓
GeneratePlanModal opens
    ↓
useGeneratePlan(weekStart) → POST /functions/generate-plan
    ↓
Edge Function reads: meals, recipe_costs, inventory, schedules, feedback, targets
Edge Function scores each meal × slot → returns proposed_slots[]
    ↓
Modal shows proposed plan with reasons (e.g., "Uses chicken expiring Thursday")
    ↓
User accepts all / modifies / rejects
    ↓
For each accepted slot: useAssignSlot mutation (existing) writes to meal_plan_slots
    ↓
TanStack Query invalidates ['meal-plan-slots', planId] → PlanPage refreshes
```

### Grocery List Generation Flow
```
User opens GroceryPage for current week
    ↓
useGroceryList(weekStart) checks for existing grocery_lists row
    ↓ (none found)
Client runs groceryList.ts util:
  - reads useMealPlanSlots (already cached from PlanPage)
  - reads useRecipeIngredients for each recipe in plan
  - reads useInventory for deduction
  - aggregates + categorizes items
    ↓
Writes grocery_lists + grocery_list_items rows
    ↓
User can check items off, add manual items, regenerate
```

### Budget Tracking Flow
```
User opens PlanPage
    ↓
useWeeklySpend(weekStart) runs:
  - useMealPlanSlots (cached)
  - useRecipeCosts for each recipe in plan (cached)
  - sums: cost_per_batch / servings_per_batch × servings_in_plan
    ↓
BudgetBar shows: "Est. $87 of $150 budget"
```

---

## Build Order (Dependency-Aware)

The v2.0 features have a clear dependency DAG. Build order respects dependencies and value delivery.

```
Phase A — Budget Engine (no deps on other v2 features)
  ├── recipe_costs + household_budgets schema
  ├── useRecipeCosts, useHouseholdBudget, useWeeklySpend
  ├── RecipeCostForm (on RecipeBuilder)
  └── BudgetBar (on PlanPage)

Phase B — Inventory Engine (no deps on v2; used by grocery and planning)
  ├── inventory_items schema
  ├── useInventory
  └── InventoryPage (reuses FoodSearchOverlay)

Phase C — Grocery List (depends on: Budget A + Inventory B)
  ├── grocery_lists + grocery_list_items schema
  ├── groceryList.ts utility
  ├── useGroceryList, useGroceryListItems
  └── GroceryPage

Phase D — Schedule Model (no deps on other v2; feeds planning engine)
  ├── member_schedules schema
  ├── useMemberSchedules
  └── Schedule entry in SettingsPage or new page

Phase E — Feedback Engine (no deps on other v2; feeds planning engine)
  ├── recipe_feedback schema
  ├── useFeedback
  └── Rating affordance on HomePage post-log

Phase F — Drag-and-Drop Planner (no deps on other v2; pure UX upgrade)
  ├── Install @dnd-kit/core @dnd-kit/sortable
  ├── Modify SlotCard, DayCard, PlanPage
  └── No DB changes

Phase G — Child/Selective Eater Support (no deps on v2; feeds planning engine)
  ├── member_dietary_restrictions schema
  ├── useDietaryRestrictions
  └── Dietary restrictions section on MemberTargetsPage

Phase H — Constraint-Based Planning Engine (depends on: A+B+D+E+G for full constraints)
  ├── generate-plan Edge Function
  ├── useGeneratePlan
  └── GeneratePlanModal on PlanPage

Phase I — Prep Optimization (no hard deps; lowest urgency)
  ├── recipe_prep_tasks + prep_schedule_slots schema
  ├── usePrepTasks, usePrepSchedule
  └── Prep tab on PlanPage

Phase J — Dynamic Portioning (depends on: existing nutrition_targets; independent otherwise)
  ├── ALTER nutrition_targets ADD COLUMN portion_mode
  ├── portionSuggestion.ts utility update
  └── portion_mode selector on MemberTargetsPage
```

**Rationale for this order:**
- A and B first: Budget and Inventory are standalone, deliver immediate value, and unblock Grocery (C).
- C third: Grocery list is the most-requested v2 feature by users (per PROJECT.md) and has clear dependencies on A+B.
- D, E, F, G can be built in parallel or any order — they are independent.
- H last among core features: Planning engine is the keystone but only becomes useful once it has signals from budget (A), inventory (B), schedule (D), and feedback (E).
- I (Prep) is lowest priority — useful but not a blocker for any other feature.
- J (Dynamic Portioning) is a targeted enhancement to existing portioning logic; can be slotted anywhere after the data model is stable.

---

## Integration Points

### New vs Modified: Explicit List

| Item | Status | Notes |
|------|--------|-------|
| `recipes` table | UNCHANGED | Budget and prep data live in separate tables |
| `nutrition_targets` table | MODIFIED — add `portion_mode` column | Additive, backward-compatible |
| `recipe_costs` table | NEW | |
| `household_budgets` table | NEW | |
| `inventory_items` table | NEW | |
| `grocery_lists` / `grocery_list_items` tables | NEW | |
| `recipe_prep_tasks` / `prep_schedule_slots` tables | NEW | |
| `member_schedules` table | NEW | |
| `recipe_feedback` table | NEW | |
| `member_dietary_restrictions` table | NEW | |
| `generate-plan` Edge Function | NEW | |
| `search-usda` Edge Function | UNCHANGED | |
| `RecipePage` / `RecipeBuilder` | MODIFIED — add cost form | |
| `PlanPage` | MODIFIED — add D&D, budget bar, generate button | |
| `MemberTargetsPage` | MODIFIED — add portion_mode, dietary restrictions | |
| `SettingsPage` | MODIFIED — add schedule section | |
| `HomePage` | MODIFIED — add post-log feedback prompt | |
| `FoodSearchOverlay` | UNCHANGED — reused for inventory item entry | |
| All new hooks | NEW — follow `useHousehold()` pattern | |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `generate-plan` Edge Function ↔ client | HTTP POST via Supabase functions client | Returns proposed slots; client commits via existing mutations |
| `groceryList.ts` ↔ hooks | Direct function call (pure util) | No async; all data passed in; easy to test |
| `plannerScoring.ts` ↔ Edge Function | Imported into Edge Function | Same scoring logic reusable on client for preview |
| Budget calculation ↔ PlanPage | `useWeeklySpend` derived query | Depends on `useMealPlanSlots` being loaded first |
| Inventory ↔ Grocery generation | `useInventory` data passed into `groceryList.ts` | Inventory deducted from required quantities |
| `FoodSearchOverlay` ↔ `InventoryPage` | Prop: `onSelect` callback | No structural change to FoodSearchOverlay; InventoryPage provides different onSelect handler |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding Columns to `recipes` for v2 Concerns

**What people do:** Add `cost_per_batch`, `prep_time_minutes`, `difficulty` directly to the `recipes` table.
**Why it's wrong:** Mixes concerns. A recipe's nutritional structure should not be coupled to pricing or scheduling metadata. Cost changes without recipe changes (prices fluctuate); prep metadata is household-specific.
**Do this instead:** `recipe_costs` and `recipe_prep_tasks` as separate tables with `recipe_id` FK. Recipes stay clean.

### Anti-Pattern 2: Computing Weekly Spend in the Edge Function

**What people do:** Call the planning engine every time the budget bar needs updating.
**Why it's wrong:** Budget display is a derived query, not a planning operation. Edge Function cold start (~100ms) adds noticeable latency for a UI element.
**Do this instead:** `useWeeklySpend` is a TanStack Query that joins `meal_plan_slots` + `recipe_costs` client-side. Fast, cached, no Edge Function needed.

### Anti-Pattern 3: Coupling Grocery List to Meal Plan Structure at DB Level

**What people do:** Add a `grocery_list_id` FK to `meal_plan_slots`.
**Why it's wrong:** Creates a 1:1 coupling that breaks when the user regenerates the grocery list or edits slots after generation.
**Do this instead:** `grocery_lists` references `week_start` + `household_id` (same key as `meal_plans`). Lists are regenerated on demand; old list rows are replaced.

### Anti-Pattern 4: Running the Constraint Solver Synchronously in the UI Thread

**What people do:** Implement the planning engine as a client-side hook that blocks rendering while scoring hundreds of meal combinations.
**Why it's wrong:** Even a greedy algorithm scoring 50 meals × 21 slots = 1050 evaluations can cause perceptible jank on mobile.
**Do this instead:** Edge Function for generation (async, off main thread). Show a loading state in `GeneratePlanModal`. Return in < 2 seconds for a typical household.

### Anti-Pattern 5: Inventing a New RLS Pattern for New Tables

**What people do:** Write custom RLS policies for each new table from scratch.
**Why it's wrong:** The existing RLS pattern is battle-tested and consistent: household members read, household members insert (with household_id check), creator or admin updates/deletes. Deviating creates security gaps.
**Do this instead:** Every new table follows the established four-policy pattern. Copy from `meals` RLS as the template. Tables with polymorphic member owners (like `member_schedules`, `recipe_feedback`) follow the `nutrition_targets` policy pattern.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (< 500 households) | Client-side grocery aggregation, synchronous plan generation. All fine. |
| 1k–5k households | Edge Function for plan generation handles load well (Deno serverless). Client-side grocery agg remains fine. |
| 5k+ households | Add DB index on `inventory_items(household_id, expiry_date)` for planning queries. Consider caching `recipe_costs` aggregations. |

**First bottleneck for v2.0:** The `generate-plan` Edge Function doing 6+ table reads per invocation. Mitigate with a single CTE query rather than 6 separate selects. Index `recipe_feedback(household_id, recipe_id)`.

---

## Sources

- Existing codebase analysis (direct read): `src/types/database.ts`, `src/hooks/useMealPlan.ts`, `src/hooks/useRecipes.ts`, `supabase/migrations/008_meals_plans_targets.sql`, `src/App.tsx`
- `@dnd-kit` documentation: https://docs.dndkit.com/ — React 19 compatible, maintained, accessible
- Supabase Edge Functions docs: https://supabase.com/docs/guides/functions
- TanStack Query derived queries pattern: https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries
- Existing pattern precedent: `nutrition_targets` polymorphic owner constraint as template for `member_schedules`, `recipe_feedback`, `member_dietary_restrictions`

---
*Architecture research for: NourishPlan v2.0 AMPS — integration with existing architecture*
*Researched: 2026-03-25*
