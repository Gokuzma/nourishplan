# UAT Report — Agent 2: Marcus (Spouse/Speed User)
## Persona: Lose It! / MacroFactor user, 40yo dad, impatient, speed-focused

### Executive Summary
NourishPlan has a solid household-sharing model that competitors lack, and the join flow is straightforward once you have an invite code. However, **daily food logging is too slow for a speed user** — poor search ranking for common foods (searching "rice" returns rice bran oil first), no recent/favorites, no quick-add, no barcode scanner, and zero typo tolerance make it frustrating compared to Lose It! or MacroFactor. The USDA search API is broken (502 errors on every request), and CNF-only results lack portion size options, forcing users to calculate grams manually. A speed-focused user would abandon this app within a week.

### Joining the Household Experience
- **Setup page**: Clear and intuitive. Two cards: "Create a Household" and "Join a Household". The invite code field has helpful placeholder text.
- **Problem**: As a new user, I had no way to discover or request an invite code from within the app. Sarah would need to generate one from her Household page and send it out-of-band (text, email). There is no "Request to join" or household search feature.
- **Join flow**: Pasting the invite code and clicking "Join Household" worked instantly. Redirected to the Home page with "The Millers" showing in the sidebar. Smooth.
- **Post-join experience**: I was immediately able to see all household content (recipes, meals, plan). The member dropdown showed both Sarah and me. Good.
- **Missing**: No welcome message or onboarding flow after joining. No prompt to set up nutrition targets. I had to discover the targets page myself via Household > Set Targets.

### Bug Report

#### BUG-001: USDA Search API Consistently Returns 502 Errors
- **Severity**: Critical
- **Location**: Food Search (all pages)
- **Steps**: Search for any food; observe console
- **Expected**: USDA results appear alongside CNF results
- **Actual**: `search-usda` edge function returns 502 on every request (7 errors observed during session). Some USDA results still appear intermittently, suggesting partial caching or retry logic, but reliability is very poor.
- **Screenshot**: Console errors throughout session

#### BUG-002: Search Ranking Prioritizes Obscure Foods Over Common Staples
- **Severity**: Major
- **Location**: Food Search
- **Steps**: Search "rice" in the food search overlay
- **Expected**: Top results should be "Rice, white, cooked" or "Rice, brown, cooked"
- **Actual**: Top results are "Vegetable oil, rice bran" (885 kcal), "Babyfood, cereal, rice", "Soup, chicken rice" — no plain cooked rice visible without scrolling far or refining the query to "white rice cooked"
- **Screenshot**: Observed during Day 2 logging

#### BUG-003: Search "toast" Returns No Plain Toast/Bread
- **Severity**: Major
- **Location**: Food Search
- **Steps**: Search "toast"
- **Expected**: "Bread, white, toasted" or similar common toast at the top
- **Actual**: Top results are toaster pastries, wheat germ bread, melba toast, almonds. "Bread, whole wheat, commercial, toasted" was 12th in the list.

#### BUG-004: USDA Foods Show Incorrect Data (0 kcal, Negative Carbs)
- **Severity**: Major
- **Location**: Food Search results for chicken breast
- **Steps**: Search "chicken breast", observe USDA entries
- **Expected**: All entries show valid nutrition data
- **Actual**: "Chicken, breast, meat and skin, raw" shows 0 kcal, P 21.4g, C **-0.4g**, F 4.8g. "Chicken, breast, boneless, skinless, raw" also shows 0 kcal. Negative carbs is clearly invalid data.

#### BUG-005: First USDA Result for "eggs" Is a Branded Product, Not Whole Eggs
- **Severity**: Minor
- **Location**: Food Search
- **Steps**: Search "eggs"
- **Expected**: "Eggs, whole, raw" or "Eggs, Grade A, Large" at the top
- **Actual**: First result is "EGGS" (all caps, branded) at 571 kcal, P 3.6g, C 57.1g, F 35.7g — clearly not a regular egg. The correct entry "Eggs, Grade A, Large, egg whole" at 148 kcal is 4th.

#### BUG-006: Display Name Change Does Not Propagate to All Views Immediately
- **Severity**: Minor
- **Location**: Settings > Display Name, Household page, Targets page
- **Steps**: Change display name from "Test Family Member 2" to "Marcus Miller" in Settings. Navigate to Household page.
- **Expected**: Name updates everywhere
- **Actual**: Household page still showed "Test Family Member 2" and avatar "T". Nutrition Targets page subtitle still showed "Test Family Member 2". The Home page "Targets for" dropdown eventually updated to "Marcus Miller (you)" after navigating away and back.

#### BUG-007: No Nutrition Targets Section in Settings Page
- **Severity**: Minor (UX gap)
- **Location**: Settings page
- **Steps**: Go to Settings to set calorie/macro targets
- **Expected**: A "Nutrition Targets" section in Settings, or a clear link to it
- **Actual**: No targets section at all. Must discover it via Household page > "Set Targets" button. Unintuitive for a new user.

