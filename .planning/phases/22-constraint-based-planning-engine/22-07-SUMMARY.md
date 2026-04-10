---
phase: 22-constraint-based-planning-engine
plan: "07"
subsystem: planning-engine
tags: [edge-function, snack-fallback, observability, planning-engine, gap-closure]
dependency_graph:
  requires: [22-06-SUMMARY]
  provides: [droppedAssignments-logging, snack-fallback-loop, coverage-snapshot]
  affects: [22-08-PLAN, UAT-test-1-Gap-A]
tech_stack:
  added: []
  patterns: [explicit-drop-logging, slot-level-fallback, coverage-snapshot]
key_files:
  created: []
  modified:
    - supabase/functions/generate-plan/index.ts
decisions:
  - "Fallback reuse pool prefers recipes assigned to a different slot_name first, to minimize same-recipe-same-slot-type repetition (variety heuristic)"
  - "Greek Yogurt seed suggestion only fires when all Snacks slots are skipped and no snack-ish suggestion already exists — avoids duplicate suggestion noise"
  - "droppedAssignments accumulates across both Pass 2 and Passes 3-5 — gives full picture of AI hallucination rate per run"
  - "totalSlotsToFill in coverage excludes away slots (scheduleStatus=away) so the denominator matches what the user expects to see filled"
metrics:
  duration_minutes: 30
  completed_date: "2026-04-10"
  tasks_completed: 1
  files_changed: 1
---

# Phase 22 Plan 07: Snack Fallback, droppedAssignments Logging, Coverage Snapshot Summary

**One-liner:** Post-Pass-2 slot reuse fallback fills empty Snacks slots, explicit droppedAssignments logging replaces silent filter, and a coverage object gives UAT single-glance observability of plan completeness.

## Objective

Close UAT Gap A (test 1, truth: "generated plan fills all 28 weekly slots"). Every generation on the UAT test household left 7 empty Snack slots because the AI hallucinated recipe_ids for Snack slots which were silently dropped by the validation filter. This plan makes the drops visible, instructs the AI to never leave Snacks empty, and adds a code-level fallback that reuses assigned meals to fill any still-empty non-away slot.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Snack fallback, droppedAssignments logging, coverage snapshot, deploy | 1cb0ba9 | supabase/functions/generate-plan/index.ts |

## Changes Made

### Edge Function (`supabase/functions/generate-plan/index.ts`)

**Outer-scope declarations (new):**
- `interface DroppedAssignment` — `{day_index, slot_name, raw_recipe_id, reason}` shape
- `const droppedAssignments: DroppedAssignment[]` — accumulates across all AI passes
- `interface SkippedSlot` — `{day_index, slot_name, reason}` shape
- `const skippedSlots: SkippedSlot[]` — slots that had no assignment and no reuse candidate
- `const reusedFills` — records each code-level fallback reuse for traceability

**Pass 2 system prompt (updated):**
- Added rule 7: "NEVER leave a Snacks slot empty — either reuse a full-meal recipe OR add to suggestedRecipes. Only use recipe_id values from the candidates array — NEVER invent recipe_ids."

**Passes 3-5 system prompt (updated):**
- Same rule 7 addition as Pass 2

**Pass 2 validation filter (replaced):**
- Was: silent `.filter()` that dropped invalid assignments with no trace
- Now: explicit `for` loop that pushes `{day_index, slot_name, raw_recipe_id, reason}` to `droppedAssignments` for every dropped slot (`reason: "invalid_recipe_id"` or `"missing_recipe_id"`)
- `_debug_rawSlots` and `_debug_validSlots` counters preserved

**Passes 3-5 validation filter (replaced):**
- Same explicit logging pattern as Pass 2

**Post-Pass-2 slot-level fallback (new):**
- After finalStatus determination, if `pass2Completed`, iterates `slotsToFill`
- Skips slots already in `bestResult.slots` or in `awayKeySet`
- For each unfilled slot: prefers a recipe not already assigned to the same `slot_name` (variety), falls back to any assigned recipe
- On successful reuse: pushes to `bestResult.slots` with descriptive rationale, records in `reusedFills`
- On no reuse candidate: pushes to `skippedSlots` with reason `"no_catalog_recipe_and_no_reuse_candidate"`
- Greek Yogurt seed: if any Snacks slot was skipped and `suggestedRecipes` contains no snack-ish entry (regex test), appends "Greek Yogurt with Berries and Granola" canonical suggestion

**constraint_snapshot coverage (new):**
- `totalSlotsToFill`: count of slotsToFill excluding away slots
- `filledSlots`: upsertRows.length (slots written to DB)
- `reusedFills`: reusedFills.length
- `skippedSlots`: skippedSlots.length
- `droppedAssignments`: droppedAssignments.length
- Full arrays `droppedAssignments`, `skippedSlots`, `reusedFills` also stored for root-cause analysis

## Deployment

- Edge function redeployed via `npx supabase functions deploy generate-plan --no-verify-jwt` — confirmed deployed to project `qyablbzodmftobjslgri`
- `npx vite build` passed (no TypeScript errors in React consumers, 1282 KiB precache)

## Deviations from Plan

None — plan executed exactly as written. All 5 steps applied surgically via Edit tool. 22-06 changes (WALL_CLOCK_BUDGET_MS, pass2Completed, partial status, capitalize helper, DEFAULT_SLOT_NAMES) preserved untouched.

## Known Stubs

None. No placeholder data or hardcoded empty values introduced. The Greek Yogurt fallback is real content, not a placeholder.

## Threat Flags

None. All changes are within the planned threat model (T-22-07-01 through T-22-07-06). Fallback reuse only pulls recipe_ids already validated against `validIds`. droppedAssignments stores only UUID-shaped strings from the AI, no PII. No new endpoints, auth paths, or schema changes.

## Self-Check: PASSED

- [x] `NEVER leave a Snacks slot empty` appears 2× in file (Pass 2 prompt + Passes 3-5 prompt)
- [x] `const droppedAssignments: DroppedAssignment[]` declared at outer scope
- [x] `droppedAssignments.push` appears 3× (Pass 2 missing, Pass 2 invalid, Passes 3-5 combined)
- [x] `const skippedSlots` declared
- [x] `const reusedFills` declared
- [x] `Slot-level fallback (Gap A closure)` comment present
- [x] `coverage:` object present in constraint_snapshot update
- [x] `totalSlotsToFill` computed and stored
- [x] `Greek Yogurt with Berries and Granola` seed present (1 occurrence — only in the seed code, not duplicated into prompt text)
- [x] `WALL_CLOCK_BUDGET_MS`, `pass2Completed`, `finalStatus = "partial"` all still present
- [x] `capitalize()` helper still present
- [x] `DEFAULT_SLOT_NAMES = ["Breakfast", "Lunch", "Dinner", "Snacks"]` still present
- [x] `created_by: user.id` on meals INSERT still present (L-018)
- [x] Commit `1cb0ba9` exists: `git log --oneline | grep 1cb0ba9` confirmed
- [x] `npx vite build` succeeded (no errors)
- [x] Edge function deployed to `qyablbzodmftobjslgri`
- [x] Only `supabase/functions/generate-plan/index.ts` modified (1 file changed per commit output)
