---
phase: 23
plan: "06"
subsystem: cook-mode
tags: [cook-mode, routes, ui, realtime, collaborative, PREP-02]
dependency_graph:
  requires: [23-01, 23-02, 23-03, 23-03b, 23-05]
  provides: [cook-mode-routes, cook-mode-shell, cook-mode-page, standalone-cook-picker]
  affects: [src/App.tsx]
tech_stack:
  added: []
  patterns: [full-page-route-outside-appshell, flow-mode-state-machine, stable-step-ids-R02]
key_files:
  created:
    - src/pages/CookModePage.tsx
    - src/pages/StandaloneCookPickerPage.tsx
    - src/components/cook/CookModeShell.tsx
    - src/components/cook/CookProgressBar.tsx
    - src/components/cook/CookStepPrimaryAction.tsx
    - src/components/cook/ReheatSequenceCard.tsx
    - src/components/cook/MultiMealPromptOverlay.tsx
  modified:
    - src/App.tsx
decisions:
  - Cook Mode routes registered outside AppShell layout route following the /offline pattern
  - CookModePage uses FlowMode state machine (loading/resume-prompt/multi-meal-prompt/reheat/cook) driven by useEffect to keep all branching logic in one place
  - schedule_status cast via intersection type on MealPlanSlot since Phase 21 column not yet in database.ts interface; plan 23-06b or migration update will add it cleanly
  - Inline step card rendering in CookModePage — Plan 06b replaces with CookStepCard component per plan spec
  - ReheatSequenceCard provides fallback static steps when recipe has no AI-generated instructions
metrics:
  duration: "4 minutes"
  completed: "2026-04-12"
  tasks_completed: 1
  files_changed: 8
requirements_satisfied: [PREP-02]
---

# Phase 23 Plan 06: Cook Mode Routes, Shell, and CookModePage Summary

Cook Mode route family, shell components, and main page component implementing PREP-02 part 1. Three routes outside AppShell, full-page CookModeShell with D-21 flow branching via schedule_status lookup, stable step IDs (R-02), session resume (D-22), and standalone cook picker.

## What Was Built

### Route Registration (App.tsx)

Three new routes added OUTSIDE the `<Route element={<AppShell />}>` block, before `/offline`:

```
/cook                          → StandaloneCookPickerPage
/cook/session/:sessionId       → CookModePage (resume by session ID)
/cook/:mealId                  → CookModePage (open from meal/recipe)
```

The `/cook` route is listed first so the static segment matches before the dynamic `:mealId` segment.

### CookModeShell (`src/components/cook/CookModeShell.tsx`)

Full-page layout: `min-h-screen flex flex-col bg-background`. Contains:
- Sticky top bar with back button (exit confirmation when progress exists), meal name + subtitle, MultiMealSwitcher pill strip (D-26) when `concurrentSessions.length > 1`
- `CookProgressBar` directly below top bar
- Scrollable body with `pb-32` clearing the fixed footer
- Inline exit confirmation overlay (backdrop blur modal)

### CookModePage (`src/pages/CookModePage.tsx`) — D-21 Flow Branching

The page reads `slotId` and `planId` from search params, calls `useMealPlanSlots(planId)`, finds the slot by `slotId`, and extracts `schedule_status` for flow branching. A `FlowMode` state machine drives which view renders:

| FlowMode | Trigger | Renders |
|----------|---------|---------|
| `loading` | Initial / hooks pending | Spinner |
| `resume-prompt` | Existing active session for meal (D-22) | Resume / Start fresh modal |
| `multi-meal-prompt` | `schedule_status === 'prep'` | `MultiMealPromptOverlay` |
| `reheat` | `schedule_status === 'consume'` | `ReheatSequenceCard` |
| `cook` | Default / session loaded | Full step sequence in `CookModeShell` |

### R-02: Stable Step IDs

Step state keys (`step_state.steps`) use stable step UUIDs from `RecipeStep.id`, not array indexes. The page maps live recipe instructions by step ID: `stepsById = new Map(liveSteps.map(s => [s.id, s]))`. Steps whose IDs are not in the live recipe are silently ignored (deleted step handling per R-02 resolution).

### Shell Components

- **CookProgressBar**: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext="{N} of {M} steps complete"`
- **CookStepPrimaryAction**: Fixed footer button, labels: Mark complete / Start timer / Mark complete now / Finish cook session / Exit cook mode. Accepts `pulse` prop for `animate-pulse`
- **ReheatSequenceCard**: Condensed reheat view — "Reheat from {fridge|freezer}" heading, checkbox step list, fixed "Done reheating" footer button
- **MultiMealPromptOverlay**: Centered modal, "Combined sequence" (primary) / "One recipe at a time" (secondary), auto-focuses Combined button on mount, "Back" text link

### StandaloneCookPickerPage (`src/pages/StandaloneCookPickerPage.tsx`)

Layout matches `px-4 py-6 font-sans pb-[64px]` convention but renders outside AppShell (top-level route per D-20c). Contains:
- Resume in-progress section: `useActiveCookSessions` → session cards with step count + relative timestamp
- Recipe list with search filter, `FreezerBadge` inline on freezer-friendly recipes, "Cook" button navigates to `/cook/{recipeId}?source=recipe`
- Empty state with link to `/recipes/new`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused CookProgressBar import from CookModePage**
- **Found during:** TypeScript build check (TS6133 error)
- **Issue:** CookProgressBar was imported in CookModePage but only used inside CookModeShell, causing a "declared but never read" error
- **Fix:** Removed the import; CookModeShell handles its own CookProgressBar inclusion
- **Files modified:** src/pages/CookModePage.tsx
- **Commit:** 2126436

**2. [Rule 2 - Missing handling] schedule_status type cast**
- **Found during:** Implementation
- **Issue:** MealPlanSlot in database.ts doesn't include `schedule_status` (Phase 21 migration column exists in DB but TS type wasn't updated in this worktree's scope)
- **Fix:** Used intersection cast `(currentSlot as { schedule_status?: 'prep' | 'consume' | 'quick' | 'away' } | null)?.schedule_status` so runtime works correctly while TS is type-safe
- **Files modified:** src/pages/CookModePage.tsx

## Known Stubs

- Inline step cards in CookModePage (lines ~215-280) are placeholder rendering — Plan 06b replaces with `CookStepCard` component that adds active/inactive visual states, timer block, and lane owner chips per UI-SPEC
- ReheatSequenceCard falls back to 3 static reheat steps when recipe has no AI-generated instructions — Plan 06b or a future plan wires up the `generate-reheat-sequence` edge function
- MultiMealPromptOverlay uses hardcoded `recipeCount={2}` — needs real recipe count from session/slot data, to be wired in Plan 06b
- CookModeShell MultiMealSwitcher shows `session.meal_id` as pill label — needs meal name lookup for proper display (Plan 06b)

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: url-param-injection | src/pages/CookModePage.tsx | mealId and sessionId from URL params passed to Supabase queries; RLS on cook_sessions enforces household isolation (T-23-07, T-23-11 mitigated) |

## Self-Check: PASSED

All 8 files found on disk. Commit 2126436 verified in git log. AppShell test (5/5) passes. No new TypeScript errors in created/modified files (baseline 114 pre-existing errors unchanged).
