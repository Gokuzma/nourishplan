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

### L-029: Bash CWD drifts into a worktree after `Agent(isolation: "worktree")` spawns, silently breaking merges on main
**Bug:** During Phase 30 Wave 2 + Wave 3 execution I ran `git merge worktree-agent-<id>` from what I thought was the main working tree; git reported "Already up to date" despite the worktree branch clearly having new commits. Checking `pwd` revealed the shell cwd was `/c/Claude/nourishplan/.claude/worktrees/agent-<id>`, so I was trying to merge the worktree's branch into itself. Without the pwd check I'd have concluded the executor failed to commit.
**Root cause:** The Claude Code Agent tool with `isolation: "worktree"` sets the spawned agent's cwd to the worktree path, and subsequent orchestrator Bash tool calls in the same session can inherit that cwd (the orchestrator's shell state is persisted between Bash calls, but which directory that shell points at after a worktree-isolation Agent call is not guaranteed to be the repo root).
**Rule:** After every `Agent(..., isolation: "worktree")` call, the first Bash command that does any git operation on the main working tree MUST explicitly `cd /c/Claude/nourishplan && <cmd>` (or use `git -C /c/Claude/nourishplan <cmd>`). Treat `pwd` as unknown after any worktree Agent spawn. When a `git merge` returns "Already up to date" and you expected new commits, run `pwd` before doing anything else — that's almost always the cause.
**Applies to:** Any orchestrator flow that spawns worktree-isolated executors (`/gsd-execute-phase`, `/gsd-execute-plan` when parallel, any custom Agent call with `isolation: "worktree"`). Affects `git merge`, `git worktree remove`, `git branch -D`, and every Bash tool call that writes to a shared file (STATE.md, ROADMAP.md, .env.local).

### L-030: STATE.md `milestone:` frontmatter field goes stale across milestone boundaries
**Bug:** Phase 30's post-completion STATE.md still listed `milestone: v1.1` / `milestone_name: UI polish and usability improvements`, even though phases 16-30 (v2.0 AMPS + v2.0 gap closure) had all shipped since v1.1 closed. PROJECT.md's "Current Milestone" header correctly said v2.0, so the two drifted. The user caught this; otherwise a downstream orchestrator routing on STATE.md's milestone field would have made a wrong decision.
**Root cause:** `phase.complete` (and the subagent flows that update STATE.md after a phase finishes) only touches progress counters, `stopped_at`, and `last_updated` — not the `milestone:` or `milestone_name:` fields. Those are written once by `/gsd-new-project` / `/gsd-new-milestone` and not refreshed by `/gsd-complete-milestone` unless the user runs it explicitly.
**Rule:** Never treat STATE.md's `milestone:` frontmatter as authoritative for "current milestone" — it is historical. The authoritative source is (in priority order): (1) PROJECT.md "Current Milestone: vX.Y …" header, (2) the most recent `## vX.Y — Phase Details` section in ROADMAP.md. When closing a phase whose number does not fit the STATE.md milestone's range, proactively reconcile the `milestone:` / `milestone_name:` fields as part of the close, and surface the discrepancy to the user.
**Applies to:** Phase close protocols, milestone archive decisions, any reporting that references "current milestone" (progress commands, audit commands, onboarding docs).

### L-031: `.env.local` is invisible inside worktree-isolated executors, so plans that read it must run sequentially on main
**Bug:** When planning Phase 30 Wave 4 (the Playwright E2E spec that reads `CLAUDE_TEST_MEMBER_PASSWORD` and `VITE_SUPABASE_URL`), I nearly spawned it with `isolation: "worktree"` like the other plans. A worktree-isolated agent would have found an empty env because the seed script had written `CLAUDE_TEST_MEMBER_PASSWORD` to the main repo's `.env.local` only.
**Root cause:** `git worktree add <path>` populates the new working tree from tracked files. `.env.local` is gitignored (see `.gitignore`), so it never appears inside the worktree. The same applies to any gitignored file: local secrets, local node_modules patches, dotfiles deliberately left out of the repo. Worktree executors silently see an empty / missing version of these files.
**Rule:** Any plan whose tasks read or write `.env.local` (or any gitignored file) MUST run sequentially on the main working tree, not under `isolation: "worktree"`. When dispatching such a plan from `/gsd-execute-phase`, spawn the Agent WITHOUT the `isolation` parameter and tell the executor it is running in "sequential mode on main". Plan authors should flag this with a `files_read_gitignored` hint in frontmatter (or similar) so the orchestrator can route correctly.
**Applies to:** Plans that run Playwright/Cypress against live services, plans that invoke admin-SDK Supabase scripts reading service-role keys, plans that read any `.env*` file or locally-generated config. Symptom in the field: spec exits with `undefined` env vars or "Missing SUPABASE_URL" inside a worktree run that passed locally on main.


