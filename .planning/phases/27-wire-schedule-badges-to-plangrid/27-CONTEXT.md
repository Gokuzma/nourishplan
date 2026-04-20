# Phase 27: Wire Schedule Badges to PlanGrid - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Restore the regressed wiring so the schedule set via `ScheduleSection` surfaces as coloured dot badges on PlanGrid SlotCards (peach=consume, amber=quick, red=away, no dot for prep). Unlike the original Phase 21-02 implementation, this phase delivers a **household-holistic** signal: the dot reflects the most-constraining status across all household members for that day/slot, not just the currently selected member. Closes CRIT-02 from the v2.0 audit.

</domain>

<decisions>
## Implementation Decisions

### Restore Strategy
- **D-01:** Cherry-pick commits `4eab9b7` (feat(21-02): schedule status badges on SlotCard, DayCard, PlanGrid wiring) and `cdf039b` (fix(21): show schedule badges on empty slots, fix Snack/Snacks mismatch) as the starting point, then adapt the PlanGrid hook call to the new family-wide data source (D-03). The SlotCard dot JSX (both occupied- and empty-slot variants) and the `'Snack'→'Snacks'` normalization are restored verbatim; only the data-fetching layer changes.

### Dot Scope & Data Source
- **D-02:** Schedule dots render on **both empty and occupied** SlotCards. An 'away' or 'quick' signal on an otherwise-empty slot is meaningful (tells the user someone in the household is unavailable even before a meal is placed) — restores cdf039b behaviour.
- **D-03:** Dots are **household-holistic**, not per-selected-member. PlanGrid fetches every household member's schedule and aggregates into one status per (day, slot). This deviates from ROADMAP criterion #1 as originally written — see D-08 for how that is reconciled.
- **D-04:** Aggregation rule — precedence `away > quick > consume > prep`. For each (day, slot), iterate every member's status; the highest-precedence non-prep status wins and drives the dot colour. If every member is `prep` (or has no row), no dot is rendered.
- **D-05:** `MemberSelector` role is unchanged — it still drives `memberTarget` (progress rings) and portion suggestions as today. Schedule dots are a parallel, always-household-wide signal independent of which member is selected in `MemberSelector`.

### Data Fetching
- **D-06:** New hook `useHouseholdSchedules(householdId)` replaces the single-member `useSchedule` call in PlanGrid. One query returns every `member_schedule_slots` row for the household (scoped by `household_id` via existing RLS from Phase 21). PlanGrid aggregates client-side via a `useMemo` that produces the `Map<number, Map<string, ScheduleStatus>>` expected by DayCard.
- **D-06a:** The existing `useSchedule(householdId, memberId, memberType)` hook in `src/hooks/useSchedule.ts` stays untouched — `ScheduleSection` still uses it for the per-member grid picker. Add `useHouseholdSchedules` alongside it in the same file.

### Tooltip Wording (family view)
- **D-07:** Dot `title` attribute lists members by status in plain English, e.g. `"Away: Dad. Quick: Sam."` — only statuses that are present show up (no `"Prep: (rest)"` filler). Requires SlotCard to receive enough information to produce those labels. Two acceptable shapes for the prop (planner decides):
  - Pass a richer type: `scheduleStatus?: { aggregate: ScheduleStatus; byMember: Array<{ name: string; status: ScheduleStatus }> }`; OR
  - Keep `scheduleStatus: ScheduleStatus` on SlotCard and pass a parallel `scheduleTooltip?: string` prop built in PlanGrid.

### ROADMAP Reconciliation
- **D-08:** During this phase, **amend ROADMAP.md Phase 27 acceptance criterion #1** in place to reflect the household-wide hook. The amended text should read approximately: *"PlanGrid.tsx imports `useHouseholdSchedules` and calls it with `(householdId)`; the returned rows are aggregated via `buildGrid`-equivalent logic using the precedence rule `away > quick > consume > prep`."* Criterion #3 also needs a small touch-up to keep the lookup key consistent with the plan-day→day-of-week mapping (see D-10).

