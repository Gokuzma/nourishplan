---
phase: 28-resolve-prep-sequence-edge-function-orphans
plan: 05
subsystem: testing
tags: [tests, regression-guard, traceability, requirements, phase-28]

requires:
  - phase: 28-resolve-prep-sequence-edge-function-orphans
    provides: "Plan 28-01 hooks (useGenerateCookSequence / useGenerateReheatSequence exports), Plan 28-02 overlay export, Plan 28-04 CookModePage wire-in — all referenced by test string-match assertions"
  - phase: 27-wire-schedule-badges-to-plangrid
    provides: "Precedent: tests/PlanGrid.schedule.test.tsx — fs.readFileSync-based L-020-style regression test pattern"
provides:
  - "tests/CookModePage.prepSequence.test.tsx — 27 passing regression assertions encoding UI-SPEC §Anti-Regression Contract (guards 1-5 + 7) + L-020/L-027 preservation audit (8 features) + supporting-file existence checks (3 files)"
  - "REQUIREMENTS.md line 320 flipped: Phase 28 (gap closure) → Phase 28 (wire-in) per CONTEXT.md D-06"
  - "ROADMAP §Phase 28 success criterion #4 satisfied: integration check finds cook-sequence/reheat-sequence consumer invocations in 3 source files (hooks + page)"
  - "ROADMAP §Phase 28 success criterion #5 in progress: PREP-02 traceability reflects wire-in; Pending → Validated flip happens post-ship via 28-VERIFICATION.md"
affects: [future CookModePage modifications (this test now fails if the wire-in is truncated), phase-28 verification (asserts traceability flip)]

tech-stack:
  added: []
  patterns:
    - "Source-string regression test: fs.readFileSync + describe-per-guard + it-per-assertion. Deliberately does NOT import the source file — survives the L-020 truncation failure mode that produced the orphan originally"

key-files:
  created:
    - tests/CookModePage.prepSequence.test.tsx
  modified:
    - .planning/REQUIREMENTS.md (1 line changed: PREP-02 row label `gap closure` → `wire-in`)

key-decisions:
  - "27 it() blocks across 8 describe blocks — each describe maps to one UI-SPEC guard or one preservation class. Names are traceable to CONTEXT.md decisions so a failure message reads as a scope violation, not just a broken assertion"
  - "No @testing-library/react imports — avoids pulling react-router-dom, supabase-js, etc. at import time. This test is a source-level contract, not a behaviour test; it deliberately fails if the file is gutted even if the app would technically still compile"
  - "REQUIREMENTS.md single-line edit only — status column (`Pending`) intentionally preserved; status flip routed through 28-VERIFICATION.md after phase-level verification"

patterns-established:
  - "Source-string regression tests: when a phase wires new capability into a file with known truncation history, ship a companion test that greps for the wire-in symbols — any future truncation fails the test immediately"

requirements-completed: [PREP-02]

duration: 6min
completed: 2026-04-22
---

# Phase 28 Plan 05: Regression Test + REQUIREMENTS Traceability Flip Summary

**27 passing source-string regression tests lock the Phase 28 wire-in against L-020/L-027 truncation; REQUIREMENTS.md PREP-02 row relabelled `(gap closure)` → `(wire-in)` per CONTEXT.md D-06.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-22T22:59:00Z
- **Completed:** 2026-04-22T23:05:00Z
- **Tasks:** 2
- **Files created:** 1 (tests/CookModePage.prepSequence.test.tsx)
- **Files modified:** 1 (.planning/REQUIREMENTS.md, single-line)

## Accomplishments
- 27 `it()` assertions across 8 `describe` blocks (8 → 10 describe threshold, actual 8 is within the 6-10 range).
- All 27 pass `npx vitest run tests/CookModePage.prepSequence.test.tsx` in 5ms.
- UI-SPEC Guards 1, 2, 3, 4, 5, 7 each have their own describe block with dedicated assertions.
- L-020/L-027 8-feature preservation audit encoded as 7 `it` blocks (some combine related checks per the PATTERNS.md canonical template).
- Supporting-file existence + U+2026 locked-copy + no-dismiss-surface checks for hooks + overlay (Guard 8 equivalent).
- REQUIREMENTS.md row 320 now reads exactly `| PREP-02 | Phase 23, Phase 28 (wire-in) | Pending |`.
- All other PREP-*, SCHED-*, IMPORT-* rows byte-identical (`PREP-01`, `PREP-03`, `SCHED-01`, `IMPORT-01` all grep to the expected pre-edit values).

## Task Commits

1. **Tasks 1 + 2 bundled** — `376dafa` test(28-05): regression test for Phase 28 wire-in + REQUIREMENTS traceability flip

One commit because the two outputs (test file + 1-line doc edit) are tightly coupled — the traceability flip is meaningful only once the regression test proves the wire-in exists.

## Files Created/Modified
- `tests/CookModePage.prepSequence.test.tsx` (180 lines, 27 tests, 8 describe blocks)
- `.planning/REQUIREMENTS.md` (1 line changed at line 320)

## Describe Block → UI-SPEC Guard Mapping

