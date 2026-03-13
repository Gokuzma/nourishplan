---
phase: 4
slug: daily-logging-summary
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | vite.config.ts (vitest config inline) |
| **Quick run command** | `npx vitest run tests/food-logs.test.ts tests/nutrition.test.ts --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/food-logs.test.ts tests/nutrition.test.ts --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | TRCK-04 | unit | `npx vitest run tests/food-logs.test.ts -t "getUnloggedSlots" --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | TRCK-04 | unit | `npx vitest run tests/nutrition.test.ts -t "calcLogEntryNutrition" --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 0 | TRCK-06 | unit | `npx vitest run tests/nutrition.test.ts -t "calcLogEntryNutrition" --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 0 | TRCK-07 | unit | `npx vitest run tests/nutrition.test.ts -t "calcDayNutrition" --reporter=verbose` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 0 | PLAT-03 | unit | `npx vitest run tests/food-logs.test.ts -t "install prompt" --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 0 | PLAT-04 | unit | `npx vitest run tests/food-logs.test.ts -t "useOnlineStatus" --reporter=verbose` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/food-logs.test.ts` — stubs for TRCK-04 (getUnloggedSlots), PLAT-03 (install prompt detection), PLAT-04 (useOnlineStatus)
- [ ] `calcLogEntryNutrition` function in `src/utils/nutrition.ts` — needed before tests can run
- [ ] `getUnloggedSlots` utility — needed before tests can run
- [ ] PNG icons at `public/icon-192.png` and `public/icon-512.png` — required for PWA manifest validation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PWA install on iOS | PLAT-03 | iOS `beforeinstallprompt` not supported; requires physical device | Open app in Safari iOS → Share → Add to Home Screen → Verify app launches |
| Offline log sync | PLAT-04 | Requires toggling device network state | 1. Go offline 2. Log a meal 3. Go online 4. Verify log appears in Supabase |
| Daily summary visual layout | TRCK-07 | Visual/UX verification | Navigate to daily summary → Verify calories, macros, micros vs targets displayed correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
