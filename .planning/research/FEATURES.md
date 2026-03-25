# Feature Research

**Domain:** Household meal planning platform — constraint-solving / AMPS features (v2.0)
**Researched:** 2026-03-25
**Confidence:** MEDIUM — WebSearch verified against multiple current sources (2025–2026); competitor app analysis; academic constraint-optimization literature. No single authoritative spec exists for this combined feature set.

> Note: v1.0 features (food search, recipe builder, household sharing, daily logging, nutrition targets, etc.) are fully built and validated. This document covers only the new v2.0 AMPS features.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any serious meal planning app in 2026. Missing these makes the product feel incomplete relative to Mealime, Plan to Eat, Eat This Much, and Ollie.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Cost per recipe / per serving display | Budget-conscious users treat cost as a core planning input; Eat This Much has budget limits; users explicitly seek "budget meal planning apps" | LOW | User-entered ingredient costs; no live price API in MVP. Display alongside nutrition on recipe cards and meal plan slots. |
| Weekly budget total with remaining balance | Users mentally budget groceries weekly; a running total is the minimum useful feedback | LOW | Sum of (cost-per-serving × servings planned) for the week. Visual warning when over budget. |
| Pantry / fridge / freezer item list with quantities | Knowing what is on-hand before generating a grocery list is expected in any pantry-aware app (Cooklist, KitchenPal set this expectation) | MEDIUM | Manual entry only (no barcode scanning). Storage location categories (pantry / fridge / freezer) are table stakes; expiry tracking is a differentiator. |
| Grocery list auto-generated from the meal plan | Core meal planner feature — manually building a list from a plan is a regression | MEDIUM | Aggregate ingredients across all planned meals for the week. Deduplicate and sum quantities by unit. |
| Grocery list grouped by store category | Users shop by aisle; ungrouped lists cause unnecessary back-and-forth in the store | LOW | Standard grouping: produce / dairy / meat / pantry staples / frozen / other. |
| Grocery list marks "already have" vs "need to buy" | Pantry-aware lists are now baseline in 2026 — Cooklist and Samsung Food both do this | MEDIUM | Subtract on-hand inventory quantities from required quantities before showing the list. Requires inventory engine. |
| Recipe star rating (1–5) | The minimal feedback primitive every user expects to be able to provide; Ollie has 5-star ratings | LOW | Stored per household member. Powers repeat-rate tracking and future adaptive suggestions. |
| Drag-and-drop weekly calendar | Plan to Eat, mealplanner.app, and Ollie all use DnD as the primary planning gesture; users who have used any of these expect it | HIGH | dnd-kit recommended (lighter than react-beautiful-dnd, actively maintained). Desktop-quality interaction; mobile fallback to tap-to-move or long-press-to-pick-up. |
| Per-member dietary restriction / allergy flags | Families with allergies or intolerances consider this non-negotiable | LOW | Tag system per member: gluten-free, nut allergy, dairy-free, vegetarian, vegan, halal, kosher, etc. Applied as hard filter during plan generation and flagged on recipe cards. |
| Per-person portion scaling that flows to grocery quantities | Eat This Much scales recipes for up to 9 people and propagates to grocery lists; users expect quantities to be correct for their household size | MEDIUM | Extend existing v1.0 per-person portion suggestions so grocery list quantities reflect each member's planned portions, not just "1 serving." |

### Differentiators (Competitive Advantage)

