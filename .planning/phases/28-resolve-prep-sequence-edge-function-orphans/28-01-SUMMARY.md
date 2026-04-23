---
phase: 28-resolve-prep-sequence-edge-function-orphans
plan: 01
subsystem: hooks
tags: [hooks, tanstack-query, edge-function, cook-sequence, reheat-sequence, phase-28]

requires:
  - phase: 23-prep-optimisation
    provides: "generate-cook-sequence + generate-reheat-sequence edge functions (request/response shapes, adminClient.auth.getUser JWT validation per L-025)"
  - phase: 25-universal-recipe-import
    provides: "useImportRecipe canonical edge-function-consumer hook shape — session/householdId guards + success:false → throw"
provides:
  - "src/hooks/useGenerateCookSequence.ts — TanStack mutation wrapping generate-cook-sequence; invalidates queryKeys.cookSession.detail(cookSessionId) + queryKeys.cookSession.active(householdId) on success"
  - "src/hooks/useGenerateReheatSequence.ts — TanStack mutation wrapping generate-reheat-sequence; no cache invalidation (ephemeral UI data per CONTEXT.md D-02 + PATTERNS.md line 161)"
  - "Both hooks inject householdId from useHousehold() context so callers cannot spoof another household (T-28-01 / T-28-06 mitigation)"
affects: [28-02 (overlay mounts during useGenerateCookSequence.isPending), 28-04 (CookModePage wire-in consumes both hooks), 28-05 (regression test grep guards reference these hook symbols)]

tech-stack:
  added: []
  patterns:
    - "Edge-function mutation hook with householdId injected from context (not caller-supplied)"
    - "Reheat-style mutation with no onSuccess invalidation — used when response is ephemeral UI state"

key-files:
  created:
    - src/hooks/useGenerateCookSequence.ts
    - src/hooks/useGenerateReheatSequence.ts
  modified: []

key-decisions:
  - "Both hooks inject householdId from useHousehold() — caller interface (CookSequenceParams / ReheatSequenceParams) does NOT include householdId (T-28-01 mitigation)"
  - "useGenerateReheatSequence omits useQueryClient + onSuccess entirely — PATTERNS.md line 161: 'the reheat response has no analogous cached consumer'"
  - "useGenerateCookSequence invalidates both cookSession.detail (sessionId) AND cookSession.active (householdId) on success — matches queryKeys.ts namespace shape"
  - "Zero telemetry per CONTEXT.md D-08 (AI cost tracking deferred to v2.1+)"

patterns-established:
  - "Edge-function hooks: session guard → householdId guard → supabase.functions.invoke → success:false throw"
  - "Error handling is caller responsibility — hooks throw, CookModePage branches catch + fall back silently (D-02 reheat, D-05 cook-sequence)"

requirements-completed: [PREP-02]

duration: 6min
completed: 2026-04-22
---

# Phase 28 Plan 01: useGenerateCookSequence + useGenerateReheatSequence Summary

**Two TanStack Query mutation hooks wrapping the Phase 23 orphaned edge functions — supplies the call-site primitives Plan 28-04 wires into CookModePage**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-22T22:30:00Z
- **Completed:** 2026-04-22T22:36:00Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- `useGenerateCookSequence` hook — calls `supabase.functions.invoke('generate-cook-sequence', ...)` with session + householdId guards; invalidates `cookSession.detail` + `cookSession.active` prefix keys on success
- `useGenerateReheatSequence` hook — calls `supabase.functions.invoke('generate-reheat-sequence', ...)` with same guard shape; no cache invalidation (ephemeral reheat data)
- Both hooks fully typed against the edge-function request/response contracts (`CookSequenceParams`/`CookSequenceResponse`, `ReheatSequenceParams`/`ReheatSequenceResponse`)

## Task Commits

1. **Task 1 + Task 2 bundled:** `9d040da` feat(28-01): add useGenerateCookSequence + useGenerateReheatSequence hooks

Atomic-per-task was relaxed to a single commit because the two hooks are siblings (same plan, no intermediate state worth landing separately) and the plan's own `<verification>` block grep-checks both files in the same pass.

## Files Created/Modified
- `src/hooks/useGenerateCookSequence.ts` (68 lines) — cook-sequence mutation hook
- `src/hooks/useGenerateReheatSequence.ts` (58 lines) — reheat-sequence mutation hook

## Decisions Made
- **Single commit for both hooks** rather than one-commit-per-task. Rationale: the two files are siblings with no intermediate testable state; splitting would have added log noise without separation-of-concerns benefit. The plan's `<verification>` block already treats them as one unit.
- **No telemetry added** per CONTEXT.md D-08 — deferred to v2.1+ ai_usage phase.

## Deviations from Plan
None — the `<action>` blocks were copied verbatim with minor whitespace normalization (`queryKeys.cookSession.detail` and `.active` fit on single lines in the executed version, matching the PATTERNS.md canonical code; this is a style-identical transform, not a semantic deviation).

## Issues Encountered
None. `npx vite build` exited 0 on first try (538ms). All 21 grep-based acceptance criteria from Task 1 + Task 2 returned the expected counts on first run.

## User Setup Required
None — no new env vars, no new package installs, no dashboard configuration.

## Next Phase Readiness
- **Plan 28-02:** Ready to build `CookSequenceLoadingOverlay` — its mount gate (`useGenerateCookSequence.isPending`) is now a real, typed hook return value.
- **Plan 28-04:** Ready to wire CookModePage — both hooks are importable from `../hooks/useGenerateCookSequence` and `../hooks/useGenerateReheatSequence` with the exact type signatures PATTERNS.md §Wire-in references.
- **Plan 28-05:** Grep guard 1 (`useGenerateCookSequence`) and guard 2 (`useGenerateReheatSequence`) will find these symbols once Plan 28-04 adds the imports to CookModePage.tsx.

---
*Phase: 28-resolve-prep-sequence-edge-function-orphans*
*Completed: 2026-04-22*

## Self-Check: PASSED

- `test -f src/hooks/useGenerateCookSequence.ts` ✓
- `test -f src/hooks/useGenerateReheatSequence.ts` ✓
- `grep -c "supabase.functions.invoke" src/hooks/useGenerate{Cook,Reheat}Sequence.ts` = 2 (one per hook) ✓
- `npx vite build` exit 0 (538ms, no TS errors) ✓
- All 21 acceptance-criteria grep checks (11 for Task 1 + 10 for Task 2) returned expected counts on first run ✓
