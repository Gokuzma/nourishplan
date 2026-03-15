---
phase: 12
slug: home-page-food-search-redesign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
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
| 12-01-01 | 01 | 1 | UXLOG-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | UXLOG-01, UXLOG-04 | manual | visual inspection | N/A | ⬜ pending |
| 12-02-01 | 02 | 2 | UXLOG-03 | manual | visual inspection | N/A | ⬜ pending |
| 12-02-02 | 02 | 2 | UXLOG-01 | manual | visual inspection | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Search overlay opens from home page search bar | UXLOG-01 | Visual/interaction behavior | Tap search bar on home page, verify full-screen overlay appears |
| Inline portion picker in search results | UXLOG-04 | Visual/interaction behavior | Tap a food result, verify inline portion stepper expands |
| Micronutrient drill-down on logged items | UXLOG-03 | Visual/interaction behavior | Tap a logged food entry, verify micronutrient expansion appears |
| Food tab removed from TabBar | UXLOG-01 | Visual inspection | Verify only Home/Recipes/Plan/More tabs visible |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
