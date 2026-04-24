---
phase: 30-granular-household-member-permissions-system-admin-editor-vi
plan: 02
subsystem: testing
tags: [playwright, e2e, infrastructure, seed, vitest-exclusion, supabase-admin-sdk]

requires:
  - phase: 00-foundation
    provides: existing @supabase/supabase-js client + vitest.config.ts scaffold
provides:
  - "@playwright/test dev dependency (1.59.1) and chromium browser binary installed"
  - "playwright.config.ts at repo root (testDir: tests/e2e, chromium-only, on-demand dev server)"
  - "vitest.config.ts exclude list covering tests/e2e/** and .claude/worktrees/** (prevents L-001 recurrence)"
  - "tests/e2e/helpers/login.ts with login() and signOut() using L-026 transition-unique URL signals"
  - "scripts/seed-test-member.ts admin-SDK seed for claude-test-member@nourishplan.test + deterministic profiles.display_name UPSERT for both test accounts"
affects: [30-07, future-e2e-tests]

tech-stack:
  added: ["@playwright/test@^1.59.1"]
  patterns:
    - "Playwright config on-demand (no CI wiring) with local dev-server auto-boot"
    - "Vitest exclude for tests/e2e/** so Vitest and Playwright file trees coexist"
    - "Admin-SDK Node seed scripts (createClient with autoRefreshToken:false, persistSession:false)"
    - "Login helper uses transition-unique URL signal per L-026 (waitForURL away from /auth)"

key-files:
  created:
    - playwright.config.ts
    - tests/e2e/helpers/login.ts
    - scripts/seed-test-member.ts
  modified:
    - package.json
    - package-lock.json
    - vitest.config.ts

key-decisions:
  - "Seed script authored and committed now; execution blocked until user pastes SUPABASE_SERVICE_ROLE_KEY into .env.local (human-verify checkpoint returned)"
  - "Installed @playwright/test 1.59.1 (npm resolved latest patch in the ^1.47.2 range; satisfies plan's >=1.47.0 requirement)"
  - "login() uses input[type=\"email\"]/[type=\"password\"] selectors (AuthForm has no explicit ids) plus button[type=\"submit\"]"
  - "signOut() deliberately avoids /settings UI (freshly-seeded Member B has no household → /settings redirects to /setup, Log Out button never renders)"

patterns-established:
  - "tests/e2e/helpers/* exports reusable functions typed against Playwright's Page; specs import these"
  - "Seed scripts under scripts/ read .env.local directly (no dotenv dep needed); VITE_SUPABASE_URL is the admin-SDK URL source since SUPABASE_URL is not present"
  - "Playwright config omits webServer only when PLAYWRIGHT_BASE_URL is set (pointing at prod); default runs against local vite on :5173"

requirements-completed: []  # SPEC-Req-8 is satisfied by Plan 07; this plan only builds the infra Plan 07 needs

duration: ~13 min
completed: 2026-04-24
---

# Phase 30 Plan 02: Playwright E2E Infrastructure + Second Test User Seed Summary

