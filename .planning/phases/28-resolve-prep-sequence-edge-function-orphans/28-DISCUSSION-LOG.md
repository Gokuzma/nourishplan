# Phase 28: Resolve Prep Sequence Edge Function Orphans - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `28-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 28-resolve-prep-sequence-edge-function-orphans
**Areas discussed:** Primary fork (wire-in vs remove), Reheat UX scope, Multi-recipe combined UX, PREP-02 + 23-SUMMARY traceability, AI cost/usage telemetry

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Primary fork: wire-in vs remove | The central decision; everything else branches from it | ✓ |
| Reheat UX scope | Hardcoded fallback acceptability; AI failure handling | ✓ |
| Multi-recipe combined UX | AI-interleaved vs concatenated; per-recipe handling | ✓ |
| PREP-02 + 23-SUMMARY traceability cleanup | How much of Phase 23 records to touch | ✓ |

**User selected:** all four areas (multiSelect).

---

## Primary fork: Wire-in vs Remove

| Option | Description | Selected |
|--------|-------------|----------|
| Remove both | Delete supabase/functions/generate-cook-sequence + generate-reheat-sequence; remove MultiMealPromptOverlay; downgrade PREP-02 to partially-satisfied. (Recommended in initial framing — nothing has consumed these in 2+ weeks of prod.) | |
| Wire both in | Build hooks useGenerateCookSequence + useGenerateReheatSequence, wire into CookModePage reheat + combined flows, add graceful fallback. | ✓ |
| Hybrid (wire reheat only) | Keep generate-reheat-sequence (cheap Haiku), delete generate-cook-sequence + MultiMealPromptOverlay. | |

**User's choice:** Wire both in.
**Notes:** User chose wire-in despite the "remove" recommendation. Decision reframes the rest of the discussion around HOW to wire-in (hooks, fallbacks, loading UX) rather than HOW to clean up after removal.

---

## Reheat UX scope — Fallback behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current 3-step microwave fallback | If AI call fails: render the existing hardcoded 3 steps. Storage hint ignored in fallback. (Recommended — Phase 25 D-10 graceful-degradation pattern.) | ✓ |
| Show error + retry button, no fallback | Block reheat on AI failure. | |
| Two-tier fallback by storage hint | Storage-aware fallback without full AI. | |

**User's choice:** Keep current 3-step microwave fallback.
**Notes:** Aligns with Phase 25 D-10 pattern. Storage-aware fallback noted for future polish (deferred).

---

## Multi-recipe combined UX — Per-recipe AI handling

| Option | Description | Selected |
|--------|-------------|----------|
| Skip AI for per-recipe | 'Per recipe' = sequential single-recipe flow with no interleaving. Don't call edge function. (Recommended.) | |
| Always call AI, both modes | Both modes invoke generate-cook-sequence; per-recipe mode just returns concatenated steps with member balancing. | ✓ |
| Make it user-toggleable | Three options in MultiMealPromptOverlay. | |

**User's choice:** Always call AI, both modes.
**Notes:** Trades small overhead on per-recipe mode for code-path uniformity and member-balancing benefit on 2+ cook sessions.

---

## Combined cook UX — Loading state

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen 'Planning your cook session…' overlay | Block screen with centered spinner + message. Phase 25 ImportRecipeModal pattern. (Recommended.) | ✓ |
| Inline shimmer in-place | Render Cook Mode shell immediately with shimmer placeholders. | |
| Optimistic: render concatenated immediately, refine when AI returns | Show naive concatenation right away; replace with AI-interleaved on completion. | |

**User's choice:** Full-screen "Planning your cook session…" overlay.

---

## Combined cook UX — Failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to per-recipe concatenation (no interleaving) | User still gets Cook Mode, just without AI optimization. (Recommended — consistent with reheat fallback.) | ✓ |
| Show error + force user back to MultiMealPromptOverlay | Force explicit choice on failure. | |
| Silent failure, log to console, fall through | No user-facing message. | |

**User's choice:** Fall back to per-recipe concatenation.
**Notes:** Consistent with D-02 reheat fallback. Both AI calls degrade gracefully.

---

## PREP-02 + 23-SUMMARY cleanup — Scope of historical changes

| Option | Description | Selected |
|--------|-------------|----------|
| Light touch: just update REQUIREMENTS.md | Update PREP-02 traceability row only. Leave 23-VERIFICATION.md alone. (Recommended.) | ✓ |
| Full cleanup: amend 23-VERIFICATION.md + 23-02/06 SUMMARY notes | More audit-trail honesty but more historical churn. | |
| Document in Phase 28 records only | Two-source-of-truth but cleanest separation. | |

**User's choice:** Light touch (REQUIREMENTS.md only).
**Notes:** Phase 23's SATISFIED claim becomes accurate post-wire-in. Phase 28's own SUMMARY/VERIFICATION carry the closure narrative.

---

## Supabase deployment scope

| Option | Description | Selected |
|--------|-------------|----------|
| Verify deployed + redeploy if env vars changed | Run `supabase functions list` first, redeploy only if needed. (Recommended.) | |
| Redeploy both regardless | Always redeploy in Phase 28. Eliminates "is live function == repo source?" ambiguity. | ✓ |
| Skip deployment entirely | Trust Supabase state. | |

**User's choice:** Redeploy both regardless.
**Notes:** Plan should include explicit `npx supabase functions deploy <name> --no-verify-jwt` steps in execution.

---

## Telemetry — AI cost/usage observability

| Option | Description | Selected |
|--------|-------------|----------|
| Minimum: console.log the Claude usage block | 2 lines per function, shows in Supabase logs, no DB. (Recommended.) | |
| Full cost-tracking phase (not Phase 28) | Defer to v2.1+; Phase 28 ships without observability. | ✓ |
| Console.log for new functions + open a v2.1 phase | Both — pragmatic floor + ambition note. | |

**User's choice:** Full cost-tracking phase (not Phase 28).
**Notes:** Captured as deferred v2.1+ idea in CONTEXT.md. Phase 28 deliberately ships AI spend without observability. User chose ambition over pragmatic-floor here — full proper telemetry phase later, no half-measure now.

---

## Claude's Discretion

- Exact loading-overlay copy (planner picks final wording)
- Whether the cook-sequence error fallback shows a toast/notice vs silent fall-through
- Hook signature shape (mutation vs query)
- Whether `ReheatSequenceCard` props need a new `isPending` state

## Deferred Ideas

(See `28-CONTEXT.md` <deferred> section for full list with rationale.)

- Full AI cost/usage telemetry phase (v2.1+)
- Storage-aware reheat fallback (polish)
- Equipment-conflict surfacing in UI (uses existing `equipment_conflicts` field from generate-cook-sequence response)
- Cross-meal equipment conflict prediction at plan-time (whole new feature)
- Prep-day reminder push notifications (separate phase)
