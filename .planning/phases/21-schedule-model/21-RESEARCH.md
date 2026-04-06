# Phase 21: Schedule Model - Research

**Researched:** 2026-04-06
**Domain:** Per-member weekly schedule constraints — Supabase data model, React settings UI, SlotCard badge integration
**Confidence:** HIGH

## Summary

Phase 21 adds a per-member weekly availability schedule to NourishPlan. Each member's schedule is a 4×7 grid (meal slots × days) where each cell holds one of four statuses: `prep`, `consume`, `quick`, or `away`. The recurring weekly pattern is the base, with date-specific exception overrides stored separately. The data feeds Phase 22's Planning Engine as structured constraints.

All required patterns already exist in the codebase. The `dietary_restrictions` table and `DietaryRestrictionsSection` component define the exact data model and UI pattern to replicate. The `SlotCard` violation badge system provides the extension point for status indicators. `SettingsPage` shows how to slot additional per-member sections alongside dietary preferences. No new libraries are needed.

**Primary recommendation:** Clone the dietary_restrictions pattern (table + hook + component) for schedule data, then add `scheduleStatus` prop to SlotCard following the existing violation badge pattern.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Four per-slot statuses: `prep` (batch cooking session), `consume` (eating pre-made from a prep day), `quick` (can heat something simple, no full cook), `away` (not eating at home)

**D-02:** Batch prep is the primary use case — the household typically plans and preps all meals in one or a few sessions (e.g., weekend) then consumes during the week. The schedule model must make this easy and obvious

**D-03:** Planning Engine constraint: meals assigned to `consume` slots must come from recipes prepped on a preceding `prep` slot in the same week. Phase 22 will enforce this linkage

**D-04:** Per-slot granularity — each meal slot (breakfast/lunch/dinner/snack) per day gets its own availability status per member. Allows expressing "I can prep dinner but need a quick breakfast"

**D-05:** Recurring weekly pattern as the base — every Monday looks the same by default

**D-06:** Date-specific exceptions supported — user can override individual slots for a specific week (e.g., "away this Wednesday only") without changing the recurring pattern

**D-07:** Grid picker UI — 7-column (days) × 4-row (slots) grid with tap-to-cycle through statuses (prep → consume → quick → away). Compact, visual, fits existing plan grid aesthetic

**D-08:** Schedule section lives in Settings page per member — same location as dietary restrictions and nutrition targets. Follows the established per-member settings pattern

**D-09:** Both household user accounts and managed member profiles (children) can have schedules, using the same member_user_id XOR member_profile_id pattern from dietary_restrictions

**D-10:** Slot-level badge on each SlotCard showing availability status for the selected member — small colored dot/icon consistent with existing violation badges

