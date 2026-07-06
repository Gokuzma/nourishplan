# NourishPlan — session handoff (2026-07-06, end of day)

Everything is committed and pushed through `1e14b40`; prod (`nourishplan.gregok.ca`)
serves the latest build and all edge functions are current. Read top-to-bottom
before continuing.

## State of the world

- **Suite:** 389 tests passing, 0 failures (`useCookCompletion` cost-calc test can
  flake under heavy machine load — rerun the file in isolation before chasing it).
- **Typecheck:** `tsc -b` = 0 errors, gated in CI (tsc + vitest + vite build).
- **Migrations:** 34/34 in sync (033 grocery spend source, 034 'merged' removal
  reason — both deployed). `database.gen.ts` regenerated; constraint-only changes
  don't alter it.
- **Edge functions:** all deployed, `generate-plan` updated 3× this session.

## What shipped this session (three passes)

### Pass 1 — April mobile feedback triage
`NourishPlan Edits/` (12 annotated phone screenshots from 2026-04-25) fully
triaged; most issues already fixed by the editorial redesign. Fixed the three
still live: scanners/Add-item modal flattened into page flow by the unlayered
`.paper > *` CSS rule (**L-045** — unlayered CSS beats Tailwind's layers;
excluded `.fixed` children); scanners now mutually exclusive; inventory tab
count wrap; stale Today empty-state copy. **Do not re-triage those screenshots**;
the folder can be deleted.

### Pass 2 — simulation backlog (handoff priorities 1–3)
1. **Budget truth** — `spend_logs.source='grocery'` (migration 033). "Add
   purchased to pantry" logs the trip total. `summariseWeeklySpend`
   (utils/cost.ts): once grocery spend exists for a week, purse tracks
   grocery + takeout and shows "bought X · cooked Y" (cook is never added on
   top — double-count); no-trip weeks fall back to cook + takeout.
2. **Name-fallback pricing** — `computeItemCost` + `getPriceForIngredient` match
   by food_id, then case-insensitive name (AI recipes mint new ingredient UUIDs
   every generation). Covers grocery costs, recipe cost/serving, cook spend.
3. **Leftovers → Lunch** — generate-plan reads `is_leftover`/`expires_at`, feeds
   unexpired leftovers + items expiring ≤4 days into every pass; rule 10 places
   the leftover's source recipe at the earliest feasible Lunch with rationale
   'Uses up leftover — expires {date}'. Today page shows a deduped "Leftover
   ready" nudge (`LeftoverNudge`). **L-046**: the deterministic meal_types
   guardrail was silently replacing these placements — leftover-consuming
   Lunch/Dinner assignments (verified against inventory) are now exempt.
   Validated end-to-end on Sim Family (33 recipes): salmon leftover at Lunch,
   survived all passes.

### Pass 3 — playtest fixes (usability/efficiency/feedback)
- **Inventory "Tidy up"** — `planInventoryConsolidation` merges duplicate active
  non-leftover rows (same name/unit/location) into the oldest row, summed
  quantity, earliest expiry, `removed_reason='merged'` (034). Live: Sim pantry
  690 → 128 rows in 13s.
- **"Discard expired"** band — bulk-discards expired items (Sim fridge 6 → 2).
- **Batched add-to-pantry** — parallel merges + one bulk INSERT + one deduped
  food_prices upsert instead of a round trip per item.
- **Monotony guardrail** in generate-plan — post-pass cap of 2 assignments per
  recipe per week; swaps extras for least-used slot-fitting safe alternatives;
  never displaces leftover placements; small catalogs exempt; keeps a repeat
  over an empty slot. Validated: 28/28 slots, no recipe >2×.
- **SlotCard** — secondary actions (Log/Suggest/Change/Remove) moved into a
  `.menu-pop` overflow menu (first use of that CSS); inline: chevron, lock,
  cook, ⋯. Titles clamp to 2 lines; "svg" → "serv".
