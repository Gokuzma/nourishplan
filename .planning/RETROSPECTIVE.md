# NourishPlan — Living Retrospective

Cross-milestone reflections on what worked, what was inefficient, patterns established, and lessons learned. Written at each milestone close.

---

## Milestone: v2.0 — AMPS + Universal Recipe Import + Granular Permissions

**Shipped:** 2026-04-24
**Phases:** 15 | **Plans:** 70 | **Commits:** 412 | **Timeline:** 30 days

### What Was Built

A constraint-solving meal planning platform. Fifteen phases ship budget engine, inventory engine, grocery list generation, drag-and-drop planner, feedback engine + dietary restrictions, schedule model, constraint-based planning engine, prep optimisation, tier-aware recipe selection, universal recipe import, and granular household role permissions. Plus 4 gap-closure phases (26–29) and 1 new-feature phase (30).

### What Worked

- **Centralised `queryKeys.ts` in Phase 16.** Every subsequent v2.0 feature plugged in without cache coherence bugs. Zero stale-data issues in 70+ plans. This was the single most leveraged decision of the milestone.
- **Edge-function-based async optimisation** (Phase 22). `generate-plan` kept heavy constraint solving off the UI thread. Polling pattern held up under real-world latency.
- **Retrospective VERIFICATION.md pattern** (Phase 29). When we discovered Phase 17 + Phase 25 shipped without VERIFICATION.md, we backfilled them using actual UAT evidence rather than pretending the gap didn't exist. This audit-friendly trail saved us at the v2.0-MILESTONE-AUDIT step.
- **Gap-closure phases** (26, 27, 28, 29). Each audit-surfaced issue became a focused phase with tight scope. Phases 27/28 each shipped a regression test locking the wiring, so the same bug can't silently recur.
- **Playwright E2E introduction in Phase 30.** First E2E infrastructure in the repo. 3× idempotent 48s runs against live Supabase for admin-equivalence. The pattern now exists for future phases.
- **Binary roles over capability scopes** (Phase 30). The Simplifier persona in discuss-phase pushed back against 17 RLS rewrites in favour of reusing the existing admin check. Right call — zero regression, trivial to verify.

### What Was Inefficient

- **Cache/scope drift discovered late.** CRIT-01 (Cook Mode not wired to inventory/budget) and CRIT-02 (PlanGrid not wired to schedule) were both shipped as "complete" but actually broke the user-facing promise. Both only surfaced during `/gsd-audit-milestone`. Future: a tighter verification pass at phase close, not just at milestone close, would have caught these in Phase 17 and Phase 21 respectively.
- **Documentation drift.** WARN-02 (IMPORT-01..05 missing from REQUIREMENTS.md), WARN-04 (traceability staleness), WARN-05 (Phase 24 ROADMAP text vs shipped scope). Required a full docs-only phase (29) to clean up. Root cause: requirement updates happened in PR commits but REQUIREMENTS.md was not a phase artifact consistently. Next milestone: require every phase's close to touch REQUIREMENTS.md traceability.
- **FEED-02 open since 2026-04-22.** Dietary restrictions save returning 400 was known for 2 days before the fix landed. Root cause: no production error monitoring yet — the bug was only visible during UAT. Also root cause: nobody ran the upsert against the migration's actual unique index shape.
- **Cook Mode from plan-slot bug.** Pre-existing bootstrap bug in `CookModePage.tsx` — `/cook/:mealId` was treating the URL param as a recipe_id when it was actually a meal_id. Shipped in Phase 23 and stayed broken for weeks until Pass 1 UAT surfaced it. Root cause: no E2E coverage of the plan-slot entry path before Phase 30's Playwright infrastructure.
- **22 deferred live-browser UATs.** DnD gestures, touch drag, schedule grid picker, recipe mix sliders, OS notifications, Cook Mode reconciliation demo — all waiting on human verification. Vitest + code review can't test these; Playwright MCP can cover some but not DnD gestures or OS notifications reliably.
- **Nyquist sampling abandoned mid-milestone.** Only Phase 24 graduated `nyquist_compliant: true`. Ten phases have draft VALIDATION.md files that never graduated. Four phases (27–30) have no VALIDATION.md. Symptom of workflow fatigue on what is effectively redundant when VERIFICATION.md is present.

### Patterns Established

- **Retrospective verification backfill.** When a phase ships without VERIFICATION.md, write one from real UAT/test evidence rather than re-running the phase.
- **Gap-closure phases.** Each CRIT/WARN finding → a small focused phase → a regression test locking the wiring.
- **Playwright MCP for multi-REQ UAT sweeps.** Post-Phase-30 sprint promoted 7 REQ-IDs in 3 passes via Playwright MCP against local dev + live Supabase. Each pass clustered related requirements to amortise setup cost.
- **`onConflict` + function-based index rule** (L-032). Before writing `.upsert({ onConflict: 'a,b' })`, open the migration and read the unique index. If it's a function-based expression, use manual query-then-update-or-insert instead.

### Key Lessons

1. **Audit-surfaced "wired" requirements are not actually wired unless there's a regression test.** CRIT-01 and CRIT-02 taught this; Phases 26/27/28 locked it in.
2. **A phase is not complete until REQUIREMENTS.md traceability reflects the shipped scope.** Phase 29 existed because we didn't enforce this earlier.
3. **UAT that needs human hands should be explicitly deferred, not left ambiguous.** The `deferred_human_verification` YAML block in the milestone audit made this auditable.
4. **Upsert `onConflict` is a footgun with function-based indexes.** The Postgres requirement — onConflict columns must exactly match a unique constraint's column list — doesn't apply cleanly to functional expression indexes. L-032 codifies the check: read the migration before trusting the upsert.
5. **Ship-to-prod ≠ milestone close.** Keeping the two distinct (deploy via `vercel --prod` vs archive via `/gsd-complete-milestone`) lets us ship hot-fixes without artificially closing milestone bookkeeping.

### Cost Observations

- Session count: ~50+ across the milestone (rough estimate from chat logs)
- Model mix: primarily Opus for planning + complex execution; Sonnet for research + verification; parallel subagent dispatch for gap-closure work
- Tooling: Playwright MCP introduced post-Phase-30 for UAT sweeps — proved high-leverage (7 REQ-IDs × 3 passes in one session)
- Notable efficiency: gap-closure phases 26–28 ran in ~1 day each by reusing already-verified infrastructure

---

## Cross-Milestone Trends

_(First retrospective — trends will populate across v2.x+.)_

### Recurring Patterns

- **Phase → gap-closure cycle** is working. Every milestone so far has had 1–2 gap-closure phases (v1.0: Phase 7; v1.1: Phase 15; v2.0: Phases 26–29). Build-fast-then-audit-and-close is the operating rhythm.
- **Retrospective documentation artifact creation** (v1.1 Phase 10 and v2.0 Phase 29) for requirement formalisation is a repeatable pattern. Future milestones: capture traceability during phase close, not at milestone close.

### Pending Improvements for v2.x+

- Enforce REQUIREMENTS.md touch in every phase close
- Introduce phase-level regression tests for wiring (not just verification docs)
- Either graduate Nyquist VALIDATION.md or formalise that VERIFICATION.md + regression tests supersede it
- Set up production error monitoring so FEED-02-class bugs surface in prod, not UAT
- Expand Playwright E2E coverage to cover the core plan-slot → cook → inventory → grocery reconcile flow

---

*Retrospective created 2026-04-24 during v2.0 close.*
