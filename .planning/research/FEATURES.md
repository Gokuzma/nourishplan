# Feature Research

**Domain:** Family meal planning / calorie and nutrition tracking PWA
**Researched:** 2026-03-12
**Confidence:** HIGH (competitive analysis from live apps, USDA API confirmed, nutrition tracking patterns well-established)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Food database search | Every calorie app has it; typing individual nutrients manually is a non-starter | MEDIUM | USDA FoodData Central is the free standard (380k+ foods, USDA-validated); 1,000 req/hr rate limit per IP — cache aggressively |
| Manual custom food entry | USDA misses local, branded, and home-cooked edge cases | LOW | Needs name, unit, and per-100g or per-serving macros at minimum |
| Calorie + macro display (P/C/F) | Users comparing apps expect this as the baseline nutritional view | LOW | Calories, protein, carbs, fat — must be visible without clicking through |
| Recipe builder (ingredients → nutrition) | Cooking from scratch is the norm in family households | MEDIUM | Compute nutrition by summing ingredients; scale to servings; this is the engine everything else sits on |
| Daily nutrition log per person | Core interaction loop — users open the app to log what they ate | MEDIUM | Each household member logs independently against their own targets |
| Personal calorie/macro targets | Without targets, tracking has no meaning | LOW | Per-person targets stored on profile; used to contextualize daily totals |
| Daily summary view | Users want to see at a glance how they're tracking for the day | LOW | Calories remaining, macros consumed vs target; the "dashboard" screen |
| Weekly meal plan view | Meal planning is the core promise; must be visible at a week level | MEDIUM | Calendar grid with breakfast/lunch/dinner slots; meals assigned to slots |
| Edit and delete entries | Basic data hygiene — users make mistakes | LOW | Required for foods, recipes, meals, and log entries |
| Mobile-friendly layout | Primary use is in the kitchen or at the table on a phone | MEDIUM | Mobile-first responsive; touch targets; readable font sizes; no hover-only interactions |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required by category norms, but directly serve NourishPlan's core value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Household / family sharing | Most trackers are single-user; family sharing with a shared meal plan is the core differentiator | HIGH | Household model: one meal plan, multiple members each with independent logs and targets |
| Per-person portion suggestions | Solves the real family problem: the same meal feeds different people different amounts | HIGH | Given a recipe's nutrition per serving, compute "X should eat Y servings to hit Z% of their target" — requires personal targets + recipe nutrition to both be solid first |
| Nested recipes (recipe-as-ingredient) | Enables realistic home cooking (e.g., a sauce recipe used inside a main recipe) | HIGH | Requires recursive nutrition calculation; most consumer apps don't support this; prevents workarounds like duplicating sub-recipes |
| Full food hierarchy (Foods → Recipes → Meals → Meal Plans) | Clean data model that makes all other features correct and composable | HIGH | This is architecture-level but user-visible: users can reuse a recipe across multiple meals and see consistent nutrition data |
| Manual portion override at log time | Acknowledges real eating behavior (ate 1.5 servings, not 1) | LOW | Simple multiplier on log entry; important for honesty in tracking |
| Micronutrient tracking | Cronometer differentiates on 84+ nutrients; basic apps only show macros | MEDIUM | USDA FoodData Central includes micronutrient data; expose vitamins and minerals progressively — not on the main screen, but accessible |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| AI-generated meal plans | Feels modern; users see it in competitors | Requires training data on user preferences, dietary restrictions, cultural foods — hard to get right; low-value when wrong; creates dependency on model quality | Let users build and save their own templates; add recipe suggestions from saved recipes after v1 is validated |
| Barcode scanning | Common in MyFitnessPal, expected by power users | Requires camera access, third-party barcode database (Open Food Facts or commercial), significant dev overhead; mobile camera quality varies | USDA search covers branded products; manual entry covers gaps; defer to v2 |
| Grocery list generation | Obvious extension of meal planning | Requires ingredient quantity → purchase unit mapping (e.g., "2 tbsp butter" → "buy 1 stick"); pantry state tracking adds more complexity; easy to build badly | Defer to v2; meal plan is the core; grocery list is a convenience layer |
| Social / public recipe sharing | Familiar from other apps; feels like a community feature | Moderation burden; spam; nutritional accuracy of user-submitted data degrades quickly (MyFitnessPal's public DB has many inaccurate entries); not the family-private use case | Keep household-only in v1; user-generated public content is a separate product problem |
| Calorie goal auto-calculation (TDEE) | Users expect the app to set their targets for them | TDEE formulas (Mifflin-St Jeor, etc.) require activity level, age, weight inputs and produce estimates users often misinterpret as precise; also creates liability surface | Let users set their own targets explicitly; provide a help tooltip linking to an external TDEE calculator |
| Progress / weight tracking | MyFitnessPal includes it; users expect holistic health tracking | Outside NourishPlan's core value proposition; weight tracking data is sensitive and requires careful handling; adds scope without strengthening the family meal planning use case | Out of scope v1; nutrition data is the product |
| Real-time collaborative editing | Two family members editing the same meal plan simultaneously | WebSocket infrastructure for a use case that rarely occurs; families don't typically need concurrent editing | Optimistic UI with last-write-wins is sufficient; conflicts are rare in household use |

---

## Feature Dependencies

```
[USDA Food Database]
    └──enables──> [Food Search]
                      └──feeds──> [Recipe Builder]
                                      └──requires──> [Serving / Unit handling]
                                      └──enables──> [Nested Recipes]
                                      └──produces──> [Recipe Nutrition]
                                                         └──feeds──> [Meal Nutrition]
                                                                         └──feeds──> [Meal Plan]

[Personal Nutrition Targets]
    └──required by──> [Daily Summary]
    └──required by──> [Per-Person Portion Suggestions]

[Household / Family Sharing]
    └──requires──> [User Accounts + Auth]
    └──enables──> [Shared Meal Plan view]
    └──enables──> [Per-Person Portion Suggestions]

[Meal Plan]
    └──requires──> [Meals]
                       └──requires──> [Recipes or Foods]

[Daily Nutrition Log]
    └──requires──> [User Account]
    └──requires──> [Recipes or Foods (to log)]
    └──produces──> [Daily Summary]
```

### Dependency Notes

- **Recipe Builder requires Food Search:** You cannot build a recipe without food entries to add as ingredients. Food database integration must ship before recipe builder is useful.
- **Nested Recipes require Recipe Builder:** Sub-recipe support is an extension of the recipe model. The base recipe builder must be solid before nesting is layered in.
- **Per-Person Portion Suggestions require both Personal Targets and Recipe Nutrition:** Neither alone is sufficient. Targets without recipe nutrition means no calculation. Recipe nutrition without targets means no personalization.
- **Household Sharing requires User Accounts:** Multi-member households imply multiple accounts with a shared household entity. Auth and household membership are gating infrastructure.
- **Daily Summary requires Personal Targets:** The summary view shows progress toward a goal. Without a goal, it is only a raw total — less useful and less motivating.
- **Meal Plan requires Meals, which require Recipes:** The hierarchy flows strictly top-down. Meal Plan → Meal → Recipe → Food. Each level must exist before the level above is buildable.

---

## MVP Definition

### Launch With (v1)

Minimum viable product to validate the family meal planning use case.

- [ ] User accounts + household model — without this, sharing is impossible; it is the structural foundation
- [ ] USDA food search + manual custom food entry — the data layer everything else builds on
- [ ] Recipe builder (ingredients, servings, auto-calculated nutrition) — enables meaningful meal content
- [ ] Meal and meal plan creation (Foods/Recipes → Meals → Meal Plans) — the core planning workflow
- [ ] Per-person nutrition targets (calories + P/C/F macros) — makes the app personalized, not generic
- [ ] Daily nutrition log per person with manual portion override — completes the track → review loop
- [ ] Daily summary view per person — closes the feedback loop; without this, logging feels pointless
- [ ] Mobile-first responsive PWA — the product is used on phones; desktop layout is secondary

### Add After Validation (v1.x)

- [ ] Nested recipes — high complexity; validate that users actually build multi-component recipes before investing in recursive nutrition calculation
- [ ] Per-person portion suggestions — requires portion math on top of a solid data model; add once the food hierarchy is stable and populated
- [ ] Micronutrient display — expose after core macro tracking is proven useful; add as a progressive disclosure layer
- [ ] Weekly meal plan templates (save and reuse a plan) — once families have built plans, they will want to repeat them; implement after the first creation flow is tested

### Future Consideration (v2+)

- [ ] Grocery list generation — convenient but architecturally complex (unit mapping); defer until v1 data model is mature
- [ ] Barcode scanning — third-party dependency, camera API complexity; high cost for a feature USDA search mostly covers
- [ ] Leftovers tracking — nuanced UX (partial consumption, date tracking); defer until core logging is validated
- [ ] Weekly nutrition reports / history charts — useful after users have enough logged data to make reports meaningful (at least 2–4 weeks)
- [ ] AI recipe suggestions — requires preference signal accumulation; not useful on day one

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| USDA food search | HIGH | MEDIUM | P1 |
| Manual custom food entry | HIGH | LOW | P1 |
| Recipe builder | HIGH | MEDIUM | P1 |
| Meal + meal plan creation | HIGH | MEDIUM | P1 |
| Personal nutrition targets | HIGH | LOW | P1 |
| Daily nutrition log | HIGH | MEDIUM | P1 |
| Daily summary view | HIGH | LOW | P1 |
| Household / family sharing | HIGH | HIGH | P1 |
| Mobile-first PWA layout | HIGH | MEDIUM | P1 |
| Per-person portion suggestions | HIGH | MEDIUM | P2 |
| Nested recipes | MEDIUM | HIGH | P2 |
| Micronutrient tracking | MEDIUM | MEDIUM | P2 |
| Weekly plan templates (save/reuse) | MEDIUM | LOW | P2 |
| Grocery list generation | MEDIUM | HIGH | P3 |
| Barcode scanning | MEDIUM | HIGH | P3 |
| Weekly nutrition reports | MEDIUM | MEDIUM | P3 |
| AI meal plan generation | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | MyFitnessPal | Cronometer | Mealime / Plan to Eat | NourishPlan approach |
|---------|--------------|------------|----------------------|----------------------|
| Food database | 11M+ foods (user-submitted, some inaccurate) | 1M+ (USDA-verified, accurate) | Recipe-focused, limited raw ingredient search | USDA FoodData Central (380k+, validated) + manual custom |
| Recipe builder | Yes (basic) | Yes (basic) | Yes (primary feature) | Yes, core feature with nested recipe support |
| Household sharing | No (individual only) | No (individual only) | Limited (Mealime: 2 people; Plan to Eat: family accounts) | First-class household model — core differentiator |
| Per-person portions | No | No | No | Core differentiator — auto-suggests per person |
| Nutrient depth | Macros + basic micros | 84+ micronutrients | Macros only | Macros at launch, micros in v1.x |
| Meal planning calendar | Basic | No | Yes (primary feature) | Yes — weekly view, shared across household |
| Nested recipes | No | No | No | Yes — enables realistic home cooking |
| PWA / offline | No | No | No | Yes — installable, mobile-first |
| Grocery list | Yes | No | Yes | Deferred to v2 |
| Barcode scanning | Yes | Yes | No | Deferred to v2 |

---

## Sources

- [USDA FoodData Central API Guide](https://fdc.nal.usda.gov/api-guide/) — confirmed API capabilities, rate limits (1,000 req/hr), free public domain data
- [Garage Gym Reviews: Best Calorie Counter Apps 2026](https://www.garagegymreviews.com/best-calorie-counter-apps) — competitor feature baseline
- [Cronometer vs MyFitnessPal comparison — Gemma Sampson](https://www.gemmasampson.com/blog/cronometer-vs-myfitnesspal) — nutrient depth analysis
- [Cal AI: MyFitnessPal vs Cronometer](https://www.calai.app/blog/myfitnesspal-vs-cronometer/) — database accuracy comparison
- [Best Meal Planning Apps for Families 2026 — Ollie](https://ollie.ai/2025/10/29/best-meal-planning-apps-2025/) — family sharing feature landscape
- [FoodiePrep: Meal Planning Apps 2026 — Features That Matter](https://www.foodieprep.ai/blog/meal-planning-apps-in-2026-which-tools-actually-simplify-your-kitchen) — table stakes discovery
- [Designli: What is Feature Creep](https://designli.co/blog/what-is-feature-creep-and-how-to-avoid-it) — scope discipline rationale
- [PMC: Mobile Apps to Support Healthy Family Food Provision](https://pmc.ncbi.nlm.nih.gov/articles/PMC6320405/) — family app pitfalls (disconnected pantry/grocery, individual-only calorie models)
- [Top Nutrition APIs for Developers 2026 — SpikeAPI](https://www.spikeapi.com/blog/top-nutrition-apis-for-developers-2026) — USDA vs alternatives

---

*Feature research for: Family meal planning / calorie tracking PWA (NourishPlan)*
*Researched: 2026-03-12*
