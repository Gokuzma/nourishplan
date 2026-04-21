# Phase 27: Wire Schedule Badges to PlanGrid — Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 7 (4 modified, 1 created, 1 queryKeys add, 1 ROADMAP amend)
**Analogs found:** 7 / 7 (every file has a strong in-repo analog; no reliance on RESEARCH.md fallbacks)

## Regression context (load-bearing)

Phase 22 worktree truncation dropped two sibling pieces of Phase 21-02 wiring that both need to be restored in Phase 27:
1. `src/components/plan/PlanGrid.tsx` lost its `useSchedule` import, `slotSchedulesByDay` memo, and `slotSchedules={...}` forwarding to `<DayCard>` (CONTEXT.md primary target).
2. `src/lib/queryKeys.ts` lost its `schedule` namespace entirely. The current `useSchedule.ts` file references `queryKeys.schedule.forMember(...)` at line 14 but that key does not exist — this would raise a runtime `TypeError` the moment the hook is called. **The planner MUST restore `queryKeys.schedule` in the same phase** (not flag it for later) since adding `forHousehold` requires re-creating the whole namespace anyway. Verified: `git show 4eab9b7:src/lib/queryKeys.ts` contains the block at lines 88-95; the current file has no `schedule` key.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/hooks/useSchedule.ts` (MODIFY — add `useHouseholdSchedules`) | hook | request-response (read) | `src/hooks/useFoodPrices.ts` `useFoodPrices()` | exact (household-scoped SELECT by `household_id` only, list return) |
| `src/lib/queryKeys.ts` (MODIFY — restore `schedule` namespace, add `forHousehold`) | config | n/a | existing `queryKeys.inventory` block (`list`, `byLocation`, `expiringSoon`) | exact (same household-first factory shape) |
| `src/utils/schedule.ts` (MODIFY — add `buildHouseholdGrid` + precedence aggregation) | utility | transform (batch) | existing `buildGrid` in same file (lines 9-15) | exact-role |
| `src/components/plan/PlanGrid.tsx` (MODIFY — wire `useHouseholdSchedules` + `slotSchedules` prop) | component | request-response → transform → render | `git show 4eab9b7:src/components/plan/PlanGrid.tsx` (same file pre-regression) | exact (cherry-pick baseline) |
| `src/components/plan/SlotCard.tsx` (MODIFY — render dot on occupied + empty) | component | render | `git show 4eab9b7:src/components/plan/SlotCard.tsx` (occupied dot) + `git show cdf039b:src/components/plan/SlotCard.tsx` (empty dot) | exact (cherry-pick baseline) |
| `src/components/plan/DayCard.tsx` (NO CHANGE expected) | component | render forwarding | current file lines 74, 101, 171, 206 already wired | already correct |
| `tests/PlanGrid.schedule.test.tsx` (CREATE) | test | n/a | `tests/PlanGrid.shimmer.test.tsx` (primary) + `tests/PlanGrid.nutritionGap.test.tsx` (secondary) | exact (both mock every PlanGrid hook, use `MemoryRouter` + `QueryClientProvider`, dynamic-import `PlanGrid`) |
| `.planning/ROADMAP.md` (MODIFY — amend §Phase 27 criteria #1 and #3) | docs | n/a | existing ROADMAP amend pattern (see Phase 24 annotation) | role-match |

## Pattern Assignments

---

### `src/hooks/useSchedule.ts` — add `useHouseholdSchedules(householdId)`

**Role:** hook · **Data flow:** request-response (household-scoped SELECT, returns `MemberScheduleSlot[]` across all members)

**Primary analog:** `src/hooks/useFoodPrices.ts` (closest — plain household-scoped list query, no member filter). Secondary: `src/hooks/useNutritionTargets.ts::useNutritionTargets` (same shape: `(householdId)` parameter explicitly passed rather than sourced from `useHousehold()`).

Use `useNutritionTargets` as the structural template — it takes `householdId` as a parameter (not from `useHousehold()`), matching how the existing `useSchedule(householdId, ...)` in the same file accepts `householdId` directly.

**Imports to reuse from the same file (already present, lines 1-6):**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import type { MemberScheduleSlot, ScheduleStatus } from '../types/database'
import type { ScheduleGrid } from '../utils/schedule'
import { SLOT_NAMES } from '../utils/schedule'
```

