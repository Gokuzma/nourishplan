---
phase: 02-food-data-recipe-builder
plan: 07
subsystem: infra
tags: [supabase, edge-functions, deployment, usda, open-food-facts, anthropic]

# Dependency graph
requires:
  - phase: 02-food-data-recipe-builder
    provides: search-usda, search-off, verify-nutrition edge function source code
provides:
  - Deployment script for all three food search edge functions
  - Instructions for setting USDA_API_KEY and ANTHROPIC_API_KEY secrets
affects: [food-search, recipe-builder, nutrition-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge functions deployed with --no-verify-jwt flag — React client handles auth headers via supabase.functions.invoke()"

key-files:
  created:
    - scripts/deploy-edge-functions.sh
  modified: []

key-decisions:
  - "--no-verify-jwt used for all three edge functions — supabase.functions.invoke() attaches auth headers automatically; JWT verification is not needed inside the function"

patterns-established:
  - "Deployment script pattern: guard for CLI presence, deploy all functions, print secret setup reminders"

requirements-completed: [FOOD-01, FOOD-02, FOOD-05, FOOD-06, RECP-02]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 2 Plan 7: Edge Function Deployment Summary

**Deployment script for search-usda, search-off, and verify-nutrition edge functions with secret setup reminders**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-13T09:13:43Z
- **Completed:** 2026-03-13T09:18:00Z
- **Tasks:** 1 of 2 automated (Task 2 is human-action: deploy via Supabase CLI)
- **Files modified:** 1

## Accomplishments
- Created `scripts/deploy-edge-functions.sh` with guards and deploy commands for all three edge functions
- Documented secret setup steps (USDA_API_KEY, ANTHROPIC_API_KEY) in the script output
- Awaiting user to run the script against their linked Supabase project

## Task Commits

Each task was committed atomically:

1. **Task 1: Create edge function deployment script** - `152ecae` (chore)
2. **Task 2: Deploy edge functions and apply RLS migration** - PENDING (human-action checkpoint)

## Files Created/Modified
- `scripts/deploy-edge-functions.sh` - Deploys search-usda, search-off, verify-nutrition with --no-verify-jwt and prints secret setup reminders

## Decisions Made
- `--no-verify-jwt` flag used on all three functions because the React client calls them via `supabase.functions.invoke()`, which automatically attaches the user's auth token. The functions act as API proxies and do not need to independently verify JWTs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

The following manual steps are required before food search works end-to-end:

1. Ensure Supabase CLI is installed: https://supabase.com/docs/guides/cli/getting-started
2. Link project: `supabase link --project-ref <your-project-ref>`
3. Set secrets:
   - `supabase secrets set USDA_API_KEY=your_key_here` (get from https://fdc.nal.usda.gov/api-key-signup/)
   - `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (from Anthropic Console -> API Keys)
4. Apply RLS fix migration (plan 02-06): run `006_fix_food_recipe_rls.sql` via Supabase Dashboard SQL Editor
5. Deploy edge functions: `bash scripts/deploy-edge-functions.sh`
6. Verify: navigate to /foods, search "chicken" in USDA tab, confirm results appear

## Next Phase Readiness
- Once user completes Task 2 deployment steps, food search (USDA + OFF tabs), AI nutrition verification, and custom food CRUD will be fully operational
- UAT tests 2-21 are unblocked after deployment

---
*Phase: 02-food-data-recipe-builder*
*Completed: 2026-03-13*
