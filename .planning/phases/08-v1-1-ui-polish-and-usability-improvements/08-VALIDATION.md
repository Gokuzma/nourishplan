---
phase: 8
slug: v1-1-ui-polish-and-usability-improvements
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | vite.config.ts (Vitest config embedded) |
| **Quick run command** | `npm test -- --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- tests/nutrition-targets.test.ts tests/nutrition.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | Dark mode tokens | unit | `npm test -- tests/theme.test.ts` | ✅ (extend) | ⬜ pending |
| 08-02-01 | 02 | 1 | ProgressRing bgColor | unit | `npm test -- tests/nutrition.test.ts` | ✅ (extend) | ⬜ pending |
| 08-03-01 | 03 | 2 | Macro % conversion | unit | `npm test -- tests/nutrition-targets.test.ts` | ✅ (extend) | ⬜ pending |
| 08-03-02 | 03 | 2 | Macro % validation (sum=100) | unit | `npm test -- tests/nutrition-targets.test.ts` | ✅ (extend) | ⬜ pending |
| 08-04-01 | 04 | 2 | Unit conversion math | unit | `npm test -- tests/nutrition.test.ts` | ❌ W0 | ⬜ pending |
| 08-05-01 | 05 | 2 | Avatar upload hook | unit (mock) | `npm test -- tests/useProfile.test.ts` | ❌ W0 | ⬜ pending |
| 08-05-02 | 05 | 2 | Household admin update | integration | manual (RLS) | manual-only | ⬜ pending |
| 08-06-01 | 06 | 2 | Drawer open/close | component | `npm test -- tests/TabBar.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/useProfile.test.ts` — avatar upload hook, display_name upsert (mock supabase.storage)
- [ ] `tests/TabBar.test.tsx` — "More" item renders, click opens drawer
- [ ] Unit conversion test block in `tests/nutrition.test.ts` — `totalGrams = qty * unit.grams`

*Existing test files cover dark mode tokens, ProgressRing, macro conversion, and macro validation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Household name update (admin vs non-admin) | RLS admin-only UPDATE | RLS policies require real Supabase auth context | 1. Log in as admin, edit household name, verify save. 2. Log in as non-admin, attempt edit, verify rejection |
| Dark mode visual audit | Ring/component visibility | Visual appearance check | Toggle dark mode, inspect all pages for contrast issues |
| CNF portion data accuracy | Measurement units | Depends on live external API | Search a CNF food, verify portion descriptions match Canada.ca data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
