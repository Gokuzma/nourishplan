# Roadmap: NourishPlan

## Overview

NourishPlan is built in milestone-driven phases. v1.0 (Phases 1-7) established the foundation: auth, food data, recipe builder, meal planning with nutrition targets, daily logging, portion suggestions, and production launch. v1.1 (Phases 8-15) polished the UI, cleaned up dead code, fixed calculation bugs, redesigned the home page, and added recipe/account management with a how-to guide.

v2.0 AMPS (Phases 16-24) adds a constraint-solving planning engine. Budget and Inventory came first because their data model decisions are irreversible. Grocery, Drag-and-Drop, Feedback, Schedule, and the Planning Engine followed — delivering visible wins and accumulating signal data. Prep Optimisation and Dynamic Portioning close out the milestone.

Phase 25 (Universal Recipe Import) is a standalone feature that can be built any time after Phase 13.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Auth** - Schema, household system, auth, and PWA scaffold (completed 2026-03-13)
- [x] **Phase 2: Food Data & Recipe Builder** - USDA search, custom foods, and recipe builder with live nutrition (completed 2026-03-13)
- [x] **Phase 3: Meal Planning & Targets** - Full meal hierarchy, household-shared plans, and per-person nutrition targets (completed 2026-03-13)
- [x] **Phase 4: Daily Logging & Summary** - Portion logging, daily nutrition summary, offline PWA (completed 2026-03-14)
- [x] **Phase 5: Portion Suggestions & Polish** - Per-person portion suggestions, micronutrients, CNF integration, PWA audit (completed 2026-03-14)
- [x] **Phase 6: Launch on gregok.ca** - Production deploy, splash screen, OG tags, portfolio card (completed 2026-03-15)
- [x] **Phase 7: Fix Auth & Household Integration Gaps** - Password reset, useCreateHousehold type fix (completed 2026-03-15)
- [x] **Phase 8: v1.1 UI Polish** - Dark mode, nutrition rings, measurement units, mobile drawer, settings expansion (completed 2026-03-15)
- [x] **Phase 9: Dead Code Removal & Theme Token Cleanup** - Remove dead code, OfflineBanner theme tokens (completed 2026-03-15)
- [x] **Phase 10: Requirements Documentation** - Formalise LAUNCH and POLISH requirement IDs (completed 2026-03-15)
- [x] **Phase 11: Nutrition & Calculation Fixes** - Fix calorie/macro scaling, micronutrient goal updates, specific serving measurements (completed 2026-03-15)
- [x] **Phase 12: Home Page & Food Search Redesign** - Remove Food tab, home page food logging, better search sorting, meal drill-down (completed 2026-03-15)
- [x] **Phase 13: Recipe, Meal Plan & Account Management** - Recipe UX fixes, notes/dates, meal plan start date, print, deletions, account management (completed 2026-03-16)
- [x] **Phase 14: How-To Manual** - In-app guide explaining how to use all features (completed 2026-03-17)
- [x] **Phase 15: v1.1 Audit Gap Closure** - Cache invalidation, dead code, test stubs, requirement IDs (completed 2026-03-18)
- [x] **Phase 16: Budget Engine & Query Foundation** - Centralised query keys, ingredient-level cost entry, recipe cost display, and weekly budget tracking (completed 2026-03-26)
- [x] **Phase 17: Inventory Engine** - Pantry/fridge/freezer tracking with ledger-based quantities, expiry priority, barcode scanning, and plan-deduction (completed 2026-03-26)
- [x] **Phase 18: Grocery List Generation** - Auto-generated grocery list from active meal plan, categorised by store aisle, with pantry subtraction and household sharing (completed 2026-04-04)
- [x] **Phase 19: Drag-and-Drop Planner** - Touch-friendly drag-and-drop plan editing with locked-slot mechanism for manual placements (completed 2026-04-06)
- [x] **Phase 20: Feedback Engine & Dietary Restrictions** - Recipe ratings, satiety tracking, repeat-rate monitoring, per-member dietary restrictions, and avoided foods (completed 2026-04-06)
- [x] **Phase 21: Schedule Model** - Per-member daily availability windows as planning constraints (completed 2026-04-06)
- [x] **Phase 22: Constraint-Based Planning Engine** - Async plan generation optimised for nutrition, cost, schedule, and preferences — with inventory-priority and feedback weighting (completed 2026-04-06)
- [x] **Phase 23: Prep Optimisation** - Batch prep suggestions, day-of task sequencing, and freezer-friendly recipe flagging (completed 2026-04-12)
- [x] **Phase 24: Dynamic Portioning** - Satiety-adaptive portion suggestions using feedback history and per-member consumption patterns (completed 2026-04-15)
- [x] **Phase 25: Universal Recipe Import** - Paste URL or text, AI extracts complete recipe with ingredients, macros, and instructions (completed 2026-04-19)
- [x] **Phase 26: Wire Cook Mode to Inventory and Budget** - Fix CookModePage completion to deduct inventory, log spend, and prompt for leftovers (v2.0 gap closure) (completed 2026-04-19)
- [x] **Phase 27: Wire Schedule Badges to PlanGrid** - Populate slotSchedules via useHouseholdSchedules so schedule UI feedback works on the plan page (v2.0 gap closure) (completed 2026-04-21)
- [x] **Phase 28: Resolve Prep Sequence Edge Function Orphans** - Wire or remove generate-cook-sequence and generate-reheat-sequence (v2.0 gap closure) (2026-04-22)
- [ ] **Phase 29: v2.0 Documentation Reconciliation** - Add IMPORT-01..05 to REQUIREMENTS.md, write missing VERIFICATION.md files, refresh v2.0 traceability, reconcile Phase 24 ROADMAP text (v2.0 gap closure)

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
- [x] 01-01-PLAN.md — Project scaffold, Tailwind theme, DB schema, test infra
- [x] 01-02-PLAN.md — Auth system and responsive app shell
- [x] 01-03-PLAN.md — Household create/join/invite and member management
- [x] 01-04-PLAN.md — Integration wiring, Home page, and end-to-end verification

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
**Plans**: 10 plans
Plans:
- [x] 02-01-PLAN.md — DB schema, types, and TDD nutrition utility functions
- [x] 02-02-PLAN.md — Edge Functions for USDA, Open Food Facts, and AI verification
- [x] 02-03-PLAN.md — Food search UI, custom food CRUD, and /foods route
- [x] 02-04-PLAN.md — Recipe builder with ingredients, servings, and sticky nutrition bar
- [x] 02-05-PLAN.md — Nested recipes, raw/cooked toggle, AI verification, and user verification
- [x] 02-06-PLAN.md — (gap closure) Fix RLS policies on food/recipe tables to use security-definer helpers
- [x] 02-07-PLAN.md — (gap closure) Deploy edge functions and set API secrets
- [x] 02-08-PLAN.md — (gap closure) Fix ingredient_id UUID type to text for external food IDs

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
**Plans**: 6 plans
Plans:
- [x] 03-01-PLAN.md — DB migration, TypeScript types, and nutrition/meal-plan utility functions
- [x] 03-02-PLAN.md — Meals CRUD hooks and MealBuilder UI
- [x] 03-03-PLAN.md — Nutrition targets hooks and member targets page
- [x] 03-04-PLAN.md — Meal plan grid, day cards, slot assignment, and progress rings
- [x] 03-05-PLAN.md — Template save/load, new week prompt, and navigation wiring
- [x] 03-06-PLAN.md — Human verification of all Phase 3 features

