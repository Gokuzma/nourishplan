# Requirements: NourishPlan

**Defined:** 2026-03-12
**Core Value:** Families can share one meal plan while each person gets personalized portion suggestions based on their individual nutritional targets.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can create an account with email and password
- [x] **AUTH-02**: User can log in and stay logged in across browser sessions
- [x] **AUTH-03**: User can log out from any page
- [x] **AUTH-04**: User can reset password via email link

### Household

- [x] **HSHD-01**: User can create a household
- [x] **HSHD-02**: User can invite family members to join their household via link or email
- [x] **HSHD-03**: User can view all members of their household
- [x] **HSHD-04**: Parent role can manage children's profiles and nutrition targets
- [x] **HSHD-05**: Household data is isolated — members cannot see other households' data

### Food Data

- [x] **FOOD-01**: User can search USDA FoodData Central for foods by name
- [x] **FOOD-02**: User can search additional open food databases (e.g., Open Food Facts) for broader coverage
- [x] **FOOD-03**: User can add custom foods with name, serving size, calories, macros, and optional micronutrients
- [x] **FOOD-04**: User can edit and delete their custom foods
- [x] **FOOD-05**: Nutrition data from multiple sources is normalized to per-100g for consistent calculations
- [x] **FOOD-06**: AI verification layer cross-checks nutrition data for accuracy when multiple sources disagree

### Recipes

- [x] **RECP-01**: User can create a recipe by adding food items as ingredients with quantities
- [x] **RECP-02**: Recipe nutrition per serving is auto-calculated from ingredients
- [x] **RECP-03**: User can set number of servings a recipe makes
- [x] **RECP-04**: User can use another recipe as an ingredient (nested recipes)
- [x] **RECP-05**: User can edit and delete their recipes
- [x] **RECP-06**: Recipe handles raw vs cooked weight states for ingredients

### Meals & Meal Plans

- [x] **MEAL-01**: User can compose a meal from multiple recipes and/or individual foods
- [x] **MEAL-02**: User can create a weekly meal plan with breakfast, lunch, dinner, and snack slots
- [x] **MEAL-03**: Meal plan is shared across all household members automatically
- [x] **MEAL-04**: User can swap individual meals on a given day without changing the template
- [x] **MEAL-05**: User can save and reuse meal plan templates
- [x] **MEAL-06**: Each recipe in a meal plan displays its full nutrition breakdown

### Tracking & Targets

- [x] **TRCK-01**: Each household member can set personal calorie and macro (P/C/F) targets
- [x] **TRCK-02**: Each household member can set micronutrient targets (vitamins, minerals, fiber, sodium)
- [x] **TRCK-03**: Each household member can set custom nutrition goals (e.g., water intake, sugar limit)
- [x] **TRCK-04**: Each household member can log what they ate with portion size (e.g., 1.5 servings)
- [x] **TRCK-05**: System suggests portion sizes per person per dish based on their individual targets
- [x] **TRCK-06**: User can override suggested portions with actual amount eaten
- [x] **TRCK-07**: Daily nutrition summary shows calories, macros, micros, and custom goals vs targets

### Platform & Design

- [x] **PLAT-01**: App is mobile-first responsive — optimized for phone use in kitchen/at table
- [x] **PLAT-02**: Minimalist UI with pastel colour scheme
- [x] **PLAT-03**: PWA installable to home screen on mobile devices
- [x] **PLAT-04**: Core features work offline with sync when reconnected

### Launch & Deployment

- [x] **LAUNCH-01**: App is deployed at https://nourishplan.gregok.ca with all SPA routes returning correct responses
- [x] **LAUNCH-02**: App shows a branded splash screen while loading
- [x] **LAUNCH-03**: Social sharing renders an OG preview with title, description, and image
- [x] **LAUNCH-04**: Unknown routes display a branded 404 page
- [x] **LAUNCH-05**: Portfolio site at gregok.ca includes a NourishPlan project card linking to the live app
- [x] **LAUNCH-06**: New user signups are blocked (invite-only); existing users can log in normally

### UI Polish

- [x] **POLISH-01**: App renders all components correctly in dark mode with visible ring colours and proper contrast
- [x] **POLISH-02**: Each meal plan slot card shows mini nutrition rings indicating contribution to daily targets
- [x] **POLISH-03**: Food logging displays household measurement units (cups, tbsp, pieces) when source data provides them
- [x] **POLISH-04**: Mobile tab bar has a "More" button that opens a slide-out drawer for overflow navigation
- [x] **POLISH-05**: Settings page allows editing display name, avatar, and household name (admin only)
- [x] **POLISH-06**: Nutrition targets form supports entering macros as percentages of total calories with P+C+F=100% validation

### Nutrition Calculations (v1.1 Enhancement)

- [x] **CALC-01**: Changing ingredient quantity shows proportionally different calories and macros
- [x] **CALC-02**: Logging a food updates the user's daily micronutrient goal progress
- [x] **CALC-03**: Serving sizes display specific measurements (grams, cups, tbsp) instead of generic "1 serving"

### UX Logging (v1.1 Enhancement)

- [x] **UXLOG-01**: Food tab removed; food logging accessible directly from home page
- [x] **UXLOG-02**: Food search prioritizes simplest matching ingredients over CNF-prefixed results
- [x] **UXLOG-03**: User can drill into each logged meal to see per-food micronutrient breakdown
- [x] **UXLOG-04**: Home page uses contextual "Log food" UI element following UX best practices

### Recipe UX (v1.1 Enhancement)

- [x] **RCPUX-01**: Clicking away from ingredient in recipe builder returns to search view, not recipe page
- [x] **RCPUX-02**: Recipes have optional notes/variations subtitle field and date created tag
- [x] **RCPUX-03**: User can choose the start date for a meal plan

