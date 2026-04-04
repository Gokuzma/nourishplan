# UAT Report — Agent 3: Zoe (Teen/Mobile User)
## Persona: MFP user, 16yo, mobile-first, design-conscious

### Executive Summary
NourishPlan works surprisingly well on mobile for a family nutrition app. The layout is responsive, food logging is fast (3-4 taps per item), and dark mode looks clean. However, it feels more like a "parent's app" than something a teen would choose — the pastel/sage color scheme gives wellness-blogger vibes, not modern fitness-app energy. The biggest functional issue is the PWA install banner blocking the bottom navigation bar, making the app literally unusable until dismissed.

### Mobile First Impressions
- **Auth page**: Clean and minimal. The pastel green "Log In" button is very low-contrast — hard to tell it's a button at first glance. No app logo/icon, just text. Feels generic.
- **Sign Up page**: No explanation that the app is household/invite-based. A new user would create an account, then get stuck on the setup page with no household to join. The "invite-only" flow is not communicated.
- **Setup page**: Clear separation between "Create" and "Join" household. The invite code field works well. But no back button or logout option visible on this page — if you're stuck, you have to clear local storage.
- **Home dashboard**: The 4 macro rings are visible and readable on mobile. The date picker uses the native HTML date input which renders as "2026-03-18" — ugly but functional. The "Mar 18, 2026" text below helps, but having both is redundant.
- **Navigation**: Bottom tab bar with 4 items (Home, Recipes, Plan, More) works well for thumb reach. The "More" drawer slides in from the right — functional but not especially smooth or modern.
- **Overall**: It's usable, but no "wow" moment. No onboarding, no personality, no welcome animation. You log in and you're just... there.

### Bug Report

#### BUG-001: PWA Install Banner Blocks Bottom Navigation
- **Severity**: Critical
- **Location**: All pages (bottom of screen)
- **Viewport**: Mobile (390x844)
- **Steps**: 1. Log in on mobile. 2. Notice "Add NourishPlan to your home screen" banner at the bottom. 3. Try to tap Home, Recipes, Plan, or More in the bottom nav.
- **Expected**: Bottom navigation should be tappable at all times
- **Actual**: The install banner overlays directly on top of the bottom navigation bar, intercepting all pointer events. Navigation is completely blocked until the banner is dismissed.
- **Screenshot**: uat-agent3-home-mobile-first-impression.png

#### BUG-002: USDA Search Intermittent 502 Errors
- **Severity**: Major
- **Location**: Food search (both home logging and recipe builder)
- **Viewport**: Both
- **Steps**: 1. Open food search. 2. Search for "honey" or "protein bar". 3. Observe console error.
- **Expected**: USDA API should return results consistently
- **Actual**: The Supabase edge function `search-usda` intermittently returns HTTP 502 errors. CNF results still appear, so it's not a total failure, but USDA results are sometimes missing.
- **Screenshot**: uat-agent3-protein-bar-search-mobile.png

#### BUG-003: No Logout on Setup Page
- **Severity**: Major
- **Location**: /setup page
- **Viewport**: Both
- **Steps**: 1. Log in as a user with no household. 2. Land on setup page. 3. Look for a way to log out or go back.
- **Expected**: There should be a logout button or back navigation
- **Actual**: No logout button, no navigation bar, no way to leave the setup page. User is trapped. Only way out is clearing browser storage.
- **Screenshot**: uat-agent3-setup-page-mobile.png

#### BUG-004: Date Input Shows Raw ISO Format
- **Severity**: Cosmetic
- **Location**: Home page date picker
- **Viewport**: Mobile
- **Steps**: Look at the date input at the top of the home page
- **Expected**: Date should display in a user-friendly format (e.g., "Mar 18" or "Today")
- **Actual**: Shows "2026-03-18" in the input field with a second line "Mar 18, 2026" below it. The raw ISO format looks technical and unfriendly. Having both is redundant.
- **Screenshot**: uat-agent3-home-with-targets.png

#### BUG-005: Recipe Shows "Created -1 days ago"
- **Severity**: Cosmetic
- **Location**: Recipe detail page
- **Viewport**: Both
- **Steps**: 1. Create a new recipe. 2. Look at the "Created" text.
- **Expected**: Should say "Created today" or "Created just now"
- **Actual**: Initially showed "Created -1 days ago" before correcting to "Created today" — a timezone calculation bug that flashes briefly.
- **Screenshot**: N/A (transient)

