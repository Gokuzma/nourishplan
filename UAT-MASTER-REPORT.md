# NourishPlan — Professional Consumer Usability Audit

**Date:** 2026-03-18
**App URL:** https://nourishplan.gregok.ca
**Testers:** 3 simulated personas (experienced calorie counter users)
**Method:** Full onboarding + 1-week usage simulation per tester using Playwright automation

---

## Testers

| Agent | Persona | Role | Focus Area |
|-------|---------|------|------------|
| Sarah | 38yo mom, MFP + Cronometer veteran | Admin (created household) | Recipe creation, meal planning, comprehensive feature testing |
| Marcus | 40yo dad, Lose It! + MacroFactor user | Member (joined household) | Speed of daily logging, join flow, practical daily use |
| Zoe | 16yo teen, MFP + TikTok nutrition | Member (joined household) | Mobile UX (390x844), visual design, Gen Z expectations |

---

## Executive Summary

NourishPlan has a **genuine differentiator** in household/family meal planning that no major competitor offers. The weekly meal plan view, shared recipes, member nutrition switching, and invite-based household management are excellent. The visual design is clean and calming.

However, the app has **critical reliability issues** (USDA API failures), **fundamental UX gaps** (no meal categories, no recent foods, no barcode scanner), and **search quality problems** that would prevent daily adoption by experienced calorie counter users. A speed-focused user would abandon within a week; a teen would find it visually dated and missing key features.

**Overall Score: 3.2 / 5** — Strong concept, solid foundation, needs significant polish for daily use.

---

## Consolidated Bug Report

### Critical (1)

| ID | Bug | Found By | Impact |
|----|-----|----------|--------|
| BUG-C01 | **USDA Search API returns 500/502 errors consistently** — `search-usda` Supabase edge function fails on nearly every request. Some USDA results appear intermittently (caching/retry), but reliability is ~20%. This is the primary food search data source. | All 3 | App is unusable for daily tracking. Many common foods (apple, banana) are only in USDA, not CNF. |

### Major (6)

| ID | Bug | Found By | Impact |
|----|-----|----------|--------|
| BUG-M01 | **Search ranking puts obscure foods above common staples** — "rice" returns rice bran oil first; "toast" returns toaster pastries; "eggs" returns a branded product at 571 kcal. Simple whole foods are buried. | Sarah, Marcus | Users can't find basic foods quickly. Destroys logging speed. |
| BUG-M02 | **Recipe ingredient rows show per-100g nutrition, not actual amount** — Adding 80g oats shows "375 kcal" (per 100g) instead of "300 kcal" (for 80g). Per-serving total at bottom is correct. | Sarah | Misleading nutrition display. Users will think recipes have wrong calories. |
| BUG-M03 | **Meal list shows "0 items / 0 cal" for populated meals** — Meals page displays wrong metadata even when meals contain items. | Sarah, Marcus | Meals feature appears broken. Users lose trust in the data. |
| BUG-M04 | **USDA foods show impossible nutrition data** — Chicken breast shows 0 kcal and -0.4g carbs. Some branded items show wildly wrong macros (yogurt at 467 kcal/100g). | Marcus | Logging incorrect data undermines the entire app purpose. |
| BUG-M05 | **PWA install banner blocks bottom navigation on mobile** — The "Add to home screen" banner overlays directly on the tab bar, intercepting all taps. App is unusable until dismissed. | Zoe | First-time mobile users literally cannot navigate the app. |
| BUG-M06 | **No logout/back button on /setup page** — New users who land on setup with no invite code are trapped. No way to log out or go back. | Zoe | Users must clear browser storage to escape. |

### Minor (6)

| ID | Bug | Found By | Impact |
|----|-----|----------|--------|
| BUG-m01 | **Signup form has no password requirements display or confirm field** | Sarah | Standard security UX missing. |
| BUG-m02 | **CNF search ranking prioritizes obscure variants** — "apple" returns dried/sulphured apple first, no raw apple. | Sarah | Common foods hard to find even when USDA is down. |
| BUG-m03 | **Display name change doesn't propagate to all views immediately** — Household page, targets page show old name until refresh. | Marcus | Confusing identity mismatch across pages. |
| BUG-m04 | **No nutrition targets section in Settings** — Users must discover targets via Household > Set Targets. | Marcus | Non-obvious path to a critical feature. |
| BUG-m05 | **Plan "Log meal" defaults to fractional serving** — Shows "0.6 servings" based on household portion split instead of 1.0. | Marcus | Confusing default. Users want to log what they ate, not a calculated fraction. |
| BUG-m06 | **"Quantity not specified" as default serving unit** — Some foods log as "1 Quantity not specified". | Zoe | Meaningless tracking data. |

### Cosmetic (3)

| ID | Bug | Found By | Impact |
|----|-----|----------|--------|
| BUG-c01 | **"Created -1 days ago" flashes on new recipes** — Timezone calculation bug. | Sarah, Zoe | Unprofessional appearance. |
| BUG-c02 | **Date input shows raw ISO format "2026-03-18"** alongside formatted date. | Zoe | Looks technical/unfriendly. |
| BUG-c03 | **Mobile: 4th macro ring (fat) cut off at 390px width** | Marcus | Incomplete nutrition view on small phones. |

