# NourishPlan — session handoff (2026-07-06, evening session 2)

Everything is committed; prod (`nourishplan.gregok.ca`) serves the latest build,
`generate-plan` is redeployed, migration 035 is live. Read top-to-bottom before
continuing.

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

## Fixture state (changed today)

- **Sim Family**: nutrition_targets now exist (sim-family 2000 kcal,
  Kid Ada 1400, Kid Ben 1600) — the sim docs claimed targets but none were
  persisted; Insights needed them. Week 2026-07-05 plan regenerated 2× this
  session (2 rate-limit slots consumed): 28/28 filled, salmon leftover at
  **Tuesday Lunch (day_index 2)** with 'Uses up leftover — expires 2026-07-12'
  — the todayDayIndex fix is now **verified live** (was day 0 pre-fix).
- client_errors smoke-test rows were deleted; table is empty.

## Open work — prioritized

1. Cook Mode + shared modals still old-style (editorial standard: RecipesPage).
2. 22 deferred human UATs; `BudgetSummarySection.tsx` is dead code — delete when
   convenient. Old-style SlotCard visuals could move to editorial.
3. Consider auto-suggesting "Tidy up" after checkout; virtualize inventory if
   large households stay slow.
4. Next-feature candidates discussed with user (in priority order): auto-draft
   next week's plan on a schedule (pg_cron), PWA push notifications (leftover
   expiring, draft ready, schedule-aware cook reminders), price capture at
   grocery checkout, canonical ingredient normalization (kill the AI-UUID bug
   class at the root), a simple "follower" view for non-planner members.

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
