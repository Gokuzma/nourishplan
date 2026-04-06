# Phase 19: Drag-and-Drop Planner - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 19-drag-and-drop-planner
**Areas discussed:** Drag interaction style, Locked slot UX, Mobile touch handling, Slot swap behavior

---

## Drag Interaction Style

### Drag initiation method

| Option | Description | Selected |
|--------|-------------|----------|
| Long-press to drag | Press and hold ~300ms to pick up. Natural on mobile, no extra UI needed | |
| Drag handle icon | Small grip icon (≡) on left of each slot. Clear affordance | ✓ |
| Both (handle + long-press) | Handle on desktop, long-press on mobile. More complex | |

**User's choice:** Drag handle icon
**Notes:** Clear affordance preferred over invisible long-press gesture

### Visual feedback during drag

| Option | Description | Selected |
|--------|-------------|----------|
| Lifted card follows cursor | Card lifts with shadow, source shows dashed placeholder | ✓ |
| Ghost/transparent clone | Semi-transparent copy follows cursor, original dims | |
| You decide | Claude picks based on drag library | |

**User's choice:** Lifted card follows cursor

### Drag scope

| Option | Description | Selected |
|--------|-------------|----------|
| Cross-day (Recommended) | Drag between any slot across the entire week grid | ✓ |
| Same-day only | Drag only within a single DayCard | |
| Cross-day + reorder | Both cross-day and explicit within-day reorder | |

**User's choice:** Cross-day

---

## Locked Slot UX

### Visual indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Lock icon badge | Small lock icon in corner of SlotCard | |
| Colored border/accent | Distinct left border color on locked slots | |
| Icon + border combo | Both lock icon and border accent | ✓ |

**User's choice:** Icon + border combo
**Notes:** Accessibility — not relying on color alone

### Lock/unlock mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-lock on manual place | Any manually assigned meal is auto-locked, toggle to unlock | |
| Explicit lock button | User must tap lock button to lock. No auto-lock | ✓ |
| Auto-lock + easy unlock | Auto-lock on place, tap lock icon to toggle off | |

**User's choice:** Explicit lock button

### Locked slot draggability

| Option | Description | Selected |
|--------|-------------|----------|
| Locked = immovable | Cannot drag locked slots, must unlock first | |
| Locked = draggable | Lock only prevents auto-gen overwrite, user can still drag | ✓ |
| You decide | Claude picks during implementation | |

**User's choice:** Locked = draggable
**Notes:** Lock is about auto-generation protection, not UI restriction

---

## Mobile Touch Handling

### Scroll vs drag separation

| Option | Description | Selected |
|--------|-------------|----------|
| Drag handle only (Recommended) | Handle initiates drag, everything else scrolls | ✓ |
| Handle + activation delay | Handle with 150-200ms hold before drag activates | |
| You decide | Claude picks best touch threshold | |

**User's choice:** Drag handle only

### Mobile grid layout

| Option | Description | Selected |
|--------|-------------|----------|
| Keep vertical stack | Same layout, auto-scroll during drag near edges | |
| Horizontal day scroll | Days scroll horizontally like carousel | ✓ |
| You decide | Claude picks best mobile layout | |

**User's choice:** Horizontal day scroll

### Carousel day count

| Option | Description | Selected |
|--------|-------------|----------|
| 1 day full-width | One day fills screen, swipe to change | |
| 2-3 days partially visible | Current day centered, adjacent days peek from edges | ✓ |
| You decide | Claude picks based on screen width | |

**User's choice:** 2-3 days partially visible

---

## Slot Swap Behavior

### Drop onto occupied slot

| Option | Description | Selected |
|--------|-------------|----------|
| Swap meals (Recommended) | Meals exchange positions | |
| Replace (discard original) | Dropped meal takes slot, original cleared | |
| Swap + confirm dialog | Swap with confirmation prompt | |

**User's choice:** Custom — show action menu with "Swap" or "Replace" option per drop
**Notes:** User wants the choice each time, not a global setting

### Drop onto empty slot

| Option | Description | Selected |
|--------|-------------|----------|
| Move (source cleared) | Meal moves, source becomes empty | ✓ |
| Copy (source keeps meal) | Meal duplicated into target | |
| Move by default, hold key to copy | Normal = move, modifier key = copy | |

**User's choice:** Move (source cleared)

---

## Claude's Discretion

- Drag library choice
- Auto-scroll behavior near container edges
- Animation timing and easing
- Drop target highlight styling
- Mobile carousel implementation details

## Deferred Ideas

None
