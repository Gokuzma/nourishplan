# Roadmap: NourishPlan

## Overview

NourishPlan is built in five phases that follow the strict dependency chain the food hierarchy imposes. Phase 1 establishes the schema and auth foundation that every feature depends on. Phase 2 builds the food data and recipe engine — the nutrition calculation layer that sits under everything else. Phase 3 delivers meal planning with per-person targets, the core user-facing promise. Phase 4 closes the feedback loop with daily logging and the nutrition summary. Phase 5 delivers the app's primary differentiator — per-person portion suggestions — and brings the PWA to production quality.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Auth** - Schema, household system, auth, and PWA scaffold
- [ ] **Phase 2: Food Data & Recipe Builder** - USDA search, custom foods, and recipe builder with live nutrition
- [ ] **Phase 3: Meal Planning & Targets** - Full meal hierarchy, household-shared plans, and per-person nutrition targets
- [ ] **Phase 4: Daily Logging & Summary** - Portion logging, daily nutrition summary, offline PWA
- [ ] **Phase 5: Portion Suggestions & Polish** - Per-person portion suggestions, micronutrients, weekly templates, PWA audit

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Users can create accounts, form households, and the app is installable on mobile with the correct data model in place
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, HSHD-01, HSHD-02, HSHD-03, HSHD-04, HSHD-05, PLAT-01, PLAT-02
**Success Criteria** (what must be TRUE):
  1. User can create an account with email and password and stay logged in across browser sessions
  2. User can reset a forgotten password via an email link
  3. User can create a household and invite family members via a shareable link or email invitation
  4. Household members can only see their own household's data — no cross-household data leakage
  5. The app renders correctly on a phone screen with the pastel colour scheme and is responsive at all viewport sizes
**Plans**: 4 plans
Plans:
- [ ] 01-01-PLAN.md — Project scaffold, Tailwind theme, DB schema, test infra
- [ ] 01-02-PLAN.md — Auth system and responsive app shell
- [ ] 01-03-PLAN.md — Household create/join/invite and member management
- [ ] 01-04-PLAN.md — Integration wiring, Home page, and end-to-end verification

### Phase 2: Food Data & Recipe Builder
**Goal**: Users can search for foods, add custom foods, and build recipes with auto-calculated nutrition
**Depends on**: Phase 1
**Requirements**: FOOD-01, FOOD-02, FOOD-03, FOOD-04, FOOD-05, FOOD-06, RECP-01, RECP-02, RECP-03, RECP-04, RECP-05, RECP-06
**Success Criteria** (what must be TRUE):
  1. User can search USDA and Open Food Facts for a food by name and see nutrition data returned
  2. User can add a custom food with name, serving size, calories, macros, and optional micronutrients, then edit or delete it
  3. User can create a recipe by adding food items as ingredients with quantities and see the per-serving nutrition calculated automatically
  4. User can add another recipe as an ingredient inside a recipe (nested recipes work without circular references)
  5. User can toggle ingredient weight state (raw vs cooked) on a recipe and see nutrition recalculate
**Plans**: 5 plans
Plans:
- [ ] 02-01-PLAN.md — DB schema, types, and TDD nutrition utility functions
- [ ] 02-02-PLAN.md — Edge Functions for USDA, Open Food Facts, and AI verification
- [ ] 02-03-PLAN.md — Food search UI, custom food CRUD, and /foods route
- [ ] 02-04-PLAN.md — Recipe builder with ingredients, servings, and sticky nutrition bar
- [ ] 02-05-PLAN.md — Nested recipes, raw/cooked toggle, AI verification, and user verification

### Phase 3: Meal Planning & Targets
**Goal**: Households can build and share a weekly meal plan, and each member has personal nutrition targets set
**Depends on**: Phase 2
**Requirements**: MEAL-01, MEAL-02, MEAL-03, MEAL-04, MEAL-05, MEAL-06, TRCK-01, TRCK-02, TRCK-03
**Success Criteria** (what must be TRUE):
  1. User can compose a meal from recipes and individual foods, then place it into a weekly meal plan grid (breakfast/lunch/dinner/snacks)
  2. The meal plan is visible to all household members automatically without manual sharing
  3. User can swap a single meal on a specific day without altering the underlying template
  4. User can save a meal plan as a reusable template
  5. Each household member can set personal calorie, macro, micronutrient, and custom nutrition targets
**Plans**: TBD

### Phase 4: Daily Logging & Summary
**Goal**: Each household member can log what they ate and see their daily nutrition progress against their targets
**Depends on**: Phase 3
**Requirements**: TRCK-04, TRCK-06, TRCK-07, PLAT-03, PLAT-04
**Success Criteria** (what must be TRUE):
  1. User can log a meal from the day's plan with a specific portion size (e.g., 1.5 servings) and override the default amount
  2. User can see a daily summary showing calories, macros, micronutrients, and custom goals versus their personal targets
  3. The app is installable to the home screen on a mobile device as a PWA
  4. Log entries made while offline are saved locally and sync automatically when the device reconnects
**Plans**: TBD

### Phase 5: Portion Suggestions & Polish
**Goal**: The app suggests how much each household member should eat per dish, micronutrients are fully visible, and the PWA passes production quality checks
**Depends on**: Phase 4
**Requirements**: TRCK-05
**Success Criteria** (what must be TRUE):
  1. When viewing a meal plan, each household member sees a suggested portion size for each dish calculated from their personal targets
  2. A household member can view the full micronutrient breakdown for any recipe in the meal plan
  3. The app passes a Lighthouse PWA audit with installability and offline requirements met
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 3/4 | In Progress|  |
| 2. Food Data & Recipe Builder | 4/5 | In Progress|  |
| 3. Meal Planning & Targets | 0/TBD | Not started | - |
| 4. Daily Logging & Summary | 0/TBD | Not started | - |
| 5. Portion Suggestions & Polish | 0/TBD | Not started | - |
