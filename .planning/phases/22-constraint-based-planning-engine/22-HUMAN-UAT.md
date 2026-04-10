---
status: diagnosed
phase: 22-constraint-based-planning-engine
source: [22-01-SUMMARY.md, 22-02-SUMMARY.md, 22-03-SUMMARY.md, 22-04-SUMMARY.md, 22-05-SUMMARY.md]
started: 2026-04-06T23:42:00Z
updated: 2026-04-10T17:01:00Z
tested_by: claude-playwright
test_account: UAT Test Family (plan c182b991-4ea6-48b0-b665-5112771903a4)
---

## Current Test

[testing complete]

## Tests

### 1. End-to-end plan generation flow
expected: Generate Plan button triggers generation, shimmer appears on unlocked slots, generated meals appear after completion, locked slot is preserved, AI rationale tooltip appears on tap/hover of generated slot
result: issue
reported: "I tried it, but not all meals were generated, there were empty slots after generating still."
severity: major
partial_pass:
  - Generate Plan button triggers generation (shows "Generating..." and disables)
  - Locked slots (Mon Dinner, Wed Dinner) are preserved across generations
  - AI rationale tooltip works on click — verified text "Vegetable Omelette is a quick, nutritious breakfast with protein and vegetables. Simple preparation fits breakfast timing."
  - generation_rationale persisted in meal_plan_slots (20/21 rows have rationale)
failures:
  - Snacks are NEVER filled — 7 empty Snack slots per week after every generation
  - Every recent generation has status="timeout" (pass_count stuck at 2, never reaches verify/correct passes 3-5)
  - Latest generation (ab50d3e5 at 2026-04-10T16:46): AI returned 26 slot assignments, only 19 survived validation filter — the 7 Snack assignments had hallucinated recipe_ids that don't exist in the recipe catalog

### 2. Nutrition gap card with swap suggestions
expected: After generation completes, if any member has a macro below 90% of their weekly target, the NutritionGapCard appears below the plan grid. Expand it and verify each gap row shows a "Swap X slot to Y (+Ng nutrient)" button. Tap the button and verify the slot's meal is replaced.
result: issue
reported: "Claude Playwright: NutritionGapCard did not render. The test household has zero nutrition targets configured (public.nutrition_targets is empty), so the hook's calcWeeklyGaps returns gaps=[] and the conditional render {latestGeneration && gaps.length > 0} is falsy. Cannot verify the swap-suggestion wiring end-to-end without test data. Feature code is wired (PlanGrid.tsx:623-627, NutritionGapCard.tsx exists, computeSwapSuggestions utility tests pass per 22-05-SUMMARY)."
severity: major
precondition_gap: "Test account has no nutrition_targets rows — cannot exercise gap detection branch"

### 3. Locked slot shimmer rendering
expected: During generation, locked slots should NOT show shimmer animation. Only unlocked empty slots shimmer.
result: issue
reported: "Claude Playwright: Locked slot itself correctly does NOT shimmer, but the surrounding rendering is broken. On Day 1 (Mon, with locked Dinner) during generation the DOM showed: 3 shimmers + 3 filled slots (Breakfast, Lunch, Dinner) + 1 locked indicator = 6 slot elements stacked in the same day container. On Day 0 (Sun, no locks) the DOM correctly showed 4 shimmers. The bug is in PlanGrid.tsx lines 576-604: the logic `slot?.is_locked ? dayCards[i] : <SlotShimmer />` runs per DEFAULT_SLOT — when ONE slot is locked, dayCards[i] (the entire day card for that day) is rendered AS THAT SLOT's placeholder, while the other 3 iterations still render SlotShimmer. Net effect: the full day content appears alongside 3 extra shimmer rows."
severity: major

## Summary

