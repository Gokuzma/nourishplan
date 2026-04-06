---
phase: 20
slug: feedback-engine-dietary-restrictions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react |
| **Config file** | vite.config.ts (vitest block) / tests/setup.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | FEED-01 | T-20-01 | RLS: rated_by_user_id = auth.uid() | unit | `npx vitest run tests/ratings.test.ts` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | FEED-01 | — | RateMealsCard hidden when no cooked meals | unit | `npx vitest run tests/ratings.test.ts` | ❌ W0 | ⬜ pending |
| 20-02-01 | 02 | 1 | FEED-02 | T-20-02 | RLS: household isolation on restrictions | unit | `npx vitest run tests/restrictions.test.ts` | ❌ W0 | ⬜ pending |
| 20-03-01 | 03 | 1 | FEED-03 | T-20-03 | RLS: member-scoped won't-eat writes | unit | `npx vitest run tests/wontEat.test.ts` | ❌ W0 | ⬜ pending |
| 20-04-01 | 04 | 2 | FEED-04 | — | N/A | unit | `npx vitest run src/utils/monotonyDetection.test.ts` | ❌ W0 | ⬜ pending |
| 20-04-02 | 04 | 2 | FEED-04 | — | N/A | unit | `npx vitest run src/utils/monotonyDetection.test.ts` | ❌ W0 | ⬜ pending |
| 20-nav | TBD | TBD | — | — | N/A | existing | `npx vitest run tests/AppShell.test.tsx` | ✅ (update) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ratings.test.ts` — stubs for FEED-01 rating logic
- [ ] `tests/restrictions.test.ts` — stubs for FEED-02 restriction save/load
- [ ] `tests/wontEat.test.ts` — stubs for FEED-03 won't-eat CRUD
- [ ] `src/utils/monotonyDetection.test.ts` — stubs for FEED-04 rolling window logic
- [ ] `tests/AppShell.test.tsx` update — add "Insights" assertion (existing file, update not create)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI auto-tag generation on recipes | FEED-01 | Requires live AI API call | Trigger rating, verify tag appears on recipe card |
| AI restriction-to-ingredient mapping | FEED-02 | Requires live AI API call | Select "gluten-free", verify wheat/barley added to won't-eat |
| AI swap suggestions on monotony | FEED-04 | Requires live AI API + inventory data | Trigger monotony warning, verify swap suggestion appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
