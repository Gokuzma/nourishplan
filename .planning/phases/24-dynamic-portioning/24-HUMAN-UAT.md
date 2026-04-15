---
status: partial
phase: 24-dynamic-portioning
source: [24-VERIFICATION.md]
started: 2026-04-15T17:35:00Z
updated: 2026-04-15T17:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Reconcile ROADMAP.md goal text with shipped scope
expected: Phase 24's ROADMAP.md entry (lines 463-469) still describes the pre-D-02 goal — "Portion suggestions adapt over time based on each member's satiety feedback and consumption history." The shipped feature is tier-aware recipe selection (Favorites / Liked / Novel quotas) per D-02 in 24-CONTEXT.md. Either update ROADMAP.md in place to reflect the rewritten PORT-02 (preference-based recipe scheduling), or leave the ROADMAP wording as the aspirational long-term goal and annotate REQUIREMENTS.md PORT-02 to note that phase 24 delivered the recipe-selection prerequisite. User decides which framing is correct.
result: [pending]

### 2. Live UAT — Recipe Mix slider drives the generated plan
expected: Open the live app (nourishplan.gregok.ca). Navigate to Plan page. Expand the Recipe Mix panel below the Priority Order panel. Adjust sliders to something non-default (e.g. 70 Favorites / 20 Liked / 10 Novel). Click Generate Plan and wait for completion.

Then in the Supabase SQL editor run:
```sql
select constraint_snapshot->'recipeMix' as mix, created_at
from plan_generations
order by created_at desc limit 1;
```
Expected row: `mix = {"favorites":70,"liked":20,"novel":10}` — NOT the `{50,30,20}` defaults.

Then:
```sql
select day_index, slot_name, generation_rationale
from meal_plan_slots
where plan_id = (select id from meal_plans where household_id = '<your household id>' order by week_start desc limit 1)
  and generation_rationale is not null
limit 20;
```
Expected: ≥1 row starting with "Favorite —", ≥1 with "Liked —", and ≥1 with "Novel —". (Exact counts depend on how the AI honoured the 70/20/10 quotas over the 28 weekly slots.)
result: [pending]

### 3. Live UAT — Tier-prefixed rationale is visible in-app
expected: With the same generated plan from test #2, open any slot card on the Plan page. The rationale tooltip (the "why this recipe?" hover/tap target wired into AIRationaleTooltip) should display the tier-prefixed string literally — e.g. "Favorite — avg 4.6 stars across 3 cooks" or "Novel — similar ingredients to your top-rated Lentil Tacos". The prefix must be present; previous phases only showed un-prefixed rationale.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
