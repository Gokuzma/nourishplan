---
phase: 18
slug: grocery-list-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/utils/groceryGeneration.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils/groceryGeneration.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | GROC-01 | unit | `npx vitest run src/utils/groceryGeneration.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | GROC-02 | unit | `npx vitest run src/utils/groceryGeneration.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-03 | 01 | 1 | GROC-03 | unit | `npx vitest run src/utils/groceryGeneration.test.ts` | ❌ W0 | ⬜ pending |
| 18-02-01 | 02 | 2 | GROC-04 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 18-02-02 | 02 | 2 | GROC-05 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/groceryGeneration.test.ts` — stubs for GROC-01, GROC-02, GROC-03 (generation, inventory subtraction, categorisation)
- [ ] Test fixtures for meal plan data, inventory items, food prices

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase realtime sync across members | GROC-05 | Requires two browser sessions with different users | Open two incognito tabs logged in as different household members, check off item in one, verify it appears checked in the other within 2 seconds |
| Check-off undo toast | GROC-04 | UI animation timing | Check off an item, verify toast appears within 300ms, tap Undo, verify item is unchecked |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