**Core pattern to copy** (from `useNutritionTargets.ts` lines 10-24):
```typescript
export function useNutritionTargets(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.nutritionTargets.list(householdId),
    queryFn: async (): Promise<NutritionTarget[]> => {
      const { data, error } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('household_id', householdId!)

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}
```

**Adaptation for `useHouseholdSchedules`:**
- Table: `'member_schedule_slots'` (same table the existing `useSchedule` hits at line 18)
- Filter: `.eq('household_id', householdId!)` ONLY — no `.eq(column, memberId!)` (that's the whole point vs. `useSchedule` at lines 20-21)
- Return type: `Promise<MemberScheduleSlot[]>` (already imported)
- Query key: `queryKeys.schedule.forHousehold(householdId)` (see queryKeys section below)
- `enabled: !!householdId` — single guard, no `memberId` gate

**Do NOT touch** existing `useSchedule` (lines 8-27) or `useSaveSchedule` (lines 36-79) — per D-06a they must stay exactly as-is so `ScheduleSection` keeps working.

---

### `src/lib/queryKeys.ts` — restore `schedule` namespace + add `forHousehold`

**Role:** config · **Data flow:** n/a

**Analog:** the existing `queryKeys.inventory` block (lines 57-64 of current file) — same shape: `list(householdId)` + specialised variants.

**Current file lines 57-64 (style template):**
```typescript
inventory: {
  list: (householdId: string | undefined) =>
    ['inventory', householdId] as const,
  byLocation: (householdId: string | undefined, location: string) =>
    ['inventory', householdId, location] as const,
  expiringSoon: (householdId: string | undefined) =>
    ['inventory', householdId, 'expiring-soon'] as const,
},
```

**Historical analog** — the exact block that existed in `git show 4eab9b7:src/lib/queryKeys.ts` (lines 88-95):
```typescript
schedule: {
  forMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['schedule', householdId, memberId] as const,
  exceptionsForMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['schedule-exceptions', householdId, memberId] as const,
},
```

**What to add (place before the final `} as const`):** the restored historical block **plus** a new sibling `forHousehold`:
```typescript
schedule: {
  forMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['schedule', householdId, memberId] as const,
  forHousehold: (householdId: string | undefined) =>
    ['schedule', householdId] as const,
  exceptionsForMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['schedule-exceptions', householdId, memberId] as const,
},
```

Note the cache-invalidation interaction: `useSaveSchedule.onSuccess` (existing, line 76 of `useSchedule.ts`) already invalidates `['schedule', params.householdId]` as a prefix — that prefix array also matches the new `forHousehold` key, so saving one member's schedule auto-invalidates the household query. No mutation changes required.

---

### `src/utils/schedule.ts` — add `buildHouseholdGrid` (precedence aggregation)

**Role:** utility · **Data flow:** transform (batch — reduces N member rows to 1 aggregate per `day:slot`)

**Analog:** existing `buildGrid` in the same file (lines 9-15):

```typescript
export function buildGrid(rows: MemberScheduleSlot[]): ScheduleGrid {
  const grid = new Map<string, ScheduleStatus>()
  for (const row of rows) {
    grid.set(`${row.day_of_week}:${row.slot_name}`, row.status)
  }
  return grid
}
```

**Pattern to follow for the new helper:**
- Same `MemberScheduleSlot[]` input, same `Map<string, ScheduleStatus>` output for the aggregate (key `"{day}:{slot}"`)
- Replace the unconditional `grid.set(...)` with a precedence check

**Precedence rule (D-04):** `away > quick > consume > prep`. Drop `prep` from the output entirely (D-11 — no dot for prep). Re-use the existing `STATUS_CYCLE` array (line 3 of same file) — but note its order is `['prep', 'consume', 'quick', 'away']` which is the precedence order **ascending** (index 0 = lowest). A small helper like `function precedence(s: ScheduleStatus) { return STATUS_CYCLE.indexOf(s) }` keeps the ordering source of truth in one place.

**Tooltip data structure (D-07):** CONTEXT.md gives two acceptable shapes. The simpler one — "keep `scheduleStatus: ScheduleStatus` on SlotCard and pass a parallel `scheduleTooltip?: string`" — only needs `buildHouseholdGrid` to return the aggregate status. A sibling function (e.g. `buildHouseholdTooltips(rows, memberNameById): Map<string, string>`) produces the tooltip strings. Keeping them as two separate `Map`s lets DayCard's existing `slotSchedules?: Map<string, ScheduleStatus>` prop stay unchanged and a new `slotTooltips?: Map<string, string>` prop be added in parallel.

**Snack normalisation (D-09):** this file's `SLOT_NAMES` at line 4 is `['Breakfast', 'Lunch', 'Dinner', 'Snack']` (singular) and `DEFAULT_SLOTS` in `src/utils/mealPlan.ts` line 33 is `['Breakfast', 'Lunch', 'Dinner', 'Snacks']` (plural). Normalisation lives in **PlanGrid.tsx** (closer to the DayCard consumer which uses `DEFAULT_SLOTS`), matching the `cdf039b` baseline diff (see PlanGrid section).

---

### `src/components/plan/PlanGrid.tsx` — wire `useHouseholdSchedules` + build `slotSchedulesByDay`

**Role:** component · **Data flow:** request-response → transform (client-side aggregation) → render

**Primary analog:** `git show 4eab9b7:src/components/plan/PlanGrid.tsx` — this is the pre-regression version of the same file. Fourth analog tier: the `cdf039b` follow-up diff adds Snack/Snacks normalisation on top.

**Imports to add** (follow the pattern at line 11 of the 4eab9b7 baseline, but swap `useSchedule` → `useHouseholdSchedules`):
```typescript
import { useHouseholdSchedules } from '../../hooks/useSchedule'
import { buildHouseholdGrid } from '../../utils/schedule' // or whatever name the planner picks
import type { ScheduleStatus } from '../../types/database'
```
(`buildGrid` import in the historical baseline is replaced by the new household aggregate helper.)

**Hook call site** — baseline at lines 328-332 of `4eab9b7:src/components/plan/PlanGrid.tsx`:
```typescript
const { data: scheduleSlots } = useSchedule(
  householdId,
  selectedMemberId,
  selectedMemberType ?? 'user'
)
```

**Adapted call** (D-06):
```typescript
const { data: scheduleSlots } = useHouseholdSchedules(householdId)
```
Place it near the other data-fetching hooks in PlanGrid (current file lines 136-158 — `useMealPlanSlots`, `useMeals`, `useRecipes`, `useHouseholdDayLogs`, `useNutritionTargets`, `useHouseholdMembers`, `useMemberProfiles`, etc.). The insertion point near the existing `useNutritionTargets(householdId)` call keeps related household-scoped reads grouped.

**Memo for `slotSchedulesByDay`** — baseline at lines 334-346 of `4eab9b7:src/components/plan/PlanGrid.tsx`, with the `cdf039b` Snack/Snacks patch applied:
```typescript
const slotSchedulesByDay = useMemo(() => {
  if (!scheduleSlots?.length) return undefined
  const grid = buildGrid(scheduleSlots)                              // ← swap to buildHouseholdGrid
  const byDay = new Map<number, Map<string, ScheduleStatus>>()
  for (const [key, status] of grid) {
    const [dayStr, ...slotParts] = key.split(':')
    const dayOfWeek = Number(dayStr)
    if (!byDay.has(dayOfWeek)) byDay.set(dayOfWeek, new Map())
    // Normalize "Snack" -> "Snacks" to match DEFAULT_SLOTS (cdf039b)
    const slotName = slotParts.join(':')
    byDay.get(dayOfWeek)!.set(slotName === 'Snack' ? 'Snacks' : slotName, status)
  }
  return byDay
}, [scheduleSlots])
```

**Prop forwarding** — baseline at line 437 of `4eab9b7:src/components/plan/PlanGrid.tsx`:
```typescript
slotSchedules={slotSchedulesByDay?.get((weekStartDay + i) % 7)}
```

**Current DayCard render site** (current file lines 524-557): the single `<DayCard>` JSX block is used in `dayCards = Array.from(...)` and then rendered inline for **both** mobile (line 638) and desktop (line 670) paths. So only **one** `slotSchedules={...}` addition is textually needed in source, but it populates both render sites — however the UI-SPEC anti-regression contract §2 expects `grep -c "slotSchedules={"` to return ≥ 2. Two options:
1. **Inline the `<DayCard>` JSX twice** (one for mobile, one for desktop) — only needed if the planner wants the grep assertion to be literal. More risk of divergence.
2. **Keep the single `dayCards` array and add a separate second reference** — e.g., the DragOverlay at lines 673-685 of current PlanGrid doesn't use a DayCard so that won't help. Simpler: add the prop once to the single `<DayCard>` render (line 525) and rewrite the UI-SPEC anti-regression assertion to `grep -c "slotSchedules" src/components/plan/PlanGrid.tsx` ≥ 2 (counts the prop **and** the memo variable name, so threshold holds). The planner should pick and document.

**Insertion line** inside the existing `<DayCard>` prop list (alongside `slotViolations={slotViolationsByDay?.get(i)}` at line 553):
```typescript
slotViolations={slotViolationsByDay?.get(i)}
slotSchedules={slotSchedulesByDay?.get((weekStartDay + i) % 7)}  // ← add this line
slotFreezerFriendly={dayFreezerFriendly}
```

**Existing props to preserve verbatim** — per L-020 / L-027 and the Anti-Regression Contract in `27-UI-SPEC.md` §5, the executor MUST NOT drop any of the 21 current `<DayCard>` props (dayIndex, weekStart, weekStartDay, slots, memberTarget, currentUserId, slotSuggestions, onAssignSlot, onClearSlot, onSwapSlot, onLogSlot, onToggleLock, onSuggestAlternative, pendingDropSlotKey, onDropSwap, onDropReplace, onDropCancel, slotViolations, slotFreezerFriendly, onCookSlot, key). Nor any of the 14 other features in PlanGrid.tsx (DnD, generation hooks, swap suggestions, portion suggestions, batch prep, priority panel, recipe mix, nutrition gap, recipe suggestion card, drag overlay, log modal, shimmer, reassignment toast, MealPicker).

---

### `src/components/plan/SlotCard.tsx` — render dot on occupied + empty

**Role:** component · **Data flow:** render

**Primary analog:** `git show 4eab9b7:src/components/plan/SlotCard.tsx` (occupied-slot dot) + `git show cdf039b:src/components/plan/SlotCard.tsx` (empty-slot dot).

**Current file lines 17-35** already declares the prop:
```typescript
scheduleStatus?: 'prep' | 'consume' | 'quick' | 'away'
```
(line 32) — but neither `OccupiedSlotCard` nor the empty-slot branch of `SlotCard` destructures or renders it. The regression is purely "prop declared, not consumed."

**Occupied-slot dot JSX — verbatim from `git show 4eab9b7:src/components/plan/SlotCard.tsx` (the dot block sits between meal name and violation badge):**
```tsx
<p className="text-sm font-medium text-text truncate font-sans">
  {meal!.name}
  {scheduleStatus && scheduleStatus !== 'prep' && (
    <span
      className={`ml-1 inline-block w-3 h-3 rounded-full align-middle ${
        scheduleStatus === 'consume' ? 'bg-accent' :
        scheduleStatus === 'quick' ? 'bg-amber-500' :
        'bg-red-500'
      }`}
      aria-label={`Schedule: ${scheduleStatus}`}
      title={
        scheduleStatus === 'consume' ? 'Pre-made from prep day' :
        scheduleStatus === 'quick' ? 'Quick meal only' :
        'Away — not eating at home'
      }
    />
  )}
  {violationCount && violationCount > 0 ? (
    <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[9px] font-bold leading-none align-middle ${hasAllergyViolation ? 'bg-red-500' : 'bg-amber-500'}`}>
      {violationCount}
    </span>
  ) : null}
