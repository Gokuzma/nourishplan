---
phase: 07
slug: fix-auth-household-gaps
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (detected from project) |
| **Config file** | vite.config.ts (inline test config) |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | AUTH-04 | smoke render | `npx vitest run` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | AUTH-04 | manual E2E | N/A — requires live Supabase + email | N/A | ⬜ pending |
| 07-01-03 | 01 | 1 | HSHD-01 | type check | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ResetPasswordPage.test.tsx` — smoke render test for new page component (AUTH-04)

*The TypeScript fix for HSHD-01 is validated purely by `tsc --noEmit` — no new test file needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full password reset flow (email → link → new password) | AUTH-04 | Requires live Supabase email delivery + browser redirect | 1. Click "Forgot password" on login page 2. Enter email, submit 3. Check inbox for reset email 4. Click link → lands on /auth/reset-password 5. Enter new password, submit 6. Verify redirect to home and login with new password works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
