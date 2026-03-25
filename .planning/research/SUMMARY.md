# Project Research Summary

**Project:** NourishPlan v2.0 AMPS (Adaptive Meal Planning System)
**Domain:** Constraint-solving household meal planning PWA — adding budget, inventory, grocery, prep, feedback, and planning engine to an existing validated product
**Researched:** 2026-03-25
**Confidence:** HIGH (existing codebase analysed directly; stack locked; pitfalls verified against current code)

## Executive Summary

NourishPlan v2.0 extends a fully-built, production-deployed React + Supabase PWA with a constraint-solving meal planning layer (AMPS). The core value proposition is a planning engine that simultaneously optimises nutrition, cost, schedule availability, and household preference signals — something no current consumer competitor offers. The recommended approach is to build v2.0 as layered additions on top of the v1.0 architecture: standalone engines (Budget, Inventory, Schedule, Feedback, Drag-and-Drop) are built first in parallel, then a constraint-based planning engine is assembled on top of the accumulated signal data. This sequencing respects feature dependencies and ensures the planning engine has real data to work with before it ships.

The primary technical risks in this build are data model decisions made too early in the wrong shape. Three are non-negotiable: ingredient-level cost storage (not recipe-level), ledger-based inventory (not point-in-time quantities), and feedback records that snapshot recipe attributes at rating time. Getting any of these wrong requires an expensive data migration to recover. The secondary risk is the constraint solver architecture — it must run asynchronously via a Supabase Edge Function with job-status polling, not synchronously in a React hook or blocking API call. The UI pattern for plan generation is "submit, wait, accept/modify," not "click and render."

The drag-and-drop planner and grocery list are the highest-visibility v2.0 wins and can ship early. The constraint-based planning engine is the deepest differentiator but requires Budget, Schedule, Dietary, and Feedback engines to have accumulated data before it can deliver meaningful results. The roadmap should front-load the data-collection infrastructure and ship the planning engine after those signals have had time to accumulate.

---

## Key Findings

### Recommended Stack

The v1.0 stack (Vite + React 19, Supabase, TanStack Query, Tailwind CSS 4, Zustand, PWA via Workbox) is locked and not re-litigated. Net-new libraries for v2.0 are minimal and well-justified. See STACK.md for full rationale and alternatives considered.

**Core new technologies:**
- `@dnd-kit/core` + `@dnd-kit/sortable` (6.3.1 / 10.0.0) — drag-and-drop planner — actively maintained, works with React 19 via `--legacy-peer-deps`, touch-friendly for mobile-first PWA; do not use deprecated react-beautiful-dnd
- `yalps` (0.6.3) — LP solver for constraint-based plan generation — pure ESM, browser-native (no WASM), handles household-scale optimisation in milliseconds; use only if full LP needed (greedy scoring handles v2.0 MVP)
- `date-fns` (4.1.0) — schedule and week-boundary arithmetic — tree-shakeable, ESM-only, v4 adds timezone support
- `react-hook-form` (7.72.0) + `zod` (4.x) + `@hookform/resolvers` (3.x) — complex multi-field forms for budget and inventory entry

No ML/AI libraries, no calendar components, no grocery price APIs, no barcode scanning — all explicitly out of scope per PROJECT.md.

### Expected Features

See FEATURES.md for full prioritisation matrix and competitor analysis.

**Must have — table stakes for v2.0 launch (P1):**
- Budget tracking: cost per recipe and ingredient, weekly total with remaining balance
- Inventory management: pantry/fridge/freezer entry with quantities and expiry date (manual only)
- Grocery list: auto-generated from meal plan, categorised by store aisle, with pantry subtraction ("already have" vs "need to buy")
- Per-member dietary tags and avoided foods list (allergen, gluten-free, vegetarian, etc.)
- Drag-and-drop weekly planner — competitors (Plan to Eat, Ollie) make this a UX baseline
- Recipe star rating (1–5) and satiety feedback (3-point) — starts accumulating planning signal

**Should have — competitive differentiators (P2):**
- Schedule-aware planning: availability windows as planning inputs — no competitor supports this
- Constraint-based plan generation: multi-factor optimisation (nutrition + cost + time + preference) — no consumer app does this
- Prep optimisation: batch prep suggestions and day-of task sequencing (not minute-level Gantt charts)
- Repeat rate tracking and diversity warnings
- Expiry-priority ingredient weighting in plan generation

