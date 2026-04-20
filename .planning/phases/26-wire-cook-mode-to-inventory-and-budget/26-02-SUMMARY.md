---
phase: 26
plan: 02
subsystem: inventory
tags: [components, inventory, cook-mode, leftover]
requirements: [INVT-06]
dependency_graph:
  requires: []
  provides:
    - "CookDeductionReceipt.onSaveLeftover prop + Save leftover portion button affordance"
  affects:
    - "src/components/inventory/CookDeductionReceipt.tsx"
tech_stack:
  added: []
  patterns:
    - "Optional callback prop + conditional button render (backward-compat extension)"
    - "Secondary-emphasis button styling (bg-secondary / border-primary/30 / text-primary)"
key_files:
  created: []
  modified:
    - "src/components/inventory/CookDeductionReceipt.tsx"
decisions:
  - "D-04: leftover button lives inside CookDeductionReceipt (not a separate modal trigger)"
  - "D-05: button always renders when caller passes the prop (no heuristic gating)"
  - "D-07: shared receipt means RecipeBuilder + CookModePage inherit identical leftover UX"
metrics:
  duration: "~4 minutes"
  completed: "2026-04-19"
  tasks_completed: "1/1"
  files_modified: 1
  lines_added: 11
  lines_removed: 2
---

# Phase 26 Plan 02: Extend CookDeductionReceipt with Save Leftover Portion Affordance Summary

Additive extension to `CookDeductionReceipt` — exposes optional `onSaveLeftover?: () => void` prop and renders a "Save leftover portion" button left of the Done button when the prop is provided. Unlocks the leftover-inventory flow for both cook entry points (RecipeBuilder in Plan 03, CookModePage in Plan 04) via a single shared affordance.

## Files Modified

| File                                             | Lines Added | Lines Removed |
| ------------------------------------------------ | ----------- | ------------- |
| `src/components/inventory/CookDeductionReceipt.tsx` | 11          | 2             |

Diff stat: `1 file changed, 11 insertions(+), 2 deletions(-)` — 33 lines of `git diff` output total, confirming surgical (not wholesale) edit.

## Prop Contract (New Interface Shape)

```tsx
interface CookDeductionReceiptProps {
  mealName: string
  result: DeductionResult
  onClose: () => void
  onSaveLeftover?: () => void   // NEW — optional callback; when provided, renders the Save leftover portion button
}
```

Component signature:

```tsx
export function CookDeductionReceipt({ mealName, result, onClose, onSaveLeftover }: CookDeductionReceiptProps) { ... }
```

Button render (conditional on prop presence, placed left of Done inside the existing action row):

```tsx
<div className="flex justify-end gap-2 mt-2">
  {onSaveLeftover && (
    <button
      onClick={onSaveLeftover}
      className="bg-secondary border border-primary/30 text-primary px-4 py-2 rounded-[--radius-btn] text-sm"
    >
      Save leftover portion
    </button>
  )}
  <button
    onClick={onClose}
    className="bg-primary text-white px-4 py-2 rounded-[--radius-btn] text-sm"
  >
    Done
  </button>
</div>
```

## Backward Compatibility Note

The `onSaveLeftover` prop is optional (`?:`). The one existing caller today — `src/components/recipe/RecipeBuilder.tsx:1001-1008` — does not pass the prop, so:
- It continues to render only the Done button (button visibility is gated by `{onSaveLeftover && ...}`).
- The rendered layout is identical for the existing caller (the `gap-2` addition is a no-op when there's only one child).
- TypeScript does not require the new prop.
- Plan 03 (RecipeBuilder) and Plan 04 (CookModePage) will opt in by passing the callback.

## Preservation Verification (L-020 / L-027)

All existing rendering preserved as hard constraints:

| Feature                           | Status       | Evidence                                          |
| --------------------------------- | ------------ | ------------------------------------------------- |
| 8-second auto-dismiss             | Preserved    | `setTimeout(onClose, 8000)` unchanged (line 13)   |
| Deductions list (checkmark rows)  | Preserved    | `result.deductions.length > 0` block unchanged    |
| Missing items list (warning rows) | Preserved    | `result.missing.length > 0` block unchanged       |
| Error banner                      | Preserved    | `result.error && ...` block unchanged             |
| Done button (primary styling)     | Preserved    | `bg-primary text-white` class retained (line 65)  |
| Outer container layout            | Preserved    | `fixed bottom-[calc(...)] ... z-50` unchanged     |
| Mobile-safe bottom padding        | Preserved    | `env(safe-area-inset-bottom)` unchanged           |

## Acceptance Criteria (all passed)

- `grep -c "onSaveLeftover"` returns **4** (interface + destructure + onClick + button references) — exceeds required ≥3
- `grep -c "Save leftover portion"` returns **1**
- `grep -c "bg-secondary border border-primary/30 text-primary"` returns **1**
- `grep -c "gap-2"` returns **1**
- `grep -c "setTimeout(onClose, 8000)"` returns **1**
- `grep -c "result.error"` returns **1**
- `grep -c "bg-primary text-white"` returns **1** (Done button intact)
- `npx tsc --noEmit` passes with zero errors
- `git diff ... | wc -l` returns **33** (surgical edit, well under 40-line cap)
- `git status --short` shows only `src/components/inventory/CookDeductionReceipt.tsx` modified

## Decision Traceability

| Decision | Description                                                              | Satisfied By                                                                                                       |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| D-04     | Button inside CookDeductionReceipt, not a separately-triggered modal     | Button rendered inline within the receipt's action row, not as a separate overlay or triggered dialog              |
| D-05     | Always renders when caller passes the prop (no leftover-size heuristic)  | Gated purely by `{onSaveLeftover && ...}` — no conditional on result.deductions length or any quantity threshold   |
| D-07     | Shared receipt means both cook paths inherit identical UX                | The affordance lives in one shared component; Plans 03 + 04 simply pass the callback and get identical button UX   |
| INVT-06  | Uneaten portions can be saved as new inventory items                     | This plan exposes the **callback affordance**; downstream plans wire it to the leftover modal + save flow          |

## Deviations from Plan

None — plan executed exactly as written. No Rule 1/2/3 auto-fixes required. No architectural deviations. No authentication gates.

## Commits

| Task | Hash      | Message                                                                                        |
| ---- | --------- | ---------------------------------------------------------------------------------------------- |
| 1    | `17c3908` | `feat(26-02): add onSaveLeftover prop + Save leftover portion button to CookDeductionReceipt` |

## Self-Check: PASSED

- File exists: `src/components/inventory/CookDeductionReceipt.tsx` — FOUND
- Commit exists: `17c3908` — FOUND in `git log --oneline`
- All grep acceptance criteria return expected counts
- TypeScript compiles cleanly
- Only one source file modified; diff is surgical (11 insertions, 2 deletions)
