---
phase: 09-dead-code-removal-theme-token-cleanup
plan: "01"
subsystem: ui
tags: [react, tailwind, dead-code, theme-tokens, dark-mode]

# Dependency graph
requires: []
provides:
  - Dead hook usePortionSuggestions removed (was exported but never imported)
  - applyStoredTheme made private in theme.ts (internal helper only)
  - Sidebar comingSoon branch removed (property never set in navItems)
  - OfflineBanner uses theme tokens (bg-accent/20 text-text) instead of hardcoded amber classes
affects: [10-performance-audit-and-optimizations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Theme-aware status banners use bg-accent/20 text-text for dark mode compatibility"

key-files:
  created: []
  modified:
    - src/hooks/useFoodLogs.ts
    - src/utils/theme.ts
    - src/components/layout/Sidebar.tsx
    - src/components/log/OfflineBanner.tsx
  deleted:
    - src/hooks/usePortionSuggestions.ts

key-decisions:
  - "Existing amber warning indicators in FoodSearch and plan components (nutrition warning tooltip, macro warning badge) are out of scope — those are intentional warning-color uses, not theme bypasses"

patterns-established:
  - "Status banners use bg-accent/20 text-text border-b border-accent/40 for theme-adaptive styling"

requirements-completed: [TRCK-05, PLAT-03, POLISH-01]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 09 Plan 01: Dead Code Removal and Theme Token Cleanup Summary

**Four v1.1 audit findings closed: dead hook deleted, orphaned export made private, dead navigation branch removed, OfflineBanner converted from hardcoded amber to adaptive theme tokens**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T16:11:57Z
- **Completed:** 2026-03-15T16:13:53Z
- **Tasks:** 2
- **Files modified:** 4 modified, 1 deleted

## Accomplishments

- Deleted `usePortionSuggestions.ts` — hook was exported but never imported anywhere; PlanGrid.tsx implements the same logic inline
- Removed `export` keyword from `applyStoredTheme` in theme.ts — function is only called internally by `toggleTheme`
- Removed `comingSoon` ternary branch from Sidebar.tsx — the `navItems` array never includes a `comingSoon` property, making the branch unreachable
- Replaced `bg-amber-100 text-amber-800` with `bg-accent/20 text-text border-b border-accent/40` in OfflineBanner — now adapts automatically to dark mode via CSS variable overrides

## Task Commits

1. **Task 1: Remove dead code** - `08656ad` (chore)
2. **Task 2: Fix OfflineBanner theme tokens** - `8e47953` (fix)

## Files Created/Modified

- `src/hooks/usePortionSuggestions.ts` - DELETED (dead hook, never imported)
- `src/hooks/useFoodLogs.ts` - Removed dead reference to usePortionSuggestions in JSDoc
- `src/utils/theme.ts` - Removed `export` from `applyStoredTheme` (now private)
- `src/components/layout/Sidebar.tsx` - Removed unreachable `comingSoon` ternary branch
- `src/components/log/OfflineBanner.tsx` - Replaced hardcoded amber classes with theme tokens

## Decisions Made

Existing amber classes in FoodSearch.tsx (nutrition warning tooltip), PortionSuggestionRow.tsx, and SlotCard.tsx (macro warning badges) were left unchanged — these are intentional warning-color UI elements outside the plan's scope. The plan targets only OfflineBanner and those files are not listed in `files_modified`.

## Deviations from Plan

None — plan executed exactly as written.

Note: The plan's overall verification step #3 (`grep -r "amber" src/` returns zero results) is not fully achievable without changing out-of-scope warning indicator components. The pre-existing amber uses in FoodSearch and plan slot components were logged but not modified per scope discipline.

## Issues Encountered

The vitest run with pre-existing uncommitted working tree changes (AuthContext.tsx, AuthForm.tsx, useHousehold.ts from previous phases) produced 5 test failures unrelated to this plan's changes. Verified by running tests against committed state only — all 100 tests pass with Task 1 and Task 2 changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Codebase has four fewer dead code items (INT-01, INT-02, INT-03 from v1.1 audit closed)
- OfflineBanner is now theme-compatible; remaining amber warning indicators can be addressed in a future cleanup pass
- TypeScript compiles without errors; all 100 tests pass

---
*Phase: 09-dead-code-removal-theme-token-cleanup*
*Completed: 2026-03-15*
