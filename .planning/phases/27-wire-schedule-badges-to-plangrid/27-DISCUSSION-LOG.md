# Phase 27: Wire Schedule Badges to PlanGrid - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 27-wire-schedule-badges-to-plangrid
**Areas discussed:** Restore strategy, Empty slots, Dot scope, Regression test, Aggregation rule, Member select role, Fetching strategy, Roadmap reconciliation, Tooltip wording

---

## Restore Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Cherry-pick + adapt | Cherry-pick 4eab9b7 and cdf039b as starting point, then adapt to current PlanGrid. Lowest regression risk. | ✓ |
| Rewrite from ROADMAP criteria | Ignore old commits, implement fresh from the 5 ROADMAP criteria. | |
| Hybrid — SlotCard from history, PlanGrid fresh | Restore SlotCard dot JSX from cdf039b, write PlanGrid's block fresh. | |

**User's choice:** Cherry-pick + adapt (Recommended)
**Notes:** Straightforward — matches what was verified in 21-VERIFICATION.md.

---

## Empty Slots

| Option | Description | Selected |
|--------|-------------|----------|
| Empty + occupied | Match cdf039b — dot shows on empty slots too. Matches 21-VERIFICATION pass criteria. | ✓ |
| Occupied only | Only render dot when a meal is assigned. | |

**User's choice:** Empty + occupied (Recommended)

---

## Dot Scope (whose schedule drives the dot)

| Option | Description | Selected |
|--------|-------------|----------|
| Selected member only | Use PlanGrid's existing `selectedMemberId` + `selectedMemberType`. Matches ROADMAP criterion #1 verbatim. | |
| Current user (auth user) only | Always use `currentUserId` / `'user'`, ignore MemberSelector. | |
| Union of all household members | Fetch every member's schedule and merge. | |
| **Other (free text)** | Family-holistic: "scheduling based on who is available when, not least restrictive but wholistic." | ✓ |

**User's choice:** Family-holistic (free text)
**Notes:** Key scope shift — Phase 27 now delivers household-wide visibility, not per-selected-member. Deviates from ROADMAP criterion #1 as originally written; ROADMAP to be amended in this phase (see "Roadmap Reconciliation" below).

---

## Regression Test

| Option | Description | Selected |
|--------|-------------|----------|
| Mock useSchedule + assert DayCard props | Narrow prop-forwarding test. Would have caught CRIT-02. | ✓ |
| End-to-end DOM assertion | Query the DOM for a coloured dot `span` on the expected SlotCard. | |
| Both | Both tests. | |

**User's choice:** Mock useSchedule + assert DayCard props (Recommended)
**Notes:** Adjusted in CONTEXT.md to mock `useHouseholdSchedules` instead, reflecting D-06.

---

## Aggregation Rule (family view)

| Option | Description | Selected |
|--------|-------------|----------|
| Precedence: away > quick > consume > prep | Most-constraining signal wins. | ✓ |
| Majority status | Most-common status wins (ties by precedence). | |
| Multi-dot — one per distinct non-prep status | Render up to 3 small dots side-by-side. | |
| Count-annotated dots | Precedence winner + tiny number if multiple members share status. | |

**User's choice:** Precedence: away > quick > consume > prep (Recommended)

---

## Member Select Role

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing roles, dots are new/separate | MemberSelector still drives `memberTarget` and portion suggestions. Schedule dots are always household-wide. | ✓ |
| Selected member overrides to single-member view | Conditional logic — family view when "All" is selected, single-member view otherwise. | |

**User's choice:** Keep existing roles, dots are new/separate (Recommended)

---

## Fetching Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Single cross-member query | New `useHouseholdSchedules(householdId)` — one query, one cache key. | ✓ |
| Loop existing useSchedule per member | Iterate members and call `useSchedule` per member. Violates hooks rules. | |
| `useQueries` with per-member keys | Fans out queries via `useQueries`. More cache keys. | |

**User's choice:** Single cross-member query (Recommended)

---

## Roadmap Reconciliation

| Option | Description | Selected |
|--------|-------------|----------|
| Amend criterion #1 in this phase | Update ROADMAP Phase 27 criterion #1 to reference `useHouseholdSchedules`. Keeps roadmap and code consistent. | ✓ |
| Leave ROADMAP, document deviation in CONTEXT.md only | Don't touch ROADMAP, record deviation in CONTEXT.md. | |

**User's choice:** Amend criterion #1 in this phase (Recommended)
**Notes:** Criterion #3 also receives a small touch-up so the lookup key uses `(weekStartDay + dayIndex) % 7`.

---

## Tooltip Wording

| Option | Description | Selected |
|--------|-------------|----------|
| Generic status label | Keep old single-member wording. | |
| List members by status | Enumerate which members have which status, e.g. "Away: Dad. Quick: Sam." | ✓ |
| Claude's discretion | Planner picks wording. | |

**User's choice:** List members by status
**Notes:** Needs member names from `householdMembers` + `memberProfiles` wired into SlotCard. Planner has flexibility on prop shape (D-07 in CONTEXT.md).

---

## Claude's Discretion

- Exact prop shape for the family tooltip on SlotCard (two shapes offered in D-07)
- Whether to extend `buildGrid` or write a new `buildHouseholdGrid` in `src/utils/schedule.ts`
- Naming of the aggregated-status helper
- Keep or deprecate `useSchedule` single-member export (keep — `ScheduleSection` still uses it)

## Deferred Ideas

- Per-member toggle on the plan page to filter dots to one member's view
- Dot-on-DayCard header summarising whole-day family status
- Softer aggregation rules (e.g., "only show away if >50% of members are away")