total: 3
passed: 0
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Generated plan fills all 28 weekly slots (7 days x 4 meal types) for slots that aren't locked or marked 'away'"
  status: failed
  reason: "Snacks are never filled. 7 empty Snack slots remain after every generation. DB query on meal_plan_slots for plan c182b991-4ea6-48b0-b665-5112771903a4 returns 21 rows (7 Breakfast + 7 Lunch + 7 Dinner, all capitalized), zero Snack rows."
  severity: major
  test: 1
  root_cause: |
    The AI solver (Haiku in generate-plan edge function) tries to fill 26 non-locked slots (7*4 - 2 locked = 26). It returns 26 slot assignments in the response (debug_rawSlots=26). The validation filter at supabase/functions/generate-plan/index.ts line ~462 drops assignments whose recipe_id is not in the household's valid recipe set, leaving 19 (debug_validSlots=19). The 7 dropped assignments are the Snack slots — the AI hallucinates recipe_ids for Snacks because the test household's 12 recipes are all full meals (Chicken Rice Bowl, Chicken Stir Fry, Greek Salad, Grilled Fish with Vegetables, Pasta Primavera, Quinoa Buddha Bowl, Tomato Soup x3, Vegetable Omelette x3) with no snack-appropriate options. The solver has no fallback: "no suitable recipe" becomes "slot left empty" instead of either (a) assigning a regular meal as a snack, (b) generating a suggestedRecipe for snacks to add to the household catalog, or (c) explicitly skipping snack slots with a user-facing explanation.
  artifacts:
    - "supabase/functions/generate-plan/index.ts (deployed version, lines 309-320 enumerate slotsToFill including snacks; lines 420-490 AI Pass 2 assignment; lines 462-472 validation filter that drops invalid recipe_ids)"
    - "plan_generations row ab50d3e5 constraint_snapshot: {_debug_rawSlots: 26, _debug_validSlots: 19, _debug_upsertCount: 19, _debug_bestSlots: 19, recipeCount: 12}"
    - "DB state: 21 meal_plan_slots rows for plan c182b991, zero Snacks rows"
  missing:
    - "Slot-level fallback: when AI can't assign a valid recipe to a slot, either use a default recipe, generate a suggested recipe, or mark the slot as explicitly skipped with user-facing messaging"
    - "Recipe catalog tagging for slot eligibility (meal_type column on recipes, or a slot_type_hint) so the AI can distinguish full-meal vs snack recipes"

- truth: "Plan generation completes in well under the timeout budget"
  status: failed
  reason: "ALL 5 recent plan_generations rows have status='timeout' (never 'done' on this plan). pass_count stuck at 2 — the solver only runs shortlist (pass 1) + assign (pass 2) before the time budget expires, never reaching verify/correct passes 3-5. This means any AI violations (allergens missed, locked slots overwritten, over-repetition) are NEVER corrected."
  severity: major
  test: 1
  root_cause: |
    The total generation budget is ~10s based on `6000ms leaves ~4s for DB writes` comment at line 188. Pass 1 (Haiku shortlist) + Pass 2 (Haiku assign with 4096 max_tokens) + post-assign recipe creation + DB upsert already consume the budget. The model (claude-haiku-4-5) with max_tokens=4096 can easily take 5-10s for a 26-slot response. There is no logic to continue passes 3-5 after the budget expires, so the solver always ends at pass 2 with an incomplete/uncorrected assignment.
  artifacts:
    - "plan_generations rows ab50d3e5, 6565cefc, 28a41b54, 2d9a1352, 6b40f6e1 — all status=timeout, all pass_count=2"
    - "generate-plan/index.ts line 188 (time budget comment), lines 420-540 pass 2, lines 540-600 passes 3-5 (never run)"
  missing:
    - "Increase time budget (edge function default timeout is 150s; current ~10s budget is self-imposed)"
    - "OR run passes 3-5 async without blocking the initial assignment write"
    - "Status should not be 'timeout' if passes 1-2 completed successfully — this gives false failure signals"