### Phase 4: Daily Logging & Summary
**Goal**: Each household member can log what they ate and see their daily nutrition progress against their targets
**Depends on**: Phase 3
**Requirements**: TRCK-04, TRCK-06, TRCK-07, PLAT-03, PLAT-04
**Success Criteria** (what must be TRUE):
  1. User can log a meal from the day's plan with a specific portion size (e.g., 1.5 servings) and override the default amount
  2. User can see a daily summary showing calories, macros, micronutrients, and custom goals versus their personal targets
  3. The app is installable to the home screen on a mobile device as a PWA
  4. Log entries made while offline are saved locally and sync automatically when the device reconnects
**Plans**: 5 plans
Plans:
- [x] 04-01-PLAN.md — DB migration, FoodLog type, utility functions, and unit tests
- [x] 04-02-PLAN.md — Food log CRUD hooks and logging UI components
- [x] 04-03-PLAN.md — PWA icons, workbox caching, offline banner, and install prompt
- [x] 04-04-PLAN.md — HomePage daily dashboard with progress rings, log list, and logging interactions
- [x] 04-05-PLAN.md — Human verification of all Phase 4 features

### Phase 5: Portion Suggestions & Polish
**Goal**: The app suggests how much each household member should eat per dish, micronutrients are fully visible, Open Food Facts is removed and replaced with Canadian Nutrient File, and the PWA passes production quality checks
**Depends on**: Phase 4
**Requirements**: TRCK-05
**Success Criteria** (what must be TRUE):
  1. When viewing a meal plan, each household member sees a suggested portion size for each dish calculated from their personal targets
  2. A household member can view the full micronutrient breakdown for any recipe in the meal plan
  3. The app passes a Lighthouse PWA audit with installability and offline requirements met
  4. Open Food Facts integration is completely removed — no edge function, no UI tab, no references in code
**Plans**: 5 plans
Plans:
- [x] 05-01-PLAN.md — OFF removal, CNF edge function, type updates, and micronutrient constants
- [x] 05-02-PLAN.md — Portion suggestion algorithm TDD (pure functions and tests)
- [x] 05-03-PLAN.md — Unified USDA+CNF search UI and micronutrient display panel
- [x] 05-04-PLAN.md — Portion suggestion UI on meal plan and LogMealModal pre-fill
- [x] 05-05-PLAN.md — PWA audit fixes and human verification

### Phase 6: Launch on gregok.ca
**Goal**: Deploy NourishPlan as a production PWA at nourishplan.gregok.ca with launch polish, invite-only auth, and a portfolio project card
**Depends on**: Phase 5
**Requirements**: LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04, LAUNCH-05, LAUNCH-06
**Success Criteria** (what must be TRUE):
  1. NourishPlan is live at https://nourishplan.gregok.ca with all SPA routes working
  2. Branded splash screen appears while the app loads
  3. Social sharing shows OG preview with title, description, and image
  4. Unknown routes show a branded 404 page
  5. Portfolio site at gregok.ca has a NourishPlan project card linking to the app
  6. New signups are blocked (invite-only) while existing users can log in