**Playwright 1.59.1 + chromium installed, vitest excluded tests/e2e/**, tests/e2e/helpers/login.ts + scripts/seed-test-member.ts authored; seed execution gated on user pasting SUPABASE_SERVICE_ROLE_KEY into .env.local**

## Performance

- **Duration:** ~13 min (install: 8 min for deps + chromium download; config + helper + seed script authoring: 5 min)
- **Started:** 2026-04-24T02:33:00Z (approx — PLAN_START_EPOCH set at agent boot)
- **Completed:** 2026-04-24T02:46:03Z (agent returning checkpoint)
- **Tasks:** 2 of 3 fully complete; Task 3 script authored + committed, execution gated on human key-paste (checkpoint returned)
- **Files modified/created:** 6 (4 created, 2 modified)

## Accomplishments
- Playwright 1.59.1 dev dependency installed + chromium browser binary (111.5 MiB) provisioned via `npx playwright install chromium`
- `playwright.config.ts` scaffolded at repo root: testDir `tests/e2e`, chromium-only project, local dev-server auto-boot on :5173 with `reuseExistingServer`, trace/screenshot/video retained on failure
- `vitest.config.ts` now excludes `tests/e2e/**` + `**/node_modules/**` + `**/dist/**` + `.claude/worktrees/**` — prevents Vitest from attempting to run Playwright specs and kills the L-001 worktree-stale-duplicates footgun in one place
- `tests/e2e/helpers/login.ts` exports `login(page, {email, password})` and `signOut(page)` using transition-unique URL signals (L-026 compliant, no ambient-text waits)
- `scripts/seed-test-member.ts` authored: provisions `claude-test-member@nourishplan.test`, UPSERTs deterministic `profiles.display_name` rows for both test accounts (`Admin A (claude-test)` + `Member B (claude-test-member)`) for unambiguous MemberList aria-labels in Plan 07

## Task Commits

1. **Task 1: Install Playwright + scaffold playwright.config.ts + add Vitest exclusion** — `168e0b0` (chore)
2. **Task 2: Create tests/e2e/helpers/login.ts reusable login fn** — `1a31549` (feat)
3. **Task 3 (script artifact only): scripts/seed-test-member.ts authored** — `2fc3191` (feat) — execution gated on human key-paste, checkpoint returned
4. **Task 3 execution (post-merge, orchestrator 2026-04-23):** user pasted `SUPABASE_SERVICE_ROLE_KEY` into `.env.local`; `npx -y tsx scripts/seed-test-member.ts` exited 0 with output `Created user claude-test-member@nourishplan.test (id=b280c90e-b9af-4cd0-858d-9f2a49c5ce53)` + `UPSERTed profiles.display_name for 2 accounts` + `Wrote CLAUDE_TEST_MEMBER_PASSWORD to .env.local`. Auth smoke test via `/auth/v1/token?grant_type=password` returned a valid JWT access_token for the new account. Test-account memory file (`reference_test_account.md`) updated with the new member credentials block.

**Plan metadata commit:** (this SUMMARY.md commit hash — appended after write)

## Files Created/Modified

- `playwright.config.ts` (created) — Playwright E2E config, first in repo.
- `tests/e2e/helpers/login.ts` (created) — `login()` + `signOut()` helpers used by Plan 07 spec.
- `scripts/seed-test-member.ts` (created) — admin-SDK seed for claude-test-member + profile UPSERT; idempotent.
- `package.json` (modified) — `@playwright/test` added to devDependencies.
- `package-lock.json` (modified) — resolved lock for @playwright/test and its transitive deps.
- `vitest.config.ts` (modified) — `test.exclude` array added with `tests/e2e/**`, node_modules, dist, `.claude/worktrees/**`.

## Playwright Config Content

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npx vite --port 5173',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 30_000,
      },
})
```

## Vitest Config Content (final)

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/e2e/**',
      '.claude/worktrees/**',
    ],
  },
})
```

## Login Helper Signatures

```typescript
export interface TestAccount {
  email: string
  password: string
}

export async function login(page: Page, account: TestAccount): Promise<void>
export async function signOut(page: Page): Promise<void>
```

- `login()` clears cookies + local/sessionStorage, navigates to `/auth`, fills `input[type="email"]` + `input[type="password"]`, clicks `button[type="submit"]`, then `waitForURL` away from `/auth` (15s timeout).
- `signOut()` clears cookies + storage, navigates to `/auth`, waits for the email input to become visible (10s timeout).

## AuthPage Selector Notes

`src/pages/AuthPage.tsx` renders `<AuthForm />` (src/components/auth/AuthForm.tsx). Grep confirmed the form uses:
- `<input type="email" placeholder="Email">` — no explicit id
- `<input type="password" placeholder="Password">` — no explicit id
- `<button type="submit">Log In</button>` — the only submit button
- Successful `signInWithPassword` triggers the auth session → react-router redirects away from `/auth` (GuestGuard / AuthGuard pattern)

No selector adjustments were required beyond the plan's stated assumptions.

## Seed Script Observed Credentials Path

- Seed execution was NOT run (blocked by missing `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`)
- When run, generated password will be stored in `.env.local` as `CLAUDE_TEST_MEMBER_PASSWORD=<pw>` (gitignored; never committed)
- The raw password value will NOT appear in any tracked file (the memory-file append only references it as "from .env.local" without revealing the literal)

## Decisions Made

- **Commit the seed script artifact now** rather than wait for the key-paste. Rationale: the script is a static artifact (not gated by the key); committing it means Task 3 Step B is done once the user pastes the key. This is a minor re-sequencing within the plan — all content matches Step B verbatim.
- **Use existing plan action code verbatim for the seed script.** No deviations from the embedded source in the plan. Kept `set search_path` and other Supabase-level details exactly as specified since the plan already vetted them against existing patterns.

## Deviations from Plan

### Auto-fixed Issues

None — Tasks 1 and 2 executed exactly as written. Task 3 is a blocking checkpoint by design.

### Minor sequencing note (not a deviation)

The plan describes Task 3 as a single-block "write script + paste key + run script + smoke test + memory-file append". Because the service-role key is NOT in `.env.local` (confirmed by orchestrator), the agent committed the script artifact and returned a checkpoint for the human paste + execution. On resume, a fresh executor will complete the remaining Task 3 sub-steps (Steps C–E of the plan's `how-to-verify`).

---

**Total deviations:** 0
**Impact on plan:** Infra tasks done cleanly; Task 3 execution is a deliberate blocking checkpoint per the plan's own design (`type="checkpoint:human-verify" gate="blocking"`).

## Issues Encountered

- `npx tsc --noEmit tests/e2e/helpers/login.ts` without `-p tsconfig.json` initially produced 50+ errors from transitively-installed `zod` type definitions (esModuleInterop not set). Re-running with explicit compiler flags (`--skipLibCheck --strict --target ES2023 --module ESNext --moduleResolution bundler --jsx react-jsx`) produced zero errors. This is an informational finding, not a bug: Playwright's own ts-loader handles compilation at test runtime with the correct settings.

## User Setup Required

**BLOCKING (Task 3):** The seed script execution is gated on the user pasting `SUPABASE_SERVICE_ROLE_KEY` into `C:/Claude/nourishplan/.env.local`. Instructions are delivered via the checkpoint return message (human-verify).

Required steps after key is pasted:
1. Run `cd C:/Claude/nourishplan && npx -y tsx scripts/seed-test-member.ts` (expects exit 0, output includes "UPSERTed profiles.display_name for 2 accounts")
2. Smoke-test auth via `curl` to `/auth/v1/token?grant_type=password` for the new account
3. Append new-account block to `C:/Users/Gokuz/.claude/projects/C--Claude-nourishplan/memory/reference_test_account.md`

See `30-02-PLAN.md` Task 3 Steps A–E for full instructions. A continuation executor spawned on resume will complete these.

## Next Phase Readiness

- Wave 1 gates for Plan 30-07 (the Playwright regression test) are **mostly ready**: Playwright installed, config scaffolded, login helper exported, Vitest exclusion in place, seed script authored.
- Wave 1 is NOT fully gated green until Task 3 execution completes (service-role key paste + script run + memory-file append).
- No other Phase 30 plans depend on Plan 02 directly (30-01 is migration, 30-03 through 30-06 are hooks + UI that run on Wave 2+).

## Self-Check: PASSED

- `playwright.config.ts` exists: FOUND
- `tests/e2e/helpers/login.ts` exists: FOUND
- `scripts/seed-test-member.ts` exists: FOUND
- `vitest.config.ts` contains `'tests/e2e/**'` exclude: FOUND
- `package.json` contains `"@playwright/test"` devDependency: FOUND
- Commits 168e0b0, 1a31549, 2fc3191 exist in `git log`: verified below
- `.env.local` does NOT contain `SUPABASE_SERVICE_ROLE_KEY` (confirmed MISSING — drives the blocking checkpoint)

---
*Phase: 30-granular-household-member-permissions-system-admin-editor-vi*
*Plan: 02*
*Status: Tasks 1-2 complete; Task 3 script artifact committed, execution gated on human key-paste*
*Completed (tasks 1-2 + script): 2026-04-24*
