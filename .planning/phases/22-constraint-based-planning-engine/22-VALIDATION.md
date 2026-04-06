---
phase: 22
slug: constraint-based-planning-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | PLAN-02 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 1 | PLAN-02 | T-22-01 | API key never exposed to client | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 2 | PLAN-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 22-04-01 | 04 | 2 | PLAN-05 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/__tests__/planGeneration.test.ts` — stubs for PLAN-02, PLAN-04, PLAN-05
- [ ] Test fixtures for mock household data (recipes, schedules, restrictions, inventory)

*Existing vitest infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI generates valid plan via Edge Function | PLAN-02 | Requires live Anthropic API + Supabase | Trigger generation via UI, verify slots populated |
| Nutrition gap card shows correct per-member data | PLAN-04 | Visual verification of gap display | Generate plan, check gap card matches computed values |
| Skeleton/shimmer during generation | PLAN-02 | Visual/timing verification | Click Generate, verify shimmer appears on unlocked slots |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
