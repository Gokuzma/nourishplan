# Project Instructions

## Project Overview

NourishPlan — a family nutrition planning PWA. Vite 8 + React 19 + Supabase + TanStack Query + Tailwind CSS 4. Deployed to Vercel at nourishplan.gregok.ca.

## Learned Rules (READ FIRST)

All project learnings live in `lessons.md` at the repo root — every bug we have hit, every environmental gotcha, every Supabase/Vite/worktree footgun. The SessionStart hook injects `lessons.md` into context automatically, but you must also actively apply every **Rule** as a hard constraint before writing code. Do not add new lessons to this file — append them to `lessons.md` (the Stop hook will prompt you at session end).

## Architecture Notes

- SPA with react-router-dom v7, AppShell layout route with Outlet for nested authenticated routes
- Supabase for auth, DB, RLS, and edge functions. Postgres RLS enforces household isolation.
- TanStack Query for server state. Query keys centralised in `src/lib/queryKeys.ts`.
- Theme tokens in CSS (`--radius-card`, `--radius-btn`, etc.) via Tailwind CSS 4 `@theme`.
- PWA via vite-plugin-pwa with workbox service worker.

## Build and Test Commands

- Install: `npm install`
- Dev: `npx vite`
- Build: `npx vite build`
- Test: `npx vitest run`
- Test single file: `npx vitest run src/utils/inventory.test.ts`
- Deploy: `npx vercel --prod`
- Deploy migration: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push`

## Coding Conventions

- Match existing patterns in the codebase before introducing new ones.
- Prefer explicit, readable code over clever abstractions.
- Keep functions focused — one responsibility per function.
- Name variables and functions descriptively.
- Hooks follow the `useFoodPrices` pattern: get householdId from `useHousehold()`, use `queryKeys.*`, `enabled: !!householdId`.
- Mutations invalidate cache via prefix arrays (e.g., `['inventory', householdId]`).
- Pages use `px-4 py-6 font-sans pb-[64px]` for consistent spacing.

## Risky Areas

- `src/lib/queryKeys.ts` — all query cache keys; changes affect every hook.
- `supabase/migrations/` — irreversible in production; test RLS policies carefully.
- `src/components/layout/Sidebar.tsx` and `MobileDrawer.tsx` — nav items; tests in `tests/AppShell.test.tsx` assert exact count.
- `src/contexts/AuthContext.tsx` — auth state; several tests mock this.

## Continuous Improvement

When you hit a mistake, unexpected failure, or non-obvious learning during a session, append it to `lessons.md` with the next available L-code — never inline in this file. The Stop hook enforces this at session end. Format and guardrails are documented at the top of `lessons.md`.

## Workflow Expectations

- Use GSD workflow for multi-step or complex tasks.
- Make small, focused commits — one logical change per commit.
- Inspect the repository structure before making changes.
- Read relevant files before editing them.
- Verify changes work before moving on.
- Ask before large refactors or architectural changes.
- Always attempt to solve problems yourself before asking the user to take action. Use all available tools (Playwright, APIs, CLI) to unblock yourself. Only escalate to the user as a last resort after exhausting your options.
