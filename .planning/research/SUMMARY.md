# Project Research Summary

**Project:** NourishPlan
**Domain:** Family meal planning / calorie and nutrition tracking PWA
**Researched:** 2026-03-12
**Confidence:** HIGH (stack and features), MEDIUM (architecture)

## Executive Summary

NourishPlan is a mobile-first family meal planning and nutrition tracking PWA. The core technical challenge is not building a calorie tracker — that is well-solved — but building one with a household model where a shared meal plan serves multiple people with different nutrition targets and portion needs. No major competitor (MyFitnessPal, Cronometer, Mealime) solves this. The recommended approach is a Vite + React 19 SPA backed by Supabase (Postgres), with TanStack Query handling server state and a server-side USDA FoodData Central proxy handling external data. The full food hierarchy (Foods → Recipes → Meals → MealPlans) must be designed correctly from the first schema migration; retrofitting it post-launch is a rewrite.

The most important architectural decision is the data model. Three patterns are non-negotiable and must be in place before any feature UI is built: (1) nutrition values normalized to per-100g at ingest, (2) recipe ingredients supporting both foods and sub-recipes with cycle detection, and (3) meal plan templates distinguished from meal plan instances so historical logs are never mutated. All three have HIGH recovery costs if skipped. The household scoping model — every domain entity carrying a `household_id`, enforced with Postgres Row-Level Security — is the fourth structural requirement and is also difficult to retrofit cleanly.

The biggest risks are all in Phase 1. If the food hierarchy schema is built correctly, all subsequent features (recipe builder, meal planning, per-person portions, daily logs) become straightforward implementations of well-understood CRUD patterns. If it is not, each subsequent feature will require backfilling the foundational gaps under increasing pressure.

## Key Findings

### Recommended Stack

A fully client-rendered SPA using Vite 7 + React 19 is the right choice. Next.js adds SSR complexity with no benefit for an app that lives entirely behind auth. React 19's Compiler eliminates manual memoization boilerplate, which matters for the recipe builder's live nutrition recalculation. Supabase provides Postgres (correct for the relational food hierarchy), auth, and real-time subscriptions in a single hosted service within free tier limits (500 MB DB, 50k MAUs). TanStack Query v5 handles all USDA API calls and Supabase data fetching with stale-while-revalidate and offline queue; Zustand holds UI-local state (active meal plan selection, portion drafts).

One version compatibility note: `vite-plugin-pwa@1.2.0` has not confirmed Vite 7 compatibility — test on upgrade.

**Core technologies:**
- React 19 + Vite 7: UI framework + build tool — fastest HMR, PWA integration via `vite-plugin-pwa`, Compiler removes manual memoization
- TypeScript 5 + Zod 3: Type safety — one Zod schema validates both form input and API response shape
- Tailwind CSS 4: Styling — CSS-first config, built-in container queries, 5x faster builds
- Supabase (Postgres): Backend — relational data model required for food hierarchy; auth, RLS, and real-time included
- TanStack Query 5: Server state — handles USDA caching, background refetch, offline queue automatically
- React Hook Form 7: Form handling — uncontrolled components critical for large nested recipe ingredient forms

### Expected Features

The feature dependency chain is strict: Food database must ship before Recipe Builder, Recipe Builder before Meals, Meals before Meal Plans, and Household auth before any sharing. Per-person portion suggestions require both personal targets AND recipe nutrition to be working. Do not short-circuit this dependency chain.

**Must have (table stakes):**
- USDA food search + manual custom food entry — data layer everything else builds on
- Recipe builder with auto-calculated nutrition — the engine all meal planning sits on
- Meal and meal plan creation (full hierarchy) — core planning workflow
- Per-person nutrition targets (calories + P/C/F) — makes the app personalized
- Daily nutrition log per person with portion override — completes the track → review loop
- Daily summary view per person — closes the feedback loop
- Household / family sharing with member model — the primary differentiator; no competitor offers this
- Mobile-first PWA (installable, offline-capable) — primary use is on phones in the kitchen

**Should have (competitive differentiators):**
- Per-person portion suggestions per dish — solves the real family problem; requires targets + recipe nutrition first
- Nested recipes (recipe-as-ingredient) — enables realistic home cooking; most apps don't support this
- Micronutrient display (progressive disclosure) — expose after core macro tracking is validated
- Weekly meal plan templates (save and reuse) — add once families have built and used their first plan

**Defer (v2+):**
- Grocery list generation — requires ingredient → purchase unit mapping; architecturally complex
- Barcode scanning — camera API + third-party barcode DB; USDA search covers most cases
- Weekly nutrition reports / history charts — only useful after 2-4 weeks of logged data
- AI meal plan generation — requires preference accumulation; zero signal on day one

### Architecture Approach

