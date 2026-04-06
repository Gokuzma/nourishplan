---
phase: 22-constraint-based-planning-engine
plan: 02
subsystem: ai-planning-engine
tags: [edge-function, ai, anthropic, meal-planning, constraint-solver]
dependency_graph:
  requires:
    - plan_generations table (22-01)
    - meal_plan_slots table (existing)
    - dietary_restrictions table (phase 20)
    - wont_eat_entries table (phase 20)
    - member_schedule_slots table (phase 21)
    - inventory_items table (phase 17)
    - recipe_ratings table (phase 20)
  provides:
    - generate-plan edge function (AI meal plan generation job)
  affects:
    - meal_plan_slots (bulk upsert of generated assignments)
    - plan_generations (job status tracking)
tech_stack:
  added: []
  patterns:
    - Two-stage AI generation (shortlist + assign) with verify-correct loop
    - Synchronous edge function with job-row polling pattern
    - Parallel Promise.all constraint assembly
    - AI response ID validation against household catalog
key_files:
  created:
    - supabase/functions/generate-plan/index.ts
  modified: []
decisions:
  - Model selection: claude-haiku-4-5 for households <=2 members with no restrictions; claude-sonnet-4-5 for 3+ members or active dietary restrictions (D-06)
  - Synchronous execution: entire AI loop runs within the request; client polls plan_generations by jobId
  - Slot name normalization: "Snack" (schedule DB) mapped to "Snacks" (plan grid) in scheduleStatus lookup
  - AI ID validation: all recipe IDs from AI response filtered against household's actual catalog before DB writes (T-22-04)
  - String sanitization: control characters stripped from user strings before embedding in AI prompts (T-22-02)
metrics:
  duration: 8m
  completed_date: "2026-04-06"
  tasks_completed: 1
  files_changed: 1
---

# Phase 22 Plan 02: generate-plan Edge Function Summary

**One-liner:** Two-stage AI meal plan generation edge function using Haiku shortlist + Haiku/Sonnet assignment with parallel constraint assembly, time-budgeted verify-correct loop, and bulk slot writing with per-slot rationale.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build generate-plan Edge Function | 2eebab9 | supabase/functions/generate-plan/index.ts |

## What Was Built

The `generate-plan` Supabase Edge Function — the AI planning engine for Phase 22.

**Request shape:** `{ householdId, planId, weekStart, priorityOrder }`

**Function flow:**
1. CORS + request parsing
2. Auth validation: JWT user verified as household member via `household_members` table
3. Rate limiting: rejects if >= 10 generation jobs in last 24 hours for the household
4. Job row creation: INSERT into `plan_generations` with status='running'
5. Parallel constraint assembly via `Promise.all`: recipes+ingredients, dietary restrictions, won't-eat entries, schedule slots, inventory items, recipe ratings, nutrition targets, household members+profiles, existing plan slots
6. Pass 1 (Shortlist — Haiku): AI selects ~30 candidate recipes respecting hard constraints
7. Pass 2 (Assign — Haiku or Sonnet per D-06): AI assigns candidates to unlocked slots with schedule awareness and rationale
8. Passes 3-5 (Verify-Correct — Haiku): iterative correction if violations exist and time budget remains
9. Bulk write: find-or-create meal rows for each recipe, upsert into `meal_plan_slots` with `generation_rationale`
10. Job row update: status='done'|'timeout'|'error' with pass_count and completed_at

**Security controls implemented:**
- T-22-01: Household membership check before any processing
- T-22-02: User-controlled strings sanitized (control chars stripped) before AI prompt embedding
- T-22-03: Rate limit check (24h window, 10 max per household)
- T-22-04: AI-returned recipe IDs validated against household's actual catalog before DB writes

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. The function is complete. It relies on the `plan_generations` table created in Plan 22-01 (separate parallel agent) — deployment requires that migration to be live first.

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model. All STRIDE mitigations are implemented.

## Self-Check: PASSED

- [x] `supabase/functions/generate-plan/index.ts` exists
- [x] Commit 2eebab9 exists in git log
- [x] All 18 acceptance criteria patterns verified present in the file
- [x] Pre-existing test failures (5 files, 12 tests) unchanged — no new failures introduced
