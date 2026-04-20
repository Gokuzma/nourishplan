---
phase: 26
slug: wire-cook-mode-to-inventory-and-budget
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-19
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `26-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/useCookCompletion.test.tsx tests/cookMode.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~25 seconds (full) / ~3 seconds (quick) |

Per lesson **L-001**, before running `npx vitest`:
```bash
for d in .claude/worktrees/agent-*; do git worktree remove "$d" --force 2>/dev/null; done
rm -rf .claude/worktrees/agent-*
```

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

Filled in by the planner in each PLAN.md `<automated>` block. The planner MUST map every requirement to a verification row. Template:

| Task ID | Plan | Wave | Requirement | Success Criterion | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-------------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | INVT-05 | Criterion #1 (FIFO deduct fires from cook completion) | unit | `npx vitest run tests/useCookCompletion.test.tsx -t "deducts"` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | BUDG-03 | Criterion #2 (spend_logs row inserted with source='cook') | unit | `npx vitest run tests/useCookCompletion.test.tsx -t "logs spend"` | ❌ W0 | ⬜ pending |
| 26-02-xx | 02 | 2 | INVT-05/BUDG-03 | CookModePage imports useCookCompletion + CookDeductionReceipt | grep | `npx vitest run tests/cookMode.test.tsx` | ✅ | ⬜ pending |
| 26-03-xx | 03 | 2 | INVT-06 | Criterion #3/#4 (receipt renders + leftover button opens modal) | grep | `npx vitest run tests/cookMode.test.tsx` | ✅ | ⬜ pending |
| 26-04-xx | 04 | 3 | INVT-05/06/BUDG-03 | RecipeBuilder refactored to use shared hook (no behaviour drift) | grep | `npx vitest run tests/cookMode.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/useCookCompletion.test.tsx` — hook unit test file (new) with mocked `supabase`, `useInventoryDeduct`, `useCreateSpendLog`, `useRecipeIngredients`, `useFoodPrices`, `useHousehold`. Mirrors the mocking pattern in `tests/cookSession.test.tsx`. Covers:
  - fires spend_log first, deduct second
  - deduct failure does NOT roll back spend (non-blocking per D-12)
  - cost calc replicates `computeRecipeCostPerServing` output
  - short-circuits when `recipe_ids.length !== 1`
  - short-circuits when `activeSession.status === 'completed'` (idempotency guard)
- [ ] `tests/cookMode.test.tsx` — append new `describe` blocks for grep assertions (additive; do not remove existing blocks)

Vitest + @testing-library/react already installed — no new dependencies.

---

## Manual-Only Verifications

Per **L-007** and CONTEXT.md D-19, success criterion #5 is manual Playwright UAT on a dev server.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end Budget → Cook → Inventory → Grocery reconciliation | INVT-05, INVT-06, BUDG-03 (Success Criterion #5) | Live Supabase state, service worker cache, real ingredient resolution — too heavy for CI | 1. Start `npx vite` dev server. 2. Log in as `claude-test@nourishplan.test` / `ClaudeTest!2026`. 3. Seed inventory with test ingredients matching a planned meal's recipe. 4. Open `/plan`, note current weekly spend. 5. Tap Cook on a slot → complete all steps → tap "Finish cook session". 6. Verify `CookDeductionReceipt` shows correct deducted items + any missing. 7. Tap "Save leftover portion" → `AddInventoryItemModal` opens pre-populated → save. 8. Return to `/plan` → weekly spend reflects the cook. 9. Open `/inventory` → deducted items reduced, leftover appears. 10. Open `/grocery` → regenerate list → deducted items correctly reflected. |
| RecipeBuilder "Mark as Cooked" parity | INVT-05, INVT-06, BUDG-03 | Behaviour must not regress | 1. Navigate to a recipe detail. 2. Tap "Mark as Cooked". 3. Verify spend_log, inventory deduct, receipt, leftover button all behave identically to pre-Phase-26. |
| Combined cook session short-circuit | D-08, D-09 | No combined session in test suite today | 1. Trigger a combined-prep cook (PREP-02 path) via DB seed if possible, OR confirm via console warning that short-circuit fires when `recipe_ids.length > 1`. |

Per lesson **L-003**, before Playwright verification of deployed changes, clear the service worker:
```js
const regs = await navigator.serviceWorker.getRegistrations();
for (const r of regs) await r.unregister();
caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
```

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (useCookCompletion.test.tsx creation)
- [ ] No watch-mode flags (use `vitest run`, not `vitest` bare)
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter once planner fills the per-task map

**Approval:** pending