### Mapping & Normalization (restored from cdf039b)
- **D-09:** Preserve the `'Snack' → 'Snacks'` normalization when building the per-day map — `member_schedule_slots.slot_name` is singular, but `DEFAULT_SLOTS` in `src/utils/mealPlan.ts` is plural. Verified still present: `src/utils/schedule.ts:4` uses `'Snack'`, `src/utils/mealPlan.ts:33` uses `'Snacks'`. Without this normalization, Snack-slot schedules never match.
- **D-10:** Day-index lookup key from DayCard must convert plan day position to day-of-week: `slotSchedulesByDay?.get((weekStartDay + dayIndex) % 7)`. The ROADMAP criterion #3 shorthand `slotSchedulesByDay?.get(dayIndex)` is plan-relative and will be wrong when `weekStartDay !== 0`. Planner must use the shifted form and the amended ROADMAP should say so explicitly.

### Colour Mapping (locked by Phase 21 D-10/D-11, reconfirmed)
- **D-11:** `consume → bg-accent` (peach, matches ROADMAP wording — `--color-accent: #E8B4A2` light / `#F0C4B2` dark); `quick → bg-amber-500`; `away → bg-red-500`; `prep → no dot rendered`. Same mapping used by cherry-picked 4eab9b7 / cdf039b.

### Regression Test (ROADMAP criterion #5)
- **D-12:** Vitest + RTL test living at `tests/PlanGrid.schedule.test.tsx` (new file, parallel to existing `tests/PlanGrid.shimmer.test.tsx` and `tests/PlanGrid.nutritionGap.test.tsx`). The test mocks `useHouseholdSchedules` to return 2–3 member rows with known statuses, renders PlanGrid, and asserts each DayCard receives the correct `slotSchedules` Map keyed by `(weekStartDay + dayIndex) % 7` — including that the precedence rule (D-04) resolves correctly when two members disagree on the same (day, slot). This is the narrow prop-forwarding guard that would have caught the Phase 22 regression that created CRIT-02.

### Claude's Discretion
- Exact prop shape for the family tooltip on SlotCard (D-07 offers two shapes; either is acceptable)
- Whether to extend `buildGrid` to accept multi-member rows or to write a new `buildHouseholdGrid` helper in `src/utils/schedule.ts`
- Naming of the aggregated status helper (e.g., `resolveHouseholdStatus`, `aggregateScheduleStatus`)
- Whether to keep the existing single-member `useSchedule` export or deprecate it (keep — `ScheduleSection` still uses it per D-06a)

### Folded Todos
None — no pending todos relevant to Phase 27.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Schedule — SCHED-01 (availability windows per day), SCHED-02 (plan generation respects schedule constraints). This phase satisfies the **visibility** slice of both; the constraint-enforcement slice is Phase 22's responsibility.
- `.planning/ROADMAP.md` §Phase 27 — acceptance criteria #1–5. **Note:** criterion #1 and (lightly) criterion #3 are being amended in this phase per D-08/D-10; downstream agents should treat the amended ROADMAP text as the source of truth once the planner updates it.

### Prior phase decisions that are still load-bearing
- `.planning/phases/21-schedule-model/21-CONTEXT.md` — D-10 (slot-level badge), D-11 (colour mapping, no dot for prep), D-09 (per-member profile support)
- `.planning/phases/21-schedule-model/21-02-SUMMARY.md` — original wiring shape PlanGrid → DayCard → SlotCard
- `.planning/phases/21-schedule-model/21-VERIFICATION.md` — the verification rubric that the regression silently invalidated; this phase must restore pass state against the same rubric (plus extended to household-wide view)

