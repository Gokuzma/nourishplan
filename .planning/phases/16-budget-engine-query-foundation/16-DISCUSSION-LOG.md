# Phase 16: Budget Engine & Query Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 16-budget-engine-query-foundation
**Areas discussed:** Cost Input UX (pre-discussion), Budget Display, Cost Data Model, Query Key Migration

---

## Cost Input UX (Pre-Discussion Redirect)

User clarified before area selection that ingredient costs should NOT be manually entered per-recipe. Instead, costs should come from grocery store websites. User shops at Great Canadian Superstore.

**User's vision:** All 3 cost input methods should be available:
1. Grocery store API integration (live prices)
2. Import from grocery order/receipt
3. Manual entry at purchase time

**Scope decision:** Options 1 and 2 are new capabilities — deferred to future phases. Phase 16 uses manual entry at purchase time as the foundation, with the data model designed to support API/import later.

---

## Budget Display

### Weekly spend location on Plan page

| Option | Description | Selected |
|--------|-------------|----------|
| Top banner | Persistent summary bar at top showing "$X / $Y spent" with progress bar | |
| Compact chip | Small pill next to week title, tap to expand | |
| Dedicated section | Collapsible "Budget" card below weekly grid with per-day breakdown | ✓ |

**User's choice:** Dedicated section
**Notes:** None

### Cost per serving on recipe cards

| Option | Description | Selected |
|--------|-------------|----------|
| Subtitle line | "$X.XX/serving" as secondary line below recipe name | ✓ |
| Badge/pill | Small colored badge in corner of recipe card | |
| Only in detail view | Don't show on cards, only in full recipe view | |

**User's choice:** Subtitle line
**Notes:** None

### Missing ingredient prices

| Option | Description | Selected |
|--------|-------------|----------|
| Show partial cost | Compute from priced ingredients, show "$X.XX+ (3 of 5 priced)" | ✓ |
| Hide cost entirely | No cost until all ingredients priced | |
| Show $0 for unpriced | Treat unpriced as free | |

**User's choice:** Show partial cost
**Notes:** None

### Budget scope

| Option | Description | Selected |
|--------|-------------|----------|
| Per household | One weekly budget for whole household | ✓ |
| Per person | Each member has own budget allocation | |

**User's choice:** Per household
**Notes:** None

### Budget section default state

| Option | Description | Selected |
|--------|-------------|----------|
| Expanded | Starts open — visibility is the point | ✓ |
| Collapsed | Starts collapsed, tap to expand | |

**User's choice:** Expanded
**Notes:** None

### Currency

| Option | Description | Selected |
|--------|-------------|----------|
| CAD only | Hardcode Canadian dollars | ✓ |
| User-selectable | Let user pick currency in settings | |

**User's choice:** CAD only
**Notes:** None

### Budget input location

| Option | Description | Selected |
|--------|-------------|----------|
| Settings page | Add field to Household section in Settings | |
| Plan page inline | Edit directly from budget section | |
| Both | Settings for setup + inline on Plan page | ✓ |

**User's choice:** Both
**Notes:** None

---

## Cost Data Model

### Price storage location

| Option | Description | Selected |
|--------|-------------|----------|
| Global food price table | Separate food_prices table, one price per food per household | ✓ |
| Per-ingredient on recipe | cost_per_100g on recipe_ingredients table | |
| Price history ledger | Track every purchase as price event | |

**User's choice:** Global food price table
**Notes:** None

### Price entry method (Phase 16)

| Option | Description | Selected |
|--------|-------------|----------|
| From recipe builder | Inline "Set price" prompt when ingredient has no price | |
| Dedicated price manager | Separate page for bulk price management | |
| Both | Inline in recipe builder + dedicated manager in Settings | ✓ |

**User's choice:** Both
**Notes:** None

### Price format

| Option | Description | Selected |
|--------|-------------|----------|
| Either per-weight or per-package | System converts to cost_per_100g internally | ✓ |
| Per weight only | Always $/kg or $/100g | |
| Per package only | Always total price + package size | |

**User's choice:** Either
**Notes:** None

### What counts as "spend"

| Option | Description | Selected |
|--------|-------------|----------|
| Planned meals cost | Sum of planned meals based on ingredient prices | |
| Logged meals cost | Sum of what was actually logged/eaten | |
| Both planned + actual | Projected + actual with comparison | ✓ |

**User's choice:** Both
**Notes:** User specified: "We need to log when planned meals are cooked, those get logged as spend. Also, meals that are not planned such as takeout or restaurants also need to be tracked as spend."

### Multi-store support

| Option | Description | Selected |
|--------|-------------|----------|
| Single price per food | One current price per food per household | |
| Price per store | Track prices by store for price comparison | ✓ |

**User's choice:** Price per store
**Notes:** None

### Takeout/restaurant spend

| Option | Description | Selected |
|--------|-------------|----------|
| Quick expense entry | Simple "Log expense" button, amount + note | |
| Through food logging | Track via existing food log flow with cost field | ✓ |
| You decide | Claude picks | |

**User's choice:** Through food logging
**Notes:** None

### Cook logging mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Auto from food logs | Logging a meal auto-computes and records cost | |
| Explicit cook button | "Cooked" button on recipe records cost as spend | ✓ |
| You decide | Claude picks | |

**User's choice:** Explicit cook button
**Notes:** User specified: "Since recipes are a part of this, we need to have the cook button when we are looking at the recipe. Once cooked, consider ingredients used and money spent."

### Price manager navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Settings sub-section | "Food Prices" section within Settings page | ✓ |
| Standalone page | New top-level page in More drawer | |
| You decide | Claude picks | |

**User's choice:** Settings sub-section
**Notes:** None

---

## Query Key Migration

### Migration strategy

| Option | Description | Selected |
|--------|-------------|----------|
| All at once in this phase | Migrate all 8+ existing hooks to queryKeys.ts | ✓ |
| New queries only | Only v2.0 queries use queryKeys.ts, existing keep inline | |
| You decide | Claude picks | |

**User's choice:** All at once
**Notes:** None

---

## Claude's Discretion

- Query key naming convention and hierarchy structure
- Exact food_prices table schema details
- Price manager list/filter UI design
- Cook button integration with recipe detail view layout

## Deferred Ideas

- Great Canadian Superstore / PC Express API integration for live prices
- Grocery order import for automatic price population
- Ingredient deduction from inventory on cook (Phase 17)
- Price history/trend tracking
