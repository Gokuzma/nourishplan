# Month-of-Use Simulation — 2026-07-05

Simulated four weeks of realistic family use against prod, in a dedicated "Sim Family"
household (1 adult + 2 child profiles with distinct targets, a peanut allergy, a
mushroom dislike, a schedule, and a $220 weekly purse). Harness:
`scripts/sim-month.ts` (vite-node; imports the app's REAL utils — grocery generation,
FIFO deduction, cost math, macros — so product logic is what got exercised).

## What the month looked like

- Cookbook seeded through the product's own AI paths: 27 gap-fill + 6 Discover recipes.
- 4 weekly cycles: generate plan (varying recipe mix) → generate grocery list →
  shop & add to pantry → cook 7 meals/week with FIFO deduction, spend logging,
  leftovers (25%) → ~70% rating adherence → ~88% food-log adherence for all
  3 members. ~1,100 rows of realistic data.

## What held up ✅

- **Slot guardrail: perfect.** 0 slot-inappropriate placements across 112 slots ×
  4 weeks (the L-038 deterministic guardrail earns its keep).
- **Monotony: none.** No recipe appeared more than twice in any week.
- **Allergen safety:** no peanut recipe was ever planned (Ben's allergy respected).
- **FIFO deduction math:** 0 misses while the pantry actually contained the food;
  week 4 correctly ran items out (15/59 misses = genuine depletion, not bugs).
- **28/28 slots filled** every week, including Snacks.

## Bugs found → fixed this session

| # | Bug | Evidence | Fix |
|---|-----|----------|-----|
| 1 | **Grocery "Already have" never fires for AI recipes.** `subtractInventory` matched by `food_id` only; AI-generated/imported ingredients carry random UUIDs, so a fully-stocked pantry produced a 197-item shopping list. | Weeks 1–2 (pre-fix): 0 already-have despite 18 stocked staples. Weeks 3–4 (post-fix): 168–180 items correctly recognized as covered, list dropped to 0. | Name-fallback matching in `subtractInventory` (mirrors the FIFO matcher) + 2 regression tests. |
| 2 | **Tier rationale wiped by correction passes.** generate-plan's verify/correct prompt (passes 3–5) has no rationale rules; when a correction ran, its output replaced the labeled assignment and every slot lost its "Favorite/Liked/Novel — …" label. | 3 of 4 weekly plans had `generation_rationale=''` on all 28 slots; the only violation-free week kept labels. | Deterministic merge: preserve prior rationale for slots whose recipe didn't change. Deployed. |
| 3 | **Inventory swamp.** Every shopping trip inserted one inventory row per grocery line — 691 active rows after one month; the Inventory page becomes unusable and FIFO scans get slow. | 691 active items for a 3-person household. | Add-to-pantry now merges into an existing same-name/unit/location row instead of stacking duplicates. |

## Findings → recommendations (not fixed; product decisions)

1. **The purse tracks consumption, not spending.** `spend_logs` only allows
   `'cook' | 'food_log'` — the ~$180/week the family actually spent at the store is
   invisible; the purse showed $30–75/week and always looked comfortably under
   budget. For a family trying to *save money*, receipts are the truth.
   → Recommend: add a `'grocery'` spend source logged at list-checkout, and show
   both lines in the purse ("bought $182 · cooked $61"). Needs a small migration +
   a decision on which number the budget bar tracks (avoid double-counting).
2. **Leftovers die in the fridge.** All 6 leftovers created during the month expired
   unconsumed. Nothing pulls them into the next day's plan.
   → Recommend: generate-plan should treat unexpired leftovers as first-choice Lunch
   candidates, and Today's "Tonight" panel should show "leftover available" nudges.
3. **Budget visibility starves without prices.** Only ~25% of grocery items got cost
   estimates, entirely from the 12 ingredient names the sim "hand-priced". AI
   recipes mint new UUID ingredients every time, so prices never accumulate.
   → Recommend: key `food_prices` by normalized ingredient *name*, not per-recipe
   ingredient_id — one price for "olive oil" everywhere. (Also fixes cook-spend
   under-logging: only 6–14 spend logs/week had nonzero amounts.)
4. **Expiring food isn't planned around.** 4 items sat expired-but-active; the
   expiry badge exists but the planner only sees schedule-status "use-up" flags.
   → Recommend: feed items expiring within 7 days into generate-plan as a
   soft constraint (it already receives inventory names).
5. **Nutrition adherence view.** Logged intake landed at ~65% of every member's
   calorie target (partly sim artifact — flat 1-serving logging — but there is no
   week-level view to catch it). → Recommend: weekly kcal-vs-target trend on
   Insights (pairs with the earlier "Welcome overpromises trends" finding).
6. **Generation latency.** Several runs exceeded 120s wall time before `done`
   (in-function budget is 90s; the UI timeout messaging kicks in late).
   → Recommend: surface pass-level progress from `plan_generations.pass_count`.

## Simulation limitations

Browser UI wasn't driven (API + real utils only); portion suggestions weren't used
for logging (flat servings), so the calorie-shortfall number is directional, not
precise. The Sim Family household remains in prod as a reusable regression fixture —
`scripts/sim-month.ts` re-runs any phase idempotently.