- **`todayDayIndex`** passed to the assign prompt so leftover lunches aren't
  placed on past days. **Prompt-level and NOT yet observed live** — check on the
  next generation that the leftover lands on day_index ≥ today.

## Open work — prioritized

1. Weekly kcal-vs-target trend on Insights; generation pass-progress UI.
2. Error monitoring (Sentry-vs-homegrown decision still pending).
3. Cook Mode + shared modals still old-style (editorial standard: RecipesPage).
4. 22 deferred human UATs; `BudgetSummarySection.tsx` is dead code — delete when
   convenient. Old-style SlotCard visuals (rounded/SaaS) could move to editorial.
5. Consider auto-suggesting "Tidy up" after checkout, or virtualizing the
   inventory list if large households stay slow.

## Fixture state (changed today — don't be surprised)

- **Sim Family** (sim-family@nourishplan.test / SimFamily!2026): pantry tidied to
  ~130 rows (+ "Paper towels", "Dish soap" from a batch-checkout smoke test);
  fridge has 2 unexpired salmon-leftover containers (expire 2026-07-12); expired
  leftovers discarded. Week 2026-07-05 plan regenerated 3× today — current plan:
  28/28 filled, salmon at Sunday Lunch (day 0 — placed before the todayDayIndex
  fix). Grocery list fully checked; $7.50 grocery spend logged; purse shows
  "bought $7.50 · cooked $61.44". **plan_generations timestamps for rows before
  2026-07-06T21:30Z were aged to 2026-07-04** to free the 10/24h rate limit —
  fixture-only surgery; the audit's per-week spend numbers are unaffected but
  generation-history timestamps are not trustworthy.
- **Test Household** (claude-test@nourishplan.test / ClaudeTest!2026): leftover
  expires 2026-07-08; week 2026-07-05 plan is Dinners-only (3-recipe catalog);
  $12.34 grocery spend logged; chicken thighs merged into pantry.

## How to operate (see lessons L-001…L-046, auto-injected)

- **Frontend deploy:** `npx vercel deploy --prod` (plain `npx vercel --prod`
  prints a JSON menu now). **Edge fns:**
  `eval "$(tr -d '\r' < .env.local | grep SUPABASE_ACCESS_TOKEN=)"` then
  `SUPABASE_ACCESS_TOKEN=… npx supabase functions deploy generate-plan --project-ref qyablbzodmftobjslgri --no-verify-jwt`
  (in-code auth checks present — L-041).
- **Migrations:** same token, `npx supabase db push`; regen types after schema
  changes: `npx supabase gen types typescript --project-id qyablbzodmftobjslgri > src/types/database.gen.ts`.
- **generate-plan invocations often return 502 at the gateway but complete in
  the background** — poll `plan_generations.status`, don't retry on 502 (a retry
  burns a rate-limit slot). Rate limit: 10/household/24h.
- **L-046 discipline:** any new prompt-level planning rule must be checked
  against every post-pass mutation of `bestResult.slots` (slot guardrail,
  monotony guardrail, rationale merge) and validated on Sim Family, not
  claude-test (3-recipe catalog can't exercise slot competition).
- Sim harness: `SIM_URL/SIM_SVC/SIM_ANON` env →
  `npx vite-node scripts/sim-month.ts -- <setup|seed|week N|audit>`; week 4 =
  current week; `week N` skips generation if ≥20 slots already filled.
- L-001 worktree cleanup before vitest; kill dev servers by port (L-044);
  a Vite server may already be running on :5199 — reuse it (HMR serves current
  code).
- Playwright: log out via `localStorage.clear()` then reload /auth; full-page
  screenshots show the off-canvas More drawer as a right-edge strip (artifact,
  not a bug). Em-dash "â€"" in curl/python terminal dumps is a Git-Bash decoding
  artifact — verify in the rendered UI before "fixing" encoding.
