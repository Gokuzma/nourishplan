# Phase 21: Schedule Model - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Each household member can set their daily availability for meal prep and eating, and these windows are stored as structured constraints ready to feed the Planning Engine (Phase 22). The schedule supports batch-prep workflows where meals are cooked in advance and consumed across the week.

</domain>

<decisions>
## Implementation Decisions

### Availability Statuses
- **D-01:** Four per-slot statuses: `prep` (batch cooking session), `consume` (eating pre-made from a prep day), `quick` (can heat something simple, no full cook), `away` (not eating at home)
- **D-02:** Batch prep is the primary use case — the household typically plans and preps all meals in one or a few sessions (e.g., weekend) then consumes during the week. The schedule model must make this easy and obvious
- **D-03:** Planning Engine constraint: meals assigned to `consume` slots must come from recipes prepped on a preceding `prep` slot in the same week. Phase 22 will enforce this linkage

### Schedule Granularity
- **D-04:** Per-slot granularity — each meal slot (breakfast/lunch/dinner/snack) per day gets its own availability status per member. Allows expressing "I can prep dinner but need a quick breakfast"
- **D-05:** Recurring weekly pattern as the base — every Monday looks the same by default
- **D-06:** Date-specific exceptions supported — user can override individual slots for a specific week (e.g., "away this Wednesday only") without changing the recurring pattern

### Schedule Editing UX
- **D-07:** Grid picker UI — 7-column (days) × 4-row (slots) grid with tap-to-cycle through statuses (prep → consume → quick → away). Compact, visual, fits existing plan grid aesthetic
- **D-08:** Schedule section lives in Settings page per member — same location as dietary restrictions and nutrition targets. Follows the established per-member settings pattern
- **D-09:** Both household user accounts and managed member profiles (children) can have schedules, using the same member_user_id XOR member_profile_id pattern from dietary_restrictions

### Plan Page Indicators
- **D-10:** Slot-level badge on each SlotCard showing availability status for the selected member — small colored dot/icon consistent with existing violation badges
- **D-11:** No badge shown for `prep` status (it's the default/expected state). `consume` gets a subtle indicator, `quick` gets an amber badge, `away` gets a red badge

### Claude's Discretion
- Grid picker color scheme and cell styling
- Exception override UI (calendar picker, inline toggle, etc.)
- Data model schema details (separate table vs extending member_profiles)
- Badge icon/dot design and positioning on SlotCard
- Default schedule for new members (all prep, all consume, etc.)
- How the grid picker handles mobile responsiveness
- Migration file structure and RLS policy details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Schedule — SCHED-01 (availability windows per day), SCHED-02 (plan generation respects schedule constraints)

### Per-member settings pattern (replicate this)
- `src/hooks/useDietaryRestrictions.ts` — Query/mutation pattern with householdId + memberId + memberType
- `src/components/settings/DietaryRestrictionsSection.tsx` — UI component pattern for per-member settings
- `supabase/migrations/024_feedback_dietary.sql` — Table design with member_user_id XOR member_profile_id constraint, RLS policies

### Integration points
- `src/pages/SettingsPage.tsx` — Where schedule section will be added (alongside dietary restrictions, targets)
- `src/components/plan/SlotCard.tsx` — Where slot-level schedule badges will display (lines 93-97 have existing violation badge pattern)
- `src/components/plan/DayCard.tsx` — Day card rendering slots, may need schedule-aware styling
- `src/types/database.ts` — MemberProfile interface (lines 34-42), slot types

### Downstream dependency
- `.planning/ROADMAP.md` §Phase 22 — Constraint-Based Planning Engine consumes schedule constraints. Must understand prep→consume linkage to assign batch-prepped meals only to consume slots

### Prior phase context
- `.planning/phases/19-drag-and-drop-planner/19-CONTEXT.md` — SlotCard structure (D-01), lock mechanism
- `.planning/phases/20-feedback-engine-dietary-restrictions/20-CONTEXT.md` — Per-member settings pattern, violation badges on SlotCard

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DietaryRestrictionsSection` component: exact UI pattern to replicate for schedule — same props (householdId, memberId, memberType, memberName)
- `useDietaryRestrictions` hook: query/mutation pattern with XOR member constraint
- `SlotCard` violation badge system: already supports colored badges (amber/red) — extend for schedule indicators
- `SettingsPage` member sections: already iterates managed profiles with per-member settings components

### Established Patterns
- Per-member data uses `member_user_id XOR member_profile_id` constraint (dietary_restrictions table)
- Upsert with conflict keys for settings mutations
- TanStack Query with `queryKeys.*` for all server state
- Supabase RLS policies scoped to household_id

### Integration Points
- `SettingsPage` renders `DietaryRestrictionsSection` and `WontEatSection` per member — `ScheduleSection` slots in alongside these
- `SlotCard` props already include `violationCount` and `hasAllergyViolation` — add `scheduleStatus` prop
- `PlanGrid` passes member context to DayCards — schedule data can flow through the same path
- New Supabase migration (025+) for schedule table with RLS

</code_context>

<specifics>
## Specific Ideas

- Batch prep is the **primary workflow** — the family plans and preps all meals in one or a few weekend sessions, then consumes during the week. The UI should make this pattern feel natural and default, not like an edge case
- Multiple prep sessions per week should be easy to set up (e.g., Sunday + Wednesday evening)
- The grid picker with tap-to-cycle is the preferred interaction — visual and compact

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-schedule-model*
*Context gathered: 2026-04-06*