</p>
```
Insertion point in the **current** file: inside the `<p className="text-sm font-medium text-text truncate font-sans">` at line 107, between `{meal!.name}` (line 108) and the existing violation-badge `{violationCount && ...}` span (line 109-113). Also: `scheduleStatus` must be added to the `OccupiedSlotCard` destructure at line 53 (currently does NOT include it).

**Empty-slot dot JSX — verbatim from `git show cdf039b:src/components/plan/SlotCard.tsx` (the function-level diff hunk):**
```tsx
if (!slot?.meal_id && !slot?.meals) {
  const ss = props.scheduleStatus
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-dashed border-accent/30 bg-background/50">
      <span className="text-sm text-text/50 font-sans">
        {slotName}
        {ss && ss !== 'prep' && (
          <span
            className={`ml-1 inline-block w-2.5 h-2.5 rounded-full align-middle ${
              ss === 'consume' ? 'bg-accent' :
              ss === 'quick' ? 'bg-amber-500' :
              'bg-red-500'
            }`}
            aria-label={`Schedule: ${ss}`}
            title={
              ss === 'consume' ? 'Pre-made from prep day' :
              ss === 'quick' ? 'Quick meal only' :
              'Away — not eating at home'
            }
          />
        )}
      </span>
      <button …existing button unchanged… />
    </div>
  )
}
```
Insertion point in the **current** file: the empty-slot branch at lines 266-279. Replace the bare `<span className="text-sm text-text/50 font-sans">{slotName}</span>` at line 269 with the version above.

**Size split (locked baseline):** occupied = `w-3 h-3` (12px), empty = `w-2.5 h-2.5` (10px). UI-SPEC §Interaction Contract marks this as non-negotiable and verified in `21-VERIFICATION.md`. Do not unify to a single size.

**D-07 family tooltip extension:** the baseline `title` is hardcoded (`'Pre-made from prep day'` etc.) — for the household-holistic view it must be replaced by the per-status-member-list string passed from PlanGrid. Planner-decided prop shape (D-07 options A or B).
- **Option B (simpler, recommended):** keep the existing `scheduleStatus: ScheduleStatus` prop and add a new `scheduleTooltip?: string` prop. Fallback to the Phase-21 literal string when `scheduleTooltip` is absent (zero-regression on empty-household case).
- **Option A:** richer `scheduleStatus?: { aggregate; byMember: Array<{name; status}> }`. Requires widening the DayCard prop type too and rebuilds both `byMember` strings per render.

---

### `src/components/plan/DayCard.tsx` — no change expected

**Role:** component · **Data flow:** render forwarding

Current file is **already correctly wired** (no regression here):
- Line 74: `slotSchedules?: Map<string, ScheduleStatus>` in `DayCardProps`
- Line 101: destructure `slotSchedules`
- Line 171: `scheduleStatus={slotSchedules?.get(slotName) ?? undefined}` on default-slot `<SlotCard>`
- Line 206: `scheduleStatus={slotSchedules?.get(s.slot_name) ?? undefined}` on custom-slot `<SlotCard>`
- Line 109: day-of-week computed as `DAY_NAMES[(weekStartDay + dayIndex) % 7]` — already matches D-10

**Only touches** if D-07 Option B is chosen: add parallel `slotTooltips?: Map<string, string>` to `DayCardProps` and forward `scheduleTooltip={slotTooltips?.get(slotName) ?? undefined}` to both `<SlotCard>` sites (lines 150-174 and 186-210). Option A widens the existing `slotSchedules` type and updates the two `.get(...)` sites.

---

### `tests/PlanGrid.schedule.test.tsx` — CREATE (D-12, ROADMAP criterion #5)

**Role:** test · **Data flow:** n/a

**Primary analog:** `tests/PlanGrid.shimmer.test.tsx` (218 lines, exactly the same architecture this test needs). **Secondary analog:** `tests/PlanGrid.nutritionGap.test.tsx` (shows the pattern for mutating mock return values per-test via module-level `let` variables).

**Setup pattern to copy from `tests/PlanGrid.shimmer.test.tsx` lines 1-97:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    session: { user: { id: 'user-1', email: 'test@example.com' } },
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))

vi.mock('../src/hooks/useHousehold', () => ({
  useHousehold: vi.fn().mockReturnValue({ data: { household_id: 'hh-1', role: 'admin', households: { name: 'Test' } }, isPending: false, isError: false }),
  useHouseholdMembers: vi.fn().mockReturnValue({ data: [/* 2-3 members for tooltip names */], isPending: false, isError: false }),
  useMemberProfiles: vi.fn().mockReturnValue({ data: [], isPending: false, isError: false }),
}))

// ... identical vi.mock blocks for useMealPlan, useMeals, useFoodLogs, useNutritionTargets,
//     usePlanGeneration, useNutritionGaps, supabase, DayCarousel, @dnd-kit/core
```