### Primary source files (the regression point and restore targets)
- `src/components/plan/PlanGrid.tsx` — no `useSchedule` import, no `slotSchedulesByDay` memo, no `slotSchedules` prop passed to DayCard. This is the file the worktree agent regressed; restore + adapt per D-01/D-03/D-06.
- `src/components/plan/DayCard.tsx:74,101,171,206` — `slotSchedules?: Map<string, ScheduleStatus>` prop and forwarding to SlotCard via `scheduleStatus={slotSchedules?.get(slotName) ?? undefined}` is already present and correct. No changes expected unless prop shape changes under D-07.
- `src/components/plan/SlotCard.tsx:32` — `scheduleStatus?: 'prep' | 'consume' | 'quick' | 'away'` prop declared but **not destructured and not rendered**. Restore the occupied-slot dot JSX from `git show 4eab9b7:src/components/plan/SlotCard.tsx` (around lines 88–108 of that revision) and the empty-slot dot JSX from `git show cdf039b:src/components/plan/SlotCard.tsx` (the diff block in `SlotCard`). Extend rendering to support the D-07 family tooltip.
- `src/hooks/useSchedule.ts` — keep existing `useSchedule` export for `ScheduleSection`; add `useHouseholdSchedules(householdId)` alongside it.
- `src/utils/schedule.ts` — `buildGrid`, `SLOT_NAMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']` (singular). Planner decides whether to extend `buildGrid` or add `buildHouseholdGrid`.
- `src/utils/mealPlan.ts:33` — `DEFAULT_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']` (plural). Confirms the Snack/Snacks normalization from D-09 is still required.
- `src/types/database.ts` — `ScheduleStatus` union, `MemberScheduleSlot` row shape.
- `src/pages/PlanPage.tsx:49-50,224-225` — owns `selectedMemberId` / `selectedMemberType` state and passes them to `PlanGrid`. These props stay (D-05) but PlanGrid stops feeding them into the schedule hook.

### Git references for the cherry-pick
- Commit `4eab9b7` — `feat(21-02): schedule status badges on SlotCard, DayCard, PlanGrid wiring`. Base restore.
- Commit `cdf039b` — `fix(21): show schedule badges on empty slots, fix Snack/Snacks mismatch`. Follow-up fix.
- Both fell out of `main` somewhere during Phase 22 worktree-agent truncation (L-020 / L-027 pattern). Executor should diff current files against those commits before writing new code.

### Test file to add
- `tests/PlanGrid.schedule.test.tsx` (new) — pattern to follow: `tests/PlanGrid.shimmer.test.tsx` (`vi.mock` for every PlanGrid hook, `MemoryRouter` + `QueryClientProvider`, `screen` assertions) and `tests/PlanGrid.nutritionGap.test.tsx`.

