# Coding Conventions

Conventions actually in use across the NourishPlan codebase (Vite 8 + React 19 + TypeScript strict + Supabase + TanStack Query v5 + Tailwind CSS 4). Derived from reading `src/`, `supabase/functions/`, and `lessons.md`.

## File Organization

```
src/
  pages/          Route-level components, one per screen (HomePage.tsx, GroceryPage.tsx, ...)
  components/     Grouped by domain: auth/ cook/ editorial/ feedback/ food/ grocery/
                  household/ inventory/ layout/ log/ meal/ plan/ recipe/ settings/ targets/
  hooks/          One file per domain concern, all named use*.ts (~40 hooks)
  contexts/       AuthContext.tsx only
  lib/            supabase.ts (client singleton), queryKeys.ts (ALL cache keys)
  utils/          Pure functions + colocated *.test.ts (cost.ts/cost.test.ts, inventory.ts/inventory.test.ts)
  types/          database.ts — hand-maintained row types (FoodPrice, InventoryItem, ...)
  styles/         global.css — Tailwind 4 @theme tokens + editorial utility classes
supabase/
  functions/      One dir per edge function (generate-plan/, import-recipe/, recipe-supply/, ...)
  migrations/     Numbered SQL migrations (irreversible in prod — see CLAUDE.md Risky Areas)
tests/            Vitest suites (see TESTING.md)
```

## Naming

- Components and pages: PascalCase files exporting a **named** function (`export function GroceryPage()`) — no default exports.
- Hooks: `useXxx.ts` camelCase; query hooks named for the data (`useInventoryItems`), mutation hooks verb-first (`useAddInventoryItem`, `useSaveFoodPrice`, `useDeleteFoodPrice`).
- Utils: camelCase files with descriptive names (`groceryGeneration.ts`, `monotonyDetection.ts`).
- DB columns snake_case (`household_id`, `cost_per_100g`); they flow through untranslated into TS types and params objects.

## The Hook Pattern (canonical: `src/hooks/useFoodPrices.ts`)

Every query hook follows the same shape:

```ts
export function useFoodPrices() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useQuery({
    queryKey: queryKeys.foodPrices.list(householdId),
    queryFn: async (): Promise<FoodPrice[]> => {
      const { data, error } = await supabase
        .from('food_prices').select('*')
        .eq('household_id', householdId!)
        .order('food_name')
      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}
```

Rules embedded in this pattern:
- `householdId` always comes from `useHousehold()` (membership row), never from props or context directly.
- Query keys ALWAYS come from `src/lib/queryKeys.ts` — never inline arrays in query hooks. Keys are factory functions returning `as const` tuples keyed on householdId (or listId/recipeId/etc.).
- `enabled: !!householdId` gates every household-scoped query; inside `queryFn` the non-null assertion `householdId!` is then safe.
- `if (error) throw error` after every Supabase call; return `data ?? []` for list queries.
- Return type annotated on the async `queryFn` (`Promise<FoodPrice[]>`), typed from `src/types/database.ts`.

## Mutation Pattern

```ts
export function useAddInventoryItem() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  return useMutation({
    mutationFn: async (params: AddInventoryItemParams) => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')
      // ...insert with household_id + added_by/created_by
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })
    },
  })
}
```

- Guard clauses first: throw `'Not authenticated'` / `'No household found'` before any DB call.
- Writes always set `household_id` plus the audit column (`created_by` / `added_by`) from `session.user.id`.
- Params are a named `interface XxxParams` (or inline object type for small mutations); optional fields defaulted with `?? null` / `?? false` at insert time.
- Invalidation uses prefix arrays (`['inventory', householdId]`) or `queryKeys.*` calls. **L-035 (lessons.md): invalidate EVERY distinct key prefix the mutation affects** — `['grocery', ...]` does not cascade to `['grocery-items', ...]`.
- **L-032:** before writing `.upsert(..., { onConflict })`, verify the migration defines a plain-column UNIQUE index matching the target exactly; functional/partial indexes require query-then-insert-or-update instead (see L-006).

## Component / Page Patterns