Features that go beyond what any current consumer meal planning app offers, and directly serve the AMPS core value: optimize nutrition, cost, time, and satisfaction under real-world household constraints.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Constraint-based plan generation | Generates a valid weekly plan simultaneously optimizing nutrition + cost + time + satisfaction — no consumer app does this | HIGH | Combinatorial constraint satisfaction over the household's recipe pool. Rule-based (not AI) for MVP: hard constraints (allergy, budget ceiling, schedule availability) plus soft constraints (prefer higher-rated, avoid recently repeated). LP or greedy assignment is sufficient at household scale. |
| Schedule-aware planning (cook availability as planning constraint) | Work schedules and meal timing as first-class inputs — no consumer app supports this | HIGH | User marks days / time slots as "unavailable to cook" or "low time" vs "available." Planner avoids assigning high-prep meals to constrained slots. Direct differentiator vs all competitors. |
| Prep schedule with task sequencing | Most apps show what to cook but not when to prep. Sequenced prep tasks reduce weekday friction and are a concrete, tangible output users can act on | HIGH | Model prep tasks as a directed acyclic graph (e.g., marinate before bake, chop before sauté). Assign to available time windows. Detect batch opportunities (e.g., same vegetable used in 3 recipes this week — chop once). |
| Expiry-priority ingredient weighting | Planner weights recipes that use near-expiry inventory items — directly reduces food waste | MEDIUM | Sort inventory items by expiry date. When selecting recipes for the generated plan, prefer recipes whose main ingredients include items expiring within N days. Surface "use-it-up" suggestions separately. |
| Satiety feedback (too little / right / too much) | Tracks whether planned portions were actually satisfying — informs future portion adjustments | MEDIUM | 3-point scale attached to each log entry. Accumulated signal adjusts default portion suggestions per person per recipe over time. Differentiates from simple star rating. |
| Batch cooking efficiency scoring | Surface which recipe combinations this week minimize total prep time through shared ingredients and equipment | MEDIUM | Compute ingredient overlap and equipment overlap across the week's planned recipes. Display "prep efficiency" score or highlight batch opportunities. Pairs with prep schedule output. |
| Child / selective eater support — per-member avoided foods list | Families with picky children need meal plans that account for accepted foods beyond binary dietary restrictions; no competitor supports this at the individual item level | MEDIUM | Each member has an "avoid" list at the ingredient level (not just category). Planner flags or excludes recipes containing avoided items for that member. Optionally suggests a simple substitution note (e.g., "serve without mushrooms for [child]"). |
| Repeat rate tracking and diversity warning | Flags recipes planned too frequently so plans feel varied — families report "we eat the same 5 meals on rotation" fatigue | LOW | Count how many times each recipe has appeared in plans over the last N weeks. Surface a "planned 3 times recently" warning in the planner and down-weight in auto-generation. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time grocery prices / price comparison | Users want accurate cost data without manual entry | Requires live grocery API (Instacart, Kroger, Walmart) with regional price variation, API rate limits, ToS risk, and frequent data staleness. Brittle external dependency for MVP. | User-entered ingredient costs per recipe. Accurate enough for relative budget comparisons; zero external dependency. |
| Barcode scanning for inventory entry | Reduces friction — scan items as you unpack groceries | Requires camera access + UPC barcode database + lookup API. High implementation cost; unreliable on mobile web (PWA camera constraints). Out of scope per PROJECT.md. | Manual search using existing USDA/CNF food database for inventory entry. Same nutritional data; no hardware dependency. |
| AI-generated recipe suggestions from pantry | "Use what you have" is compelling | Requires LLM API (cost, latency, hallucination risk). Not useful until feedback engine has accumulated signal. Hallucinated recipes with plausible-sounding but incorrect instructions are a support burden. | Rule-based inventory matching: if 3+ main ingredients of a saved recipe are in inventory, surface it as a "you can make this" suggestion. Deterministic, fast, and reliable. |
| Automated grocery ordering / delivery integration | Closes the loop from plan to delivered food | Deep integration with Instacart / Walmart / etc. APIs is high-maintenance, regionally limited, creates dependency on third-party ToS, and builds nothing proprietary. Out of scope per PROJECT.md. | Generate a clean, printable / shareable (text/clipboard) grocery list. Users handle the actual purchase channel. |
| Social recipe sharing / public community | Recipe discovery from other families | Public content requires moderation, trust systems, spam prevention, and nutritional accuracy auditing (MyFitnessPal's public database quality is the cautionary tale). Household-only scope is a feature, not a limitation. | Admin-maintained seed recipe library as optional starter content. Future: import from a recipe URL (structured data scraping). |
| Voice input for logging / planning | Feels modern; hands-free in the kitchen | PWA speech recognition is inconsistent across browsers (Chrome-only in many cases). High UX complexity for marginal gain when autocomplete search already handles fast input. | Fast text search with autocomplete (already built in v1.0). |
| Weight / progress tracking alongside meal planning | Users expect a holistic health app | Outside AMPS core value; weight data is sensitive; adds scope without strengthening the constraint-solving or planning use case. | Out of scope. Nutrition plan adherence (via daily log) is the product's output metric. |

---

## Feature Dependencies

```
[Budget Engine: cost per recipe / ingredient]
    └──required by──> [Weekly budget total + remaining]
    └──required by──> [Grocery list with cost totals]
    └──required by──> [Constraint-based planning engine] (cost as optimization constraint)

[Inventory Engine: pantry items + quantities + expiry]
    └──required by──> [Grocery list "already have" subtraction]
    └──required by──> [Expiry-priority ingredient weighting]
    └──enhances──>    [Constraint-based planning engine] (use-what-you-have weighting)

[Grocery List Aggregation]
    └──requires──>  [Meal plan slots with portions]         ← built v1.0
    └──requires──>  [Recipe ingredient lists with quantities] ← built v1.0
    └──requires──>  [Dynamic portioning per member]          (for correct quantities)
    └──enhanced by──> [Inventory Engine]                    (subtract on-hand)

[Per-member dietary tags + avoided foods list]
    └──required by──> [Constraint-based planning engine]    (hard constraint)
    └──enhances──>    [Meal plan display]                    (per-member flags)

[Schedule Model: availability windows per member / day]
    └──required by──> [Constraint-based planning engine]    (slot availability constraint)
    └──required by──> [Prep optimization: task assignment]  (assign tasks to available windows)

[Feedback Engine: star rating + satiety signal]
    └──required by──> [Repeat rate tracking]
    └──enhances──>    [Constraint-based planning engine]    (prefer high-rated, avoid repeated)
    └──enhances──>    [Dynamic portioning]                  (satiety signal adjusts future portions)

[Constraint-based planning engine]
    └──requires──>    [Budget Engine]
    └──requires──>    [Schedule Model]
    └──requires──>    [Per-member dietary tags + avoided foods]
    └──enhanced by──> [Inventory Engine]
    └──enhanced by──> [Feedback Engine]
    └──enhanced by──> [Dynamic portioning]

[Dynamic portioning: per-person portion optimization]
    └──requires──>    [Per-person calorie / macro targets]  ← built v1.0
    └──enhanced by──> [Feedback Engine: satiety signal]
    └──feeds into──>  [Grocery list quantities]

[Drag-and-drop planner]
    └──requires──>    [Existing meal plan slot structure]   ← built v1.0
    └──conflicts with──> [Constraint-based auto-generation] (manual edits must survive regeneration — needs "locked slot" mechanism)

[Prep optimization: task sequencing + batch detection]
    └──requires──>    [Recipe prep step data]               (new data model — recipes need a "steps" field)
    └──requires──>    [Schedule Model]
    └──enhances──>    [Batch cooking efficiency scoring]
```

### Dependency Notes

- **Budget Engine is a prerequisite for the constraint-based planner.** The planner cannot optimize against cost without cost data on recipes. Budget Engine must ship in an earlier phase.
- **Inventory Engine and Grocery Aggregation are tightly coupled.** A grocery list without pantry subtraction is useful but incomplete. Ship them in the same phase for a coherent user experience.
- **Schedule Model must precede Prep Optimization.** Prep task assignment requires knowing which time windows are available per day.
- **Drag-and-drop conflicts with auto-generated plans.** If the constraint engine regenerates a plan, it will overwrite manual DnD edits. Requires a "lock this slot" mechanism or explicit "regenerate from scratch" vs "fill empty slots only" modes. Design this before implementing either feature.
- **Feedback Engine data must accumulate before meaningful adaptation.** Build the data collection layer early so signal starts accumulating, even if the adaptation logic ships later.
- **Prep Optimization requires recipe step data** that does not currently exist in the data model. A migration to add a recipe `steps` array is a prerequisite for any prep schedule feature.

---

## MVP Definition

This is a subsequent milestone (v2.0 AMPS) on an existing validated product. "MVP" here means the minimum set of AMPS features that delivers the constraint-solving value proposition.

### Launch With (v2.0 Core)

- [ ] **Budget Engine** — cost per ingredient + recipe + weekly total — without cost data, the constraint solver has no budget input; users cannot do budget-aware planning
- [ ] **Inventory Engine** — manual pantry/fridge/freezer entry with quantities and expiry date — foundational for grocery subtraction and expiry-priority planning
- [ ] **Grocery List Aggregation** — auto-generated from meal plan, categorized, with pantry subtraction — closes the planning-to-shopping loop; high visibility win
- [ ] **Per-member dietary tags and avoided foods list** — required for child/selective eater support and constraint planning; low implementation cost
- [ ] **Drag-and-drop weekly planner** — UX upgrade that makes the existing plan editing usable enough to drive engagement; table stakes among competitors
- [ ] **Recipe rating (1–5 stars) + satiety feedback** — starts accumulating the signal the learning and adaptation engines need

### Add After Validation (v2.x)

- [ ] **Schedule Model** — availability windows as planning constraints — after core planning loop is working and users are engaged
- [ ] **Repeat rate tracking and diversity warning** — after feedback engine has enough rating history (2–4 weeks of use)
- [ ] **Prep optimization** — task sequencing and batch detection — after schedule model is in place and recipe step data model is migrated
- [ ] **Constraint-based plan generation** — after Budget Engine, Schedule Model, dietary tags, and Feedback Engine have data to work with
- [ ] **Dynamic portioning with satiety adaptation** — after feedback engine has accumulated signal (requires several weeks of satiety data per person)

### Future Consideration (v3+)

- [ ] **Adaptive plan personalization (learning system)** — requires months of feedback data per PROJECT.md; deferred explicitly
- [ ] **Barcode scanning** — deferred per PROJECT.md
- [ ] **Grocery delivery integration** — deferred per PROJECT.md
- [ ] **AI recipe suggestions** — deferred per PROJECT.md; not useful until preference signal accumulates

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Budget tracking (cost per recipe + weekly total) | HIGH | LOW | P1 |
| Grocery list aggregation (categorized) | HIGH | MEDIUM | P1 |
| Grocery list pantry subtraction | HIGH | MEDIUM | P1 |
| Inventory management (manual entry + expiry) | HIGH | MEDIUM | P1 |
| Drag-and-drop planner | HIGH | HIGH | P1 |
| Per-member dietary tags + avoided foods | HIGH | LOW | P1 |
| Recipe star rating (1–5) | MEDIUM | LOW | P1 |
| Satiety feedback (3-point) | MEDIUM | LOW | P1 |
| Expiry-priority ingredient weighting | MEDIUM | MEDIUM | P2 |
| Repeat rate tracking and diversity warning | LOW | LOW | P2 |
| Schedule model (availability windows) | HIGH | MEDIUM | P2 |
| Prep optimization (task sequencing) | HIGH | HIGH | P2 |
| Batch cooking efficiency scoring | MEDIUM | MEDIUM | P2 |
| Constraint-based plan generation | HIGH | HIGH | P2 |
| Dynamic portioning with satiety adaptation | MEDIUM | HIGH | P3 |
| Adaptive future plans (learning system) | HIGH | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Should have, add when core is validated
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Plan to Eat | Eat This Much | Ollie | Cooklist | NourishPlan AMPS approach |
|---------|-------------|---------------|-------|----------|--------------------------|
| Budget tracking | None | Weekly budget limit (premium) | None | Ingredient price comparison | Per-recipe cost entry + weekly total; feeds constraint engine |
| Pantry / inventory | None | None | Pantry photo (AI, beta) | Yes — pantry + fridge + freezer | Manual entry, expiry date, storage location |
| Grocery list | Auto-aggregated, categorized | Auto-aggregated | Auto-aggregated, by aisle | Auto-aggregated, pantry-aware | Auto-aggregated, categorized, pantry-subtracted, per-person quantities |
| Plan generation | Manual only | Fully automated (calorie-based) | AI-assisted | None | Constraint-based generation as option; DnD as primary manual path |
| Drag-and-drop | Yes (core UX) | No (auto-generated) | Yes | No | Yes — primary editing interaction |
| Multi-member portioning | Scale servings only | Up to 9 people (uniform) | Per-person macros | No | Per-person targets with satiety adaptation |
| Child / picky eater support | None | None | None | None | Per-member avoided food list as planning constraint |
| Feedback / rating | None | Thumbs up/down | 5-star rating | None | 5-star + satiety signal feeding constraint engine |
| Schedule constraints | None | None | None | None | Availability windows as planner input (differentiator) |
| Prep optimization | None | None | None | None | Task sequencing + batch detection (differentiator) |
| Constraint-based planner | None | Calorie-only | None | None | Multi-factor: nutrition + cost + time + preference (differentiator) |

---

## Sources

- [Top Meal Planning Apps for Smarter Budgets 2026 | Fitia](https://fitia.app/learn/article/top-meal-planning-apps-smarter-budgets-2026/)
- [The Best Meal Planning Apps for Families in 2026 | Ollie](https://ollie.ai/2025/10/29/best-meal-planning-apps-2025/)
- [Eat This Much — Family / Couple Meal Planning Help](https://help.eatthismuch.com/help/how-does-the-family-meal-planning-work)
- [Plan to Eat — Large Households Meal Planning](https://www.plantoeat.com/blog/2023/11/how-to-meal-plan-series-large-households/)
- [Getting Started: The Meal Planner (Plan to Eat website)](https://learn.plantoeat.com/help/getting-started-using-the-meal-planner)
- [Meal Planner App Features](https://www.mealplanner.app/features)
- [Best Meal Planning App in 2026: 8 Apps Compared | Mealift](https://www.mealift.app/blog/best-meal-planning-app)
- [KitchenPal: Pantry Inventory App](https://kitchenpalapp.com/en/)
- [Delighting Palates with AI: Reinforcement Learning in Meal Plans | PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10857145/)
- [Personalized Flexible Meal Planning for Diet-Related Health Concerns | PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10436119/)
- [A Review of Linear Programming to Optimize Diets | Frontiers in Nutrition](https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2018.00048/full)
- [Towards Automatically Generating Meal Plans Based on Genetic Algorithm | Springer](https://link.springer.com/article/10.1007/s00500-023-09556-0)
- [Top Meal Planning Apps of 2025: Simplify Your Meal Prep | MealFlow Blog](https://www.mealflow.ai/blog/top-meal-planning-apps-of-2025-simplify-your-meal-prep)

---

*Feature research for: NourishPlan v2.0 AMPS — constraint-solving household meal planning platform*
*Researched: 2026-03-25*