**Defer to v3+:**
- AI-driven adaptive plans — requires months of accumulated feedback signal per PROJECT.md
- Barcode scanning, grocery delivery integration, social recipe sharing — all explicitly deferred per PROJECT.md

Key dependency constraint: the constraint-based planning engine requires Budget, Schedule, Dietary, and Feedback engines to have accumulated data before it generates meaningful plans. These data-collection phases must ship early even if the planning engine ships later.

### Architecture Approach

The architecture is additive: new features bolt onto the existing system via new Supabase tables, new TanStack Query hooks following the established `useHousehold()` pattern, and new page/component directories. The existing `recipes`, `meals`, `meal_plan_slots`, and `food_logs` tables are not changed (except `nutrition_targets` gets an additive `portion_mode` column). The constraint solver runs as a Supabase Edge Function (`generate-plan`) — it reads 6+ tables in a single CTE query and returns proposed slots; the client commits them via existing `useAssignSlot` mutations. Grocery list aggregation is client-side pure utility in `groceryList.ts` using already-cached query data.

**Major new components:**
1. Budget Engine — `recipe_costs` + `household_budgets` tables; `BudgetBar` on PlanPage; `RecipeCostForm` on RecipeBuilder
2. Inventory Engine — `inventory_items` (ledger-based) table; `InventoryPage` reusing `FoodSearchOverlay`
3. Grocery Engine — `grocery_lists` + `grocery_list_items` tables; `groceryList.ts` pure utility; `GroceryPage`
4. Schedule Model — `member_schedules` table; schedule UI in SettingsPage; feeds Planning Engine
5. Feedback Engine — `recipe_feedback` table (with attribute snapshots); post-log rating prompt on HomePage
6. Drag-and-Drop Planner — no DB changes; wraps existing `PlanPage` grid with dnd-kit
7. Dietary Restrictions — `member_dietary_restrictions` table; section on MemberTargetsPage; feeds Planning Engine
8. Constraint-Based Planning Engine — `generate-plan` Edge Function (async job pattern); `GeneratePlanModal`
9. Prep Optimisation — `recipe_prep_tasks` + `prep_schedule_slots` tables; heuristic-only utilities
10. Dynamic Portioning — additive `portion_mode` column on `nutrition_targets`; updated `portionSuggestion.ts`

### Critical Pitfalls

See PITFALLS.md for full pitfall descriptions, warning signs, recovery costs, and a phase-to-pitfall verification checklist.

1. **Budget stored at recipe level, not ingredient level** — Store `cost_per_100g` on `recipe_ingredients` from day one; recipe-level cost is always computed, never stored. If `cost_per_serving` lands on the `recipes` table, partial-inventory grocery cost calculation is impossible without a HIGH-cost migration.

2. **Inventory as point-in-time quantity** — Build inventory as a ledger of events (`purchase`, `used`, `expired`, `adjusted`). A mutable `quantity_grams` column loses consumption history, blocking consumption-rate forecasting and reorder logic. Recovery cost is HIGH.

3. **Constraint solver blocking the UI** — Use async job pattern: client submits a generation request, Edge Function writes a `plan_generation_jobs` row and runs asynchronously, client polls for status. A synchronous Edge Function loop over 50+ recipes will time out at 10s and freeze mobile UI.

4. **Feedback joined to live (mutable) recipe records** — Snapshot recipe attributes (cuisine tag, dominant macro, avg cost) into the `recipe_feedback` row at rating time. If the learning engine joins feedback to live recipe records, edits corrupt historical signals. Recovery cost is HIGH.

5. **TanStack Query cache incoherence at v2.0 scale** — Centralise query key definitions and dependency mapping in `src/lib/queryKeys.ts` before adding any v2.0 queries. With 6+ interdependent query families, manually listing `invalidateQueries` per mutation handler will produce stale budget and grocery UI.

6. **New tables missing RLS** — Every migration that creates a table must include `ENABLE ROW LEVEL SECURITY` + household isolation policy in the same file. Supabase disables RLS by default; with 6–10 new tables, any omission leaks household data cross-tenant.

---

## Implications for Roadmap

Based on feature dependencies (FEATURES.md), architecture build order (ARCHITECTURE.md Phase A–J), and pitfall prevention timing (PITFALLS.md), the following phase structure is recommended.

