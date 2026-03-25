# Pitfalls Research

**Domain:** Adding budget tracking, inventory management, grocery lists, prep optimization, feedback/learning, and constraint-based planning to an existing Supabase + React meal planning app
**Researched:** 2026-03-25
**Confidence:** HIGH (critical pitfalls verified across multiple sources and direct analysis of existing codebase)

---

## Critical Pitfalls

### Pitfall 1: Budget Costs Stored on Recipe, Not Recipe-Ingredient

**What goes wrong:**
A `cost_per_serving` field is added to the `recipes` table and populated by user input. Later, when the inventory engine arrives and some ingredients are already in the pantry, the grocery list needs to know *which ingredients to deduct from the cost*. Because cost is a single scalar on the recipe, not broken down by ingredient, there is no way to compute "this recipe costs $X normally but $Y this week because you already have the chicken." The budget engine becomes correct only for the full-pantry case and useless for the partial-inventory case.

**Why it happens:**
Budget is built as phase one of the feature set. Inventory arrives later. The developer adds cost at the recipe level as the simplest model, assuming the budget story is just "recipes have costs." The integration requirement only surfaces when grocery list generation must deduct owned ingredients.

**How to avoid:**
Store ingredient-level cost from day one. Add a `cost_per_unit` (or `cost_per_100g`) field to recipe ingredients. Recipe-level cost is always *computed* by summing ingredient costs, never stored directly. This way the grocery list can produce: "Buy 400g chicken ($3.20), you already have onion — net cost $3.20 instead of $4.50."

**Warning signs:**
- `cost_per_serving` field exists on the `recipes` table
- No cost field exists on `recipe_ingredients`
- Budget feature ships before inventory feature and has no `ingredient_id` join in its data model

**Phase to address:** Budget Engine phase — before inventory engine is designed

---

### Pitfall 2: Inventory Quantities Stored as Point-in-Time Snapshots Instead of Ledger Events

**What goes wrong:**
An `inventory` table is created with columns `ingredient_id, household_id, quantity_grams, expiry_date`. Users update the quantity when they use something or buy something. After three weeks, a household cannot answer "how fast do we go through oats?" or "when did we last buy this?" The expiry management logic has no event history to reason from, and the grocery list cannot distinguish "we have 50g left" from "we just bought 500g and used 450g in the last two days."

**Why it happens:**
An inventory as a snapshot (current state) is the obvious first model. It is how a physical pantry looks. The ledger model (events over time) feels like overengineering until the moment you need historical consumption rates for planning.

**How to avoid:**
Store inventory as ledger events: `{ingredient_id, event_type: 'purchase' | 'used' | 'expired' | 'adjusted', quantity_grams, occurred_at}`. The current inventory quantity is always computed by summing the ledger. Add a materialized view or computed column for the current quantity to avoid re-summing on every read. The v2.0 planning engine and feedback system both need consumption rate history — this is non-negotiable.

**Warning signs:**
- `inventory` table has a `quantity_grams` column that is updated in-place
- No `inventory_events` or `inventory_ledger` table exists
- Grocery list logic reads `quantity_grams` directly from inventory without any join to a history table

**Phase to address:** Inventory Engine phase — schema must be ledger-based before any UI is built

---

### Pitfall 3: Grocery List Aggregation Breaks on Unit Heterogeneity

**What goes wrong:**
The grocery list sums ingredient quantities across all meal plan slots for the week. Recipe A calls for "200g chicken breast." Recipe B calls for "1 chicken breast (roughly 150g)." The aggregation cannot merge these because one is grams and the other is count-with-weight-hint. The generated list shows two separate chicken entries. Worse, if a third recipe stores chicken as "2 cups shredded" (volume), the list now has three separate chicken line items with incompatible units.

**Why it happens:**
The existing `recipe_ingredients` table stores `quantity_grams` which is always grams — clean for nutrition math. But grocery shopping does not work in grams for every item. Developers add display unit metadata later (cans, cups, pieces), and the aggregation logic was never designed to handle unit normalization.

