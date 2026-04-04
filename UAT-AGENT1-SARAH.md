# UAT Report — Agent 1: Sarah (Parent/Admin)
## Persona: Experienced MFP/Cronometer user, 38yo mom

### Executive Summary
NourishPlan is a promising family nutrition app with a clean, calming visual design and solid household/family management features that competitors lack. However, a **critical USDA search API failure** renders food search unreliable, the recipe builder shows confusing per-100g nutrition on ingredient rows, and the inability to add recipes directly to meals is a significant workflow gap. The app needs backend stability fixes and search UX improvements before it can compete with MFP or Cronometer for daily use.

### First Impressions & Onboarding
- **Auth page**: Very minimal — just email, password, and Log In/Sign Up toggle. No branding imagery, no tagline beyond "NourishPlan". The left side has a faint "Family nutrition, together" watermark that's barely visible. No password requirements are shown on signup, and there's no "confirm password" field.
- **Setup page**: Clean and intuitive — two clear cards for "Create a Household" or "Join a Household". Placeholder text is helpful ("e.g. The Johnson Family"). The disabled button pattern until text is entered is good.
- **Home page (empty state)**: Immediately shows nutrition rings (kcal, protein, carbs, fat) all at zero, micronutrient rings, a date picker, and a member switcher. The "No meals logged yet" message with "Use the search bar above to log food" is clear guidance. Overall, a strong empty state.
- **Navigation**: Left sidebar with 7 clear items (Home, Recipes, Meals, Plan, Household, Settings, User Guide). Bottom mobile nav appears with a "More" overflow. Clean emoji icons.
- **Overall first impression**: Calming, nature-inspired color palette. Feels intentional and family-friendly. Much less cluttered than MFP on first load.

### Bug Report

#### BUG-001: USDA Food Search API Consistently Failing (500 Errors)
- **Severity**: Critical
- **Location**: Food Search (all pages — Recipes, Meals, Home logging)
- **Steps**: Search for any food; observe console errors
- **Expected**: USDA results appear alongside CNF results
- **Actual**: `Failed to load resource: the server responded with a status of 500` on `supabase.co/functions/v1/search-usda` — every single search. USDA results either never appear or appear after a long delay (3-5s). Some searches like "apple" return NO raw whole-food results at all because CNF lacks a simple "Apple, raw" entry.
- **Screenshot**: Console errors visible throughout session

#### BUG-002: Recipe Ingredient Rows Show Per-100g Nutrition, Not Actual Amount
- **Severity**: Major
- **Location**: Recipe Builder
- **Steps**: Add ROLLED OATS at 80g to a recipe
- **Expected**: Row shows nutrition for 80g (300 kcal)
- **Actual**: Row shows "375 kcal · P 12.5g · C 67.5g · F 7.5g" (per-100g values) next to "80g". The bottom bar correctly shows "Per serving: 300.0 cal" but the individual row is misleading.
- **Screenshot**: uat-agent1-12-overnight-oats-recipe.png

#### BUG-003: Meal List Shows "0 items · 0 cal" After Adding Items
- **Severity**: Major
- **Location**: Meals list page
- **Steps**: Create a meal, add ROLLED OATS (80g) to it, go back to Meals list
- **Expected**: Shows "1 item · 300 cal"
- **Actual**: Shows "0 items · 0 cal"
- **Screenshot**: uat-agent1-15-meals-list-bug.png

#### BUG-004: Some USDA Branded Foods Have Wildly Incorrect Macros
- **Severity**: Major
- **Location**: Food Search
- **Steps**: Search "greek yogurt" — first result "GREEK YOGURT" from USDA shows 467 kcal, 3.3g protein, 70g carbs, 20g fat per 100g. Search "banana" — "BANANA" from USDA shows 312 kcal, 12.5g protein.
- **Expected**: Top results for common foods should have accurate, recognizable nutrition data
- **Actual**: Branded/processed food items from USDA FoodData Central appear with ALL-CAPS names and inaccurate-looking macros, ranked above the generic whole-food entries

#### BUG-005: CNF Search Ranking Prioritizes Obscure Variants Over Common Forms
- **Severity**: Minor
- **Location**: Food Search
- **Steps**: Search "apple" in the food search
- **Expected**: "Apple, raw" or "Apples, raw, with skin" appears first
- **Actual**: "Apple, dried, sulphured, uncooked" appears first. No simple raw apple is found in CNF results at all. Only USDA has it, but USDA search is broken.
- **Screenshot**: N/A

