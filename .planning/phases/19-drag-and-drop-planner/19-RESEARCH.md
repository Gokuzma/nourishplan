# Phase 19: Drag-and-Drop Planner - Research

**Researched:** 2026-04-05
**Domain:** Drag-and-drop interaction, mobile carousel, Supabase schema migration, React 19
**Confidence:** HIGH

## Summary

Phase 19 adds drag-and-drop rearrangement to the weekly meal plan grid and introduces a locked-slot mechanism that Phase 22's planning engine will later consume. The dnd-kit library (`@dnd-kit/core` + `@dnd-kit/sortable`) was already locked as the v2.0 roadmap decision and is confirmed compatible with React 19 (`peerDependencies: react >=16.8.0`). Neither package is installed yet — they must be added in Wave 0.

The drag handle pattern (touch-action: none on handle only, PointerSensor with distance constraint, TouchSensor as fallback) is the standard solution for disambiguating drag from scroll on mobile without an activation delay. The mobile layout change from a single-card swipe to a horizontal CSS scroll-snap carousel is a pure CSS + structural change — no new library required. The locked-slot DB migration adds one boolean column (`is_locked`) to `meal_plan_slots`, exactly mirroring the existing `is_override` column pattern.

The most significant implementation risk is the flicker-on-drop that occurs when dnd-kit state and TanStack Query cache are both updated on `onDragEnd`. The proven mitigation is a transient local `pendingSlots` state that holds the optimistic order while the mutation is in-flight, cleared on `onSuccess`/`onError`.

**Primary recommendation:** Install `@dnd-kit/core@6.3.1` and `@dnd-kit/sortable@10.0.0`, wrap `PlanGrid` with `DndContext`, implement the drag handle + PointerSensor/TouchSensor pattern, add the `is_locked` DB migration, and use transient local state to prevent drop flicker.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Drag handle icon (≡) on the left side of each SlotCard — drag only initiates from the handle, not the whole card
- **D-02:** Lifted card follows the cursor/finger with shadow and scale effect during drag; source slot shows a dashed placeholder
- **D-03:** Cross-day dragging supported — user can drag a meal from any slot to any other slot across the entire weekly grid
- **D-04:** Locked slots use both a lock icon badge (top-right corner) and a colored left border accent — icon + border combo for clarity and accessibility
- **D-05:** Locking is explicit — user must tap a lock/pin button on the slot card to lock it. Meals are NOT auto-locked on placement
- **D-06:** Locked slots remain draggable — the lock only prevents auto-generation (Phase 22) from overwriting. Users retain full manual control over locked slots
- **D-07:** Drag handle cleanly separates drag from scroll — touching the handle initiates drag, touching anywhere else scrolls normally. No activation delay needed
- **D-08:** Mobile layout changes to a horizontal day carousel — days scroll horizontally with 2-3 days partially visible (current day centered, adjacent days peeking from edges). Users can drag directly onto visible adjacent days
- **D-09:** Desktop layout keeps the existing vertical DayCard stack
- **D-10:** Drop onto an occupied slot shows a quick action menu with two options: "Swap" (exchange meals between the two slots) or "Replace" (move dragged meal into target, clear source). User chooses per-drop
- **D-11:** Drop onto an empty slot moves the meal — source slot is cleared. No copy behavior

### Claude's Discretion
- Drag library choice (dnd-kit, react-beautiful-dnd, etc.)
- Auto-scroll behavior when dragging near container edges
- Exact animation timing and easing for lift/drop effects
- Drop target highlight styling
- Mobile carousel implementation details (snap points, swipe momentum)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAN-01 | User can drag and drop meals between slots on the weekly plan grid | dnd-kit DndContext + useDraggable/useDroppable, swap mutation via useAssignSlot, transient local state for flicker prevention |
| PLAN-03 | Manually placed meals are locked and preserved during auto-generation | is_locked DB migration + LockBadge toggle + useToggleLock mutation; Phase 22 queries is_locked to skip slots |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | DnD context, sensors, drag overlay, droppable primitives | Already locked in v2.0 roadmap decisions; React 19 compatible (peerDep >=16.8.0) |
| @dnd-kit/sortable | 10.0.0 | useSortable hook; useful for within-day slot reordering if needed | Peer of @dnd-kit/core; same version family |
| @dnd-kit/utilities | 3.2.2 | CSS.Translate.toString() helper for transform CSS | Companion utilities package |

