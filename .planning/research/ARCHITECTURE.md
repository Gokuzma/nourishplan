# Architecture Research

**Domain:** Family meal planning / nutrition tracking PWA
**Researched:** 2026-03-12
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer (PWA)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Meal Plan   │  │   Recipe /   │  │   Nutrition  │           │
│  │    Views     │  │  Food Views  │  │   Dashboard  │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                   │
│  ┌──────┴─────────────────┴─────────────────┴───────┐           │
│  │                   State Store                     │           │
│  └──────────────────────┬────────────────────────────┘           │
│                         │                                        │
│  ┌──────────────────────┴────────────────────────────┐           │
│  │              Service Worker (offline/sync)         │           │
│  └──────────────────────┬────────────────────────────┘           │
├─────────────────────────┼───────────────────────────────────────┤
│                      API Layer                                   │
├─────────────────────────┼───────────────────────────────────────┤
│  ┌──────────────┐  ┌────┴─────────┐  ┌──────────────┐           │
│  │   Auth API   │  │  App API     │  │  USDA FDC    │           │
│  │  (household  │  │  (food/meal/ │  │  Proxy/Cache │           │
│  │   members)   │  │   log data)  │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│                      Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Food/Recipe │  │  Household/  │  │  Meal Plans  │           │
│  │  Database    │  │  User Store  │  │  & Logs      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Meal Plan Views | Weekly grid display, meal slot assignment, per-person portion display | React/Vue component tree, calendar-style layout |
| Recipe / Food Views | Food search (USDA + custom), recipe builder with ingredient editor, nested recipe support | Form-heavy UI with live nutrition recalculation |
| Nutrition Dashboard | Per-person daily summary (calories, macros, micros), progress toward targets | Charting library, computed from logged portions |
| State Store | Shared app state: current household, active meal plan, logged portions, cached food data | Zustand or Pinia — keep it flat, avoid deep nesting |
| Service Worker | Cache app shell + static assets, queue log writes when offline, background sync | Workbox; cache-first for app shell, network-first for USDA searches |
| Auth API | Household creation, member invites, session management | JWT or session cookies; simple enough for a single backend route group |
| App API | CRUD for Foods, Recipes, Meals, MealPlans, PortionLogs, UserTargets | REST or tRPC; organized by domain entity |
| USDA FDC Proxy | Forward search/detail requests to USDA, cache responses locally to reduce API hits | Thin proxy layer; cache by FDC ID to stay within 1,000 req/hr rate limit |
| Food/Recipe Database | Canonical food nutrient data (USDA-sourced + custom), recipe ingredient lists, nutrition per serving | Relational (PostgreSQL): core food hierarchy tables |
| Household/User Store | Household membership, per-member nutrition targets (calories, macros, micros, custom) | Relational tables: households, members, member_targets |
| Meal Plans & Logs | Weekly templates, meal slot assignments, individual portion logs | Relational; meal_plans → meals → meal_foods; portion_logs per member |

## Recommended Project Structure

```
src/
├── api/                  # Backend route handlers (or tRPC routers)
│   ├── auth/             # Household creation, login, member management
│   ├── foods/            # Food CRUD + USDA proxy
│   ├── recipes/          # Recipe CRUD, ingredient management
│   ├── meal-plans/       # MealPlan + Meal slot CRUD
│   └── logs/             # PortionLog writes and daily summary queries
├── db/                   # Database schema, migrations, query helpers
│   ├── schema.ts         # Canonical table definitions
│   └── migrations/       # Versioned migration files
├── features/             # UI feature modules (colocate component + logic)
│   ├── food-search/      # USDA search + custom food entry
│   ├── recipe-builder/   # Ingredient editor, nested recipe support, live nutrition
│   ├── meal-planner/     # Weekly grid, meal slot management
│   ├── portion-logger/   # Log a serving, override, confirm portion
│   └── nutrition-dash/   # Per-person daily summary charts
├── shared/               # Reusable UI primitives, hooks, utilities
│   ├── components/       # Buttons, inputs, modals (pastel design tokens here)
│   ├── hooks/            # useHousehold, useNutrition, usePortionLog
│   └── nutrition/        # Shared nutrition calculation logic (recursive roll-up)
├── store/                # Global state (Zustand/Pinia)
│   └── index.ts
├── service-worker/       # Workbox config, sync strategies
│   └── sw.ts
└── types/                # Shared TypeScript types for domain entities
```

### Structure Rationale

- **features/:** Co-location keeps each vertical slice (UI, logic, queries) together; avoids cross-cutting spaghetti.
- **shared/nutrition/:** Nutrition roll-up logic (recursive recipe → calorie sum) is used by recipe builder, meal plan view, AND daily summary — extract it once here.
- **db/schema.ts:** Single source of truth for the food hierarchy; migrations are versioned alongside.
- **api/foods/:** Owns the USDA proxy so rate limit handling and caching live in one place.
- **service-worker/:** Isolated from application code; Workbox handles the complexity.

