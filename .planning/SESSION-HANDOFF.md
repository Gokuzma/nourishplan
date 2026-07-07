# NourishPlan — session handoff (2026-07-06, evening session 2, updated late)

Everything is committed; prod (`nourishplan.gregok.ca`) serves the latest build,
`generate-plan` + new `scheduled-tasks` are deployed, migrations 035–037 live.
Read top-to-bottom before continuing.

**Workflow note:** the user no longer wants the GSD workflow (skills, phases,
.planning ceremony). Work directly: read code, implement, test, commit small.
lessons.md and this handoff remain in force — they're project knowledge.

## State of the world

- **Suite:** 403 tests passing, 0 failures (`useCookCompletion` cost-calc still
  flakes under load — rerun the file in isolation before chasing it).
- **Typecheck:** `tsc -b` = 0 errors, gated in CI.
- **Migrations:** 35/35 in sync (035 client_errors). `database.gen.ts` regenerated.
- **Edge functions:** all current; `generate-plan` redeployed this session
  (live pass_count updates).

## What shipped this session

1. **Weekly trends on Insights** (`WeeklyTrends.tsx`, `utils/trends.ts`,
   `useWeeklyTrends`): "The Nourishment" — per-member avg-daily-kcal sparkbars
   vs target over 8 weeks (dashed line = target, bars cap at 125%);
   "The Purse" — weekly spend vs budget ledger with bought/cooked breakdown.
   Aggregation is pure + tested (11 tests). Verified visually on Sim Family.
2. **Real generation progress** — generate-plan writes pass_count to the job
   row as each pass starts; the client polls the plan's latest generation row
   while the invoke is pending (see L-047: the invoke stays open the whole
   run, so jobId arrives too late for live UI). Labels: reading pantry →
   shortlisting → choosing meals → fixing violations. On invoke failure the
   client adopts a still-running job instead of showing "failed" (the 502
   retry-burns-a-rate-slot trap is closed). Verified live: 8%→25%→50%→done@59s.
3. **Error monitoring (homegrown)** — migration 035 `client_errors`
   (insert-only RLS, own user_id; reads service-role only — anon/spoof/select
   all verified rejected). SPA reports uncaught errors, unhandled rejections,
   and every TanStack query/mutation failure (covers edge invokes app-wide).
   Session gate: max 20 reports, dedupes repeat messages. Verified end-to-end.
   **Nothing reads this table yet** — check it occasionally via service role;
   an admin view or scheduled digest is a natural follow-up.

### Late additions (same session, after "Go")

4. **Auto-draft weekly plans** — `households.auto_draft_enabled` (036, Settings →
   Household toggle, admin-only). pg_cron job `nourishplan-daily-tick` (15:00 UTC
   daily) calls the new `scheduled-tasks` edge function with `x-internal-secret`
   (secret: `INTERNAL_FN_SECRET`, in .env.local + function secrets). On the day
   before a household's week start it creates the plan row and generates,
   attributed to the household admin; skips weeks already planned/generated;
   failures land in client_errors (`edge:scheduled-tasks`). generate-plan now
   accepts internal calls (x-internal-secret + triggeredBy, membership still
   verified). Verified: forced run drafted Sim week 2026-07-12, 28/28.
   Manual run: `curl -X POST .../functions/v1/scheduled-tasks -H "x-internal-secret: $INTERNAL_FN_SECRET" -d '{"force":{"householdId":"..."}}'`.
5. **Web push** — `push_subscriptions` (037, own-rows RLS), Settings →
   Notifications enable/disable per device, push handlers in `public/push-sw.js`
   via workbox importScripts, VAPID keys in function secrets +
   `VITE_VAPID_PUBLIC_KEY` (Vercel prod env + .env.local). `_shared/push.ts`
   sends and prunes dead endpoints. scheduled-tasks pushes "draft ready" and
   "leftovers expire today/tomorrow" (→ /today). **Verified fully E2E on prod**:
   headless subscribe → real cron-path send → notification displayed with
   correct copy → disable removed the row. Human UAT still worthwhile on a real
   phone (iOS requires Home-Screen install).

## Fixture state (changed today)

- **Sim Family**: nutrition_targets now exist (sim-family 2000 kcal,
  Kid Ada 1400, Kid Ben 1600) — the sim docs claimed targets but none were
  persisted; Insights needed them. Week 2026-07-05 plan regenerated 2× this
  session: 28/28 filled, salmon leftover at **Tuesday Lunch (day_index 2)**
  with 'Uses up leftover — expires 2026-07-12' — the todayDayIndex fix is now
  **verified live** (was day 0 pre-fix).
- **Sim Family has `auto_draft_enabled = true`** and week 2026-07-12 is already
  drafted (28/28, from the forced test run). Saturday's 15:00 UTC cron will hit
  the "already generated" skip — that's the expected live validation. 3-4 rate
  slots consumed today via UI/scheduled runs.
- One salmon leftover was briefly aged to 2026-07-07 to test the expiry push,
  then restored to 2026-07-12.
- client_errors smoke rows deleted; push_subscriptions is empty (test
  subscription removed via the Disable path).

## Open work — prioritized

1. Cook Mode + shared modals still old-style (editorial standard: RecipesPage).
2. 22 deferred human UATs; `BudgetSummarySection.tsx` is dead code — delete when
   convenient. Old-style SlotCard visuals could move to editorial.
3. Consider auto-suggesting "Tidy up" after checkout; virtualize inventory if
   large households stay slow.
4. Next-feature candidates remaining (auto-draft + push shipped): price capture
   at grocery checkout, canonical ingredient normalization (kill the AI-UUID
   bug class at the root), a simple "follower" view for non-planner members,
   schedule-aware cook-reminder pushes, an admin view/digest for client_errors.

## How to operate (see lessons L-001…L-048, auto-injected)

- **Frontend deploy:** `npx vercel deploy --prod`. **Edge fns:**
  `eval "$(tr -d '\r' < .env.local | grep SUPABASE_ACCESS_TOKEN=)"` then
  `SUPABASE_ACCESS_TOKEN=… npx supabase functions deploy generate-plan --project-ref qyablbzodmftobjslgri --no-verify-jwt`.
- **Migrations:** same token, `npx supabase db push`; regen types after schema
  changes: `npx supabase gen types typescript --project-id qyablbzodmftobjslgri > src/types/database.gen.ts`.
- **generate-plan invocations often return 502 at the gateway but complete in
  the background** — the UI now self-heals (adopts the running job), but when
  driving the API directly still poll `plan_generations.status`, don't retry.
  Rate limit: 10/household/24h.
- **L-046 discipline:** any new prompt-level planning rule must be checked
  against every post-pass mutation of `bestResult.slots` and validated on Sim
  Family (claude-test's 3-recipe catalog can't exercise slot competition).
- Sim harness: `SIM_URL/SIM_SVC/SIM_ANON` env →
  `npx vite-node scripts/sim-month.ts -- <setup|seed|week N|audit>`.
- L-001 worktree cleanup before vitest; kill dev servers by port (L-044);
  a Vite server may already be running on :5199 — reuse it.
- Playwright: log out via `localStorage.clear()` then reload /auth. Test
  accounts: sim-family@nourishplan.test / SimFamily!2026 (rich data),
  claude-test@nourishplan.test / ClaudeTest!2026 (minimal).