**NOT needed for this phase:**
- `@dnd-kit/modifiers` — no modifier constraints required (no bounding box restrictions)
- `@dnd-kit/accessibility` — core accessibility via aria attributes on drag handle is sufficient
- Any carousel library — pure CSS scroll-snap handles D-08 without a library

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS scroll-snap (native) | Browser API | DayCarousel horizontal layout on mobile | D-08 carousel — no npm package needed |
| Supabase migration SQL | — | Add is_locked column to meal_plan_slots | DB schema change for PLAN-03 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core | react-beautiful-dnd | rbd is unmaintained; no React 19 support |
| @dnd-kit/core | @dnd-kit/react (v0.x) | New alpha package; unstable API, no community examples, not suitable for production |
| CSS scroll-snap carousel | react-snap-carousel library | Adds a dependency for what 15 lines of CSS achieve |

**Installation:**
```bash
npm install @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2
```

**Version verification:** [VERIFIED: npm registry]
- `@dnd-kit/core`: 6.3.1 (latest dist-tag confirmed)
- `@dnd-kit/sortable`: 10.0.0 (latest dist-tag confirmed)
- `@dnd-kit/utilities`: 3.2.2 (confirmed)
- React 19 compatibility: confirmed via peerDependencies `react >=16.8.0`

---

## Architecture Patterns

### Recommended Project Structure

New files this phase:
```
src/components/plan/
├── DragHandle.tsx          # ≡ grip icon, touch-action:none, PointerSensor listeners
├── LockBadge.tsx           # lock/unlock toggle badge (top-right of SlotCard)
├── DropActionMenu.tsx      # "Swap" / "Replace" popover on occupied drop
├── DayCarousel.tsx         # Mobile-only horizontal scroll-snap wrapper for DayCards
```

Modifications:
```
src/components/plan/
├── SlotCard.tsx            # +DragHandle left, +LockBadge top-right, +is_locked border
├── DayCard.tsx             # +useDroppable, accept droppable context props
├── PlanGrid.tsx            # +DndContext wrapper, mobile DayCarousel vs desktop stack
src/hooks/
├── useMealPlan.ts          # +useToggleLock mutation
src/types/database.ts       # +is_locked: boolean on MealPlanSlot
supabase/migrations/
├── 023_dnd_locked_slots.sql  # ALTER TABLE meal_plan_slots ADD COLUMN is_locked
```

### Pattern 1: DndContext + Sensor Configuration

**What:** Wrap PlanGrid content with `DndContext`. Use `PointerSensor` with `distance: 8` constraint for desktop. Use `TouchSensor` with `distance: 8` for mobile — but listeners attach ONLY to the drag handle element, which has `touch-action: none` applied. This means touching the card body triggers normal scroll; touching the handle initiates drag.

**When to use:** This is the only pattern that satisfies D-07 (no activation delay, clean handle-based disambiguation).

```typescript
// Source: dndkit.com/react/sensors + official GitHub docs
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  DragOverlay,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

// In PlanGrid:
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }),
  useSensor(TouchSensor, {
    activationConstraint: { distance: 8 },
  }),
)

// Drag handle element must have touch-action: none + listeners from useDraggable
// Card body must NOT receive listeners — attach listeners to handle node ref only
```

**Critical:** `touch-action: none` must be on the drag handle element only, not on the SlotCard. If applied to the whole card, page scroll breaks on mobile.

### Pattern 2: useDraggable + useDroppable for Cross-Day Drag

**What:** Each occupied SlotCard becomes a draggable. Each slot position (day_index + slot_name pair) becomes a droppable. Since drag is cross-container (D-03), `@dnd-kit/sortable`'s `useSortable` is not the right hook here — use raw `useDraggable` and `useDroppable`.

