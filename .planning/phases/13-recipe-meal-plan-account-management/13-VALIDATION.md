---
phase: 13
slug: recipe-meal-plan-account-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | RCPUX-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DELMG-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ACCTM-01 | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/FoodSearchOverlay.test.tsx` — stubs for RCPUX-01 navigation behavior
- [ ] `tests/deletion.test.tsx` — stubs for DELMG-01 inline confirmation and permission gate

*Planner will finalize Wave 0 task assignments.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Account deletion flow | ACCTM-01 | Requires Supabase Edge Function + auth session | Verify via Playwright or manual testing |
| Print meal plan | MPLAN-02 | Browser print dialog is not automatable | Verify print CSS via screenshot |
| Meal plan start date | MPLAN-01 | Date picker interaction | Verify via Playwright |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
