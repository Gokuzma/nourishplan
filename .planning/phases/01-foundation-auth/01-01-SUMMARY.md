---
phase: 01-foundation-auth
plan: "01"
subsystem: scaffold
tags: [vite, react, typescript, tailwind, supabase, pwa, vitest]
dependency_graph:
  requires: []
  provides:
    - vite-react-ts-scaffold
    - tailwind-4-theme-tokens
    - supabase-client-singleton
    - phase1-database-types
    - phase1-migration
    - vitest-infrastructure
  affects:
    - all subsequent plans in phase 01
tech_stack:
  added:
    - vite@8
    - react@19
    - react-dom@19
    - typescript@5.9
    - tailwindcss@4
    - "@tailwindcss/vite@4"
    - "@supabase/supabase-js@2"
    - "@tanstack/react-query@5"
    - react-router-dom@7
    - "@fontsource-variable/nunito"
    - vite-plugin-pwa@1.2
    - vitest@4
    - "@testing-library/react@16"
    - "@testing-library/jest-dom@6"
    - jsdom@28
  patterns:
    - Tailwind CSS 4 with @tailwindcss/vite plugin (no PostCSS, no tailwind.config.js)
    - CSS-first theme tokens via @theme block in global.css
    - Class-based dark mode via @custom-variant dark with localStorage + matchMedia
    - FOUC prevention via inline script in index.html <head>
    - Supabase client singleton pattern in src/lib/supabase.ts
    - Typed Supabase client using Database generic
key_files:
  created:
    - package.json
    - vite.config.ts
    - tsconfig.json
    - tsconfig.app.json
    - tsconfig.node.json
    - index.html
    - src/main.tsx
    - src/App.tsx
    - src/styles/global.css
    - src/lib/supabase.ts
    - src/types/database.ts
    - .env.example
    - .gitignore
    - supabase/migrations/001_foundation.sql
    - vitest.config.ts
    - tests/setup.ts
    - tests/auth.test.ts
    - tests/AuthContext.test.tsx
    - tests/AppShell.test.tsx
    - tests/theme.test.ts
  modified: []
decisions:
  - "Used Vite 8 (scaffolded as latest) instead of pinning to Vite 7 — fully compatible, no API changes needed"
  - "Used react-router-dom v7 (scaffolded as latest) instead of v6 — SPA-mode usage is identical for this phase"
  - "Added placeholder test inside each describe block to satisfy Vitest 4.x requirement of non-empty suites"
  - "Used (select auth.uid()) pattern throughout migration per Supabase performance recommendation"
  - "Bootstrapped household creation with separate 'creator inserts self as admin' policy to avoid chicken-and-egg RLS problem"
metrics:
  duration_seconds: 427
  completed_date: "2026-03-13"
  tasks_completed: 3
  tasks_total: 3
  files_created: 20
  files_modified: 0
---

# Phase 1 Plan 01: Project Scaffold Summary

**One-liner:** Vite 8 + React 19 + TypeScript scaffold with Tailwind CSS 4 pastel theme tokens, Supabase typed client singleton, full Phase 1 Postgres schema with RLS, and Vitest 4 test infrastructure with Wave 0 scaffolds.

## What Was Built

### Task 1: Vite + React + Tailwind scaffold

- Scaffolded Vite 8 + React 19 + TypeScript project using `create-vite` `react-ts` template
- Installed all production and dev dependencies (208 packages)
- Configured `vite.config.ts` with three plugins: `react()`, `tailwindcss()`, `VitePWA()`
- Created `src/styles/global.css` with Tailwind 4 `@import "tailwindcss"`, `@custom-variant dark`, and `@theme` block containing all locked color tokens (sage green, warm cream, muted peach, charcoal, off-white, surface white) and dark mode overrides
- Added dark mode FOUC prevention inline script to `index.html` `<head>` (runs before React hydration)
- Created `src/lib/supabase.ts` — typed singleton using `Database` generic and `import.meta.env` env vars
- Created `src/types/database.ts` — TypeScript interfaces for all 5 Phase 1 tables plus a `Database` type following Supabase conventions
- Updated `src/main.tsx` to import Nunito Variable font and `global.css`
- Created minimal `src/App.tsx` showing "NourishPlan" in sage green to confirm theme
- Created `.env.example` (committed) and `.env.local` (gitignored via `*.local` pattern)
- Dev server starts at `localhost:5173` in 639ms; TypeScript compiles with zero errors