---

## Feature Ratings (Averaged Across 3 Testers)

| Feature | Sarah | Marcus | Zoe | Average | Verdict |
|---------|-------|--------|-----|---------|---------|
| **Food Search** | 2/5 | 2/5 | 4/5 | 2.7/5 | Broken — API failures + bad ranking |
| **Recipe Builder** | 3/5 | 3/5 | 3/5 | 3.0/5 | Functional but misleading nutrition display |
| **Meal Planning** | 4.5/5 | 4/5 | 4/5 | 4.2/5 | Best feature — unique differentiator |
| **Food Logging** | 3/5 | 2/5 | 4/5 | 3.0/5 | Works but too slow for daily use |
| **Nutrition Dashboard** | 4/5 | 4/5 | 4/5 | 4.0/5 | Clean rings, always visible |
| **Household/Family** | 5/5 | 5/5 | 4/5 | 4.7/5 | Killer feature — no competitor has this |
| **Navigation** | 4/5 | 3/5 | 4/5 | 3.7/5 | Good but mobile install banner blocks it |
| **Visual Design** | 4/5 | 4/5 | 5.5/10 | 3.5/5 | Clean but dated, needs animation |
| **Dark Mode** | 4/5 | 4/5 | 4/5 | 4.0/5 | Well-executed |
| **Mobile Experience** | — | 3/5 | 4/5 | 3.5/5 | Functional, needs polish |
| **Settings** | 3.5/5 | 2/5 | 4/5 | 3.2/5 | Missing key features (targets, export) |
| **User Guide** | 3.5/5 | — | — | 3.5/5 | Exists, helpful, could be deeper |
| **Overall** | **3.5/5** | **3.0/5** | **3.2/5** | **3.2/5** | |

---

## Competitor Comparison Matrix

| Feature | NourishPlan | MyFitnessPal | Cronometer | Lose It! | MacroFactor |
|---------|:-----------:|:------------:|:----------:|:--------:|:-----------:|
| Food database reliability | 2/5 | 4/5 | 5/5 | 4/5 | 4/5 |
| Search speed + relevance | 2/5 | 4/5 | 5/5 | 5/5 | 4/5 |
| Barcode scanner | 0/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Recipe builder | 3/5 | 3/5 | 4/5 | 3/5 | 2/5 |
| **Meal planning** | **5/5** | 2/5 | 2/5 | 1/5 | 0/5 |
| **Family/household sharing** | **5/5** | 1/5 | 1/5 | 0/5 | 0/5 |
| Daily logging speed | 2/5 | 5/5 | 4/5 | 5/5 | 4/5 |
| Nutrition dashboard | 4/5 | 3/5 | 5/5 | 4/5 | 5/5 |
| Micronutrient tracking | 3/5 | 2/5 | 5/5 | 2/5 | 3/5 |
| Mobile experience | 3/5 | 5/5 | 3/5 | 5/5 | 5/5 |
| Dark mode | 4/5 | 4/5 | 3/5 | 4/5 | 5/5 |
| Gamification/engagement | 0/5 | 3/5 | 1/5 | 4/5 | 2/5 |
| Offline support | 2/5 | 3/5 | 2/5 | 3/5 | 2/5 |

**NourishPlan's competitive advantages:** Meal planning (5/5) and family sharing (5/5) — these are unique in the market.

**NourishPlan's competitive weaknesses:** Food search reliability (2/5), barcode scanning (0/5), logging speed (2/5).

---

## What NourishPlan Does Better Than Everyone

1. **Household/Family management** — Invite links, managed child profiles, per-member nutrition targets, member switching. No competitor offers this.
2. **Weekly meal plan view** — 7-day grid with breakfast/lunch/dinner/snack slots, per-day nutrition rings, template save/load, "repeat last week". Best meal planning UX in the category.
3. **Log from meal plan** — One-click logging of a planned meal. Unique workflow that bridges planning and tracking.
4. **Shared recipes and meals** — Household members automatically see each other's recipes. Eliminates the "send me the recipe" problem.
5. **Per-member nutrition view** — The "Targets for" dropdown lets any household member see another member's daily progress. Great for parents monitoring children.
6. **Micronutrient dashboard on home page** — Always visible, not buried behind navigation. Better than MFP.
7. **Clean, calming visual design** — Less overwhelming than competitors. Good for families and health-anxious users.

## What NourishPlan Does Worse Than Everyone

1. **Food search is broken** — USDA API failing, CNF ranking poor, no fuzzy/typo tolerance, branded products ranked above whole foods.
2. **No barcode scanner** — Table stakes for every competitor since 2015.
3. **No recent/frequent foods** — Every competitor shows recently logged foods. NourishPlan starts from scratch every time.
4. **No meal categories in daily log** — All logged foods in a flat list. Every competitor groups by breakfast/lunch/dinner/snack.
5. **Logging speed** — 15-40 seconds per food vs 3-5 seconds in MFP/Lose It!.
6. **No quick-add calories** — Can't just type "lunch 500 cal" for estimated meals.
7. **Recipe ingredient nutrition is misleading** — Shows per-100g, not actual amount.
8. **No animations or micro-interactions** — Feels static compared to native apps.
9. **USDA data quality** — Some entries show 0 kcal, negative carbs, or wildly wrong macros.
10. **No gamification** — Zero streaks, badges, celebrations, or positive feedback.

