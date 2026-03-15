---
phase: 11
slug: nutrition-calculation-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (inferred from Vite project) |
| **Config file** | `package.json` scripts or `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | CALC-01 | unit | `npm test -- --run src/utils/nutrition` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | CALC-01 | unit | `npm test -- --run src/utils/nutrition` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | CALC-02 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 1 | CALC-03 | visual/manual | Manual verification via Playwright | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Confirm test framework setup (check `package.json` for vitest/jest)
- [ ] `src/utils/nutrition.test.ts` — stubs for `calcIngredientNutrition` scaling, `calcLogEntryNutrition` multiplication
- [ ] Micronutrient aggregation test stubs

*If no test framework found: install vitest and create config.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Serving unit shows in log entry | CALC-03 | Visual UI check | Log a food, verify log entry shows "200g" or "1.5 cups" instead of "1 serving" |
| Micronutrient progress bars render | CALC-02 | Visual UI check | Log food with micronutrient data, check HomePage shows progress indicators |
| Live nutrition update on quantity change | CALC-01 | Interactive UI | Change ingredient quantity in recipe builder, verify calories update instantly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
