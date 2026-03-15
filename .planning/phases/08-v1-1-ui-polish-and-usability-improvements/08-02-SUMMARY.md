---
phase: 08-v1-1-ui-polish-and-usability-improvements
plan: 02
subsystem: ui-theme
tags: [dark-mode, css-tokens, progress-ring, tailwind, svg]
dependency_graph:
  requires: []
  provides: [dark-mode-tokens, theme-aware-progress-ring]
  affects: [src/styles/global.css, src/components/plan/ProgressRing.tsx]
tech_stack:
  added: []
  patterns: [css-custom-properties-dark-mode, svg-currentcolor-opacity]
key_files:
  modified:
    - src/styles/global.css
    - src/components/plan/ProgressRing.tsx
decisions:
  - "bgColor defaults to 'currentColor' for ProgressRing background — inherits text color, adapts to light/dark without explicit logic"
  - "strokeOpacity 0.12 for currentColor (subtle adaptive track), 0.20 for explicit colors (slightly more visible)"
  - "Dark secondary token set to #2A2E2A (dark neutral) — warm cream #F5EDE3 is invisible on dark backgrounds"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-15"
  tasks_completed: 2
  files_modified: 2
requirements: [POLISH-01, POLISH-02]
---

# Phase 8 Plan 02: Dark Mode Token Fixes and Theme-Aware ProgressRing Summary

Dark mode color tokens added for primary/secondary/accent and ProgressRing background track made adaptive using currentColor at low opacity.

## What Was Built

Two targeted changes to fix dark mode visibility gaps:

1. **Dark mode CSS tokens** — the `.dark` block in `src/styles/global.css` previously only overrode `text`, `background`, and `surface`. Added `primary` (#B8D4B0 lightened sage), `secondary` (#2A2E2A dark neutral), and `accent` (#F0C4B2 lightened peach). All Tailwind utility classes using these tokens now render correctly in dark mode.

2. **ProgressRing theme awareness** — the background ring stroke was hardcoded to `#E8B4A2` (light peach), which disappears on dark backgrounds. Replaced with a `bgColor` prop defaulting to `'currentColor'` at 12% opacity — the SVG text color (#3D3D3D light, #E8E5E0 dark) provides a subtle but visible track in both modes. Existing callers in DayCard pass no `bgColor` and automatically benefit from the new default.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add dark mode tokens for primary, secondary, accent | 9c240aa | src/styles/global.css |
| 2 | Make ProgressRing background track theme-aware | 072a82a | src/components/plan/ProgressRing.tsx |

## Verification

- Dark mode block confirmed to have all 6 color token overrides (text, background, surface, primary, secondary, accent)
- No `#E8B4A2` hardcode remains in ProgressRing.tsx
- `bgColor`, `strokeOpacity`, and `currentColor` present in ProgressRing
- Pre-existing test failures in auth.test.ts and AuthContext.test.tsx are unrelated to these changes (confirmed by file scope)
- 81 tests pass, 8 test files pass

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/styles/global.css — FOUND, contains all 6 dark tokens
- src/components/plan/ProgressRing.tsx — FOUND, contains bgColor prop, no hardcoded #E8B4A2
- Commit 9c240aa — FOUND
- Commit 072a82a — FOUND
