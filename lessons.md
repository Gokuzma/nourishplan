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

### L-022: `jq` is not on PATH in Git Bash on Windows
**Bug:** A Stop hook script using `jq -r '.session_id'` failed with `jq: command not found` (exit 127) when pipe-tested in Git Bash.
**Root cause:** Git Bash on Windows does not bundle `jq`; it is not in `/mingw64/bin` or `/usr/bin` by default and is not a guaranteed dependency.
**Rule:** Do not use `jq` in bash scripts or hook commands for this project. Use `node` (always available — this is a Node project) for JSON parsing and generation. Canonical patterns:
- Parse stdin JSON: `node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{process.stdout.write(String(JSON.parse(d).field||""))}catch{}})'`
- Emit JSON from an env var: `VAR="$VAL" node -e 'process.stdout.write(JSON.stringify({key:process.env.VAR}))'`
**Applies to:** `.claude/hooks/*.sh`, any bash script or hook `command` field that needs to read or emit JSON.

### L-023: Claude Code caches hook config at session start
**Bug:** Newly added hooks in `.claude/settings.json` did not fire in the current session, even though the JSON was valid and the script was tested in isolation.
**Root cause:** Claude Code reads `.claude/settings.json` once at session start and caches the `hooks` block. Mid-session edits to that block are not picked up until the config is reloaded.
**Rule:** After editing `hooks` in `.claude/settings.json`, tell the user to open `/hooks` once (reloads config) or restart Claude Code. Do not claim a hook is "live" or active until the config has been reloaded. Pipe-test the script standalone so you know the script itself is correct, then make the activation caveat explicit in your handoff message.
**Applies to:** Any workflow that installs, edits, or removes hooks in `.claude/settings.json` or `~/.claude/settings.json`.

### L-024: Check `git diff HEAD` before rewriting a file wholesale
**Bug:** During the lessons.md migration, `CLAUDE.md` was already modified (`M CLAUDE.md` in `git status`) with uncommitted session learnings (L-014 Playwright fix verification, expanded L-020 worktree review). A naive `Write` that reconstructed the file from partial memory would have silently dropped those edits.
**Root cause:** The `Read` tool reads the file from disk, not from HEAD, so a wholesale `Write` rewrite is based on the uncommitted working copy. Reconstructing the file from memory instead of working directly from the `Read` output loses any uncommitted changes without warning.
**Rule:** Before rewriting any existing file with the `Write` tool, run `git diff HEAD -- <file>` to see if there are uncommitted changes. If there are, decide explicitly whether to fold them into the rewrite or commit/stash them separately first. Always work from the latest `Read` output — never reconstruct a file from partial memory.
**Applies to:** Any wholesale rewrite with the `Write` tool, especially on documentation files like `CLAUDE.md`, `lessons.md`, `README.md`, or configuration like `package.json`.

### L-025: Deploy edge functions with `--no-verify-jwt` when auth is handled inside the function
**Bug:** After redeploying `generate-plan` and `create-recipe-from-suggestion`, every call from the frontend returned `{"code":401,"message":"Invalid JWT"}` at the edge runtime layer — before the function code even ran. UAT verification blocked mid-run.
**Root cause:** The Supabase project now issues ES256 (asymmetric) JWTs via the new auth keys. Supabase edge functions default to `verify_jwt = true`, which uses the legacy HS256 shared-secret verification path. ES256 tokens are rejected at the runtime layer even though the tokens are valid and the function code uses `adminClient.auth.getUser(token)` to do its own verification. The old deployments worked by accident — whatever runtime state they had is incompatible with the new redeploys.
**Rule:** Deploy edge functions that do their own `getUser(token)` auth with `--no-verify-jwt`:
```bash
npx supabase functions deploy <fn> --project-ref <ref> --no-verify-jwt
```
Any new function added to this project must either (a) be deployed with `--no-verify-jwt` and validate the JWT itself with the service-role client, or (b) be rewritten to work with ES256 runtime verification (not yet supported for HS256-era projects).
**Applies to:** All `supabase/functions/*` deployments for this project. Check `generate-plan/index.ts` for the `getUser(token)` pattern — if the function already does that, skip runtime verification.

