# Phase 9: Dead Code Removal & Theme Token Cleanup - Research

**Researched:** 2026-03-15
**Domain:** TypeScript dead code removal, Tailwind CSS 4 theme tokens, React component cleanup
**Confidence:** HIGH

## Summary

Phase 9 is a targeted cleanup phase with four well-defined surgical changes. All four targets were identified by the v1.1 milestone audit and confirmed by direct code inspection. There is no ambiguity about what to change — the audit report and current source files agree exactly.

The work divides into two categories: (1) dead code deletion — three files with dead branches or orphaned exports that can be cleanly removed without any caller changes, and (2) a theme token fix — OfflineBanner uses hardcoded `bg-amber-100 text-amber-800` Tailwind color classes that do not invert in dark mode, which needs replacement with project theme tokens.

The project uses Tailwind CSS 4 with CSS-first `@theme` tokens defined in `src/styles/global.css`. The token system includes semantic names (`bg-background`, `text-text`, `bg-surface`, `text-primary`) with dark mode overrides applied via the `.dark` class on `<html>`. There are no warning/amber theme tokens defined — the OfflineBanner fix requires choosing an appropriate semantic mapping.

**Primary recommendation:** Execute each of the four changes as a separate, focused task. Each change is independently verifiable and carries no blast radius to adjacent code.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRCK-05 | System suggests portion sizes per person per dish based on their individual targets | `usePortionSuggestions` hook is dead code — PlanGrid implements the same logic inline. Removing the hook does not affect TRCK-05 functionality since PlanGrid's inline implementation is the live code path. |
| PLAT-03 | PWA installable to home screen on mobile devices | OfflineBanner dark mode fix improves PWA polish in dark mode. No PWA manifest or service worker changes needed. |
| POLISH-01 | (Defined in v1.1 audit scope) Dark mode completeness across all components | OfflineBanner hardcoded amber classes fail dark mode. Fix brings it in line with Phase 8 dark mode work. |
</phase_requirements>

## Standard Stack

### Core (already present in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS 4 | 4.x | Utility CSS with CSS-first theme tokens | Project decision from Phase 1 |
| React | 19.x | Component rendering | Project stack |
| TypeScript | 5.x | Type checking, dead code detection | Project stack |

No new dependencies are needed for this phase. All changes are pure source file edits.

**Installation:** None required.

## Architecture Patterns

### Tailwind CSS 4 Theme Token System

This project uses CSS-first `@theme` in `src/styles/global.css`. Semantic color tokens are:
- `--color-primary`, `--color-secondary`, `--color-accent`
- `--color-text`, `--color-background`, `--color-surface`

Dark mode overrides are in `.dark { }` block and automatically apply when `document.documentElement.classList` contains `dark`.

Tailwind generates utility classes from these tokens:
- `bg-primary`, `bg-secondary`, `bg-accent`, `bg-background`, `bg-surface`
- `text-primary`, `text-secondary`, `text-accent`, `text-text`
- `border-primary`, `border-secondary`, etc.

**There is no `--color-warning` or amber token defined.** OfflineBanner must use existing semantic tokens.

### Recommended OfflineBanner Token Mapping

The banner needs visual distinction to indicate a warning/status state. Options using existing tokens:

| Option | Classes | Appearance |
|--------|---------|------------|
| Accent-based (recommended) | `bg-accent/20 text-text border-b border-accent/40` | Peach tint, adapts to dark mode via `--color-accent` override |
| Surface-based | `bg-surface text-text/70 border-b border-secondary` | Neutral, less visually distinct |

The accent token is `#E8B4A2` (peach) in light mode and `#F0C4B2` (lighter peach) in dark mode — both provide appropriate visual distinction for an offline warning without being harsh. Using `bg-accent/20` is consistent with how other components in the codebase use accent for subtle backgrounds.

### Dead Code Removal Pattern

**What:** Remove the entire file or export cleanly with no trace.
**When to use:** When a function/hook is exported but has zero import sites outside its own file.
**Approach:**
1. Confirm zero import sites via grep
2. Delete the file (or remove the export)
3. Verify no TypeScript errors (`npx tsc --noEmit`)

## Detailed Target Analysis

### Target 1: `usePortionSuggestions` hook (`src/hooks/usePortionSuggestions.ts`)

**Status:** DEAD CODE — exported, never imported.

**Evidence:**
- Grep of `usePortionSuggestions` in `src/` returns only the definition file and a JSDoc comment in `useFoodLogs.ts` (line 169: "Used by usePortionSuggestions to gather per-member logs") — no actual import sites.
- `PlanGrid.tsx` duplicates the same logic inline (lines 172–203) using `useMemo` over the same four data sources: `useNutritionTargets`, `useHouseholdDayLogs`, `useHouseholdMembers`, `useMemberProfiles`.