```typescript
// Source: dndkit.com/introduction/getting-started
import { useDraggable, useDroppable } from '@dnd-kit/core'

// Each SlotCard (occupied):
const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
  id: `slot-${slot.id}`,  // unique across all slots in grid
  data: { slot },          // carry slot data for onDragEnd
  disabled: false,         // locked slots are still draggable (D-06)
})

// Attach listeners to DragHandle element only, not to card root:
// <DragHandle ref={setDragHandleRef} listeners={listeners} attributes={attributes} />

// Each slot position (empty or occupied):
const { isOver, setNodeRef: setDropRef } = useDroppable({
  id: `drop-${dayIndex}-${slotName}`,
  data: { dayIndex, slotName, currentSlot: slot },
})
```

### Pattern 3: Transient Local State to Prevent Drop Flicker

**What:** dnd-kit updates its internal drag state immediately on drag end, but TanStack Query's cache update is async. Without local state, the item snaps back to its original position for ~100–200ms before the query cache updates. The solution is a `pendingSlots` state that holds the optimistic UI during mutation.

**When to use:** Any time dnd-kit drives a mutation that affects the same data the query cache holds.

```typescript
// Source: github.com/clauderic/dnd-kit/discussions/1522 — verified community pattern
const [pendingSlots, setPendingSlots] = useState<SlotWithMeal[] | null>(null)

// In onDragEnd:
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) {
    setActiveSlot(null)
    return
  }
  const optimisticSlots = computeSwapOrMove(slots, active.data.current, over.data.current)
  setPendingSlots(optimisticSlots)   // show immediately — no flicker

  mutate(params, {
    onSuccess: () => setPendingSlots(null),  // query cache now current
    onError: () => setPendingSlots(null),    // rollback to server state
  })
  setActiveSlot(null)
}

// Use pendingSlots ?? slots everywhere slots are consumed:
const displaySlots = pendingSlots ?? slots
```

### Pattern 4: DragOverlay for Lifted Card

**What:** Render a single `DragOverlay` inside `DndContext`. When `activeSlot` is set, render a clone of `SlotCard` inside it. The overlay is portal-rendered outside the normal flow — it always appears on top, follows the pointer, and is unaffected by parent overflow/clip CSS.

```typescript
// Source: dndkit.com/react/components/drag-overlay
<DragOverlay dropAnimation={{ duration: 200, easing: 'ease-in' }}>
  {activeSlot ? (
    <SlotCard
      slotName={activeSlot.slot_name}
      slot={activeSlot}
      isDragging={true}
      // omit action handlers — overlay is display-only
      onAssign={() => {}} onClear={() => {}} onSwap={() => {}}
    />
  ) : null}
</DragOverlay>
```

### Pattern 5: Drop Action Menu State Machine

**What:** When `onDragEnd` fires over an occupied slot, instead of immediately mutating, set `pendingDrop` state with source + target info. Render `DropActionMenu` anchored to the target slot. User picks "Swap" or "Replace" → mutation fires → state clears.

```typescript
type PendingDrop = {
  sourceSlot: SlotWithMeal
  targetSlot: SlotWithMeal
  targetDayIndex: number
  targetSlotName: string
}
const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)

// In onDragEnd when target is occupied:
if (targetSlot.meal_id) {
  setPendingDrop({ sourceSlot, targetSlot, targetDayIndex, targetSlotName })
  return  // wait for user choice
}
// Target is empty: move immediately (D-11)
```

### Pattern 6: CSS Scroll-Snap Carousel (Mobile DayCarousel)

**What:** Replace the current single-card + swipe-gesture approach with a native CSS scroll-snap horizontal carousel. Each DayCard is a `scroll-snap-align: center` flex item. Container uses `scroll-snap-type: x mandatory` + `overflow-x: scroll`.

**Adjacent day peek (D-08):** Card width set to `calc(100vw - 48px)` with `px-6` on container. Adjacent days are naturally visible 16px from each edge. No JS needed for peek.