The architecture has three tiers: a Vite SPA client (feature modules colocated under `src/features/`), a Supabase backend (Postgres with RLS, Auth, real-time), and a server-side USDA FDC proxy (caches responses by FDC ID, keeps the API key off the client). The critical shared piece is the `src/shared/nutrition/` module — the recursive roll-up function that computes recipe nutrition from ingredients — which is consumed by the recipe builder, meal plan view, and daily summary. It must be extracted as pure computation from the start. Nutrition is computed at write time and cached on the recipe row; dashboard reads then become cheap aggregations.

**Major components:**
1. Food Search + Custom Entry — USDA proxy integration, deduplication, per-100g normalization at ingest
2. Recipe Builder — ingredient editor, nested recipe support, live nutrition preview, raw/cooked weight toggle
3. Meal Planner — weekly calendar grid, meal slot assignment, household-shared view
4. Portion Logger — per-member log entry, portion override, optimistic UI, offline queue via service worker
5. Nutrition Dashboard — per-person daily summary, calories + macros vs targets, progressive micronutrient disclosure
6. Auth + Household System — household creation, member invites, roles (Admin/Member/Child), Postgres RLS enforcement

### Critical Pitfalls

1. **Nutrition not normalized to per-100g at ingest** — USDA returns per-serving for Branded Foods and per-100g for Foundation Foods; storing as-is produces silently wrong recipe math. Normalize to per-100g on ingest, convert to serving sizes in the presentation layer only. Recovery cost is HIGH.

2. **Food hierarchy schema without nested recipe support** — designing `recipe_ingredients` with a direct FK to `foods` only forces a schema rewrite when nested recipes are added. Use a polymorphic ingredient table (`source_food_id | source_recipe_id`) with cycle detection from the first migration. Recovery cost is HIGH.

3. **Template/instance not distinguished in meal plans** — mutating a template corrupts historical log entries because logs reference meal nutrition that has changed. Snapshot templates into instances on assignment; logs store nutrient values at log time. Recovery cost is HIGH.

4. **Household isolation at application layer only** — a missing WHERE clause leaks personal health data across households. Enforce with Postgres RLS policies in addition to application-layer checks; use UUIDs for all public-facing IDs; scope custom foods to `household_id`. Recovery cost is MEDIUM but the privacy risk is HIGH.

5. **Cooked vs raw weight ambiguity in recipes** — USDA lists most meats raw; users measure cooked weight; calorie counts run 20-40% low for protein-heavy recipes. Add a `weight_state` (raw/cooked) field on recipe ingredients and prompt users to specify. Recovery cost is MEDIUM.

## Implications for Roadmap

The research makes the phase ordering clear. The entire feature set is blocked on a correct data model. Build the foundation first, validate the hierarchy works, then layer features on top.

### Phase 1: Data Foundation and Auth

**Rationale:** Every feature in the app is blocked on the food hierarchy schema and household auth. These two pieces must be correct before any feature UI has value. Building them first also forces confrontation with the three HIGH-recovery pitfalls (per-100g normalization, nested recipe support, template/instance distinction) before any technical debt accumulates.

**Delivers:** Working Supabase schema with all domain tables, Postgres RLS policies, household creation and member invite flow, USDA FDC proxy with per-100g normalization and FDC ID caching.

**Addresses:** Household auth (table stakes), USDA food search foundation, custom food entry scaffolding.

**Avoids:** Flat user model without household scoping, nutrition not normalized to per-100g, template/instance mutation, household isolation at app layer only.

### Phase 2: Food Search and Recipe Builder

**Rationale:** The recipe builder is the engine everything else depends on. It cannot be built meaningfully without the data foundation from Phase 1. Nested recipe support must be included here — adding it after recipe creation is in production requires a schema migration.

**Delivers:** USDA food search UI (with deduplication and data type filtering), custom food entry form, recipe builder with ingredient editor, nested recipe support, raw/cooked weight toggle, live nutrition calculation using shared `nutrition/` module.

**Addresses:** Food database search, manual custom food entry, recipe builder with auto-calculated nutrition.

**Avoids:** Computing nutrition at read time, fetching full food objects for ingredient lists, nested recipe support deferred to after recipe UI ships, cooked vs raw weight ambiguity.

### Phase 3: Meal Planning

**Rationale:** Meal planning is the core user-facing promise but requires a working recipe library to populate it. Phase 2's recipe builder is the prerequisite.

**Delivers:** Weekly meal plan calendar grid, meal slot assignment (Foods/Recipes → Meals → Meal Plans), household-shared meal plan view, personal nutrition targets (calories + P/C/F per member).

**Addresses:** Weekly meal plan view, personal nutrition targets, meal + meal plan creation.

**Avoids:** Meals without recipe dependency verified, meal plan template mutation.

### Phase 4: Logging and Daily Summary

**Rationale:** Logging closes the feedback loop but requires meal plans (Phase 3) to have something to log against. Per-person targets from Phase 3 are also required for the daily summary to show meaningful progress.

**Delivers:** Per-member daily nutrition log with portion override, offline log queue via service worker + background sync, daily summary view (calories + macros vs targets), optimistic UI for log entries.

