# Stack Research

**Domain:** Constraint-solving meal planning PWA (v2.0 AMPS additions)
**Researched:** 2026-03-25
**Confidence:** HIGH for drag-and-drop, form libraries, date utilities; MEDIUM for LP solver (small ecosystem, limited production reports)

> This file extends v1.0 stack research. Do not re-litigate Vite, React, Supabase, TanStack Query, Tailwind, or Zustand — those are locked. This covers only net-new libraries required for v2.0 AMPS features.

---

## New Libraries by Feature Area

### Drag-and-Drop Planner

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@dnd-kit/core` | 6.3.1 | Drag-and-drop primitives | Actively maintained successor to deprecated react-beautiful-dnd. Lighter bundle (~10 KB gzipped), keyboard-accessible, works with touch sensors for mobile PWA. Peer dep is `react>=16.8.0` — installs with `--legacy-peer-deps` under React 19 and works in practice. |
| `@dnd-kit/sortable` | 10.0.0 | Sortable list/grid preset | Builds on `@dnd-kit/core`; provides `SortableContext` and `useSortable` for meal slot reordering without hand-rolling collision detection. |
| `@dnd-kit/utilities` | 3.x | CSS transform helpers | `CSS.Transform.toString()` for animated drag previews; tiny, optional. |

**Why not pragmatic-drag-and-drop:** Atlassian's library is framework-agnostic and headless but lacks a sortable preset. Building sortable grid from scratch adds a sprint of work for no meaningful gain here.

**Why not react-beautiful-dnd / hello-pangea/dnd:** Deprecated upstream, community fork is higher-level but less flexible for a weekly grid layout that doesn't map cleanly to a single list.

**React 19 note:** Install with `--legacy-peer-deps`. The `@dnd-kit/react` (v0.x) rewrite exists but is pre-stable — do not use it yet.

---

### Constraint-Based Planning Engine

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `yalps` | 0.6.3 | Mixed-integer linear programming solver | Pure JS/TS, browser-native (no WASM), tree-shakeable. Handles the AMPS problem: maximize nutrition score subject to budget, inventory, calorie, and preference constraints. Rewrites `javascript-lp-solver` with better API and faster non-integer performance. |

**Problem formulation:** Each candidate recipe is a binary decision variable (include/exclude). Constraints are: weekly calorie totals per member within ±10% of target, total cost ≤ budget, prep time per day ≤ available schedule window, inventory items with expiry flagged as preferred. Objective: maximize weighted satisfaction score (rating history + variety penalty).

**Why not HiGHS-js:** Compiles C++ to WASM — adds ~1.5 MB to bundle and complicates PWA offline caching. HiGHS is warranted only if problem size exceeds ~500 variables, which a household weekly plan never will.

**Why not a scoring heuristic (no library):** Pure greedy scoring breaks when constraints interact (e.g., a cheap recipe uses all of one budget category, starving variety). LP gives provably optimal solutions in milliseconds for household-scale problems.

---

### Budget and Inventory Forms

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `react-hook-form` | 7.72.0 | Form state + validation | Already recommended in v1 stack; adding explicitly here because budget (decimal currency inputs) and inventory (quantity + expiry date per item) forms are the most complex forms in v2.0. Uncontrolled inputs prevent re-render cascades in large pantry lists. |
| `zod` | 4.x | Schema validation | Zod 4 is now the current major. Define schemas for `InventoryItem`, `BudgetEntry`, `ScheduleBlock` — validate identically on form submission and in Edge Function ingestion. Import from `"zod"` (v4 default) or `"zod/v3"` if any dependency pins v3. |
| `@hookform/resolvers` | 3.x | zod ↔ react-hook-form bridge | Required glue package; version-matched to react-hook-form 7.x. |

---

### Schedule and Date Utilities

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `date-fns` | 4.1.0 | Date arithmetic for schedule model | Already in the "What NOT to Use" (Moment.js) guidance from v1. date-fns v4 adds first-class timezone support — relevant for households across time zones. Use `startOfWeek`, `addDays`, `eachDayOfInterval`, `differenceInMinutes` for prep slot calculations. Tree-shakeable — only imported functions are bundled. |

**Why not native Intl / Date:** No utility functions for week-boundary arithmetic, day-of-week iteration, or duration math. `date-fns` costs ~3 KB per imported function vs. writing and testing the same logic from scratch.

---

### Feedback and Learning Engine

No new client library needed. The feedback engine is a Postgres-side feature:

- `recipe_feedback` table: `member_id`, `recipe_id`, `rating` (1–5), `satiety_score` (1–3), `logged_at`
- Aggregate in a Supabase DB View or Edge Function; expose to client via TanStack Query
- Weighted scoring: `score = 0.5 * avg_rating + 0.3 * avg_satiety + 0.2 * (1 / weeks_since_last_served)` — computed in SQL, no client-side ML library needed

**Why not pgvector / embeddings:** Out of scope per PROJECT.md ("AI-driven optimization — not useful on day one"). Embeddings require accumulated signal. Start with the SQL scoring formula above; pgvector is a future upgrade path that Supabase already supports without migrations.

---

### Grocery List Generation

No new library needed. This is a pure Supabase SQL aggregation:

```sql
SELECT ingredient_id, SUM(scaled_quantity) AS total_qty, unit
FROM meal_plan_ingredients
WHERE meal_plan_id = $1
  AND ingredient_id NOT IN (SELECT ingredient_id FROM inventory WHERE quantity > 0)
