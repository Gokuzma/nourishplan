# External Services and Integrations

All backend capability is Supabase; all AI is the Anthropic API called from Deno edge functions. The browser never holds any secret other than the Supabase anon key (RLS-protected).

## Supabase (primary backend)

Client created in `src/lib/supabase.ts` from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

| Capability | Usage | Where |
|---|---|---|
| Auth | Email/password sessions; auth state in `src/contexts/AuthContext.tsx`, `src/hooks/useAuth.ts` | Client |
| Postgres + RLS | All app data (households, foods, recipes, plans, inventory, budget, grocery, ratings, permissions). RLS enforces household isolation; many migrations are RLS fixes (`supabase/migrations/002,003,005,006,012,013,017`) | 31 migrations in `supabase/migrations/` |
| Storage | `avatars` bucket for profile photos (`src/hooks/useProfile.ts` — upload + `getPublicUrl`) | Client |
| Edge Functions | 14 Deno functions (below), invoked via `supabase.functions.invoke(...)` from hooks/pages | `supabase/functions/` |
| Async job tracking | `plan_generations` table records status/errors for long-running AI jobs (migrations 026, 028) | Edge functions write via service role |

**Auth/keys**: client uses anon key; edge functions use platform-injected `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (`Deno.env.get`) to bypass RLS for server-side work. Migrations pushed with `SUPABASE_ACCESS_TOKEN`. CLI-linked project (no `supabase/config.toml`; state in `supabase/.temp/`).

## Anthropic API (AI/LLM)

Every AI feature is a direct `fetch("https://api.anthropic.com/v1/messages")` from an edge function using `ANTHROPIC_API_KEY` (Supabase secret) with `anthropic-version: 2023-06-01`. No SDK. Default model **claude-haiku-4-5**, escalating to **claude-sonnet-4-5** for complex cases.

| Function (`supabase/functions/<name>/index.ts`) | Purpose | Model |
|---|---|---|
| generate-plan | Constraint-based weekly meal plan generation (3 API call sites, incl. slot classification guardrails) | haiku |
| import-recipe | Fetch external recipe URL (timeout-guarded `fetch`) and extract structured recipe | haiku |
| recipe-supply | Supply new AI-suggested recipes to fill plan gaps | haiku |
| create-recipe-from-suggestion | Turn an AI suggestion into a full recipe record | haiku |
| generate-recipe-steps | Generate cooking steps for a recipe | haiku |
| generate-cook-sequence | Merge multi-recipe/multi-member cooking into one sequence; fast path skips Claude for single recipe+member | sonnet if multi, else haiku |
| generate-reheat-sequence | Reheat instructions (fridge vs freezer) | haiku |
| compute-batch-prep | Batch prep session optimisation | sonnet if >4 recipes, else haiku |
| classify-restrictions | Classify free-text dietary restrictions | haiku |
| analyze-ratings | Analyze household recipe ratings for preferences | haiku |
| verify-nutrition | AI sanity-check of nutrition data (invoked from `src/components/food/FoodSearchOverlay.tsx`) | haiku |

## Nutrition Data APIs

| Service | Endpoint | Auth | Where |
|---|---|---|---|
| USDA FoodData Central | `https://api.nal.usda.gov/fdc/v1/foods/search` | `USDA_API_KEY` (Supabase secret) | `supabase/functions/search-usda/index.ts` |
| Health Canada CNF (Canadian Nutrient File) | `https://food-nutrition.canada.ca/api/canadian-nutrient-file/*` (food, servingsize, nutrientamount) | None (public) | `supabase/functions/search-cnf/index.ts` (replaced Open Food Facts search — migration 011) |
| Open Food Facts | `https://world.openfoodfacts.org/api/v0/product/<barcode>.json` | None (public) | Client-side barcode lookup, `src/utils/barcodeLookup.ts` (paired with @zxing browser scanning) |

## Account Management

- `supabase/functions/delete-account/index.ts` — service-role deletion of the user account; invoked from `src/pages/SettingsPage.tsx`.

## Vercel (hosting/deploy)

- Static SPA deploy at **nourishplan.gregok.ca**; manual deploy via `npx vercel --prod` (no CI/CD — no `.github/` workflows; CI gate deliberately deferred per `playwright.config.ts` header).
- `vercel.json`: `buildCommand: vite build`, catch-all rewrite to `/index.html`, no-cache headers for `sw.js` and manifest so PWA updates land immediately.

## PWA / Workbox

- `vite-plugin-pwa` in `vite.config.ts`: autoUpdate service worker, inline manifest, precache of built assets, `NetworkFirst` runtime cache for navigations (3s timeout). Offline awareness in `src/hooks/useOnlineStatus.ts`.

## Edge Function Deployment & Secrets

- Deploy: `supabase functions deploy <name>` (`--no-verify-jwt`); helper script `scripts/deploy-edge-functions.sh` (covers the original 3 search/verify functions and documents secret setup).
- Secrets: `supabase secrets set ANTHROPIC_API_KEY=...` and `USDA_API_KEY=...`.
- CORS: functions set permissive `Access-Control-Allow-Origin: *` headers inline.

## Not Present

- No OpenAI/Google/other LLM providers (Anthropic only).
- No payment, analytics, email, or price-data APIs found in `src/` or `supabase/functions/`.
- `.mcp.json` is empty (`{"mcpServers": {}}`).
