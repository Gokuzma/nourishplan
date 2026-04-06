# Phase 19: Drag-and-Drop Planner - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can rearrange meals on the weekly plan grid by dragging and dropping, and manually placed meals can be locked so auto-generation (Phase 22) cannot overwrite them. This phase adds drag-and-drop interaction and the locked-slot mechanism. Auto-generation itself is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Drag Interaction
- **D-01:** Drag handle icon (≡) on the left side of each SlotCard — drag only initiates from the handle, not the whole card
- **D-02:** Lifted card follows the cursor/finger with shadow and scale effect during drag; source slot shows a dashed placeholder
- **D-03:** Cross-day dragging supported — user can drag a meal from any slot to any other slot across the entire weekly grid

### Locked Slot UX
- **D-04:** Locked slots use both a lock icon badge (top-right corner) and a colored left border accent — icon + border combo for clarity and accessibility
- **D-05:** Locking is explicit — user must tap a lock/pin button on the slot card to lock it. Meals are NOT auto-locked on placement
- **D-06:** Locked slots remain draggable — the lock only prevents auto-generation (Phase 22) from overwriting. Users retain full manual control over locked slots

### Mobile Touch Handling
- **D-07:** Drag handle cleanly separates drag from scroll — touching the handle initiates drag, touching anywhere else scrolls normally. No activation delay needed
- **D-08:** Mobile layout changes to a horizontal day carousel — days scroll horizontally with 2-3 days partially visible (current day centered, adjacent days peeking from edges). Users can drag directly onto visible adjacent days
- **D-09:** Desktop layout keeps the existing vertical DayCard stack

### Slot Swap Behavior
- **D-10:** Drop onto an occupied slot shows a quick action menu with two options: "Swap" (exchange meals between the two slots) or "Replace" (move dragged meal into target, clear source). User chooses per-drop
- **D-11:** Drop onto an empty slot moves the meal — source slot is cleared. No copy behavior

### Claude's Discretion
- Drag library choice (dnd-kit, react-beautiful-dnd, etc.)
- Auto-scroll behavior when dragging near container edges
- Exact animation timing and easing for lift/drop effects
- Drop target highlight styling
- Mobile carousel implementation details (snap points, swipe momentum)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Meal plan grid
- `src/components/plan/PlanGrid.tsx` — Current weekly grid component with MealPicker modal, slot assignment/clearing
- `src/components/plan/DayCard.tsx` — Single day card rendering slots, nutrition totals, progress rings
- `src/components/plan/SlotCard.tsx` — Individual meal slot card with assign/clear/swap actions
- `src/hooks/useMealPlan.ts` — Hooks for meal plan CRUD: useMealPlan, useMealPlanSlots, useAssignSlot, useClearSlot
- `src/types/database.ts` — MealPlanSlot type (needs is_locked field addition)

### Requirements
- `.planning/REQUIREMENTS.md` §Planning — PLAN-01 (drag-and-drop), PLAN-03 (locked slots preserved during auto-gen)

### Downstream dependency
- `.planning/ROADMAP.md` §Phase 22 — Constraint-Based Planning Engine consumes locked slots (skips them during generation)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SlotCard` component: already has assign/clear/swap actions — drag handle and lock button can extend it
- `DayCard` component: renders slot list per day — will become the carousel item on mobile
- `useAssignSlot` mutation: upserts on (plan_id, day_index, slot_name) — swap logic can reuse this
- `useClearSlot` mutation: clears a slot — used for "Replace" drop action
- `MealPicker` modal: existing meal selection UI — still needed for "+" empty slot assignment (not replaced by drag)

### Established Patterns
- TanStack Query with `queryKeys.mealPlan.*` for all plan state
- Supabase upsert with conflict keys for slot operations
- `is_override` boolean already exists on MealPlanSlot — `is_locked` follows the same pattern
- Pastel/minimalist UI with dark mode via CSS custom properties

### Integration Points
- `meal_plan_slots` table: needs `is_locked` boolean column (DB migration)
- `MealPlanSlot` TypeScript type: needs `is_locked` field
- `PlanGrid`: needs drag context provider wrapping DayCards
- `PlanPage`: responsive layout switch (vertical stack vs horizontal carousel) based on viewport
- Phase 22 (future): planning engine must query `is_locked` and skip locked slots

</code_context>

<specifics>
## Specific Ideas

- Drop action menu on occupied slot: "Swap" or "Replace" — gives user per-drop control without confirmation dialogs for the common case
- Horizontal carousel on mobile with adjacent days peeking — enables direct cross-day drag without auto-scroll complexity

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-drag-and-drop-planner*
*Context gathered: 2026-04-05*
