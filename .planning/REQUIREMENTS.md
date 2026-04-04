# Requirements: NourishPlan

**Defined:** 2026-03-12 | **Updated:** 2026-03-25
**Core Value:** Families can plan meals that optimize nutrition, cost, time, and satisfaction for every household member under real-world constraints.

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

## v2.0 Requirements

Requirements for the Adaptive Meal Planning System (AMPS) milestone. Each maps to roadmap phases.

### Budget

- [ ] **BUDG-01**: User can set a weekly household food budget
- [ ] **BUDG-02**: Each recipe displays a computed cost per serving based on ingredient costs
- [ ] **BUDG-03**: Plan page shows weekly spend vs budget with remaining balance
- [x] **BUDG-04**: User can enter cost per unit/weight on recipe ingredients

### Inventory

- [ ] **INVT-01**: User can add items to inventory with storage location (pantry, fridge, freezer)
- [ ] **INVT-02**: Each inventory item tracks quantity and unit (grams, units, ml)
- [ ] **INVT-03**: Each inventory item has an optional expiry date with priority sorting
- [ ] **INVT-04**: User can scan a barcode to add an item to inventory
- [x] **INVT-05**: Finalizing a meal plan auto-deducts ingredient quantities from inventory
- [x] **INVT-06**: Uneaten portions from a recipe appear as leftover inventory items with expiry

### Grocery

- [x] **GROC-01**: Grocery list is auto-generated from the active meal plan's ingredients
- [x] **GROC-02**: Grocery list subtracts items already in inventory ("have" vs "need to buy")
- [x] **GROC-03**: Grocery list items are grouped by store category (produce, dairy, etc.)
- [x] **GROC-04**: User can check off grocery items in-store
- [x] **GROC-05**: Grocery list can be shared with household members

### Planning

- [ ] **PLAN-01**: User can drag and drop meals between slots on the weekly plan grid
- [ ] **PLAN-02**: User can auto-generate a meal plan optimized for nutrition, cost, schedule, and preferences
- [ ] **PLAN-03**: Manually placed meals are locked and preserved during auto-generation
- [ ] **PLAN-04**: Generated plan highlights nutrition gaps per member with swap suggestions
- [ ] **PLAN-05**: Recipe selection can prioritize using ingredients already in inventory

### Feedback & Preferences

- [ ] **FEED-01**: User can rate a recipe (1-5 stars) after eating it
- [ ] **FEED-02**: Each household member can set dietary restrictions (allergens, vegetarian, gluten-free, etc.)
- [ ] **FEED-03**: Each household member can set "won't eat" tags for selective eaters
- [ ] **FEED-04**: System tracks recipe repeat rate and warns when plan becomes monotonous

### Schedule

- [ ] **SCHED-01**: Each household member can set availability windows per day (prep available, quick meal only, away)
- [ ] **SCHED-02**: Plan generation respects member schedule constraints

### Prep

- [ ] **PREP-01**: User can view batch prep suggestions for the week's meal plan
- [ ] **PREP-02**: User can view day-of task sequencing for a meal
- [ ] **PREP-03**: Freezer-friendly recipes are flagged for make-ahead prep

### Portioning

- [ ] **PORT-01**: Per-person portion suggestions use calorie targets as primary driver
- [ ] **PORT-02**: Portion models adapt based on feedback ratings and logged consumption history

## v3 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Reports & Insights

- **REPT-01**: Weekly nutrition summary report per person
- **REPT-02**: Nutrition trend charts over time
- **REPT-03**: Household-level nutrition overview

### AI & Learning

- **AILR-01**: AI-driven adaptive meal plan optimization based on accumulated feedback
- **AILR-02**: Cost-aware ingredient substitution suggestions
- **AILR-03**: Smart prep automation with equipment-aware scheduling
- **AILR-04**: Learning system personalization based on consumption patterns

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS/Android apps | Mobile-first PWA is sufficient; no app store gatekeeping |
| Social/public recipe sharing | Household-only; public content creates moderation burden |
| Real-time collaborative editing | Last-write-wins is sufficient; families rarely edit simultaneously |
| TDEE auto-calculation | Users set their own targets; avoids liability and misinterpretation |
| Weight/body tracking | Outside core value — nutrition data is the product |
| AI-driven adaptive optimization | Requires months of accumulated feedback signal; deferred to v3 |
| Grocery delivery integration | External API dependency; out of scope for self-hosted PWA |
| Cost-aware ingredient substitutions | Future enhancement after budget engine is stable |
| Smart prep automation | Future enhancement after prep optimization is stable |
| Grocery price API | Recipe costs are user-entered; no real-time price feeds in v2.0 |
| Receipt scanning | Complex OCR; barcode scanning covers the inventory entry use case |

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
- v1.0 requirements: 50 total (all complete)
- v1.1 enhancement requirements: 16 total (all complete)
- v2.0 requirements: 31 total
- Mapped to phases: 66 (v1) + 31 (v2.0)
- Unmapped v2.0: 0 (roadmap complete)

**v2.0 Traceability:**

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUDG-01 | Phase 16 | Pending |
| BUDG-02 | Phase 16 | Pending |
| BUDG-03 | Phase 16 | Pending |
| BUDG-04 | Phase 16 | Complete |
| INVT-01 | Phase 17 | Pending |
| INVT-02 | Phase 17 | Pending |
| INVT-03 | Phase 17 | Pending |
| INVT-04 | Phase 17 | Pending |
| INVT-05 | Phase 17 | Complete |
| INVT-06 | Phase 17 | Complete |
| GROC-01 | Phase 18 | Complete |
| GROC-02 | Phase 18 | Complete |
| GROC-03 | Phase 18 | Complete |
| GROC-04 | Phase 18 | Complete |
| GROC-05 | Phase 18 | Complete |
| PLAN-01 | Phase 19 | Pending |
| PLAN-02 | Phase 22 | Pending |
| PLAN-03 | Phase 19 | Pending |
| PLAN-04 | Phase 22 | Pending |
| PLAN-05 | Phase 22 | Pending |
| FEED-01 | Phase 20 | Pending |
| FEED-02 | Phase 20 | Pending |
| FEED-03 | Phase 20 | Pending |
| FEED-04 | Phase 20 | Pending |
| SCHED-01 | Phase 21 | Pending |
| SCHED-02 | Phase 21 | Pending |
| PREP-01 | Phase 23 | Pending |
| PREP-02 | Phase 23 | Pending |
| PREP-03 | Phase 23 | Pending |
| PORT-01 | Phase 24 | Pending |
| PORT-02 | Phase 24 | Pending |

**v1.0/v1.1 Traceability (archived — all complete):**

All 66 v1.0/v1.1 requirements mapped and complete. See git history for detailed traceability.

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-25 after v2.0 roadmap creation (Phases 16–24)*
