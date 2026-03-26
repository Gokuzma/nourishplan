---
phase: 17
slug: inventory-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| **Config file** | `vite.config.ts` (vitest config embedded) |
| **Quick run command** | `npx vitest run src/utils/inventory.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils/inventory.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | INVT-01 | unit | `npx vitest run src/utils/inventory.test.ts -t "add item"` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | INVT-02 | unit | `npx vitest run src/utils/inventory.test.ts -t "quantity"` | ❌ W0 | ⬜ pending |
| 17-01-03 | 01 | 1 | INVT-03 | unit | `npx vitest run src/utils/inventory.test.ts -t "expiry"` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 2 | INVT-05 | unit | `npx vitest run src/utils/inventory.test.ts -t "fifo"` | ❌ W0 | ⬜ pending |
| 17-02-02 | 02 | 2 | INVT-06 | unit | `npx vitest run src/utils/inventory.test.ts -t "leftover"` | ❌ W0 | ⬜ pending |
| 17-03-01 | 03 | 2 | INVT-04 | manual | N/A — camera + barcode required | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/inventory.test.ts` — stubs for INVT-01/02/03/05/06 (expiry urgency, FIFO deduction, unit conversion, leftover flag)
- [ ] Framework already installed — no additional install needed
- [ ] `@zxing/browser` + `@zxing/library` npm install for barcode scanning

*Existing Vitest infrastructure covers all automatable phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Barcode scan + OFF lookup | INVT-04 | Camera API and WebRTC cannot be unit-tested without mocking entire media stack | 1. Open Inventory page 2. Tap "Scan Barcode" 3. Point camera at physical barcode 4. Verify name/brand auto-fills from OFF |
| Camera permission denied | INVT-04 | Browser permission state cannot be simulated in Vitest | 1. Deny camera permission 2. Verify manual entry fallback appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
