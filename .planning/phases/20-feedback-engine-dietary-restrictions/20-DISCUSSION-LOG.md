# Phase 20: Feedback Engine & Dietary Restrictions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 20-feedback-engine-dietary-restrictions
**Areas discussed:** Rating & satiety flow, Dietary restrictions UX, Won't-eat list & flagging, Monotony detection & warnings

---

## Rating & Satiety Flow

| Option | Description | Selected |
|--------|-------------|----------|
| After Cook button | Inline prompt on CookDeductionReceipt | |
| End-of-day summary | HomePage shows "Rate today's meals" card at end of day | ✓ |
| Next-day morning nudge | Prompt appears next morning | |

**User's choice:** End-of-day summary
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3-point simple | Still hungry / Just right / Too much | |
| 5-point detailed | Starving / Slightly hungry / Satisfied / Full / Stuffed | |
| AI-inferred from portions | Skip explicit satiety input, AI analyzes patterns | |

**User's choice:** Satiety deprioritized entirely — "not concerned about feeling full unless its the kid, which isn't really necessary we only really care about calorie counts being accurate and appropriate"
**Notes:** Satiety tracking omitted or made minimal/optional. Calorie accuracy is the priority.

---

| Option | Description | Selected |
|--------|-------------|----------|
| AI insights on recipes | AI periodically analyzes ratings to surface patterns | |
| AI auto-tags recipes | AI uses rating data to auto-tag recipes | |
| Both insights + auto-tags | Full AI treatment — pattern analysis AND auto-generated tags | ✓ |

**User's choice:** Both insights + auto-tags
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent card until rated | Card stays on HomePage until all cooked meals rated | ✓ |
| Auto-dismiss after 24h | Card disappears next day if not rated | |
| Weekly batch prompt | Weekly "Rate this week's meals" screen | |

**User's choice:** Persistent card until rated

---

| Option | Description | Selected |
|--------|-------------|----------|
| Per-member | Each member rates independently | |
| Single household rating | One rating per recipe per cook event | |
| Per-member optional | Primary cook rates, others CAN add theirs | ✓ |

**User's choice:** Per-member optional

---

| Option | Description | Selected |
|--------|-------------|----------|
| 1-5 stars | Standard granularity | ✓ |
| Thumbs up/down | Binary signal | |
| Thumbs + optional stars | Quick thumbs, expand to stars | |

**User's choice:** 1-5 stars

---

| Option | Description | Selected |
|--------|-------------|----------|
| Both — inline tags + insights page | Tags on cards + deeper insights section | ✓ |
| Inline tags only | Tags on recipe cards only | |
| Insights page only | Dedicated analytics page only | |

**User's choice:** Both — inline tags + insights page

---

## Dietary Restrictions UX

| Option | Description | Selected |
|--------|-------------|----------|
| Member profile section | On Settings page under each member's profile | ✓ |
| Dedicated 'Dietary' page | New nav item or sub-page | |
| Nutrition targets page | Add to existing MemberTargetsPage | |

**User's choice:** Member profile section

---

| Option | Description | Selected |
|--------|-------------|----------|
| Predefined categories + custom | Checkboxes for common + free-text | ✓ |
| AI-suggested from food history | AI analyzes logs to suggest restrictions | |
| Free-text tags only | User types whatever they want | |

**User's choice:** Predefined categories + custom

---

| Option | Description | Selected |
|--------|-------------|----------|
| AI auto-maps | AI automatically identifies restricted ingredients | ✓ |
| Manual mapping only | User manually adds ingredients | |
| AI suggests, user confirms | AI proposes, user reviews | |

**User's choice:** AI auto-maps

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on SlotCard | Warning icon directly on affected slots | ✓ |
| Plan-level summary banner | Banner at top of Plan page | |
| Both inline + banner | Inline badges AND summary banner | |

**User's choice:** Inline on SlotCard

---

| Option | Description | Selected |
|--------|-------------|----------|
| Warn only | User can still assign, just shows warning | |
| Soft block with override | Confirmation dialog required | |
| Hard block for allergens | Allergens hard-blocked, preferences warned | ✓ |

**User's choice:** Hard block for allergens — two-tier enforcement

---

| Option | Description | Selected |
|--------|-------------|----------|
| AI classification via Edge Function | AI classifies ingredients against restrictions | |
| USDA/CNF food group metadata | Use existing food group data | |
| Hybrid — metadata first, AI fallback | Use metadata where available, AI for ambiguous | ✓ |

**User's choice:** Hybrid — metadata first, AI fallback

---

## Won't-Eat List & Flagging

| Option | Description | Selected |
|--------|-------------|----------|
| Food search + free text | Reuse FoodSearchOverlay + free-text | |
| Free-text tags only | User types food names, AI resolves | ✓ |
| Pick from recipe ingredients | Browse and check off from existing recipes | |

**User's choice:** Free-text tags only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Member-specific badges on SlotCard | Small avatar of affected member on slot | |
| Separate 'Issues' panel | Collapsible issues panel on Plan page | ✓ |
| Color-coded slot border | Colored left border on affected slots | |

**User's choice:** Separate 'Issues' panel

---

| Option | Description | Selected |
|--------|-------------|----------|
| Unified list | One combined list from AI + manual entries | ✓ |
| Separate lists | Restriction-derived and manual items separate | |

**User's choice:** Unified list

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same system, parent manages | Parents manage child entries, same list | |
| Stricter for kids | Won't-eat always hard-blocked for children | |
| Preference strength levels | dislikes/refuses/allergy per entry | ✓ |

**User's choice:** Preference strength levels — three tiers for both kids and adults

---

| Option | Description | Selected |
|--------|-------------|----------|
| AI suggests after pattern | AI notices low-rated ingredient patterns | ✓ |
| No auto-suggestions | Won't-eat is purely manual | |
| AI auto-adds with notification | AI automatically adds without permission | |

**User's choice:** AI suggests after pattern

---

## Monotony Detection & Warnings

| Option | Description | Selected |
|--------|-------------|----------|
| Recipe repeat count | Same recipe >2x in 2-week window | |
| AI-analyzed variety score | AI analyzes ingredient/cuisine diversity | |
| Both — simple rule + AI analysis | Rule for obvious repeats, AI for subtle monotony | ✓ |

**User's choice:** Both — simple rule + AI analysis

---

| Option | Description | Selected |
|--------|-------------|----------|
| Plan page issues panel | Same panel as won't-eat conflicts | ✓ |
| Inline on repeated SlotCards | Repeat badge on each affected slot | |
| Weekly summary only | Monotony in weekly review | |

**User's choice:** Plan page issues panel

---

| Option | Description | Selected |
|--------|-------------|----------|
| AI suggests alternatives | Swap suggestion with similar nutrition/ratings | ✓ |
| Just warn, no suggestions | Warning only, user decides | |
| AI auto-swaps with undo | AI automatically replaces repeated recipes | |

**User's choice:** AI suggests alternatives

---

## Claude's Discretion

- Rating card UI design and animation on HomePage
- AI insight page layout and visualizations
- Exact predefined restriction category list
- AI Edge Function implementation details (model choice, prompt design, caching)
- Issues panel design and interaction patterns
- AI variety score computation and display
- Rating data model schema
- Won't-eat matching algorithm (fuzzy text → ingredient resolution)

## Deferred Ideas

None — discussion stayed within phase scope.