#### BUG-006: No Meal Categories for Food Log
- **Severity**: Minor
- **Location**: Home page food log
- **Viewport**: Both
- **Steps**: 1. Log multiple foods throughout the day. 2. View the food log list.
- **Expected**: Foods should be groupable by meal (Breakfast, Lunch, Dinner, Snack) like MyFitnessPal
- **Actual**: All foods are in one flat list with no meal categorization. There's no way to label a food as "breakfast" vs "snack". For a teen tracking meals, this is confusing.

#### BUG-007: "Quantity not specified" as Default Serving Unit
- **Severity**: Minor
- **Location**: Food search/logging
- **Viewport**: Both
- **Steps**: 1. Search for "Avocado, raw". 2. Log it with default serving.
- **Expected**: Default unit should be something meaningful (e.g., "1 medium" or "100g")
- **Actual**: Default unit is "Quantity not specified" which logs as "1 Quantity not specified" — confusing and meaningless for tracking.
- **Screenshot**: uat-agent3-dashboard-with-food-mobile.png

### Mobile UX Scorecard
| Page/Feature | Layout | Touch Targets | Readability | Speed | Overall |
|-------------|--------|---------------|-------------|-------|---------|
| Home/Dashboard | 4/5 | 4/5 | 4/5 | 4/5 | 4/5 |
| Food Search | 4/5 | 4/5 | 3/5 | 4/5 | 4/5 |
| Recipe Builder | 3/5 | 3/5 | 3/5 | 4/5 | 3/5 |
| Meal Plan | 4/5 | 3/5 | 4/5 | 4/5 | 4/5 |
| Settings | 4/5 | 4/5 | 5/5 | 5/5 | 4/5 |
| Navigation | 4/5 | 4/5 | 4/5 | 4/5 | 4/5 |
| Household | 4/5 | 4/5 | 4/5 | 4/5 | 4/5 |

### Visual Design Audit
- **Aesthetic**: Mixed — Clean and inoffensive, but leans "wellness blog" rather than "modern fitness app." It looks like something a health-conscious mom would pick, not a teen. Not ugly, just... safe.
- **Color Scheme**: 5/10 — The sage green/cream palette is calming but boring. No vibrant accent colors, no energy. MyFitnessPal uses bold blue; Lose It uses orange; NourishPlan uses... beige. Teens want personality.
- **Typography**: 7/10 — Readable on mobile, good hierarchy with headers. The serif/italic heading font gives it character but also makes it feel older/more traditional. Body text is clean.
- **Icons/Emojis**: 5/10 — Using actual emoji (🏠📖📋🍽️) for navigation is a choice. It works functionally but looks slightly unprofessional compared to custom SVG icons. The emoji rendering varies by device/OS which means inconsistent branding.
- **Dark Mode**: 8/10 — Actually looks better than light mode. The dark background with the colored nutrition rings pops nicely. Good contrast throughout. This is where the app looks most modern.
- **Animations**: 3/10 — Basically no animations. No transition when switching pages, no micro-interactions on buttons, no satisfying feedback when logging food. The "More" drawer just appears/disappears. Loading shows a plain "Loading..." text. Feels static and lifeless compared to native apps.
- **Overall Design Score**: 5.5/10

### Competitor Comparison (Teen Perspective)
| Feature | NourishPlan | MyFitnessPal | Notes |
|---------|------------|--------------|-------|
| Meal categories | No — flat list | Yes — Breakfast/Lunch/Dinner/Snack | MFP wins big here |
| Barcode scanner | No | Yes | Teens scan everything |
| Food database size | Good (USDA + CNF) | Massive (user-contributed) | MFP has more brand-name foods |
| Social features | Family household only | Friends, feed, community | NourishPlan is family-focused (valid niche) |
| Streak/gamification | None | Streaks, badges | Teens need dopamine |
| Quick-add calories | No | Yes | Sometimes you just know the calories |
| Recipe import from URL | No | Yes | "I saw this on TikTok" |
| Onboarding | None | Guided setup with goals | NourishPlan just dumps you in |
| Design vibe | Wellness blog | Fitness tracker | Different audiences |
| Family sharing | Excellent | Basic | NourishPlan's killer feature |
| Offline support | Banner indicator | Full offline | Both handle it |