### L-026: Playwright `browser_wait_for` on ambient text gives false positives
**Bug:** During Phase 22 UAT I clicked "Generate Plan" then called `browser_wait_for({text: "Generated"})` to wait for completion. It returned immediately because the page already had "Generated 1h ago" text from the previous run. I believed generation had finished and queried the DB — only to find no new `plan_generations` row, which misled me into thinking the edge function was broken.
**Root cause:** `browser_wait_for({text: "..."})` matches any substring present on the page, including text that was there before the action. Words like "Generated", "Loaded", "Done", "Complete" are frequently already rendered as ambient UI text (e.g., "Generated 1h ago", "Loaded 3 items"), so waiting for them is a no-op.
**Rule:** When waiting for an async UI transition, wait on a **transition-unique** signal:
- Prefer `textGone` on the pre-action state (e.g., `textGone: "Generated 1h ago"`) or disappearance of the loading button (`textGone: "Generating..."`).
- Or poll the DB / backend directly for the expected state change (`plan_generations` row created in the last N seconds).
- Never wait on generic words like "Generated", "Saved", "Done", "Loading" without first confirming they are not already present.
**Applies to:** All Playwright-based UAT on NourishPlan, especially the Plan page generation flow, recipe save flow, and any action that triggers a "completed" banner.

### L-027: Subagent prompts for parallel GSD execution must include explicit feature-preservation lists
**Bug:** L-020 recurred again during Phase 22 Wave 1 — the 22-06 executor agent deleted the AIRationaleTooltip feature from `SlotCard.tsx` (50 lines) and truncated 7 other unrelated files while implementing a timeout fix. Wave 2 (with strengthened prompts listing specific features to preserve) had ZERO contamination, proving the warning is load-bearing.
**Root cause:** L-020 says "review every merge for unrelated file modifications" but that's a post-hoc cleanup. The root cause is that executor agents regenerate large portions of files from scratch because they don't know which existing features matter. A generic "don't touch unrelated files" instruction is ignored; a specific list of features to preserve is not.
**Rule:** When spawning a GSD worktree executor agent that will modify a file containing prior work (especially `PlanGrid.tsx`, `generate-plan/index.ts`, `SlotCard.tsx`, or any file that has been modified by 3+ previous phases), include in the prompt:
1. A `<critical_l020_warning>` block naming the EXACT features the agent must NOT remove (e.g., "useNavigate + supabase imports for recipe suggestion handler", "AIRationaleTooltip wiring", "WALL_CLOCK_BUDGET_MS constant", "capitalize() helper", "pass2Completed flag").
2. An explicit "use Edit tool, never Write tool" instruction for any file >200 lines.
3. The list of files explicitly in scope, with the understanding that all other files are forbidden.
The warning must reference specific symbols/features by name — generic "don't truncate" is not enough.
**Applies to:** Every `Task(subagent_type="gsd-executor", ...)` call that targets a file touched by a previous phase. The risk scales with the age of the file and the number of prior phases that have modified it.

### L-028: Playwright MCP snapshot tool is too slow to catch transient UI like 8-second auto-dismiss toasts
**Bug:** During Phase 26 live UAT I clicked "Mark as Cooked", then ran `browser_wait_for({text: "Save leftover portion", time: 10})`. It timed out after 30s even though the receipt DID render — the receipt's `setTimeout(onClose, 8000)` auto-dismiss fired between the MCP tool's polling intervals. I initially thought the feature was broken and went looking for deploy/cache issues that didn't exist.
**Root cause:** The Playwright MCP `browser_snapshot`, `browser_wait_for`, and `browser_click` each round-trip through a JSONL protocol layer that adds ~1-3s latency per call. A UI element with an 8s visibility window can render and dismiss entirely within that window — the snapshot tool never catches it. Spend-log writes succeed in the DB (provable via REST API) but the UI evidence is gone by the time the next snapshot runs.
**Rule:** For UAT of transient UI (auto-dismissing toasts, snackbars, flash messages, receipts with setTimeout-based close) use `browser_evaluate` with an inline click-then-synchronously-capture-state pattern, not `browser_click` + `browser_wait_for`. Example:
```js
browser_evaluate(`() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Mark as Cooked');
  btn.click();
  return new Promise((resolve) => {
    let tries = 0;
    const check = setInterval(() => {
      tries++;
      const receipt = document.querySelector('[class*="fixed"][class*="bottom"]');
      if (receipt?.textContent.includes('Cooked:') || tries >= 30) {
        clearInterval(check);
        resolve({ tries, receiptText: receipt?.innerText });
      }
    }, 100);
  });
}`)
```
This runs inside the page, polls every 100ms, and resolves as soon as the element appears — no MCP round-trip latency in the loop.
**Applies to:** All Playwright MCP UAT on transient UI. Any toast, banner, snackbar, or receipt with a `setTimeout(..., Nms)` close pattern where N ≤ 10_000. Also applies to modals that open/close in rapid sequence.
