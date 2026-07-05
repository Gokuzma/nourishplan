# Testing

How NourishPlan is tested: unit/component tests with Vitest, an on-demand Playwright E2E suite, and heavy live-site UAT via the Playwright MCP tools (documented in `lessons.md`).

## Framework and Config

- **Vitest 4** with jsdom, globals on, `@testing-library/react` + `jest-dom` matchers.
- Config: `vitest.config.ts` — `setupFiles: ['./tests/setup.ts']`, `css: false`, and excludes `tests/e2e/**` and `.claude/worktrees/**` (the worktree exclusion exists because of lesson L-001, see Gotchas).
- Setup file `tests/setup.ts` polyfills what jsdom lacks and stubs env:
  - `window.matchMedia` mock (theme detection)
  - `IntersectionObserver` mock (used by `DayCarousel`)
  - `import.meta.env` stub with fake `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` so importing `src/lib/supabase.ts` never crashes.

## How to Run

```bash
npx vitest run                                # full suite (npm test adds --reporter=verbose)
npx vitest run src/utils/inventory.test.ts    # single file
npx playwright test                           # E2E (on-demand only, NOT in CI)
PLAYWRIGHT_BASE_URL=https://nourishplan.gregok.ca npx playwright test   # E2E against prod
```

## Where Tests Live

| Location | What |
|---|---|
| `tests/*.test.ts(x)` | Main suite (~30 files): component tests (AppShell, PlanGrid.*, RecipeMixPanel, settings, notifications, cookMode), hook tests (useCookCompletion, cookSession), pure-logic tests (nutrition, schedule, meal-plan, ratings, restrictions, wontEat, theme, guide) |
| `src/utils/*.test.ts` | Colocated unit tests for utils (cost, inventory, groceryGeneration, monotonyDetection, recipeSupply) |
| `src/utils/__tests__/` | More util tests (macroConversion, nutritionGaps, swapSuggestions) |
| `src/lib/queryKeys.test.ts` | Query key factory test |
| `tests/e2e/` | Playwright: `household-permissions.spec.ts` (266 lines, Phase 30 — first and only spec) + `helpers/login.ts` |

## What Is Covered vs Not

**Covered well:** pure utility logic (nutrition math, cost normalization, grocery generation, schedules, portion suggestions, recipe supply); component rendering with fully mocked hooks (PlanGrid shimmer/schedule/nutrition-gap states, nav assertions in AppShell); auth flows (AuthContext, ResetPasswordPage).

**Covered thinly or not at all:**
- Many `tests/*.test.ts` files are largely `it.todo(...)` placeholders (e.g., `tests/recipes.test.ts` RECP-01/02/04) — requirement IDs are recorded but unimplemented.
- Some tests are source-grep assertions rather than behavior tests (recipes.test.ts reads `MealCard.tsx` with `fs.readFileSync` and asserts strings like `'canDelete'` exist). Treat these as tripwires, not coverage.
- Supabase edge functions (`supabase/functions/*`) have **zero automated tests** — they are verified via live UAT only.
- No RLS/migration tests. No CI test gate (Playwright config notes CI wiring is a deferred roadmap item).

## Component Test Pattern (canonical: `tests/PlanGrid.shimmer.test.tsx`, `tests/AppShell.test.tsx`)

Tests do not hit Supabase. Everything below the component is mocked with `vi.mock` at module level:

```ts
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    session: { user: { id: 'user-1', email: 'test@example.com' } },
    loading: false, signOut: vi.fn(),
  }),
  AuthProvider: ({ children }) => React.createElement(React.Fragment, null, children),
}))
vi.mock('../src/hooks/useHousehold', () => ({
  useHousehold: vi.fn().mockReturnValue({
    data: { household_id: 'hh-1', role: 'admin', households: { name: 'Test' } },
    isPending: false, isError: false,
  }),
  useHouseholdMembers: vi.fn().mockReturnValue({ data: [], isPending: false, isError: false }),
}))
```

Conventions:
- Mock **hooks, not fetches**: each `use*` hook the component consumes gets a `vi.mock` returning `{ data, isPending: false, isError: false }`; mutations return `{ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }`.
- `src/lib/supabase` is mocked directly when a component calls `supabase.functions.invoke` inline (8 test files do this).
- Shared mutable module-level state (`let mockSlots: unknown[] = []`) lets each test rewrite hook return values before render.
- Heavy browser-dependent deps are stubbed to Fragments: `DayCarousel` (scrollIntoView/IO), `@dnd-kit/core`.
- Components are rendered inside `MemoryRouter` (+ `QueryClientProvider` when unmocked query hooks remain), often via dynamic `await import(...)` after mocks are declared.
- No JSX in some older tests — `React.createElement` calls (tests were written pre-tsx-config); both styles exist, match the file you're editing.

## E2E / Playwright

- `playwright.config.ts`: testDir `tests/e2e`, chromium only, 1 worker, no retries, auto-starts `npx vite --port 5173` unless `PLAYWRIGHT_BASE_URL` is set. Trace/screenshot/video retained on failure.
- `tests/e2e/helpers/login.ts` is the auth helper: clears cookies/localStorage first, fills the `/auth` form, and waits on **URL change away from /auth** — a transition-unique signal per L-026 (never wait on ambient text like "Generated" or "Saved").
- Live UAT uses the Playwright MCP tools against nourishplan.gregok.ca with the dedicated test account `claude-test@nourishplan.test` (credentials in memory `reference_test_account.md`, L-011). Seed data first via the Supabase REST API (L-012); clear the PWA service worker/caches before verifying deploys (L-003); use `browser_evaluate` polling for transient UI like 8s auto-dismiss toasts (L-028).

## Gotchas (from `lessons.md` — hard rules)

- **L-001 (critical): remove worktrees before running vitest.** Stale test copies under `.claude/worktrees/agent-*/` cause false failures even with the config exclusion:
  ```bash
  for d in .claude/worktrees/agent-*; do git worktree remove "$d" --force 2>/dev/null; done
  rm -rf .claude/worktrees/agent-*
  ```
- **L-002:** run `npm install` on main after merging any worktree branch that touched `package.json`.
- **L-021:** `tests/AppShell.test.tsx` asserts the exact Sidebar nav list (currently 10 items) and TabBar tabs (Home/Recipes/Plan/More). Adding a nav item without updating this test breaks the suite — same commit, always.
- **L-031:** Playwright E2E reads `.env.local` (`CLAUDE_TEST_MEMBER_PASSWORD`, `VITE_SUPABASE_URL`); gitignored files are invisible inside worktree-isolated agents, so E2E plans must run sequentially on main.
- **L-014:** after any bug fix, build + deploy + reproduce the original issue with Playwright before claiming fixed — never make the user the test runner.
- **L-007/L-010:** push migrations and verify the full save-reload cycle in the browser before presenting any DB-write checkpoint.