**Addresses:** Daily nutrition log per person, portion override, daily summary view, mobile-first PWA installability.

**Avoids:** Logging blocking on connectivity (service worker offline queue required), daily summary without personal targets.

### Phase 5: Per-Person Portion Suggestions and PWA Polish

**Rationale:** Portion suggestions require both personal targets (Phase 3) and recipe nutrition (Phase 2) to be production-stable before the suggestion math is trustworthy. PWA polish (Lighthouse audit, manifest, offline fallback) is the final step before any user-facing release.

**Delivers:** Per-dish portion suggestions per household member, household role system (Admin/Member/Child access levels), Lighthouse PWA audit pass, micronutrient display (progressive disclosure), weekly plan templates (save and reuse).

**Addresses:** Per-person portion suggestions, household roles, PWA installability audit.

**Avoids:** Per-person portion operating at meal level instead of per-dish level, PWA installability not verified before launch.

### Phase Ordering Rationale

- Schema work is front-loaded because the three HIGH-recovery pitfalls are all data model decisions that become painful to fix once UI and user data exist on top of them.
- The USDA proxy is built in Phase 1 (data layer) not Phase 2 (UI layer) because per-100g normalization happens at ingest and the proxy owns that boundary.
- Logging is placed after meal planning because the daily log references meal plan structure; building logging before planning produces orphaned log entries.
- Portion suggestions are last because they are the most algorithmically complex feature and require the most stable underlying data to produce trustworthy output.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Data Foundation):** Supabase RLS policy design for the household model and the polymorphic `recipe_ingredients` schema both benefit from reviewing official Supabase RLS documentation before writing migrations.
- **Phase 4 (Logging):** Service worker background sync with Workbox's `BackgroundSyncPlugin` has edge cases on iOS Safari (background sync is restricted); needs validation against current browser support tables before committing to the offline log queue pattern.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Food Search / Recipe Builder):** CRUD forms with live calculation — well-documented React Hook Form + TanStack Query patterns apply directly.
- **Phase 3 (Meal Planning):** Calendar grid and meal slot CRUD — no unusual patterns; standard relational data with React component composition.
- **Phase 5 (PWA Polish):** Lighthouse audit requirements and `vite-plugin-pwa` configuration are well-documented; follow official Workbox recipes.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified via official release notes and npm; one compatibility note on vite-plugin-pwa + Vite 7 to validate |
| Features | HIGH | Competitive analysis from live apps, USDA API confirmed, dependency chain verified |
| Architecture | MEDIUM | Structural patterns are sound and cross-referenced; specific Supabase RLS policy syntax and Workbox background sync behavior on iOS need validation during implementation |
| Pitfalls | HIGH | Critical pitfalls verified across multiple sources; recovery costs confirmed by community post-mortems |

**Overall confidence:** HIGH

### Gaps to Address

- **vite-plugin-pwa@1.2.0 + Vite 7 compatibility:** The plugin's latest release notes do not explicitly confirm Vite 7 support. Validate this in Phase 1 scaffolding before committing to the toolchain.
- **iOS background sync limitations:** The service worker offline log queue pattern relies on the Background Sync API, which has restricted behavior in iOS Safari. Confirm current browser support and define a fallback (e.g., retry on app foreground) before Phase 4 architecture is locked.
- **USDA FDC data type filtering in search results:** The deduplication strategy (Foundation > SR Legacy > Branded for generic foods; Branded for packaged items) needs implementation testing against live USDA search responses to confirm ranking is achievable with the current API's response structure.

## Sources

### Primary (HIGH confidence)
- https://vite.dev/blog/announcing-vite7 — Vite 7 release
- https://react.dev/blog/2025/10/01/react-19-2 — React 19.2 Compiler details
- https://tailwindcss.com/blog/tailwindcss-v4 — Tailwind v4 CSS-first config
- https://fdc.nal.usda.gov/api-guide/ — USDA FoodData Central API capabilities and rate limits
- https://supabase.com/pricing — Supabase free tier confirmed
- https://www.npmjs.com/package/@tanstack/react-query — TanStack Query v5.90.x
- https://github.com/pmndrs/zustand/releases — Zustand v5.0.x
- https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html — household isolation requirements

### Secondary (MEDIUM confidence)
- https://chankapure.medium.com/designing-a-database-schema-for-diet-services-a-guide-347637b3662f — food hierarchy schema patterns
- https://medium.com/pgs-software/how-to-build-offline-first-progressive-web-apps-pwas-with-react-redux-7d58553e70 — offline-first PWA patterns
- https://forums.cronometer.com/discussion/182/new-recipe-raw-ingredient-weight-versus-cooked-serving-weight — cooked vs raw weight user reports
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation — service worker background sync

### Tertiary (LOW confidence — validate during implementation)
- https://www.npmjs.com/package/vite-plugin-pwa — Vite 7 compatibility not yet confirmed in release notes
- https://web.dev/learn/pwa/offline-data — iOS background sync behavior (may be outdated)

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*