**Schedule-specific mock** — the one new block vs. shimmer.test.tsx. Add alongside the existing `vi.mock` blocks:
```typescript
let mockScheduleRows: unknown[] = []
vi.mock('../src/hooks/useSchedule', () => ({
  useHouseholdSchedules: vi.fn(() => ({ data: mockScheduleRows, isPending: false, isError: false })),
  // keep useSchedule present as a no-op so ScheduleSection's import (if imported transitively) doesn't crash
  useSchedule: vi.fn(() => ({ data: [], isPending: false, isError: false })),
  useSaveSchedule: vi.fn(() => ({ mutate: vi.fn() })),
}))
```

**Render helper to copy from shimmer.test.tsx lines 98-124:**
```typescript
async function renderPlanGrid() {
  const { PlanGrid } = await import('../src/components/plan/PlanGrid')
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    React.createElement(QueryClientProvider, { client: queryClient },
      React.createElement(MemoryRouter, null,
        React.createElement(PlanGrid, {
          planId: 'plan-1',
          weekStart: '2026-04-06',
          weekStartDay: 0,
          memberTarget: null,
          householdId: 'hh-1',
          currentUserId: 'user-1',
          selectedMemberId: 'user-1',
          selectedMemberType: 'user',
          logDate: '2026-04-06',
        }),
      ),
    ),
  )
}
```

