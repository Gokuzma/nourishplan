# Pitfalls Research

**Domain:** Family meal planning / calorie tracking PWA
**Researched:** 2026-03-12
**Confidence:** HIGH (critical pitfalls verified across multiple sources)

## Critical Pitfalls

### Pitfall 1: Nutrition Values Stored as "Per Serving" Without a Canonical Unit

**What goes wrong:**
The USDA FoodData Central API returns nutrients in different units depending on data type: Foundation Foods and SR Legacy report per 100g, while Branded Foods report per serving (with varying serving sizes defined by manufacturers). If the app stores whatever comes back from the API without normalizing to a canonical unit (per 100g), every downstream calculation — recipe totals, portion scaling, macro summaries — compounds the error. Recipes built from a mix of Foundation and Branded foods produce silently wrong nutrition numbers.

**Why it happens:**
Developers build the food search and detail flow first, see numbers appearing, and move on. The API responses look plausible. The normalization problem only surfaces when comparing two similar foods or when scaling a recipe by a fractional serving count.

**How to avoid:**
On ingest, normalize all nutrient values to per-100g before storing them. Store the serving size and serving unit as display metadata only, never as the calculation base. All recipe math operates on grams. Convert to display serving sizes only in the presentation layer.

**Warning signs:**
- Chicken breast and a branded chicken product show the same calories but different macros at the same weight
- A recipe's total calories don't match the sum of its ingredients when calculated manually
- Scaling a recipe by 0.5x doesn't halve the calorie count

**Phase to address:** Food database foundation phase (before recipe builder is built)

---

### Pitfall 2: Food Hierarchy Data Model Built Without Nested Recipe Support

**What goes wrong:**
The data model is designed with `Recipe → Ingredient (Food)` relationships. Later, when nested recipes are needed (a recipe referencing another recipe as an ingredient), the schema requires a significant migration. Foreign keys, nutrition rollup logic, and circular reference prevention all need to be redesigned. This is a rewrite, not a feature addition.

**Why it happens:**
Nested recipes feel like an edge case until users try to build a lasagna that references a homemade tomato sauce recipe, or a smoothie bowl that references a granola recipe. The PROJECT.md explicitly lists nested recipes as a requirement, but developers often defer the complexity and build the simpler case first.

**How to avoid:**
Design the ingredient relationship table to support a polymorphic `ingredient_type` (food | recipe) from day one. Add circular reference detection before any recipe save. Nutrition rollup must recursively resolve nested recipes at calculation time, not at save time.

**Warning signs:**
- Recipe ingredients table has a direct foreign key to `foods` only
- No circular reference guard exists in recipe save logic
- Nutrition totals are cached on the recipe record rather than computed dynamically

**Phase to address:** Core data model phase (before any recipe or ingredient UI is built)

---

### Pitfall 3: Cooked vs Raw Weight Ambiguity in Recipes

**What goes wrong:**
The USDA database lists most meats in raw form. Users enter recipe ingredients as cooked weights (what they measure when plating). The app calculates nutrition from raw-weight database values applied to cooked-weight user inputs — producing calorie counts that are 20–40% too low for protein-heavy recipes. Chicken breast loses ~25% of its weight when cooked; spinach loses up to 70%.

**Why it happens:**
Developers test with dry goods (rice, pasta, canned beans) where raw vs cooked is obvious from food names. Meat and vegetables expose the problem later, usually in user feedback after launch.

**How to avoid:**
Each ingredient in a recipe must carry a `weight_state` field: `raw` or `cooked`. The UI must prompt users to specify whether the quantity they entered is for the raw or cooked state. Display database entries with their weight state labeled (USDA Foundation Foods mark this; Branded Foods often do not).

**Warning signs:**
- Recipe ingredient entry form has no raw/cooked toggle
- A 200g cooked chicken breast recipe entry shows the same calories as a 200g raw chicken breast
- User feedback reports "calories seem too low for meat dishes"

**Phase to address:** Recipe builder phase

---

### Pitfall 4: Household Data Isolation Implemented at Application Layer Only