#### BUG-008: Plan "Log meal" Defaults to Fractional Serving Based on Portion Split
- **Severity**: Minor (UX confusion)
- **Location**: Plan page > Log meal button
- **Steps**: Click "Log meal" on Quick Breakfast (Sunday)
- **Expected**: Defaults to 1 serving
- **Actual**: Defaults to 0.6 servings (labeled "You: 57% (0.6 svg)"). This is the calculated portion split for a 2-person household, but as a user I just want to log 1 serving of breakfast, not 0.6.

#### BUG-009: Meal List Shows "0 items / 0 cal" for Populated Meals
- **Severity**: Major
- **Location**: Meals list page
- **Steps**: View the Meals page
- **Expected**: Quick Breakfast shows its item count and calorie total
- **Actual**: Shows "0 items · 0 cal" despite the meal having items (confirmed by logging it at 300 kcal)
- **Screenshot**: uat-agent2-05-household-page.png (visible on Meals page)

#### BUG-010: Mobile View Cuts Off 4th Macro Ring (Fat)
- **Severity**: Cosmetic
- **Location**: Home page on mobile (390px width)
- **Steps**: View Home page on mobile
- **Expected**: All 4 macro rings (kcal, protein, carbs, fat) visible
- **Actual**: Fat ring is partially cut off on the right edge. Need to scroll horizontally.
- **Screenshot**: uat-agent2-13-mobile-home.png

### Speed Test Results
| Action | Clicks/Steps | Time Estimate | Acceptable? | MFP/Lose It! Comparison |
|--------|-------------|---------------|-------------|------------------------|
| Log single food (known name) | 5-7 clicks | 15-25 sec | Borderline | 3-4 taps in Lose It! |
| Log single food (common name) | 7-10 clicks (must refine search) | 25-40 sec | Too slow | 3-4 taps in Lose It! |
| Log from plan | 4 clicks | 10 sec | Good | N/A in competitors |
| Check daily total | 0 (always visible) | Instant | Excellent | 1 tap in MFP |
| Switch dates | 1 click + type date | 3-5 sec | OK | 1 swipe in MFP |
| Edit logged food | 3 clicks | 5-8 sec | Good | 2 taps in MFP |
| Delete logged food | 1 click | 2 sec | Good | 2 taps in MFP |

### Missing Speed Features
1. **No Recent Foods** — Every search starts from scratch. In Lose It!, your last 20 logged foods are shown by default when you tap "Log". This alone would cut logging time in half.
2. **No Favorites/Starred Foods** — Cannot pin frequently eaten foods for quick access.
3. **No Quick-Add (calorie only)** — Cannot just type "300 kcal lunch" without searching for a specific food. MacroFactor has this.
4. **No Barcode Scanner** — Essential for packaged foods. Every competitor has this.
5. **No "Copy Previous Day" or "Copy Meal"** — Cannot duplicate yesterday's breakfast. Huge time saver in Lose It!.
6. **No Water Tracking** — No way to log water intake at all.
7. **No Meal Categories on Home Page** — Foods are logged in a flat list without breakfast/lunch/dinner grouping (except for plan-logged items that show a label). In MFP, food is grouped by meal.
8. **No "Log Again" on Previously Logged Items** — Cannot tap a previously logged food to re-log it.
9. **No Swipe Gestures for Date Navigation** — Must click the date picker. Competitors allow swiping left/right.
10. **No Typo Tolerance in Search** — "chiken" returns zero results. Lose It! and MFP both handle typos.

### UX Comparison to Competitors
| Feature | NourishPlan | Lose It! | MacroFactor | Notes |
|---------|:-----------:|:--------:|:-----------:|-------|
| Food search speed | 2/5 | 5/5 | 4/5 | Poor ranking, no recents, no fuzzy match |
| Barcode scanning | 0/5 | 5/5 | 5/5 | Not implemented at all |
| Daily logging flow | 2/5 | 5/5 | 4/5 | Too many steps, no shortcuts |
| Nutrition dashboard | 4/5 | 4/5 | 5/5 | Clean rings, micronutrients included |
| Portion sizes | 3/5 | 4/5 | 5/5 | USDA items have units; CNF only has 100g |
| Meal planning | 4/5 | 1/5 | 0/5 | Unique advantage — competitors lack this |
| Family/household | 5/5 | 0/5 | 0/5 | Major differentiator — no competitor has this |
| Recipe management | 3/5 | 3/5 | 2/5 | Decent, shared across household |
| Dark mode | 4/5 | 4/5 | 5/5 | Clean implementation |
| Mobile experience | 3/5 | 5/5 | 5/5 | Functional but not optimized (cut-off rings) |
| Offline support | 1/5 | 3/5 | 2/5 | Not tested; no visible offline indicator |

### Feature Ratings (1-5 stars)