### What a Teen Loves
- Food logging is actually fast — 3 taps to log (search, tap food, tap Log Food). The inline portion selector is smart.
- The search overlay stays open after logging so you can keep adding foods without reopening. That's better than MFP.
- Dark mode looks clean and modern
- Being able to see family members' nutrition (like what Mom ate) is kinda cool/useful
- The nutrition rings are satisfying when they fill up
- Recipe builder is functional — can build an Acai Bowl easily
- Meal plan page works well on mobile with swipe-through days
- The "Targets for" dropdown to switch members is convenient

### What a Teen Hates
- No meal categories (Breakfast/Lunch/Dinner/Snack) — the flat list is chaotic
- The pastel color scheme screams "designed for moms"
- No barcode scanner — that's literally the #1 feature teens use
- Zero animations or micro-interactions — feels dead compared to modern apps
- The date shows as "2026-03-18" — who writes dates like that?
- "Quantity not specified" as a serving unit is confusing
- No quick-add button for just entering calories
- No streaks, no progress celebrations, no "you hit your protein goal!" toast
- ALL CAPS food names from USDA look aggressive ("GRANOLA", "ALMONDS", "PROTEIN BAR")
- The "More" drawer instead of showing all tabs feels like hidden functionality
- No profile picture upload from camera (only file upload)
- No food photos or thumbnails in search results — just text walls
- The install banner blocks the ENTIRE bottom nav (critical)

### Missing for Gen Z Users
- **Barcode scanning** — This is table stakes for any food tracking app in 2026. Not having it is a dealbreaker for teens who eat packaged foods.
- **Recipe import from URL** — "I found this recipe on TikTok/Instagram, let me just paste the link" is the workflow teens expect.
- **Food photos** — Snap a photo of your meal. Even if it's just for the visual log, teens document everything.
- **Gamification** — Streaks, badges, weekly summaries, "you hit protein 5 days in a row!" celebrations. The app gives zero positive feedback.
- **Quick-add calories** — Sometimes you just want to type "300 cal lunch" without searching the entire USDA database.
- **Shareable meal cards** — Gen Z shares everything. Let me share my daily nutrition summary to Instagram stories.
- **AI meal suggestions** — "I need 400 more calories with 30g protein, what should I eat?" is the kind of thing teens would love.
- **Smooth animations** — Page transitions, loading skeletons, haptic feedback, celebration confetti. The app feels like a web page, not a native app.
- **Customizable dashboard** — Let me choose what I see first. Some teens care about protein; others care about calories. Let me pick my priority macro.
- **Water tracking** — Almost every teen health app has this. It's simple and satisfying.

### Top 5 Recommendations (Mobile/Design Focus)

1. **Fix the PWA install banner blocking navigation (CRITICAL)** — This literally breaks the app on mobile. The banner needs to either sit above the nav bar with proper spacing, or use a less intrusive notification method. Right now, a first-time mobile user cannot navigate until they find and tap "Dismiss."

2. **Add meal categories (Breakfast/Lunch/Dinner/Snack)** — This is the single biggest UX gap compared to competitors. Every food logging app groups by meal. The flat list makes it impossible to review what you ate when. This would also enable "log to breakfast" quick actions from the meal plan.

3. **Modernize the visual design for broader appeal** — The sage/cream palette works for the "family wellness" brand, but offer a bolder theme option. Add micro-animations (ring fill animations, success toasts, page transitions). Replace emoji nav icons with custom SVGs. Add loading skeletons instead of "Loading..." text. These small polish items would make the app feel 2x more modern.

4. **Add barcode scanning** — Even a basic implementation using the device camera and an open barcode database (Open Food Facts already seems partially integrated) would massively improve the teen experience. This is the #1 missing feature for mobile users who eat packaged foods.

5. **Add gamification and positive feedback** — Show a celebration when you hit a macro target. Track streaks ("5 days logged in a row!"). Send a gentle reminder if you haven't logged by noon. These small dopamine hits are what keep teens coming back to health apps. Right now, the app gives zero emotional feedback — you log food and the numbers silently change.