```css
/* DayCarousel container */
.day-carousel {
  display: flex;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  gap: 12px;
  padding: 0 24px;         /* allows peek on sides */
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;   /* hide scrollbar */
}

/* Each DayCard wrapper */
.day-carousel-item {
  flex: 0 0 calc(100vw - 48px);
  scroll-snap-align: center;
}
```

Equivalent Tailwind: `flex overflow-x-scroll snap-x snap-mandatory gap-3 px-6` on container; `flex-none w-[calc(100vw-48px)] snap-center` on each item.

**Dot indicator sync:** Use `IntersectionObserver` (threshold: 0.6) on each day card to detect which is centered, updating `currentDayIndex` state. This replaces the current touch swipe handler.

### Anti-Patterns to Avoid

- **Attaching drag listeners to the whole SlotCard root:** Breaks mobile scroll. Only attach to DragHandle element.
- **useEffect syncing dnd state back to query cache:** Causes infinite loops. Use transient local state + mutation callbacks instead.
- **Calling `queryClient.invalidateQueries` inside `onDragEnd`:** Results in flicker because the refetch is async. Use `setQueryData` for optimistic update or `setPendingSlots` pattern.
- **Using `@dnd-kit/sortable`'s `SortableContext` for cross-container drag:** SortableContext is for reordering within a single list. Cross-container (cross-day) drag requires raw `useDraggable`/`useDroppable`.
- **Setting `touch-action: manipulation` on the entire page/body:** Disables double-tap zoom globally — too aggressive.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag state, hit testing, accessibility, keyboard | Custom pointer/touch event handlers | @dnd-kit/core | Hit testing across stacked elements, keyboard mode, screen reader announcements are non-trivial |
| CSS transform during drag | Manual style injection | CSS.Translate.toString() from @dnd-kit/utilities | Avoids triggering layout reflow; GPU-composited transform is correct |
| DragOverlay portal | Custom fixed-position clone element | DragOverlay from @dnd-kit/core | Portal handles z-index, pointer events, overflow clip, and drop animation |
| Cross-browser touch-action | UA detection + heuristics | `touch-action: none` on handle element | Browser-native; no JS override needed |

**Key insight:** The combination of drag handle + distance constraint (not delay) is the correct pattern for this use case. Delay-based activation causes a noticeable pause on mobile. Distance-based + handle-only listeners provides instantaneous drag start from the handle while preserving scroll everywhere else.

---

## Database Migration

### Migration: 023_dnd_locked_slots.sql

The `meal_plan_slots` table currently has `is_override boolean not null default false`. The new `is_locked` column follows the identical pattern:

```sql
-- Migration: 023_dnd_locked_slots.sql
alter table public.meal_plan_slots
  add column if not exists is_locked boolean not null default false;

comment on column public.meal_plan_slots.is_locked is
  'When true, auto-generation (Phase 22) skips this slot. Users can still drag/edit locked slots manually.';
```

No index needed — Phase 22 will filter with `where is_locked = false` on a plan_id-filtered result set (already indexed via `meal_plan_slots_plan_id_idx`).

