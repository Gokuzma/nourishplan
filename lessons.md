# Lessons Learned

Every entry below is a hard rule. Before doing any work in this project, read the full list and treat each **Rule** as a constraint. The SessionStart hook injects this file into context automatically; the Stop hook prompts for new entries at session end.

## How to add a new lesson

When a bug, unexpected failure, incorrect assumption, merge issue, or environmental gotcha occurs that could recur in a future session, append a new entry at the bottom of this file using the next available L-code. Format:

```
### L-xxx: Short descriptive title
**Bug:** What went wrong in concrete terms
**Root cause:** Why it happened (not just the symptom)
**Rule:** The permanent rule or check that prevents recurrence
**Applies to:** Files, patterns, commands, or workflow situations
```

## What does NOT belong here

- Typos or trivial syntax errors
- Issues caused by incomplete user instructions
- One-off problems that cannot recur
- Temporary workarounds (those go in commit messages)

---

## Lessons

### L-001: Worktree cleanup before running tests
**Bug:** After GSD parallel execution with worktrees, `npx vitest` reports false failures because it runs duplicate/stale test copies.
**Root cause:** Vitest discovers test files inside `.claude/worktrees/agent-*/` directories, which contain stale or partial copies of the test suite.
**Rule:** Always remove worktrees before running vitest:
```bash
for d in .claude/worktrees/agent-*; do git worktree remove "$d" --force 2>/dev/null; done
rm -rf .claude/worktrees/agent-*
```
**Applies to:** Any session that runs `npx vitest` after GSD parallel execution or worktree work.

### L-002: npm install after worktree merges
**Bug:** After merging worktree branches that added new packages, imports fail because modules are missing from `node_modules/`.
**Root cause:** Worktree agents run `npm install` in their isolated copy, so new packages land in `package.json` but not in the main repo's `node_modules/`.
**Rule:** Run `npm install` in the main repo after merging any worktree branch that modified `package.json`.
**Applies to:** Post-merge steps for any worktree-based parallel execution.

### L-003: Clear PWA cache before Playwright verification
**Bug:** Playwright verification of deployed changes hits stale assets and gives misleading results.
**Root cause:** The service worker serves cached assets from before the deploy.
**Rule:** Before verifying deployed changes with Playwright, clear the service worker + caches:
```js
const regs = await navigator.serviceWorker.getRegistrations();
for (const r of regs) await r.unregister();
caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
```
**Applies to:** Any Playwright-based verification of live nourishplan.gregok.ca deployments.

### L-004: Parallel agents modifying same files
**Bug:** Two wave-2 agents both modify the same file (e.g., `InventoryPage.tsx`) and the merge conflicts.
**Root cause:** Parallel GSD agents work in isolated worktrees without awareness of each other's target files.
**Rule:** When planning parallel waves, check for file overlap. If two agents target the same file, merge the "richer" version first (e.g., CRUD UI) then merge the additive version (e.g., barcode scanning) and integrate the additions into the richer base.
**Applies to:** GSD wave planning where multiple agents in the same wave might touch overlapping files.

### L-005: gsd-tools `is_last_phase` is unreliable
**Bug:** Phase completion was claimed as milestone completion, but more phases were still planned.
**Root cause:** `phase complete` returns `is_last_phase: true` when no subsequent phase *directory* exists — it does not check ROADMAP.md for remaining planned phases.
**Rule:** Always check ROADMAP.md for remaining planned phases before claiming milestone completion, regardless of what `is_last_phase` returns.
**Applies to:** Any GSD workflow transition from phase to milestone completion.

### L-006: Supabase upsert fails with partial unique indexes
**Bug:** Supabase upserts silently fail or insert duplicates on tables with partial unique indexes.
**Root cause:** Supabase/PostgREST `onConflict` does not resolve against partial unique indexes (`CREATE UNIQUE INDEX ... WHERE column IS NOT NULL`).
**Rule:** Use delete-then-insert instead of upsert when the target table has a partial unique index.
**Applies to:** Any INSERT code against Supabase tables with partial unique indexes.