#### BUG-006: No Way to Add Recipes to Meals
- **Severity**: Major
- **Location**: Meal Builder
- **Steps**: Create a new Meal, click "Search ingredients", search for a recipe name like "Overnight Oats"
- **Expected**: Household recipes appear as options to add to the meal
- **Actual**: Only external food database results appear. "My Foods" tab only shows custom foods, not recipes. There is no "Add Recipe" button in the Meal builder.

#### BUG-007: Created Date Shows "-1 days ago" on Recipe
- **Severity**: Cosmetic
- **Location**: Recipe Builder
- **Steps**: Create a new recipe — observe the "Created" timestamp
- **Expected**: Shows "Created today" or "Created just now"
- **Actual**: Shows "Created -1 days ago" (observed briefly before correcting to "Created today" on some views). Likely a timezone issue.

#### BUG-008: Signup Form Has No Password Confirmation or Requirements Display
- **Severity**: Minor
- **Location**: Auth page (Sign Up mode)
- **Steps**: Click "Sign Up" to see the registration form
- **Expected**: Password requirements shown (min length, complexity), confirm password field
- **Actual**: Just email, password, display name — no requirements shown, no confirmation field
- **Screenshot**: uat-agent1-02-signup-form.png

### UX Comparison to Competitors
| Feature | NourishPlan | MyFitnessPal | Cronometer | Notes |
|---------|------------|--------------|------------|-------|
| Food Search | 2/5 | 4/5 | 5/5 | USDA API failing, CNF ranking poor for common foods. No barcode scanner. |
| Recipe Builder | 3/5 | 3/5 | 4/5 | Functional but shows per-100g macros on rows. No recipe-in-meal support. |
| Meal Planning | 4/5 | 2/5 | 2/5 | Best feature — weekly view with per-day nutrition rings is excellent. |
| Food Logging | 3/5 | 5/5 | 4/5 | Inline serving picker is nice but search issues hamper it. No barcode. |
| Nutrition Dashboard | 4/5 | 3/5 | 5/5 | Good macro rings + micronutrient rings. Missing % of daily targets. |
| Household/Family | 5/5 | 1/5 | 1/5 | Unique differentiator — invite links, managed profiles, member switching. |
| Navigation | 4/5 | 4/5 | 3/5 | Clean sidebar + mobile bottom nav. All pages reachable in 1 click. |
| Visual Design | 4/5 | 3/5 | 3/5 | Calming earth-tone palette. Dark mode works well. Very readable. |

### Feature-by-Feature Ratings (1-5 stars)

**Auth & Onboarding: 4/5**
Clean login/signup toggle. Household setup is intuitive with two clear paths. No password requirements or email verification visible. Google OAuth is a nice touch.

**Home / Daily Dashboard: 4/5**
Excellent layout with macro rings, micronutrient rings, date picker, and member switcher. The "Log food..." button is prominently placed. Missing: meal categories (breakfast/lunch/dinner grouping), % of daily target labels on rings, calorie remaining counter.

**Recipe Builder: 3/5**
Works well mechanically — search, add ingredients, set servings. Live per-serving nutrition in the footer bar is great. But: ingredient rows show per-100g values (confusing), no ability to duplicate recipes, no recipe photos, no prep time/cook time fields, no recipe categories/tags.

**Meal Builder: 2/5**
Only supports individual food items from the database search — cannot add recipes to a meal. The meal list page shows incorrect item counts and calories (0 items, 0 cal). This makes "Meals" feel like a less useful duplicate of food logging.

**Meal Plan: 4.5/5**
The weekly view is the app's strongest feature. 7-day layout with Breakfast/Lunch/Dinner/Snacks slots, per-day nutrition rings, "Start fresh" / "Repeat last week" / "Load template" options, and "Save as template" / "Load template" buttons. Action buttons on each meal card (log, change, remove) are intuitive. This is better than anything MFP or Cronometer offer.

**Food Search: 2/5**
The USDA search API was failing consistently during testing (HTTP 500). CNF results are available but often prioritize obscure variants (dried, canned) over raw/common forms. Some USDA branded items have suspicious macro profiles. The dual-database approach (USDA + CNF) is good in theory but unreliable in practice. No barcode scanner. No "recently used" or "frequently logged" shortcuts.

**Household Management: 5/5**
Create household, invite link generation (single-use, 7-day expiry), member list with roles, managed profiles for children with birth year. "Set Targets" link per member is intuitive. This is a genuine differentiator — no competitor offers this.

