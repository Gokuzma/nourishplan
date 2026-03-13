---
phase: 1
slug: foundation-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vitest.config.ts` (or inline in `vite.config.ts`) — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual HSHD-05 isolation check
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01 | unit | `npx vitest run tests/auth.test.ts -t "signup"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | AUTH-02 | unit | `npx vitest run tests/AuthContext.test.tsx` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | AUTH-03 | unit | `npx vitest run tests/AuthContext.test.tsx -t "logout"` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | AUTH-04 | unit | `npx vitest run tests/auth.test.ts -t "reset"` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | HSHD-01 | manual | Manual — requires live Supabase | N/A | ⬜ pending |
| 01-02-02 | 02 | 1 | HSHD-02 | manual | Manual — requires live Supabase | N/A | ⬜ pending |
| 01-02-03 | 02 | 1 | HSHD-03 | manual | Manual — requires live Supabase | N/A | ⬜ pending |
| 01-02-04 | 02 | 1 | HSHD-04 | manual | Manual — RLS policy test | N/A | ⬜ pending |
| 01-02-05 | 02 | 1 | HSHD-05 | manual | Manual — two user sessions | N/A | ⬜ pending |
| 01-03-01 | 03 | 1 | PLAT-01 | unit | `npx vitest run tests/AppShell.test.tsx` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 1 | PLAT-02 | unit | `npx vitest run tests/theme.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — test environment config with jsdom
- [ ] `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- [ ] `tests/setup.ts` — `@testing-library/jest-dom` import for DOM matchers
- [ ] `tests/auth.test.ts` — covers AUTH-01, AUTH-04 (mocked Supabase client)
- [ ] `tests/AuthContext.test.tsx` — covers AUTH-02, AUTH-03
- [ ] `tests/AppShell.test.tsx` — covers PLAT-01 (viewport-responsive layout)
- [ ] `tests/theme.test.ts` — covers PLAT-02 (dark mode class toggle logic)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Household creation inserts rows in `households` + `household_members` | HSHD-01 | Requires live Supabase instance | Create household via UI, verify rows in Supabase dashboard |
| Invite token generated, join flow works | HSHD-02 | Requires live Supabase instance | Generate invite link, open in incognito, join as new user |
| Member list returned via `useHousehold` hook | HSHD-03 | Requires live Supabase instance | Create household with 2+ members, verify list renders |
| Admin can manage children's profiles, member cannot | HSHD-04 | RLS policy test needs two auth sessions | Log in as admin → edit profile (succeeds); log in as member → edit profile (blocked) |
| Cross-household data isolation | HSHD-05 | Phase gate test — RLS correctness | Log in as user A → see only household A data; log in as user B → see only household B data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