---

## Prioritized Recommendations

### P0 — Fix Before Recommending to Anyone

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 1 | **Fix USDA search API** — The edge function returns 500/502 on nearly every call. Either fix the function, add robust caching/fallback, or pre-load USDA data locally. | Critical — app is unusable without reliable search | Medium |
| 2 | **Fix PWA install banner blocking mobile nav** — Add proper spacing so the banner sits above the tab bar, or use a less intrusive notification pattern. | Critical — mobile is completely broken for first-time users | Low |
| 3 | **Fix USDA data quality** — Filter out entries with 0 kcal, negative macros, or implausible values. Add a sanity check before displaying results. | Major — wrong data undermines trust | Low |
| 4 | **Add logout button to /setup page** — Users are currently trapped if they have no invite code. | Major — users can't escape | Low |

### P1 — Required for Daily Use Adoption

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 5 | **Overhaul search ranking** — Prioritize generic whole foods over branded products, exact matches over partial, common forms over obscure variants. | High — directly improves every search | Medium |
| 6 | **Add Recent/Frequent foods** — Show last 20 logged foods when opening search. Single biggest speed improvement. | High — cuts average log time by 50%+ | Medium |
| 7 | **Add meal categories** — Group logged foods by Breakfast/Lunch/Dinner/Snack on the home page. | High — expected by every calorie counter user | Medium |
| 8 | **Fix recipe ingredient nutrition display** — Show actual amount nutrition, not per-100g. | High — currently misleading | Low |
| 9 | **Fix meal list metadata** — Show correct item count and calorie total. | Medium — meals feature appears broken | Low |

### P2 — Competitive Parity Features

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 10 | **Add barcode scanner** — Even basic UPC lookup via Open Food Facts. | High — table stakes for packaged food users | High |
| 11 | **Add typo-tolerant search** — Fuzzy matching so "chiken" finds chicken. | Medium — prevents frustrating zero-result searches | Medium |
| 12 | **Add copy/repeat meals** — "Copy yesterday's breakfast" or "Log again" on previous entries. | Medium — major speed feature for repeat eaters | Medium |
| 13 | **Add quick-add calories** — Let users type a calorie estimate without searching for a food. | Medium — essential for eating out | Low |
| 14 | **Add portion size units** — Cups, tbsp, pieces, slices for CNF foods (USDA already has these). | Medium — removes mental math burden | Medium |

### P3 — Polish & Engagement

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 15 | **Add micro-animations** — Ring fill animations, success toasts, page transitions, loading skeletons. | Medium — makes app feel 2x more modern | Medium |
| 16 | **Add gamification** — Streaks, goal celebrations, weekly summaries. | Medium — improves retention, especially for younger users | Medium |
| 17 | **Add onboarding flow** — Guided setup for new users: set goals, set targets, create first recipe. | Medium — current drop-in experience is confusing | Medium |
| 18 | **Modernize color scheme option** — Offer a bolder theme alongside the pastel/sage default. | Low — widens appeal beyond wellness-mom demographic | Low |
| 19 | **Fix date display** — Show "Today", "Yesterday", or "Mar 18" instead of raw ISO format. | Low — cosmetic polish | Low |
| 20 | **Add water tracking** — Simple, satisfying, expected by most health app users. | Low — nice-to-have engagement feature | Low |

---

## Screenshots Captured

| Agent | Count | Location |
|-------|-------|----------|
| Sarah | 19 | `.playwright-mcp/uat-agent1-*.png` |
| Marcus | 15 | `.playwright-mcp/uat-agent2-*.png` |
| Zoe | 12 | `.playwright-mcp/uat-agent3-*.png` |

---

## Conclusion

NourishPlan occupies a **genuinely unique niche** — family meal planning with shared nutrition tracking. No major competitor offers this, and the implementation is solid (invite links, per-member targets, meal plan templates, member switching).

However, the **daily tracking experience is not competitive**. The USDA API failure is a showstopper, search ranking makes common foods hard to find, and the lack of recent foods / barcode scanning / meal categories makes logging too slow for daily use.

**The path to a competitive product:**
1. Fix the 4 P0 items (API, install banner, data quality, setup page) — these are blocking basic usability
2. Implement the 5 P1 items (search ranking, recents, meal categories, display fixes) — these enable daily adoption
3. Add barcode scanning and typo tolerance — these achieve competitive parity

The family/household features and meal planning view are strong enough to be the **primary selling point**, but only if the basic calorie counting experience doesn't drive users away first.

---

*Report generated by 3-agent automated UAT simulation on 2026-03-18*
*Individual agent reports: UAT-AGENT1-SARAH.md, UAT-AGENT2-MARCUS.md, UAT-AGENT3-ZOE.md*
