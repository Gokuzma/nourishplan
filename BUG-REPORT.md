# NourishPlan Bug Report — 1-Week Family Simulation

**Date:** 2026-03-18
**Tester:** Automated (Claude via Playwright)
**Family:** Demo User (admin), Test Child (managed), Little Sam (managed, added during test)
**App URL:** http://localhost:5173

---

## Critical Bugs

### BUG-1: CNF food serving unit defaults to 1 gram — makes serving buttons useless
- **Severity:** Critical
- **Location:** Home > Log Food > Search (CNF results)
- **Steps:**
  1. Click "Log food..."
  2. Search "banana"
  3. Select "Banana, raw" (CNF)
  4. Observe serving selector: defaults to "1" with quick buttons (0.5, 1, 1.5, 2)
  5. Click "Log Food" with default serving of 1
- **Expected:** 1 serving = 1 medium banana (~118g), showing ~89 kcal
- **Actual:** 1 serving = 1 gram, showing 1 kcal. Quick buttons give 0.5g–2g of food.
- **Impact:** Users must manually know the gram weight of every food. The quick serving buttons (0.5, 1, 1.5, 2) are functionally useless for CNF foods. No serving description shown (e.g., "1 medium banana").
- **Note:** USDA foods DO have portion data (e.g., "1 medium or regular slice (33g)") and work correctly. Only CNF foods are affected.

### BUG-2: Custom food save silently fails — data loss
- **Severity:** Critical
- **Location:** Home > Log Food > My Foods > Add Custom Food
- **Steps:**
  1. Click "Log food..." > "My Foods" tab > "+ Add Custom Food"
  2. Fill form: Name="Overnight Oats", Serving="1 bowl", Size=250g, Cal=180, P=7, F=5, C=28
  3. Click "Save Food"
  4. Form closes (appears successful)
  5. "My Foods" tab shows "No custom foods yet"
- **Expected:** Food saved and appears in My Foods list
- **Actual:** Form closes without error but food is NOT saved. No error message displayed.
- **Impact:** Users lose their custom food data with no indication of failure. Likely a Supabase RLS policy issue — the insert may be silently rejected.
- **Console:** No JavaScript error logged for this failure.

### BUG-3: USDA search edge function returns 502 intermittently
- **Severity:** High
- **Location:** Home > Log Food > Search
- **Steps:**
  1. Click "Log food..."
  2. Type any search term (e.g., "banana")
  3. Observe console errors
- **Expected:** Both CNF and USDA results appear immediately
- **Actual:** USDA endpoint returns HTTP 502 on first several searches. CNF results appear, but USDA results are missing. Eventually USDA results appear (cold start?).
- **Console error:** `Failed to load resource: the server responded with a status of 502 ()` at `https://qyablbzodmftobjslgri.supabase.co/functions/v1/search-usda`
- **Impact:** Users only see CNF results initially. No error message shown to user — results silently incomplete.

---

## Major Bugs

### BUG-4: Meal items show food type letter + numeric ID instead of food name
- **Severity:** Major
- **Location:** Meals > [meal detail page]
- **Steps:**
  1. Go to Meals > create or open a meal
  2. Search and add a USDA food (e.g., "Bread, whole wheat, toasted")
  3. Observe the item display in the meal
- **Expected:** Shows "Bread, whole wheat, toasted" with nutrition info
- **Actual:** Shows "F" and "2707710" (the food type letter and USDA FDC ID) instead of the food name
- **Impact:** Meal items are unidentifiable. Users cannot tell what foods are in their meals. Nutrition numbers are correct but names are broken.

### BUG-5: "Set targets to see comparison" shows despite targets being set
- **Severity:** Major
- **Location:** Home > Micronutrients > Nutrient Details
- **Steps:**
  1. Set nutrition targets for Demo User (2000 cal, 50g P, 275g C, 65g F)
  2. Go to Home dashboard
  3. Click Micronutrients section > "Nutrient Details"
- **Expected:** Shows comparison of consumed vs target for macros; indicates micronutrient targets not set separately
- **Actual:** Shows "Set targets to see comparison" — ignoring the macro targets that ARE set
- **Impact:** Users who set targets see no progress comparison in the nutrient detail view, defeating the purpose of setting targets.

---

## Minor Bugs / UX Issues

### BUG-6: USDA food shows 0 calories despite having macronutrients
- **Severity:** Minor (data quality)
- **Location:** Search results
- **Food:** "Oats, whole grain, rolled, old fashioned" (USDA) — shows 0 kcal but P 13.5g, C 68.7g, F 5.9g
- **Impact:** Misleading calorie display. This is upstream USDA data, but the app could calculate estimated calories from macros (4*P + 4*C + 9*F) as a fallback.

### BUG-7: Inconsistent button labels in Meal Plan — "Change meal" vs "Swap meal"
- **Severity:** Minor (UX)
- **Location:** Plan page
- **Observed:** Sunday shows "Change meal" button; Monday shows "Swap meal" for the same action on identical meal types
- **Impact:** Inconsistent labeling may confuse users.

### BUG-8: No confirmation dialog when deleting food log entries
- **Severity:** Minor (UX)
- **Location:** Home > food log entry > Delete (trash icon)
- **Expected:** Confirmation prompt ("Delete this entry?")
- **Actual:** Entry deleted immediately on tap with no undo option
- **Impact:** Accidental taps delete data with no recovery. Consider adding undo toast or confirmation.

### BUG-9: Meal Plan shows suspicious nutrition for "Untitled Meal" with 0 items
- **Severity:** Minor
- **Location:** Plan page > Sun/Mon showing "Untitled Meal"
- **Observed:** "Untitled Meal" has 0 items on Meals page but shows 248 kcal and 47g protein on the Plan
- **Impact:** Stale/incorrect nutrition snapshot displayed for meals that were modified after being added to the plan.

---

## Features Working Correctly

- Authentication and session persistence
- Dashboard daily tracking with progress rings
- Member switching (Demo User / Test Child / Little Sam)
- Date navigation (forward/backward day selection)
- Food search (CNF works reliably; USDA works after warm-up)
- USDA portion selector with predefined serving sizes
- Recipe creation, ingredient addition, per-serving nutrition calculation
- Recipe ingredient quantity modal with gram input
- Raw/Cooked toggle on recipe ingredients
- Meal creation and naming
- Meal Plan weekly grid with day/slot layout
- Assigning meals to plan slots
- Logging planned meals from Home dashboard ("Tap to log")
- Serving size adjustment (quick buttons + manual input) for meal logging
- Household member management (add managed profiles)
- Invite link generation with expiry info
- Nutrition targets with preset templates (Adult, Weight loss, Child, Teen)
- Settings page (profile, theme toggle, household name)
- Dark/light theme switching
- Food log entry deletion
- Food log entry editing with nutrition recalculation
- Private entry checkbox
- Micronutrient incomplete data warning message

---

## Test Coverage Summary

| User Guide Section | Tested | Issues Found |
|---|---|---|
| Getting Started (auth, household) | Yes | None |
| Adding Foods (search, custom) | Yes | BUG-1, BUG-2, BUG-3, BUG-6 |
| Building Recipes | Yes | None |
| Creating Meals | Yes | BUG-4 |
| Meal Plan | Yes | BUG-7, BUG-9 |
| Tracking Your Day | Yes | BUG-5, BUG-8 |
| Household Admin | Yes | None |
| Settings & Targets | Yes | None |
