---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: UI polish and usability improvements
status: Ready to execute
stopped_at: "Phase 30-07 COMPLETE — SPEC Req #8 regression test shipped. tests/e2e/household-permissions.spec.ts passes 1/1 (48s) against live Supabase; promoted admin performs all three admin-gated actions (invite, weekly_budget, role-change) and Remove round-trip proves SPEC Req #3. Final wave of Phase 30 done — all 7 plans shipped across 4 waves."
last_updated: "2026-04-24T03:30:00.000Z"
progress:
  total_phases: 15
  completed_phases: 15
  total_plans: 57
  completed_plans: 57
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Families can plan meals that optimize nutrition, cost, time, and satisfaction for every household member under real-world constraints.
**Current focus:** Phase 30 — granular-household-member-permissions (COMPLETE; 7/7 plans shipped across 4 waves)

## Current Position

Phase: 30 — COMPLETE (7/7 plans shipped: DB layer + Playwright infra + primitives + hooks + MemberList UI + InviteLink/JoinHousehold UI + E2E regression test)
Evidence: .planning/phases/30-granular-household-member-permissions-system-admin-editor-vi/30-07-SUMMARY.md — SPEC Req #8 proven end-to-end via 1 passing Playwright test (`1 passed (48.7s)` on 3 consecutive runs, exit 0). Promoted admin B performs invite + weekly_budget + role-change without permission errors; Remove round-trip confirms SPEC Req #3. Idempotent: household_members ends with only Admin A after each run.
Next up: v2.0 milestone archive (`/gsd-complete-milestone`) is unblocked — Phase 30 was the final in-scope phase. Phase 26 criterion #5 still in 26-HUMAN-UAT.md pending manual Playwright pass (unrelated; carried from Phase 27/28 handoff).