**Plans**: 3 plans
Plans:
- [x] 06-01-PLAN.md — Vercel config, splash screen, OG tags, 404 page, and offline page
- [x] 06-02-PLAN.md — Portfolio site NourishPlan project card
- [x] 06-03-PLAN.md — GitHub repo, Vercel deploy, DNS, and Supabase auth setup

### Phase 7: Fix Auth & Household Integration Gaps
**Goal**: Close the two integration gaps found by the v1.0 milestone audit — fix the broken password reset flow and the useCreateHousehold type mismatch
**Depends on**: Phase 1
**Requirements**: AUTH-04, HSHD-01
**Gap Closure:** Closes gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. User clicks password reset email link → lands on a working reset page (not 404) → can set a new password
  2. useCreateHousehold return type includes week_start_day — no TypeScript errors
  3. Password Reset E2E flow completes without errors
Plans:
- [x] 07-01-PLAN.md — Password reset route, reset page component, and useCreateHousehold type fix

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1. Foundation & Auth | Complete | 2026-03-13 |
| 2. Food Data & Recipe Builder | Complete | 2026-03-13 |
| 3. Meal Planning & Targets | Complete | 2026-03-13 |
| 4. Daily Logging & Summary | Complete | 2026-03-14 |
| 5. Portion Suggestions & Polish | Complete | 2026-03-14 |
| 6. Launch on gregok.ca | Complete | 2026-03-15 |
| 7. Fix Auth & Household Integration Gaps | Complete | 2026-03-15 |
| 8. v1.1 UI Polish | Complete | 2026-03-15 |
| 9. Dead Code Removal & Theme Token Cleanup | Complete | 2026-03-15 |
| 10. Requirements Documentation | Complete | 2026-03-15 |
| 11. Nutrition & Calculation Fixes | Complete | 2026-03-15 |
| 12. Home Page & Food Search Redesign | Complete | 2026-03-15 |
| 13. Recipe, Meal Plan & Account Mgmt | Complete | 2026-03-16 |
| 14. How-To Manual | Complete | 2026-03-17 |
| 15. v1.1 Audit Gap Closure | Complete | 2026-03-18 |
| 16. Budget Engine & Query Foundation | Complete | 2026-03-26 |
| 17. Inventory Engine | Complete | 2026-03-26 |
| 18. Grocery List Generation | Complete | 2026-04-04 |
| 19. Drag-and-Drop Planner | Complete | 2026-04-06 |
| 20. Feedback Engine & Dietary Restrictions | Complete | 2026-04-06 |
| 21. Schedule Model | Complete | 2026-04-06 |
| 22. Constraint-Based Planning Engine | Complete | 2026-04-06 |
| 23. Prep Optimisation | Complete | 2026-04-12 |
| 24. Dynamic Portioning | Complete | 2026-04-15 |
| 25. Universal Recipe Import | Complete | 2026-04-19 |
| 26. Wire Cook Mode to Inventory and Budget | Not started | - |
| 27. Wire Schedule Badges to PlanGrid | Not started | - |
| 28. Resolve Prep Sequence Edge Function Orphans | Not started | - |
| 29. v2.0 Documentation Reconciliation | Not started | - |

### Phase 8: v1.1 UI polish and usability improvements

**Goal:** Polish existing features with dark mode completeness, meal plan nutrition rings, realistic measurement units, mobile drawer navigation, expanded Settings with profile/household editing, and macro percentage scaling on nutrition targets
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06
**Depends on:** Phase 7
**Success Criteria** (what must be TRUE):
  1. All components render correctly in dark mode with visible ring colors and proper contrast
  2. Each meal plan slot shows mini nutrition rings indicating contribution to daily targets
  3. Food logging shows household measurement units (cups, tbsp, pieces) when source data provides them
  4. Mobile tab bar has a "More" button opening a slide-out drawer with overflow navigation
  5. Settings page allows editing display name, avatar, and household name (admin only)
  6. Nutrition targets form supports entering macros as percentages of calories with P+C+F=100% validation
**Plans:** 6/6 plans complete
Plans:
- [x] 08-01-PLAN.md — DB migrations (custom food portions, macro_mode, RLS policies) and type updates
- [x] 08-02-PLAN.md — Dark mode audit and ProgressRing theme-aware background
- [x] 08-03-PLAN.md — Per-slot mini nutrition rings on meal plan SlotCards
- [x] 08-04-PLAN.md — CNF serving sizes and PortionStepper unit selector
- [x] 08-05-PLAN.md — Mobile "More" drawer, Settings expansion, profile/avatar editing
- [x] 08-06-PLAN.md — Macro percentage scaling toggle on NutritionTargetsForm

### Phase 9: Dead Code Removal & Theme Token Cleanup
**Goal:** Remove dead code identified by the v1.1 milestone audit and fix OfflineBanner to use theme tokens for dark mode compatibility
**Depends on:** Phase 8
**Requirements:** TRCK-05, PLAT-03, POLISH-01
**Gap Closure:** Closes integration gaps INT-01, INT-02, INT-03 from v1.1 audit
**Success Criteria** (what must be TRUE):
  1. `usePortionSuggestions` hook is either removed or PlanGrid is refactored to use it (no dead code)
  2. `applyStoredTheme` export is removed from theme.ts (no orphaned exports)
  3. OfflineBanner renders correctly in dark mode using theme tokens instead of hardcoded amber classes
  4. `comingSoon` dead code branch is removed from Sidebar.tsx
