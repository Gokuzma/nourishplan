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

## Validated + playtested 2026-07-06 (second pass)

- **Leftover→Lunch VALIDATED on Sim Family** (33 recipes): first run exposed that
  the deterministic meal_types guardrail replaced the leftover placement
  ("Slot-corrected to a Lunch recipe") — fixed with a data-verified exemption
  (L-046), redeployed, re-ran: salmon leftover landed on Monday Lunch with
  'Uses up leftover — expires 2026-07-12' and survived. Note: freeing the
  10/24h generation rate limit required aging Sim Family's plan_generations
  timestamps (service key) — legitimate for the fixture only.
- **Purse split verified live**: after checking off a $7.50 trip, strip shows
  "SPENT $7.50 / $220 · BOUGHT $7.50 · COOKED $61.44".
- **Playtest fixes shipped**: inventory "Tidy up" (690→128 rows live, migration
  034 `removed_reason='merged'`); leftover-nudge dedupe + suffix strip; SlotCard
  "svg"→"serv" + 2-line title clamp.
- Playtest findings NOT yet fixed (candidates): add-to-pantry does sequential
  per-item mutations (slow for big trips — batch it); plan monotony (model
  repeated Penne Arrabbiata 4× despite rule 6 — consider a deterministic repeat
  guardrail); mobile SlotCard still shows 6 icon buttons per row (consider an
  overflow menu); Sim Family fridge holds 4 expired-but-active leftovers
  (no cleanup path for expired items beyond manual remove).
- Test-household state: leftover expires **2026-07-08**, week 2026-07-05 plan is
  Dinners-only, $12.34 grocery spend logged. Sim Family pantry is tidied (128
  rows); its week 2026-07-05 plan was regenerated twice today.

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
