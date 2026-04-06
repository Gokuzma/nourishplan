# Project Instructions

## Project Overview

NourishPlan — a family nutrition planning PWA. Vite 8 + React 19 + Supabase + TanStack Query + Tailwind CSS 4. Deployed to Vercel at nourishplan.gregok.ca.

## Architecture Notes

- SPA with react-router-dom v7, AppShell layout route with Outlet for nested authenticated routes
- Supabase for auth, DB, RLS, and edge functions. Postgres RLS enforces household isolation.
- TanStack Query for server state. Query keys centralised in `src/lib/queryKeys.ts`.
- Theme tokens in CSS (`--radius-card`, `--radius-btn`, etc.) via Tailwind CSS 4 `@theme`.
- PWA via vite-plugin-pwa with workbox service worker.

## Build and Test Commands

- Install: `npm install`
- Dev: `npx vite`
- Build: `npx vite build`
- Test: `npx vitest run`
- Test single file: `npx vitest run src/utils/inventory.test.ts`
- Deploy: `npx vercel --prod`
- Deploy migration: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push`

## Coding Conventions

- Match existing patterns in the codebase before introducing new ones.
- Prefer explicit, readable code over clever abstractions.
- Keep functions focused — one responsibility per function.
- Name variables and functions descriptively.
- Hooks follow the `useFoodPrices` pattern: get householdId from `useHousehold()`, use `queryKeys.*`, `enabled: !!householdId`.
- Mutations invalidate cache via prefix arrays (e.g., `['inventory', householdId]`).
- Pages use `px-4 py-6 font-sans pb-[64px]` for consistent spacing.

## Risky Areas

- `src/lib/queryKeys.ts` — all query cache keys; changes affect every hook.
- `supabase/migrations/` — irreversible in production; test RLS policies carefully.
- `src/components/layout/Sidebar.tsx` and `MobileDrawer.tsx` — nav items; tests in `tests/AppShell.test.tsx` assert exact count.
- `src/contexts/AuthContext.tsx` — auth state; several tests mock this.

## Lessons Learned

### Worktree cleanup before running tests
After GSD parallel execution with worktrees, **always remove worktrees before running vitest**. Vitest discovers test files in `.claude/worktrees/` directories and runs duplicate/stale copies, causing false failures. Run:
```bash
for d in .claude/worktrees/agent-*; do git worktree remove "$d" --force 2>/dev/null; done
rm -rf .claude/worktrees/agent-*
```

### npm install after worktree merges
Worktree agents run `npm install` in their isolated copy. After merging worktree branches that added new packages, **run `npm install` in the main repo** — the packages are in `package.json` but not in `node_modules/`.

### PWA cache on verification
When verifying deployed changes with Playwright, the service worker may serve stale cached assets. **Always clear SW + caches before verification:**
```js
const regs = await navigator.serviceWorker.getRegistrations();
for (const r of regs) await r.unregister();
caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
```

### Parallel agents modifying same files
When two wave-2 agents both need the same file (e.g., `InventoryPage.tsx`), the merge will conflict. Plan for this: merge the "richer" version first (CRUD UI), then merge the additive version (barcode scanning) and resolve conflicts by integrating the additions into the richer base.

### gsd-tools `is_last_phase` is unreliable
The `phase complete` command returns `is_last_phase: true` when no subsequent phase **directory** exists. This does NOT mean the milestone is complete — **always check ROADMAP.md** for remaining planned phases before making claims about milestone status.

### Supabase upsert fails with partial unique indexes
Supabase/PostgREST `onConflict` does not resolve against partial unique indexes (`CREATE UNIQUE INDEX ... WHERE column IS NOT NULL`). Upserts silently fail or insert duplicates. **Use delete-then-insert** instead of upsert when the table uses partial unique indexes.

### Always test DB writes with Playwright before marking checkpoint approved
Don't trust that a migration push + code change works — log in with the test account (`claude-test@nourishplan.test` / `ClaudeTest!2026`) and verify the full save-reload cycle in the browser before presenting the checkpoint to the user.

### Slot name mismatch: "Snack" vs "Snacks"
The DB constraint and `schedule.ts` use `"Snack"` (singular) but `mealPlan.ts DEFAULT_SLOTS` uses `"Snacks"` (plural). When bridging schedule data to the plan grid, **normalize the key** (`"Snack"` → `"Snacks"`). Any future feature crossing these two domains must account for this mismatch.

### Schedule badges must render on empty slots too
`SlotCard` has two render paths: `OccupiedSlotCard` (meal assigned) and an empty state. Both need schedule badges — users need to see availability status *before* assigning meals, not only after. When adding visual indicators to SlotCard, **always check both code paths**.

### Push migrations before asking user to test DB-backed features
If a phase creates new tables, the migration must be pushed (`supabase db push`) before any save/load testing can work. Don't present a verification checkpoint for DB-backed features until the migration is confirmed live. Plan 21-03 (migration push) should have been executed *before* the Plan 21-02 checkpoint, not after.

### Stale test credentials waste time
The demo account (`demo@nourishplan.test`) had outdated passwords in planning docs. Created a dedicated test account (`claude-test@nourishplan.test` / `ClaudeTest!2026`) with known credentials stored in memory. **Always use the test account from memory rather than searching planning docs for credentials.**

### Test account needs seed data for meaningful verification
A fresh test account with an empty household can't verify features like plan page badges or multi-member schedules. Created "Test Child" managed profile and seeded schedule data for both members. **When testing features that depend on existing data, seed test data via the Supabase REST API before running Playwright checks.** Test account details (household ID, profile IDs) are in memory at `reference_test_account.md`.

### Deploy before presenting live-site verification to user
The user couldn't test on `nourishplan.gregok.ca` because the code hadn't been deployed yet. **After fixing bugs found during verification, rebuild and redeploy before telling the user to test on the live site.**

### Bash `UID` is a readonly variable on Windows/Git Bash
`UID` is a reserved shell variable. Using it as a local variable (`UID="some-uuid"`) silently fails. **Use `USER_ID` or another name instead.**

### Windows `/dev/stdin` doesn't exist for piping
`node -pe "...readFileSync('/dev/stdin')"` fails on Windows. Use `grep`/`cut` to extract JSON fields from curl output, or write to a temp file. **Always use Windows-compatible shell patterns for parsing API responses.**

### Test assertions must match nav item count
Adding a new nav item to Sidebar or MobileDrawer requires updating `tests/AppShell.test.tsx`. The test asserts specific nav labels — add the new label to the assertion list.

## Continuous Improvement

When you encounter a mistake, unexpected failure, or learn something non-obvious during execution, **add it to the Lessons Learned section above before moving on**. This applies to:
- Build/test failures caused by environmental issues (worktrees, caching, missing deps)
- Incorrect assumptions about tool output or API behavior
- Merge conflicts or integration issues from parallel work
- Deployment or verification gotchas
- Any problem that cost significant time and could recur

Format: short heading, 1-2 sentence explanation of what went wrong, concrete fix or prevention step. Keep it actionable — future instances should be able to avoid the problem just by reading the entry.

## Workflow Expectations

- Use GSD workflow for multi-step or complex tasks.
- Make small, focused commits — one logical change per commit.
- Inspect the repository structure before making changes.
- Read relevant files before editing them.
- Verify changes work before moving on.
- Ask before large refactors or architectural changes.
- Always attempt to solve problems yourself before asking the user to take action. Use all available tools (Playwright, APIs, CLI) to unblock yourself. Only escalate to the user as a last resort after exhausting your options.
- After GSD parallel execution: clean worktrees, run `npm install`, then run tests.
- After deploying to Vercel: clear PWA cache before Playwright verification.
- After adding nav items: update AppShell test assertions.