### Meal Plan Management (v1.1 Enhancement)

- [x] **MPLAN-01**: User can print a meal plan via a print button
- [x] **MPLAN-02**: Meal plan start date is selectable

### Deletion Management (v1.1 Enhancement)

- [x] **DELMG-01**: User can delete meals, recipes, and foods they created
- [x] **DELMG-02**: Deleting a recipe shows placeholder in meal plan slots that referenced it

### Account Management (v1.1 Enhancement)

- [x] **ACCTM-01**: User can delete their account with option to delete household or transfer admin rights

### Documentation (v1.1 Enhancement)

- [x] **DOCS-01**: In-app how-to manual accessible from UI explaining all major features

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Grocery & Convenience

- **GROC-01**: Grocery list auto-generated from meal plan ingredients
- **GROC-02**: Leftovers tracking with partial consumption and date tracking

### Reports & Insights

- **REPT-01**: Weekly nutrition summary report per person
- **REPT-02**: Nutrition trend charts over time
- **REPT-03**: Household-level nutrition overview

### Extended Data

- **DATA-01**: Barcode scanning to look up food items
- **DATA-02**: AI-suggested recipes based on preferences and history

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS/Android apps | Mobile-first PWA is sufficient for v1; no app store gatekeeping |
| Social/public recipe sharing | v1 is household-only; public content creates moderation burden |
| Real-time collaborative editing | Last-write-wins is sufficient; families rarely edit simultaneously |
| TDEE auto-calculation | Users set their own targets; avoids liability and misinterpretation |
| Weight/body tracking | Outside core value — nutrition data is the product |
| AI meal plan generation | Requires preference signal accumulation; not useful on day one |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 7 | Complete |
| HSHD-01 | Phase 1 | Complete |
| HSHD-02 | Phase 1 | Complete |
| HSHD-03 | Phase 1 | Complete |
| HSHD-04 | Phase 1 | Complete |
| HSHD-05 | Phase 1 | Complete |
| FOOD-01 | Phase 2 | Complete |
| FOOD-02 | Phase 2 | Complete |
| FOOD-03 | Phase 2 | Complete |
| FOOD-04 | Phase 2 | Complete |
| FOOD-05 | Phase 2 | Complete |
| FOOD-06 | Phase 2 | Complete |
| RECP-01 | Phase 2 | Complete |
| RECP-02 | Phase 2 | Complete |
| RECP-03 | Phase 2 | Complete |
| RECP-04 | Phase 2 | Complete |
| RECP-05 | Phase 2 | Complete |
| RECP-06 | Phase 2 | Complete |
| MEAL-01 | Phase 3 | Complete |
| MEAL-02 | Phase 3 | Complete |
| MEAL-03 | Phase 3 | Complete |
| MEAL-04 | Phase 3 | Complete |
| MEAL-05 | Phase 3 | Complete |
| MEAL-06 | Phase 3 | Complete |
| TRCK-01 | Phase 3 | Complete |
| TRCK-02 | Phase 3 | Complete |
| TRCK-03 | Phase 3 | Complete |
| TRCK-04 | Phase 4 | Complete |
| TRCK-05 | Phase 5 | Complete |
| TRCK-06 | Phase 4 | Complete |
| TRCK-07 | Phase 4 | Complete |
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| PLAT-03 | Phase 4 | Complete |
| PLAT-04 | Phase 4 | Complete |
| LAUNCH-01 | Phase 6 | Complete |
| LAUNCH-02 | Phase 6 | Complete |
| LAUNCH-03 | Phase 6 | Complete |
| LAUNCH-04 | Phase 6 | Complete |
| LAUNCH-05 | Phase 6 | Complete |
| LAUNCH-06 | Phase 6 | Complete |
| POLISH-01 | Phase 8 | Complete |
| POLISH-02 | Phase 8 | Complete |
| POLISH-03 | Phase 8 | Complete |
| POLISH-04 | Phase 8 | Complete |
| POLISH-05 | Phase 8 | Complete |
| POLISH-06 | Phase 8 | Complete |

**Coverage:**
- v1 requirements: 50 total
- v1.1 enhancement requirements: 16 total
- Mapped to phases: 66
- Unmapped: 0 ✓

**Gap Closure Phases (v1.1 audit):**

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRCK-05 | Phase 9 (dead code cleanup) | Complete |
| PLAT-03 | Phase 9 (theme token fix) | Complete |
| POLISH-01 | Phase 9 (theme token fix) | Complete |
| LAUNCH-01–06 | Phase 6 | Complete |
| POLISH-01–06 | Phase 8 | Complete |

**v1.1 Enhancement Requirements Traceability:**

| Requirement | Phase | Status |
|-------------|-------|--------|
| CALC-01 | Phase 11 | Complete |
| CALC-02 | Phase 11 | Complete |
| CALC-03 | Phase 11 | Complete |
| UXLOG-01 | Phase 12 | Complete |
| UXLOG-02 | Phase 12 | Complete |
| UXLOG-03 | Phase 12 | Complete |
| UXLOG-04 | Phase 12 | Complete |
| RCPUX-01 | Phase 13 | Complete |
| RCPUX-02 | Phase 13 | Complete |
| RCPUX-03 | Phase 13 | Complete |
| MPLAN-01 | Phase 13 | Complete |
| MPLAN-02 | Phase 13 | Complete |
| DELMG-01 | Phase 13 | Complete |
| DELMG-02 | Phase 13 | Complete |
| ACCTM-01 | Phase 13 | Complete |
| DOCS-01 | Phase 14 | Complete |

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-15 after Phase 10 requirements formalization*