**How to avoid:**
Define a canonical aggregation unit per ingredient category at the grocery list layer, separate from the nutrition storage layer. Grocery aggregation always works in grams internally (which you already have), and converts to the most human-friendly display unit for that ingredient category at render time. Items that cannot be meaningfully merged (e.g., "1 can tomatoes" vs "200g fresh tomatoes") should stay separate. Document this rule explicitly in the grocery list engine.

**Warning signs:**
- Grocery list engine iterates meal plan slots and sums `quantity_grams` without an ingredient identity resolution step
- Two recipe ingredients pointing to the same USDA food ID are not merged because one is via a custom food alias
- No category-to-display-unit mapping table exists

**Phase to address:** Grocery Aggregation phase — requires ingredient identity normalization before aggregation logic is written

---

### Pitfall 4: Constraint Solver Built as a Server-Side Monolith That Blocks the UI

**What goes wrong:**
The meal plan generator is implemented as a Supabase Edge Function that runs a greedy constraint-satisfaction loop, calling the DB for each candidate recipe until constraints are met. With a household of 4 people, 10 constraints (nutrition, budget, schedule, preferences, inventory), and a recipe catalog of 100+ recipes, the solver takes 8–15 seconds per run. The React UI blocks on this with a spinner. Users abandon the generation before it completes. The solver also cannot be interrupted if the user changes a constraint mid-run.

**Why it happens:**
A server-side function is the simplest deployment target for something "complex." The developer uses a synchronous loop because async constraint solving is harder to reason about. Performance is not tested until the catalog grows.

**How to avoid:**
Do not run the constraint solver synchronously in an API route. Use an async job pattern: the client submits a generation request, the server starts an async worker (Supabase Background Tasks or a Postgres `pg_cron` job), and the client polls or subscribes to a `plan_generation_jobs` table for status updates. The UI shows progress ("Found breakfast for Mon-Wed, solving dinner...") rather than blocking. Cap the solver at a maximum iteration count and return a partial plan with explanations if fully optimal is not achievable within the time budget.

**Warning signs:**
- Edge function implementation has a `for` loop iterating over recipe candidates inside a synchronous handler
- Generation request times out at 10s under the default Vercel/Supabase Edge Function limit
- No `plan_generation_jobs` table or status polling mechanism exists

**Phase to address:** Constraint-based Planning Engine phase — architecture decision must be made before first line of solver code is written

---

### Pitfall 5: Feedback Signals Collected Without a Stable Identity Key, Making Them Unlearnable

**What goes wrong:**
Recipe ratings are stored as `{recipe_id, user_id, rating}`. Repeat rate and satiety signals are stored similarly. But the learning engine needs to know: "this household consistently rates pasta dishes highly" and "this member finds high-fat meals unsatisfying." For these inferences to work, feedback must be joinable to recipe attributes (cuisine, macros, prep time). If recipe ingredients or metadata can be edited after feedback is collected, the feedback signals become uninterpretable — the recipe that got 5 stars is not the same recipe anymore.

**Why it happens:**
Feedback collection (phase N) is built after the recipe editor (phase M). The recipe editor allows free editing. Nobody adds a "lock on feedback" rule because it seems restrictive. The learning engine (phase N+2) then tries to train on data where the target (recipe attributes) has been mutated by user edits.

**How to avoid:**
Feedback signals must join to recipe attribute snapshots, not live recipe records. When a user rates a recipe, capture the attributes that matter for learning (cuisine_tag, prep_time_minutes, dominant_macro, avg_cost) at the time of rating in the feedback record itself. This is the same denormalization pattern used in food logs — log what was true at the moment of the event, not a reference to a mutable record.

**Warning signs:**
- `recipe_feedback` table has only `recipe_id` as the join key with no snapshotted attributes
- The learning engine queries `recipe_feedback JOIN recipes` to get recipe attributes
- Recipe editing is allowed without any version or snapshot mechanism

**Phase to address:** Feedback and Learning Engine phase — schema must snapshot attributes at feedback time

---

### Pitfall 6: TanStack Query Cache Becomes Incoherent as Feature Count Grows

