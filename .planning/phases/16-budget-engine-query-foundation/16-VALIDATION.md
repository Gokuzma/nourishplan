---
phase: 16
slug: budget-engine-query-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (inferred from Vite 7 project) |
| **Config file** | `vitest.config.ts` or `vite.config.ts` — confirm in Wave 0 |
| **Quick run command** | `npx vitest run src/utils/cost.test.ts src/lib/queryKeys.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils/cost.test.ts src/lib/queryKeys.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | BUDG-01 | manual/integration | verify via Supabase dashboard + UI | N/A — migration | ⬜ pending |
| 16-02-01 | 02 | 1 | BUDG-02 | unit | `npx vitest run src/utils/cost.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 1 | BUDG-02 | unit (component) | `npx vitest run src/components/recipe/` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 2 | BUDG-03 | unit | `npx vitest run src/utils/cost.test.ts` | ❌ W0 | ⬜ pending |
| 16-04-01 | 04 | 1 | BUDG-04 | unit | `npx vitest run src/utils/cost.test.ts` | ❌ W0 | ⬜ pending |
| 16-05-01 | 05 | 1 | D-15/D-16 | unit | `npx vitest run src/lib/queryKeys.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/cost.test.ts` — stubs for BUDG-02, BUDG-03, BUDG-04 (normalisation, cost-per-serving, partial count)
- [ ] `src/lib/queryKeys.test.ts` — verifies factory functions return expected arrays (regression guard for migration)
- [ ] Confirm test runner: check `package.json` scripts for `"test"` entry to verify Vitest is installed

*If Vitest not installed, Wave 0 must add it.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| weekly_budget field saves via Settings and inline edit | BUDG-01 | Supabase migration + UI flow | 1. Set budget in Settings 2. Verify value persists on Plan page |
| Budget section renders below plan grid | D-01 | Visual layout | 1. Navigate to Plan page 2. Verify collapsible budget section below grid |
| Inline price prompt in recipe builder | D-10 | UI interaction | 1. Add ingredient without price 2. Verify "Set price" field appears |
| Food Prices section in Settings | D-11 | UI layout | 1. Navigate to Settings 2. Verify Food Prices section with price list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