### Task 2: Database migration

- Created `supabase/migrations/001_foundation.sql` with complete Phase 1 schema:
  - `profiles` table with `handle_new_user()` trigger (exception-safe, never blocks signup)
  - `households` table with authenticated INSERT and member-scoped SELECT
  - `household_role` enum (`admin`, `member`)
  - `household_members` with two INSERT policies: bootstrap creator-as-admin + admin-inserts-members; two SELECT policies: own row + all household members
  - `household_invites` with expiry enforced at DB level in SELECT policy (`expires_at > now() AND used_at IS NULL`)
  - `member_profiles` with full CRUD policy scoped to `managed_by` user
- All 5 tables have `enable row level security`
- All policies use `(select auth.uid())` pattern (performance optimization per Supabase docs)

### Task 3: Vitest test infrastructure

- Created `vitest.config.ts` with `globals: true`, `environment: 'jsdom'`, and `setupFiles`
- Created `tests/setup.ts` importing `@testing-library/jest-dom` and mocking `import.meta.env` with placeholder Supabase values
- Created 4 Wave 0 scaffold test files with passing placeholder tests and TODO comments for future implementation:
  - `tests/auth.test.ts` — stubs for AUTH-01 (signup) and AUTH-04 (password reset)
  - `tests/AuthContext.test.tsx` — stubs for AUTH-02 (session init) and AUTH-03 (logout)
  - `tests/AppShell.test.tsx` — stub for PLAT-01 (responsive layout)
  - `tests/theme.test.ts` — stub for PLAT-02 (dark mode toggle)
- All 9 tests pass; `npm test` works

## Verification

| Check | Result |
|-------|--------|
| `npm run dev` starts Vite | PASS — ready in 639ms at localhost:5173 |
| `npx tsc --noEmit` | PASS — zero type errors |
| `npx vitest run` | PASS — 9 tests pass, 0 failures |
| Migration file has RLS on all 5 tables | PASS — 5 `enable row level security` statements |
| `.env.local` gitignored | PASS — matched by `*.local` pattern |
| `.env.example` committed | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest 4.x requires non-empty describe blocks**
- **Found during:** Task 3 verification run
- **Issue:** Vitest 4.1.0 errors on `describe()` blocks with only comments and no tests ("No test found in suite"). The plan specified empty describe blocks with TODO comments.
- **Fix:** Added one `test('X describe placeholder', () => expect(true).toBe(true))` inside each `describe` block, matching the spirit of the plan's "one passing placeholder per file" requirement.
- **Files modified:** `tests/auth.test.ts`, `tests/AuthContext.test.tsx`, `tests/AppShell.test.tsx`, `tests/theme.test.ts`
- **Commit:** 1bacd27

### Version Deviations (non-breaking)

**2. Vite 8 instead of Vite 7** — `create-vite` scaffolded with the latest stable version (Vite 8). No API differences affect this plan. The research flagged Vite 7 as the target; Vite 8 is a superset.

**3. react-router-dom v7 instead of v6** — npm resolved to the latest stable (v7). SPA usage pattern for this phase is identical between v6 and v7.

**4. Vitest 4.1.0 instead of Vitest 2.x** — npm resolved to the current latest. The configuration and API are backward-compatible.

## Key Links

- `src/main.tsx` imports `@fontsource-variable/nunito` and `./styles/global.css`
- `src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `import.meta.env`
- `src/lib/supabase.ts` imports `Database` type from `src/types/database.ts`
- `index.html` dark mode script runs synchronously before React bundle loads

## Self-Check: PASSED

- `src/styles/global.css` — FOUND
- `src/lib/supabase.ts` — FOUND
- `src/types/database.ts` — FOUND
- `supabase/migrations/001_foundation.sql` — FOUND
- `vitest.config.ts` — FOUND
- `tests/setup.ts` — FOUND
- Commit 6c8e216 (Task 1) — FOUND
- Commit 3fe4f7f (Task 2) — FOUND
- Commit 1bacd27 (Task 3) — FOUND