**What goes wrong:**
Household membership is enforced by checking `household_id` in application code before returning data. A missing WHERE clause — in a new query, a background job, or a search endpoint — leaks one household's meal plans, custom foods, or member targets to another. This is a correctness bug at best and a privacy breach at worst, since the app stores personal health data (calorie targets, body weight, nutrition logs).

**Why it happens:**
Row-level security (RLS) is skipped in favor of "we'll be careful in queries." As the codebase grows, new queries are written without the isolation clause. Cached query results keyed without tenant prefix serve one household's data to another.

**How to avoid:**
Enforce household isolation at the database layer using Row-Level Security policies (e.g., Postgres RLS) in addition to application-layer checks. Every cache key must include `household_id`. Run an integration test suite that logs in as Household B and attempts to access Household A's resources by guessing IDs.

**Warning signs:**
- No RLS policies defined on any table
- Cache keys constructed from resource ID alone (e.g., `meal_plan:42` not `household:7:meal_plan:42`)
- No cross-household access test in the test suite

**Phase to address:** Authentication and household system phase

---

### Pitfall 5: Meal Plan Templates Mutated Instead of Instanced

**What goes wrong:**
A family creates a "Week 1 Rotation" meal plan template and assigns it. Later, they edit Monday's dinner. Because the system stores one plan shared by reference, the edit propagates to all members' views. Worse, a future week's nutrition log references the old meals — but since the plan was mutated, historical logs now point to meals with updated (wrong) nutrition values.

**Why it happens:**
Templates and active instances feel like the same thing when building the first version. The distinction only becomes painful when users try to edit a plan without affecting history, or when two family members want different variants of the same base plan.

**How to avoid:**
Distinguish `MealPlanTemplate` (editable blueprint, never tracked against) from `MealPlanInstance` (a snapshot assigned to a time window, append-only). Logging always references an instance. Templates are duplicated into instances on assignment. Nutrition log entries store the nutrient values at log time, not a reference to recalculated recipe data.

**Warning signs:**
- A single `meal_plans` table with no template/instance distinction
- Nutrition log rows reference recipe IDs without storing snapshot values
- Editing a meal plan changes past log entries' calculated totals

**Phase to address:** Core data model phase (before logging is built)

---

### Pitfall 6: Per-Person Portion Suggestions That Ignore Meal Composition

**What goes wrong:**
The app calculates each person's suggested portion as `(person_calorie_target / meal_total_calories) * 1_serving`. But a meal can contain multiple dishes. If a meal has a calorie-dense dessert item and a low-calorie salad, the naive formula gives a child a huge portion of the dessert and a tiny portion of the salad. The suggestion becomes meaningless and users stop trusting it.

**Why it happens:**
The per-person suggestion algorithm is built early as a simple ratio. It works correctly for single-dish meals in demos. Multi-dish meals expose the flaw.

**How to avoid:**
Per-person portion suggestions should operate at the individual food/dish level within a meal, not at the meal level. Each dish within a meal should have an independently adjustable suggested serving count. The algorithm suggests portions for each dish separately, capped at reasonable maximums (e.g., no more than 2x standard serving).

**Warning signs:**
- Portion suggestion is a single number for the entire meal
- Demo meals always contain one main dish
- No way for a user to lock a portion for one dish while adjusting another

