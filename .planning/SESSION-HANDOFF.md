# NourishPlan — session handoff (2026-07-05/06)

Everything below is committed and pushed through `580aa9f`; prod (`nourishplan.gregok.ca`)
serves bundle `index-BSCv0yQt.js`. CI is green. Read this top-to-bottom before continuing.

## State of the world

- **Suite:** 377 tests passing, 0 failures. **Typecheck:** `tsc -b` = 0 errors (was 135) and
  gated in CI (`.github/workflows/ci.yml`: tsc + vitest + vite build on every push).
- **Migrations:** 31/31 in sync. **Edge functions:** all 15 deployed and current, including
  the three that had never been deployed (`analyze-ratings`, `classify-restrictions`,
  `delete-account` — all now with in-code caller/household verification).
- **Security:** exposed `sb_secret` rotated (new key in `.env.local`), old key revoked,
  hardcoded literals scrubbed; `.recipe-import/` and `.playwright-mcp/` gitignored.
- **Prod data:** 0 wildcard recipes, 0 over-tagged, empty artifacts soft-deleted.

## What shipped this session (chronological)

1. **Codebase map** — `.planning/codebase/` (7 docs: stack, integrations, architecture,
   structure, conventions, testing, concerns).
2. **Recipe discovery + selector** — ✨ Discover on Recipes page (craving/slot-aware AI
   suggestions with macros + add-to-book, via new `discover` mode in `recipe-supply`);
   plan slot picker got search, slot-first grouping, per-serving macros
   (`useRecipeMacros`, `queryKeys.recipes.macros`). Spec:
   `docs/superpowers/specs/2026-07-05-recipe-discovery-and-selector.md`.
3. **User Guide rebuilt** (`/guide`) — philosophy-first: constraint-solver framing, the
   weekly loop (Stock → Compose → Shop → Cook → Rate), the method (Eat well / **Be
   healthy** / Save money — per user, never say "lose weight"), operating rhythm
   (Sunday 20 min / daily 2 min / monthly 10 min).
4. **Full working-order audit + "do it all" execution** — `.planning/AUDIT-2026-07-05.md`
   (with execution-status section). Highlights: Supabase types generated
   (`src/types/database.gen.ts` feeds the client; hand-written interfaces in
   `src/types/database.ts` remain the semantic layer with boundary casts); weekly-loop
   CTAs added at every stage edge (Discover→Plan, Plan→Grocery "Generate grocery list",
   Grocery→Pantry "Add purchased", Cook receipt→star rating, Today Tonight→"Cook this");
   Insights/Settings/RecipeBuilder editorialized; dead Meals UI deleted
   (`/meals/:id`, MealPage/MealCard/MealBuilder/MealItemRow); real bugs fixed
   (PlanGrid `display_name`→`name`, desktop locked-slot shimmer, analyze-ratings column).
5. **Month-of-use simulation** — `.planning/SIMULATION-2026-07-05.md` + harness
   `scripts/sim-month.ts`. 3 bugs found & fixed & deployed:
   - `subtractInventory` name-fallback (AI-recipe pantry matching — was "buy 197 items"
     with a full pantry, now correct)
   - `generate-plan` verify passes no longer wipe tier rationale
   - Grocery add-to-pantry merges rows (was 691 inventory rows after a month)

## Open work — prioritized next steps

From the simulation (`.planning/SIMULATION-2026-07-05.md`, full reasoning there):
1. **Budget truth**: `spend_logs` CHECK only allows `'cook'|'food_log'` — real grocery
   spend is unrecordable; purse showed $30–75/wk while the family spent ~$180/wk.
   Needs migration 033 + purse UI decision (show "bought vs cooked", avoid double-count).
2. **Price by normalized ingredient NAME, not per-recipe UUID** — only ~25% of grocery
   items ever price; AI recipes mint new ingredient_ids every generation.
3. **Leftovers → next-day lunch**: all 6 simulated leftovers expired unconsumed. Feed
   unexpired leftovers + expiring items into generate-plan as soft constraints.
4. Weekly kcal-vs-target trend on Insights; generation pass-progress UI.

From the audit (still open): error monitoring (needs Sentry-vs-homegrown decision);
Cook Mode + shared modals still old-style; 22 deferred human UATs; Folio renumbering.

## How to operate (hard-won this session — see lessons L-036…L-044)

- **Deploys**: frontend `npx vercel --prod` (user is logged in). Edge fns:
  `eval "$(tr -d '\r' < .env.local | grep SUPABASE_ACCESS_TOKEN=)"` then
  `SUPABASE_ACCESS_TOKEN=… npx supabase functions deploy <fn> --project-ref qyablbzodmftobjslgri --no-verify-jwt`
  — but ONLY with in-code auth checks (L-041). If anything says INACTIVE, restore the
  project first (L-040).
- **Sim harness**: `SIM_URL/SIM_SVC/SIM_ANON` env → `npx vite-node scripts/sim-month.ts -- <setup|seed|week N|audit>`;
  idempotent, Sim Family household persists in prod as a regression fixture
  (sim-family@nourishplan.test / SimFamily!2026). generate-plan rate limit: 10/household/24h.
- **Test accounts**: claude-test@nourishplan.test / ClaudeTest!2026 (Test Household).
- Kill dev servers by port, never `taskkill node.exe` (L-044). Run the L-001 worktree
  cleanup before vitest. Playwright chromium is installed; visual-check pattern in
  scratchpad used `@playwright/test` from the repo.

## Watch-outs for the next session

- `src/types/database.gen.ts` is generated — regenerate after any migration
  (`SUPABASE_ACCESS_TOKEN=… npx supabase gen types typescript --project-id qyablbzodmftobjslgri`).
- The editorial design system is the standard (see RecipesPage/GroceryPage); old-style
  remnants live mostly under `src/components/cook/` and shared modals.
- `.env.local` now holds the ROTATED service key; the platform-injected key inside edge
  functions is separate and unchanged.
