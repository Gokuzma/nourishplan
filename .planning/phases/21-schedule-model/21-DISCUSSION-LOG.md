# Phase 21: Schedule Model - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-06
**Phase:** 21-schedule-model
**Mode:** discuss
**Areas discussed:** Schedule granularity, Schedule editing UX, Plan page indicators, Schedule exceptions

## Gray Areas Presented

All 4 gray areas selected for discussion:
1. Schedule granularity
2. Schedule editing UX
3. Plan page indicators
4. Schedule exceptions

## Discussion Summary

### Schedule Granularity
- **Decided:** Per-slot granularity (breakfast/lunch/dinner/snack per day per member)
- **Rationale:** Most flexible for Planning Engine; allows "busy morning, free evening" distinctions

### Schedule Editing UX
- **Decided:** Grid picker (7×4 tap-to-cycle)
- **Rationale:** Compact, visual, matches plan grid aesthetic

### Plan Page Indicators
- **Decided:** Slot-level badge on SlotCard
- **Rationale:** Consistent with existing violation badges; granular visibility

### Schedule Exceptions
- **Decided:** Recurring weekly pattern + date-specific overrides
- **Rationale:** Covers routine weeks and one-off changes without forcing full date-by-date entry

### Critical User Correction: Batch Prep Workflow
- **Original assumption:** Three statuses (prep available / quick meal only / away)
- **User correction:** The primary use case is batch prep — cook everything in one or a few sessions (typically weekend), consume pre-made meals during the week
- **Updated model:** Four statuses: `prep` / `consume` / `quick` / `away`
- **Key constraint:** Meals on `consume` slots must come from recipes prepped on a preceding `prep` slot — Planning Engine (Phase 22) must enforce this linkage
- **Impact:** This is not a nice-to-have; batch prep is the household's main workflow and must be the easiest, most obvious path in the UI
