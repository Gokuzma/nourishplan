---
phase: 2
slug: food-data-recipe-builder
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test -- tests/nutrition.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- tests/nutrition.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | FOOD-01 | unit | `npm test -- tests/food-search.test.ts -t usda` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | FOOD-02 | unit | `npm test -- tests/food-search.test.ts -t off` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | FOOD-03 | unit | `npm test -- tests/custom-food.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | FOOD-04 | unit | `npm test -- tests/custom-food.test.ts -t permissions` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | FOOD-05 | unit | `npm test -- tests/nutrition.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | FOOD-06 | manual | N/A — requires live Claude API key | N/A | ⬜ pending |
| 02-02-01 | 02 | 1 | RECP-01 | unit | `npm test -- tests/recipe-builder.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | RECP-02 | unit | `npm test -- tests/nutrition.test.ts -t recipe` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | RECP-03 | unit | `npm test -- tests/recipe-builder.test.tsx -t servings` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 1 | RECP-04 | unit | `npm test -- tests/nutrition.test.ts -t cycle` | ❌ W0 | ⬜ pending |
| 02-02-05 | 02 | 1 | RECP-05 | unit | `npm test -- tests/recipes.test.ts -t delete` | ❌ W0 | ⬜ pending |
| 02-02-06 | 02 | 1 | RECP-06 | unit | `npm test -- tests/nutrition.test.ts -t yield` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/nutrition.test.ts` — stubs for FOOD-05, RECP-02, RECP-04, RECP-06 (pure util functions)
- [ ] `tests/food-search.test.ts` — stubs for FOOD-01, FOOD-02 (mock `supabase.functions.invoke`)
- [ ] `tests/custom-food.test.ts` — stubs for FOOD-03, FOOD-04 (mock supabase client)
- [ ] `tests/recipe-builder.test.tsx` — stubs for RECP-01, RECP-03 (render with mocked hooks)
- [ ] `tests/recipes.test.ts` — stubs for RECP-05 (mock supabase mutation)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI verification Edge Function returns verified flag | FOOD-06 | Requires live Claude API key | Trigger search, confirm ⓘ icon appears, confirm ⚠️ on seeded outlier data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