## Architectural Patterns

### Pattern 1: Food Hierarchy as Core Data Model

**What:** A four-level hierarchy where Foods are atomic units, Recipes aggregate Foods (and other Recipes), Meals group Recipes/Foods for a single eating occasion, and MealPlans assign Meals to day/slot slots for a week.

**When to use:** Always — this is the spine of the entire app. Every feature (portion logging, nutrition dashboards, plan templates) hangs off this hierarchy.

**Trade-offs:** Upfront schema complexity pays off over the full project; retrofitting it later would require rewriting most data access. Nested recipes (a recipe referencing another recipe) require a self-referential `recipe_ingredients` join table with a `source_recipe_id` column alongside `source_food_id`.

**Example:**
```
foods           (id, name, usda_fdc_id, calories_per_100g, protein_per_100g, ...)
recipe_ingredients (recipe_id, source_food_id NULL or source_recipe_id NULL, quantity, unit)
recipes         (id, household_id, name, servings, ...)
meal_foods      (meal_id, recipe_id NULL or food_id NULL, quantity, unit)
meals           (id, meal_plan_id, day_of_week, slot, name)
meal_plans      (id, household_id, week_start_date, name, is_template)
```

### Pattern 2: Recursive Nutrition Roll-Up

**What:** Nutrition values for a Recipe are computed by summing the scaled nutrients of each ingredient — and if an ingredient is itself a Recipe, recursing into it. This produces a "nutrition per serving" value stored on the recipe row after any change.

**When to use:** Whenever a recipe is saved or an ingredient is updated. Compute at write time and cache the result rather than computing at read time on every render.

**Trade-offs:** Computing at write time means the dashboard reads are cheap (just sum logged portions × pre-computed recipe nutrition). The downside is that editing a base recipe must invalidate and recompute all parent recipes. For v1 nesting depth is unlikely to exceed 2-3 levels so this is manageable without a job queue.

**Example:**
```typescript
// Pseudocode for recursive roll-up
function computeRecipeNutrition(recipeId: string, db: DB): NutritionPer100g {
  const ingredients = db.getIngredients(recipeId)
  return ingredients.reduce((acc, ing) => {
    const scaled = ing.source_food_id
      ? scaleFood(db.getFood(ing.source_food_id), ing.quantity, ing.unit)
      : scaleNutrition(computeRecipeNutrition(ing.source_recipe_id, db), ing.quantity, ing.unit)
    return addNutrition(acc, scaled)
  }, emptyNutrition())
}
```

### Pattern 3: Household Scoping on Every Query

**What:** All domain entities (recipes, meal plans, portion logs, user targets) are scoped to a `household_id`. Every data access function accepts and enforces this scope — never rely solely on a user_id FK.

**When to use:** From day one. This is the multi-tenancy model for the app.

**Trade-offs:** Adds one FK and one WHERE clause to every query. The payoff is that sharing meal plans within a household is trivial and isolating household data from others is guaranteed at the query level, not just the application layer.

## Data Flow

### Request Flow: Logging a Portion

```
User taps "Log portion" for a meal slot
    ↓
PortionLogger component → usePortionLog hook
    ↓
POST /api/logs { memberId, mealFoodId, quantity, unit }
    ↓ (optimistic update in state store)
Server validates household membership → writes to portion_logs
    ↓
State store receives confirmed log
    ↓
Nutrition Dashboard re-computes daily summary from logs × cached recipe nutrition
```

### Request Flow: USDA Food Search

```
User types in food search box
    ↓
Debounced query → GET /api/foods/search?q=chicken+breast
    ↓
Server checks local foods table (custom foods first)
    ↓ (cache miss for USDA)
Server proxies to USDA FDC /foods/search
    ↓
Server caches USDA result by FDC ID (prevents repeat hits for same food)
    ↓
Returns merged results (custom + USDA) to client
```

### State Management

```
State Store (Zustand/Pinia)
    ↓ (subscribe)
Feature components ←→ Actions → API calls → Optimistic update → Server confirm
                                              ↓ (on offline)
                                    Service Worker queues request
                                    Background sync fires on reconnect
```

### Key Data Flows

