---
phase: 5
slug: portion-suggestions-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 |
| **Config file** | `vitest.config.ts` (or via `vite.config.ts`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD-01 | 01 | 1 | TRCK-05 | unit | `npm test -- --reporter=verbose tests/nutrition.test.ts` | ✅ extend | ⬜ pending |
| TBD-02 | 01 | 1 | TRCK-05 | unit | `npm test -- --reporter=verbose tests/nutrition.test.ts` | ✅ extend | ⬜ pending |
| TBD-03 | 01 | 1 | TRCK-05 | unit | `npm test -- --reporter=verbose tests/nutrition.test.ts` | ✅ extend | ⬜ pending |
| TBD-04 | 01 | 1 | TRCK-05 | unit | `npm test -- --reporter=verbose tests/nutrition.test.ts` | ✅ extend | ⬜ pending |
| TBD-05 | 02 | 1 | FOOD-02 | unit | `npm test -- --reporter=verbose tests/food-search.test.ts` | ✅ update | ⬜ pending |
| TBD-06 | 02 | 1 | FOOD-02 | unit | `npm test -- --reporter=verbose tests/food-search.test.ts` | ✅ update | ⬜ pending |
| TBD-07 | TBD | TBD | PLAT-03/04 | manual | Lighthouse on `npm run preview` | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/nutrition.test.ts` — add `calcPortionSuggestion` describe block (division-by-zero, no-target defaults, macro warning >20%)
- [ ] `tests/food-search.test.ts` — update OFF test stubs to CNF + unified search merge tests

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PWA passes Lighthouse audit (installable + offline) | PLAT-03/04 | Lighthouse requires browser + production build | `npm run build && npm run preview`, run Lighthouse against `localhost:4173`, verify PWA score ≥ 90 |
| Portion suggestions display correctly per member | TRCK-05 | Visual layout + interaction | Log in as demo user, navigate to meal plan, verify member columns show percentage + servings |
| Micronutrient expandable section renders | TRCK-05 | Visual component | Open a recipe in meal plan, expand micronutrients, verify fiber > sodium > minerals > vitamins order |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
