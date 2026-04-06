# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — UI polish and usability improvements

**Shipped:** 2026-04-05
**Phases:** 14 | **Plans:** 50 | **Tasks:** 72

### What Was Built
- Full-stack nutrition app: auth, household management, food search (USDA+CNF), recipe builder, meal planning, daily logging
- Dark mode with theme tokens, mini nutrition rings, mobile drawer navigation
- Home page food search redesign with fuzzy scoring, micronutrient drill-down
- Recipe notes/dates, meal plan start date picker, print support, inline deletion
- Account deletion with Edge Function, admin transfer, danger zone UI
- In-app how-to user guide with accordion sections and deep-link navigation
- Deployed as PWA at nourishplan.gregok.ca with invite-only auth

### What Worked
- Phase-based execution with PLAN.md -> SUMMARY.md cycle kept scope tight
- TanStack Query cache key patterns (user-scoped) prevented stale data leaks between sessions
- Per-100g normalization at ingest made all nutrition calculations consistent
- Supabase RLS with security-definer helpers handled complex household isolation cleanly
- Snapshot-at-insert pattern for meal_items and food_logs avoided expensive live re-resolution
- Gap closure phases (7, 9) after milestone audits caught real integration issues

### What Was Inefficient
- Phase 3-5 progress table in ROADMAP.md was never updated accurately (showed "In Progress" for completed phases)
- v1.0 was never formally archived as a separate milestone — all 14 phases ended up under v1.1
- Phases 11-14 added requirements (CALC-xx, UXLOG-xx, RCPUX-xx, etc.) that were tracked in ROADMAP.md but never formalized in REQUIREMENTS.md
- ~30 human verification items accumulated across phases and were never fully resolved
- Nyquist validation remained in draft status for all 8 original phases

### Patterns Established
- FoodDataMap captures macros at add-time from NormalizedFoodResult — avoids re-fetching
- Polymorphic ingredient_id (text) with ingredient_type discriminator for cross-source food references
- Dual nullable FK pattern with DB check constraint for user_id vs member_profile_id
- UTC-only date arithmetic (getUTCDay/setUTCDate/toISOString) to prevent timezone drift
- Inline delete pattern: confirmation row renders below card with -mt offset
- Edge Function auth: always extract user ID from JWT, never from request body

### Key Lessons
1. Archive milestones when they ship — deferring v1.0 archival created a messy v1.1 that included everything
2. Requirements added in later phases should be formalized in REQUIREMENTS.md immediately, not just in ROADMAP.md
3. Human verification items should be scheduled, not accumulated — 30 pending items is a sign of process debt
4. food_logs storing per-serving macros (not per-100g) matched user mental model better and simplified editing
5. CNF and USDA nutrient IDs differ (e.g., vitamin A: 319 vs 318) — always use named constants, never magic numbers

### Cost Observations
- Model mix: balanced profile (opus for planning, sonnet for execution)
- Timeline: 6 days (2026-03-12 to 2026-03-17)
- Notable: Phases 1-7 built the entire MVP in ~3 days; phases 8-14 polished and hardened over ~3 more days

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.1 | 14 | 50 | First milestone — established phase-based execution pattern |

### Top Lessons (Verified Across Milestones)

1. Archive milestones promptly to keep ROADMAP.md and REQUIREMENTS.md constant-size
2. Formalize all requirements in REQUIREMENTS.md when phases are added, not retroactively
