---
phase: 14
slug: how-to-manual
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | vite.config.ts (vitest inline config) |
| **Quick run command** | `npx vitest run tests/guide.test.ts --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/guide.test.ts --reporter=verbose`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | DOCS-01 | source-check | `npx vitest run tests/guide.test.ts -t "route"` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | DOCS-01 | source-check | `npx vitest run tests/guide.test.ts -t "sections"` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | DOCS-01 | source-check | `npx vitest run tests/guide.test.ts -t "drawer"` | ❌ W0 | ⬜ pending |
| 14-01-04 | 01 | 1 | DOCS-01 | source-check | `npx vitest run tests/guide.test.ts -t "sidebar"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/guide.test.ts` — stubs for DOCS-01 (route exists, sections present, nav links added)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Guide content accuracy matches current app features | DOCS-01 | Content correctness requires reading guide text against app behavior | Read each section and verify steps match actual UI |
| Accordion expand/collapse works on mobile | DOCS-01 | Interaction testing needs browser | Open /guide on mobile viewport, tap each section header |
| Deep-link hash navigation scrolls to correct section | DOCS-01 | URL hash handling needs browser | Navigate to /guide#recipes, verify section opens and scrolls into view |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