### Phase 1: Infrastructure and Query Foundation
**Rationale:** Before any v2.0 feature queries are added, centralise query key management to prevent cache incoherence (Pitfall 6 in PITFALLS.md). Also install `@dnd-kit` and `date-fns` now so they are available across all subsequent phases. Zero user-facing change; maximum future pain prevented.
**Delivers:** `src/lib/queryKeys.ts` with full key hierarchy and dependency map; net-new library installs; no visible UI changes
**Avoids:** TanStack Query cache incoherence (Pitfall 6) before it can be introduced by v2.0 feature queries
**Research flag:** Standard patterns — skip research phase

### Phase 2: Budget Engine
**Rationale:** Zero v2.0 dependencies; delivers immediate visible value (cost on recipe cards and plan page); provides the cost signal the planning engine needs. The data model decision — ingredient-level vs recipe-level cost — must be made correctly here before inventory arrives and makes the wrong model irreversible.
**Delivers:** `recipe_costs` + `household_budgets` tables with RLS; `RecipeCostForm` on RecipeBuilder; `BudgetBar` on PlanPage showing weekly spend vs budget
**Addresses:** Budget tracking (P1); cost-per-recipe display; weekly budget total with remaining balance
**Avoids:** Pitfall 1 — store `cost_per_100g` on `recipe_ingredients`, never `cost_per_serving` on `recipes`; Pitfall 10 — RLS on every new table
**Research flag:** Standard patterns — skip research phase

### Phase 3: Inventory Engine
**Rationale:** Zero v2.0 dependencies; foundational for Grocery List (Phase 4) and Planning Engine (Phase 8); the ledger vs snapshot decision must be made here before any reads are written against the table.
**Delivers:** `inventory_items` (ledger-based) table with RLS; `InventoryPage` reusing existing `FoodSearchOverlay`; expiry date tracking; storage location categories (pantry/fridge/freezer)
**Addresses:** Pantry/fridge/freezer tracking (P1); expiry priority data infrastructure
**Avoids:** Pitfall 2 — ledger-based from day one; do not add a mutable `quantity_grams` column
**Research flag:** Standard patterns — skip research phase

### Phase 4: Grocery List Generation
**Rationale:** Depends on Budget (Phase 2) and Inventory (Phase 3); highest-visibility v2.0 feature for users; closes the planning-to-shopping loop. Requires an explicit design decision on ingredient identity normalisation before coding begins.
**Delivers:** `grocery_lists` + `grocery_list_items` tables; `groceryList.ts` pure client-side utility; `GroceryPage` with categorised list and pantry subtraction; "already have" vs "need to buy" display
**Addresses:** Grocery list aggregation (P1); pantry subtraction; store-aisle category grouping; per-person quantity scaling
**Avoids:** Pitfall 3 — aggregate in grams internally by canonical food ID (not ingredient name string), convert to display units at render
**Research flag:** Ingredient identity normalisation (merging the same food appearing under different IDs across recipes) needs a focused design pass before writing the aggregation utility

### Phase 5: Drag-and-Drop Planner
**Rationale:** No database dependencies; pure UX upgrade that makes plan editing competitive with Plan to Eat and Ollie; can be built independently in parallel with Phases 2–4. Must also resolve the "locked slot" conflict with auto-generation (Phase 8) — define the lock mechanism now so Phases 5 and 8 can be built without conflicting assumptions.
**Delivers:** dnd-kit integration on `PlanPage`; draggable `SlotCard`; droppable `DayCard`; drop calls existing `useAssignSlot`; "locked slot" flag on `meal_plan_slots`; no other DB changes
**Addresses:** Drag-and-drop weekly planner (P1)
**Avoids:** iOS Safari / Android touch failure — pointer events only, not mouse events; `React.memo` on all slot components to prevent full-grid re-render on drag
**Research flag:** Standard patterns — skip research phase; verify touch behaviour on iOS Safari before shipping

