# Phase 27 — Deferred Items

Items discovered during execution that are out of scope for Phase 27 (do not affect schedule wiring).

## Pre-existing test failures (not caused by Plan 27-01)

Discovered during Plan 27-01 verification. Confirmed pre-existing by stash + re-run against HEAD: same 12 failures, same files.

| File | Failures | Notes |
|------|----------|-------|
| `tests/theme.test.ts` | 6/7 | All theme/dark-mode toggle tests fail. Unrelated to schedule. |
| `tests/auth.test.ts` | 3/6 | signUp / signInWithPassword / signInWithOAuth tests fail. Unrelated to schedule. |
| `tests/AuthContext.test.tsx` | 2/5 | session init + signOut tests fail (supabase.auth.getUser mock). Unrelated to schedule. |
| `tests/guide.test.ts` | 1/6 | GuidePage hash deep-link test fails. Unrelated to schedule. |

Total: 12 failed / 200 passed / 39 todo (251 total tests).

These failures should be addressed in a separate phase focused on test infrastructure repair.
