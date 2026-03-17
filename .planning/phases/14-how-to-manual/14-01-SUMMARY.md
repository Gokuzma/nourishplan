---
phase: 14-how-to-manual
plan: "01"
subsystem: guide
tags: [docs, in-app-guide, navigation, accessibility]
dependency_graph:
  requires: []
  provides: [GuidePage at /guide, User Guide nav items]
  affects: [src/App.tsx, src/components/layout/MobileDrawer.tsx, src/components/layout/Sidebar.tsx]
tech_stack:
  added: []
  patterns: [source-check tests, accordion with aria-expanded/aria-controls, deep-link hash support]
key_files:
  created:
    - src/pages/GuidePage.tsx
    - tests/guide.test.ts
  modified:
    - src/App.tsx
    - src/components/layout/MobileDrawer.tsx
    - src/components/layout/Sidebar.tsx
decisions:
  - Accordion uses single-open pattern (one section open at a time) — keeps guide scannable
  - Deep-link uses setTimeout(100ms) before scrollIntoView — allows React to render expanded section first
  - User Guide placed last in both nav arrays — lower priority nav item, after Settings
key_decisions:
  - Accordion uses single-open pattern (one section open at a time) — keeps guide scannable
  - Deep-link uses setTimeout(100ms) before scrollIntoView — allows React to render expanded section first
  - User Guide placed last in both nav arrays — lower priority nav item, after Settings
metrics:
  duration_seconds: 155
  completed_date: "2026-03-17T23:00:28Z"
  tasks_completed: 3
  files_created: 2
  files_modified: 3
---

# Phase 14 Plan 01: How-To Manual Summary

**One-liner:** In-app how-to guide at /guide with 6 accordion sections, deep-link hash navigation, and nav links in MobileDrawer and Sidebar.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create source-check test scaffold for DOCS-01 | f23c96b | tests/guide.test.ts |
| 2 | Create GuidePage with accordion sections and guide content | f50ed6f | src/pages/GuidePage.tsx |
| 3 | Add /guide route and navigation links | 1c98a54 | src/App.tsx, MobileDrawer.tsx, Sidebar.tsx |

## What Was Built

A full in-app user guide at `/guide` accessible from both mobile (MobileDrawer) and desktop (Sidebar) navigation.

**GuidePage features:**
- Quick-start card always visible at top with 5-step onboarding sequence
- 6 accordion sections covering all major features: Getting Started, Adding Foods, Building Recipes, Creating a Meal Plan, Tracking Your Day, Household Admin Tasks
- Single-open accordion pattern (one section at a time)
- Deep-link hash support: `/guide#recipes` auto-opens and scrolls to the Recipes section
- Accessible accordion buttons with `aria-expanded` and `aria-controls`
- Friendly second-person tone ("Tap", "Head to", "You can")
- Content verified against actual page implementations (HomePage, RecipesPage, HouseholdPage, etc.)

**Navigation:**
- `User Guide` nav item added as last item in MobileDrawer (after Settings)
- `User Guide` nav item added as last item in Sidebar (after Settings)
- `/guide` route added inside AppShell layout (auth + household required)

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

All 6 source-check tests in `tests/guide.test.ts` pass:
- GuidePage route exists in App.tsx
- GuidePage contains all 6 major feature sections
- MobileDrawer has User Guide nav item
- Sidebar has User Guide nav item
- GuidePage has deep-link hash support
- GuidePage has quick-start card

Pre-existing test failures in `tests/AppShell.test.tsx` (looking for removed 'Foods' nav item from Phase 12), `tests/auth.test.ts`, and `tests/AuthContext.test.tsx` are unrelated to this plan's changes.

## Self-Check: PASSED