- **Household join flow**: 3/5 — Works well once you have the code, but no discoverability.
- **Food search**: 2/5 — Ranking is terrible for common foods, USDA API is broken, no typo tolerance.
- **Portion stepper**: 3/5 — Quick-select buttons (0.5, 1, 1.5, 2) are nice; increment of 0.25 is OK; but no "per egg" or "per slice" for many items.
- **Unit selector**: 4/5 — When available (USDA items), excellent (cup, fillet, medium, etc). CNF items only have 100g which is useless.
- **Nutrition rings**: 4/5 — Clear, color-coded, always visible. Great at-a-glance view.
- **Micronutrient tracking**: 3/5 — Rings shown but data is incomplete ("Some foods have no micronutrient data").
- **Meal plan**: 4/5 — Weekly view is clear. Log-from-plan feature is unique and useful.
- **Member switcher**: 4/5 — Easy to view another member's data. Good for checking if spouse ate.
- **Recipe sharing**: 4/5 — Household recipes are shared automatically. Good.
- **Settings page**: 2/5 — Missing nutrition targets, missing notification preferences, minimal.
- **Dark mode**: 4/5 — Clean, readable, well-implemented.
- **Mobile layout**: 3/5 — Functional but rings cut off, bottom nav works well, "More" drawer is clean.
- **Date switching**: 3/5 — Works but requires typing in a date field rather than intuitive swipe or arrow buttons.
- **Edit/delete entries**: 4/5 — Edit modal is clean with live nutrition preview. Delete is one click.
- **Plan log-from-plan**: 4/5 — Unique feature, but confusing default to fractional servings.

### What Works Well
- **Household sharing is the killer feature.** No competitor does this. Seeing shared recipes, meals, and a family meal plan is genuinely useful.
- **Nutrition rings are clean and always visible.** I never have to navigate away from the home page to see my daily totals.
- **Log-from-plan is innovative.** Being able to one-click log a planned meal is faster than searching.
- **Member switcher** lets me check if Sarah ate lunch today without asking her.
- **Edit modal with live nutrition preview** is well-designed. Changing servings instantly updates calories.
- **USDA portion sizes** (when available) are excellent — "1 medium", "1 cup", "1 fillet" are much more useful than raw grams.
- **Dark mode** is well-implemented with good contrast.
- **The join flow**, once I had the invite code, was instant and smooth.
- **Search overlay stays open** after logging, allowing quick multi-food logging.
- **"My Foods" tab** in search suggests custom food support (though I didn't test it).

### What Needs Improvement (ordered by impact on daily usage)
1. **Add Recent Foods / Quick-Log** — Show last 20 logged foods when opening search. This is the #1 speed feature every competitor has.
2. **Fix search ranking** — Common whole foods (rice, eggs, chicken, toast) must rank above obscure branded products and baby food.
3. **Fix USDA API** — 502 errors on every request. Many USDA results arrive late or never, and some have invalid data (0 kcal, negative carbs).
4. **Add barcode scanner** — Essential for packaged foods. Without this, logging packaged food is a research project.
5. **Add fuzzy/typo-tolerant search** — "chiken" returning zero results is unacceptable. Even basic Levenshtein matching would help.
6. **CNF foods need portion sizes** — Most CNF entries only offer "100g serving" which forces mental math. Add common household measures.
7. **Group logged foods by meal** — Breakfast/Lunch/Dinner/Snacks sections on the home page instead of a flat list.
8. **Add nutrition targets to Settings** — Or at minimum a prominent link to them. Users should not have to discover targets via the Household page.
9. **Add "Copy yesterday" or "Log again" feature** — For repeating meals across days.
10. **Fix mobile ring overflow** — The 4th macro ring (fat) is cut off at 390px viewport width.

### Recommendations (from a speed user's perspective)

1. **Implement a "Recent Foods" feature** — Show the user's 10-20 most recently logged foods as the default view when opening the search overlay. This single change would cut average logging time from 20+ seconds to under 5 seconds for repeat foods. Every major competitor does this.

2. **Overhaul search ranking to prioritize whole foods** — Implement a scoring algorithm that boosts: (a) generic/whole food entries over branded products, (b) exact name matches over partial matches, (c) cooked/prepared variants over raw/dry variants. The current ranking makes "rice" return rice bran oil first, which is absurd.

3. **Fix or replace the USDA edge function** — The search-usda Supabase function is returning 502 on every call. Either fix the edge function, implement caching/fallback, or consider pre-loading the USDA SR Legacy database locally to eliminate the dependency on an unreliable API.

4. **Add a quick-add button for calorie-only logging** — Allow users to type "Lunch 500 cal, 40g protein" without searching for a specific food. This is critical for eating out or estimating meals.

5. **Add barcode scanning via device camera** — This is table stakes for any nutrition app in 2026. Even a basic UPC lookup against Open Food Facts would dramatically improve the packaged food experience.
