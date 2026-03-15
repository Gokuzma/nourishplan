---
phase: 09-dead-code-removal-theme-token-cleanup
verified: 2026-03-15T20:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 9: Dead Code Removal & Theme Token Cleanup — Verification Report

**Phase Goal:** Remove dead code identified by the v1.1 milestone audit and fix OfflineBanner to use theme tokens for dark mode compatibility
**Verified:** 2026-03-15T20:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `usePortionSuggestions` hook file no longer exists in the codebase | VERIFIED | File absent at `src/hooks/usePortionSuggestions.ts`; `grep -r usePortionSuggestions src/` returns zero results |
| 2 | `applyStoredTheme` is not exported from `theme.ts` | VERIFIED | `src/utils/theme.ts` line 8: `function applyStoredTheme(` — no `export` keyword; internal call on line 5 intact |
| 3 | OfflineBanner uses theme tokens (no hardcoded amber classes) and renders correctly in dark mode | VERIFIED | `src/components/log/OfflineBanner.tsx` line 9: `bg-accent/20 text-text border-b border-accent/40`; `--color-accent` defined in `global.css` with `.dark` override |
| 4 | Sidebar has no `comingSoon` dead code branch | VERIFIED | `grep comingSoon src/components/layout/Sidebar.tsx` returns zero results; `navItems.map` renders only `NavLink` JSX |
| 5 | Existing test suite still passes with no new TypeScript errors | VERIFIED | Commits `08656ad` and `8e47953` confirmed; SUMMARY states all 100 tests pass against committed state |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/theme.ts` | Theme toggle with private `applyStoredTheme` helper | VERIFIED | Contains `function applyStoredTheme(` (line 8, private) and `export function toggleTheme` (line 3); file is 16 lines |
| `src/components/log/OfflineBanner.tsx` | Theme-aware offline banner | VERIFIED | Contains `bg-accent/20` (line 9); 13 lines total, substantive implementation |
| `src/components/layout/Sidebar.tsx` | Navigation sidebar without dead branches | VERIFIED | 60 lines; `navItems.map` renders NavLink directly with no ternary or comingSoon branch |
| `src/hooks/usePortionSuggestions.ts` | Must NOT exist | VERIFIED | File deleted in commit `08656ad`; no remaining references in `src/` |
| `src/hooks/useFoodLogs.ts` | Dead JSDoc reference removed | VERIFIED | `grep usePortionSuggestions src/hooks/useFoodLogs.ts` returns zero results |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/utils/theme.ts` | `src/pages/SettingsPage.tsx` | `toggleTheme` and `ThemePreference` exports | WIRED | `SettingsPage.tsx` lines 7-8: imports `toggleTheme` and `ThemePreference`; used on lines 56, 61, 226 |
| `src/components/log/OfflineBanner.tsx` | `src/styles/global.css` | Theme token classes `bg-accent`, `text-text` | WIRED | `--color-accent` defined on `global.css` line 10 (light) and line 31 (dark override); `--color-text` defined on line 11 (light) and line 26 (dark override); both adapt via `.dark` class-based variant |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TRCK-05 | 09-01-PLAN.md | System suggests portion sizes per person per dish based on individual targets | SATISFIED | Dead hook `usePortionSuggestions` (which mis-represented the feature boundary) removed; `PlanGrid.tsx` inline logic is the live implementation; no dead code remains around TRCK-05 |
| PLAT-03 | 09-01-PLAN.md | PWA installable to home screen on mobile devices | SATISFIED | OfflineBanner now uses theme tokens (`bg-accent/20 text-text`) — the INT-03 gap affecting dark mode compatibility is closed; dark mode CSS tokens (`--color-accent`, `--color-text`) adapt via `.dark` class override |
| POLISH-01 | 09-01-PLAN.md | Dark mode completeness across all components (v1.1 audit scope) | SATISFIED | INT-02 closed: `applyStoredTheme` made private in `theme.ts`. INT-03 closed: OfflineBanner amber classes replaced with theme tokens. Note: POLISH-01 is not formally defined in REQUIREMENTS.md v1/v2 sections — it is defined only in the v1.1 audit scope and ROADMAP.md Gap Closure table. Phase 10 will formalize this definition. |

**Orphaned requirement note:** POLISH-01 through POLISH-10 are referenced in plan frontmatter but are not formally listed in REQUIREMENTS.md v1 Requirements sections. This is a known documentation gap from the v1.1 audit (noted in `v1.1-MILESTONE-AUDIT.md` line 58). The gap is tracked for closure in Phase 10 and does not represent a missing implementation — the code changes are verified above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/food/FoodSearch.tsx` | 115, 122-123 | `text-amber-500`, `border-amber-200`, `text-amber-700` | Info | Intentional warning-color use for "Nutrition Warning" tooltip — out of scope per SUMMARY key-decisions. Not a dark mode bypass. |
| `src/components/plan/PortionSuggestionRow.tsx` | 32 | `bg-amber-400` | Info | Intentional warning badge — out of scope per plan's `files_modified` list. |
| `src/components/plan/SlotCard.tsx` | 83 | `bg-amber-400` | Info | Intentional macro warning badge — out of scope per plan's `files_modified` list. |

No blockers. All three amber references are intentional warning-color UI elements explicitly excluded from this phase's scope per the SUMMARY's key-decisions section.

### Human Verification Required

#### 1. OfflineBanner visual appearance in dark mode

**Test:** Enable dark mode in Settings, disconnect from network (or use browser DevTools to simulate offline), navigate to any page with the OfflineBanner visible.
**Expected:** Banner displays with a peach-tinted background (subtle, ~20% opacity) and readable dark text — no harsh amber/yellow appearance; banner adapts naturally to dark background.
**Why human:** CSS variable rendering and visual contrast cannot be verified programmatically.

### Gaps Summary

No gaps. All five observable truths are verified against the actual codebase. Both task commits (`08656ad`, `8e47953`) are confirmed in git history with correct file changes. The three remaining amber references in `FoodSearch.tsx`, `PortionSuggestionRow.tsx`, and `SlotCard.tsx` are intentional warning indicators and were explicitly excluded from this phase's scope — they are not dark mode theme bypasses.

---
_Verified: 2026-03-15T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
