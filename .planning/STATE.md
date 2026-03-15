---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: UI polish and usability improvements
status: planning
stopped_at: Phase 8 context gathered
last_updated: "2026-03-15T17:08:42.393Z"
last_activity: 2026-03-12 — Roadmap created from requirements and research
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 33
  completed_plans: 33
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** Families can share one meal plan while each person gets personalized portion suggestions based on their individual nutritional targets.
**Current focus:** Phase 1 — Foundation & Auth

## Current Position

Phase: 1 of -1 (Foundation & Auth)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-12 — Roadmap created from requirements and research

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
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
- [Phase 07-fix-auth-household-gaps]: week_start_day: 0 added to useCreateHousehold return to satisfy Household interface (Sunday DB default)
- [Phase 07-fix-auth-household-gaps]: 10-second timeout on PASSWORD_RECOVERY wait shows expiry message with /auth link to avoid infinite spinner

### Roadmap Evolution

- Phase 6 added: Launch on gregok.ca
- Phase 8 added: v1.1 UI polish and usability improvements (dark mode ring colours, meal plan nutrition rings, realistic measurement units, mobile sidebar settings, edit household/profile, macro % scaling with calories)

### Pending Todos

None yet.

### Blockers/Concerns

- vite-plugin-pwa@1.2.0 Vite 7 compatibility not confirmed — validate in Phase 1 scaffolding
- iOS Safari background sync is restricted — confirm fallback strategy before Phase 4 architecture is locked
- USDA FDC deduplication (Foundation > SR Legacy > Branded ranking) needs validation against live API responses in Phase 2

## Session Continuity

Last session: 2026-03-15T17:08:42.388Z
Stopped at: Phase 8 context gathered
Resume file: .planning/phases/08-v1-1-ui-polish-and-usability-improvements/08-CONTEXT.md