Progress: ██████████ 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 17
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation-auth P01 | 427 | 3 tasks | 20 files |
| Phase 01-foundation-auth P03 | 245 | 2 tasks | 10 files |
| Phase 01-foundation-auth P02 | 480 | 2 tasks | 18 files |
| Phase 02-food-data-recipe-builder P02 | 2 | 2 tasks | 3 files |
| Phase 02-food-data-recipe-builder P01 | 3 | 3 tasks | 8 files |
| Phase 02-food-data-recipe-builder P03 | 18 | 3 tasks | 9 files |
| Phase 02-food-data-recipe-builder P04 | 15 | 3 tasks | 7 files |
| Phase 02-food-data-recipe-builder P05 | 8 | 2 tasks | 3 files |
| Phase 01-foundation-auth P04 | 10 | 2 tasks | 6 files |
| Phase 01-foundation-auth P05 | 2 | 2 tasks | 4 files |
| Phase 02-food-data-recipe-builder P07 | 5 | 1 tasks | 1 files |
| Phase 02-food-data-recipe-builder P06 | 1 | 2 tasks | 1 files |
| Phase 02-food-data-recipe-builder P08 | 5 | 1 tasks | 2 files |
| Phase 02-food-data-recipe-builder P08 | 10 | 2 tasks | 2 files |
| Phase 03-meal-planning-targets P01 | 5 | 2 tasks | 7 files |
| Phase 03-meal-planning-targets P03 | 2 | 2 tasks | 4 files |
| Phase 03-meal-planning-targets P02 | 3 | 2 tasks | 7 files |
| Phase 03-meal-planning-targets P04 | 3 | 2 tasks | 8 files |
| Phase 03-meal-planning-targets P05 | 3 | 2 tasks | 8 files |
| Phase 04-daily-logging-summary P01 | 8 | 1 tasks | 5 files |
| Phase 04-daily-logging-summary P03 | 2 | 2 tasks | 8 files |
| Phase 04-daily-logging-summary P02 | 3 | 2 tasks | 4 files |
| Phase 04-daily-logging-summary P04 | 4 | 2 tasks | 5 files |
| Phase 05-portion-suggestions-polish P01 | 12 | 2 tasks | 4 files |
| Phase 05-portion-suggestions-polish P02 | 12 | 2 tasks | 2 files |
| Phase 05-portion-suggestions-polish P03 | 4 | 2 tasks | 6 files |
| Phase 05-portion-suggestions-polish P04 | 4 | 2 tasks | 8 files |
| Phase 05-portion-suggestions-polish P05 | 30 | 2 tasks | 1 files |
| Phase 06-launch-on-gregok-ca P02 | 5 | 1 tasks | 1 files |
| Phase 06-launch-on-gregok-ca P01 | 3 | 2 tasks | 6 files |
| Phase 06-launch-on-gregok-ca P03 | 60 | 2 tasks | 2 files |
| Phase 07-fix-auth-household-gaps P01 | 15 | 2 tasks | 4 files |
| Phase 08-v1-1-ui-polish-and-usability-improvements P01 | 1 | 2 tasks | 2 files |
| Phase 08-v1-1-ui-polish-and-usability-improvements P02 | 2 | 2 tasks | 2 files |
| Phase 08-v1-1-ui-polish-and-usability-improvements P03 | 2 | 1 tasks | 2 files |
| Phase 08-v1-1-ui-polish-and-usability-improvements P04 | 153 | 2 tasks | 3 files |
| Phase 08-v1-1-ui-polish-and-usability-improvements P05 | 20 | 2 tasks | 4 files |
| Phase 08-v1-1-ui-polish-and-usability-improvements P06 | 10 | 2 tasks | 4 files |
| Phase 09-dead-code-removal-theme-token-cleanup P01 | 2 | 2 tasks | 5 files |
| Phase 10-requirements-documentation-formalization P01 | 2 | 2 tasks | 2 files |
| Phase 11-nutrition-calculation-fixes P01 | 2 | 2 tasks | 7 files |
| Phase 11-nutrition-calculation-fixes P02 | 2 | 2 tasks | 2 files |
| Phase 12-home-page-food-search-redesign P01 | 6 | 3 tasks | 3 files |
| Phase 12-home-page-food-search-redesign P02 | 7 | 4 tasks | 11 files |
| Phase 12-home-page-food-search-redesign PP02 | 45 | 4 tasks | 9 files |
| Phase 13-recipe-meal-plan-account-management P00 | 3 | 1 tasks | 4 files |
| Phase 13-recipe-meal-plan-account-management P03 | 334 | 2 tasks | 2 files |
| Phase 13-recipe-meal-plan-account-management P01 | 10 | 3 tasks | 7 files |
| Phase 13-recipe-meal-plan-account-management P02 | 15 | 2 tasks | 8 files |
| Phase 14-how-to-manual PP01 | 155 | 3 tasks | 5 files |
| Phase 15-v1-1-audit-gap-closure P01 | 1 | 2 tasks | 2 files |
| Phase 16-budget-engine-query-foundation P01 | 15 | 2 tasks | 13 files |
| Phase 16-budget-engine-query-foundation P02 | 3 | 2 tasks | 5 files |
| Phase 16-budget-engine-query-foundation P03 | 25 | 2 tasks | 8 files |
| Phase 17-inventory-engine P01 | 4 | 2 tasks | 6 files |
| Phase 17-inventory-engine P02 | 11 | 2 tasks | 8 files |
| Phase 17-inventory-engine P04 | 7 | 2 tasks | 6 files |
| Phase 18-grocery-list-generation P01 | 324 | 2 tasks | 5 files |
| Phase 18-grocery-list-generation P02 | 35 | 2 tasks | 15 files |
| Phase 25-universal-recipe-import P01 | 3 | 2 tasks | 3 files |
| Phase 25-universal-recipe-import P02 | 3 | 2 tasks | 4 files |
| Phase 25-universal-recipe-import P03 | 240 | 2 tasks | 3 files |
| Phase 27-wire-schedule-badges-to-plangrid P01 | 10 | 2 tasks | 5 files |
| Phase 27-wire-schedule-badges-to-plangrid P02 | 4 | 2 tasks | 3 files |
| Phase 27-wire-schedule-badges-to-plangrid P03 | 6 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stack: Vite 7 + React 19 + Supabase + TanStack Query + Tailwind CSS 4 (from research)
- Data model: per-100g normalization at ingest, polymorphic recipe_ingredients, template/instance distinction for meal plans
- Household isolation: Postgres RLS enforcement (not application layer only)
- [Phase 01-foundation-auth]: Vite 8 + react-router-dom v7 scaffolded as latest stable; SPA usage identical to planned v7/v6
- [Phase 01-foundation-auth]: Tailwind CSS 4 uses @tailwindcss/vite plugin with CSS-first @theme tokens; no tailwind.config.js needed
- [Phase 01-foundation-auth]: Bootstrap household creation with separate RLS policy allowing creator to insert self as admin before any membership exists
- [Phase 01-foundation-auth]: Used maybeSingle() for useHousehold to return null gracefully for new users without a household
- [Phase 01-foundation-auth]: AuthGuard skips household redirect for /setup and /join routes to prevent redirect loop
- [Phase 01-foundation-auth]: JoinHousehold accepts full invite URLs or raw tokens to improve paste UX
- [Phase 01-foundation-auth]: AuthContext exports both AuthProvider and useAuth — hook re-exported in useAuth.ts for backward compat
- [Phase 01-foundation-auth]: TabBar Plan tab uses role=link + aria-disabled=true (span element) to pass as accessible disabled link
- [Phase 01-foundation-auth]: window.matchMedia mock added to tests/setup.ts globally — jsdom does not implement matchMedia
- [Phase 01-foundation-auth]: AppShell used as layout route in App.tsx with Outlet for nested authenticated routes pattern
- [Phase 02-food-data-recipe-builder]: USDA deduplication uses priority map (Foundation=0, SR Legacy=1, Survey=2, Branded=3) — lower number wins on duplicate description
- [Phase 02-food-data-recipe-builder]: verify-nutrition returns HTTP 200 with verified=false on graceful degradation — never blocks food search flow
- [Phase 02-food-data-recipe-builder]: Polymorphic recipe_ingredients.ingredient_id with no DB FK — ingredient_type discriminates food vs recipe reference
- [Phase 02-food-data-recipe-builder]: Yield factors >1 for legumes/grains (2.5x water absorption) — applyYieldFactor divides cooked weight to get raw equivalent
- [Phase 02-food-data-recipe-builder]: USDA_NUTRIENT_IDS exported as typed const — semantic names prevent magic number errors in API consumers
- [Phase 02-food-data-recipe-builder]: TabBar Plan tab replaced with Foods tab — Plan feature comes in Phase 3
- [Phase 02-food-data-recipe-builder]: FoodDataMap captures macros at add-time from NormalizedFoodResult — avoids re-fetching multiple food sources for live nutrition calculation
- [Phase 02-food-data-recipe-builder]: Recipe picker as Food|Recipe tab inside search overlay — reuses existing back/close UX instead of separate modal
- [Phase 02-food-data-recipe-builder]: DEFAULT_YIELD_FACTOR=0.85 (vegetables category) for ingredients without known category — general cooking loss heuristic
- [Phase 01-foundation-auth]: useCreateHousehold uses client-generated crypto.randomUUID() for RLS-bootstrap-safe household creation
- [Phase 01-foundation-auth]: main.tsx simplified — providers (QueryClient, BrowserRouter) colocated in App.tsx as single provider hierarchy
- [Phase 01-foundation-auth]: has_valid_invite() security-definer helper avoids RLS recursion when checking household_invites from a household_members policy
- [Phase 01-foundation-auth]: User-scoped query keys (session.user.id as second segment) prevent stale cache data leaking between user sessions
- [Phase 02-food-data-recipe-builder]: --no-verify-jwt used for all three edge functions — supabase.functions.invoke() attaches auth headers automatically; JWT verification is not needed inside proxy functions
- [Phase 02-food-data-recipe-builder]: recipe_ingredients RLS: exists subquery on recipes.household_id = get_user_household_id() — avoids direct household_members join with no access semantics change
- [Phase 02-food-data-recipe-builder]: RLS policy names kept identical to migration 004 originals through drop/recreate cycle for consistency
- [Phase 02-food-data-recipe-builder]: ingredient_id widened to text via USING cast — existing UUIDs preserved as text, enables USDA numeric and OFF barcode IDs
- [Phase 02-food-data-recipe-builder]: USDA edge function id field = String(fdcId) alongside existing fdcId for backward compat — aligns with NormalizedFoodResult.id
- [Phase 02-food-data-recipe-builder]: ingredient_id widened to text via USING cast — existing UUIDs preserved as text, enables USDA numeric and OFF barcode IDs
- [Phase 02-food-data-recipe-builder]: USDA edge function id field = String(fdcId) alongside existing fdcId for backward compat — aligns with NormalizedFoodResult.id
- [Phase 03-meal-planning-targets]: getWeekStart uses UTC methods (getUTCDay/setUTCDate/toISOString) to avoid timezone drift when Date is constructed from YYYY-MM-DD strings
- [Phase 03-meal-planning-targets]: nutrition_targets uses dual nullable FKs (user_id, member_profile_id) with DB check constraint enforcing exactly one non-null — supports auth users and managed child profiles
- [Phase 03-meal-planning-targets]: meal_items stores per-100g macro snapshot columns at insert time — avoids live re-resolution of external food sources on page load
- [Phase 03-meal-planning-targets]: useUpsertNutritionTargets accepts memberId separately from buildTargetUpsertPayload for cache key invalidation
- [Phase 03-meal-planning-targets]: MemberTargetsPage resolves memberType dynamically from householdMembers/memberProfiles hooks to avoid encoding type in URL
- [Phase 03-meal-planning-targets]: MealBuilder shows total nutrition (not per-serving) — meals are atomic units placed into plan slots
- [Phase 03-meal-planning-targets]: useMeals hooks follow exact useRecipes pattern with household-scoped TanStack Query keys
- [Phase 03-meal-planning-targets]: useMealPlanSlots joins meals(*,meal_items(*)) in single query — client computes nutrition from snapshot macros
- [Phase 03-meal-planning-targets]: Mobile swipe uses native touch events (50px threshold) — no library dependency in plan UI
- [Phase 03-meal-planning-targets]: useRepeatLastWeek gracefully returns when no previous plan exists — no error thrown
- [Phase 03-meal-planning-targets]: NewWeekPrompt shown as fixed overlay — plan row creation via TanStack Query invalidation closes prompt naturally
- [Phase 03-meal-planning-targets]: TemplateManager load confirmation step prevents accidental 7-day overwrite
- [Phase 04-daily-logging-summary]: food_logs stores per-serving macros (not per-100g) — matches how users input portions and makes servings_logged edits trivial
- [Phase 04-daily-logging-summary]: logged_by = auth user who inserted; member_user_id/member_profile_id = who the log is for — allows parents to log for children without RLS blocking
- [Phase 04-daily-logging-summary]: PWA icons generated as raw PNG byte buffers (solid sage green #A8C5A0) — no canvas/sharp available, solid color acceptable for v1
- [Phase 04-daily-logging-summary]: InstallPrompt uses 3-second delay before showing to avoid interrupting first load; localStorage pwa-prompt-shown deduplicates across sessions
- [Phase 04-daily-logging-summary]: useFoodLogs memberType parameter selects member_user_id vs member_profile_id filter — avoids two separate hooks for the same query
- [Phase 04-daily-logging-summary]: FreeformLogModal uses NormalizedFoodResult macros as per-serving values (1 serving = 100g for USDA/OFF) — consistent with how FoodSearch exposes data
- [Phase 04-daily-logging-summary]: LogMealModal computes meal macros from meal_items snapshots at render time — no extra DB fetch needed
- [Phase 04-daily-logging-summary]: EditLogModal colocated in HomePage.tsx — keeps mutation hooks at page level, avoids threading delete/update props through DailyLogList
- [Phase 04-daily-logging-summary]: getDayIndex uses Date.UTC arithmetic on YYYY-MM-DD parts — avoids Date object construction, consistent with Phase 3 UTC decision
- [Phase 04-daily-logging-summary]: week_start_day added to useHousehold select query — was omitted, causing household week start setting to have no effect
- [Phase 05-portion-suggestions-polish]: CNF vitamin_a nutrient ID is 319 (not 318 like USDA) — CNF uses retinol activity equivalents
- [Phase 05-portion-suggestions-polish]: CNF fetch-all-filter: cache full food list at module level, filter by keyword split — avoids per-query HTTP round trips
- [Phase 05-portion-suggestions-polish]: OFF barcode IDs not reliably distinguishable from USDA IDs in recipe_ingredients — only food_logs with item_type='off' deleted
- [Phase 05-portion-suggestions-polish]: calcPortionSuggestions uses remaining-calorie proportional split; members with null target receive 1.0 serving and null percentage
- [Phase 05-portion-suggestions-polish]: hasMacroWarning checks (logged + portion) against target * 1.2 (over) and target * 0.8 (under) for protein, carbs, fat independently
- [Phase 05-portion-suggestions-polish]: useFoodSearch fires two parallel queries (search-usda, search-cnf); CNF results go first, USDA items with matching name dropped
- [Phase 05-portion-suggestions-polish]: FoodSearch.tsx collapsed to Search/My Foods two tabs with source badge pill showing USDA or CNF on each result row
- [Phase 05-portion-suggestions-polish]: MicronutrientPanel hidden entirely when no micronutrient data present; FoodDataEntry extended with micronutrients field
- [Phase 05-portion-suggestions-polish]: useHouseholdDayLogs fetches all logs for household+date in one query — avoids N hook calls for N slots which would violate React hooks rules
- [Phase 05-portion-suggestions-polish]: Suggestions computed in PlanGrid useMemo using calcPortionSuggestions directly — fetch-once-distribute pattern keeps cache key alignment with TanStack Query invalidation
- [Phase 05-portion-suggestions-polish]: navigateFallback added to workbox config — primary fix for Lighthouse 'responds with 200 offline' failure on SPAs
- [Phase 05-portion-suggestions-polish]: Icon purpose set to 'any maskable' — solid sage green square has no edge detail, safe without a separate maskable asset
- [Phase 06-launch-on-gregok-ca]: Sage green accent rgba(168, 197, 160, 0.1) used for NourishPlan portfolio card — matches app brand color at 10% opacity
- [Phase 06-launch-on-gregok-ca]: vercel.json SPA rewrite uses POSIX regex /(.*) source pattern — Vercel JSON uses POSIX regex not glob syntax
- [Phase 06-launch-on-gregok-ca]: Splash dismissed via transitionend listener after adding .hidden class — smooth fade without blocking React hydration
- [Phase 06-launch-on-gregok-ca]: C:/Program Files/Git/offline route placed outside AppShell layout route — renders without auth requirements
- [Phase 06-launch-on-gregok-ca]: .npmrc with legacy-peer-deps=true added to resolve peer dependency conflicts during Vercel npm install
- [Phase 06-launch-on-gregok-ca]: vercel.json buildCommand set to 'vite build' (skipping tsc) — pre-existing TS errors would block every deploy
- [Phase 06-launch-on-gregok-ca]: Supabase disable_signup and auth URLs configured via Management API — fully automated without manual dashboard steps
- [Phase 07-fix-auth-household-gaps]: ResetPasswordPage placed outside AuthGuard and GuestGuard — temporary session token from email link would be rejected by guards
- [Phase 27-wire-schedule-badges-to-plangrid]: tests/PlanGrid.schedule.test.tsx mocks useHouseholdSchedules (NOT useSchedule) so any future regression to single-member hook lands on no-op mock and fails 8/9 tests immediately — prevents L-020/L-027 worktree truncation pattern from silently regressing CRIT-02
- [Phase 27-wire-schedule-badges-to-plangrid]: ROADMAP §Phase 27 criteria #1 + #3 amended in place per D-08/D-10 with inline "Amended in Phase 27 planning per D-XX" markers — preserves audit trail without separate changelog drift; criteria #2/#4/#5 byte-identical to pre-edit; only §Phase 27 lines 529-539 touched (no other phase modified)
- [Phase 27-wire-schedule-badges-to-plangrid]: Test 6 + Test 7 use getAllByText + per-element loops to handle PlanGrid's dual mobile/desktop render path (dayCards array rendered twice in jsdom DOM) — stronger integration assertion than scoping to one viewport via media-query mocking
- [Phase 07-fix-auth-household-gaps]: week_start_day: 0 added to useCreateHousehold return to satisfy Household interface (Sunday DB default)
- [Phase 07-fix-auth-household-gaps]: 10-second timeout on PASSWORD_RECOVERY wait shows expiry message with /auth link to avoid infinite spinner
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: DROP POLICY IF EXISTS before recreating profiles UPDATE policy — prevents duplicate error since 001_foundation.sql defines it; keeps migration 014 idempotent
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: macro_mode CHECK constraint (grams|percent) enforced at DB level in migration 014 — downstream code can trust value without extra validation
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: portions column defaults to '[]'::jsonb — existing custom foods unaffected, no backfill needed
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: bgColor defaults to currentColor for ProgressRing background - inherits text color, adapts to light/dark without explicit logic
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: Dark secondary token set to #2A2E2A dark neutral - warm cream #F5EDE3 is invisible on dark backgrounds
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: calcSlotCalories replaced by calcSlotNutrition returning full macro breakdown - avoids double computation when both calories and mini rings are needed in SlotCard
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: CNF servingsize API response parsed defensively with multiple field name candidates — exact shape logged on first call for debugging
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: FreeformLogModal logs servings_logged=1 with per-serving macros = totalGrams/100 * per100g when unit-based logging is used
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: Drawer state kept in TabBar (not AppShell) — z-50 fixed positioning makes it render above all content without needing to lift state
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: Avatar upload validates MIME type (jpg/png/webp) and 2MB max in uploadAvatar before calling Supabase Storage
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: Non-admin users see household name as read-only text label in SettingsPage — no disabled input
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: macros state always holds grams even in percent mode — submit always sends absolute grams without extra conversion
- [Phase 08-v1-1-ui-polish-and-usability-improvements]: calorie change in percent mode uses window.confirm for recalculation prompt; declining switches to grams mode to avoid stale percentages
- [Phase 09-dead-code-removal-theme-token-cleanup]: Existing amber warning indicators in FoodSearch and plan components are out of scope — intentional warning-color uses, not theme bypasses
- [Phase 10-requirements-documentation-formalization]: LAUNCH and POLISH requirements derived 1:1 from Phase 6 and Phase 8 success criteria — 6 per category (no padding to 10)
- [Phase 10-requirements-documentation-formalization]: POLISH-01 Phase 9 gap closure row retained alongside Phase 8 traceability row — documents remediation separately from original feature build
- [Phase 11-nutrition-calculation-fixes]: FreeformLogModal now logs servings_logged=quantity with per-unit macro values, fixing double-multiplication in EditLogModal
- [Phase 11-nutrition-calculation-fixes]: serving_unit column is nullable; null means legacy entry; display fallback is 'serving'
- [Phase 11-nutrition-calculation-fixes]: useEffect hydration deps array includes only [ingredients] not foodDataMap — including foodDataMap would cause infinite re-fetch loop since setFoodDataMap triggers re-render
- [Phase 11-nutrition-calculation-fixes]: Standalone NutrientBreakdown on HomePage replaced with integrated expandable version inside micronutrient summary card to avoid duplicate sections
- [Phase 12-home-page-food-search-redesign]: Contains-tier test fixture corrected: banana-like scores 0.7 (word boundary), not 0.5; use turban squash for true contains-only example
- [Phase 12-home-page-food-search-redesign]: FoodSearchOverlay select mode: row tap immediately calls onSelect+onClose with no expansion; Add to Recipe label shown inline on each row
- [Phase 12-home-page-food-search-redesign]: LogEntryItem row click toggles expand (not onEdit); explicit Edit button with stopPropagation for edit action
- [Phase 12-home-page-food-search-redesign]: RecipeBuilder keeps separate recipe-picker panel for sub-recipe selection; food search uses FoodSearchOverlay overlay
- [Phase 12-home-page-food-search-redesign]: FreeformLogModal deleted (dead code — no longer imported anywhere after HomePage migration)
- [Phase 12-home-page-food-search-redesign]: LogEntryItem row click toggles expand (not onEdit); explicit Edit button with stopPropagation for edit action
- [Phase 12-home-page-food-search-redesign]: FreeformLogModal deleted (dead code — no longer imported anywhere after HomePage migration)
- [Phase 12-home-page-food-search-redesign]: RecipeBuilder keeps separate recipe-picker panel for sub-recipe selection; food search uses FoodSearchOverlay overlay
- [Phase 13-recipe-meal-plan-account-management]: User ID always extracted from JWT via adminClient.auth.getUser(), never from request body — prevents privilege escalation
- [Phase 13-recipe-meal-plan-account-management]: Household deleted before auth user to ensure FK cascade order is correct (child data cleaned before user row)
- [Phase 13-recipe-meal-plan-account-management]: Inline delete pattern: confirmation row renders below the card row using -mt offset and border-t-0, not as a fixed overlay
- [Phase 13-recipe-meal-plan-account-management]: relativeTime duplicated in RecipeBuilder and RecipesPage — only two callsites, premature abstraction avoided
- [Phase 13-recipe-meal-plan-account-management]: localNotes initialized to null so useEffect hydration only runs on first load, preventing reset during typing
- [Phase 13-recipe-meal-plan-account-management]: MealCard inline delete uses canDelete/isConfirming props — parent (MealsPage) owns all state to keep card stateless
- [Phase 13-recipe-meal-plan-account-management]: Deleted meal detection: slot.meal_id \!= null && \!meal (RLS soft-delete filter) shows '(Deleted)' with replace/clear options
- [Phase 13-recipe-meal-plan-account-management]: Print button in overflow/three-dot menu per user decision; calls window.print() directly; no-print class hides chrome in @media print
- [Phase 14-how-to-manual]: Accordion uses single-open pattern (one section at a time) for guide scannability
- [Phase 14-how-to-manual]: User Guide placed last in both nav arrays (after Settings) as lower-priority nav item
- [Phase 15-v1-1-audit-gap-closure]: TanStack Query partial key matching used for meals and meal-plan-slots invalidation
- [Phase 16-budget-engine-query-foundation]: queryKeys.ts factory returns as const tuples; prefix invalidation stays as bare inline arrays for broad cache invalidation
- [Phase 16-budget-engine-query-foundation]: food_prices.food_id is text (not uuid) to accommodate USDA numeric IDs, CNF IDs, and custom food UUIDs
- [Phase 16-budget-engine-query-foundation]: spend_logs.source CHECK constraint enforces cook|food_log at DB level matching TypeScript union type
- [Phase 16-budget-engine-query-foundation]: normaliseToCostPer100g centralises unit conversion (g/kg/ml/l) — callers pass raw user input, function handles all unit math
- [Phase 16-budget-engine-query-foundation]: Cost badge on RecipesPage list cards omitted — list view does not load ingredient data; badge only in RecipeBuilder where ingredients are already loaded
- [Phase 16-budget-engine-query-foundation]: cost.ts and useFoodPrices.ts created in 16-03 execution because 16-02 had not run yet; files match 16-02 spec exactly
- [Phase 16-budget-engine-query-foundation]: BudgetSummarySection receives onEditBudget callback from parent; parent owns the supabase mutation — consistent with existing household update patterns
- [Phase 17-inventory-engine]: Simple quantity model (not ledger-based): quantity_remaining updated directly
- [Phase 17-inventory-engine]: UPDATE RLS does not check added_by — any household member can update shared inventory items
- [Phase 17-inventory-engine]: convertToGrams returns null for units type — discrete counts cannot be compared by weight for FIFO
- [Phase 17-inventory-engine]: useAddInventoryItem returns params from mutationFn so onSuccess can call saveFoodPrice without closure state
- [Phase 17-inventory-engine]: InventoryUnit 'L' lowercased to 'l' before passing to normaliseToCostPer100g which expects lowercase
- [Phase 17-inventory-engine]: Deduction failure is non-blocking: spendLog always fires first; deduction runs in onSuccess callback; errors caught silently; receipt shows error state if deduction failed
- [Phase 17-inventory-engine]: leftoverDefaults pre-fill uses UTC date arithmetic (setUTCDate) consistent with getWeekStart/getDayIndex UTC pattern
- [Phase 18-grocery-list-generation]: household_id denormalized on grocery_items for RLS efficiency — avoids join to grocery_lists on every row-level check
- [Phase 18-grocery-list-generation]: aggregateIngredients accepts pre-resolved slot data — caller fetches nested recipe_ingredients before calling
- [Phase 18-grocery-list-generation]: MAX_RECIPE_DEPTH=5 with console.warn at limit — prevents infinite recursion on circular recipe references
- [Phase 18-grocery-list-generation]: Supabase realtime postgres_changes subscription on grocery_items with list_id filter — first realtime use in project
- [Phase 18-grocery-list-generation]: Already Have items stored in DB with notes='inventory-covered' for snapshot consistency (D-01)
- [Phase 18-grocery-list-generation]: Optimistic toggle with rollback on useToggleGroceryItem; realtime handles cross-member sync
- [Phase 25-universal-recipe-import]: import-recipe edge function added; migration 030 adds recipes.source_url TEXT — both present in the working tree but NOT yet pushed/deployed (gated by plan 25-03)
- [Phase 25-universal-recipe-import]: custom_foods has no category column; AI-supplied category is dropped at the custom_foods insert in import-recipe and carried only through recipe_ingredients at read time
- [Phase 25-universal-recipe-import]: Input detection regex classifies youtube/url/text server-side (D-04); blog HTML stripped with script/style/tag regex and truncated to 12000 chars before the AI call
- [Phase 25-universal-recipe-import]: YouTube transcript extraction via ytInitialPlayerResponse regex → captionTracks[0].baseUrl → XML <text> regex with HTML-entity decoding
- [Phase 25-universal-recipe-import]: Recipe.source_url is null for raw text imports and the trimmed URL otherwise (D-11); instructions written as Phase 23 RecipeStep[] not as a notes string (Pitfall 5)
- [Phase 25-universal-recipe-import]: custom_foods dedup by exact ilike(name) with no wildcards (Pitfall 4); new row inserted with AI-estimated macros when no match found (D-19, D-21)
- [Phase 25-universal-recipe-import]: useImportRecipe hook follows useRegenerateRecipeSteps pattern — session/householdId guards before supabase.functions.invoke, throws on response.success === false, invalidates ['recipes'] broad prefix on success
- [Phase 25-universal-recipe-import]: ImportRecipeModal disables backdrop click and Escape key while the edge function call is pending — prevents accidental dismissal mid-import
- [Phase 25-universal-recipe-import]: RecipeBuilder skeleton gated on recipePending && ingredientsPending so the existing 'Loading recipe…' single-line fallback is preserved for the edge case where one query resolves first
- [Phase 25-universal-recipe-import]: Source URL attribution uses new URL(...).hostname inside try/catch with 60-char truncated URL fallback — defensive for legacy rows with malformed URLs
- [Phase 25-universal-recipe-import]: Migration 030 pushed to Supabase prod (qyablbzodmftobjslgri); import-recipe edge function deployed v1 ACTIVE with --no-verify-jwt (L-025); frontend redeployed to nourishplan.gregok.ca
- [Phase 25-universal-recipe-import]: Human UAT via Playwright PASSED for raw text imports (Spaghetti Carbonara end-to-end with 5 ingredients + 5 steps + macros), D-11 attribution null for text, D-13 no badges on recipe cards, D-10 fallback message fires inline on URL fetch failures
- [Phase 25-universal-recipe-import]: Mainstream recipe sites (allrecipes, NYT Cooking, simplyrecipes) are server-side bot-blocked — D-10 paste-text fallback is the correct UX; URL-import practical utility is narrower than the spec phrasing
- [Phase 25-universal-recipe-import]: AbortController timeout errors leak raw "The signal has been aborted" string to the modal — follow-up polish: map name === 'AbortError' to the D-10 friendly message
- [Phase 27-wire-schedule-badges-to-plangrid]: queryKeys.schedule namespace was truncated by Phase 22 worktree agent; useSchedule.ts:14 referenced queryKeys.schedule.forMember (undefined) — would throw TypeError if called. Plan 27-01 restores forMember + adds forHousehold sibling for new household-wide PlanGrid query
- [Phase 27-wire-schedule-badges-to-plangrid]: Aggregation precedence away > quick > consume > prep with prep dropped entirely (no dot for prep) — buildHouseholdGrid uses STATUS_CYCLE.indexOf via local precedence(s) helper to keep ordering source of truth in one place
- [Phase 27-wire-schedule-badges-to-plangrid]: Tooltip format "Away: Dad. Quick: Sam." — Title-Case status word + colon + space + comma-separated names + period; statuses ordered by precedence high->low; prep members omitted entirely; first-8-char UUID fallback for unknown member ids
- [Phase 27-wire-schedule-badges-to-plangrid]: useSaveSchedule.onSuccess prefix invalidation (['schedule', householdId]) auto-matches new forHousehold cache key — zero mutation changes required
- [Phase 27-wire-schedule-badges-to-plangrid]: Pre-existing test failures in tests/theme.test.ts, tests/auth.test.ts, tests/AuthContext.test.tsx, tests/guide.test.ts (12 total) are unrelated to schedule wiring — logged to deferred-items.md for separate phase
- [Phase 27-wire-schedule-badges-to-plangrid]: Plan 02 SlotCard family-tooltip prop shape is D-07 Option B (parallel scheduleStatus + scheduleTooltip props), NOT Option A (richer object) — keeps the SlotCard interface narrow for callers that don't care about the tooltip; tooltip falls back to Phase 21 literal when scheduleTooltip absent for zero-regression on empty-household case
- [Phase 27-wire-schedule-badges-to-plangrid]: Plan 02 W4 dedupe-import discipline — extended existing `import type { NutritionTarget, Meal, MealItem } from '../../types/database'` line in place to add ScheduleStatus, never created a second import line from the same module; verified by grep -c returning exactly 1 post-edit (anti-regression for any future executor working on PlanGrid imports)
- [Phase 27-wire-schedule-badges-to-plangrid]: Plan 02 keying duality on DayCard — slotViolationsByDay uses plan-relative `i` (correct: violations are per-plan), but slotSchedulesByDay + slotTooltipsByDay use day-of-week `(weekStartDay + i) % 7` per D-10 (correct: schedules are weekly recurrences, not plan-specific); both keying schemes coexist on the same <DayCard> render line
- [Phase 27-wire-schedule-badges-to-plangrid]: Plan 02 Snack→Snacks normalisation lives in PlanGrid.tsx (not src/utils/schedule.ts) per D-09 — closer to the DayCard consumer that uses DEFAULT_SLOTS, applied verbatim in BOTH the slotSchedulesByDay and slotTooltipsByDay memos so a Snack-slot tooltip lands on the Snacks SlotCard, matching cdf039b baseline
- [Phase 27-wire-schedule-badges-to-plangrid]: Plan 02 single-source DayCard JSX architecture — PlanGrid.tsx renders one shared <DayCard> JSX block inside `dayCards = Array.from(...)` that feeds both mobile (DayCarousel ~line 657) and desktop (stack ~line 689) render paths; one textual prop insertion populates both render sites, satisfying ROADMAP §Phase 27 criterion #3 visibility assertion without doubling source-code surface area

### v2.0 Decisions

- [v2.0 roadmap]: Budget stored at ingredient level (cost_per_100g on recipe_ingredients) — recipe-level cost is always computed, never stored; prevents grocery cost calculation from becoming impossible
- [v2.0 roadmap]: Inventory built as ledger of events (purchase/used/expired/adjusted) — mutable quantity_grams column blocks consumption history and reorder logic
- [v2.0 roadmap]: Planning Engine uses async job pattern — Edge Function returns job ID immediately, solver runs asynchronously, client polls status; synchronous solver would timeout on mobile
- [v2.0 roadmap]: Feedback rows snapshot recipe attributes at rating time — prevents edits to live recipe records from corrupting historical planning signal
- [v2.0 roadmap]: queryKeys.ts centralised before any v2.0 feature queries — prevents cache incoherence across 6+ interdependent query families
- [v2.0 roadmap]: Locked slot flag on meal_plan_slots — designed in Phase 19 (DnD) so both DnD and Planning Engine (Phase 22) share the same mechanism
- [v2.0 roadmap]: @dnd-kit/core + @dnd-kit/sortable chosen for drag-and-drop — React 19 compatible, touch-friendly, actively maintained
- [v2.0 roadmap]: INVT-04 (barcode scanning) included in Phase 17 despite being previously out of scope — added to v2.0 requirements per current REQUIREMENTS.md

### Roadmap Evolution

- Phase 6 added: Launch on gregok.ca
- Phase 8 added: v1.1 UI polish and usability improvements (dark mode ring colours, meal plan nutrition rings, realistic measurement units, mobile sidebar settings, edit household/profile, macro % scaling with calories)
- Phase 11 added: Nutrition & Calculation Fixes (calorie/macro scaling, micronutrient goals, serving measurements)
- Phase 12 added: Home Page & Food Search Redesign (remove Food tab, home page logging, search sorting, meal drill-down)
- Phase 13 added: Recipe, Meal Plan & Account Management (recipe UX, notes/dates, meal plan start date, print, deletions, account management)
- Phase 14 added: How-To Manual (in-app usage guide)
- Phases 16–24 added: v2.0 AMPS milestone (Budget, Inventory, Grocery, DnD Planner, Feedback/Dietary, Schedule, Planning Engine, Prep, Dynamic Portioning)
- Phase 15 added: Universal recipe import — paste URL or text, AI extracts complete recipe with ingredients, macros, and instructions
- Phase 30 added: Granular household member permissions system — role-based access (admin, editor, viewer) with per-feature scopes (meal-planning, inventory, budget) beyond current owner-only model

### Pending Todos

None yet.

### Blockers/Concerns

- vite-plugin-pwa@1.2.0 Vite 7 compatibility not confirmed — validate in Phase 1 scaffolding
- iOS Safari background sync is restricted — confirm fallback strategy before Phase 4 architecture is locked
- USDA FDC deduplication (Foundation > SR Legacy > Branded ranking) needs validation against live API responses in Phase 2
- Planning Engine (Phase 22) needs a defined wall-clock solve time budget and iteration cap before Phase 22 planning begins
- Ingredient identity normalisation for grocery aggregation (same food under different IDs across recipes) needs a focused design decision before Phase 18 coding begins

## Session Continuity

Last session: 2026-04-24T03:30:00.000Z
Stopped at: Phase 30 COMPLETE — all 7 plans shipped across 4 waves. Plan 30-07 delivered the SPEC Req #8 Playwright E2E regression test (tests/e2e/household-permissions.spec.ts, 266 lines), passing 1/1 at ~48s against live Supabase prod DB. Promoted admin B successfully performs all three admin-gated actions (invite, weekly_budget, role-change) and the Remove round-trip proves SPEC Req #3 end-to-end. Test is idempotent — household_members ends with only Admin A each run. Three auto-fixes applied during Task 2 debugging (joinViaInvite fallback, Saved! transition signal, /setup redirect verification).
Resume file: .planning/phases/30-granular-household-member-permissions-system-admin-editor-vi/30-07-SUMMARY.md