**Resolution:** Delete the entire file `src/hooks/usePortionSuggestions.ts`. Also remove the JSDoc reference in `useFoodLogs.ts` line 169. No callers exist, no refactor of PlanGrid is needed — the inline implementation is correct and already working.

**Risk:** None. The hook is never invoked.

### Target 2: `applyStoredTheme` export (`src/utils/theme.ts`)

**Status:** ORPHANED EXPORT — exported but never imported outside the file.

**Evidence:**
- `theme.ts` exports both `toggleTheme` and `applyStoredTheme`.
- Only `SettingsPage.tsx` imports from `theme.ts`, and it imports only `toggleTheme` and `ThemePreference`.
- `applyStoredTheme` is called internally by `toggleTheme` — it is a private helper that was mistakenly exported.
- `main.tsx` does not call it. `AppShell.tsx` does not call it. No other file imports it.

**Resolution:** Remove the `export` keyword from `applyStoredTheme` in `theme.ts`. The function remains in the file (it is needed by `toggleTheme`), but it is no longer part of the public API. This is a one-word change.

**Risk:** None. No caller exists to break.

**Exact change:**
```typescript
// Before
export function applyStoredTheme(stored?: string | null) {

// After
function applyStoredTheme(stored?: string | null) {
```

### Target 3: OfflineBanner dark mode fix (`src/components/log/OfflineBanner.tsx`)

**Status:** HARDCODED CLASSES — `bg-amber-100 text-amber-800` bypass the theme token system and do not invert in dark mode.

**Evidence:** The component is 13 lines. The entire div uses `bg-amber-100 text-amber-800` — Tailwind's built-in amber palette, not the project's semantic tokens. In dark mode, these classes render as light amber on a dark background, which is incorrect contrast.

**Resolution:** Replace hardcoded amber classes with project semantic tokens. Recommended replacement:

```tsx
// Before
<div className="bg-amber-100 text-amber-800 text-sm px-4 py-2 text-center w-full">

// After
<div className="bg-accent/20 text-text border-b border-accent/40 text-sm px-4 py-2 text-center w-full">
```

This uses `--color-accent` (peach `#E8B4A2` / `#F0C4B2` dark) which is already used throughout the app for subtle warning/highlight backgrounds, and `--color-text` which correctly adapts between light (`#3D3D3D`) and dark (`#E8E5E0`).

**Risk:** Visual change only — the amber appearance changes to peach. This aligns with the project's established accent palette.

### Target 4: `comingSoon` dead branch in Sidebar.tsx (`src/components/layout/Sidebar.tsx`)

**Status:** DEAD CODE BRANCH — `navItems` array never has a `comingSoon` property. The conditional branch can never execute.

**Evidence:**
- `navItems` (lines 5–13) defines 7 items, each with `label`, `to`, `icon`. None has a `comingSoon` key.
- The `item.comingSoon ?` branch (lines 31–42) is therefore always false — TypeScript allows it because `comingSoon` is implicitly `undefined` on the items.
- This was a holdover from Phase 1 when the Plan tab was temporarily disabled.

**Resolution:** Remove the ternary and dead branch; keep only the `NavLink` branch. The map callback simplifies from a ternary to a direct return.

**Exact change — map callback:**
```tsx
// Before
{navItems.map((item) =>
  item.comingSoon ? (
    <span ...>...</span>
  ) : (
    <NavLink ...>...</NavLink>
  )
)}

// After
{navItems.map((item) => (
  <NavLink
    key={item.label}
    to={item.to}
    end={item.to === '/'}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2 rounded-[--radius-btn] transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-text/70 hover:bg-secondary hover:text-text'
      }`
    }
  >
    <span>{item.icon}</span>
    <span>{item.label}</span>
  </NavLink>
))}
```

**Risk:** None. The comingSoon branch was unreachable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme-aware warning color | New `--color-warning` CSS token | Existing `--color-accent` at reduced opacity | Adding a new token for one use case creates fragmentation; accent already serves this role |
| Dead code detection | Manual audit | TypeScript `noUnusedLocals` + grep | Already available; used to verify findings above |

## Common Pitfalls

### Pitfall 1: Removing `usePortionSuggestions` breaks the JSDoc comment in `useFoodLogs.ts`
**What goes wrong:** The comment on line 169 of `useFoodLogs.ts` says "Used by usePortionSuggestions" — after hook deletion this is a dangling reference.
**How to avoid:** Remove or update the comment when deleting the hook file.

### Pitfall 2: Making `applyStoredTheme` private breaks future external consumers
**What goes wrong:** If something outside the codebase (e.g., a script tag in `index.html`) called `applyStoredTheme`, removing the export would break it.
**How to avoid:** Already checked — `index.html` has no inline theme script. `main.tsx` does not call it. Safe to make private.

### Pitfall 3: OfflineBanner accent color appears incorrect if accent token is not checked in dark mode
**What goes wrong:** Choosing a replacement color without verifying the dark mode token value.
**How to avoid:** `global.css` confirms `--color-accent` dark = `#F0C4B2` (lighter peach), which is visible on `--color-background: #1A1D1A`. Safe choice confirmed.