### Phase 6: Feedback Engine and Dietary Restrictions
**Rationale:** Both are data-collection phases with zero v2.0 dependencies; can be built together since they are small and both feed the Planning Engine. Feedback signal must start accumulating early — the planning engine is only valuable once per-recipe rating and satiety data exist.
**Delivers:** `recipe_feedback` table with attribute snapshots; `recipe_tags` migration (`allergen_tags`, `cuisine_tag`) on existing `recipes` table; post-log rating prompt on HomePage; `member_dietary_restrictions` table; dietary restriction UI on MemberTargetsPage
**Addresses:** Recipe star rating + satiety feedback (P1); per-member dietary tags and avoided foods list (P1)
**Avoids:** Pitfall 5 — snapshot cuisine tag, dominant macro, avg cost into `recipe_feedback` at rating time, not just `recipe_id`; Pitfall 8 — use structured `constraint_rules` evaluated against recipe tags, not ingredient traversal
**Research flag:** Standard patterns — skip research phase; note that recipe tagging is a prerequisite for this phase (add `allergen_tags text[]` and `cuisine_tag text` to `recipes` in this migration)

### Phase 7: Schedule Model
**Rationale:** Independent of other v2.0 features; provides the availability windows the Planning Engine needs. Schema must be designed from the demand side — what the planner needs to consume — not from what is easiest to collect.
**Delivers:** `member_schedules` table using polymorphic owner pattern (same as `nutrition_targets`); schedule entry in SettingsPage; `useMemberSchedules` hook
**Addresses:** Schedule-aware planning (P2) data infrastructure
**Avoids:** Pitfall 9 — store as structured `{day_index, availability_type: 'prep_available'|'quick_only'|'away', preferred_slot_duration_minutes}`; never a `text` or `varchar` schedule field
**Research flag:** Standard patterns — skip research phase

### Phase 8: Constraint-Based Planning Engine
**Rationale:** The keystone differentiator; builds on Budget (Phase 2), Inventory (Phase 3), Feedback (Phase 6), Dietary (Phase 6), and Schedule (Phase 7) data. The async job architecture must be decided before the first line of solver code. Greedy scoring is sufficient for v2.0 MVP; `yalps` LP solver is an upgrade path only.
**Delivers:** `generate-plan` Supabase Edge Function (async, job-pattern, returns immediately with job ID); `plan_generation_jobs` table; `GeneratePlanModal` with accept/modify/reject UI and constraint explanation messages; `useGeneratePlan` hook
**Addresses:** Constraint-based plan generation (P2); schedule-aware planning; inventory-priority weighting; feedback-weighted suggestions; repeat avoidance
**Avoids:** Pitfall 4 — Edge Function returns job ID immediately, solver runs asynchronously, client polls status, partial results returned on timeout with explanation of which constraint is most binding
**Research flag:** Needs research phase — async job pattern in Supabase Edge Functions for long-running tasks; CTE query design for 6-table constraint read; greedy scoring algorithm design; constraint explanation message UX

### Phase 9: Prep Optimisation
**Rationale:** Lowest urgency; no hard dependencies on other v2.0 features; scope must be locked to three specific outputs before building to avoid the overengineering trap.
**Delivers:** `recipe_prep_tasks` table; prep task entry on RecipeBuilder; `prepSchedule.ts` pure heuristic utility (batch prep list, day-of sequence, freezer suggestions); Prep tab on PlanPage
**Addresses:** Prep optimisation (P2)
**Avoids:** Pitfall 7 — heuristics only: longest-cook-time first, shared-ingredient batching, freezer-friendly flagging; no equipment constraint modeling, no sub-15-minute scheduling, no external scheduling library
**Research flag:** Standard patterns once scope is locked — skip research phase

### Phase 10: Dynamic Portioning
**Rationale:** Targeted enhancement to existing portioning logic; additive DB change only; slotted after feedback engine data model is stable so satiety signals can inform portion adjustments.
**Delivers:** `portion_mode` column on `nutrition_targets`; `portionSuggestion.ts` utility update; `portion_mode` selector on MemberTargetsPage
**Addresses:** Dynamic portioning with satiety adaptation (P3)
**Research flag:** Standard patterns — skip research phase

### Phase Ordering Rationale