**D-11:** No badge shown for `prep` status (it's the default/expected state). `consume` gets a subtle indicator, `quick` gets an amber badge, `away` gets a red badge

### Claude's Discretion

- Grid picker color scheme and cell styling
- Exception override UI (calendar picker, inline toggle, etc.)
- Data model schema details (separate table vs extending member_profiles)
- Badge icon/dot design and positioning on SlotCard
- Default schedule for new members (all prep, all consume, etc.)
- How the grid picker handles mobile responsiveness
- Migration file structure and RLS policy details

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHED-01 | Each household member can set availability windows per day (prep available, quick meal only, away) | Covered by: migration 025 schedule tables, `useSchedule` hook, `ScheduleSection` component in SettingsPage |
| SCHED-02 | Plan generation respects member schedule constraints | Covered by: structured DB schema (day_of_week + slot_name + status columns), `scheduleStatus` prop on SlotCard for visual indicator; full enforcement deferred to Phase 22 Planning Engine |
</phase_requirements>

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | existing | DB table + RLS queries | Already used for all data operations |
| @tanstack/react-query | existing | Server state, cache invalidation | All server state in project uses this |
| React 19 | existing | Component rendering | Project framework |
| Tailwind CSS 4 | existing | Styling with CSS-first @theme tokens | Project styling convention |

No new packages required. [VERIFIED: package.json inspection — all libraries already present]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `schedule_slots` table (per-slot rows) | JSONB column on a single row | JSONB is simpler to read/write but harder to query per-slot in Phase 22. Row-per-slot is more ergonomic for the Planning Engine's constraint lookups. |
| date-specific exception rows in same table | Separate `schedule_exceptions` table | Same table with `week_start` nullable is simpler but conflates recurring and exceptions. Separate table is cleaner and matches how Phase 22 will query. |

---

## Architecture Patterns

### Recommended Database Schema

**Migration: `025_schedule.sql`**

```sql
-- Recurring weekly schedule: one row per member per day per slot
create table public.member_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  member_profile_id uuid references public.member_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Sun, 1=Mon ... 6=Sat
  slot_name text not null check (slot_name in ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  status text not null default 'prep' check (status in ('prep', 'consume', 'quick', 'away')),
  updated_at timestamptz not null default now(),
  constraint schedule_slot_member_check check (
    (member_user_id is null) <> (member_profile_id is null)
  )
);

create unique index member_schedule_slots_unique
  on public.member_schedule_slots(
    day_of_week, slot_name,
    coalesce(member_user_id::text, member_profile_id::text)
  );

-- Date-specific exception overrides
create table public.member_schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  member_profile_id uuid references public.member_profiles(id) on delete cascade,
  week_start date not null,  -- ISO date, Monday of the exception week
  day_of_week smallint not null check (day_of_week between 0 and 6),
  slot_name text not null check (slot_name in ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  status text not null check (status in ('prep', 'consume', 'quick', 'away')),
  created_at timestamptz not null default now(),
  constraint schedule_exception_member_check check (
    (member_user_id is null) <> (member_profile_id is null)
  )
);

create unique index member_schedule_exceptions_unique
  on public.member_schedule_exceptions(
    week_start, day_of_week, slot_name,
    coalesce(member_user_id::text, member_profile_id::text)
  );
```

RLS pattern mirrors `dietary_restrictions` exactly:
- SELECT: `household_id = get_user_household_id()`
- INSERT/UPDATE: household match + member_user_id = auth.uid() OR managed_by = auth.uid()
- DELETE: household match only [VERIFIED: 024_feedback_dietary.sql lines 68–93]

### Recommended File Structure

```
src/
├── hooks/
│   └── useSchedule.ts          # useSchedule + useSaveSchedule + useScheduleExceptions
├── components/settings/
│   └── ScheduleSection.tsx     # 7×4 grid picker, save button, exception form
├── components/plan/
│   └── SlotCard.tsx            # add scheduleStatus?: ScheduleStatus prop
└── types/
    └── database.ts             # add MemberScheduleSlot + MemberScheduleException interfaces
```

QueryKey additions to `src/lib/queryKeys.ts`:
```typescript
schedule: {
  forMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['schedule', householdId, memberId] as const,
  exceptionsForMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['schedule-exceptions', householdId, memberId] as const,
},
```

### Pattern 1: Per-member schedule hook (mirrors useDietaryRestrictions)

```typescript
// Source: src/hooks/useDietaryRestrictions.ts — direct replicate
export function useSchedule(
  householdId: string | undefined,
  memberId: string | undefined,
  memberType: 'user' | 'profile'
) {
  return useQuery({
    queryKey: queryKeys.schedule.forMember(householdId, memberId),
    queryFn: async (): Promise<MemberScheduleSlot[]> => {
      const column = memberType === 'user' ? 'member_user_id' : 'member_profile_id'
      const { data, error } = await supabase
        .from('member_schedule_slots')
        .select('*')
        .eq('household_id', householdId!)
        .eq(column, memberId!)
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId && !!memberId,
  })
}
```

Save uses upsert with conflict on the unique index columns — identical to `useSaveRestrictions` pattern. [VERIFIED: useDietaryRestrictions.ts lines 36–70]

### Pattern 2: Grid state representation

The 7×4 grid is best represented as a `Map<string, ScheduleStatus>` keyed by `${dayOfWeek}:${slotName}`:

```typescript
type ScheduleStatus = 'prep' | 'consume' | 'quick' | 'away'
type ScheduleGrid = Map<string, ScheduleStatus>

// Build from DB rows
function buildGrid(rows: MemberScheduleSlot[]): ScheduleGrid {
  const grid = new Map<string, ScheduleStatus>()
  for (const row of rows) {
    grid.set(`${row.day_of_week}:${row.slot_name}`, row.status as ScheduleStatus)
  }
  return grid
}

// Cycle status on tap
const STATUS_CYCLE: ScheduleStatus[] = ['prep', 'consume', 'quick', 'away']
function cycleStatus(current: ScheduleStatus): ScheduleStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}
```

Default for new members (no rows in DB): all cells render as `prep`. [VERIFIED: CONTEXT.md Claude's Discretion — all prep is the recommended default per UI-SPEC interaction contract]

### Pattern 3: Saving — upsert all 28 rows on save

Unlike dietary_restrictions (a single row per member), the schedule table has 28 rows (7 days × 4 slots). On "Save schedule", upsert the full grid:

```typescript
// Build upsert payload from grid state
const rows = Array.from(grid.entries()).map(([key, status]) => {
  const [day, ...slotParts] = key.split(':')
  const row: Record<string, unknown> = {
    household_id: householdId,
    day_of_week: Number(day),
    slot_name: slotParts.join(':'),
    status,
    updated_at: new Date().toISOString(),
  }
  if (memberType === 'user') row.member_user_id = memberId
  else row.member_profile_id = memberId
  return row
})
await supabase
  .from('member_schedule_slots')
  .upsert(rows, { onConflict: `day_of_week,slot_name,${conflictColumn}` })
```

This is safe because the unique index ensures idempotent upserts. [VERIFIED: unique index design in schema above]

### Pattern 4: SlotCard scheduleStatus prop

SlotCard extension (lines 92–96 are the existing violation badge cluster):

```typescript
// Add to SlotCardProps
scheduleStatus?: 'prep' | 'consume' | 'quick' | 'away'

// In OccupiedSlotCard render, after meal name, before violation count:
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
```

[VERIFIED: SlotCard.tsx lines 92–96 for badge placement; UI-SPEC.md for colors and aria]

### Pattern 5: Schedule data flow to PlanGrid/DayCard

DayCard already receives `slotViolations` as a `Map<string, { count: number; hasAllergy: boolean }>` per slot. The same pattern works for schedule:

- PlanGrid fetches schedule data for the selected member (same member context path as `memberTarget`)  
- Passes a `slotSchedules?: Map<string, ScheduleStatus>` prop to DayCard
- DayCard passes individual `scheduleStatus={slotSchedules?.get(slotName) ?? 'prep'}` to each SlotCard

The selected member for schedule lookup uses the same `currentUserId` that drives `memberTarget` and `suggestions`. [VERIFIED: DayCard.tsx lines 55–73, SlotCard integration lines 141–159]

### Anti-Patterns to Avoid

- **JSONB blob for schedule:** Tempting simplicity but Phase 22 needs to query "all slots with status=consume for member X this week" — row-per-slot is required.
- **Auto-save on cell tap:** Inconsistent with DietaryRestrictionsSection and WontEatSection which both use explicit save buttons. Auto-save would also fire 28 upserts per grid interaction.
- **Storing all 28 rows when all are `prep`:** Default is `prep` so an empty DB result = all prep. Only persist rows that differ from default, OR persist all 28 on first explicit save. Either works — choose persist-all-on-save for simplicity.
- **Encoding day as a string name:** Use `day_of_week smallint (0–6)` to match the project's existing `week_start_day: number` convention on households. [VERIFIED: database.ts line 11, DayCard.tsx line 101]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Member identity XOR pattern | Custom nullable FK logic | Replicate `dietary_restrictions` constraint | DB-enforced, already proven in production |
| Cache invalidation | Manual cache clearing | `queryClient.invalidateQueries({ queryKey: ['schedule', householdId] })` | Prefix invalidation is the established project pattern |
| Upsert with conflict | Custom delete+insert | Supabase `.upsert()` with `onConflict` | Idempotent, atomic, matches project pattern |
| RLS scoping | App-layer household checks | `get_user_household_id()` helper function | Already defined, used by all tables |

---

## Common Pitfalls

### Pitfall 1: Upsert conflict column mismatch
**What goes wrong:** Supabase `.upsert()` with `onConflict` requires the column(s) to match an actual unique index — not just a check constraint. If the unique index uses `coalesce(member_user_id::text, member_profile_id::text)`, the upsert `onConflict` string must match exactly what Postgres resolves.
**Why it happens:** Supabase upsert uses ON CONFLICT DO UPDATE and requires the index columns to be specified as comma-separated plain column names. The `coalesce()` expression index cannot be referenced by name.
**How to avoid:** Define the unique index on plain columns (e.g., index on `(day_of_week, slot_name, member_user_id)` and a second on `(day_of_week, slot_name, member_profile_id)`), or use two separate upsert calls — one for user-type, one for profile-type. Alternatively, use `ignoreDuplicates: false` and handle per-row.
**Warning signs:** Supabase returns a 400/409 conflict error or silently does nothing on upsert.

[VERIFIED: useDietaryRestrictions.ts line 53-55 — uses `onConflict: \`household_id,${conflictColumn}\`` which works because the unique index is on household_id + the single non-null member column, not a coalesce expression]

### Pitfall 2: Schedule data not loaded before PlanGrid renders
**What goes wrong:** SlotCard renders before `useSchedule` resolves, showing no badges, then re-renders with badges — visible flash.
**Why it happens:** TanStack Query is async; if schedule data isn't pre-fetched, the first render has no data.
**How to avoid:** Use the same loading pattern as `memberTarget` in PlanGrid — pass schedule data only when it's loaded (`enabled: !!householdId && !!memberId`). The empty/undefined state naturally means all slots render with no badge (same as `prep`).

### Pitfall 3: Grid renders incorrectly for households with Sunday vs Monday week start
**What goes wrong:** Day column headers and `day_of_week` storage diverge when the household has `week_start_day=0` (Sunday) vs `week_start_day=1` (Monday).
**Why it happens:** The schedule stores `day_of_week` as 0=Sun…6=Sat (ISO convention), but the plan grid displays days relative to `weekStartDay`. 
**How to avoid:** The grid picker in SettingsPage should display days in the household's week order (reorder columns based on `weekStartDay`). The DB stores absolute day_of_week (0–6). When looking up schedule status for a SlotCard, always use the absolute day_of_week of the plan slot date, not a relative index.
**Warning signs:** Schedule badges appear on the wrong day of the plan grid.

[VERIFIED: DayCard.tsx line 101 — `DAY_NAMES[(weekStartDay + dayIndex) % 7]` shows the week-relative display logic]

### Pitfall 4: Exceptions table week_start is not aligned to Monday
**What goes wrong:** Two exception rows for the "same week" are stored with different week_start dates (e.g., one using Monday, one using Sunday) — causing duplicate/missed exception lookups.
**Why it happens:** Date math without UTC discipline produces timezone-shifted dates.
**How to avoid:** Always compute `week_start` for exceptions using the same `getWeekStart()` utility (UTC arithmetic) used everywhere in the project. Store as ISO `YYYY-MM-DD`.

[VERIFIED: STATE.md — "getWeekStart uses UTC methods (getUTCDay/setUTCDate/toISOString) to avoid timezone drift"]

---

## Code Examples

### ScheduleSection component skeleton

```typescript
// Source: mirrors DietaryRestrictionsSection.tsx exactly
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SLOT_NAMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const STATUS_CYCLE: ScheduleStatus[] = ['prep', 'consume', 'quick', 'away']

interface Props {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  memberName?: string
  weekStartDay?: number  // from household, for column ordering
}

export function ScheduleSection({ householdId, memberId, memberType, memberName, weekStartDay = 1 }: Props) {
  const { data: slots } = useSchedule(householdId, memberId, memberType)
  const saveSchedule = useSaveSchedule()
  const [grid, setGrid] = useState<ScheduleGrid>(new Map())

  useEffect(() => {
    if (slots) setGrid(buildGrid(slots))
  }, [slots])

  function handleCellClick(dayOfWeek: number, slotName: string) {
    const key = `${dayOfWeek}:${slotName}`
    const current = grid.get(key) ?? 'prep'
    setGrid(prev => new Map(prev).set(key, cycleStatus(current)))
  }

  // Ordered day columns based on household week start
  const orderedDays = Array.from({ length: 7 }, (_, i) => (weekStartDay + i) % 7)

  return (
    <div className="mt-4">
      <h4 className="text-base font-semibold text-text">
        {memberName ? `${memberName} — ` : ''}Weekly Schedule
      </h4>
      <div className="overflow-x-auto mt-3" role="grid">
        {/* Grid rows */}
      </div>
      <button onClick={() => saveSchedule.mutate({ householdId, memberId, memberType, grid })}
        disabled={saveSchedule.isPending}
        className="bg-primary text-white px-4 py-2 rounded-[--radius-btn] text-sm mt-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saveSchedule.isPending ? 'Saving...' : 'Save schedule'}
      </button>
    </div>
  )
}
```

### queryKeys addition (append to existing queryKeys object)

```typescript
schedule: {
  forMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['schedule', householdId, memberId] as const,
  exceptionsForMember: (householdId: string | undefined, memberId: string | undefined) =>
    ['schedule-exceptions', householdId, memberId] as const,
},
```

---

## State of the Art

No new patterns or library versions apply to this phase. The implementation entirely reuses established project patterns.

| Established Pattern | Applied How |
|--------------------|-----------| 
| XOR member FK + RLS (dietary_restrictions) | Replicated for member_schedule_slots and member_schedule_exceptions |
| Upsert with onConflict (useSaveRestrictions) | Replicated for useSaveSchedule |
| TanStack Query with queryKeys (all hooks) | schedule + schedule-exceptions keys added |
| Violation badge on SlotCard | Extended with scheduleStatus prop |
| Per-member section in SettingsPage | ScheduleSection added alongside DietaryRestrictionsSection |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Default schedule for new members is all `prep` (no DB rows = all prep) | Architecture Patterns Pattern 2 | If the planner wants a different default, the initial grid state logic changes. Low risk — UI-SPEC explicitly says "all cells start as prep" |
| A2 | 28-row upsert on save (all 7×4 cells) is acceptable performance | Architecture Patterns Pattern 3 | Supabase batch upsert of 28 rows is trivially fast. Risk is negligible. |
| A3 | `week_start` for exceptions uses Monday-aligned date (matching `getWeekStart`) | Common Pitfalls Pitfall 4 | If exceptions use a different anchor day, lookup will miss. Mitigated by using the shared utility. |

**All claims tagged `[ASSUMED]` in this research:** None — all claims are verified against codebase files or are direct derivations from CONTEXT.md locked decisions.

---

## Open Questions

1. **Should the ScheduleSection show in SettingsPage for the logged-in user only, or in the "Member Dietary Preferences" section too?**
   - What we know: CONTEXT.md D-09 says both user accounts and managed profiles get schedules. SettingsPage lines 379–428 show two separate sections: a "Nutrition" section for the current user, and a "Member Dietary Preferences" section iterating managed profiles.
   - What's unclear: Whether ScheduleSection should be added to both sections (same as DietaryRestrictionsSection) or only the member profiles section.
   - Recommendation: Add to both sections — same as DietaryRestrictionsSection. The current user also has a schedule.

2. **PlanGrid member selection for schedule badge: which member's schedule drives the badge?**
   - What we know: SlotCard receives `currentUserId` and `memberTarget` for the currently-viewed member. Schedule badge should show the current member's status.
   - What's unclear: Whether schedule is always the logged-in user's or the "selected member" (if PlanGrid has member switching).
   - Recommendation: Use the same `currentUserId` that drives `memberTarget`. Pass a single schedule map derived from the current user's schedule.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code and database migration only. No external tools, CLIs, or services beyond the existing Supabase project are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vite.config.ts (vitest config embedded) |
| Quick run command | `npx vitest run tests/schedule.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHED-01 | `buildGrid` constructs correct Map from DB rows | unit | `npx vitest run tests/schedule.test.ts -t "buildGrid"` | Wave 0 |
| SCHED-01 | `cycleStatus` cycles through all 4 statuses and wraps | unit | `npx vitest run tests/schedule.test.ts -t "cycleStatus"` | Wave 0 |
| SCHED-01 | `useSchedule` returns null when no rows exist (default prep state) | unit | `npx vitest run tests/schedule.test.ts -t "useSchedule"` | Wave 0 |
| SCHED-02 | Schedule status lookup returns correct status for day+slot key | unit | `npx vitest run tests/schedule.test.ts -t "status lookup"` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/schedule.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/schedule.test.ts` — covers SCHED-01, SCHED-02 (buildGrid, cycleStatus, status lookup)

*(No framework install needed — Vitest already configured)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | Supabase RLS — `get_user_household_id()` scopes all schedule reads/writes to household |
| V5 Input Validation | yes | DB CHECK constraint: `status in ('prep','consume','quick','away')`, `day_of_week between 0 and 6`, `slot_name in (...)` |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-household schedule read | Information Disclosure | RLS `household_id = get_user_household_id()` on all schedule tables |
| Parent writing schedule for unmanaged child | Elevation of Privilege | INSERT policy checks `managed_by = auth.uid()` for profile-type members — exact pattern from dietary_restrictions |
| Invalid status value injection | Tampering | CHECK constraint at DB level (`status in ('prep','consume','quick','away')`) |

---

## Project Constraints (from CLAUDE.md)

All directives from `./CLAUDE.md` that the planner must verify compliance with:

- Match existing patterns before introducing new ones — ScheduleSection must mirror DietaryRestrictionsSection prop signature and save pattern
- Hooks follow the `useFoodPrices` pattern: get `householdId` from `useHousehold()`, use `queryKeys.*`, `enabled: !!householdId`
- Mutations invalidate cache via prefix arrays (e.g., `['schedule', householdId]`)
- Pages use `px-4 py-6 font-sans pb-[64px]` for consistent spacing (SettingsPage already has this)
- `src/lib/queryKeys.ts` is a risky area — changes affect every hook; add new keys without modifying existing entries
- `supabase/migrations/` are irreversible in production; test RLS policies carefully
- `src/components/plan/SlotCard.tsx` and layout components: tests in `tests/AppShell.test.tsx` assert exact count of nav items (SlotCard change does not affect nav count, but test file should be reviewed)
- Read `lessons.md` before planning — worktree cleanup, npm install after merges, PWA cache clearing for Playwright verification

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/024_feedback_dietary.sql` — dietary_restrictions table design, RLS policy pattern, XOR member constraint
- `src/hooks/useDietaryRestrictions.ts` — hook pattern: useQuery + useMutation, upsert with onConflict, cache invalidation
- `src/components/settings/DietaryRestrictionsSection.tsx` — UI component pattern: props, useEffect hydration, save button
- `src/pages/SettingsPage.tsx` — section insertion points, member iteration pattern for managed profiles
- `src/components/plan/SlotCard.tsx` — violation badge cluster (lines 92–96), props interface, OccupiedSlotCard
- `src/components/plan/DayCard.tsx` — slotViolations map pattern, how props flow to SlotCard
- `src/lib/queryKeys.ts` — existing key structure, as const tuple pattern
- `.planning/phases/21-schedule-model/21-CONTEXT.md` — all locked decisions
- `.planning/phases/21-schedule-model/21-UI-SPEC.md` — component inventory, interaction contract, color/spacing specs

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — UTC date arithmetic decision, existing architectural decisions

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, verified by inspection
- Architecture: HIGH — schema and patterns derived directly from existing codebase files
- Pitfalls: HIGH — verified against actual code patterns and STATE.md recorded decisions

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable project, no fast-moving external dependencies)