### L-032: Supabase `onConflict` target must exactly match a UNIQUE index's columns, including function-based indexes
**Bug:** `useDietaryRestrictions.ts:55` called `.upsert(row, { onConflict: 'household_id,member_user_id' })` against `dietary_restrictions`. Every save returned 400 — open since Phase 20 (2026-04-22), caught in v2.0 UAT sprint Pass 1.
**Root cause:** Migration 024 defines the uniqueness with a **functional** expression — `create unique index ... on dietary_restrictions(coalesce(member_user_id::text, member_profile_id::text))` — not with a plain column list. Postgres requires `ON CONFLICT` targets to match the exact column list (or expression) of an existing unique constraint/index. A two-column composite like `(household_id, member_user_id)` has no matching index, so the upsert fails before it can decide INSERT vs UPDATE.
**Rule:** Before writing `.upsert(row, { onConflict: 'a,b' })` in a Supabase client hook, open the migration that creates the target table and read the `CREATE UNIQUE INDEX` / `UNIQUE (...)` lines verbatim. If the uniqueness is enforced by a functional/partial/expression index, do NOT use upsert with a column-list onConflict — PostgREST cannot target function-based indexes by column names. Instead: (a) add a matching plain-column unique index in a migration, or (b) replace the upsert with an explicit query-then-update-or-insert pattern in the hook (cheaper — no migration). Preferred is (b) unless another caller also needs upsert semantics.
**Applies to:** Every `.upsert(..., { onConflict })` call in `src/hooks/*.ts`. Specifically check any table whose migration defines uniqueness via `CREATE UNIQUE INDEX ... ON tbl(expr)` rather than `UNIQUE(col, col)` — e.g., `dietary_restrictions` (migration 024), and scan other phase-ship migrations for the same pattern before trusting existing upsert code.


### L-033: Edge functions that wrap recipes in `meals` rows must also insert the recipe `meal_items` row
**Bug:** Stacy's full week of generated plans showed "0 kcal" on every slot card. `meals` rows existed for each plan slot, but `meal_items` was empty for those meals — so `slotNutrition` (which sums `meal_items[].calories_per_100g * quantity_grams / 100`) returned 0 for every slot.
**Root cause:** `supabase/functions/generate-plan/index.ts` had a meal pre-fetch/create loop that inserted `meals` rows but never the wrapping recipe `meal_items` row. The frontend's `useGetOrCreateMealForRecipe` (in `src/hooks/useMeals.ts`) DID insert one, but the edge function path bypassed that helper and never mirrored its second insert. Result: the UI's per-100g math contract (quantity_grams=100 + per-serving macros packed into per_100g fields) was unsatisfied.
**Rule:** Whenever any code path creates a `meals` row that wraps a recipe (slot generation, batch operations, suggestion-acceptance, scheduled jobs), it MUST also insert a `meal_items` row with `item_type='recipe'`, `item_id=recipe.id`, `quantity_grams=100`, and per-serving macros computed from `sum(recipe_ingredients[].per_100g * quantity_grams/100) / recipe.servings`. The contract is: "1 meal_item with quantity_grams=100 = 1 serving of the recipe". Any path that violates this leaves slot cards, day totals, weekly nutrition reports, and member targets reading 0. When fixing such a bug, also backfill any pre-existing meals that lack the row (idempotent: query existing meal_items first, only insert missing ones).
**Applies to:** Any edge function or hook that inserts into `meals`, especially paths spawned from generation/scheduling rather than explicit user "add meal" UI flows. Currently affects `supabase/functions/generate-plan/index.ts` (fixed); audit `compute-batch-prep`, `create-recipe-from-suggestion`, and any future scheduled job that pre-creates meals.