GROUP BY ingredient_id, unit
ORDER BY grocery_category, ingredient_name;
```

Result streamed to client via TanStack Query. The grocery categorization (produce, dairy, etc.) is a static lookup column on `foods` — no external service.

---

### Prep Optimization

No new library needed. Task sequencing is a Postgres query problem:

- `recipe_prep_steps` table: `recipe_id`, `step_order`, `duration_minutes`, `parallelizable` (bool), `equipment` (enum)
- Sort by `parallelizable` first, then by `duration_minutes` DESC (longest-running first = optimal batch packing)
- Supabase Edge Function computes the prep schedule for a given meal plan day; client renders it as a timeline using existing Tailwind CSS

---

## Installation

```bash
# Drag-and-drop planner
npm install --legacy-peer-deps @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Planning engine
npm install yalps

# Form improvements (if not already installed from v1)
npm install react-hook-form zod @hookform/resolvers

# Date utilities
npm install date-fns
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@dnd-kit/core` + `@dnd-kit/sortable` | pragmatic-drag-and-drop | If the drag target is a free-form canvas rather than a structured grid/list, or if you need file-drop alongside list reordering. |
| `yalps` | `javascript-lp-solver` | If you need MILP with more than ~200 integer variables; `javascript-lp-solver` 1.0.3 is slightly more battle-tested. Both run in-browser. |
| `yalps` | HiGHS-js | If problem scale exceeds household size (e.g., institutional catering). HiGHS is orders of magnitude faster at 1000+ variables but adds 1.5 MB WASM. |
| SQL aggregate (grocery list) | Dedicated aggregation library | Never — this is a JOIN + GROUP BY, not a data processing problem. |
| `date-fns` | Temporal API (TC39) | When Temporal reaches Baseline Widely Available (not yet in 2026). Currently requires a polyfill heavier than date-fns itself. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any ML/AI library (TensorFlow.js, ONNX Runtime) | Out of scope per PROJECT.md. Requires months of feedback data before models are meaningful. Adds 3–30 MB to bundle. | SQL scoring formula for feedback; upgrade path to pgvector later |
| A full calendar component (react-big-calendar, Mobiscroll) | These are event-scheduling UIs for calendar apps. The meal planner is a weekly grid of drag targets — a 7-column Tailwind grid + dnd-kit is 50 lines, not a 200 KB library. | `@dnd-kit/sortable` + Tailwind CSS grid |
| `@hello-pangea/dnd` | Community fork of deprecated react-beautiful-dnd; list-only, no grid support, higher-level API fights customization. | `@dnd-kit/core` |
| `react-dnd` | No active maintenance; React 19 support is a known open issue (#3655 on their GitHub). | `@dnd-kit/core` |
| A budget price-feed API | Out of scope per PROJECT.md ("Recipe cost estimates are user-entered"). Adds external dependency and rate limits. | User-entered cost per ingredient, stored in Postgres |
| Barcode scanning library (`@zxing/browser`) | Explicitly out of scope in PROJECT.md for v2.0. | Deferred to future milestone |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` | React 19 | Install with `--legacy-peer-deps`; peer dep declares `>=16.8.0`, works in practice with React 19. Monitor for `@dnd-kit/react@1.0` stable release as future upgrade. |
| `yalps@0.6.3` | Browser + Node | Pure ESM, no WASM, no native bindings. Runs in Vite dev and Supabase Edge Functions alike. |
| `date-fns@4.1.0` | Any modern bundler | v4 is ESM-only. Vite handles this natively; no CJS interop needed. |
| `zod@4.x` | `react-hook-form@7.72.0` via `@hookform/resolvers@3.x` | Resolvers package supports Zod 4. If a dependency pins `zod@^3`, use `import { z } from "zod/v4"` subpath. |

---

## Sources

- dnd-kit npm (`@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`) — https://www.npmjs.com/package/@dnd-kit/core
- dnd-kit React 19 compatibility discussion — https://github.com/clauderic/dnd-kit/discussions/1842
- yalps npm (0.6.3) — https://www.npmjs.com/package/yalps
- yalps GitHub (YALPS rewrite of javascript-lp-solver) — https://github.com/Ivordir/YALPS
- date-fns v4.0 release — https://blog.date-fns.org/v40-with-time-zone-support/
- date-fns npm (4.1.0) — https://www.npmjs.com/package/date-fns
- Zod v4 release notes — https://zod.dev/v4
- react-hook-form npm (7.72.0) — https://www.npmjs.com/package/react-hook-form
- Top 5 DnD libraries React 2026 — https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react
- Supabase Cron docs — https://supabase.com/docs/guides/cron
- HiGHS-js — https://lovasoa.github.io/highs-js/

---
*Stack research for: NourishPlan v2.0 AMPS — net-new library additions only*
*Researched: 2026-03-25*