### Pitfall 4: TypeScript strict mode catches implicit `any` on removed items
**What goes wrong:** After changes, running `tsc --noEmit` may surface pre-existing TS errors unrelated to this phase.
**How to avoid:** Run `tsc --noEmit` before and after to isolate any new errors introduced by these changes specifically. Pre-existing errors are expected (from Phase 6 decision to skip tsc in build).

## Code Examples

### Dead export removal pattern
```typescript
// Source: direct code inspection of src/utils/theme.ts

// Only change: remove 'export' keyword
function applyStoredTheme(stored?: string | null) {
  const value = stored ?? localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle(
    'dark',
    value === 'dark' || (!value || value === 'system') && prefersDark
  )
}
```

### Theme token usage in OfflineBanner
```tsx
// Source: direct inspection of src/styles/global.css (token definitions)
// bg-accent/20 = peach at 20% opacity — adapts via .dark override to #F0C4B2/20
// text-text = semantic text color — adapts to #E8E5E0 in dark mode
<div className="bg-accent/20 text-text border-b border-accent/40 text-sm px-4 py-2 text-center w-full">
  You are offline. Some features are unavailable.
</div>
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Hardcoded Tailwind palette classes (`amber-100`) | Semantic theme tokens (`bg-accent/20`) | Dark mode compatibility without separate dark: variants |
| Exported private helpers | `export` only what external callers need | Reduces API surface, prevents external misuse |
| Dead code branches via optional properties | Remove branch when property is never set | Reduces cognitive overhead when reading the component |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (detected: `src/utils/__tests__/macroConversion.test.ts` exists) |
| Config file | Check `vite.config.ts` for test config — likely `vitest` section |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRCK-05 | Portion suggestions still calculated in PlanGrid after hook deletion | manual | Visual verification in browser with live data | N/A — integration behavior |
| PLAT-03 | OfflineBanner renders correctly in dark mode | manual | Browser visual check in dark mode with network offline | N/A — visual |
| POLISH-01 | OfflineBanner uses theme tokens (no hardcoded amber classes) | automated grep | `grep -r "amber" src/` should return 0 results | N/A — verification grep |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (type safety) + `grep -r "amber" src/` (no residual hardcoded classes)
- **Per wave merge:** `npx vitest run` (existing test suite green)
- **Phase gate:** Full suite green + manual dark mode visual check before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. This phase makes no changes to tested utility functions. The four changes are deletions and class substitutions.

## Open Questions

1. **Should `applyStoredTheme` be documented as internal?**
   - What we know: It is called only by `toggleTheme` inside `theme.ts`
   - What's unclear: Whether the original author intended it to be a public initialization hook (e.g., called from `index.html` or `main.tsx` on boot)
   - Recommendation: Check `index.html` for any inline script calling it (quick grep). If absent, make it private. Already confirmed absent.

2. **Should the JSDoc in `useFoodLogs.ts` line 169 be removed or updated?**
   - What we know: It says "Used by usePortionSuggestions to gather per-member logs"
   - Recommendation: Remove the sentence. The comment still makes sense without it — the function description stands alone.

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/hooks/usePortionSuggestions.ts` — confirmed no import sites
- Direct code inspection: `src/utils/theme.ts` — confirmed `applyStoredTheme` export is unused externally
- Direct code inspection: `src/components/log/OfflineBanner.tsx` — confirmed hardcoded `bg-amber-100 text-amber-800`
- Direct code inspection: `src/components/layout/Sidebar.tsx` — confirmed `comingSoon` branch is unreachable
- Direct code inspection: `src/styles/global.css` — confirmed theme token definitions and dark overrides
- `.planning/v1.0-MILESTONE-AUDIT.md` — confirmed all four items as audit findings

### Secondary (MEDIUM confidence)
- Tailwind CSS 4 opacity modifier syntax (`bg-accent/20`) verified by existing usage patterns throughout codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Dead code targets: HIGH — confirmed by direct grep across entire src/ tree
- Theme token replacement: HIGH — global.css tokens confirmed, dark mode override values confirmed
- Test strategy: HIGH — changes do not affect any utility functions with existing tests

**Research date:** 2026-03-15
**Valid until:** Stable — these are surgical, bounded changes with no moving dependencies