### L-034: CORS preflight failure on a Supabase edge function usually means the function isn't deployed
**Bug:** Batch prep modal showed "No prep ahead needed" with browser console errors: "Access to fetch at .../functions/v1/compute-batch-prep blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status." The fix wasn't a CORS code change — the function had correct CORS handling all along.
**Root cause:** `compute-batch-prep` was implemented in source but never deployed to the Supabase project. An undeployed function URL returns a 4xx (no OPTIONS handler), which the browser surfaces as a CORS error rather than a 404, masking the actual issue. `npx supabase functions list` shows what is deployed; the function was simply absent.
**Rule:** When a Supabase edge function call fails with a CORS preflight error in the browser, check `npx supabase functions list --project-ref <ref>` first — do not start editing CORS headers. If the function is missing, deploy it: `SUPABASE_ACCESS_TOKEN=... npx supabase functions deploy <name> --project-ref <ref>`. Confirm deploy with a direct `curl -i -X OPTIONS <function-url>` (expect 200 with `Access-Control-Allow-Origin: *`). Only once the function is provably reachable should CORS code be touched.
**Applies to:** Any new edge function added to `supabase/functions/` that hasn't been deployed yet, and any session resuming work where the deploy state is uncertain. Symptom in the field: CORS-flavoured errors in the browser console paired with `net::ERR_FAILED` on the actual POST.

### L-035: TanStack Query invalidations after a mutation must cover every distinct cache key prefix the mutation affects
**Bug:** Clicking "Regenerate list" on /grocery successfully wrote 188 grocery_items in the DB, but the UI showed "no ingredients to shop for" until a hard reload. Realtime subscription was set up but unreliable in this case; the user-facing answer was "regenerate appears broken".
**Root cause:** `useGenerateGroceryList.onSuccess` invalidated `['grocery', householdId]`, which matches `queryKeys.grocery.list` (key prefix `['grocery', ...]`) but does NOT match `queryKeys.grocery.items` (key prefix `['grocery-items', listId]`). Two flat string prefixes diverge despite being conceptually the same domain. Without the second invalidation, the items cache remained stale and the page rendered the empty pre-mutation snapshot.
**Rule:** When writing `.onSuccess` for a mutation, list every cache key prefix the mutation invalidates — explicitly. Audit `src/lib/queryKeys.ts` for the domain you're touching: if there are multiple distinct prefixes (`grocery` vs `grocery-items`, `meals` vs `meal-plan-slots`, `recipes` vs `recipe-ingredients`), invalidate ALL of them. Never assume "domain prefix invalidation" cascades — TanStack Query matches keys array-position-by-array-position, and `['grocery', ...]` will not match `['grocery-items', ...]`. When in doubt, prefer `queryClient.invalidateQueries({ queryKey: queryKeys.grocery.items() })` with no listId (matches all listIds) over a hand-rolled prefix.
**Applies to:** Every mutation hook in `src/hooks/use*.ts` whose target table is read by more than one query hook. Audit candidates: `useGenerateGroceryList`, `useDeleteRecipe` (recipes vs recipe-ingredients vs ai-tags), `useUpdateMealPlan` (meal-plan vs meal-plan-slots).