### L-007: Test DB writes with Playwright before marking checkpoint approved
**Bug:** Checkpoint was presented to the user before DB writes were verified end-to-end, and the save-reload cycle was broken.
**Root cause:** Trusted that a migration push + code change worked without actually testing.
**Rule:** Before presenting any DB-write checkpoint, log in with the test account (`claude-test@nourishplan.test` / `ClaudeTest!2026`) and verify the full save-reload cycle in the browser.
**Applies to:** Any phase checkpoint involving new DB writes or schema changes.

### L-008: Slot name mismatch — "Snack" vs "Snacks"
**Bug:** Code bridging schedule data to the plan grid fails or shows empty snack slots.
**Root cause:** DB constraint and `schedule.ts` use `"Snack"` (singular); `mealPlan.ts DEFAULT_SLOTS` uses `"Snacks"` (plural).
**Rule:** When bridging schedule data to the plan grid, normalize the key (`"Snack"` → `"Snacks"`). Any new feature crossing these two domains must account for this mismatch.
**Applies to:** Any code that reads from the `schedules` table and writes to the plan grid (or vice versa).

### L-009: Schedule badges must render on empty slots too
**Bug:** Schedule availability badges only rendered on occupied slots, hiding availability info before assignment.
**Root cause:** `SlotCard` has two render paths (`OccupiedSlotCard` and an empty state) and only one was updated.
**Rule:** When adding visual indicators to `SlotCard`, always check both render paths. Users need to see availability status *before* assigning meals, not only after.
**Applies to:** `src/components/plan/SlotCard.tsx` and any similar two-path slot/card components.

### L-010: Push migrations before asking user to test DB-backed features
**Bug:** User was asked to test features that depended on an un-pushed migration; tests failed because the table didn't exist.
**Root cause:** Migration push was scheduled after the verification checkpoint instead of before.
**Rule:** If a phase creates new tables, push the migration (`supabase db push`) before presenting any verification checkpoint for DB-backed features.
**Applies to:** Any phase plan with both a migration step and a user verification checkpoint.

### L-011: Stale test credentials waste time
**Bug:** Playwright login attempts failed because planning docs had outdated test credentials.
**Root cause:** The demo account (`demo@nourishplan.test`) password was rotated but docs weren't updated.
**Rule:** Always use the dedicated test account from memory (`claude-test@nourishplan.test` / `ClaudeTest!2026`) rather than searching planning docs for credentials.
**Applies to:** All Playwright-based testing that requires authenticated sessions.

### L-012: Test account needs seed data for meaningful verification
**Bug:** Features that depended on existing data (plan badges, multi-member schedules) couldn't be verified on a fresh test account.
**Root cause:** The test account started with an empty household — no managed profiles, no schedule data.
**Rule:** Before running Playwright checks on data-dependent features, seed test data via the Supabase REST API. Test account details (household ID, profile IDs) are in memory at `reference_test_account.md`.
**Applies to:** Any Playwright verification of features that read from schedules, profiles, or other per-household data.

### L-013: Deploy before presenting live-site verification to user
**Bug:** User tried to verify a fix on nourishplan.gregok.ca and saw the old broken behavior because nothing had been deployed.
**Root cause:** After fixing a bug during verification, I told the user to test on the live site without rebuilding and redeploying.
**Rule:** After fixing bugs found during verification, rebuild and redeploy before telling the user to test on the live site.
**Applies to:** Any bug-fix verification loop that references nourishplan.gregok.ca or any live-site URL.

### L-014: Verify fixes with Playwright before claiming fixed
**Bug:** Told user "try it now" on a fix that didn't actually work.
**Root cause:** Claimed fixes were verified without running through the original reproduction steps.
**Rule:** After every bug fix: build, deploy, then use Playwright to navigate to the affected page, reproduce the original issue, and confirm the fix works. Only then tell the user it's fixed. Never make the user your test runner.
**Applies to:** All bug-fix workflows.