- Pages are single named-function components holding `useState` locals, the relevant query/mutation hooks at the top, then small `function handleX()` handlers, then JSX.
- Page container classes: the editorial layout is `paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans` (GroceryPage.tsx:118); older/simpler pages use `px-4 py-6 font-sans pb-[64px]` (InsightsPage.tsx, RecipeBuilder.tsx). Bottom padding clears the mobile TabBar.
- Loading state: check `isPending` and render a lightweight `Loading…` inside the same container. Errors: surface `mutation.isError` / `query.isError` inline near the triggering UI (HomePage.tsx:174, GroceryPage.tsx:169) — there is no global error boundary or toast system.
- Shared editorial primitives live in `src/components/editorial/index.tsx`: `Nameplate`, `StoryHead`, `SectionHead`, `Folio`, `Rule`, `Chip`, `Pip`. Use these for headers/chips instead of ad-hoc markup.
- Icons via the single `src/components/Icon.tsx` component (`<Icon name="fridge" />`).
- Watch two-render-path components (L-009): `SlotCard.tsx` has occupied + empty paths — visual indicators must be added to both.

## Styling (Tailwind CSS 4)

- Tokens declared in `src/styles/global.css` under `@theme`: semantic colors (`--color-primary` sage `#7a8c70`, `--color-accent` salmon), the cookbook palette (`--color-paper`, `--color-ink`, `--color-plum`, ...), fonts (`--font-sans` Inter, `--font-display` Outfit, `--font-serif` Instrument Serif, `--font-mono` DM Mono), and radii `--radius-card: 0px` / `--radius-btn: 0px` (deliberately sharp, editorial — not SaaS-rounded).
- A parallel `:root` block exposes raw CSS vars (`--paper`, `--ink`, `--rule-soft`) consumed by handwritten utility classes (`.paper`, `.serif-italic`, nameplate/section-head/chip classes) that are additive to Tailwind.
- Dark mode via a `.dark` class on `<html>` that overrides the CSS vars (`src/utils/theme.ts` manages it).
- Inline `style={{ color: 'var(--ink-soft)' }}` is used where the token has no Tailwind class — acceptable and common.

## TypeScript

- Strict everywhere (`tsconfig.app.json`: `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `noUncheckedSideEffectImports`). `npm run build` runs `tsc -b` first, so type errors block builds.
- `import type { ... }` for type-only imports (required by verbatimModuleSyntax).
- Row types are hand-written in `src/types/database.ts` — no codegen. Keep them in sync with migrations.
- Non-null assertions (`householdId!`) only appear where an `enabled` guard makes them provably safe.
- ESLint: flat config (`eslint.config.js`) with `typescript-eslint` recommended + `react-hooks` + `react-refresh`. No Prettier — formatting is by convention (no semicolons in src/, 2-space indent; edge functions use semicolons, Deno style).

## Edge Function Conventions (`supabase/functions/*/index.ts`)

- Deno + `serve()` from `deno.land/std`, Supabase client from `esm.sh`.
- Top-of-file: `CORS_HEADERS` const (`Access-Control-Allow-Origin: *`), named constants for timeouts/limits, local interfaces, and any LLM `SYSTEM_PROMPT` as a template-literal const.
- Auth is done INSIDE the function: create an admin client with `SUPABASE_SERVICE_ROLE_KEY`, then `adminClient.auth.getUser(token)` on the bearer token (generate-plan/index.ts:178). Because of this, **deploy with `--no-verify-jwt`** (L-025).
- Inserts into `meals` must set `created_by` (L-018) and mirror the `meal_items` wrapping-row contract (L-033). Any recipe-creating path must set `meal_types` (L-036).
- LLM output is never trusted for correctness invariants — run a deterministic validation/repair pass before persisting (L-038).
- User-facing error strings are named constants (`FETCH_FAILURE_MSG`) returned as JSON, not thrown raw.

## Domain Gotchas

- Slot naming mismatch: schedules use `"Snack"`, plan grid uses `"Snacks"` — normalize when bridging (L-008).
- `queryKeys.grocery.list` vs `.items`, `meals` vs `meal-plan-slots`, `recipes` vs `recipe-ingredients` are separate prefixes — see L-035.
- Nav items in `Sidebar.tsx` / `MobileDrawer.tsx` are pinned by exact assertions in `tests/AppShell.test.tsx` (L-021) — update test and nav in the same commit.