**What goes wrong:**
v1.x has ~8 query keys. v2.0 adds: inventory, grocery lists, budget summaries, prep schedules, feedback records, generation job status, and constraint profiles. Each new mutation now has multiple cross-cutting cache dependencies. Deleting a recipe should invalidate: `['recipes']`, `['meals']`, `['meal-plan-slots']`, `['grocery-list']`, `['budget-summary']`, `['prep-schedule']`. The existing pattern of listing invalidations manually in each `onSuccess` handler breaks down. Different developers add different subsets of invalidations for similar mutations. The UI shows stale budget and grocery data after plan edits.

**Why it happens:**
The v1.x pattern of `queryClient.invalidateQueries(['recipes'])` in `onSuccess` worked fine for 8 queries with shallow dependencies. The pattern does not scale to a graph of interdependencies. New features are added one at a time and each developer only invalidates what they know about at the time.

**How to avoid:**
Before adding v2.0 features, define a query key hierarchy and a dependency graph that is centralized in a single file (e.g., `src/lib/queryKeys.ts`). For each mutation type, document which query key groups must be invalidated. Consider adopting a `broadcastQueryClient` pattern where mutations emit domain events that trigger invalidations declaratively. At minimum, add integration tests that assert specific queries are stale after common mutations.

**Warning signs:**
- `onSuccess` handlers across different hooks each manually list different subsets of `invalidateQueries` calls
- No centralized query key registry exists
- After editing a recipe, the grocery list on the same page still shows the old ingredient quantities

**Phase to address:** Pre-v2.0 refactor or first v2.0 infrastructure phase — before new feature queries are added

---

### Pitfall 7: Prep Schedule Solver Overengineered as a Full Task-Scheduling System

**What goes wrong:**
Prep optimization becomes a scheduling research project. The developer implements a full task-dependency graph with equipment constraints (only one oven, two burners), time windows, parallel task execution, and Gantt chart output. The algorithm takes 3 weeks to build. Users don't use it because the output is a wall of text scheduling steps in 5-minute increments that doesn't match how people actually cook.

**Why it happens:**
The problem description ("sequencing tasks to minimize total prep time") maps naturally to job-shop scheduling, which is NP-complete and well-studied in academic literature. Developers find the algorithmic challenge interesting and over-invest. The user need ("help me decide what to prep Sunday so weeknight cooking is fast") is simpler than what gets built.

**How to avoid:**
Scope prep optimization to three user-facing outputs only: (1) a weekly batch prep list ("make these 3 items on Sunday"), (2) a day-of sequence ("start the chicken before the rice because chicken takes longer"), and (3) freezer suggestions ("this recipe freezes well, make double"). Do not build equipment constraint modeling or minute-level scheduling. Use simple heuristics: longest-cook-time first, batch items with shared ingredients together, flag freezer-friendly recipes. The heuristic approach delivers 80% of the user value at 10% of the implementation cost.

**Warning signs:**
- The prep engine has a concept of "equipment" as a constraint variable
- Prep schedule output has sub-15-minute time increments
- The prep feature depends on an external scheduling library (no external library should be needed for heuristic-based prep suggestions)

**Phase to address:** Prep Optimization phase — define output format before writing any algorithm code

---

### Pitfall 8: Child/Selective Eater Constraints Modeled as a Boolean "Picky" Flag

**What goes wrong:**
A `is_picky_eater` boolean is added to `member_profiles`. The constraint engine uses it to... do what exactly? The constraint cannot do anything useful with a boolean. The developer then adds `disliked_foods[]` which grows into a free-form array. The planning engine tries to exclude meals containing disliked foods, but the join from `disliked_foods` to `meal_items` to `recipe_ingredients` to `foods` is expensive and still does not handle synonyms ("chicken" vs "poultry" vs specific USDA food IDs).

**Why it happens:**
Child/selective eater support is added as a late feature with an unclear data model. The developer thinks: "picky eaters don't like certain foods, so store the foods they don't like." The constraint engine then inherits an ambiguous data structure it cannot reason about cleanly.

**How to avoid:**
Model dietary constraints as structured preference profiles, not food exclusion lists. Each member has a set of `constraint_rules`: `{rule_type: 'exclude_ingredient' | 'exclude_cuisine' | 'exclude_allergen' | 'require_allergen_free' | 'max_spice_level', value: string}`. The planning engine evaluates rules against recipe tags, not ingredient lists. Recipe tagging (allergen, cuisine, spice level) must be built before the constraint engine can use it. This means the child support feature depends on a recipe tagging system being in place first.