No RLS policy changes needed — existing UPDATE policy already covers this column (it allows household members to update any column on slots belonging to their household's plans).

No backfill needed — `default false` covers all existing rows.

### TypeScript Type Update

```typescript
// src/types/database.ts — add to MealPlanSlot interface
export interface MealPlanSlot {
  id: string
  plan_id: string
  day_index: number
  slot_name: string
  slot_order: number
  meal_id: string | null
  is_override: boolean
  is_locked: boolean      // NEW — Phase 19
  created_at: string
}
```

### New Hook: useToggleLock

```typescript
// Pattern mirrors useClearSlot in useMealPlan.ts
export function useToggleLock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ slotId, isLocked }: { slotId: string; isLocked: boolean; planId: string }) => {
      const { error } = await supabase
        .from('meal_plan_slots')
        .update({ is_locked: isLocked })
        .eq('id', slotId)
      if (error) throw error
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlan.slots(planId) })
    },
  })
}
```

---

## Common Pitfalls

### Pitfall 1: Mobile Scroll Blocked by touch-action: none on Card Root

**What goes wrong:** If `touch-action: none` or drag listeners are attached to the SlotCard root div, the entire card becomes a drag zone. Users cannot scroll the page by touching a card — every touch initiates a drag attempt.

**Why it happens:** dnd-kit's listeners include `onPointerDown`/`onTouchStart` which call `preventDefault()` under the hood, blocking scroll.

**How to avoid:** Attach listeners only to the DragHandle element. Apply `touch-action: none` only to the handle's DOM node. The card body retains default `touch-action: auto` (scroll pass-through).

**Warning signs:** Page becomes unscrollable on iOS Safari after adding dnd-kit. Scroll works on desktop but not mobile.

### Pitfall 2: Drop Flicker / Snap-Back

**What goes wrong:** Item visually snaps back to its original position for ~100–200ms after being dropped, then jumps to the new position when the query cache updates.

**Why it happens:** dnd-kit clears its internal drag transform immediately on drop. If the UI is driven entirely by the TanStack Query cache (which updates after the async mutation resolves), there's a gap where neither dnd-kit nor the cache shows the correct position.

**How to avoid:** Use `pendingSlots` transient local state (Pattern 3 above). Display `pendingSlots ?? slots` as the source of truth for rendering.

**Warning signs:** Smooth drag but visible snap on release.

### Pitfall 3: Swap Logic with Upsert Conflicts

**What goes wrong:** The `meal_plan_slots` table has a `unique (plan_id, day_index, slot_name)` constraint. Naively swapping by running two sequential `useAssignSlot` calls will succeed for the first upsert but the second may conflict if done in the wrong order — or two slots may temporarily hold the same meal_id.

**Why it happens:** Upsert order matters when both source and target already exist.

**How to avoid:** Execute swap as two parallel `upsert` calls (each targeting the correct `plan_id, day_index, slot_name` conflict key), wrapped in a single `Promise.all`. Each call provides the full new state, so the upsert replaces cleanly. Alternatively, add a dedicated `useSwapSlots` mutation that updates both rows in a single Supabase RPC call.

**Warning signs:** Race condition errors from Supabase on swap; one slot ends up with the old meal after a swap.

### Pitfall 4: IntersectionObserver Carousel vs dnd-kit Drag Interaction

**What goes wrong:** When user drags a card near the edge of the carousel, the carousel may scroll (native behavior), but dnd-kit's hit testing doesn't account for the scroll position delta, causing drop to register on the wrong slot.

**Why it happens:** dnd-kit measures droppable positions at drag start. If the carousel scrolls during drag, droppable positions shift but dnd-kit's collision detection uses stale coordinates.

**How to avoid:** Per UI-SPEC D-08, mobile carousel does NOT auto-scroll during drag — users drag onto the visible adjacent-day peek area. Prevent scroll-during-drag by calling `e.preventDefault()` on the carousel container's `onScroll` during an active drag. Alternative: recalculate droppable positions using `dndContext.measureDroppableContainers()` on scroll.

**Warning signs:** Drop lands on wrong slot after carousel scrolls.

### Pitfall 5: `useMealPlanSlots` Returns Stale is_locked After Migration

**What goes wrong:** After deploying the migration, existing query cache entries for `meal_plan_slots` won't include `is_locked` until invalidated, because the select query `select('*, meals(*, meal_items(*))')` will now return the new column but cached data won't have it.

**Why it happens:** TanStack Query returns cached data until invalidation. If the user's session spans the migration, they'll see stale data.

**How to avoid:** The TypeScript type adds `is_locked: boolean` — accessing it on old cached objects returns `undefined`. Guard with `slot.is_locked ?? false` in LockBadge and in any Phase 22 filter logic.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### DndContext Setup in PlanGrid

```typescript
// Source: dndkit.com/introduction/getting-started + Pattern 3 above
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'

// Inside PlanGrid component:
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
)
const [activeSlot, setActiveSlot] = useState<SlotWithMeal | null>(null)
const [pendingSlots, setPendingSlots] = useState<SlotWithMeal[] | null>(null)
const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)

function handleDragStart(event: DragStartEvent) {
  setActiveSlot(event.active.data.current?.slot ?? null)
}

function handleDragEnd(event: DragEndEvent) {
  setActiveSlot(null)
  const { active, over } = event
  if (!over || active.id === over.id) return

  const sourceSlot: SlotWithMeal = active.data.current!.slot
  const targetData = over.data.current!
  const targetCurrentSlot: SlotWithMeal | null = targetData.currentSlot

  if (targetCurrentSlot?.meal_id) {
    // Occupied target — show action menu (D-10)
    setPendingDrop({
      sourceSlot,
      targetSlot: targetCurrentSlot,
      targetDayIndex: targetData.dayIndex,
      targetSlotName: targetData.slotName,
    })
  } else {
    // Empty target — move immediately (D-11)
    executeMoveSlot(sourceSlot, targetData.dayIndex, targetData.slotName)
  }
}

return (
  <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    {/* ... day cards ... */}
    <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-in' }}>
      {activeSlot ? <SlotCard slotName={activeSlot.slot_name} slot={activeSlot} isDragging onAssign={()=>{}} onClear={()=>{}} onSwap={()=>{}} /> : null}
    </DragOverlay>
    {pendingDrop && (
      <DropActionMenu
        onSwap={() => executeSwap(pendingDrop)}
        onReplace={() => executeReplace(pendingDrop)}
        onCancel={() => setPendingDrop(null)}
      />
    )}
  </DndContext>
)
```

### DragHandle Component

```typescript
// src/components/plan/DragHandle.tsx
// Source: docs.dndkit.com/api-documentation/draggable — drag handle pattern
import type { DraggableSyntheticListeners, DraggableAttributes } from '@dnd-kit/core'

interface DragHandleProps {
  listeners: DraggableSyntheticListeners
  attributes: DraggableAttributes
  ariaLabel: string
}

export function DragHandle({ listeners, attributes, ariaLabel }: DragHandleProps) {
  return (
    <div
      {...listeners}
      {...attributes}
      aria-label={ariaLabel}
      role="button"
      tabIndex={0}
      className="flex items-center justify-center w-6 min-h-[44px] md:min-h-[32px] cursor-grab active:cursor-grabbing text-accent/60 hover:text-accent shrink-0"
      style={{ touchAction: 'none' }}  // must be inline style — Tailwind purges unused arbitrary props
    >
      {/* Grip icon — 3 horizontal lines */}
      <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
        <rect y="0" width="12" height="1.5" rx="0.75" />
        <rect y="4.25" width="12" height="1.5" rx="0.75" />
        <rect y="8.5" width="12" height="1.5" rx="0.75" />
      </svg>
    </div>
  )
}
```

**Critical:** `touchAction: 'none'` must be inline style. Tailwind's `touch-none` class may be purged in production builds if not present in the codebase at build time; inline style is guaranteed.

### Droppable Slot Position

```typescript
// Inside DayCard — each slot position is droppable
import { useDroppable } from '@dnd-kit/core'

function DroppableSlotPosition({ dayIndex, slotName, slot, children }: ...) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drop-${dayIndex}-${slotName}`,
    data: { dayIndex, slotName, currentSlot: slot },
  })

  return (
    <div
      ref={setNodeRef}
      className={isOver && !slot?.meal_id ? 'ring-2 ring-primary/60 rounded-lg' : ''}
    >
      {children}
    </div>
  )
}
```

### Carousel CSS (Tailwind classes)

```typescript
// DayCarousel.tsx — mobile only, rendered by PlanGrid at md:hidden
<div className="flex overflow-x-scroll snap-x snap-mandatory gap-3 px-6 pb-2 -mx-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  {dayCards.map((card, i) => (
    <div key={i} className="flex-none w-[calc(100vw-48px)] snap-center">
      {card}
    </div>
  ))}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core | 2022+ | rbd is unmaintained; dnd-kit has active development and React 18/19 support |