**Nutrition Targets: 4.5/5**
Custom macro targets in grams or percent, preset templates (Adult maintenance, Weight loss, Child 5-12, Teen), expandable micronutrient section with "+ Add micronutrient", Custom Goals section. Very comprehensive.

**Settings: 3.5/5**
Profile photo, display name, household name, appearance (Light/Dark/System), account management with delete. Missing: nutrition target shortcut (must go through Household > Set Targets), notification preferences, data export, unit preferences (metric/imperial).

**User Guide: 3.5/5**
"Get started in 5 steps" overview is helpful. Accordion sections for each topic. Content exists but all sections were collapsed — couldn't verify depth without expanding each. The guide is in-app which is good.

**Dark Mode: 4/5**
Clean implementation with good contrast. All elements properly themed. The sage/earth-tone palette translates well to dark mode.

### What NourishPlan Does Better Than Competitors
- **Family/Household management** is genuinely unique — invite links, managed child profiles, member switching, per-member nutrition targets
- **Weekly meal plan view** is the best I've seen — clean layout, per-day nutrition rings, template save/load, "repeat last week" option
- **Visual design** is calmer and more inviting than MFP's ad-heavy interface or Cronometer's clinical look
- **Micronutrient dashboard on the home page** is always visible, not buried behind taps
- **Preset nutrition target templates** (Adult maintenance, Weight loss, Child 5-12, Teen) are thoughtful
- **"Mark as private" on log entries** is a nice touch for shared households
- **Inline food logging** (expand item, pick servings, log — without navigating away) is efficient

### What NourishPlan Does Worse Than Competitors
- **Food search reliability** — USDA API was failing consistently, making common food searches frustrating or impossible
- **Food search quality** — Even when working, search results prioritize obscure variants over common whole foods
- **No barcode scanner** — Both MFP and Cronometer have this; it's table stakes for food logging
- **No recipe-to-meal connection** — Cannot add a recipe to a meal, which breaks the conceptual flow of Recipe > Meal > Plan > Log
- **No serving size units** — Only grams available for most foods (CNF). Some USDA foods have portion options, but inconsistently. MFP has cups, slices, tablespoons, pieces, etc.
- **Recipe ingredient nutrition display** — Shows per-100g values instead of actual-amount values, which is confusing
- **No "recently used" or "favorites"** in food search — MFP excels at this for repeat logging
- **No meal categories in daily log** — Log entries aren't grouped by breakfast/lunch/dinner/snack; just a flat list
- **Meal list metadata is broken** — Shows 0 items and 0 cal even when items exist

### Missing Features (Expected from a Top-Tier App)
- **Barcode scanner** (Must-have) — Essential for packaged food logging
- **Serving size units** (Must-have) — Need cups, tbsp, pieces, slices, not just grams
- **Recently used / Frequent foods** (Must-have) — Critical for daily logging efficiency
- **Recipe as meal ingredient** (Must-have) — Recipes should be addable to meals
- **Meal category grouping in daily log** (Must-have) — Group logged foods by breakfast/lunch/dinner
- **Calorie/macro remaining counter** (Nice-to-have) — Show "X kcal remaining" on the dashboard
- **Data export (CSV/PDF)** (Nice-to-have) — For sharing with healthcare providers
- **Water tracking** (Nice-to-have) — Common in nutrition apps
- **Exercise/activity logging** (Nice-to-have) — To calculate net calories
- **Shopping list from meal plan** (Nice-to-have) — Generate a grocery list from the week's plan
- **Recipe import from URL** (Nice-to-have) — Import recipes from cooking websites
- **Progress graphs/trends** (Nice-to-have) — Weekly/monthly nutrition trends over time
- **Confirm password on signup** (Nice-to-have) — Standard security UX

### Recommendations
1. **Fix the USDA search API immediately** — This is the #1 blocker. Every food search produces 500 errors. Without reliable search, the app is unusable for daily tracking.
2. **Add serving size units beyond grams** — Support cups, tablespoons, pieces, slices, "1 medium", etc. The peanut butter entry showed this is possible for some USDA items (portion dropdown) — extend this to all foods.
3. **Allow recipes to be added to meals** — The Recipe > Meal > Plan > Log flow is broken because meals can't contain recipes. This should be the core workflow.
4. **Fix recipe ingredient nutrition display** — Show actual nutrition for the entered amount, not per-100g. Users will be confused seeing "375 kcal" next to "80g" when the actual contribution is 300 kcal.
5. **Add "Recently Used" and "Favorites" to food search** — After the first week of logging, 80% of what users eat is repeat items. A "Recent" section at the top of search results would transform the logging experience.