**Warning signs:**
- `member_profiles` has a `disliked_foods` column of type `text[]` or `uuid[]`
- The constraint engine queries `recipe_ingredients` to exclude individual foods by ID
- No recipe tagging system (allergens, cuisine, dietary flags) exists when child support is implemented

**Phase to address:** Child/selective eater support phase — define constraint rule schema before implementing constraint engine, and ensure recipe tagging is built first

---

### Pitfall 9: Schedule-Aware Planning Stores Schedule as a String, Not a Structured Constraint

**What goes wrong:**
A `schedule_notes` text field is added to household or member profiles ("I work Mon-Wed, my spouse is home Fridays"). The planning engine cannot parse free text. The feature ships as user-provided context that gets displayed on the plan page but never actually influences plan generation. Users notice the schedule setting does nothing and stop trusting the planner.

**Why it happens:**
Schedule input is added as a UX feature (collect user info) before the planning engine is designed to consume it. Free text is the path of least resistance for data entry. The integration between schedule storage and plan generation is deferred and never completed.

**How to avoid:**
Define the schedule constraint schema from the demand side: what does the planning engine need to know to adjust a plan? Answer: `{member_id, day_of_week, availability_type: 'prep_available' | 'quick_only' | 'away', preferred_slot_duration_minutes}`. Build the UI to collect this structured data. Never store schedule information as free text. Ensure the planning engine has an explicit `schedule_constraints` input alongside `nutrition_constraints` and `budget_constraints`.

**Warning signs:**
- Schedule input is a `text` or `varchar` field in the database
- Schedule page exists in the UI but no constraint solver input references schedule data
- Plan generation ignores the day column when selecting recipes (all days treated equally)

**Phase to address:** Schedule Model phase — define the structured schema before building the schedule settings UI

---

### Pitfall 10: New Tables Added Without RLS Policies, Leaking Data Across Households

**What goes wrong:**
v2.0 adds 6–10 new tables (inventory, inventory_events, budget_targets, grocery_lists, prep_schedules, feedback, constraint_profiles, generation_jobs). Each table is created with RLS disabled by default in Supabase. Several are created during rapid prototyping and the developer forgets to add policies. The existing v1.x tables have correct RLS, so the developer assumes the app is secure. Household A can query Household B's inventory and budget data through the Supabase client SDK.

**Why it happens:**
RLS policies are added table-by-table during v1.x. The discipline is not enforced by CI or automated checks. New tables in v2.0 don't inherit policies from existing tables. The bug is invisible during development because the developer only tests with their own account.

**How to avoid:**
Add a CI check (a Postgres query against `pg_tables` and `pg_policies`) that fails the build if any table in the `public` schema has RLS disabled and no policies defined. Make this check part of the migration test suite. Template every new migration with RLS enable + household isolation policy stubs. The pattern is always: `ENABLE ROW LEVEL SECURITY` + `USING (household_id = (SELECT household_id FROM household_members WHERE user_id = auth.uid()))`.

**Warning signs:**
- A new migration file creates a table without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- The Supabase dashboard shows new tables with "RLS: Off" in the Table Editor
- No test exists that verifies cross-household data isolation for new tables

