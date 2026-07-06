# NourishPlan — session handoff (2026-07-06)

Everything below is committed and pushed; prod (`nourishplan.gregok.ca`) is current.
CI green, 385 tests passing, `tsc -b` 0 errors. Read top-to-bottom before continuing.

## What shipped this session (2026-07-05 late / 07-06)

1. **April mobile feedback triaged** — the untracked `NourishPlan Edits/` folder held
   12 annotated phone screenshots from 2026-04-25. Most issues were already fixed by
   the editorial redesign; the three still live were fixed and deployed:
   - Scanners + Add-item modal rendered in page flow instead of overlaying — the
     unlayered `.paper > *` rule in global.css outranked Tailwind's layered `fixed`
     utility (lessons.md **L-045**). Fixed with `:not(.fixed)`; scanners now also
     mutually exclusive.
   - Inventory tab counts wrapped under a stray "·" at 390px.
   - Today journal empty-state referenced a removed search bar.
   Do NOT re-triage those screenshots; folder can be deleted.
2. **Budget truth (sim finding #1)** — migration 033 (deployed) allows
   `spend_logs.source='grocery'`. "Add purchased to pantry" logs the trip total as
   grocery spend. `summariseWeeklySpend` (utils/cost.ts): once grocery spend exists
   for a week, purse = grocery + takeout and cooking shows as "bought X · cooked Y"
   (never summed — double-count); weeks with no trips keep cook + takeout.
3. **Name-fallback pricing (sim finding #3)** — `computeItemCost` and
   `getPriceForIngredient` fall back to case-insensitive name match when food_id
   misses (AI recipes mint new ingredient UUIDs every generation). Covers grocery
   costs, recipe cost/serving, cook spend.
4. **Leftovers → lunch (sim finding #2)** — generate-plan (deployed) reads
   `is_leftover`/`expires_at`, passes unexpired leftovers + items expiring ≤4 days
   into all passes, and rule 10 tells the assigner to place a leftover's source
   recipe in the earliest unlocked Lunch before expiry with rationale
   'Uses up leftover — expires {date}'. Today page shows a "Leftover ready" nudge
   (`LeftoverNudge`, both layouts, links to /inventory).

## Needs validation next session

- **Leftover→Lunch behaviour on a real catalog.** The only live test was the
  claude-test household (3 dinner-only recipes) — the model filled only Dinner
  slots, so the rule wasn't meaningfully exercised. Run the Sim Family week
  (`npx vite-node scripts/sim-month.ts -- week N`) with an unexpired leftover in
  its inventory and check a Lunch slot picks up the matching recipe + rationale.
- Test-household state changed tonight: its leftover now expires **2026-07-08**,
  fridge has a plan for week 2026-07-05 (Dinners only), grocery list has one
  checked+pantry'd item (Chicken thighs, $12.34 logged as grocery spend).

## Open work — prioritized

1. Weekly kcal-vs-target trend on Insights; generation pass-progress UI (sim #4).
2. Error monitoring (Sentry-vs-homegrown decision pending).
3. Cook Mode + shared modals still old-style (see RecipesPage for the standard).
4. 22 deferred human UATs; `BudgetSummarySection.tsx` is dead code (unused import
   target) — delete when convenient.

## How to operate (unchanged, see lessons L-036…L-045)

- Frontend deploy: `npx vercel deploy --prod` (plain `npx vercel --prod` now prints
  a JSON menu — use the `deploy` subcommand). Edge fns:
  `eval "$(tr -d '\r' < .env.local | grep SUPABASE_ACCESS_TOKEN=)"` then
  `SUPABASE_ACCESS_TOKEN=… npx supabase functions deploy <fn> --project-ref qyablbzodmftobjslgri --no-verify-jwt`
  (in-code auth checks are present — L-041).
- Migrations: `SUPABASE_ACCESS_TOKEN=… npx supabase db push`; regen types after:
  `npx supabase gen types typescript --project-id qyablbzodmftobjslgri > src/types/database.gen.ts`.
- Test accounts: claude-test@nourishplan.test / ClaudeTest!2026 (Test Household);
  sim-family@nourishplan.test / SimFamily!2026 (Sim Family fixture).
- L-001 worktree cleanup before vitest; kill dev servers by port (L-044).
- A dev server may already be running on :5199 from a prior session — reuse it
  (HMR serves current code) instead of starting another.
