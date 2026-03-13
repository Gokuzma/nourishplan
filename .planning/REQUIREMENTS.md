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

- [ ] **MEAL-01**: User can compose a meal from multiple recipes and/or individual foods
- [ ] **MEAL-02**: User can create a weekly meal plan with breakfast, lunch, dinner, and snack slots
- [ ] **MEAL-03**: Meal plan is shared across all household members automatically
- [ ] **MEAL-04**: User can swap individual meals on a given day without changing the template
- [ ] **MEAL-05**: User can save and reuse meal plan templates
- [ ] **MEAL-06**: Each recipe in a meal plan displays its full nutrition breakdown

### Tracking & Targets

- [ ] **TRCK-01**: Each household member can set personal calorie and macro (P/C/F) targets
- [ ] **TRCK-02**: Each household member can set micronutrient targets (vitamins, minerals, fiber, sodium)
- [ ] **TRCK-03**: Each household member can set custom nutrition goals (e.g., water intake, sugar limit)
- [ ] **TRCK-04**: Each household member can log what they ate with portion size (e.g., 1.5 servings)
- [ ] **TRCK-05**: System suggests portion sizes per person per dish based on their individual targets
- [ ] **TRCK-06**: User can override suggested portions with actual amount eaten
- [ ] **TRCK-07**: Daily nutrition summary shows calories, macros, micros, and custom goals vs targets

### Platform & Design

- [x] **PLAT-01**: App is mobile-first responsive — optimized for phone use in kitchen/at table
- [x] **PLAT-02**: Minimalist UI with pastel colour scheme
- [ ] **PLAT-03**: PWA installable to home screen on mobile devices
- [ ] **PLAT-04**: Core features work offline with sync when reconnected

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
| AUTH-04 | Phase 1 | Complete |
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
| MEAL-01 | Phase 3 | Pending |
| MEAL-02 | Phase 3 | Pending |
| MEAL-03 | Phase 3 | Pending |
| MEAL-04 | Phase 3 | Pending |
| MEAL-05 | Phase 3 | Pending |
| MEAL-06 | Phase 3 | Pending |
| TRCK-01 | Phase 3 | Pending |
| TRCK-02 | Phase 3 | Pending |
| TRCK-03 | Phase 3 | Pending |
| TRCK-04 | Phase 4 | Pending |
| TRCK-05 | Phase 5 | Pending |
| TRCK-06 | Phase 4 | Pending |
| TRCK-07 | Phase 4 | Pending |
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| PLAT-03 | Phase 4 | Pending |
| PLAT-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after roadmap creation*