**Plans:** 1 plan
Plans:
- [x] 09-01-PLAN.md — Dead code removal (usePortionSuggestions, applyStoredTheme export, Sidebar comingSoon branch) and OfflineBanner theme tokens

### Phase 10: Requirements Documentation Formalization
**Goal:** Add LAUNCH and POLISH requirement definitions to REQUIREMENTS.md so all implemented features have formal requirement entries
**Depends on:** Phase 8
**Requirements:** LAUNCH-01-LAUNCH-06, POLISH-01-POLISH-06
**Gap Closure:** Closes documentation gaps from v1.1 audit
**Success Criteria** (what must be TRUE):
  1. LAUNCH-01 through LAUNCH-06 are defined in REQUIREMENTS.md with descriptions matching ROADMAP.md
  2. POLISH-01 through POLISH-06 are defined in REQUIREMENTS.md with descriptions matching ROADMAP.md
  3. Traceability table includes all 12 new requirements mapped to their phases
**Plans:** 1/1 plans complete
Plans:
- [x] 10-01-PLAN.md — Add LAUNCH and POLISH requirement definitions, traceability rows, and ROADMAP reference corrections

### Phase 11: Nutrition & Calculation Fixes

**Goal:** Fix calorie/macro scaling with quantity changes, ensure logged foods update micronutrient goals, and show specific measurement units for serving sizes
**Depends on:** Phase 10
**Requirements**: CALC-01, CALC-02, CALC-03
**Success Criteria** (what must be TRUE):
  1. Changing ingredient quantity (e.g. 50g vs 770g egg white) shows proportionally different calories and macros
  2. Logging a food updates the user's daily micronutrient goal progress
  3. Serving sizes display specific measurements (grams, cups, tbsp, etc.) instead of generic "1 serving"
**Plans:** 2/2 plans complete
Plans:
- [x] 11-01-PLAN.md — DB migration (serving_unit), FreeformLogModal fix, LogMealModal micros, LogEntryItem display, hook expansion
- [x] 11-02-PLAN.md — RecipeBuilder foodDataMap hydration and HomePage micronutrient summary

### Phase 12: Home Page & Food Search Redesign

**Goal:** Remove the Food tab and integrate food search/logging directly on the home page with improved search relevance and meal-level micronutrient drill-down
**Depends on:** Phase 11
**Requirements**: UXLOG-01, UXLOG-02, UXLOG-03, UXLOG-04
**Success Criteria** (what must be TRUE):
  1. Food tab is removed from navigation; food logging is accessible directly from the home page via a search bar or "Log food" action
  2. Food search prioritizes simplest matching ingredients over CNF-prefixed results (basic items appear first)
  3. User can drill into each logged meal to see per-food micronutrient breakdown
  4. Home page + button is replaced with a contextual "Log food" UI element following UX best practices
**Plans:** 2/2 plans complete
Plans:
- [x] 12-01-PLAN.md — Fuzzy search scoring and FoodSearchOverlay component
- [x] 12-02-PLAN.md — HomePage integration, LogEntryItem drill-down, nav cleanup, RecipeBuilder wiring

### Phase 13: Recipe, Meal Plan & Account Management

**Goal:** Fix recipe builder navigation, add recipe notes and dates, enable meal plan start date selection, add print meal plan, enable deletion of meals/recipes/foods, and add account deletion with household management
**Depends on:** Phase 12
**Requirements**: RCPUX-01, RCPUX-02, RCPUX-03, MPLAN-01, MPLAN-02, DELMG-01, DELMG-02, ACCTM-01
**Success Criteria** (what must be TRUE):
  1. Clicking away from an ingredient in the recipe builder returns to the search view, not the recipe page
  2. Recipes have an optional notes/variations subtitle field and a date created tag
  3. User can choose the start date for a meal plan
  4. User can print a meal plan via a print button
  5. User can delete meals, recipes, and foods they created
  6. User can delete their account with option to delete the household or transfer admin rights to the next member
**Plans:** 4/4 plans complete
Plans:
- [x] 13-01-PLAN.md — Recipe notes migration, FoodSearchOverlay nav fix, RecipeBuilder notes/date, RecipesPage inline delete
- [x] 13-02-PLAN.md — Meal inline delete, deleted meal placeholder, start date picker, print meal plan
- [x] 13-03-PLAN.md — Account deletion edge function and SettingsPage danger zone

### Phase 14: How-To Manual

**Goal:** Provide an in-app how-to guide that explains how to use all features of NourishPlan
**Depends on:** Phase 13
**Requirements**: DOCS-01
**Success Criteria** (what must be TRUE):
  1. An in-app how-to manual is accessible from the UI explaining how to use all major features (food logging, recipes, meal planning, nutrition targets, household management)
  2. Manual content is accurate and matches the current state of the app
**Plans:** 1/1 plans complete
Plans:
- [x] 14-01-PLAN.md — GuidePage with accordion sections, navigation links, and source-check tests

### Phase 15: v1.1 Audit Gap Closure