### L-036: Every recipe-creating code path must set `meal_types`, or it creates planner "wildcards"
**Bug:** AI plan generation placed slot-inappropriate meals (e.g. "Perfect Ramen Eggs", tagged Dinner, assigned to Breakfast). Root cause was twofold: too few breakfast recipes AND 31 legacy recipes with empty `meal_types`. `generate-plan` treats `meal_types=[]` as "eligible for ANY slot" (a soft preference, not a hard filter), so untagged recipes polluted breakfast. A contributing source: `create-recipe-from-suggestion` created recipes but never set `meal_types`, minting new wildcards on every use.
**Root cause:** `meal_types` (migration 032) is consumed by `generate-plan` as a soft slot-matching preference where `[]` means unrestricted. `import-recipe` tags it correctly, but `create-recipe-from-suggestion` (and any pre-032 recipe) left it empty — so slot-matching silently degraded as untagged recipes accumulated.
**Rule:** Any code path that INSERTs a `recipes` row (edge functions, hooks, scheduled jobs, suggestion-acceptance, gap-fill) MUST set `meal_types` to the appropriate slot(s), never leave it defaulted to `{}`. When generating recipes for a known slot, tag with exactly that slot. When the slot is unknown, classify before insert (reuse `import-recipe`'s rules: "Never put soups, stews, curries, or chili in Breakfast"). Treat `meal_types=[]` as a bug to be backfilled, not a valid steady state. Fixed paths: `create-recipe-from-suggestion`, new `recipe-supply`. Audit any future recipe-inserting code.
**Applies to:** `supabase/functions/*` that insert recipes, `src/hooks/useRecipes.ts` (`useCreateRecipe` creates a bare row — acceptable only because the recipe builder is the next step; if that flow ever auto-plans, it must tag first), and the plan generator's reliance on tagged supply.

### L-037: Supabase edge-function deploys from the harness need an explicit fresh `sbp_` PAT — `supabase login` is not enough
**Bug:** `supabase functions deploy` returned 401 even after the user ran `npx supabase login` successfully. Both the Bash and PowerShell tool shells failed identically. Separately, sourcing `.env.local` in Bash corrupted the token with a trailing `\r`, and the existing `.env.local` `SUPABASE_ACCESS_TOKEN` had silently expired (401 on the Management API).
**Root cause:** Two compounding issues. (1) `supabase login` stores credentials in the OS keyring (Windows Credential Manager), which the harness's non-interactive tool shells cannot read — so the CLI falls back to no token and 401s, even though the user's own interactive shell works. (2) `.env.local` on Windows has CRLF line endings; `set -a; . ./.env.local` leaves `\r` on each value, so `SUPABASE_ACCESS_TOKEN=sbp_xxx\r` is rejected. (3) Personal access tokens rot and there is no warning until a 401.
**Rule:** To deploy edge functions / run `db push` / hit the Management API from harness tool calls, use an explicit fresh personal access token (`sbp_…`) exported as `SUPABASE_ACCESS_TOKEN` for that command — do NOT rely on `supabase login`'s keyring session (invisible to non-interactive shells). Always strip CR when sourcing `.env.local` in Bash: `eval "$(tr -d '\r' < .env.local | grep -E '^VAR=')"`. If any Supabase API/CLI call 401s, suspect (a) expired token, (b) CRLF-corrupted token, or (c) keyring-only session before touching anything else. Validate a token with `curl -s -H "Authorization: Bearer $TOKEN" https://api.supabase.com/v1/projects`.
**Applies to:** Any session deploying `supabase/functions/*`, running migrations, or calling `https://api.supabase.com/v1/*` from Bash/PowerShell tools on this Windows machine. Note `SUPABASE_SERVICE_ROLE_KEY` (an `sb_secret_…` key) is separate and still works for PostgREST/GoTrue admin even when the management PAT is dead — use it for direct DB reads/writes and admin user ops as a fallback.

### L-038: LLM "strong preference" prompt instructions are not constraints — enforce hard rules in deterministic code
**Bug:** After classifying recipes and ensuring breakfast supply, `generate-plan` STILL placed a Dinner-only recipe ("Perfect Ramen Eggs", `meal_types=['Dinner']`) into Breakfast slots — on multiple days, with 8 breakfast-tagged recipes available and zero fallback reuse. The Pass-2 system prompt said "STRONGLY prefer recipes whose meal_types contains the slot… Only use a non-matching recipe when no slot-matching recipe is available." The model (Sonnet) simply ignored it.
**Root cause:** A soft, prose-level preference in an LLM prompt is advisory; the model violates it even when compliance is trivially possible. There was no deterministic enforcement layer — the AI's assignment was written to the DB verbatim. The earlier design deliberately chose "strong preference + classify" over a hard filter; live evidence disproved that choice.
**Rule:** Any correctness invariant that a user will judge as "obviously wrong" (a dinner at breakfast, an allergen in a meal, a recipe in a slot it isn't tagged for) MUST be enforced in deterministic code, not left to a prompt instruction. Pattern: after the LLM produces assignments, run a validation/repair pass that re-checks each assignment against the hard rule and corrects it (swap to a compliant option, else drop) before persisting. Prompt preferences are fine for soft/aesthetic choices (variety, tier mix); never rely on them for invariants. When a user reports "the AI still did X despite the prompt saying not to," do not strengthen the prompt — add a code guardrail. (Implemented: slot guardrail in `generate-plan` before the `meal_plan_slots` upsert.)
**Applies to:** `supabase/functions/generate-plan/index.ts` (slot-matching, allergen/won't-eat avoidance, locked-slot protection — all should have deterministic backstops, not just prompt rules), and any future LLM-driven assignment/selection where output is persisted without validation.

### L-039: AI meal_type classification over-tags — Breakfast needs strict criteria and a slot-count cap
**Bug:** The `recipe-supply` classify backfill tagged "Roti (Chapati)" (a flatbread/side) as `['Breakfast','Lunch','Dinner']` — three slots, including Breakfast — so the planner legitimately served roti for breakfast. The classify prompt allowed multi-slot tagging and gave only a weak Breakfast exclusion ("never soups/stews/curries/chili").
**Root cause:** Classification prompts default to over-inclusion: when unsure, the model adds more slots. "Allow two when flexible" with no hard cap let it assign three; the Breakfast exclusion list was too narrow (didn't cover breads, flatbreads, biscuits, plain sides), so savory non-breakfast items leaked into Breakfast.
**Rule:** Meal-slot classification prompts must (a) cap slots — "exactly one for most; two only when genuinely flexible; never three", and (b) define Breakfast by an ALLOW-list of genuine breakfast foods (eggs, oats, yogurt/smoothie, pancakes/waffles/French toast, breakfast pastries/wraps, cereal/granola) with an explicit DENY-list (breads, flatbreads like roti/naan, biscuits, sides, mains, soups, stews, curries, chili). Apply the same rules in BOTH `import-recipe` and `recipe-supply` classify so tags stay consistent. Consider a deterministic post-classification sanity check for obvious mismatches. When fixing existing bad tags, PATCH them directly — re-running classify only touches untagged (`meal_types=[]`) recipes, so already-mistagged rows are skipped.
**Applies to:** `supabase/functions/recipe-supply/index.ts` (classify mode), `supabase/functions/import-recipe/index.ts` (meal_types extraction), and any future recipe meal_type tagging. Pairs with [[L-036]] (every recipe path must set meal_types) and L-038 (the generator guardrail catches residual mis-tags at plan time).

### L-040: Free-tier Supabase projects auto-pause — edge deploys fail with "status 'INACTIVE'"; restore via Management API
**Bug:** `supabase functions deploy` failed with `unexpected deploy status 404: Cannot retrieve service for project qyablbzodmftobjslgri with currect status 'INACTIVE'` even though the access token validated fine (200 on `/v1/projects`).
**Root cause:** Supabase free-tier projects pause after ~1 week of inactivity. A paused project rejects deploys, DB connections, and edge invocations; the CLI error does not say "paused".
**Rule:** If any Supabase CLI/API call fails mentioning `INACTIVE`, restore the project first: `curl -X POST -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" https://api.supabase.com/v1/projects/<ref>/restore -d '{}'`, then poll `GET /v1/projects/<ref>` until `"status":"ACTIVE_HEALTHY"` (~1–3 min) before retrying. Check status BEFORE debugging tokens/auth.
**Applies to:** Any session deploying functions/migrations or hitting the prod DB after a period of project inactivity. Project ref lives in `supabase/.temp/project-ref`.

### L-041: Edge functions can exist in the repo but never be deployed — audit the deployed list, and check in-code auth before `--no-verify-jwt`
**Bug:** Three edge functions (`analyze-ratings`, `classify-restrictions`, `delete-account`) sat in `supabase/functions/` for months without ever being deployed — Taste Insights could never populate, restriction expansion always failed, and account deletion was broken. Nobody noticed because there is no error monitoring and the failures surfaced only as silent empty states (L-034 class). Two of the three also lacked in-code caller verification, so deploying them blindly with the repo-standard `--no-verify-jwt` would have opened cross-household writes.
**Root cause:** Deployment is a manual per-function CLI step with no drift check between `supabase/functions/*` and what the platform actually runs; and the `--no-verify-jwt` convention assumes every function does its own JWT + household-membership check, which nothing enforces.
**Rule:** When auditing or adding edge functions, diff the deployed list against the repo: `curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" https://api.supabase.com/v1/projects/<ref>/functions` vs `ls supabase/functions/`. Before deploying ANY function with `--no-verify-jwt`, verify it (a) resolves the caller via `adminClient.auth.getUser(token)` and (b) checks `household_members` membership for any household-scoped read/write. A function that was never deployed has also never been smoke-tested — invoke it once with a real user token before calling it done.
**Applies to:** `supabase/functions/*`, any session adding or auditing edge functions, and the deploy checklist.

### L-042: Node 25's built-in localStorage shadows jsdom's and breaks vitest
**Bug:** All theme.test.ts tests failed with `TypeError: localStorage.clear is not a function`. Node v25 ships a global `localStorage` that is a non-functional stub unless `--localstorage-file` is set; in the vitest jsdom environment it shadows jsdom's working implementation.
**Root cause:** Node runtime global takes precedence over the jsdom environment global; the stub has no `clear`/`setItem` methods.
**Rule:** `tests/setup.ts` defines a Map-backed `localStorage` on `globalThis` (mirroring the existing `matchMedia` mock). If storage-related tests fail with "not a function" after a Node upgrade, suspect runtime-global shadowing before blaming the test or source.
**Applies to:** `tests/setup.ts`, vitest runs after Node version changes.

### L-043: Supabase Management API returns secret DIGESTS, not values; per-household edge-fn work needs admin-minted sessions
**Bug:** Planned to read `ANTHROPIC_API_KEY` via `GET /v1/projects/<ref>/secrets` to run a cross-household backfill locally — the endpoint returns SHA-256 digests (64-hex), not plaintext, so the plan was impossible.
**Root cause:** The secrets endpoint is for existence/rotation checks, not retrieval; secret values are only available inside deployed functions via `Deno.env`.
**Rule:** For admin work that must run per-household through an edge function (e.g. `recipe-supply` classify), mint a session for a member of that household instead: `POST /auth/v1/admin/generate_link` (type `magiclink`, service key auth) → take `hashed_token` → `POST /auth/v1/verify` (`{type:'magiclink', token_hash}`, anon key) → use the returned `access_token` to invoke the function. Works for any household without exposing secrets.
**Applies to:** cross-household data backfills, admin scripts, any "run this AI function for every household" task.

### L-044: Never `taskkill //IM node.exe` on this machine — the Claude Code harness itself runs on node
**Bug:** Attempted to stop a dev server with a broad `taskkill //F //IM node.exe` — which, had the filter matched, would have killed the harness session mid-task.
**Root cause:** Vite, vitest, edge tooling AND the agent harness are all node processes; image-name kills are indiscriminate.
**Rule:** Kill dev servers by port, never by image name: `Get-NetTCPConnection -LocalPort <port> -State Listen` → `Stop-Process -Id (…OwningProcess)`. Same for any long-running local server.
**Applies to:** stopping `npx vite`, vitest watchers, preview servers on Windows.

### L-045: Unlayered CSS in global.css silently overrides ALL Tailwind utilities — `.paper > *` flattened every fixed overlay
**Bug:** BarcodeScanner, QuickScanMode, and AddInventoryItemModal used `fixed inset-0 z-50` but rendered in document flow at the bottom of the page (computed `position: relative; z-index: 1`), because they were direct children of the page's `.paper` div.
**Root cause:** Tailwind 4 puts utilities in a cascade `@layer`; the raw rules in `global.css` are unlayered, and unlayered CSS beats layered CSS regardless of specificity or source order. `.paper > * { position: relative; z-index: 1 }` (the grain-lift rule) therefore outranked the `fixed` utility on direct children. Modals nested deeper in the page were unaffected, which made the bug look component-specific.
**Rule:** Any raw rule in `global.css` that sets a property Tailwind utilities also set (position, z-index, color, display …) must either be scoped to exclude utility carriers (e.g. `.paper > *:not(.fixed)`) or moved into an `@layer`. When a Tailwind class "doesn't work", check computed styles for an unlayered override before touching the component.
**Applies to:** `src/styles/global.css`, any modal/overlay rendered as a direct child of a `.paper` page container.

### L-046: Deterministic post-pass repairs must honor new AI soft constraints
**Bug:** The new leftover→Lunch rule worked in Pass 2 (model placed the leftover's source recipe at Lunch with a 'Uses up leftover' rationale) but the plan that persisted had it replaced with "Slot-corrected to a Lunch recipe" — the deterministic meal_types guardrail that runs after all AI passes swapped it out, because leftover source recipes are almost always Dinner-tagged.
**Root cause:** generate-plan has deterministic repair layers (slot-type guardrail, rationale-preserving merge) that run AFTER the prompts; a behavior added only at the prompt level can be silently undone by them, and the failure only shows up in end-to-end output, not in the prompt or the model response.
**Rule:** When adding any new assignment behavior to generate-plan, grep for every post-pass mutation of `bestResult.slots` (guardrails, merges, corrections) and decide explicitly whether each one must exempt or preserve the new behavior. Validate with a real-catalog household (Sim Family), not claude-test — its 3-recipe catalog can't exercise slot competition.
**Applies to:** supabase/functions/generate-plan/index.ts, any future prompt-level planning rules.

### L-047: generate-plan's invoke stays open for the whole run — jobId arrives only at the end
**Bug:** The first pass-progress implementation polled the job via useGenerationJob(activeJobId), but activeJobId is set from the invoke response, which doesn't resolve until the run completes — so the UI showed pass 0 for the entire generation despite the edge function updating pass_count live in the DB.
**Root cause:** The generate-plan edge function creates the job row and then runs all passes inside the same request before responding. "Async generation" describes the DB job row, not the HTTP call: the client learns the jobId only when (or if — see gateway 502s) the request resolves.
**Rule:** Any client feature that needs live generation state must discover the running job independently — poll plan_generations by plan_id (latest row, status='running') while the mutation is pending. Never gate live-progress UI on the invoke response.
**Applies to:** src/hooks/usePlanGeneration.ts, PlanGrid generation UI, any future long-running edge function with a job row.

### L-048: PostgREST bulk inserts require identical keys on every row
**Bug:** A bulk INSERT into nutrition_targets with mixed rows (one with user_id, others with member_profile_id) failed with PGRST102 "All object keys must match".
**Root cause:** PostgREST builds one column list for a bulk insert from the first row's keys; rows with different key sets are rejected outright rather than null-filled.
**Rule:** When bulk-inserting rows that target either user_id or member_profile_id (or any optional-column split), include ALL columns on every row with explicit nulls.
**Applies to:** Any supabase .insert([...]) or REST bulk insert with per-row optional columns (nutrition_targets, food_logs, spend_logs).

### L-049: CSS text-transform breaks text matching in Playwright innerText checks
**Bug:** Two verification checks this session reported UI sections "not found" (`Auto-Draft Weekly Plan`, `Notifications`) even though they rendered fine — `innerText` returns the *rendered* text, and the `.eyebrow`/`.section-head` classes apply `text-transform: uppercase`, so `includes('Notifications')` missed `NOTIFICATIONS`.
**Root cause:** `element.innerText` reflects CSS text-transform; the editorial design system uppercases most labels and kickers.
**Rule:** When asserting on rendered text in this app, match case-insensitively (`/notifications/i`) or use `textContent` (which ignores text-transform). Prefer role/aria-based locators over text where possible.
**Applies to:** Any Playwright/browser_evaluate verification against pages using eyebrow/kicker/section-head/mono-uppercase styles.
