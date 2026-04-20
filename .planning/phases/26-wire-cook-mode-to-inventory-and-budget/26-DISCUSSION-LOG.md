# Phase 26: Wire Cook Mode to Inventory and Budget - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 26-wire-cook-mode-to-inventory-and-budget
**Areas discussed:** Shared hook vs inline duplication, Leftover prompt UX, Multi-recipe/combined session scope, RecipeBuilder parity, Completion flow / navigation, Missing ingredients, Idempotency, Test strategy

---

## Gray area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Shared hook vs inline duplication | Reference logic lives inline in RecipeBuilder.tsx:576-616 — do we extract, duplicate, or helper-util it | ✓ |
| Leftover prompt UX | AddInventoryItemModal + leftoverDefaults exists but no caller — where does the prompt fire | ✓ |
| Multi-recipe / combined session scope | CookModePage supports recipe_ids.length > 1 — in or out of scope for Phase 26 | ✓ |
| RecipeBuilder parity for leftover prompt | Only required by ROADMAP on CookModePage — do we also add to RecipeBuilder | ✓ |

**User's choice:** All 4 selected ("and 1!" — confirming shared-hook question)

---

## Shared hook vs inline duplication

| Option | Description | Selected |
|--------|-------------|----------|
| Extract shared hook | Create useCookCompletion, refactor RecipeBuilder + wire CookModePage. One source of truth. | ✓ |
| Inline duplication in CookModePage | Copy handleMarkAsCooked body into CookModePage. Faster, drift risk. | |
| Thin helper util only | Extract cost calc + needs-array builder only. Each page owns mutation wiring. | |

**User's choice:** Extract shared hook (Recommended)
**Notes:** Drives D-01/D-02/D-07 — refactor RecipeBuilder alongside CookModePage wiring

---

## Leftover prompt UX

| Option | Description | Selected |
|--------|-------------|----------|
| Button inside CookDeductionReceipt | Receipt gains a "Save leftover portion" button that opens AddInventoryItemModal | ✓ |
| Auto-open modal after receipt | Modal automatically opens after receipt dismisses; user must cancel | |
| Separate banner below receipt | Receipt + distinct banner both render | |

**User's choice:** Button inside CookDeductionReceipt (Recommended)
**Notes:** Consistent with non-intrusive pattern; receipt auto-dismiss keeps flow uncluttered

---

## Prompt visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Always show | Button always renders; user dismisses if not applicable | ✓ |
| Only when servings > 1 | Hide button for single-serving cooks | |

**User's choice:** Always show (Recommended)
**Notes:** Simpler logic, user decides; single-serving partial eats are real

---

## Multi-recipe / combined session scope

| Option | Description | Selected |
|--------|-------------|----------|
| Single-recipe only | Phase 26 handles recipe_ids.length === 1. Combined stays with Phase 28. | ✓ |
| Handle combined too | Deduct per-recipe, multi-row spend_logs | |
| Handle combined with single spend entry | Summed single spend_log, recipe_id=null | |

**User's choice:** Single-recipe only (Recommended)
**Notes:** Phase 28 already owns generate-cook-sequence orphans; clean scope boundary. D-08/D-09/D-10.

---

## RecipeBuilder parity

| Option | Description | Selected |
|--------|-------------|----------|
| Add to RecipeBuilder too | Shared CookDeductionReceipt means RecipeBuilder inherits the leftover button for free | ✓ |
| Only wire CookModePage | Conditional prop on receipt; RecipeBuilder frozen | |

**User's choice:** Yes — add to RecipeBuilder too (Recommended)
**Notes:** Free benefit from shared hook; consistent UX; D-07.

---

## Idempotency

| Option | Description | Selected |
|--------|-------------|----------|
| Transition-based guard | Fire only when status transitions in_progress → completed | ✓ |
| Add DB marker column | New inventory_deducted_at column on cook_sessions | |
| Best-effort | No guard; accept rare double-deducts | |

**User's choice:** Transition-based guard (Recommended)
**Notes:** No migration needed, uses existing schema; D-16.

---

## Navigation timing

| Option | Description | Selected |
|--------|-------------|----------|
| Stay on page until receipt dismisses | Receipt floats over CookModeShell; navigate(-1) after dismiss | ✓ |
| Navigate immediately, float receipt on destination | Return to plan view immediately; receipt renders there | |

**User's choice:** Stay on page until receipt dismisses (Recommended)
**Notes:** Matches RecipeBuilder UX; clearer cause-and-effect. D-14/D-15.

---

## Missing ingredients behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror RecipeBuilder | Deduct what's available, list missing in receipt, proceed | ✓ |
| Confirm before proceeding | Blocking "X of Y available — cook anyway?" modal | |

**User's choice:** Mirror RecipeBuilder — surface in receipt, proceed (Recommended)
**Notes:** Consistent UX; `is_partial` keeps existing semantics. D-13.

---

## Test coverage strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Hook unit tests + grep assertions | Vitest unit test on useCookCompletion + import assertions in tests/cookMode.test.tsx | ✓ |
| Full integration test | Hook unit + RTL render test on CookModePage | |
| Grep-level only | Just import/call-site assertions | |

**User's choice:** Hook unit tests + grep assertions (Recommended)
**Notes:** D-17/D-18/D-19. Playwright smoke via claude-test account is manual UAT.

---

## Claude's Discretion

- Hook name (`useCookCompletion` suggested) and exact file location
- Whether helper utilities lift into `src/utils/cookCompletion.ts` or stay inline
- Exact `CookDeductionReceipt` prop name for leftover callback
- Modal open/close state management pattern in CookModePage
- Console warning wording for multi-recipe early-return

## Deferred Ideas

- Combined / multi-recipe cook wiring → Phase 28 (PREP-02)
- DB marker column `cook_sessions.inventory_deducted_at` → not needed for Phase 26
- Blocking pre-cook confirmation modal → rejected; inconsistent with RecipeBuilder
- Component-render RTL test of CookModePage → rejected; hook unit + manual UAT sufficient