| Delay-based touch activation | Distance-based + drag handle | dnd-kit v6+ | Zero-delay drag from handle; no laggy press-and-hold UX |
| SortableContext for cross-list | useDraggable + useDroppable | dnd-kit docs | SortableContext is for same-list reorder; cross-container needs raw hooks |
| `@dnd-kit/react` v0.x alpha | `@dnd-kit/core` v6.x | 2025 | Alpha package; @dnd-kit/core is the stable production choice |

**Deprecated/outdated:**
- `react-beautiful-dnd`: No React 18+ support, abandoned by Atlassian.
- `delay` activation constraint on TouchSensor: Creates 200–500ms pause before drag starts; replaced by drag handle + `distance` constraint.
- Manual `e.preventDefault()` in touch handlers: Replaced by `touch-action: none` on the handle element (browser-native, more reliable).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@dnd-kit/core` v6.3.1 works with React 19 with no runtime issues beyond peerDep satisfaction | Standard Stack | Low — peerDep is `>=16.8.0`; React 19 fulfills it; no known breaking changes in React 19 for dnd-kit [VERIFIED: npm registry peerDependencies] |
| A2 | The existing `plan members update meal_plan_slots` RLS policy covers the new `is_locked` column without changes | Database Migration | Low — Postgres RLS operates at row level, not column level; the policy grants UPDATE on the row to household members |
| A3 | CSS scroll-snap `scroll-snap-type: x mandatory` is supported in all target browsers (iOS Safari, Chrome Android) | Pattern 6 | Low — scroll-snap has been in all major browsers since 2018; [ASSUMED] baseline coverage |
| A4 | `IntersectionObserver` is suitable for carousel dot indicator sync | Pattern 6 | Low — available in all modern browsers; [ASSUMED] no special polyfill needed |

**All critical claims (library compatibility, sensor API, migration schema) are VERIFIED or CITED.**

---

## Open Questions

1. **Swap mutation: two sequential upserts vs Supabase RPC**
   - What we know: Two `useAssignSlot` calls in `Promise.all` are straightforward but cross two HTTP round-trips. A Supabase Edge Function RPC could do it atomically.
   - What's unclear: Whether atomicity matters here — non-atomic swap means a brief window where one meal appears in both slots (server-side, not visible to client due to `pendingSlots`).
   - Recommendation: Use `Promise.all([assignSlot1, assignSlot2])` for Wave 1. The unique constraint prevents a third party from inserting into the slot between the two updates (the upsert updates the existing row). This is safe without a transaction for this use case.

2. **DropActionMenu anchor position on mobile**
   - What we know: UI-SPEC says "rendered as a small popover anchored to the target slot." On mobile, the target slot may be near the bottom of the screen.
   - What's unclear: Whether the menu should anchor below or above the target slot based on available space.
   - Recommendation: Render the menu inline below the target SlotCard (not as a floating popover) to avoid positioning complexity. Use `role="dialog"` with `aria-modal="true"` and focus trap. Dismiss on outside tap via a transparent overlay.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @dnd-kit/core | DnD interaction | ✗ (not installed) | — | None — must install |
| @dnd-kit/sortable | DnD sortable utilities | ✗ (not installed) | — | None — must install |
| @dnd-kit/utilities | CSS transform helpers | ✗ (not installed) | — | None — must install |
| Supabase CLI | DB migration | ✓ (existing project) | — | — |
| CSS scroll-snap | DayCarousel | ✓ (native browser) | — | — |

**Missing dependencies with no fallback:**
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — must be installed in Wave 0 before any component work.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vite.config.ts (vitest config embedded via `test` key, or separate vitest.config.ts — existing pattern) |
| Quick run command | `npx vitest run tests/meal-plan.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-01 | Swap logic: given two slots, swap returns correct day_index/meal_id assignments | unit | `npx vitest run tests/drag-and-drop.test.ts` | ❌ Wave 0 |
| PLAN-01 | Move logic: move to empty slot clears source, fills target | unit | `npx vitest run tests/drag-and-drop.test.ts` | ❌ Wave 0 |
| PLAN-03 | is_locked persists: source slot file contains is_locked field on MealPlanSlot | unit (source check) | `npx vitest run tests/drag-and-drop.test.ts` | ❌ Wave 0 |
| PLAN-03 | Locked slot: useToggleLock mutation payload sets is_locked correctly | unit | `npx vitest run tests/drag-and-drop.test.ts` | ❌ Wave 0 |
| PLAN-01 | DragHandle renders with touch-action none | unit (source check) | `npx vitest run tests/drag-and-drop.test.ts` | ❌ Wave 0 |

