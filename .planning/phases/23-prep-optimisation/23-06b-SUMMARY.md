---
phase: 23
plan: 06b
subsystem: cook-mode
tags: [cook-mode, ui, components, collaborative, entry-points]
requires: [23-01, 23-02, 23-03, 23-03b, 23-05]
provides: [CookStepCard, CookStepTimer, MemberLaneHeader, MultiMealSwitcher, CookEntryPointOnRecipeDetail]
affects: [RecipeBuilder]
tech-stack:
  added: []
  patterns: [useActiveCookSessions, useHouseholdMembers, useNavigate]
key-files:
  created:
    - src/components/cook/CookStepCard.tsx
    - src/components/cook/CookStepTimer.tsx
    - src/components/cook/MemberLaneHeader.tsx
    - src/components/cook/MultiMealSwitcher.tsx
    - src/components/cook/CookEntryPointOnRecipeDetail.tsx
  modified:
    - src/components/recipe/RecipeBuilder.tsx
decisions:
  - "CookStepCard onCheckOff prop renamed to _onCheckOff: check-off is orchestrated by CookStepPrimaryAction in parent; CookStepCard itself only renders the step state"
  - "MemberLaneHeader reads useHouseholdMembers for swap-owner picker; members without profiles fall back to 'Member' label"
  - "CookEntryPointOnRecipeDetail disabled state uses instructions===null (not array length) matching D-20b spec: null means not yet AI-generated"
metrics:
  duration: "~30 min"
  completed: "2026-04-12"
  tasks: 2
  files: 6
requirements: [PREP-02]
---

# Phase 23 Plan 06b: Cook Mode Step-Level UI Components and Entry Points Summary

Step-level Cook Mode components and recipe entry point: CookStepCard with three-state rendering, CookStepTimer with countdown/warning/done states, MemberLaneHeader with swap-owner, MultiMealSwitcher pill strip for concurrent sessions, and CookEntryPointOnRecipeDetail wired into RecipeBuilder.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CookStepCard, CookStepTimer, MemberLaneHeader | d847b52 | src/components/cook/CookStepCard.tsx, CookStepTimer.tsx, MemberLaneHeader.tsx |
| 2 | MultiMealSwitcher, CookEntryPointOnRecipeDetail, RecipeBuilder wiring | e5908f3 | src/components/cook/MultiMealSwitcher.tsx, CookEntryPointOnRecipeDetail.tsx, src/components/recipe/RecipeBuilder.tsx |

## Component APIs

### CookStepCard

```typescript
interface CookStepCardProps {
  step: RecipeStep
  stepState: CookSessionStepState
  stepNumber: number
  isActive: boolean
  ownerName: string | null
  onCheckOff?: () => void       // reserved for parent orchestration
  onTimerStart: () => void
  onTimerPause: () => void
  onTimerReset: () => void
  onTimerSkip: () => void
  onTimerComplete: () => void
  timerSecondsRemaining: number | null
  timerRunning: boolean
}
```

Three-state rendering:
- **Completed** (`stepState.completed_at !== null`): `bg-secondary/60`, line-through text, completion time right-aligned. Step circle uses `bg-primary/40`.
- **Active** (`isActive && !completed`): `bg-surface border-2 border-primary shadow-sm`. Step circle `bg-primary`. Shows: Hands-on/Passive wait chip, ingredients_used, equipment, owner chip ("{name} is doing this"), CookStepTimer when `duration_minutes > 0 && timerSecondsRemaining !== null`.
- **Inactive** (default): `bg-secondary opacity-60`. Step circle border-only. Duration pill right-aligned. Owner initial avatar if assigned.

### CookStepTimer

```typescript
interface CookStepTimerProps {
  secondsRemaining: number
  totalSeconds: number
  isRunning: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onSkip: () => void
  onComplete: () => void
}
```

- Display: `text-sm font-bold tabular-nums` countdown in "M:SS" format centered over a 64px ProgressRing.
- **Running (>60s)**: primary color text and ring.
- **Warning (<60s)**: `text-amber-500`, amber ring, `animate-pulse` on entire block.
- **Done (0s)**: check icon + "Done", `text-primary`, `animate-bounce`. Shows "Mark complete" button with `animate-pulse`.
- Controls: Start/Resume | Pause | Reset (when paused+partial) | Skip (text link, no button chrome).
- Skip flow: pauses timer, shows inline "Skip the rest of this wait?" confirmation with Skip/Keep waiting.

### MemberLaneHeader

```typescript
interface MemberLaneHeaderProps {
  memberId: string
  memberName: string
  avatarUrl: string | null
  stepsCompleted: number
  stepsTotal: number
  onSwapOwner: (newMemberId: string) => void
}
```

- `sticky top-[52px] bg-background/95 backdrop-blur-sm` — sticks below the CookModeShell top bar.
- Shows member avatar (or initial circle), uppercase name, "X of Y done" count, "Swap owner" button.
- Swap owner opens an inline dropdown populated from `useHouseholdMembers()`. Current member highlighted. Selection calls `onSwapOwner(newMemberId)` when a different member is chosen.

### MultiMealSwitcher

```typescript
interface MultiMealSwitcherProps {
  currentSessionId: string
  onSwitch: (sessionId: string) => void
}
```

- Reads `useActiveCookSessions()` — renders `null` when `sessions.length <= 1` (not visible for single session).
- `role="tablist"` container with `role="tab" aria-selected` per pill.
- Pills: active = `bg-primary text-white`, inactive = `bg-secondary text-text/60`.
- Status dot: 6px circle — `bg-primary` (in_progress), `bg-accent/60` (paused), `bg-text/30` (completed).
- `max-w-[40vw] overflow-x-auto scrollbar-none` with `shrink-0` pills for horizontal scroll.

### CookEntryPointOnRecipeDetail

```typescript
interface CookEntryPointOnRecipeDetailProps {
  recipe: Recipe
}
```

- Full-width on mobile, `sm:w-[200px]` on desktop.
- **Normal state**: chef's hat icon + "Cook this recipe". Navigates to `/cook/${recipe.id}?source=recipe`.
- **Disabled state** (`recipe.instructions === null`): spinner + "Preparing steps...", `opacity-60 cursor-not-allowed`. Auto-re-enables when TanStack Query refetches the recipe with non-null instructions.

## RecipeBuilder Modification

Added two lines to `src/components/recipe/RecipeBuilder.tsx`:
1. Import: `import { CookEntryPointOnRecipeDetail } from '../cook/CookEntryPointOnRecipeDetail'`
2. JSX in the recipe metadata section (between Freezer toggle and Mark as Cooked button): `{recipe && <CookEntryPointOnRecipeDetail recipe={recipe} />}`

All Plan 04 additions preserved:
- `RecipeStepsSection` import and JSX block — intact
- `RecipeFreezerToggle` import and JSX block — intact
- `useRecipeSteps` / `useRegenerateRecipeSteps` hooks — intact
- D-03 eager step regeneration logic on ingredient mutations — intact

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all components are fully implemented. CookEntryPointOnRecipeDetail navigates to `/cook/:id` which is the route implemented in Plan 06.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: navigation | src/components/cook/CookEntryPointOnRecipeDetail.tsx | Navigates with recipe.id; no mutation. T-23-12b: accept disposition. RLS scopes the cook session query on the target route. |

## Self-Check: PASSED

All 5 created files exist on disk. Both task commits (d847b52, e5908f3) present in git log. Build succeeds (`vite build` clean). AppShell test passes (5/5). No modifications to Sidebar, TabBar, or MobileDrawer.