**Phase to address:** Portion suggestion and per-person targets phase

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store Branded Foods nutrients as-is without normalizing to per 100g | Faster ingest implementation | Recipe math silently wrong for branded items; hard to fix after data is ingested | Never |
| Skip `weight_state` (raw/cooked) field on recipe ingredients | Simpler ingredient model | Systematic calorie undercount for meat/veg-heavy recipes | Never |
| Single `meal_plans` table (no template/instance split) | Less schema complexity initially | Editing a plan corrupts historical logs; impossible to migrate without downtime | Never — design from day one |
| Application-only household isolation (no DB-level RLS) | Faster to build initially | One missed WHERE clause leaks personal health data across households | Only for single-household personal use (not this app) |
| Cache recipe nutrition totals on the recipe record | Faster read performance | Stale totals when ingredients are updated; nested recipe changes don't propagate | Acceptable if cache is invalidated on any ingredient or sub-recipe change |
| Defer USDA data type filtering (search all types including SR Legacy) | More results returned | SR Legacy is frozen at 2018; users get outdated branded data; duplicate results confuse search | MVP only, with filtering added before launch |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| USDA FoodData Central API | Searching all data types returns duplicates (same food in SR Legacy and Foundation Foods) | Filter search to Foundation Foods + Branded Foods only; exclude SR Legacy from default search |
| USDA FoodData Central API | Using `DEMO_KEY` in staging/production — rate limited to 30 requests/hour per IP | Register for a proper API key (1,000 requests/hour); cache all results aggressively |
| USDA FoodData Central API | Treating `nutrientNumber` as stable across data types — different data types use different nutrient ID sets | Map all nutrients to a canonical internal enum on ingest; never store the USDA nutrient ID as the canonical key |
| USDA FoodData Central API | Assuming all nutrients are present for all foods — Foundation Foods have extensive data; Branded Foods often report only FDA-required nutrients | Handle missing nutrient values gracefully in all UI; distinguish "0" from "not reported" |
| USDA FoodData Central API | Directly rendering API search results without deduplication — the same food appears as Foundation, SR Legacy, and Branded variants | Deduplicate and rank results: Foundation > SR Legacy > Branded for generic foods; Branded for packaged items |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recursive nutrition rollup computed on every page load for nested recipes | Recipe detail page slows as recipe nesting depth increases | Cache computed nutrition at recipe level; invalidate on any ingredient or sub-recipe change | When recipes are nested 3+ levels or a recipe has 20+ ingredients |
| Fetching full food objects when building recipe ingredient lists | Ingredient list queries return all nutrient data (200+ fields per food) for display purposes | Separate food search projections (name, serving, calories) from full food detail (all nutrients) | When a recipe has 15+ ingredients or the ingredient list is paginated |
| Household meal plan page loading all meals + all member targets in one query | Initial load slow; all members' nutrition summaries computed server-side simultaneously | Compute per-person nutrition summaries lazily or in background jobs; return plan structure immediately | When household has 5+ members and a 7-day plan with 3 meals/day |
| USDA API calls made per user search keystroke (no debounce) | Rate limit hit during testing; excessive API costs | Debounce search input by 300ms minimum; cache search results for identical queries within a session | First time a developer adds a second person searching simultaneously |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Household member can access any resource by guessing integer IDs | A household member (or malicious actor) reads another household's meal plans and member health data | Use UUIDs for all public-facing IDs; enforce RLS at database layer so guessed IDs return no rows |
| Nutrition targets (weight, calorie goal, health conditions) stored without field-level access control | A child member can read parent's weight loss targets, or household admin can read non-shared member health data | Define explicit field visibility rules per member role; encrypt sensitive fields at rest |
| USDA API key stored in frontend environment variables | API key exposed in browser bundle; abused by third parties to exhaust quota | All USDA API calls proxied through the app's backend; API key never sent to client |
| Custom food entries shared across households via a global foods table | Household A's private custom food (e.g., "Grandma's Casserole") is searchable by Household B | Custom foods scoped to `household_id` by default; only verified USDA foods are global |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring exact food name match in search | Users search "chicken breast" and get 200 results including "Chicken, broilers or fryers, breast, meat only, raw" — they give up | Rank Foundation Foods and commonly-used foods first; show simplified display names alongside USDA names |
| Showing micros alongside macros on the daily summary by default | Screen feels like a nutrition science report; casual users are overwhelmed and stop logging | Default view shows calories + 3 macros; micros are in an expandable section for users who track them |
| Requiring manual portion entry before seeing plan nutrition | Users want to see "what does this meal look like for me" before committing to a log entry | Show suggested portions immediately on meal view; logging is a confirmation tap, not a data entry step |
| No feedback when a food is missing critical nutrient data | User logs a Branded Food missing fiber data; daily fiber shows artificially low; user thinks they're deficient | Flag foods with incomplete nutrient profiles visually; distinguish "0g fiber" from "fiber not reported" |
| Treating all family members as equal-access users | A 10-year-old shouldn't be able to delete the weekly meal plan | Implement household roles: Admin (plan + manage), Member (log + view), Child (log only) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Food search:** Returns results — but verify USDA data type filtering is applied and SR Legacy is deprioritized
- [ ] **Recipe nutrition totals:** Displays a number — but verify nested recipes resolve recursively and the total matches manual calculation
- [ ] **Per-person portion suggestions:** Shows a number — but verify it operates per-dish within a meal, not per-meal
- [ ] **Household sharing:** Multiple users can see the same plan — but verify User B cannot access User A's data from a different household by ID
- [ ] **Meal plan templates:** Users can create and assign templates — but verify editing a template doesn't mutate historical log entries
- [ ] **Daily nutrition summary:** Shows calorie and macro totals — but verify the total reflects actual logged portions, not planned portions
- [ ] **Custom food entry:** Users can create foods — but verify custom foods are scoped to their household and not globally searchable
- [ ] **PWA installability:** Passes Lighthouse PWA check — but verify the manifest, service worker, and offline fallback page are all present

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Nutrition stored as per-serving instead of per-100g | HIGH | Data migration: re-ingest all food records normalized to 100g; recompute all recipe nutrition totals; notify users that historical logs may have slightly changed values |
| No nested recipe support in data model | HIGH | Schema migration to polymorphic ingredient table; rewrite nutrition rollup logic; re-test all existing recipes |
| Template/instance not distinguished | HIGH | Snapshot all existing meal plans as instances; create template copies; audit all log entries for stale references; risky to do post-launch with real user data |
| Household isolation at app layer only | MEDIUM | Add RLS policies to all tables (can be done without data migration); audit all query paths for missing isolation clauses; run penetration test after |
| Cooked/raw weight state missing | MEDIUM | Add `weight_state` column with default `raw`; build UI to let users correct existing recipe ingredients; calorie counts will shift for corrected recipes |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Nutrition not normalized to per-100g | Food database foundation | Manual calculation: sum raw nutrient values for a known recipe and compare to USDA reference |
| Missing nested recipe support | Core data model | Create a recipe that references another recipe; verify nutrition rollup is correct; verify circular reference is rejected |
| Cooked vs raw weight ambiguity | Recipe builder | Enter 200g cooked chicken vs 200g raw chicken in two recipes; verify different calorie totals with correct values |
| Household data isolation gap | Authentication and household system | Log in as Household B; attempt to fetch Household A's meal plan by ID; verify 403/404 response |
| Template vs instance mutation | Core data model | Assign a template to a week; log meals; edit the template; verify historical log nutrition is unchanged |
| Per-person portion ignores meal composition | Portion suggestion phase | Add a meal with a high-calorie dessert and a low-calorie salad; verify suggested portions are per-dish, not a single ratio |
| USDA API key exposed | API integration phase | Build and inspect the frontend bundle; verify no API key string is present |

---

## Sources

- USDA FoodData Central data documentation: https://fdc.nal.usda.gov/data-documentation/
- USDA FoodData Central FAQ: https://fdc.nal.usda.gov/faq/
- OWASP Multi-Tenant Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- "Barriers to and Facilitators for Using Nutrition Apps" (PMC8409150): https://pmc.ncbi.nlm.nih.gov/articles/PMC8409150/
- "Why Most People Quit Calorie Tracking" (Medium): https://i-rakshitpujari.medium.com/why-most-people-quit-calorie-tracking-and-how-i-fixed-it-with-ai-9b450bcb650f
- Cronometer community: raw vs cooked weight in recipes: https://forums.cronometer.com/discussion/182/new-recipe-raw-ingredient-weight-versus-cooked-serving-weight
- Multi-tenant leakage patterns: https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c
- PWA offline data sync patterns: https://web.dev/learn/pwa/offline-data
- Nutritics meal plan template behavior: https://www.nutritics.com/en/support-center/meal-plan-templates/

---
*Pitfalls research for: Family meal planning / calorie tracking PWA (NourishPlan)*
*Researched: 2026-03-12*