- Phases 2–3 (Budget, Inventory) come first because their data model decisions are the most irreversible and they unblock the Grocery List.
- Phase 4 (Grocery) delivers the highest user-visible win after its two prerequisites.
- Phase 5 (Drag-and-Drop) is independent and can be built in parallel with Phases 2–4 if resources allow.
- Phases 6–7 (Feedback, Dietary, Schedule) are data-collection infrastructure that must ship early so signal accumulates before the Planning Engine arrives.
- Phase 8 (Planning Engine) is gated on Phases 2, 3, 6, and 7 having live data — do not ship it to users until those phases have had at least a few weeks of use.
- Phases 9–10 (Prep, Dynamic Portioning) are the lowest urgency and can be deferred past the initial v2.0 milestone.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 8 (Planning Engine):** Async job pattern in Supabase Edge Functions is not well-documented for long-running tasks; CTE query design for 6+ table join with scoring; greedy vs LP scoring tradeoffs; GeneratePlanModal UX for partial results and constraint explanation messages

Phases with standard, well-documented patterns (skip `/gsd:research-phase`):
- **Phases 1–7, 9–10:** All follow established patterns (Supabase migrations + RLS, TanStack Query hooks, dnd-kit, React Hook Form + Zod, existing hook conventions). No novel integration points.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing locked stack; net-new libraries (dnd-kit, yalps, date-fns) verified against npm and GitHub; React 19 compatibility confirmed |
| Features | MEDIUM | Competitor analysis from 2025–2026 sources; no single authoritative spec for this combined constraint-solving + inventory domain; table stakes well-established, P2 prioritisation is judgment-based |
| Architecture | HIGH | Based on direct codebase analysis (`src/types/database.ts`, `supabase/migrations/`, existing hooks); integration points derived from code, not speculation; existing patterns are clear and well-suited to extension |
| Pitfalls | HIGH | Critical pitfalls verified against existing code structure; confirmed against multiple sources for cache invalidation, RLS, and constraint solver timeout behaviour |

**Overall confidence:** HIGH for build order and architecture; MEDIUM for feature prioritisation (validated against competitors but user research would sharpen P1 vs P2 boundaries)

### Gaps to Address

- **Ingredient identity normalisation for grocery aggregation:** The mechanism for resolving the same ingredient appearing under different IDs (USDA fdcId vs custom food UUID) across recipes needs explicit design before Phase 4 coding begins. The risk is known (Pitfall 3); the implementation approach needs a focused design decision.
- **Constraint solver time budget:** The acceptable wall-clock solve time for `generate-plan` is not yet specified. The async job pattern mitigates the UX risk, but the Edge Function still needs a hard iteration cap. Define this (e.g., 30-second wall clock, 1000-iteration limit) before Phase 8.
- **Recipe tagging prerequisite:** The dietary restrictions engine (Phase 6) requires recipes to have `allergen_tags` and `cuisine_tag` for the planning engine to evaluate constraints against tags rather than ingredient traversal. These columns do not exist on the current `recipes` table. Flag as a migration prerequisite in the Phase 6 plan.
- **Locked slot mechanism:** When a user manually drags a meal into a slot and then runs plan generation, the generator must not overwrite manually-placed meals. Resolve the lock mechanism design (flag on `meal_plan_slots`) before Phases 5 and 8 are built, so they share the same assumption.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase (`src/types/database.ts`, `src/hooks/`, `supabase/migrations/`) — architecture integration points, existing patterns, data model analysis
- `@dnd-kit/core` npm + GitHub discussions/1842 — React 19 compatibility, touch sensor behaviour
- `yalps` npm + GitHub (Ivordir/YALPS) — LP solver capabilities, bundle characteristics
- `date-fns` v4 release blog — timezone support, ESM-only status
- Zod v4 release notes — API changes, resolver compatibility
- Supabase Edge Functions docs — async patterns, timeout limits
- TanStack Query dependent queries guide — derived query patterns

### Secondary (MEDIUM confidence)
- Competitor app analysis: Plan to Eat, Eat This Much, Ollie, Cooklist, KitchenPal (2025–2026 feature reviews via Fitia, Mealift, Ollie blog)
- Frontiers in Nutrition — linear programming for diet optimisation (academic basis for LP approach)
- Supabase RLS best practices (leanware.co, designrevision.com)
- TanStack Query cache invalidation patterns (dev.to — manual management anti-pattern)
- Plan to Eat ingredient merging behaviour — grocery list aggregation precedent

### Tertiary (LOW confidence)
- Prep schedule heuristics (healthhomeandhappiness.com) — home cooking batch prep patterns; directionally correct, needs user validation
- Cold start problem in recommender systems (tredence.com) — feedback signal accumulation; overkill for the SQL-scoring approach used in v2.0, relevant for future v3 learning system

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
