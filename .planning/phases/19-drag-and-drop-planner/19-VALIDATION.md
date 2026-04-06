---
phase: 19
slug: drag-and-drop-planner
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
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
| 19-01-01 | 01 | 1 | PLAN-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 1 | PLAN-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 19-03-01 | 03 | 2 | PLAN-01 | — | N/A | manual | Browser test | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `@dnd-kit/core` and `@dnd-kit/sortable` npm packages installed
- [ ] DB migration for `is_locked` column on `meal_plan_slots`

*Existing vitest infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Touch drag vs scroll on mobile | PLAN-01 | Requires physical touch device | Drag handle initiates drag; card body scrolls |
| Cross-day drag on mobile carousel | PLAN-01 | CSS scroll-snap + touch interaction | Drag meal to adjacent visible day slot |
| Drop action menu (Swap/Replace) | PLAN-01 | Visual interaction flow | Drop on occupied slot → menu appears → select action |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