**Goal:** Close all remaining gaps from the v1.1 milestone audit — fix cache invalidation on recipe deletion, remove dead code, fix RED test stubs, and formalize enhancement requirement IDs in REQUIREMENTS.md
**Depends on:** Phase 14
**Requirements**: RECP-05, DELMG-01, ACCTM-01, CALC-01, CALC-02, CALC-03, UXLOG-01, UXLOG-02, UXLOG-03, UXLOG-04, RCPUX-01, RCPUX-02, RCPUX-03, MPLAN-01, MPLAN-02, DELMG-02, DOCS-01
**Gap Closure:** Closes INT-CACHE-01, INT-DEAD-01, and tech debt from v1.1 audit
**Success Criteria** (what must be TRUE):
  1. Deleting a recipe invalidates meal-plan-slots and meals query cache — no stale slot data
  2. ComingSoonPage dead code is removed from App.tsx
  3. All test stubs in tests/settings.test.tsx have real assertions matching implementation
  4. CALC-01-03, UXLOG-01-04, RCPUX-01-03, MPLAN-01-02, DELMG-01-02, ACCTM-01, DOCS-01 are formally defined in REQUIREMENTS.md
**Plans:** 1/1 plans complete
Plans:
- [x] 15-01-PLAN.md — Fix recipe deletion cache invalidation and remove ComingSoonPage dead code

---

## v2.0 AMPS — Phase Details

### Phase 16: Budget Engine & Query Foundation
**Goal**: Households can track ingredient costs, see cost per recipe serving, and monitor weekly spend against a household budget — and all v2.0 queries share a centralised key hierarchy preventing cache incoherence
**Depends on**: Phase 15
**Requirements**: BUDG-01, BUDG-02, BUDG-03, BUDG-04
**Success Criteria** (what must be TRUE):
  1. User can enter a cost per unit or weight on each recipe ingredient and see the per-serving cost computed automatically
  2. User can set a weekly household food budget and see the current week's spend vs remaining balance on the Plan page
  3. Recipe cards and the recipe detail view display the computed cost per serving
  4. `src/lib/queryKeys.ts` exists with a full key hierarchy for all v2.0 query families; all v2.0 mutations invalidate keys via this centralised map
**Plans**: 4 plans
**UI hint**: yes
Plans:
- [x] 16-01-PLAN.md — Query key centralisation and budget engine DB migration
- [x] 16-02-PLAN.md — Cost utilities, food price hooks, and recipe cost display
- [x] 16-03-PLAN.md — Budget setting, spend tracking, and Plan page budget section
- [x] 16-04-PLAN.md — Human verification of all budget engine features

### Phase 17: Inventory Engine
**Goal**: Household members can maintain a pantry/fridge/freezer inventory with quantities, units, expiry dates, and storage locations — and the inventory updates automatically when a meal plan is finalised or leftovers are logged
**Depends on**: Phase 16
**Requirements**: INVT-01, INVT-02, INVT-03, INVT-04, INVT-05, INVT-06
**Success Criteria** (what must be TRUE):
  1. User can add an item to inventory by scanning a barcode or searching by name, specifying quantity, unit, storage location (pantry/fridge/freezer), and optional expiry date
  2. Inventory list is sorted so items expiring soonest appear first, and past-expiry items are visually flagged
  3. Finalising a meal plan automatically deducts the ingredient quantities used from matching inventory items
  4. Uneaten portions of a recipe can be saved as leftover inventory items with an estimated expiry date
**Plans**: 5 plans
**UI hint**: yes
Plans:
- [x] 17-01-PLAN.md — DB migration, types, utility functions, query keys, tests
- [x] 17-02-PLAN.md — CRUD hooks, InventoryPage with tabs, add/edit/remove modal, navigation
- [x] 17-03-PLAN.md — Barcode scanning, QuickScanMode, Open Food Facts lookup
- [x] 17-04-PLAN.md — Cook deduction (FIFO), receipt, HomePage widget, leftover support
- [x] 17-05-PLAN.md — Human verification of all inventory features

### Phase 18: Grocery List Generation
**Goal**: The app auto-generates a categorised grocery list from the active meal plan, subtracts what the household already has in inventory, and lets household members check off items while shopping
**Depends on**: Phase 17
**Requirements**: GROC-01, GROC-02, GROC-03, GROC-04, GROC-05
**Success Criteria** (what must be TRUE):
  1. Grocery list is generated automatically from the active week's meal plan ingredients, aggregated across all recipes and meals
  2. Items already in inventory are shown as "already have" and excluded from the "need to buy" list
  3. Grocery list items are grouped by store category (produce, dairy, meat, pantry, etc.)
  4. Household member can check off items in-store and the list persists the checked state across page reloads
  5. The grocery list is visible to all household members without manual sharing
**Plans**: 3 plans
**UI hint**: yes
Plans:
- [x] 18-01-PLAN.md — DB migration, types, query keys, and grocery generation algorithm with tests
- [x] 18-02-PLAN.md — Hooks with Supabase realtime, GroceryPage UI, components, nav, and routing
- [x] 18-03-PLAN.md — Human verification of all grocery list features

### Phase 19: Drag-and-Drop Planner
**Goal**: Users can rearrange meals on the weekly plan grid by dragging and dropping, and manually placed meals are locked so auto-generation cannot overwrite them
**Depends on**: Phase 16
**Requirements**: PLAN-01, PLAN-03
**Success Criteria** (what must be TRUE):
  1. User can drag a meal from one plan slot and drop it onto any other slot on the weekly grid — the swap persists after page reload
  2. Drag-and-drop works on both desktop (mouse) and mobile (touch) without accidental triggers during scroll
  3. A slot that has been manually filled is visually marked as locked; the locked state persists in the database
  4. Locked slots cannot be overwritten by auto-generation (Phase 22) — they are skipped and the generated plan fills only unlocked slots