### L-015: Bash `UID` is a readonly variable on Windows/Git Bash
**Bug:** Setting `UID="some-uuid"` in a bash script silently failed — the variable kept its original value.
**Root cause:** `UID` is a reserved readonly shell variable in bash.
**Rule:** Use `USER_ID` or another non-reserved name instead of `UID` when storing user identifiers.
**Applies to:** All bash scripts on Windows/Git Bash.

### L-016: Windows `/dev/stdin` doesn't exist for piping
**Bug:** `node -pe "...readFileSync('/dev/stdin')"` failed on Windows with "no such file".
**Root cause:** Windows (even under Git Bash) does not expose `/dev/stdin` as a file path.
**Rule:** Use `grep`/`cut` to extract JSON fields from curl output, or write piped data to a temp file, instead of reading `/dev/stdin` from node. Always use Windows-compatible shell patterns.
**Applies to:** Any bash pipeline that reads stdin into a sub-tool on Windows.

### L-017: `SUPABASE_ACCESS_TOKEN` lives in .env.local
**Bug:** Stopped to ask the user for the Supabase access token when running `supabase db push`.
**Root cause:** Forgot that the token is stored in `.env.local`, not as a shell environment variable.
**Rule:** Source the token before running supabase CLI commands: `export $(grep SUPABASE_ACCESS_TOKEN .env.local | xargs)`. Check `.env.local` first — do not ask the user.
**Applies to:** Any supabase CLI command that requires `SUPABASE_ACCESS_TOKEN`.

### L-018: Edge function meal INSERT requires `created_by`
**Bug:** Edge function created meals (wrapping recipes during plan generation) but downstream logic found no meal IDs.
**Root cause:** The `meals` table has `created_by uuid NOT NULL`. The INSERT silently failed (rolled back) without `created_by`.
**Rule:** When an edge function inserts into `meals`, always pass `created_by: user.id` from the authenticated user.
**Applies to:** `supabase/functions/**` that INSERT into the `meals` table.

### L-019: Edge function slot enumeration must cover empty slots
**Bug:** AI plan generation could only assign meals to slots that were already occupied.
**Root cause:** `slotsToFill` was built from `meal_plan_slots` rows, but that table only has entries for filled slots.
**Rule:** When building `slotsToFill` for AI generation, enumerate all possible slots from constants (7 days × 4 slots = 28 positions) instead of relying on existing DB rows.
**Applies to:** `supabase/functions/generate-plan/` and any similar slot-enumeration code.

### L-020: Worktree agents modify/delete unrelated files (CRITICAL — recurs every session)
**Bug:** GSD worktree executor agents strip imports, remove code blocks, and delete content from files they were not asked to touch (CLAUDE.md, unrelated components, type files, query keys). They also truncate existing code in files they legitimately modify — e.g., removing generation hooks from `PlanGrid` when only adding swap suggestions.
**Root cause:** Worktree executor agents regenerate large portions of files from scratch instead of editing surgically, and they don't know which changes are in-scope.
**Rule:** After merging each worktree branch:
1. Run `git diff <pre-merge-commit>.. --stat` and review ALL changed files — not just deleted ones.
2. For every file NOT in the plan's `files_modified` list, restore it: `git checkout <pre-merge-commit> -- <file>`.
3. For files IN the plan's `files_modified` list, diff carefully — restore the original first, then apply ONLY the planned additions/changes manually.
4. Never trust a worktree merge without this review.
**Applies to:** All GSD worktree-based parallel execution.

### L-021: Test assertions must match nav item count
**Bug:** Adding a nav item to `Sidebar`/`MobileDrawer` broke `tests/AppShell.test.tsx`.
**Root cause:** The test asserts an exact list of nav labels — any new item breaks it.
**Rule:** When adding a nav item to `Sidebar.tsx` or `MobileDrawer.tsx`, update `tests/AppShell.test.tsx` in the same commit to include the new label.
**Applies to:** `src/components/layout/Sidebar.tsx`, `src/components/layout/MobileDrawer.tsx`, `tests/AppShell.test.tsx`.