**Phase to address:** Every v2.0 phase that adds new tables — RLS must be in the same migration that creates the table, not deferred

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `cost_per_serving` on recipe table only | Budget feature ships faster | Cannot compute partial-inventory grocery cost; full rewrite needed when inventory engine arrives | Never — store cost at ingredient level from day one |
| Inventory as point-in-time quantity | Simpler data model | No consumption history; learning engine cannot compute reorder rates; expiry logic has no baseline | Never for a planning system that needs history |
| Grocery aggregation by ingredient name string match | Fast to implement | Two entries for "chicken" (USDA ID 12345 vs custom food "chicken breast") never merge; list is duplicated | MVP only, with ID-based matching added before launch |
| Constraint solver as synchronous API endpoint | Simpler deployment | Times out for large catalogs; blocks UI; not interruptible | Never for a solver expected to run in <5s |
| Recipe feedback joined to live recipe record | No snapshot logic needed | Recipe edits corrupt historical feedback; learning engine cannot train | Never once feedback collection is live |
| Prep schedule as full job-shop scheduler | Academically correct | Takes weeks to build; output unusable; users want heuristic batch suggestions | Never — heuristics are sufficient for home cooking |
| Schedule stored as free text | Easier UX to design | Planning engine cannot consume it; feature becomes cosmetic | Never if schedule is a planning input |
| Child constraints as `disliked_foods uuid[]` | Simple to build | Cannot join to recipes without expensive traversal; synonyms not handled | Only as a UI preference hint, never as a planning constraint |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Existing `recipe_ingredients` table | Adding `cost_per_unit` without defining what "unit" means relative to `quantity_grams` | Standardize on cost per 100g to match the existing nutrition storage convention; compute display unit prices at the presentation layer |
| TanStack Query with v2.0 mutations | Each new mutation handler independently lists `invalidateQueries` targets without coordination | Centralize query key definitions and dependency mapping in `src/lib/queryKeys.ts` before adding any v2.0 queries |
| Supabase RLS on new tables | New migrations create tables without enabling RLS (disabled by default) | Template: every `CREATE TABLE` migration is immediately followed by `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and a household isolation policy |
| Supabase Edge Functions for plan generation | Synchronous solver exceeds 10-second Edge Function timeout | Use async job pattern: write a `plan_generation_jobs` row, run solver in background, client polls job status |
| Existing `MealPlanSlot` structure | Grocery list generation queries plan slots without a stable week boundary, returning duplicate ingredients from overlapping week queries | Grocery list generation must accept an explicit `{week_start, household_id}` parameter and JOIN only slots within that week |
| dnd-kit for drag-and-drop planner | Using `@dnd-kit/core` with HTML5 drag backend breaks on iOS Safari (no native DnD API) | Use `@dnd-kit/core` exclusively (not react-beautiful-dnd which is deprecated) — dnd-kit uses pointer events and works cross-platform including touch |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Grocery list computed by loading all meal plan slots and all recipe ingredients in the client | Grocery list page takes 3–5s to load for a week with 21 meal slots, each referencing multi-ingredient recipes | Compute grocery aggregation in a Postgres function or Edge Function that returns the aggregated list directly; never do this join client-side | Once meal plans have 7+ days and recipes have 5+ ingredients each |
| Constraint solver iterating full recipe catalog on every generation attempt | Generation takes 10–30s; times out on Edge Functions | Pre-filter recipe candidates by hard constraints (allergens, excluded ingredients) before the optimization loop; index `household_id` on all lookup tables | Once household recipe catalog exceeds 30 recipes |
| Inventory ledger re-summed on every inventory read | Inventory page slow for households that have been using the app for 6+ months with daily events | Create a materialized view or a `inventory_current` table maintained by triggers; re-sum only when events are inserted | Once a household has >500 inventory ledger events |
| Feedback signals loaded per-recipe when rendering plan (N+1 pattern) | Plan page with 21 meals fires 21 separate feedback queries | Load all feedback for the visible week's recipes in a single query keyed by `[recipe_id IN (...)]` | Immediately on first load of a week with any feedback data |
| dnd-kit re-rendering all 21 plan slots on each drag event due to unoptimized context | Drag-and-drop feels laggy at 21 slots (7 days x 3 meals) | Wrap each slot in `React.memo`; use `useSortable` from `@dnd-kit/sortable` not a custom drag implementation | On first load if components are not memoized |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| New v2.0 tables (inventory, budget, feedback) created without RLS | Household A can read Household B's inventory quantities and budget limits via the Supabase client SDK | Add `ENABLE ROW LEVEL SECURITY` and household isolation policy in the same migration that creates the table |
| Constraint profile (dietary restrictions, allergens, health conditions) accessible to all household members | A child's allergen profile or an adult's dietary medical constraint visible to other members | Add member-level read policy: constraint profiles readable only by the owner and household admins |
| Plan generation job queue writable without auth check | Any authenticated user can submit a generation job for a household they don't belong to | Generation job INSERT policy: `WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()))` |
| Budget targets stored without any validation on the client | A client-side bug submits a $0.00 weekly budget, causing the solver to generate no plan and expose an unhandled error state | Validate budget constraints server-side in the Edge Function; return a structured error, not an uncaught exception |
| Feedback ratings accessible across households | Household B can query Household A's recipe ratings if recipe IDs are guessable (UUIDs reduce but don't eliminate this) | RLS on `recipe_feedback` table: `USING (household_id = ...)` even though recipe_id is a UUID |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Constraint solver returns "no valid plan found" with no explanation | Users don't know if the budget is too low, the schedule too constrained, or the recipe catalog too small to satisfy constraints | When generation fails, explain which constraint is most binding: "Your $80 budget couldn't cover 21 meals — try $95 or fewer meals" |
| Grocery list shows grams for every ingredient | "Add 347g oats" is not a grocery store unit | Convert to nearest practical purchase unit per ingredient category (oats → "1 bag (500g)", milk → "2L") |
| Inventory entry requires exact ingredient ID match | User types "chicken" but the inventory system expects a specific USDA food ID | Allow fuzzy ingredient entry for inventory; inventory tracks ingredient categories, not exact food IDs, unless the user explicitly links to a specific food |
| Drag-and-drop planner works on desktop but fails silently on mobile | Mobile users (the app's primary audience given it's a mobile-first PWA) cannot reorder meals | Test drag-and-drop on iOS Safari and Android Chrome before shipping; use pointer events, not mouse events |
| Feedback rating shown immediately after every meal log | Rating fatigue after 3 days; users ignore the prompt | Show feedback prompt only for recipes logged 3+ times, or weekly on the "plan review" screen, not on every log action |
| Budget summary shows weekly total only | User cannot see which meals are most expensive to identify substitution targets | Show cost per meal alongside total; flag the top-3 most expensive meals in the weekly summary |

---

## "Looks Done But Isn't" Checklist

- [ ] **Budget engine:** Shows cost per recipe — but verify cost is stored at ingredient level and can be partially computed when some ingredients are in inventory
- [ ] **Inventory engine:** Shows current quantities — but verify quantities are computed from a ledger, not stored as a mutable field; test that a "used" event reduces the displayed quantity
- [ ] **Grocery list:** Generates a list — but verify same-food ingredients from different recipes are merged by food ID (not name string), and inventory deduction reduces the listed quantity
- [ ] **Plan generation:** Returns a plan — but verify it runs asynchronously, does not block the UI, respects the time budget for the solver, and returns partial results with explanations on failure
- [ ] **Feedback collection:** Stores ratings — but verify feedback records snapshot recipe attributes at rating time so the learning engine does not join to a mutable recipe record
- [ ] **Prep schedule:** Shows prep tasks — but verify the output is batch prep suggestions and day-of sequence, not a minute-level Gantt chart that users will never follow
- [ ] **Schedule model:** Schedule settings are saved — but verify schedule data is stored as structured constraint rules that the planning engine actually reads, not free text
- [ ] **Child/selective eater:** Dietary constraints are saved — but verify constraints are structured rules (allergen, cuisine exclusion) that the planning engine evaluates against recipe tags, not a raw food exclusion list
- [ ] **Drag-and-drop planner:** Drag works on desktop — but verify it works on iOS Safari and Android Chrome (touch events)
- [ ] **New tables:** Feature data is stored — but verify every new table has `ENABLE ROW LEVEL SECURITY` and a household isolation policy

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Budget stored at recipe level (not ingredient level) | HIGH | Migrate `recipes.cost_per_serving` to `recipe_ingredients.cost_per_100g`; rebuild budget summary views; users must re-enter costs at the ingredient level |
| Inventory as mutable quantity (not ledger) | HIGH | Data migration: create `inventory_events` table; create a synthetic "initial balance" event for all existing inventory rows; deprecate mutable `quantity_grams` column; rewrite all inventory reads |
| Grocery aggregation by name string | MEDIUM | Add ingredient identity layer that resolves name strings to canonical food IDs before aggregation; re-test all existing grocery list outputs |
| Constraint solver as synchronous handler | MEDIUM | Introduce async job table; refactor Edge Function to write job row and return job ID; add client-side polling; existing solver logic can be reused |
| Feedback joined to live recipe (no snapshot) | HIGH | Backfill missing attribute snapshots from current recipe state (imperfect but recoverable); add snapshot columns to feedback records going forward; learning engine must handle partially-snapshotted history |
| New tables missing RLS | MEDIUM | Add RLS policies in a hotfix migration; audit all Supabase client queries that touch new tables for cross-household access; run cross-household access test suite |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Budget stored at recipe, not ingredient | Budget Engine | Create two recipes sharing an ingredient; verify total ingredient cost matches ingredient-level costs; partially deduct inventory and verify cost adjusts |
| Inventory as snapshot, not ledger | Inventory Engine | Insert a "purchase" event; insert a "used" event; verify current quantity is the difference; verify event history is queryable |
| Grocery list unit heterogeneity | Grocery Aggregation | Create two recipes using the same USDA food ID; verify grocery list shows one merged line item with combined quantity |
| Constraint solver blocks UI | Constraint-based Planning Engine | Submit a generation request; verify the API returns immediately with a job ID; verify the client can poll for status; verify partial results arrive if full solution times out |
| Feedback signals without attribute snapshots | Feedback and Learning Engine | Rate a recipe; edit the recipe; query the feedback record and verify the snapshot attributes match the original, not the edited, recipe |
| TanStack Query cache incoherence | First v2.0 infrastructure phase | Edit a recipe that appears in a meal plan; verify grocery list query is marked stale and refetches; verify budget summary also refetches |
| Prep schedule overengineered | Prep Optimization | Verify prep output contains only three output types (batch list, day-of sequence, freezer suggestions); verify no equipment modeling exists in the data schema |
| Child constraints as food exclusion list | Child/Selective Eater Support | Create an allergen rule for a member; verify the planning engine uses recipe tags (not ingredient traversal) to exclude non-compliant recipes |
| Schedule stored as free text | Schedule Model | Save a structured schedule constraint; verify the planning engine assigns quick-only recipes to busy days and prep-heavy recipes to available days |
| New tables missing RLS | Every v2.0 database migration | Query `pg_tables LEFT JOIN pg_policies` in CI; fail build if any public table has `rowsecurity = false` and zero policies |

---

## Sources

- Existing NourishPlan codebase (`src/types/database.ts`, `supabase/migrations/`) — direct analysis of current data model
- TanStack Query cache invalidation patterns: https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation
- "We kept breaking cache invalidation in TanStack Query": https://dev.to/ignasave/we-kept-breaking-cache-invalidation-in-tanstack-query-so-we-stopped-managing-it-manually-47k2
- Supabase RLS multi-tenant best practices: https://www.leanware.co/insights/supabase-best-practices
- Supabase RLS common mistakes: https://designrevision.com/blog/supabase-row-level-security
- Constraint-based meal planning complexity: https://www.tautvidas.com/blog/2020/04/overcomplicating-meal-planning-with-z3-constraint-solver/
- Scalable and Explainable Diet Recommendations via Answer Set Programming: https://ceur-ws.org/Vol-4072/paper6.pdf
- Cold start problem in recommender systems: https://www.tredence.com/blog/solving-the-cold-start-problem-in-collaborative-recommender-systems
- Grocery list ingredient merging behavior (Plan to Eat): https://learn.plantoeat.com/help/manually-merge-ingredients-on-your-shopping-list
- dnd-kit cross-platform drag-and-drop: https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react
- react-beautiful-dnd deprecation status: https://github.com/atlassian/react-beautiful-dnd/issues/2573
- Supabase Realtime performance lessons: https://medium.com/@saravananshanmugam/what-weve-learned-using-supabase-real-time-subscriptions-in-our-browser-extension-d82126c236a1
- Prep schedule heuristics for home cooking: https://healthhomeandhappiness.com/time-management-freezer-cooking-recipe-sequencing.html

---
*Pitfalls research for: NourishPlan v2.0 AMPS — adding budget, inventory, grocery, prep, feedback, and constraint planning to existing Supabase + React meal planning app*
*Researched: 2026-03-25*