**Test assertions (D-12):**
1. Mock `useHouseholdSchedules` to return 2-3 `MemberScheduleSlot` rows (different members, same `day:slot`, conflicting statuses) — e.g., member A `away` + member B `quick` on Monday Dinner.
2. Render PlanGrid via the helper above.
3. Query for the rendered dot — the dot is `<span aria-label="Schedule: away">` inside the SlotCard (per 4eab9b7 dot JSX). Use `screen.getByLabelText('Schedule: away')` or grep the DOM for `bg-red-500` within the Dinner row of the correct day.
4. Precedence assertion: with `{ A: away, B: quick, C: consume }` on the same (day, slot) → dot is red (`bg-red-500`), NOT amber or peach (D-04).
5. `weekStartDay !== 0` case: render with `weekStartDay: 1` and a row with `day_of_week: 2` (Tuesday) → that dot must appear on the **second** visible day column, not the third (D-10).
6. `Snack → Snacks` case: row with `slot_name: 'Snack'` surfaces as a dot on the `Snacks` SlotCard (D-09).

**L-001 note:** before running `npx vitest run tests/PlanGrid.schedule.test.tsx` the executor must delete any `.claude/worktrees/agent-*` artefacts per lessons.md L-001.

---

### `.planning/ROADMAP.md` — amend §Phase 27 acceptance criteria

