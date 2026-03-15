---
phase: 09
slug: dead-code-removal-theme-token-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | TRCK-05 | automated | `npx tsc --noEmit` + grep usePortionSuggestions returns 0 | N/A | ⬜ pending |
| 09-01-02 | 01 | 1 | POLISH-01 | automated | `grep -r "export function applyStoredTheme" src/` returns 0 | N/A | ⬜ pending |
| 09-01-03 | 01 | 1 | PLAT-03, POLISH-01 | automated + manual | `grep -r "amber" src/` returns 0 + visual dark mode check | N/A | ⬜ pending |
| 09-01-04 | 01 | 1 | N/A | automated | `grep -r "comingSoon" src/` returns 0 | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OfflineBanner renders correctly in dark mode | PLAT-03, POLISH-01 | Visual appearance on dark background | Toggle dark mode, disconnect network, verify banner is visible with correct contrast |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