### Lessons constraining executor work
- `lessons.md` L-020 — worktree executors truncate unrelated code in files they touch; this regression is the textbook case.
- `lessons.md` L-027 — subagent prompts for parallel execution must list features to preserve; the Phase 27 executor prompt MUST explicitly list every feature currently in `PlanGrid.tsx` (DnD, generation hooks, swap suggestions, portion suggestions, batch prep, priority panel, recipe mix, nutrition gap, recipe suggestion card, drag overlay, log modal) and must be told not to touch anything unrelated to schedule wiring.
- `lessons.md` L-001 — clean `.claude/worktrees/agent-*` before running vitest on the new PlanGrid schedule test.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildGrid(rows)` in `src/utils/schedule.ts` — builds a `Map<"day:slot", ScheduleStatus>` from `MemberScheduleSlot[]`. Works per-member today; can be composed with an aggregation step to produce the household map.
- `useSchedule(householdId, memberId, memberType)` — existing single-member hook, keep as-is for `ScheduleSection`.
- `queryKeys.schedule.forMember(...)` — existing query key factory; add a sibling `queryKeys.schedule.forHousehold(householdId)` for the new cross-member query.
- `DayCard.tsx` already wired to consume `slotSchedules` — zero work in DayCard if prop shape stays `Map<string, ScheduleStatus>`. Under D-07 option B, DayCard would also forward a `scheduleTooltipsByDay?.get(dayIndex)?.get(slotName)` string.
- `SlotCard`'s violation badge pattern (`violationCount` + `hasAllergyViolation` at lines 109–113) is the closest existing analog for the schedule dot rendering — same `span` + small rounded-full + `bg-*` class shape.

### Established Patterns
- TanStack Query with household-scoped keys via `queryKeys.*` (`queryKeys.schedule.forMember` exists; add `forHousehold`).
- `enabled: !!householdId` guard on queries.
- Supabase RLS scoped to `household_id` — existing Phase 21 `member_schedule_slots` RLS should already allow a household-wide SELECT; planner should verify in the migration file to avoid a silent empty-array fetch.
- Vitest + RTL tests under `tests/` at repo root, mocking every non-target hook via `vi.mock` at the top of the file (pattern in `tests/PlanGrid.shimmer.test.tsx`).

### Integration Points
- `PlanGrid.tsx` ~line 455 (`dayCards = Array.from(...)`) — where `slotSchedules` prop needs to be added to each `<DayCard ...>` render (both mobile-DayCarousel path and desktop stack path, per ROADMAP #3).
- `src/hooks/useSchedule.ts` — where `useHouseholdSchedules` is added.
- `src/lib/queryKeys.ts` — add `schedule.forHousehold(householdId)` entry.
- `supabase/migrations/` — verify `member_schedule_slots` SELECT RLS allows household-scoped read (no change expected; if absent, becomes a tiny migration).
- `tests/PlanGrid.schedule.test.tsx` — new test file per D-12.

### Regression Origin (from git archaeology)
- Working wiring existed at `4eab9b7` (2026-04-06 14:12) and was extended at `cdf039b` (2026-04-06 14:45).
- Phase 22 work (`22-01` through `22-06`, 2026-04-06 through later) contains multiple `fix(...)`/`chore(...)` commits restoring files that worktree agents truncated. The PlanGrid schedule wiring was one of the truncations that was **not caught** by post-merge review — matches L-020 exactly.
- Executor for this phase should verify via `git log --oneline -- src/components/plan/PlanGrid.tsx | head -20` that the regression cause is understood before changing anything.

</code_context>

<specifics>
## Specific Ideas

- **Family view is the whole point.** The single-member behaviour from Phase 21 was a stepping stone; for real households (Dad works late, kid has soccer, teen is camping), seeing "who is available when" across everyone in one glance is what makes the plan page useful.
- **Precedence rule matters more than the colour.** `away > quick > consume > prep` means a single 'away' member paints the dot red — that is desired behaviour. The user should never have to guess whether "all members" are available or just "some"; the most-constraining signal always wins.
- **Tooltips must name members.** `"Away: Dad. Quick: Sam."` is materially more useful than `"Away — not eating at home"` once the dot represents the household.
- **This phase is explicitly about closing a regression.** The goal is not "design a family schedule view from scratch" — it is "restore what Phase 21 shipped, then expand it to household-wide". Executor should cherry-pick first and diff second.

</specifics>

<deferred>
## Deferred Ideas

- **Per-member toggle on the plan page** — a future UX improvement where the user could click a dot to filter dots to that single member's view. Not in Phase 27 scope; captures if the family-holistic view turns out to be too dense.
- **Dot-on-DayCard header** summarising the whole day's family status. Could replace or supplement per-slot dots. Out of scope per ROADMAP (the criteria are slot-level).
- **Ignoring 'prep' status in aggregation edge cases** — e.g., if one member is 'away' and four are 'prep', is the dot still red? Under D-04 yes, which matches "who's available when" intent. If real use surfaces a softer rule (e.g., "only show away if >50% of members are away"), revisit in a v2.1 polish phase.

### Reviewed Todos (not folded)
None — no pending todos were surfaced for this phase.

</deferred>

---

*Phase: 27-wire-schedule-badges-to-plangrid*
*Context gathered: 2026-04-19*