**Plans**: 3 plans
**UI hint**: yes
Plans:
- [x] 19-01-PLAN.md — Install dnd-kit, DB migration (is_locked), types, hooks, DragHandle, LockBadge, SlotCard integration
- [x] 19-02-PLAN.md — DndContext, DragOverlay, DropActionMenu, droppable slots, DayCarousel mobile layout
- [x] 19-03-PLAN.md — Database schema push and human verification of all DnD features

### Phase 20: Feedback Engine & Dietary Restrictions
**Goal**: Household members can rate recipes after eating them, flag satiety, set dietary restrictions, and list foods they won't eat — and the system warns when the plan becomes monotonous
**Depends on**: Phase 16
**Requirements**: FEED-01, FEED-02, FEED-03, FEED-04
**Success Criteria** (what must be TRUE):
  1. After logging a meal, user is prompted to rate the recipe (1-5 stars) and indicate satiety (still hungry / satisfied / too much)
  2. Each household member can set dietary restrictions (allergens, vegetarian, gluten-free, etc.) on their profile
  3. Each household member can maintain a list of foods they won't eat, and recipes containing those ingredients are flagged
  4. Plan page warns when the same recipe appears more than twice in a rolling two-week window
**Plans**: 4 plans
**UI hint**: yes
Plans:
- [x] 20-01-PLAN.md — DB migration, types, query keys, monotony utility, test stubs
- [x] 20-02-PLAN.md — Rating hooks, RateMealsCard, MealRatingRow, HomePage integration
- [x] 20-03-PLAN.md — Dietary restrictions hooks, won't-eat hooks, Settings sections, AI Edge Function
- [x] 20-04-PLAN.md — IssuesPanel, SlotCard badges, AI tags, InsightsPage, navigation, schema push

### Phase 21: Schedule Model
**Goal**: Each household member can set their daily availability for meal prep and eating, and these windows are stored as structured constraints ready to feed the Planning Engine
**Depends on**: Phase 16
**Requirements**: SCHED-01, SCHED-02
**Success Criteria** (what must be TRUE):
  1. Each household member can configure availability windows per day of the week (prep available / quick meal only / away) from their profile or settings
  2. The schedule is stored as structured per-day constraint records and is consumed by the Planning Engine in Phase 22 — no free-text fields
**Plans**: 3 plans
**UI hint**: yes
Plans:
- [x] 21-01-PLAN.md — DB migration, types, query keys, and schedule CRUD hooks
- [x] 21-02-PLAN.md — ScheduleGrid UI, member selector, and Settings integration
- [x] 21-03-PLAN.md — Human verification of schedule model features

### Phase 22: Constraint-Based Planning Engine
**Goal**: The app can generate a complete weekly meal plan optimised across nutrition targets, household budget, member schedules, dietary restrictions, and recipe preference signals — without blocking the UI
**Depends on**: Phase 17, Phase 19, Phase 20, Phase 21
**Requirements**: PLAN-02, PLAN-04, PLAN-05
**Success Criteria** (what must be TRUE):
  1. User triggers plan generation; the UI returns immediately with a status indicator while the plan is generated asynchronously
  2. Generated plan respects all household dietary restrictions and won't-eat lists — no flagged ingredients appear in any slot
  3. Generated plan skips locked slots (Phase 19) and only fills unlocked slots
  4. Plan page highlights nutrition gaps per member after generation and offers swap suggestions to close them
  5. Recipes already in inventory are weighted higher in recipe selection — ingredients the household has are preferred
**Plans**: 5 plans
**UI hint**: yes
Plans:
- [x] 22-01-PLAN.md — Edge function scaffold, constraint data fetching, recipe scoring algorithm
- [x] 22-02-PLAN.md — Slot assignment, nutrition gap detection, swap suggestions
- [x] 22-03-PLAN.md — GeneratePlanButton, status polling, PlanGrid integration
- [x] 22-04-PLAN.md — SwapSuggestions UI, NutritionGaps panel, and plan page wiring
- [x] 22-05-PLAN.md — Schema push and human verification of all planning engine features

### Phase 23: Prep Optimisation
**Goal**: Users can see a batch prep schedule for the week and a day-of task sequence for any meal, so cooking time is used efficiently
**Depends on**: Phase 22
**Requirements**: PREP-01, PREP-02, PREP-03
**Success Criteria** (what must be TRUE):
  1. Plan page shows a weekly batch prep summary — which recipes can be prepped ahead, grouped by shared ingredients or equipment
  2. User can view a day-of task sequence for any meal showing steps in longest-first order to minimise total cooking time
  3. Recipes that freeze well are visually flagged in the plan view and batch prep suggestions as make-ahead candidates
