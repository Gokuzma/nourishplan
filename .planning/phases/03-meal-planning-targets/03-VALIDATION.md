---
phase: 3
slug: meal-planning-targets
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test -- --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --reporter=verbose`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | MEAL-01 | unit | `npm test -- nutrition.test.ts -t "calcMealNutrition"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | MEAL-06 | unit | `npm test -- nutrition.test.ts -t "calcDayNutrition"` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | MEAL-02 | unit | `npm test -- meal-plan.test.ts -t "getWeekStart"` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | MEAL-04 | unit | `npm test -- meal-plan.test.ts -t "swap slot"` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | MEAL-05 | unit | `npm test -- meal-plan.test.ts -t "template"` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 1 | MEAL-03 | manual | N/A — requires live Supabase | manual | ⬜ pending |
| 03-04-01 | 04 | 2 | TRCK-01 | unit | `npm test -- nutrition-targets.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 2 | TRCK-02 | unit | `npm test -- nutrition-targets.test.ts -t "micronutrients"` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 2 | TRCK-03 | unit | `npm test -- nutrition-targets.test.ts -t "custom goals"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/nutrition.test.ts` — extend with `calcMealNutrition` and `calcDayNutrition` tests (MEAL-01, MEAL-06)
- [ ] `tests/meal-plan.test.ts` — `getWeekStart` pure function tests, slot swap logic (MEAL-02, MEAL-04, MEAL-05)
- [ ] `tests/nutrition-targets.test.ts` — upsert hook mocks, JSONB field handling (TRCK-01, TRCK-02, TRCK-03)

*Vitest already installed and configured — no framework setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Household member can read shared meal plan | MEAL-03 | RLS policies require live Supabase instance with multiple auth sessions | 1. Log in as user A, create plan. 2. Log in as user B (same household), verify plan visible. 3. Log in as user C (different household), verify plan NOT visible. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