**Role:** docs · **Data flow:** n/a

**Current text (lines 528-533 — copied from file above):**
```
**Success Criteria** (what must be TRUE):
  1. `PlanGrid.tsx` imports `useSchedule` and calls it with `(householdId, selectedMemberId, selectedMemberType ?? 'user')`
  2. `PlanGrid.tsx` builds a `Map<number, Map<string, ScheduleStatus>>` keyed by day-of-week and slot name via `buildGrid` (or equivalent), memoised via `useMemo`
  3. Both the mobile (DayCarousel) and desktop render sites pass `slotSchedules={slotSchedulesByDay?.get(dayIndex)}` to each `DayCard`
  4. SlotCards display the correct coloured dot when a schedule row exists for that day/slot; prep shows no dot
  5. Test covers PlanGrid → DayCard prop forwarding so this regression cannot silently recur
```

**Amendment per D-08 (criterion #1):** replace with approximately:
> 1. `PlanGrid.tsx` imports `useHouseholdSchedules` from `../../hooks/useSchedule` and calls it with `(householdId)`; the returned rows are aggregated into a `Map<number, Map<string, ScheduleStatus>>` using the precedence rule `away > quick > consume > prep`, memoised via `useMemo`.

**Amendment per D-10 (criterion #3):** replace with approximately:
> 3. Both the mobile (DayCarousel) and desktop render sites pass `slotSchedules={slotSchedulesByDay?.get((weekStartDay + dayIndex) % 7)}` to each `DayCard` (day-of-week key, not plan-relative day index).

Criteria #2, #4, #5 unchanged.

Note the "mobile and desktop render sites" phrasing stays verbatim from the original, even though current PlanGrid.tsx renders the `dayCards` array via a single `<DayCard>` JSX block shared across both paths (see PlanGrid section "Prop forwarding" above). Criterion #3 is a visibility assertion about the rendered output, not a source-code count — a single-source/shared-render implementation still satisfies it.

---

## Shared Patterns

### Anti-Regression Grep Assertions (UI-SPEC §5)

These assertions must still hold after the phase ships. The planner should include them in the execution plan's smoke-check steps:

| Assertion | Command | Threshold |
|---|---|---|
| PlanGrid imports `useHouseholdSchedules` | `grep -q "useHouseholdSchedules" src/components/plan/PlanGrid.tsx` | exit 0 |
| PlanGrid passes `slotSchedules` prop | `grep -c "slotSchedules" src/components/plan/PlanGrid.tsx` | ≥ 2 (memo var + prop; literal `slotSchedules={` may only appear once — see PlanGrid section above) |
| SlotCard destructures + renders `scheduleStatus` | `grep -c "scheduleStatus" src/components/plan/SlotCard.tsx` | ≥ 3 (prop decl + occupied render + empty render) |
| Regression test file exists | `test -f tests/PlanGrid.schedule.test.tsx` | exit 0 |

### `enabled: !!householdId` guard

**Source:** every household-scoped `useQuery` in `src/hooks/` (e.g. `useFoodPrices.ts:22`, `useInventory.ts:31`, `useNutritionTargets.ts:22`, existing `useSchedule.ts:25`).
**Apply to:** `useHouseholdSchedules` in this phase — single-parameter variant (no `memberId` conjunct).

### Cherry-pick-then-adapt protocol (L-020, L-027)

**Source:** lessons.md L-020 (worktree truncation) + L-027 (subagent prompts must list features to preserve).
**Apply to:** `PlanGrid.tsx` and `SlotCard.tsx` edits. Before writing code, the executor MUST:
1. Run `git show 4eab9b7:src/components/plan/PlanGrid.tsx > /tmp/planGrid-baseline.tsx` (or equivalent)
2. `diff /tmp/planGrid-baseline.tsx src/components/plan/PlanGrid.tsx` to spot the regressed region
3. Write new code as minimal insertions at the correct line anchors — not a full file rewrite
4. Diff the result against the current file to verify zero unrelated truncations

### Ordered inline badge stack (UI-SPEC §Badge stacking)

**Source:** current `SlotCard.tsx` lines 107-114.
**Apply to:** the occupied-slot dot insertion. Order (left → right after meal name): meal name → **schedule dot (`ml-1`)** → violation badge (`ml-1.5`). Never reorder; the schedule dot must sit closest to the meal name text per UI-SPEC.

### Progressive-enhancement silence on error (UI-SPEC §Empty/loading/error)

**Source:** UI-SPEC §Empty/loading/error states.
**Apply to:** `useHouseholdSchedules` error and empty cases. **No toast, no error banner, no shimmer**. `scheduleSlots` falsy or `.length === 0` → memo returns `undefined` → DayCard `slotSchedules` is `undefined` → SlotCard renders with no dot. This is the exact `scheduleSlots?.length` guard the 4eab9b7 baseline uses (line 335).

---

## No Analog Found

All files have strong in-repo analogs. None required fallback to RESEARCH.md or external references.

---

## Metadata

**Analog search scope:**
- `src/hooks/` — 38 files (for `useHouseholdSchedules` analog)
- `src/components/plan/` — for PlanGrid, SlotCard, DayCard current state
- `tests/` — for regression test structure
- Git history: commits `4eab9b7` and `cdf039b` (pre-regression source of truth)

**Files scanned:** 14
**Pattern extraction date:** 2026-04-20
**Phase:** 27-wire-schedule-badges-to-plangrid