- truth: "NutritionGapCard renders below the plan grid when any member is below 90% of their weekly target"
  status: failed
  reason: "Test environment has no nutrition_targets rows (public.nutrition_targets select returned []), so calcWeeklyGaps returns gaps=[] and the conditional render never fires. Feature code is wired correctly (PlanGrid.tsx:623-627) but cannot be exercised without test data. The SwapSuggestion buttons, swapSuggestions utility, and handleApplySwap handler cannot be functionally verified against this account."
  severity: major
  test: 2
  root_cause: |
    Precondition gap in the test environment — not a code bug, but cannot be UAT-verified until the test household has nutrition targets configured. Either (a) manually insert nutrition_targets rows for the test household before running this UAT, (b) use a seeded test fixture account with targets pre-populated, or (c) add automated test coverage via Vitest that stubs useNutritionTargets to return below-target values.
  artifacts:
    - "src/hooks/useNutritionGaps.ts (returns gaps=[] if !targets or !members)"
    - "src/components/plan/PlanGrid.tsx:623-627 (conditional render)"
    - "public.nutrition_targets empty for household c2531bd4-b680-404a-b769-ab4dc8b6f62c"
  missing:
    - "Seed nutrition_targets for test account, OR add Vitest integration coverage for the gaps.length > 0 branch"

- truth: "Days with mixed locked + unlocked slots render correctly during generation — only unlocked slots shimmer, locked slot stays visible in place"
  status: failed
  reason: "During live generation, Day 1 (Mon, with locked Dinner) shows: 3 shimmers + 3 filled slots (Breakfast, Lunch, Dinner from dayCards[1]) + 1 locked indicator = 6 stacked elements in the same day container. Day 0 (Sun, no locks) correctly shows 4 shimmers. The bug: PlanGrid.tsx:576-604 uses `slot?.is_locked ? dayCards[i] : <SlotShimmer />` per DEFAULT_SLOT iteration — when one slot is locked, dayCards[i] (the entire day card for that day) is substituted for THAT iteration only, while the other iterations still produce SlotShimmer. The result stacks the full day view on top of shimmer placeholders."
  severity: major
  test: 3
  root_cause: |
    The loop in PlanGrid.tsx:574-604 (mobile carousel) and 592-604 (desktop) is conceptually wrong. It iterates over 4 slot positions and returns per-slot output, but whenever ANY slot is locked it returns the ENTIRE dayCards[i] element (which already contains all 4 slot positions). This duplicates the visible content and interleaves it with shimmer placeholders for the non-locked positions.
  artifacts:
    - "src/components/plan/PlanGrid.tsx:576-604 (desktop and mobile branches)"
    - "Live DOM inspection during generation: Day 0 = 4 shimmers/0 filled, Day 1 = 3 shimmers/3 filled/1 locked"
  missing:
    - "Refactor the shimmer branch to render a day container once per day, and within it iterate slots — for each slot render either the existing SlotCard (if locked) or a SlotShimmer (if not locked). Never substitute the entire dayCards[i] inside a per-slot iteration."

## Additional Observations

- Test household has 12 recipes but 6 are duplicates: 3x "Tomato Soup" and 3x "Vegetable Omelette". Data integrity issue in recipes table — likely from a recipe import or seed script not deduping by name.
- Monotony detection works ("3 issues this week" — Vegetable Omelette 7x, Greek Salad 3x, Tomato Soup 4x). This is not the NutritionGapCard feature but the variety feedback system; worth clarifying in UAT docs to avoid confusion with nutrition gap detection.
- Edge function writes slot_name as "Breakfast"/"Lunch"/"Dinner" (capitalized) in production despite HEAD of supabase/functions/generate-plan/index.ts showing lowercase literals at lines 309 and 583. Either a fix was deployed from a working tree without being committed, or the frontend normalizes the case on read. Worth reconciling the working tree with deployed state before further edits.