**Plans**: 10 plans
Plans:
- [x] 23-01-PLAN.md  -- Schema migration 029, TypeScript types, queryKeys
- [x] 23-02-PLAN.md  -- Four edge functions (steps, batch prep, cook sequence, reheat)
- [x] 23-03-PLAN.md  -- Recipe hooks (useRecipeSteps, useBatchPrepSummary, useFreezerClassification)
- [x] 23-03b-PLAN.md -- Cook session hooks + Notification wrapper (useCookSession, useNotificationPermission)
- [x] 23-04-PLAN.md  -- Recipe editor Steps section, FreezerBadge, recipe list badge
- [x] 23-05-PLAN.md  -- Batch prep modal, SlotCard freezer badge + Cook action, PlanGrid button
- [x] 23-06-PLAN.md  -- Cook Mode routes, shell, CookModePage, and standalone picker
- [x] 23-06b-PLAN.md -- Cook Mode step components and recipe detail entry point
- [x] 23-07-PLAN.md  -- PWA notifications and timer integration
- [x] 23-08-PLAN.md  -- Tests and validation (V-01 through V-10)
**UI hint**: yes

### Phase 24: Dynamic Portioning
**Goal**: Portion suggestions adapt over time based on each member's satiety feedback and consumption history, moving beyond static calorie-target splits
**Depends on**: Phase 20
**Requirements**: PORT-01, PORT-02
**Success Criteria** (what must be TRUE):
  1. Per-member portion suggestions use each member's calorie target as the primary driver — members with higher targets receive proportionally larger suggested portions
  2. When a member has logged a recipe multiple times and consistently adjusts the suggested portion, the system adapts future suggestions for that recipe toward the observed amount
**Plans**: 2 plans
Plans:
- [x] 24-01-PLAN.md — RecipeMixPanel component (three-slider panel with localStorage persistence) and PlanGrid wiring
- [x] 24-02-PLAN.md — generate-plan edge function enrichment (cook frequency, last-cooked, per-member ratings, cost per serving, tier-aware AI prompts) + redeploy
**UI hint**: yes


### Phase 25: Universal Recipe Import
**Goal**: Users can paste a URL (blog, YouTube) or raw recipe text and the AI extracts a complete recipe with ingredients, macros, and instructions — saved directly to the recipe library
**Depends on**: Phase 13
**Requirements**: IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04, IMPORT-05
**Success Criteria** (what must be TRUE):
  1. User can paste a blog URL and get a complete recipe with ingredients and macros
  2. User can paste raw recipe text and get the same result
  3. User can paste a YouTube cooking video URL and get a recipe extracted from the transcript
  4. Recipe appears in the recipe builder ready to edit
  5. No new database tables or migrations required
**Plans**: 3 plans
Plans:
- [x] 25-01-PLAN.md — DB migration (source_url column), edge function (import-recipe), type updates
- [x] 25-02-PLAN.md — useImportRecipe hook, ImportRecipeModal, RecipesPage button, RecipeBuilder skeleton + attribution
- [x] 25-03-PLAN.md — Schema push, edge function deploy, and human verification
**UI hint**: yes

## v2.0 Gap Closure — Phase Details

### Phase 26: Wire Cook Mode to Inventory and Budget
**Goal**: Meals cooked via Plan → Cook Mode trigger inventory deduction, a spend_log entry, and a leftover save prompt — matching the behaviour of the RecipeBuilder "Mark as Cooked" button
**Depends on**: Phase 25
**Requirements**: INVT-05, INVT-06, BUDG-03
**Gap Closure:** Closes CRIT-01 from v2.0 audit (Cook Mode → Inventory/Budget integration)
**Success Criteria** (what must be TRUE):
  1. Completing a cook session via `/cook/:mealId` fires `useInventoryDeduct` against the recipe's ingredients (FIFO), matching the RecipeBuilder code path at RecipeBuilder.tsx:590-613
  2. Completing a cook session inserts a `spend_logs` row with `source: 'cook'` — the meal shows up in `useWeeklySpend` on the PlanPage BudgetSummarySection
  3. `CookDeductionReceipt` renders on completion with deducted items and any missing/insufficient items
  4. After completion, the user is prompted to save any uneaten portion as a leftover inventory item via `AddInventoryItemModal` with `leftoverDefaults`
  5. The end-to-end flow Budget → Cook → Inventory → Grocery reconciles: generating a grocery list after a cook correctly subtracts the deducted ingredients
**Plans**: 4 plans
**UI hint**: yes
Plans:
- [x] 26-01-PLAN.md — useCookCompletion shared hook + vitest unit tests (Wave 1)
- [x] 26-02-PLAN.md — Extend CookDeductionReceipt with onSaveLeftover prop + Save leftover portion button (Wave 1)
- [x] 26-03-PLAN.md — Refactor RecipeBuilder.handleMarkAsCooked to use shared hook + wire leftover modal (Wave 2)
- [x] 26-04-PLAN.md — Wire CookModePage completion sequence + grep-assertion tests (Wave 3)