1. **Nutrition target → portion suggestion:** When a meal plan is opened, the system reads each member's `member_targets` and divides the meal's total nutrition by the target, suggesting a portion fraction per person.
2. **Recipe edit → cascade recompute:** Saving a recipe ingredient triggers recompute of that recipe's stored nutrition, then walks up any parent recipes that reference it and recomputes those too.
3. **Offline log → sync:** Service worker intercepts failed POST /api/logs, stores in IndexedDB queue, replays on background sync when connectivity returns.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Monolith is fine. Single server, single Postgres instance. USDA proxy cache lives in-process or a simple table. |
| 1k-10k users | Add a read replica for dashboard summary queries. Cache USDA food responses in Redis to avoid repeated FDC hits. |
| 10k+ users | Extract USDA proxy to a lightweight service with a dedicated cache. Partition portion_logs by household_id. Consider materialized views for daily nutrition summaries. |

### Scaling Priorities

1. **First bottleneck:** Nutrition summary queries — they aggregate all portion_logs for a member per day. Add a partial index on `(member_id, logged_at::date)` early.
2. **Second bottleneck:** USDA FDC rate limit (1,000 req/hr per IP). Cache responses aggressively by FDC ID from the start. This is a day-one concern, not a scale concern.

## Anti-Patterns

### Anti-Pattern 1: Computing Nutrition at Read Time

**What people do:** Calculate calorie totals for a recipe or dashboard by joining all ingredient rows and summing on every page load.
**Why it's wrong:** A meal plan view with 7 days × 3 meals × 5 ingredients each = 105 joins per render, and nested recipes multiply that. Dashboards become slow immediately.
**Do this instead:** Compute and store `nutrition_per_serving` on the recipe row at write time. Dashboard reads are then simple: `SUM(logged_quantity × recipe.nutrition_per_serving)`.

### Anti-Pattern 2: Flat User Model Without Household Scoping

**What people do:** Build with a simple `user_id` FK on all tables, plan to "add household sharing later."
**Why it's wrong:** Retrofitting a household layer into an existing user-scoped schema requires migrating every row and updating every query. The sharing model (one meal plan seen by multiple members) cannot be bolted on.
**Do this instead:** Introduce `households` and `household_members` tables before writing any food or meal plan tables. Scope every domain entity to `household_id` from the first migration.

### Anti-Pattern 3: Calling USDA FDC from the Client Directly

**What people do:** Make USDA API calls from browser-side code to avoid building a proxy.
**Why it's wrong:** API keys are exposed in client code. You cannot cache responses across users. Rate limits hit per-client IP rather than per-server IP, making them harder to manage.
**Do this instead:** All USDA requests go through a server-side proxy route that caches by FDC ID and holds the API key server-side.

### Anti-Pattern 4: Allowing Arbitrary Nesting Depth Without Cycle Detection

**What people do:** Allow a recipe to reference any other recipe as an ingredient without checking for cycles.
**Why it's wrong:** Recipe A → Recipe B → Recipe A causes infinite recursion in the nutrition roll-up.
**Do this instead:** On ingredient save, validate that the ingredient recipe's ancestry does not include the current recipe. Reject the save with a clear error if a cycle is detected.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| USDA FoodData Central | REST, server-side proxy, cache by FDC ID | Rate limit: 1,000 req/hr per IP. Cache aggressively. Two endpoints: `/foods/search` and `/foods/{fdcId}`. Data is public domain (CC0). |
| Push Notifications (future) | Web Push API via service worker | Not required for v1 but service worker foundation supports it. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Feature components ↔ API | HTTP via fetch (or tRPC) | Keep API calls inside hooks, not raw in components |
| Recipe builder ↔ Nutrition engine | Direct function call (shared/nutrition/) | Nutrition roll-up is pure computation — no side effects, easy to test |
| Service worker ↔ App | Background Sync API + IndexedDB | Use Workbox's built-in queue for offline log writes |
| Household members ↔ Portion logs | household_id FK enforced at query level | Never bypass scoping; validate membership server-side on every write |

## Sources

- USDA FoodData Central API Guide: https://fdc.nal.usda.gov/api-guide/
- USDA FDC OpenAPI Spec: https://fdc.nal.usda.gov/api-spec/fdc_api.html
- Diet services schema design (Medium): https://chankapure.medium.com/designing-a-database-schema-for-diet-services-a-guide-347637b3662f
- Recursive recipe visualizer (GitHub): https://github.com/schollz/recursive-recipes
- Offline-first PWA with React/Redux (Medium): https://medium.com/pgs-software/how-to-build-offline-first-progressive-web-apps-pwas-with-react-redux-7d58553e70
- PWA offline/background operation (MDN): https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
- Family nutritional meal plan app design (Medium): https://medium.com/design-bootcamp/family-nutritional-meal-plan-mobile-app-d02d5144f707
- Nutrition tracking app development guide: https://topflightapps.com/ideas/diet-and-nutrition-app-development/

---
*Architecture research for: Family meal planning / nutrition tracking PWA (NourishPlan)*
*Researched: 2026-03-12*