| Describe | Scope | Tests |
|----------|-------|-------|
| Guard 1: useGenerateCookSequence is imported and called | UI-SPEC line 292 | 3 |
| Guard 2: useGenerateReheatSequence is imported and called | UI-SPEC line 294 | 3 |
| Guard 3: CookSequenceLoadingOverlay is conditionally rendered on isPending | UI-SPEC line 296 | 2 |
| Guard 4: HARDCODED_REHEAT_FALLBACK is gated by fallback marker (D-02) | UI-SPEC line 298 | 3 |
| Guard 5: setFlowMode("cook") transitions preserved | UI-SPEC line 300 | 1 |
| Guard 7: silent fall-through (no toast/banner/alert on AI failure) | UI-SPEC line 302 | 4 |
| L-020 / L-027 preservation audit (8 pre-existing features) | PATTERNS.md §Anti-Regression | 7 |
| Supporting files exist with expected exports | Cross-plan integration | 4 |
| **Total** | | **27** |

## ROADMAP §Phase 28 Success Criteria — Plan 28-05 Contribution

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Decision recorded (wire-in vs remove) | CLOSED in PLAN files + 28-CONTEXT.md D-01 (pre-this-plan) |
| 2 | If wire-in: CookModePage invokes generate-cook-sequence + generate-reheat-sequence at correct branches | CLOSED by Plan 28-04 |
| 3 | If remove: (N/A — chose wire-in) | N/A |
| 4 | `grep -r "cook-sequence\|reheat-sequence" src/` returns consumer invocations | **CLOSED by this plan** — 3 source files match (hooks × 2, CookModePage × 1). Output: see below. |
| 5 | PREP-02 traceability status reflects the decision | **In-progress, label flipped by this plan** — `Pending → Validated` flip routed through 28-VERIFICATION.md (post-ship). |

### Integration check output (criterion #4)
```
src/hooks/useGenerateCookSequence.ts:      const { data, error } = await supabase.functions.invoke('generate-cook-sequence', ...)
src/hooks/useGenerateReheatSequence.ts:    const { data, error } = await supabase.functions.invoke('generate-reheat-sequence', ...)
src/pages/CookModePage.tsx:  // D-02: auto-fire reheat-sequence mutation when entering the reheat branch
src/pages/CookModePage.tsx:    // D-03 + D-04: fire generate-cook-sequence for multi-recipe combined/per-recipe sessions.
src/pages/CookModePage.tsx:    console.error('[Phase 28] generate-cook-sequence failed; ...')
src/pages/CookModePage.tsx:    console.error('[Phase 28] generate-reheat-sequence failed; ...')
```
3 source files. Zero matches would have indicated a broken wire-in and failed the criterion.

### REQUIREMENTS.md single-line diff (criterion #5 label)

**Before:**
```
| PREP-02 | Phase 23, Phase 28 (gap closure) | Pending |
```
**After:**
```
| PREP-02 | Phase 23, Phase 28 (wire-in) | Pending |
```

`git diff --stat .planning/REQUIREMENTS.md` shows exactly `1 file changed, 1 insertion(+), 1 deletion(-)`.

## Decisions Made
- **Single commit for Task 1 + Task 2** (same reasoning as Plans 28-01, 28-04).
- **No @testing-library/react import** — test deliberately operates on source-string. Importing the page module would bypass the entire point of the L-020 regression contract.
- **Status column flip deferred** — `Pending → Validated` happens after phase verification, not during plan execution. The plan's acceptance criteria explicitly carves this out.

## Deviations from Plan
None beyond the established single-commit pattern. All action-block text implemented verbatim.

## Vitest Result
```
✓ tests/CookModePage.prepSequence.test.tsx (27 tests) 5ms

Test Files  1 passed (1)
     Tests  27 passed (27)
  Duration  535ms
```

27/27 green. Threshold was ≥ 20 passing; landed at 27.

## Issues Encountered
None. Test file ran on first attempt with no failures. `git diff --stat` on REQUIREMENTS.md confirmed exactly one line changed.

## User Setup Required
None.

## Next Phase Readiness
- **Phase 28 verification:** All 5 ROADMAP success criteria have substantive contributions (Plan 28-01 + 28-02 wired hooks/overlay, Plan 28-03 deployed edge functions, Plan 28-04 wired page, Plan 28-05 locked regression + flipped traceability label). Verifier can now run the goal-backward audit, flip PREP-02 status Pending→Validated in `28-VERIFICATION.md`, and mark the phase checkbox `[x]` in ROADMAP.
- **Live-site UAT:** After next `npx vercel --prod` deploy, the reheat flow and multi-meal-prompt flow are exercisable end-to-end. Phase-level verification Playwright pass should use the L-003 PWA-cache-clear + L-011 `claude-test@nourishplan.test` account.

---
*Phase: 28-resolve-prep-sequence-edge-function-orphans*
*Completed: 2026-04-22*

## Self-Check: PASSED

- `tests/CookModePage.prepSequence.test.tsx` created with 8 describe blocks + 27 it blocks ✓
- `npx vitest run tests/CookModePage.prepSequence.test.tsx` — 27/27 passing, 0 failing ✓
- `grep -c "fs.readFileSync"` = 6 (cookModeSource top-level read + 5 inside `it` blocks) — no `@testing-library/react` ✓
- `.planning/REQUIREMENTS.md` single-line diff: `1 insertion(+), 1 deletion(-)` ✓
- PREP-02 row reads `| PREP-02 | Phase 23, Phase 28 (wire-in) | Pending |` ✓
- ROADMAP §Phase 28 criterion #4 integration check: 3 source files contain consumer references ✓
- Other REQUIREMENTS rows (PREP-01, PREP-03, SCHED-01, IMPORT-01) unchanged ✓
