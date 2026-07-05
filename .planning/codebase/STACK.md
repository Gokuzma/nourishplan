# Technology Stack

Family nutrition planning PWA. Single-page React app backed entirely by Supabase (Postgres + Auth + Edge Functions), deployed as static assets to Vercel.

## Languages

| Language | Where | Notes |
|---|---|---|
| TypeScript ~5.9.3 | `src/`, `tests/`, `supabase/functions/` | Strict project-references build (`tsconfig.json` -> `tsconfig.app.json` / `tsconfig.node.json`); `tsc -b` runs before `vite build` |
| SQL (Postgres) | `supabase/migrations/` | 31 migration files (001-032, no 010) |
| Bash | `scripts/deploy-edge-functions.sh` | Edge function deploy helper |

## Frontend Framework and Core Dependencies

From `package.json`:

| Dependency | Version | Role |
|---|---|---|
| react / react-dom | ^19.2.4 | UI framework |
| react-router-dom | ^7.13.1 | SPA routing; AppShell layout route with Outlet |
| @tanstack/react-query | ^5.90.21 | Server state; query keys centralized in `src/lib/queryKeys.ts` |
| @supabase/supabase-js | ^2.99.1 | Auth, DB, Storage, Edge Function invocation (`src/lib/supabase.ts`) |
| tailwindcss + @tailwindcss/vite | ^4.2.1 | Styling via Tailwind CSS 4 `@theme` tokens (CSS-first config, no tailwind.config) |
| @dnd-kit/core / sortable / utilities | ^6.3.1 / ^10.0.0 / ^3.2.2 | Drag-and-drop (meal plan slots) |
| @zxing/browser + @zxing/library | ^0.1.5 / ^0.21.3 | In-browser barcode scanning |
| @fontsource-variable/nunito | ^5.2.7 | Self-hosted variable font |

## Build Tooling

- **Vite ^8.0.0** (`vite.config.ts`) with plugins: `@vitejs/plugin-react` ^6.0.0, `@tailwindcss/vite`, `vite-plugin-pwa` ^1.2.0.
- **Build**: `npm run build` = `tsc -b && vite build`. Vercel overrides to `vite build` only (`vercel.json` `buildCommand`).
- **Lint**: ESLint ^9.39.4 flat config (`eslint.config.js`) with `typescript-eslint` ^8.56.1, `eslint-plugin-react-hooks` ^7.0.1, `eslint-plugin-react-refresh`.

## PWA / Service Worker

Configured in `vite.config.ts` via `vite-plugin-pwa` (workbox under the hood):

- `registerType: 'autoUpdate'`, `skipWaiting` + `clientsClaim`.
- Manifest inline in config (name "NourishPlan", 192/512 maskable icons in `public/`).
- Precache glob: js/css/html/ico/png/svg; `navigateFallback: '/index.html'`.
- Runtime caching: `NetworkFirst` for navigation requests (`html-cache`, 3s network timeout, 1-day expiry).
- `vercel.json` sets `Cache-Control: max-age=0, must-revalidate` on `/sw.js` and the manifest so updates propagate.

## Runtime Environments

1. **Browser (PWA)** — Vite-built static SPA served by Vercel; all data access through supabase-js with the anon key + RLS.
2. **Supabase Edge Functions (Deno)** — 14 functions in `supabase/functions/*/index.ts`, using `deno.land/std@0.168.0` `serve` and `esm.sh/@supabase/supabase-js@2`. They hold the service-role key and all third-party API keys (Anthropic, USDA). No local `supabase/config.toml`; project is CLI-linked (state in `supabase/.temp/`).
3. **Postgres (Supabase-hosted)** — RLS enforces household isolation; DB triggers (e.g. profile creation) live in migrations.

## Database

- `supabase/migrations/`: 31 files numbered 001-032 (010 absent). Themes: foundation/households (001-003), food + recipes (004-007), meals/plans/targets (008-009), nutrition sources CNF swap (011), polish + serving units (014-016), soft-delete/RLS fixes (005, 006, 012, 013, 017), recipe ingredient snapshots (018), budget engine (020), inventory (021), grocery list (022), DnD locked slots (023), feedback/dietary restrictions (024), schedule (025), async plan generation jobs (026, 028), prep optimisation (029), recipe source URL (030), household permissions (031), recipe meal types (032).
- Deployed with `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push` (see `CLAUDE.md`).

## Dev / Test Tooling

| Tool | Version | Usage |
|---|---|---|
| Vitest | ^4.1.0 | Unit/component tests: `npx vitest run`. Config `vitest.config.ts`: jsdom, globals, setup `tests/setup.ts`, excludes `tests/e2e/**` and `.claude/worktrees/**` |
| @testing-library/react + jest-dom + user-event | ^16.3.2 / ^6.9.1 / ^14.6.1 | Component testing (~35 test files in `tests/` plus colocated `src/**/*.test.ts`) |
| @playwright/test | ^1.59.1 | E2E in `tests/e2e/` (`playwright.config.ts`): on-demand only, NOT in CI; chromium, 1 worker, auto-starts `npx vite --port 5173`, prod override via `PLAYWRIGHT_BASE_URL` |
| jsdom | ^28.1.0 | Vitest DOM environment |
| Supabase CLI | via npx | Migrations + edge function deploys (`supabase/.temp/cli-latest` tracks version) |

## Environment Variables

- **Client** (`.env.local`, `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (read in `src/lib/supabase.ts`); local-only extras: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `CLAUDE_TEST_MEMBER_PASSWORD` (test seeding, `scripts/seed-test-member.ts`).
- **Edge functions** (Supabase secrets): `ANTHROPIC_API_KEY`, `USDA_API_KEY`, plus platform-injected `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.

## Deploy

- **Vercel** at nourishplan.gregok.ca — `npx vercel --prod`; `vercel.json` provides SPA rewrite (`/(.*)` -> `/index.html`) and cache headers. No CI pipeline (no `.github/`; CI gate is an explicitly deferred roadmap idea per `playwright.config.ts` comments).
- **Edge functions** — `supabase functions deploy <name>` (helper: `scripts/deploy-edge-functions.sh`, deployed `--no-verify-jwt`).
