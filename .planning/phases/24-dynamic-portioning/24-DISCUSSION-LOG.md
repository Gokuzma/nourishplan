# Phase 24: Dynamic Portioning - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 24-dynamic-portioning
**Areas discussed:** Adaptation signals, Weighting model, Visibility & controls, Data enrichment

---

## Adaptation Signals

| Option | Description | Selected |
|--------|-------------|----------|
| Portion gaps only | Compare suggested vs logged servings per member per recipe. Pure behavioral signal. | |
| Portion gaps + ratings | Also factor in recipe ratings for nuance. | |
| Portion gaps + ratings + calorie adherence | Track calorie target adherence as additional signal. | ✓ |

**User's choice:** Portion gaps + ratings + calorie adherence
**Notes:** All three signals selected for richest picture.

| Option | Description | Selected |
|--------|-------------|----------|
| Hard guardrail | Cap suggestions at calorie target. | ✓ |
| Soft influence | Calorie adherence affects learning rate but doesn't cap. | |

**User's choice:** Hard guardrail

| Option | Description | Selected |
|--------|-------------|----------|
| Per-recipe only | Each recipe has independent adaptation curve per member. | ✓ |
| Per-recipe + cross-recipe | Also learn general patterns across recipe categories. | |

**User's choice:** Per-recipe only

| Option | Description | Selected |
|--------|-------------|----------|
| Current calorie-split | Use existing calcPortionSuggestions() as baseline. | ✓ |
| Household average | Use other members' data as starting point. | |

**User's choice:** Current calorie-split

| Option | Description | Selected |
|--------|-------------|----------|
| Confidence modifier | Ratings affect convergence speed, not direction. | ✓ |
| Directional influence | Ratings can push portions up or down. | |

**User's choice:** Confidence modifier

---

## Phase Pivot (emerged during Learning Model discussion)

**Critical moment:** User clarified that portions should always be calorie-driven. "The learning is for recipes we like and how often to schedule them, not portion sizing."

| Option | Description | Selected |
|--------|-------------|----------|
| Implement PORT-02 as written | Adapt portion sizes based on repeated adjustments. | |
| Rewrite PORT-02 as preference learning | Replace portion-adaptation with recipe scheduling preference learning. | ✓ |
| Mark PORT-02 as already satisfied | Current system already fulfills PORT-02. | |

**User's choice:** Rewrite PORT-02 as preference learning

| Option | Description | Selected |
|--------|-------------|----------|
| Smart scheduling weights | Enhance planning engine with preference weighting. | ✓ |
| Smart scheduling + insights | Also add visible preference profile per member. | |
| Minimal: just confirm PORT-01 | Documentation/verification only. | |

**User's choice:** Smart scheduling weights

---

## Weighting Model

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered quotas | ~50% favorites, ~30% liked, ~20% novel. AI enforces ratios in prompt. | ✓ |
| Variety decay penalty | Recently-cooked recipes get decay penalty. More organic. | |
| User-set slider | Variety vs Comfort slider for direct control. | |

**User's choice:** Tiered quotas

| Option | Description | Selected |
|--------|-------------|----------|
| AI similarity matching | AI analyzes top-rated recipes and suggests similar uncooked ones. | ✓ |
| Tag-based matching | Use Phase 20 auto-tags for matching. | |
| Random from catalog | Pure random exploration. | |

**User's choice:** AI similarity matching

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed ratios | 50/30/20 baked into prompt. | |
| Adjustable via settings | User can tweak ratios via Plan page settings. | ✓ |

**User's choice:** Adjustable via settings
**Notes:** User wants control over the recipe mix balance.

---

## Visibility & Controls

| Option | Description | Selected |
|--------|-------------|----------|
| Category badges on slots | Star/thumbs-up/sparkle badges on generated slots. | |
| Expanded rationale only | Enhance existing AI rationale text to mention preference tier. | ✓ |
| No visibility | Algorithm picks smarter, users don't see categorization. | |

**User's choice:** Expanded rationale only

| Option | Description | Selected |
|--------|-------------|----------|
| Plan page alongside priorities | Recipe Mix sliders next to Phase 22 priority ordering. | ✓ |
| Settings page | Under Meal Planning Preferences in global Settings. | |

**User's choice:** Plan page alongside priorities

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, after rating | Novel recipes enter rated pool after receiving a rating. | ✓ |
| Yes, after first cook | Just cooking moves it out of novel pool. | |

**User's choice:** Yes, after rating

| Option | Description | Selected |
|--------|-------------|----------|
| No, low ratings are enough | 1-2 star rating deprioritizes sufficiently. | ✓ |
| Yes, explicit 'never suggest' flag | Long-press to permanently exclude recipe. | |

**User's choice:** No, low ratings are enough

---

## Data Enrichment

| Option | Description | Selected |
|--------|-------------|----------|
| Cook frequency | How many times each recipe cooked (from spend_logs). | ✓ |
| Last-cooked date | When each recipe was last cooked. | ✓ |
| Per-member ratings | Break down ratings by household member. | ✓ |
| Ingredient/cuisine similarity | Pass recipe ingredient lists for AI matching. | ✓ |

**User's choice:** All four selected
**Notes:** User also requested cost per serving be included — "budget is also a hard constraint for meal planning."

| Option | Description | Selected |
|--------|-------------|----------|
| Include in Phase 24 | Add cost per serving to generate-plan data in this phase. | ✓ |
| Track as Phase 22 gap | File as separate gap. | |

**User's choice:** Include in Phase 24

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in generate-plan | Add SQL queries to existing edge function. | ✓ |
| DB views / RPCs | Create Postgres views for pre-aggregation. | |

**User's choice:** Inline in generate-plan

---

## Claude's Discretion

- SQL query design for enriched data aggregation
- AI prompt encoding for tiered quotas
- Recipe Mix slider UI design
- AI rationale text enhancement
- Edge function performance optimization

## Deferred Ideas

None
