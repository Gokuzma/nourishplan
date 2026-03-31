# Phase 18: Grocery List Generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 18-grocery-list-generation
**Areas discussed:** List generation logic, Store categories & sorting, Shopping experience, Staple restock & extras

---

## List Generation Logic

| Option | Description | Selected |
|--------|-------------|----------|
| Live/reactive | List auto-updates whenever the meal plan changes | |
| On-demand button | User clicks 'Generate Grocery List' to snapshot the current plan | ✓ |
| Weekly auto + manual refresh | Auto-generates once when a new meal plan week starts | |

**User's choice:** On-demand button
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Merge by food + unit | Same food in same unit merges into one line | |
| Merge with smart conversion | Same food merges even across compatible units (e.g., 500ml + 1L = 1.5L) | ✓ |
| No merging — per-recipe lines | Each recipe's ingredient stays as a separate line | |

**User's choice:** Merge with smart conversion
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Split view: 'Have' vs 'Need' | Two sections — 'Already Have' and 'Need to Buy' | ✓ |
| Single list with annotations | One unified list with stock badges | |
| Hide covered items entirely | Only show what needs to be bought | |

**User's choice:** Split view: 'Have' vs 'Need'
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — per-item and total | Each 'Need to Buy' item shows estimated cost, total at top | ✓ |
| Total only | Just total estimated grocery cost at top | |
| No cost display | Keep grocery list focused purely on items | |

**User's choice:** Yes — per-item and total
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Active week only | Generate from currently active meal plan week | ✓ |
| User-selectable date range | User picks start/end dates | |
| Next N days | User chooses how many days ahead | |

**User's choice:** Active week only
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — exclude cooked meals | Cooked meals' ingredients excluded from grocery list | ✓ |
| No — include all planned meals | Show all planned meal ingredients regardless | |

**User's choice:** Yes — exclude cooked meals
**Notes:** None

---

### Budget & Pricing (user-initiated)

**User's input:** "The grocery list is the thing that is constrained by the budget. If the grocery list is more than the budget then we have failed. We should be able to double check the prices on the grocery list from available data online at local retailers."

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to future phase | Phase 18 uses existing food_prices data only | |
| Include basic lookup in Phase 18 | Add simple price check feature alongside list generation | ✓ |

**User's choice:** Include basic lookup in Phase 18
**Notes:** Grocery list is the budget-constrained artifact. Over-budget = clear warning. Basic retailer price lookup included.

---

## Store Categories & Sorting

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed categories | Predefined set (Produce, Dairy, Meat, etc.) | ✓ |
| User-customizable categories | Start with defaults, let users modify | |
| Store-specific aisles | User defines aisle layout for their store | |

**User's choice:** Fixed categories
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-assign from food group data | Use USDA/CNF food group metadata | |
| Auto-assign with manual override | Auto-assign with user override that persists | ✓ |
| Keyword-based heuristic | Match food names against keyword lists | |

**User's choice:** Auto-assign with manual override
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Alphabetical | A-Z within each category | ✓ |
| By quantity/amount needed | Largest quantities first | |
| By estimated cost | Most expensive first | |

**User's choice:** Alphabetical
**Notes:** None

---

## Shopping Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Tap to toggle | Simple tap/click to mark checked | |
| Swipe to check | Swipe right to check off | |
| Tap with undo toast | Tap to check with brief 'Undo' toast | ✓ |

**User's choice:** Tap with undo toast
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Move to bottom of category | Checked items slide to bottom with strikethrough | ✓ |
| Stay in place with strikethrough | Items stay in position but get dimmed | |
| Collapse into 'Done' section | All checked items go to single 'Done' section | |

**User's choice:** Move to bottom of category
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time sync | Live sync via Supabase realtime subscriptions | ✓ |
| Sync on refresh | Changes sync on page refresh | |
| Single-user list | No sync, independent check state | |

**User's choice:** Real-time sync
**Notes:** For split-shopping across household members

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — auto-add to inventory | Checked items auto-added to inventory | |
| Prompt to add | Quick prompt after checking off | |
| No auto-add | Checking is purely shopping tracking | ✓ |

**User's choice:** No auto-add
**Notes:** None

---

## Staple Restock & Extras

| Option | Description | Selected |
|--------|-------------|----------|
| Separate 'Restock' section | Third section below 'Need to Buy' | |
| Mixed into 'Need to Buy' | Low staples in regular list with 'Restock' badge | ✓ |
| Notification only | Banner/alert only, not line items | |

**User's choice:** Mixed into 'Need to Buy'
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed default threshold | All staples use sensible default | |
| Per-item threshold | User sets threshold per staple | |
| Claude's discretion | Let Claude decide threshold logic | ✓ |

**User's choice:** Claude's discretion
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — free-text add | Add item field for anything | ✓ |
| Yes — from food database | Add from food search overlay | |
| No manual adds | List strictly from meal plan + restocks | |

**User's choice:** Yes — free-text add
**Notes:** None

---

## Claude's Discretion

- Restock threshold logic for staple items
- Unit conversion rules and edge cases
- Grocery list data model design
- Category assignment heuristic fallback
- Retailer price lookup implementation

## Deferred Ideas

- Full multi-retailer price comparison engine
- Price import from grocery store APIs/loyalty cards
- Recurring/scheduled grocery lists
- Store-specific aisle mapping
