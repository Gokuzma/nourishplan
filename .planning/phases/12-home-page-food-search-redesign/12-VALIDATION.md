---
phase: 12
slug: home-page-food-search-redesign
status: draft
nyquist_compliant: true
wave_0_complete: true
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

- **After every task commit:** Run targeted test command from task's `<automated>` verify
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-00 | 01 | 1 | UXLOG-02 | unit | `npx vitest run tests/useFoodSearch-scoring.test.ts` | Wave 0 (created by task) | ⬜ pending |
| 12-01-01 | 01 | 1 | UXLOG-02 | unit | `npx vitest run tests/useFoodSearch-scoring.test.ts` | ✅ (from 12-01-00) | ⬜ pending |
| 12-01-02 | 01 | 1 | UXLOG-04 | suite | `npx vitest run --reporter=verbose` | N/A | ⬜ pending |
| 12-02-00 | 02 | 2 | UXLOG-03 | unit | `npx vitest run tests/LogEntryItem.test.tsx` | Wave 0 (created by task) | ⬜ pending |
| 12-02-01 | 02 | 2 | UXLOG-01 | suite | `npx vitest run --reporter=verbose` | N/A | ⬜ pending |
| 12-02-02 | 02 | 2 | UXLOG-03 | unit | `npx vitest run tests/LogEntryItem.test.tsx` | ✅ (from 12-02-00) | ⬜ pending |
| 12-02-03 | 02 | 2 | UXLOG-01 | unit+fs | `npx vitest run && ! test -f src/pages/FoodsPage.tsx && ! test -f src/components/food/FoodSearch.tsx` | N/A | ⬜ pending |
| 12-02-04 | 02 | 2 | all | manual | visual inspection (checkpoint) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

| Test File | Requirement | Created By Task | Tests Cover |
|-----------|-------------|-----------------|-------------|
| `tests/useFoodSearch-scoring.test.ts` | UXLOG-02 | 12-01-00 | scoreFood scoring tiers, sort order |
| `tests/LogEntryItem.test.tsx` | UXLOG-03 | 12-02-00 | expand/collapse behavior, micronutrient display, Edit button |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Search overlay opens from home page search bar | UXLOG-01 | Visual/interaction behavior | Tap search bar on home page, verify full-screen overlay appears |
| Inline portion picker in search results | UXLOG-04 | Visual/interaction behavior | Tap a food result, verify inline portion stepper expands |
| Food tab removed from TabBar | UXLOG-01 | Visual inspection | Verify only Home/Recipes/Plan/More tabs visible |
| File deletion of FoodsPage.tsx and FoodSearch.tsx | UXLOG-01 | Filesystem check | Automated via `! test -f` in Task 12-02-03 verify |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