### Phase 27: Wire Schedule Badges to PlanGrid
**Goal**: The schedule set via `ScheduleSection` surfaces as coloured dot badges on PlanGrid SlotCards (peach=consume, amber=quick, red=away) so the Phase 21 data model is visible to the user
**Depends on**: Phase 21
**Requirements**: SCHED-01, SCHED-02
**Gap Closure:** Closes CRIT-02 from v2.0 audit (PlanGrid → useSchedule → slotSchedules prop)
**Success Criteria** (what must be TRUE):
  1. `PlanGrid.tsx` imports `useHouseholdSchedules` from `../../hooks/useSchedule` and calls it with `(householdId)`; the returned rows are aggregated into a `Map<number, Map<string, ScheduleStatus>>` using the precedence rule `away > quick > consume > prep`, memoised via `useMemo`. (Amended in Phase 27 planning per D-08 — original text referenced the single-member `useSchedule` hook.)
  2. `PlanGrid.tsx` builds a `Map<number, Map<string, ScheduleStatus>>` keyed by day-of-week and slot name via `buildGrid` (or equivalent), memoised via `useMemo`
  3. Both the mobile (DayCarousel) and desktop render sites pass `slotSchedules={slotSchedulesByDay?.get((weekStartDay + dayIndex) % 7)}` to each `DayCard` (day-of-week key, not plan-relative day index — required when `weekStartDay !== 0`). (Amended in Phase 27 planning per D-10 — original text used a plan-relative key that would shift incorrectly for Monday-start households.)
  4. SlotCards display the correct coloured dot when a schedule row exists for that day/slot; prep shows no dot
  5. Test covers PlanGrid → DayCard prop forwarding so this regression cannot silently recur
**Plans**: 3 plans (3/3 complete)
**UI hint**: yes
Plans:
- [x] 27-01-PLAN.md — Restore queryKeys.schedule + useHouseholdSchedules hook + buildHouseholdGrid/Tooltips helpers (Wave 1)
- [x] 27-02-PLAN.md — Wire useHouseholdSchedules into PlanGrid + restore SlotCard dot JSX (Wave 2)
- [x] 27-03-PLAN.md — Add tests/PlanGrid.schedule.test.tsx regression test + amend ROADMAP §Phase 27 criteria #1/#3 (Wave 3)

### Phase 28: Resolve Prep Sequence Edge Function Orphans
**Goal**: Either wire `generate-cook-sequence` and `generate-reheat-sequence` into CookModePage (combined multi-recipe sessions + reheat path) or remove them from `supabase/functions/` and update Phase 23 records
**Depends on**: Phase 23
**Requirements**: PREP-02
**Gap Closure:** Closes WARN-01 from v2.0 audit (orphaned edge functions)
**Success Criteria** (what must be TRUE):
  1. A decision is recorded: wire-in or remove — documented in the phase PLAN with rationale
  2. If wire-in: CookModePage invokes `generate-cook-sequence` when `flowMode === 'combined'` (multi-recipe cook session) and `generate-reheat-sequence` when `flowMode === 'reheat'`; the returned step list replaces the current single-recipe / hardcoded fallback
  3. If remove: `supabase/functions/generate-cook-sequence` and `supabase/functions/generate-reheat-sequence` are deleted; `23-SUMMARY` entries are corrected; Supabase deployment list reflects the removal
  4. Integration check — `grep -r "cook-sequence\|reheat-sequence" src/` either returns consumer invocations (wire-in) or returns zero matches with zero surviving function files (remove)
  5. PREP-02 traceability status reflects the decision
**Plans**: 5 plans (5/5 complete)
**UI hint**: yes
Plans:
- [x] 28-01-PLAN.md — Create useGenerateCookSequence + useGenerateReheatSequence hooks (Wave 1)
- [x] 28-02-PLAN.md — Create CookSequenceLoadingOverlay component (Wave 1)
- [x] 28-03-PLAN.md — Redeploy both edge functions with --no-verify-jwt (Wave 1, checkpoint)
- [x] 28-04-PLAN.md — Wire CookModePage: reheat auto-fire 3-state render + handleStartCook try/catch + overlay conditional (Wave 2)
- [x] 28-05-PLAN.md — Add CookModePage.prepSequence regression test + flip REQUIREMENTS.md PREP-02 label to (wire-in) (Wave 3)

### Phase 29: v2.0 Documentation Reconciliation
**Goal**: Close v2.0 audit documentation gaps so the milestone can archive with accurate state — formalise IMPORT requirements, backfill missing VERIFICATION.md files, refresh the stale traceability table, and reconcile Phase 24's ROADMAP text with the D-02 scope pivot
**Depends on**: Phase 25
**Requirements**: IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04, IMPORT-05
**Gap Closure:** Closes WARN-02 / WARN-03 / WARN-04 / WARN-05 from v2.0 audit (documentation drift)
**Success Criteria** (what must be TRUE):
  1. IMPORT-01 through IMPORT-05 are defined in `REQUIREMENTS.md` (description + traceability row mapped to Phase 25, status Complete)
  2. `.planning/phases/17-inventory-engine/17-VERIFICATION.md` exists with goal-backward verification against INVT-01..INVT-06 using the UAT evidence captured in 17-04-SUMMARY
  3. `.planning/phases/25-universal-recipe-import/25-VERIFICATION.md` exists with goal-backward verification against IMPORT-01..IMPORT-05 using the live Playwright UAT evidence captured in 25-03-SUMMARY
  4. v2.0 traceability rows in REQUIREMENTS.md (BUDG, INVT, GROC, PLAN, FEED, SCHED, PREP, PORT, IMPORT) reflect actual satisfied/partial/pending state after Phase 26–28 merges; checkboxes match
  5. Phase 24 ROADMAP entry is updated in place (or annotated) to reflect the D-02 tier-aware recipe selection pivot; PORT-02 description in REQUIREMENTS.md matches the shipped scope
**Plans**: TBD