**Note:** dnd-kit drag interactions are not testable via Vitest unit tests (they require pointer events in a browser environment). Test the **logic** (swap/move slot computation functions) with pure unit tests. Test the visual/interaction behavior via manual Playwright verification.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/drag-and-drop.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/drag-and-drop.test.ts` — covers PLAN-01 swap logic, PLAN-01 move logic, PLAN-03 is_locked, DragHandle source check
- [ ] Install @dnd-kit packages: `npm install @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2`
- [ ] DB migration file: `supabase/migrations/023_dnd_locked_slots.sql`

---

## Security Domain

> `security_enforcement` is not set to false in config.json — section is included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — existing auth unchanged |
| V3 Session Management | no | n/a — existing session unchanged |
| V4 Access Control | yes | Supabase RLS on meal_plan_slots (existing policy covers UPDATE for household members) |
| V5 Input Validation | yes | `day_index` in DB has `check (day_index between 0 and 6)` constraint; `slot_name` is validated against DEFAULT_SLOTS at upsert |
| V6 Cryptography | no | n/a — no new secrets |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Drag-and-drop cross-household slot assignment | Tampering | RLS on meal_plan_slots checks plan_id belongs to user's household; no client-supplied household_id |
| Lock toggle on another household's slot | Tampering | Same RLS policy — UPDATE requires plan_id to trace to authenticated user's household |
| Invalid day_index injected via mutation | Tampering | DB CHECK constraint `day_index between 0 and 6` rejects invalid values |

No new security surface is introduced beyond the single boolean column addition. The existing RLS policies are sufficient.

---

## Sources

### Primary (HIGH confidence)
- `npm view @dnd-kit/core` — version 6.3.1, peerDependencies `react >=16.8.0` [VERIFIED]
- `npm view @dnd-kit/sortable` — version 10.0.0 [VERIFIED]
- `npm view @dnd-kit/utilities` — version 3.2.2 [VERIFIED]
- dndkit.com/introduction/getting-started — DndContext, useDraggable, useDroppable, CSS.Translate.toString [CITED]
- github.com/dnd-kit/docs/blob/master/api-documentation/sensors/pointer.md — PointerSensor distance/delay/tolerance constraints [CITED]
- github.com/dnd-kit/docs/blob/master/api-documentation/sensors/touch.md — TouchSensor constraints [CITED]
- developer.mozilla.org/en-US/docs/Web/CSS/Guides/Overflow/Carousels — scroll-snap-type, scroll-snap-align [CITED]
- `supabase/migrations/008_meals_plans_targets.sql` — meal_plan_slots schema [VERIFIED: codebase]
- `src/types/database.ts` — MealPlanSlot interface [VERIFIED: codebase]
- `src/hooks/useMealPlan.ts` — useAssignSlot, useClearSlot patterns [VERIFIED: codebase]
- `src/components/plan/PlanGrid.tsx`, `DayCard.tsx`, `SlotCard.tsx` — existing component API [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- github.com/clauderic/dnd-kit/discussions/1522 — transient local state pattern for TanStack Query + dnd-kit flicker prevention [CITED: community discussion, multiple confirmations]
- dndkit.com/react/components/drag-overlay — DragOverlay props and placement [CITED]

### Tertiary (LOW confidence)
- WebSearch: `@dnd-kit/react` v0.x alpha package — newer API direction but unstable; not used here [WebSearch only]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry confirmed versions and peerDeps
- Architecture: HIGH — patterns verified against official dnd-kit docs and codebase
- DB migration: HIGH — mirrors existing is_override column exactly
- Pitfalls: MEDIUM — flicker pitfall verified by GitHub discussion; others from codebase analysis
- Mobile carousel: HIGH — CSS scroll-snap is a well-established browser API

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (dnd-kit 6.x is stable; no major changes expected)
