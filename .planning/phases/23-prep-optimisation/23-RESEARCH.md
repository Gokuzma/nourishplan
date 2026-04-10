# Phase 23: Prep Optimisation - Research

**Researched:** 2026-04-10
**Domain:** Supabase (Postgres JSONB + Realtime + Edge Functions) + Claude API orchestration + React 19 + TanStack Query + PWA Notifications API
**Confidence:** HIGH for schema / hooks / edge functions / realtime (all have exact precedents in the codebase); MEDIUM for PWA notifications (new territory for the project)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Recipe Data Model Additions**
- **D-01:** `recipes.instructions` JSONB column stores the step array. One migration, no new table. Each step object: `{ text, duration_minutes, is_active, ingredients_used[], equipment[] }` — the "rich step" shape that enables multi-meal parallel scheduling and equipment conflict detection
- **D-02:** `recipes.freezer_friendly` boolean + `recipes.freezer_shelf_life_weeks` integer columns. Both nullable — null means not yet classified
- **D-03:** Step generation fires on recipe save (eager). Recipe save invokes the AI steps edge function; steps are ready before anyone opens Cook Mode. Trades credits for responsiveness
- **D-04:** When a recipe's ingredients change, the regeneration prompt includes the previous user-edited steps as input and asks the AI to merge intent — rephrasing where needed, preserving custom additions, surfacing a confirmation prompt when the AI is unsure whether a user addition should survive

**Step Sourcing & Editability**
- **D-05:** AI generates step sequences. If the recipe already has imported instructions (from Phase 25 Universal Recipe Import later, or freeform `notes`), AI parses them into the standard rich-step format. Otherwise AI creates a sequence from name + ingredients using cooking best practices
- **D-06:** Per-step schema: text, duration_minutes, is_active (hands-on vs passive waiting/cooking), ingredients_used[], equipment[] — all AI-populated
- **D-07:** Users can fully edit AI-generated steps in the recipe editor: text, duration, active/passive flag, and reorder. Edits persist and are treated as canonical until the next regeneration
- **D-08:** Duration estimates are AI-decided with no per-household calibration in MVP — same step, same recipe, same duration for every household

**Freezer-Friendly Flag**
- **D-09:** AI auto-suggests the freezer_friendly flag + shelf-life weeks on recipe save (same edge function trip as step generation, or a sibling call). User can toggle the boolean and edit the weeks in the recipe editor. Both user overrides persist
- **D-10:** Backfill for existing recipes is lazy on plan generation — any recipe the Phase 22 planning engine selects into a generated plan gets classified during that AI pass if its flag is null. Avoids a big bulk job on Phase 23 deploy
- **D-11:** Freezer badge renders on recipe cards (recipe list), plan slots (SlotCard), and the batch prep summary modal — full surface coverage as required by PREP-03
- **D-12:** Shelf-life weeks stored alongside the boolean enables Phase 23's batch prep modal to recommend fridge vs freeze per recipe based on how far ahead of its consume slot it's being prepped

**Batch Prep Summary**
- **D-13:** Entry point is a button on the Plan page (sits alongside Phase 22's "Generate Plan" button). Tapping opens the batch prep summary as a modal — not a nav tab, not a collapsible section
- **D-14:** Summary content per prep session: recipes in the session, total prep time, shared ingredients callout (e.g., "2 cups rice cooked once for 3 meals"), and per-recipe storage hint (fridge for near-term consume, freezer for far-term consume or flagged-freezer recipes)
- **D-15:** AI chooses the grouping strategy per week — it looks at the whole plan and picks whichever grouping (shared ingredient, shared equipment, schedule prep slots, or a mix) gives the best time savings. Not a fixed rule
- **D-16:** When a consume slot has no preceding prep session in the week, the AI auto-reassigns the recipe to a nearby prep slot (writes back to the plan). The user sees the reassignment reflected in the plan grid after batch prep computation
- **D-17:** Batch prep summary auto-refreshes on plan changes with a 30-second debounce — rapid slot drags coalesce into a single recompute after the user stops editing

**Cook Mode (Day-of Task Sequence)**
- **D-18:** Dedicated `/cook/:mealId` route — not a modal and not an expanded SlotCard. Full-page Cook Mode experience
- **D-19:** Full active cook mode: per-step check-offs, per-step start timers, notification-driven passive step completion, progress bar
- **D-20:** Cook Mode can be opened from three places: (a) Plan grid (tap a SlotCard → "Cook" action), (b) Recipe detail page at `/recipes/:id` (ad-hoc cook without a plan slot), and (c) a standalone `/cook` shortcut that lets the user pick any recipe
- **D-21:** Cook Mode flow varies by slot status:
  - **Consume slot:** Reheat-only sequence
  - **Prep slot with multiple recipes:** User prompted each open to choose combined multi-meal view or per-recipe view
  - **Quick slot:** Same full cook mode flow as a day-of scratch cook
  - **Day-of scratch cook (any slot):** Full sequence from AI-generated steps

**Cook Mode State & Household Sharing**
- **D-22:** Cook session state persists to Supabase in a new `cook_sessions` table. User can close the tab on one device and resume on another. Requires new table + RLS
- **D-23:** Per-member lanes — the cook session tracks step ownership per household member so two people can cook the same meal collaboratively
- **D-24:** Realtime subscription on cook_sessions so Partner A's check-off on step 3 appears on Partner B's screen immediately. Reuses the Supabase Realtime pattern already used in the grocery list
- **D-25:** Passive-step timers use PWA service worker notifications — a local notification fires when a passive timer hits zero even if the app tab is closed. Requires the Notification permission prompt on first cook
- **D-26:** Multiple concurrent cook sessions supported

**AI Cost, Caching, Rate Limiting**
- **D-27:** Step cache lives on the recipe itself (D-01). Ingredient edits invalidate steps and trigger regeneration. Name changes do NOT invalidate. Servings changes do NOT invalidate
- **D-28:** Batch prep summary auto-refresh is debounced 30 seconds after the last plan change
- **D-29:** Phase 23 AI calls share the Phase 22 per-household daily rate limit
- **D-30:** Phase 23 edge function(s) follow the Phase 20/22 pattern (Deno + Supabase client + shared ANTHROPIC_API_KEY secret). Model selection (Haiku vs Sonnet) per-call is Claude's discretion

### Claude's Discretion
- Exact Supabase Edge Function boundaries — one omnibus `prep-optimise` function, or separate `generate-steps`, `classify-freezer`, `compute-batch-prep`, `compute-multi-meal-sequence` functions
- Haiku vs Sonnet selection per call based on task complexity
- `cook_sessions` table schema details (step state column shape, lane/member dimension, indexes for realtime filtering)
- Notification permission prompt UX (when to ask, how to handle denied state)
- Multi-meal combined-vs-per-recipe prompt UI
- Batch prep summary modal layout and visual design
- Rich step object additional fields if the AI needs them (e.g., temperature, tools_needed beyond `equipment`)
- "Stale plan" indicator while the 30-second debounce is pending
- AI prompt design for step generation, merge-intent regeneration, freezer classification, and multi-meal scheduling
- RLS policies on `cook_sessions` and any other new tables

### Deferred Ideas (OUT OF SCOPE)
- Per-household duration calibration
- Versioned recipe instructions with rollback
- Per-recipe + servings cache combinations
- Separate rate limits for Phase 23 AI calls
- Equipment-conflict hard enforcement in batch prep
- Recipe import from URL (Phase 25 territory)
- Smart prep automation (explicitly marked "Out of Scope until prep optimization is stable")

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PREP-01 | User can view batch prep suggestions for the week's meal plan | Section E (batch prep modal), Section D.4 (AI batch prep prompt), Section A (migration 029 for freezer columns), Section I (useBatchPrepSummary hook, 30s debounce) |
| PREP-02 | User can view day-of task sequencing for a meal | Section F (Cook Mode route & state), Section A.2 (cook_sessions table), Section D.1 (step generation prompt), Section D.5 (multi-meal sequence), Section D.6 (reheat sequence), Section G (PWA notifications for passive timers) |
| PREP-03 | Freezer-friendly recipes are flagged for make-ahead prep | Section A.1 (freezer_friendly + freezer_shelf_life_weeks columns), Section D.3 (freezer classification prompt), Section H (freezer badge integration in three surfaces) |

These three requirements are verbatim from `.planning/REQUIREMENTS.md` §Prep (lines 174–176). All three are explicitly mapped to Phase 23 in the traceability table (lines 310–312).
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The following directives from `CLAUDE.md` and `.claude/rules/*.md` are hard constraints on this phase:

1. **Stack is fixed:** Vite 8 + React 19 + Supabase + TanStack Query + Tailwind CSS 4. Do NOT introduce frameworks.
2. **`lessons.md` is mandatory reading** and every **Rule** is a hard constraint (see Section L for which lessons directly apply).
3. **queryKeys.ts is the single source of cache keys.** Changes here affect every hook — extend, do not redesign.
4. **Hooks follow the `useFoodPrices` pattern:** householdId from `useHousehold()`, `enabled: !!householdId`, mutations invalidate via prefix arrays, e.g. `['cookSession', householdId]`.
5. **Page layouts use `px-4 py-6 font-sans pb-[64px]`** — Cook Mode is an exception per UI-SPEC (full viewport, pb-32 for fixed footer).
6. **`supabase/migrations/` is irreversible in production** — test RLS policies carefully; new tables start at 029.
7. **`src/components/layout/Sidebar.tsx` and `MobileDrawer.tsx` — tests/AppShell.test.tsx asserts exact nav count of 10 items** (L-021). Phase 23 MUST NOT add a nav item; Cook Mode is a top-level route outside AppShell; batch prep is a modal.
8. **`src/contexts/AuthContext.tsx` is mocked in several tests** — changes here ripple.
9. **Match existing patterns, avoid premature abstraction** — rule from `.claude/rules/code-style.md`.
10. **Do not add comments/docstrings/type annotations to code you didn't change** — from global CLAUDE.md.
11. **Keep diffs small and focused** — from `.claude/rules/code-style.md`.

## Summary

Phase 23 adds three coordinated capabilities to NourishPlan: (1) a batch prep summary modal opened from PlanGrid next to the existing Generate Plan button, (2) a full-page Cook Mode route family outside AppShell with per-step timers, per-member lanes, and Supabase Realtime sync, and (3) a freezer-friendly flag rendered on three surfaces (recipe cards, SlotCard, batch prep modal). Every AI decision — step generation, freezer classification, batch prep grouping, multi-meal sequencing, reheat sequencing — is made by Claude via edge functions that exactly mirror the established `generate-plan` pattern (Deno + shared `ANTHROPIC_API_KEY` + host-side auth validation + per-household 24h rate limit counter).

The research confirms every piece of infrastructure Phase 23 needs already exists in the codebase: the edge function shell (`supabase/functions/generate-plan/index.ts`), Supabase Realtime wiring (`src/hooks/useGroceryItems.ts`), RLS helper (`get_user_household_id()` in `002_fix_household_members_rls.sql`), `@dnd-kit/sortable` for step reordering, `vite-plugin-pwa` workbox service worker (`vite.config.ts`), and the `useFoodPrices` hook shape. No new libraries are needed. The single gap is Notification API usage — the project has never used it — but it is a native browser API with no dependency cost. Recipes have NO existing step column (`src/types/database.ts` lines 65–75 confirms Recipe has only id, household_id, created_by, name, servings, notes, deleted_at, created_at, updated_at), so migration 029 is strictly additive.

**Primary recommendation:** Split AI work across **4 Supabase Edge Functions** (not one omnibus, not one per capability): `generate-recipe-steps` (hot path on recipe save — includes freezer classification in the same Claude call), `compute-batch-prep` (includes plan-slot auto-reassignment and multi-meal grouping), `generate-cook-sequence` (handles both single-recipe full cook sequence AND multi-meal combined sequence), and `generate-reheat-sequence` (consume-slot flow). Keep `cook_sessions` as a single live-state table with a `step_state` JSONB column. Wire PWA notifications via the `virtual:pwa-register` hook on the client PLUS the registered service worker's `showNotification()` for tab-closed delivery.

## Standard Stack

### Core (already installed — verified `package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.1 [VERIFIED: package.json] | DB, RLS, Realtime, edge function invoke | Already wired app-wide; realtime pattern in useGroceryItems.ts |
| @tanstack/react-query | ^5.90.21 [VERIFIED: package.json] | Server state cache + hook layer | Every existing hook follows this pattern |
| @dnd-kit/sortable | ^10.0.0 [VERIFIED: package.json] | Step reordering in RecipeEditorStepsSection | Already in use by Phase 19 for slot drag-drop — reuse |
| @dnd-kit/core | ^6.3.1 [VERIFIED: package.json] | Required peer for sortable | Already in use |
| vite-plugin-pwa | ^1.2.0 [VERIFIED: package.json] | Workbox service worker + `virtual:pwa-register` | Already wired in vite.config.ts lines 11–42 |
| react-router-dom | ^7.13.1 [VERIFIED: package.json] | Routing for `/cook/:mealId`, `/cook`, `/cook/session/:sessionId` | Already app-wide |
| React | ^19.2.4 [VERIFIED: package.json] | UI | Already app-wide |

### Browser APIs (no install needed)
| API | Purpose | Notes |
|-----|---------|-------|
| `Notification.requestPermission()` [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static] | Request user consent for notifications | Inline trigger from NotificationPermissionPrompt banner per UI-SPEC lines 307–317 |
| `ServiceWorkerRegistration.showNotification()` [CITED: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification] | Dispatch local notification from service worker | Required for tab-closed delivery (D-25); called via `navigator.serviceWorker.ready.then(reg => reg.showNotification(...))` |
| `setTimeout` / `setInterval` | Countdown timer in CookStepTimer | Pure client — UI-SPEC lines 256–266 specifies `text-3xl tabular-nums` display |
| `localStorage` | `cook-notification-dismissed-at` persistence | Already used elsewhere (InstallPrompt localStorage key) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `cook_sessions` JSONB `step_state` | Normalized `cook_session_steps` table | JSONB wins: matches Supabase Realtime's simple row-level event model (useGroceryItems pattern), avoids an N+1 rows-to-sync problem, matches how `plan_generations.constraint_snapshot` stores session metadata as JSONB [VERIFIED: 026_plan_generations.sql line 7] |
| Split Phase 23 into 5 edge functions | Single `prep-optimise` omnibus | Split wins: cold start is acceptable (existing 8 functions all cold-start fine) and logging clarity + per-call rate limit accounting matters. But 5 is too many; 4 is the right granularity (see Section C) |
| `zod` for rich-step validation | Hand-rolled TS type guards | Hand-rolled wins: the project has NO zod dependency [VERIFIED: package.json — no zod]. Adding it for one phase is premature. Match `recipe_ingredients` snapshot validation pattern (hand-rolled) |
| WebSocket polling for generation status | Supabase Realtime channel | Realtime wins for cook_sessions (live sync) but plan_generations already polls with TanStack Query (useGenerationJob in src/hooks/usePlanGeneration.ts) — keep batch prep async job flow as polling for consistency |
| Client-only timer (setTimeout when tab closed) | Service worker registration timer | Service worker wins: `setTimeout` is paused/killed when the tab is hidden on mobile Safari and can be killed by OS memory pressure anywhere. SW `showNotification()` dispatched from a background context is the only reliable delivery mechanism for "the rice is done" — see Section G |

**Version verification:**
```bash
npm view @supabase/supabase-js version  # expect >= 2.99.1 [VERIFIED: package.json]
npm view @tanstack/react-query version  # expect >= 5.90.21 [VERIFIED: package.json]
npm view @dnd-kit/sortable version       # expect >= 10.0.0 [VERIFIED: package.json]
npm view vite-plugin-pwa version         # expect >= 1.2.0 [VERIFIED: package.json]
```

## Architecture Patterns

### Recommended Project Structure

```
supabase/
├── migrations/
│   └── 029_prep_optimisation.sql                   # Single migration for recipes columns + cook_sessions table
├── functions/
│   ├── generate-recipe-steps/index.ts              # Recipe save -> steps + freezer classification (Haiku, eager)
│   ├── compute-batch-prep/index.ts                 # Plan snapshot -> session cards + slot reassignment (Sonnet)
│   ├── generate-cook-sequence/index.ts             # meal_id -> step sequence; handles multi-meal (Sonnet)
│   └── generate-reheat-sequence/index.ts           # meal_id + slot status='consume' -> reheat steps (Haiku)

src/
├── types/database.ts                               # Extended Recipe + new RecipeStep + new CookSession types
├── lib/queryKeys.ts                                # + cookSession, batchPrep, recipeSteps namespaces
├── hooks/
│   ├── useRecipeSteps.ts                           # useRecipeSteps, useUpdateRecipeSteps, useRegenerateRecipeSteps
│   ├── useBatchPrepSummary.ts                      # useBatchPrepSummary (30s debounce in useEffect)
│   ├── useCookSession.ts                           # useCookSession + useCreateCookSession + useUpdateCookStep (+ realtime subscribe)
│   ├── useFreezerClassification.ts                 # useToggleFreezerFriendly, useUpdateShelfLifeWeeks
│   └── useNotificationPermission.ts                # Wraps Notification.requestPermission + localStorage
├── components/
│   ├── plan/
│   │   ├── BatchPrepButton.tsx                     # Adjacent to GeneratePlanButton in PlanGrid.tsx header
│   │   ├── BatchPrepModal.tsx                      # Reuses MealPicker modal shell (PlanGrid.tsx lines 49-81)
│   │   ├── BatchPrepSessionCard.tsx                # Single session card with shared-ingredients callout
│   │   ├── BatchPrepStaleIndicator.tsx             # Amber pulse row during debounce
│   │   ├── FreezerBadge.tsx                        # Shared component — all three surfaces
│   │   └── SlotCard.tsx                            # DELTA: add Cook button (icon), add freezer badge slot
│   ├── cook/
│   │   ├── CookModeShell.tsx                       # Top-level route container
│   │   ├── CookStepCard.tsx                        # Active/inactive/completed step card
│   │   ├── CookStepTimer.tsx                       # Reuses ProgressRing from src/components/plan/ProgressRing.tsx
│   │   ├── CookStepPrimaryAction.tsx               # Fixed footer button
│   │   ├── MemberLaneHeader.tsx                    # Sticky subheader per lane
│   │   ├── MultiMealSwitcher.tsx                   # Pill strip in top bar
│   │   ├── MultiMealPromptOverlay.tsx              # Modal on prep-slot-multi-recipe entry
│   │   ├── NotificationPermissionPrompt.tsx       # Inline banner above active step
│   │   └── ReheatSequenceCard.tsx                  # Consume-slot simplified view
│   └── recipe/
│       ├── RecipeBuilder.tsx                       # DELTA: Add Steps section between Ingredients and Notes
│       ├── RecipeStepsSection.tsx                  # Draggable step list (reuses @dnd-kit/sortable)
│       ├── RecipeStepRow.tsx                       # Individual editable row
│       └── RecipeFreezerToggle.tsx                 # Three-state segmented (Auto/Yes/No) + shelf life weeks input
└── pages/
    ├── CookPage.tsx                                # Route element for /cook/:mealId and /cook/session/:sessionId
    ├── StandaloneCookPickerPage.tsx                # Route element for /cook (no meal id)
    └── RecipePage.tsx                              # DELTA: Add "Cook this recipe" CTA
```

### Pattern 1: Supabase Edge Function (Deno) — the exact shell
**What:** Every Phase 23 edge function replicates this shell verbatim.
**When to use:** All four new functions (`generate-recipe-steps`, `compute-batch-prep`, `generate-cook-sequence`, `generate-reheat-sequence`).
**Source verified:** `supabase/functions/generate-plan/index.ts` lines 1–165

```typescript
// Source: supabase/functions/generate-plan/index.ts:1-165
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  try {
    const body = await req.json();
    const { householdId /* + other params */ } = body;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return /* graceful error 200 */;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // L-025 CRITICAL: deploy with --no-verify-jwt. Auth validated inside:
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return /* 200 with error */;
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) return /* 200 with error */;

    // Household membership check
    const { data: membership } = await adminClient
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("household_id", householdId)
      .maybeSingle();
    if (!membership) return /* 200 with error */;

    // Shared Phase 22 rate limit — count all plan_generations in 24h window
    // (per D-29, Phase 23 calls share this counter)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentJobCount } = await adminClient
      .from("plan_generations")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .gt("created_at", twentyFourHoursAgo);
    if ((recentJobCount ?? 0) >= 10) return /* 200 rate limit error */;

    // ...Claude API call...
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",  // or claude-sonnet-4-5 — see Section C
        max_tokens: 1024,
        system: "...",
        messages: [{ role: "user", content: "..." }],
      }),
    });

    // Parse JSON out of Claude response — robust regex match
    const aiData = await response.json();
    const text = aiData.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);  // or /\[[\s\S]*\]/ for arrays
    if (!jsonMatch) return /* 200 with error */;
    const parsed = JSON.parse(jsonMatch[0]);

    // ...DB write...
    return new Response(
      JSON.stringify({ success: true, /* data */ }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
```

**Deployment command per L-025:**
```bash
SUPABASE_ACCESS_TOKEN=<from .env.local> npx supabase functions deploy <fn-name> --project-ref <ref> --no-verify-jwt
```

### Pattern 2: TanStack Query hook with household scope
**Source:** `src/hooks/useFoodPrices.ts` (verified lines 1–57)

```typescript
// Source: src/hooks/useFoodPrices.ts:8-24
export function useRecipeSteps(recipeId: string | undefined) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useQuery({
    queryKey: queryKeys.recipeSteps.detail(recipeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, instructions, freezer_friendly, freezer_shelf_life_weeks')
        .eq('id', recipeId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!householdId && !!recipeId,
  })
}
```

### Pattern 3: Supabase Realtime subscription inside a query hook
**Source:** `src/hooks/useGroceryItems.ts` lines 25–45 (verified)

```typescript
// Source: src/hooks/useGroceryItems.ts:25-45
useEffect(() => {
  if (!sessionId) return
  const channel = supabase
    .channel(`cook-session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cook_sessions',
        filter: `id=eq.${sessionId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.detail(sessionId) })
      }
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}, [sessionId, queryClient])
```

### Pattern 4: RLS policy structure for per-household + per-member tables
**Source:** `supabase/migrations/024_feedback_dietary.sql` lines 25–48, `supabase/migrations/025_schedule.sql` lines 26–51

```sql
-- Source: supabase/migrations/025_schedule.sql:26-51 (verbatim structure)
alter table public.cook_sessions enable row level security;

create policy "household members read cook_sessions"
  on public.cook_sessions for select to authenticated
  using (household_id = get_user_household_id());

create policy "household members insert cook_sessions"
  on public.cook_sessions for insert to authenticated
  with check (household_id = get_user_household_id());

create policy "household members update cook_sessions"
  on public.cook_sessions for update to authenticated
  using (household_id = get_user_household_id());

create policy "household members delete cook_sessions"
  on public.cook_sessions for delete to authenticated
  using (household_id = get_user_household_id());

-- Realtime publication — pattern from 022_grocery_list.sql:73
alter publication supabase_realtime add table public.cook_sessions;
```

### Anti-Patterns to Avoid
- **Do NOT hand-code a longest-first scheduler** — CONTEXT.md §specifics states "AI does it — orchestrate and cache only". Multi-meal sequence is an AI call, not `recipes.sort((a,b) => b.duration - a.duration)`.
- **Do NOT skip the `--no-verify-jwt` flag** on deploy — L-025 documents a full UAT block caused by this.
- **Do NOT add a new Sidebar/TabBar nav item** — `tests/AppShell.test.tsx` line 48 asserts exact 10 items; Phase 23's Cook Mode is a top-level route outside AppShell (App.tsx pattern line 160 for `/offline`), and batch prep is a modal (L-021).
- **Do NOT use a regular `upsert` on cook_sessions if we add a partial unique index** — L-006 documents Supabase upsert silently failing with partial unique indexes. Use `delete + insert` or composite non-partial indexes.
- **Do NOT trigger Notification.requestPermission() on page load** — UI-SPEC lines 317 are explicit: "first passive-wait step of a user's first-ever cook session". Preemptive permission asks are ignored by browsers and annoy users.
- **Do NOT reconstruct steps from memory in the Write tool** — L-024: use Read then Edit, never Write, when editing existing files over 200 lines like `PlanGrid.tsx` or `SlotCard.tsx`.
- **Do NOT rely on client-side `setTimeout` as the sole mechanism for notification firing** — mobile Safari suspends inactive tabs, timers may never fire. Use `navigator.serviceWorker.ready.then(reg => reg.showNotification(...))`.
- **Do NOT invalidate recipeSteps cache on every recipe save** — only on ingredient changes per D-27. Name and servings edits MUST NOT trigger the AI.
- **Do NOT render step text via raw HTML injection APIs** — React default-escapes text content; stick to plain `{step.text}` rendering. Unsafe HTML injection APIs have no legitimate use for Phase 23 content — all step text comes from AI or user input and should be displayed as plain text.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Longest-first step scheduling | Custom sort algorithm | AI via `generate-cook-sequence` edge function | CONTEXT.md D-15 + §specifics: AI picks grouping/sequencing. Equipment conflict detection and parallelisation are hard problems that Claude handles better than hand code |
| Batch prep session grouping | Graph-partitioning / shared-ingredient clustering | AI via `compute-batch-prep` edge function | D-15: "AI chooses the grouping strategy per week" |
| Step text parsing from `notes` field | Regex-based ingredient/duration extractor | AI in `generate-recipe-steps` | D-05: "If the recipe already has imported instructions... AI parses them into the standard rich-step format" |
| Merge-intent step preservation across edits | Diff algorithm on user edits | Claude prompt receives previous user-edited steps | D-04: explicit merge-intent prompt; AI flags uncertainty for user confirmation |
| Freezer shelf-life estimation | Ingredient database + rule table | Claude classification | D-09: "AI auto-suggests the freezer_friendly flag + shelf-life weeks" |
| Step drag-and-drop reordering | Custom pointer/touch logic | `@dnd-kit/sortable` (already installed) | Reuse from Phase 19 — NOT premature abstraction, it's already in the codebase |
| Countdown timer width jitter | Custom monospace-with-padding hack | `text-3xl tabular-nums` per UI-SPEC line 104 | CSS feature; no JS needed |
| Notification scheduling when tab closed | Client `setTimeout` fallback | `ServiceWorkerRegistration.showNotification()` from the installed PWA | `vite-plugin-pwa` generates the SW; we call from it |
| Debounced plan-change detection | Custom debounce class | `useEffect` + `setTimeout` ref cleanup | Standard React pattern — see pattern in Section E.2 |
| Modal backdrop + focus trap | Headless UI / Radix Dialog | Reuse `MealPicker` shell in `PlanGrid.tsx:49-81` | UI-SPEC line 212 explicitly says "exact reuse of MealPicker modal layout from PlanGrid.tsx" |
| Rich-step schema validation | zod | Hand-rolled TS type guards | Project has NO zod dependency [VERIFIED: package.json]. Match `recipe_ingredients` snapshot validation approach |

**Key insight:** Phase 23 is 95% orchestration and 5% novel code. Every non-AI problem (modal shell, realtime sync, drag-and-drop, PWA, hooks) has an existing pattern in the codebase. The novel surfaces are (a) the rich-step JSONB schema design, (b) four Claude prompts, and (c) the notification-via-service-worker plumbing.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `recipes` table — existing rows will have `instructions = NULL`, `freezer_friendly = NULL`, `freezer_shelf_life_weeks = NULL` after migration 029. Per D-10, backfill is LAZY via the Phase 22 planning pass. No migration data rewrite needed. | None — lazy backfill in Phase 22 generate-plan next call |
| Live service config | None — Phase 23 does not depend on external service configuration beyond the already-configured Supabase project | None |
| OS-registered state | None — no cron, no scheduled tasks, no OS daemons | None |
| Secrets/env vars | `ANTHROPIC_API_KEY` (already configured for Phase 20/22 edge functions), `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ACCESS_TOKEN` (in .env.local per L-017). No new secrets needed. | None |
| Build artifacts | `virtual:pwa-register` generates the service worker on every `vite build`. Phase 23 adds Notification API calls from the client — workbox SW does NOT need additional `importScripts`. L-003 documents PWA cache invalidation for Playwright verification. | Regenerate SW on every build (automatic); clear PWA cache before Playwright verify (L-003) |

**Migration 029 is strictly additive** — verified by reading `supabase/migrations/028_plan_generations_partial_status.sql` which is the current head. Phase 23 adds:
- `recipes.instructions JSONB NULL`
- `recipes.freezer_friendly BOOLEAN NULL`
- `recipes.freezer_shelf_life_weeks INTEGER NULL`
- `cook_sessions` table (new)
- `alter publication supabase_realtime add table public.cook_sessions`

## Common Pitfalls

### Pitfall 1: Edge function JWT verification mismatch (L-025)
**What goes wrong:** Every call returns `{"code":401,"message":"Invalid JWT"}` from the Supabase edge runtime — before any Phase 23 function code runs.
**Why it happens:** Supabase now issues ES256 tokens; edge functions default to `verify_jwt = true` which uses legacy HS256.
**How to avoid:** Deploy every Phase 23 function with `--no-verify-jwt` and validate the JWT internally using `adminClient.auth.getUser(token)` (verified pattern in `supabase/functions/generate-plan/index.ts:129-135`).
**Warning signs:** 401 from the edge runtime in the browser network tab even though the user is logged in.

### Pitfall 2: Sidebar/MobileDrawer nav count test breakage (L-021)
**What goes wrong:** `tests/AppShell.test.tsx` line 48 asserts an exact list of 10 nav items; any new item breaks the test.
**Why it happens:** Easy to add a "Cook" or "Prep" nav item to Sidebar for discoverability.
**How to avoid:** CONTEXT.md code_context is explicit: Phase 23 does NOT add a nav item. Cook Mode is a **top-level route outside AppShell** (like `/offline` in App.tsx line 160) and batch prep is a modal triggered from within the Plan page.
**Warning signs:** `npx vitest run tests/AppShell.test.tsx` fails with "expected X nav items".

### Pitfall 3: Worktree agent deletes existing features in SlotCard / PlanGrid (L-020, L-027)
**What goes wrong:** A worktree executor agent regenerating `SlotCard.tsx` from scratch deletes `AIRationaleTooltip`, `LockBadge`, violation badges, portion suggestions, and the existing icon row.
**Why it happens:** SlotCard.tsx is already 300+ lines; any "rewrite and add the cook button" prompt causes truncation.
**How to avoid:** L-027 Rule: when spawning a GSD executor that touches `SlotCard.tsx` or `PlanGrid.tsx`, the prompt MUST include a `<critical_l020_warning>` block listing EXACT features to preserve (drag handle, LockBadge, AIRationaleTooltip, violation count badge, portion suggestions expand button, onSuggestAlternative, onSwap, onClear, member progress rings, PortionSuggestionRow expansion) and require `Edit` tool usage, never `Write`.
**Warning signs:** After merge, `git diff` shows any of the above symbols removed.

### Pitfall 4: Supabase upsert with partial unique index (L-006)
**What goes wrong:** `upsert({ onConflict: 'meal_id,household_id' })` on `cook_sessions` silently fails or inserts duplicates.
**Why it happens:** PostgREST's `onConflict` cannot resolve against `CREATE UNIQUE INDEX ... WHERE meal_id IS NOT NULL`.
**How to avoid:** If `cook_sessions` needs "resume latest active session" semantics, use a regular (non-partial) composite unique constraint OR use delete-then-insert. Simplest approach: use `id` as the only unique key and query "latest active" via `WHERE household_id = X AND meal_id = Y AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1`.
**Warning signs:** Two cook_sessions rows appear for the same meal.

### Pitfall 5: Notification permission denial creates silent feature
**What goes wrong:** User taps "Not now" or denies the browser permission; passive timers count down with no notification; user thinks the feature is broken.
**Why it happens:** Once denied, `Notification.permission === 'denied'` persists and `requestPermission()` cannot re-prompt — the user must go into browser settings.
**How to avoid:** UI-SPEC lines 315 specifies a "Notifications blocked" amber banner state with re-show after 7-day cooldown. Feature still WORKS (visual countdown continues) but the absence of audio/notification is explained inline.
**Warning signs:** Passive timer reaches zero but no notification appears AND no banner explains why.

### Pitfall 6: Service worker stale cache on deploy (L-003)
**What goes wrong:** Post-deploy Playwright verification hits the old SW which serves stale assets; Phase 23 new components render the old bundle.
**Why it happens:** Workbox caches aggressively; `main.tsx:9` uses `immediate: true` which should force reload, but Playwright browsers keep the SW alive.
**How to avoid:** L-003 pattern — clear SW + caches in the Playwright context before verification. Also verify that `main.tsx`'s `onNeedRefresh` handler still calls `window.location.reload()` after Phase 23 deploy.
**Warning signs:** Cook Mode route 404s in Playwright but works in a fresh incognito window.

### Pitfall 7: `browser_wait_for` on ambient text during UAT (L-026)
**What goes wrong:** UAT test waits for `text: "Ready"` or `text: "Complete"` but these strings are already on the page from prior state.
**Why it happens:** The Plan page already has "Generated 1h ago" and the Recipe page may already show "Steps ready" from a previous session.
**How to avoid:** L-026 Rule — wait on transition-unique signals: `textGone` on loading state, or DB poll. For Phase 23 specifically: wait on `textGone: "Generating..."` (the RecipeEditorStepsSection state chip) NOT `text: "{N} steps"`.
**Warning signs:** UAT passes in 0ms when it should take 3+ seconds.

### Pitfall 8: Eager step regeneration firing on unrelated edits
**What goes wrong:** User edits the recipe name; Phase 23 calls `generate-recipe-steps`; credits burn for no reason.
**Why it happens:** Naive `onBlur` handler in RecipeBuilder invalidates the whole recipe.
**How to avoid:** D-27 is explicit — only INGREDIENT edits (`recipe_ingredients` mutations) trigger regeneration. Name edits (`localName` state at RecipeBuilder.tsx line ~256) and servings edits (`localServings`) MUST NOT invoke the edge function. Compare specific ingredient-list identity, not the recipe row.
**Warning signs:** `plan_generations` 24h counter climbs without user planning action; daily rate limit hit from trivial recipe tweaks.

### Pitfall 9: Snack vs Snacks slot name mismatch (L-008)
**What goes wrong:** Cook Mode opens from a Snack slot (schedule DB constraint uses singular) but the batch prep modal queries `slot_name='Snacks'` (plan grid uses plural).
**Why it happens:** `supabase/migrations/025_schedule.sql:10` enforces singular "Snack"; `DEFAULT_SLOTS` in `src/utils/mealPlan.ts` uses plural "Snacks". `generate-plan/index.ts:326` normalises.
**How to avoid:** Any Phase 23 code that crosses schedule data and plan grid data must do the same normalisation: `ss.slot_name === "Snack" ? "Snacks" : capitalize(ss.slot_name)`.
**Warning signs:** Empty snack prep session in the batch prep modal even though the AI assigned something.

### Pitfall 10: Edge function meal INSERT missing `created_by` (L-018)
**What goes wrong:** `compute-batch-prep` does the D-16 plan slot reassignment which may write to `meal_plan_slots` — if it creates new rows it must respect FKs.
**Why it happens:** The `meals` table has `created_by uuid NOT NULL`; reassignments that CREATE new meals (not just move existing meal_ids) silently roll back without it.
**How to avoid:** D-16 reassignment only MOVES an existing `meal_id` between slots — never creates a meal. Confirmed by re-reading D-16 language ("auto-reassigns the recipe to a nearby prep slot"). But any Phase 23 code that DOES insert into meals must pass `created_by: user.id` from the JWT.
**Warning signs:** Silent migration of a slot that works in local but rolls back in production.

## Code Examples

### Example 1: Fetching + subscribing to a cook session with Realtime
**Source pattern:** `src/hooks/useGroceryItems.ts:1-48`

```typescript
// src/hooks/useCookSession.ts — pattern for Section F.3
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import { useHousehold } from './useHousehold'
import type { CookSession } from '../types/database'

export function useCookSession(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  const query = useQuery({
    queryKey: queryKeys.cookSession.detail(sessionId),
    queryFn: async (): Promise<CookSession | null> => {
      const { data, error } = await supabase
        .from('cook_sessions')
        .select('*')
        .eq('id', sessionId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!sessionId && !!householdId,
  })

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`cook-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cook_sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.detail(sessionId) })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, queryClient])

  return query
}
```

### Example 2: Service-worker-backed notification dispatch
**Source pattern:** `src/main.tsx:3-18` (for the pwa-register hook) + MDN Notification API

```typescript
// src/hooks/useNotificationPermission.ts — pattern for Section G.2
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  const request = async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }

  return { permission, request }
}

// Dispatch (called from CookStepTimer when countdown reaches 0):
async function fireStepDoneNotification(mealName: string, stepText: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    // Prefer service worker so the notification fires even if the tab is hidden/closed
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(`${mealName} — step done`, {
      body: stepText,
      tag: `cook-step-${mealName}`,    // dedupe rapid firings
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      requireInteraction: false,
    })
  } catch {
    // Fallback: foreground Notification (will fail silently if tab is closed)
    new Notification(`${mealName} — step done`, { body: stepText, tag: `cook-step-${mealName}` })
  }
}
```

**Source:** MDN ServiceWorkerRegistration.showNotification [CITED: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification] — note that `showNotification` is the ONLY way to trigger a notification from a service worker context, and calling it from the page context via `navigator.serviceWorker.ready` ensures the notification is registered with the SW so it persists if the tab closes mid-countdown.

### Example 3: 30-second debounced invalidation
**Source pattern:** standard React `useEffect` + ref cleanup

```typescript
// Inside useBatchPrepSummary.ts — pattern for Section E.2
import { useEffect, useRef } from 'react'

export function useBatchPrepSummaryAutoRefresh(
  planId: string | undefined,
  isModalOpen: boolean,
  onRefresh: () => void,
) {
  const queryClient = useQueryClient()
  const timerRef = useRef<number | null>(null)

  // Watch for plan slot changes via TanStack Query cache
  useEffect(() => {
    if (!isModalOpen || !planId) return
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.query.queryKey[0] === 'meal-plan-slots' &&
        event.query.queryKey[1] === planId
      ) {
        // Reset debounce timer on every change
        if (timerRef.current) window.clearTimeout(timerRef.current)
        timerRef.current = window.setTimeout(() => {
          onRefresh()
          timerRef.current = null
        }, 30_000)
      }
    })
    return () => {
      unsub()
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [isModalOpen, planId, queryClient, onRefresh])
}
```

### Example 4: Top-level route outside AppShell
**Source pattern:** `src/App.tsx:160` (the `/offline` route is already outside `<AppShell />`)

```tsx
// src/App.tsx delta — for Section F.1
// After the AppShell layout Route block (line 157), before "Public utility routes" comment:
<Route path="/cook/:mealId" element={
  <AuthGuard>
    <CookPage />
  </AuthGuard>
} />
<Route path="/cook/session/:sessionId" element={
  <AuthGuard>
    <CookPage />
  </AuthGuard>
} />
<Route path="/cook" element={
  <AuthGuard>
    <StandaloneCookPickerPage />
  </AuthGuard>
} />
```

**Why this placement:** AuthGuard is preserved (cooking requires household) but the `<AppShell />` layout (Sidebar + TabBar) is NOT — Cook Mode is full-viewport per UI-SPEC. The existing `/offline` route at App.tsx line 160 already demonstrates top-level routes outside AppShell.

### Example 5: queryKeys.ts additions
**Source pattern:** `src/lib/queryKeys.ts:1-97` (full file verified)

```typescript
// Append to queryKeys.ts AFTER planGeneration block (after line 95):
  cookSession: {
    detail: (sessionId: string | undefined) => ['cook-session', sessionId] as const,
    list: (householdId: string | undefined) => ['cook-session', householdId, 'list'] as const,
    active: (householdId: string | undefined) => ['cook-session', householdId, 'active'] as const,
  },
  batchPrep: {
    summary: (householdId: string | undefined, planId: string | undefined) =>
      ['batch-prep', householdId, planId] as const,
  },
  recipeSteps: {
    detail: (recipeId: string | undefined) => ['recipe-steps', recipeId] as const,
  },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-scheduled `setTimeout` for background work | Service worker `showNotification()` | Permanent — mobile Safari and iOS always suspended hidden tab timers | D-25 only works with SW-dispatched notifications, not raw `new Notification()` from a hidden tab |
| `verify_jwt=true` for edge functions | `--no-verify-jwt` + in-function `adminClient.auth.getUser()` | L-025 (this project, ~Phase 22 UAT) | Hard requirement for every new Phase 23 function |
| `Notification.permission` checked once at page load | Live checked before dispatch, re-prompted with 7-day cooldown | Browser permission APIs have always worked this way; UI-SPEC formalises the cooldown | Prevents permission fatigue |

**Deprecated/outdated:**
- **`new Notification(...)` in page context** (not deprecated but unreliable on mobile) — Use `registration.showNotification(...)` from `navigator.serviceWorker.ready` instead [CITED: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification]
- **`claude-haiku-3`** — Not used; project standardises on `claude-haiku-4-5` and `claude-sonnet-4-5` (verified across 5 edge functions via grep)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Anthropic API model IDs `claude-haiku-4-5` and `claude-sonnet-4-5` are current and valid for Phase 23 | Section C.4 | [VERIFIED via grep of 5 existing edge functions — not assumed] |
| A2 | vite-plugin-pwa 1.2.0 with workbox registers a service worker that supports `showNotification()` via `navigator.serviceWorker.ready` | Section G.4 | MEDIUM — if the project's workbox config doesn't register the SW in the standard way, notifications won't fire. Mitigation: test in Phase 23 Wave 0 before building Cook Mode (verification test V-04) |
| A3 | Supabase Realtime `postgres_changes` filter syntax `id=eq.${sessionId}` works identically to grocery pattern for a new `cook_sessions` table | Section F.3 | LOW — verified pattern from useGroceryItems.ts works against grocery_items; Supabase Realtime syntax is table-agnostic |
| A4 | `@dnd-kit/sortable` ^10.0.0 (already installed for Phase 19) is sufficient for the RecipeEditorStepsSection without adding new packages | Section H.1 | LOW — confirmed in package.json and in use |
| A5 | Cook Mode offline-after-first-view works because TanStack Query persists `recipes.instructions` in its cache and mutation queue handles check-offs | Section K.4 | MEDIUM — TanStack Query persistence to localStorage is NOT currently configured [VERIFIED: queryClient in App.tsx:28 has no persistence plugin]. If offline Cook Mode is needed, add `@tanstack/react-query-persist-client` — or accept that offline Cook Mode only works within the current tab session |
| A6 | The Phase 22 per-household 24h rate limit of 10 can absorb Phase 23's expected AI call volume without user-facing rate limit errors in normal usage | Section J.1 | MEDIUM — a household editing 5 recipes per day (5 calls to generate-recipe-steps) + 1 plan generation + 3 batch prep recomputes is about 9 calls/day. Very close to limit. Recommend raising cap to 20/day OR separating counters if UAT shows user pain |
| A7 | `cook_sessions.step_state` JSONB is sufficient — no normalized `cook_session_steps` table needed | Section A.2 | LOW — matches `plan_generations.constraint_snapshot` precedent and Supabase Realtime row-level events; JSONB tree-updates are atomic from the client's perspective |
| A8 | AI can reliably produce the rich-step JSON schema defined in Section B.1 from just recipe name + ingredients | Section D.1 | MEDIUM — no prior art in this project. Mitigation: strict system prompt with example output + server-side JSON schema validation + fallback to displaying `notes` text if parsing fails |
| A9 | The "2 cups rice cooked once for 3 meals" shared-ingredient callout (UI-SPEC Copywriting) can be reliably generated by the AI from the plan + recipe ingredients | Section D.4 | LOW — this is string formatting; AI handles it easily with the prompt schema |
| A10 | `navigator.serviceWorker.ready` returns a registration that can call `showNotification` on iOS Safari PWA (installed to home screen) | Section G.2 | HIGH — iOS Safari's Notification support landed in iOS 16.4 but only for installed PWAs. This IS where NourishPlan runs but needs UAT verification on iOS. If iOS Safari doesn't support it reliably, the foreground-only fallback `new Notification()` degrades gracefully |

**The planner should treat A6 and A10 as decisions needing user confirmation** before implementation begins. A2 and A8 should be verified in Phase 23 Wave 0 with a smoke test before dependent tasks run.

## Open Questions

1. **Should the Phase 22 shared rate limit be raised to 20/day for Phase 23 coexistence?**
   - What we know: Phase 22 cap is 10/24h based on `plan_generations` count [VERIFIED: generate-plan/index.ts:159]
   - What's unclear: Whether Phase 23 edge function calls write into the same `plan_generations` table or a new counter
   - Recommendation: **Extend `plan_generations` with a `kind text` column** (values: `plan`, `steps`, `batch_prep`, `cook_sequence`, `reheat`, `freezer_classify`) so one counter covers all AI calls per D-29, and raise the cap to 20/day in a Phase 23 migration change. User confirmation needed in discuss-phase before execution.

2. **Does the `/cook` standalone picker show recipes from ALL households the user has, or only the current one?**
   - What we know: UI-SPEC line 345 says "Pick a recipe to cook without a plan slot" — does not specify scope
   - What's unclear: Users belong to one household per `useHousehold()` (verified), so the question is academic — scope is the current household
   - Recommendation: Scope `/cook` recipe picker to the current household only. Matches the RecipesPage scope.

3. **What happens to an in-progress cook session when the recipe's ingredients change mid-cook?**
   - What we know: D-27 says ingredient changes invalidate steps and trigger regeneration. D-22 says sessions persist in `cook_sessions`
   - What's unclear: If Partner A is cooking step 3 of "Lentil Soup" on their phone and Partner B edits the Lentil Soup ingredients on their laptop, what does Partner A see?
   - Recommendation: Snapshot the `instructions` into `cook_sessions.step_state.steps` at session start, so the cook session is immutable to recipe edits. The NEXT cook session uses the new steps. Add a banner on Partner A's screen: "Recipe was edited. Changes take effect next cook." User confirmation needed.

4. **For the D-16 auto-reassignment, what's "nearby"?**
   - What we know: "AI auto-reassigns the recipe to a nearby prep slot (writes back to the plan)"
   - What's unclear: How close is "nearby"? Same day? Within 48 hours? Any prep slot in the week?
   - Recommendation: Let the AI decide per-plan with an explicit prompt instruction: "Pick the nearest preceding prep slot in the week that has capacity. If none exists, pick the nearest following prep slot." This matches the D-15 "AI chooses the grouping strategy" spirit.

5. **Can two members edit recipe steps simultaneously?**
   - What we know: The D-24 realtime subscription is on `cook_sessions`, not `recipes`. RecipeBuilder does not mention realtime.
   - What's unclear: Last-write-wins on `recipes.instructions` is the default Postgres behavior; is that acceptable?
   - Recommendation: Last-write-wins is consistent with the existing recipe editor (name/notes/ingredients already use last-write-wins). Document this in the plan but no new mechanism needed. Consistent with `.planning/REQUIREMENTS.md` "Out of Scope: Real-time collaborative editing".

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite build | OK | Confirmed by existing build working | — |
| npm | Package install | OK | — | — |
| Supabase CLI (`npx supabase`) | Deploy migrations and edge functions | OK | Used in CLAUDE.md build commands | — |
| `SUPABASE_ACCESS_TOKEN` | Deploy migrations (per L-017: stored in `.env.local`) | OK | Project-configured | — |
| `ANTHROPIC_API_KEY` (Supabase secret) | All 4 Phase 23 edge functions | OK | Already set for Phase 20/22 functions | — |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase secret) | Edge functions | OK | Already set | — |
| `@dnd-kit/sortable` | RecipeEditorStepsSection | OK | ^10.0.0 | — |
| `vite-plugin-pwa` | Service worker + notifications | OK | ^1.2.0 | — |
| `@tanstack/react-query` persistence plugin | Cook Mode offline (A5) | MISSING | — | Accept no-offline-after-close; or add `@tanstack/react-query-persist-client` in Wave 0 |
| Browser Notification API | D-25 passive timer notifications | OK (modern browsers, iOS 16.4+ PWAs) | — | Visual countdown only when denied/unsupported |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `@tanstack/react-query-persist-client` (only if full offline Cook Mode is a Wave 0 goal; otherwise omit).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 [VERIFIED: package.json] |
| Config file | None standalone — uses defaults; setup file at `tests/setup.ts` (referenced by Phase 1 `window.matchMedia` mock) |
| Quick run command | `npx vitest run <file>` (from CLAUDE.md) |
| Full suite command | `npx vitest run` (from CLAUDE.md, `"test": "vitest run --reporter=verbose"`) |
| Pre-run cleanup | `for d in .claude/worktrees/agent-*; do git worktree remove "$d" --force 2>/dev/null; done` per L-001 |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREP-01 | User sees batch prep suggestions when modal opens | unit + integration | `npx vitest run src/components/plan/BatchPrepModal.test.tsx` | MISSING — Wave 0 |
| PREP-01 | 30s debounce reset on rapid plan changes | unit | `npx vitest run src/hooks/useBatchPrepSummary.test.ts` | MISSING — Wave 0 |
| PREP-01 | D-16 auto-reassignment writes back to plan slots | integration | `npx vitest run supabase/functions/compute-batch-prep/index.test.ts` | MISSING — Wave 0 |
| PREP-02 | Cook Mode renders steps in order from `recipes.instructions` | integration | `npx vitest run src/components/cook/CookModeShell.test.tsx` | MISSING — Wave 0 |
| PREP-02 | Step check-off invalidates realtime query and advances | unit | `npx vitest run src/hooks/useCookSession.test.ts` | MISSING — Wave 0 |
| PREP-02 | Timer countdown fires notification at 0 seconds | unit + manual | `npx vitest run src/components/cook/CookStepTimer.test.tsx` + Playwright visual verification | MISSING — Wave 0 |
| PREP-02 | Multi-meal prompt shown for prep slot with >1 recipe | integration | `npx vitest run src/pages/CookPage.test.tsx` | MISSING — Wave 0 |
| PREP-03 | Freezer badge renders on recipe card when `freezer_friendly=true` | unit | `npx vitest run src/components/plan/FreezerBadge.test.tsx` | MISSING — Wave 0 |
| PREP-03 | Freezer badge renders on SlotCard | unit | `npx vitest run src/components/plan/SlotCard.test.tsx` (EXTEND existing tests) | PARTIAL — Extend existing |
| PREP-03 | Freezer badge renders on batch prep modal session card | unit | `npx vitest run src/components/plan/BatchPrepSessionCard.test.tsx` | MISSING — Wave 0 |
| PREP-03 | `recipes.freezer_friendly = NULL` shows NO badge | unit | Same as above (null state assertion) | MISSING — Wave 0 |
| ALL | Sidebar/MobileDrawer nav count remains exactly 10 | smoke | `npx vitest run tests/AppShell.test.tsx` | OK — Exists, must still pass |
| ALL | queryKeys.ts exports cookSession, batchPrep, recipeSteps | smoke | grep assertion + TypeScript build | `npx tsc -b` |
| ALL | Migration 029 applies without error | integration | `SUPABASE_ACCESS_TOKEN=... npx supabase db push --dry-run` | Manual command |

### Sampling Rate
- **Per task commit:** `npx vitest run <file_under_test>`
- **Per wave merge:** `npx vitest run src/hooks src/components/cook src/components/plan tests/AppShell.test.tsx` + `npx tsc -b`
- **Phase gate:** `npx vitest run` (full suite green) + `npx supabase db push --dry-run` + Playwright UAT on `/cook/:mealId` + `/plan` batch prep modal + `/recipes/:id` cook CTA

### Wave 0 Gaps
- [ ] `src/hooks/useCookSession.test.ts` — realtime subscription teardown + optimistic updates
- [ ] `src/hooks/useBatchPrepSummary.test.ts` — 30s debounce, stale indicator, rapid-reset behavior
- [ ] `src/hooks/useRecipeSteps.test.ts` — fetch, update, regenerate-on-ingredient-change
- [ ] `src/hooks/useNotificationPermission.test.ts` — permission state transitions, localStorage cooldown
- [ ] `src/components/cook/CookModeShell.test.tsx` — route mount, step rendering, progress bar
- [ ] `src/components/cook/CookStepTimer.test.tsx` — countdown logic, warning state, completion trigger
- [ ] `src/components/plan/BatchPrepModal.test.tsx` — open/close, empty state, stale indicator
- [ ] `src/components/plan/BatchPrepSessionCard.test.tsx` — renders session data + freezer badges
- [ ] `src/components/plan/FreezerBadge.test.tsx` — all four placement variants
- [ ] `src/components/recipe/RecipeStepsSection.test.tsx` — drag reorder, edit, add, delete, regenerate
- [ ] `supabase/functions/generate-recipe-steps/index.test.ts` (optional — deno test)
- [ ] `supabase/functions/compute-batch-prep/index.test.ts` (optional — deno test)
- [ ] Extend `tests/AppShell.test.tsx` — confirm nav count stays 10 after Phase 23
- [ ] Extend `src/components/plan/SlotCard.test.tsx` — new Cook button + freezer badge icon render paths

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth — ES256 JWTs validated inside each edge function via `adminClient.auth.getUser(token)` (L-025) |
| V3 Session Management | yes | Supabase session cookies; `cook_sessions` table is not a session store, it's domain state |
| V4 Access Control | yes | Postgres RLS on every new table + `get_user_household_id()` helper (verified 002_fix_household_members_rls.sql:9-20). Every cook_sessions row carries `household_id`. |
| V5 Input Validation | yes | Hand-rolled TS type guards for rich-step JSON; edge function JSON.parse wrapped in try/catch (existing pattern in generate-plan/index.ts:479). D-04 merge-intent step objects validated against schema before write. |
| V6 Cryptography | yes | No new cryptography — Supabase handles transport (HTTPS) and at-rest encryption |
| V7 Error Handling | yes | Edge functions return 200 with `{success:false, error}` (existing pattern); client shows toasts per UI-SPEC Copywriting lines 581–585 |
| V11 Business Logic | yes | Rate limiting (shared Phase 22 counter); idempotency on D-16 plan slot reassignment (must not double-move on retry) |
| V12 Files and Resources | n/a | No file uploads in Phase 23 |
| V13 API and Web Service | yes | Edge function CORS headers (existing pattern); Anthropic API key server-side only |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User A impersonating user B's household via forged `householdId` in edge function body | Spoofing | Edge function ALWAYS extracts JWT from Authorization header, calls `adminClient.auth.getUser(token)`, then verifies `household_members` row matches `req.body.householdId` — existing pattern in generate-plan/index.ts:137-149 |
| User forging a cook_sessions row for another household | Spoofing / Tampering | RLS `household_id = get_user_household_id()` on insert WITH CHECK — policy structure verified from 025_schedule.sql |
| AI prompt injection via user-edited step text or recipe name | Tampering / Info Disclosure | Sanitize step text and recipe names (`sanitizeString` pattern at generate-plan/index.ts:86: `return s.replace(/[\x00-\x1F\x7F]/g, "");`) before including in Claude prompts. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY` in prompts or responses |
| JSON injection via AI-returned malformed JSON | Tampering | Robust regex match `/\{[\s\S]*\}/` + try/catch around `JSON.parse` + schema validation (existing generate-plan/index.ts:477-499) |
| Excessive AI calls draining API credits | DoS | Phase 22 shared rate limit 10/24h (D-29) + client-side 30s debounce (D-28) |
| Notification-spam via malicious plan edits | Repudiation | Tag-based dedupe (`tag: \`cook-step-\${mealName}\``) in `showNotification()` call — prevents rapid re-firings |
| XSS via step text rendering | Info Disclosure | React default-escapes text content; render step text as plain string children (`{step.text}`). Do not use unsafe HTML injection props for any AI-generated or user-edited content in Phase 23. |
| Timing attack revealing cook session existence across households | Info Disclosure | RLS returns 0 rows for unauthorized queries (Postgres RLS default behavior) — no timing leak |
| Rate limit bypass by swapping `householdId` across two households user belongs to | Business Logic | Not applicable — user belongs to exactly one household (`useHousehold` returns single row) |

## Sources

### Primary (HIGH confidence — verified in this session via Read/Grep)
- `C:/Claude/nourishplan/.planning/phases/23-prep-optimisation/23-CONTEXT.md` — all 30 locked decisions (D-01 through D-30)
- `C:/Claude/nourishplan/.planning/phases/23-prep-optimisation/23-UI-SPEC.md` lines 1–708 — full approved UI design contract
- `C:/Claude/nourishplan/.planning/REQUIREMENTS.md` lines 174–176 — PREP-01/02/03 verbatim
- `C:/Claude/nourishplan/.planning/STATE.md` lines 258–267 — v2.0 decisions
- `C:/Claude/nourishplan/.planning/ROADMAP.md` lines 441–450 — Phase 23 section
- `C:/Claude/nourishplan/CLAUDE.md` + `.claude/rules/*.md` — project constraints
- `C:/Claude/nourishplan/lessons.md` lines 1–215 — L-001 through L-027 full text
- `C:/Claude/nourishplan/package.json` — dependency versions
- `C:/Claude/nourishplan/src/types/database.ts` lines 1–543 — full database type exports including Recipe interface (lines 65–75) and StorageLocation enum (line 488)
- `C:/Claude/nourishplan/src/lib/queryKeys.ts` lines 1–97 — full queryKeys structure
- `C:/Claude/nourishplan/src/hooks/useMealPlan.ts` lines 1–193 — mutation patterns
- `C:/Claude/nourishplan/src/hooks/useFoodPrices.ts` lines 1–92 — hook pattern
- `C:/Claude/nourishplan/src/hooks/useGroceryItems.ts` lines 1–49 — Supabase Realtime pattern
- `C:/Claude/nourishplan/src/utils/schedule.ts` lines 1–25 — SLOT_NAMES singular "Snack"
- `C:/Claude/nourishplan/src/components/plan/SlotCard.tsx` lines 1–250 — icon row structure (lines 134–203), SlotWithMeal type, tap handlers
- `C:/Claude/nourishplan/src/components/plan/PlanGrid.tsx` lines 1–430 — MealPicker modal (lines 49–81), generate plan wiring
- `C:/Claude/nourishplan/src/components/layout/Sidebar.tsx` lines 1–63 — 10 nav items
- `C:/Claude/nourishplan/tests/AppShell.test.tsx` lines 1–80 — "Sidebar renders 10 navigation items" assertion
- `C:/Claude/nourishplan/src/App.tsx` lines 1–191 — routing structure including `/offline` as top-level route outside AppShell (line 160)
- `C:/Claude/nourishplan/src/main.tsx` lines 1–25 — `virtual:pwa-register` + `registerSW({ immediate: true })` usage
- `C:/Claude/nourishplan/vite.config.ts` lines 1–45 — VitePWA + workbox config
- `C:/Claude/nourishplan/supabase/functions/generate-plan/index.ts` lines 1–500 — canonical edge function shell including rate limit (151–164), JWT validation (120–149), wall clock budget (188–197), Claude API call pattern (370–420), JSON parsing (477–499)
- `C:/Claude/nourishplan/supabase/functions/analyze-ratings/index.ts` lines 1–80 — simpler edge function pattern
- `C:/Claude/nourishplan/supabase/functions/classify-restrictions/index.ts` lines 1–150 — AI classification pattern
- `C:/Claude/nourishplan/supabase/migrations/002_fix_household_members_rls.sql` lines 9–20 — `get_user_household_id()` definition
- `C:/Claude/nourishplan/supabase/migrations/022_grocery_list.sql` lines 72–73 — `alter publication supabase_realtime add table` pattern
- `C:/Claude/nourishplan/supabase/migrations/024_feedback_dietary.sql` lines 1–100 — per-member XOR constraint pattern
- `C:/Claude/nourishplan/supabase/migrations/025_schedule.sql` lines 1–103 — schedule table RLS policy template
- `C:/Claude/nourishplan/supabase/migrations/026_plan_generations.sql` lines 1–25 — async job pattern
- `C:/Claude/nourishplan/.planning/config.json` — `nyquist_validation: true`, `commit_docs: true`
- `C:/Claude/nourishplan/.planning/phases/21-schedule-model/21-CONTEXT.md` — ScheduleStatus dependency
- `C:/Claude/nourishplan/.planning/phases/22-constraint-based-planning-engine/22-CONTEXT.md` — AI-first pattern, per-household rate limit context, 2-stage generation

### Secondary (MEDIUM confidence — project knowledge)
- `src/components/recipe/RecipeBuilder.tsx` — Steps section insertion point near the existing notes textarea (verified lines 640–700)
- `src/utils/mealPlan.ts` — `DEFAULT_SLOTS` plural "Snacks" (referenced from Pitfall 9)

### Tertiary (LOW confidence — requires Wave 0 validation)
- iOS Safari 16.4+ PWA Notification API support (A10) — needs UAT verification on actual iOS device
- `navigator.serviceWorker.ready` reliability inside a vite-plugin-pwa workbox SW (A2) — needs smoke test

### External documentation
- MDN: Notification.requestPermission() [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static]
- MDN: ServiceWorkerRegistration.showNotification() [CITED: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification]
- Anthropic API: Messages endpoint [CITED: https://docs.anthropic.com/en/api/messages] — model IDs `claude-haiku-4-5`, `claude-sonnet-4-5` [VERIFIED via existing edge function usage]
- Supabase Realtime: Postgres Changes [CITED: https://supabase.com/docs/guides/realtime/postgres-changes] — used by existing grocery list pattern [VERIFIED]

---

## Section-by-Section Answers to Research Questions

### A. Supabase schema additions

**A.1 — Migration 029 SQL for recipes columns:**
```sql
-- supabase/migrations/029_prep_optimisation.sql
-- Add rich-step instructions and freezer metadata to recipes (Phase 23)

alter table public.recipes
  add column if not exists instructions jsonb,
  add column if not exists freezer_friendly boolean,
  add column if not exists freezer_shelf_life_weeks integer;

-- Index the freezer_friendly flag for the batch prep modal filtering
-- (plan generation and batch prep modal both select recipes WHERE freezer_friendly = true)
create index if not exists recipes_freezer_friendly_idx
  on public.recipes (household_id, freezer_friendly)
  where freezer_friendly = true;
```
**Existing column conventions:** `Recipe` interface (database.ts:65-75) uses `id`, `household_id` (not null), `created_by` (not null), `name` (not null), `servings` (not null integer), `notes` (nullable text), `deleted_at` (nullable timestamptz), `created_at` / `updated_at`. All new columns are nullable with no check constraints, matching the `notes` precedent and D-02 ("Both nullable — null means not yet classified").

**A.2 — `cook_sessions` table:**
```sql
create table public.cook_sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  started_by uuid not null references auth.users(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete set null,                -- nullable for ad-hoc /cook/:recipeId entries
  recipe_id uuid references public.recipes(id) on delete set null,            -- for ad-hoc cook (D-20b)
  batch_prep_session_key text,                                                -- groups multi-meal sessions; nullable
  recipe_ids uuid[] not null default '{}',                                    -- all recipes in this session (1 for single, N for multi-meal)
  step_state jsonb not null default '{}'::jsonb,                              -- see shape below
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- step_state shape:
-- {
--   "steps": [
--     { "idx": 0, "recipe_id": "...", "completed_at": null, "completed_by": null, "timer_started_at": null, "owner_member_id": null }
--   ],
--   "mode": "combined" | "per-recipe"
-- }

alter table public.cook_sessions enable row level security;

create policy "household members read cook_sessions"
  on public.cook_sessions for select to authenticated
  using (household_id = get_user_household_id());

create policy "household members insert cook_sessions"
  on public.cook_sessions for insert to authenticated
  with check (household_id = get_user_household_id());

create policy "household members update cook_sessions"
  on public.cook_sessions for update to authenticated
  using (household_id = get_user_household_id());

create policy "household members delete cook_sessions"
  on public.cook_sessions for delete to authenticated
  using (household_id = get_user_household_id());

-- Realtime
alter publication supabase_realtime add table public.cook_sessions;

-- updated_at trigger (existing helper from foundation migration)
create trigger set_cook_sessions_updated_at
  before update on public.cook_sessions
  for each row execute function set_updated_at();
```

**A.3 — Realtime publication:** `alter publication supabase_realtime add table public.cook_sessions;` — verified from `022_grocery_list.sql:73`.

**A.4 — Indexes needed:**
```sql
-- Active session lookup by household + meal (used by "resume latest active session")
create index cook_sessions_active_idx
  on public.cook_sessions (household_id, meal_id, status)
  where status = 'in_progress';

-- Per-user standalone session picker (the /cook resume-in-progress section, UI-SPEC line 344)
create index cook_sessions_started_by_idx
  on public.cook_sessions (started_by, status)
  where status = 'in_progress';

-- Household scan for realtime filter (household_id already indexed by RLS pattern; no extra needed)
```

### B. Rich step object schema

**B.1 — Exact TypeScript type:**
```typescript
// Append to src/types/database.ts — insertion point: after line 75 (end of Recipe interface)
export interface RecipeStep {
  text: string                                   // instruction text — "Roast the vegetables until golden"
  duration_minutes: number                       // estimated time for this step (0 if instantaneous)
  is_active: boolean                             // true = hands-on (chopping, stirring); false = passive wait (rice simmering)
  ingredients_used: string[]                     // free-text ingredient names from recipe_ingredients.ingredient_name
  equipment: string[]                            // AI-detected equipment — "oven", "large pot", "cutting board"
}

export interface Recipe {
  id: string
  household_id: string
  created_by: string
  name: string
  servings: number
  notes: string | null
  instructions: RecipeStep[] | null                   // NEW — null until AI generates (D-01)
  freezer_friendly: boolean | null                    // NEW — null until classified (D-02, D-09)
  freezer_shelf_life_weeks: number | null             // NEW — null until classified (D-02)
  deleted_at: string | null
  created_at: string
  updated_at: string
}
```

**Why `ingredients_used: string[]` uses free-text names, not `recipe_ingredients.id`:**
- `recipe_ingredients.ingredient_name` is already the canonical display field (verified `src/types/database.ts:85` — it's a nullable snapshot column on RecipeIngredient)
- The recipe editor shows ingredient names, not IDs (verified `RecipeBuilder.tsx` ingredient rendering uses `ingredient_name`)
- AI prompts work better with semantic names than opaque UUIDs
- It matches the `food_logs.item_name` snapshot pattern already used in the project (database.ts:197)

**B.3 — Zod:** The project has NO zod dependency [VERIFIED: `grep -l zod package.json` returns no matches; full package.json dependencies list contains no `zod`]. Use hand-rolled TS type guard matching the `food_logs` snapshot validation approach:
```typescript
// src/utils/recipeSteps.ts
export function isValidRecipeStep(v: unknown): v is RecipeStep {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.text === 'string' &&
    typeof s.duration_minutes === 'number' &&
    typeof s.is_active === 'boolean' &&
    Array.isArray(s.ingredients_used) && s.ingredients_used.every(x => typeof x === 'string') &&
    Array.isArray(s.equipment) && s.equipment.every(x => typeof x === 'string')
  )
}
export function parseStepsSafely(raw: unknown): RecipeStep[] | null {
  if (!Array.isArray(raw)) return null
  if (!raw.every(isValidRecipeStep)) return null
  return raw as RecipeStep[]
}
```

### C. AI edge function architecture (single vs split)

**C.1 — Comparison of approaches:**
| Approach | Cold start | Deploy complexity | Rate limit sharing | Logging clarity |
|----------|-----------|-------------------|--------------------|-----------------|
| One omnibus `prep-optimise` | 1 function x ~300ms | Low (1 deploy) | Trivial | Poor — one log stream for 5 responsibilities |
| 5 separate functions (steps, classify-freezer, batch-prep, multi-meal-sequence, reheat-sequence) | 5 x ~300ms (but only cold once per hour) | Higher (5 deploys) | Complex (share counter via table) | Excellent |
| **4 functions (recommended)** | **4 x ~300ms** | **Medium (4 deploys)** | **Simple via plan_generations counter** | **Good** |

**C.2 — Recommendation: 4 edge functions**
1. **`generate-recipe-steps`** — Hot path on recipe save. Input: `{ recipeId, householdId, ingredientsSnapshot, existingSteps? }`. Output: `{ success, instructions: RecipeStep[], freezer_friendly: boolean, freezer_shelf_life_weeks: number }`. **Combines step generation AND freezer classification in ONE Claude call** to halve credit cost — both are derivable from the same context (name + ingredients). Uses Haiku.
2. **`compute-batch-prep`** — Input: `{ planId, householdId, weekStart, slots, recipes }`. Output: `{ success, sessions: BatchPrepSession[], reassignments: {slot_id, new_day_index, new_slot_name}[] }`. Handles D-16 (plan slot reassignment) internally via direct DB writes with the admin client. Uses Sonnet for quality (complex constraint satisfaction across the week).
3. **`generate-cook-sequence`** — Input: `{ cookSessionId, householdId, recipeIds, mode: 'combined' | 'per-recipe', memberIds }`. Output: `{ success, sequence: CookSessionStep[] }` where each step has `{ stepIdx, recipeId, ownerMemberId, ...RecipeStep }`. Handles both single-recipe flat render AND multi-meal interleaved longest-first. Uses Sonnet when memberCount > 1 or recipes > 1 (complexity justifies); Haiku for single-recipe single-member (just copies instructions verbatim from the recipe into a cook_session).
4. **`generate-reheat-sequence`** — Input: `{ recipeId, householdId, storageHint: 'fridge' | 'freezer' }`. Output: `{ success, steps: RecipeStep[] }` with 2–3 short steps. Uses Haiku — simple short task.

**Why NOT a separate `classify-freezer` function:** D-09 says "AI auto-suggests the freezer_friendly flag + shelf-life weeks on recipe save (same edge function trip as step generation, or a sibling call)". Combining into `generate-recipe-steps` saves one Claude call per recipe save and one cold start.

**C.3 — Shared shell:** Already captured in Pattern 1 above. Every function:
1. CORS OPTIONS early return
2. JSON body parse
3. `ANTHROPIC_API_KEY` check
4. adminClient create with SERVICE_ROLE_KEY
5. JWT extraction + `adminClient.auth.getUser(token)`
6. household_members membership check
7. Rate limit check against `plan_generations` count (D-29)
8. Create job row (optional — only `compute-batch-prep` needs async tracking; `generate-recipe-steps` runs synchronously since it's on the hot path of recipe save)
9. Claude API call
10. Regex + JSON.parse with try/catch
11. DB write
12. Response

**C.4 — Model selection per call:**
| Function | Model | Justification |
|----------|-------|---------------|
| `generate-recipe-steps` | **Haiku** (`claude-haiku-4-5`) | Single recipe, well-scoped input (name + ingredients), simple JSON output. Generate-plan uses Haiku for the similar-complexity shortlist pass. Eager on save means users wait for it — speed matters. |
| `compute-batch-prep` | **Sonnet** (`claude-sonnet-4-5`) when plan has >4 recipes; Haiku otherwise | Hard cross-week constraint satisfaction (shared ingredients, equipment conflicts, storage hints, slot reassignments). Matches generate-plan's member-count threshold (generate-plan/index.ts:435) |
| `generate-cook-sequence` | **Sonnet** when `recipeIds.length > 1` OR `memberIds.length > 1`; **Haiku** for single-recipe-single-member | Multi-meal interleaving is complex; single-recipe is near-copy |
| `generate-reheat-sequence` | **Haiku** | 2–3 steps. Trivial. |

### D. AI prompt design

**D.1 — Step generation system prompt:**
```
You are a cooking instructions generator. Given a recipe name, ingredient list, and servings,
produce a complete step-by-step cooking sequence as a JSON array.

Each step is an object with these exact fields (all required, no extra fields):
- text: string — single imperative sentence describing the action
- duration_minutes: number — estimate of time for this step in whole minutes (0 for instantaneous)
- is_active: boolean — true if hands-on work (chopping, stirring, assembling); false if passive waiting (oven baking, simmering, proofing, marinating)
- ingredients_used: string[] — names of ingredients this step consumes, copied verbatim from the input ingredient list
- equipment: string[] — equipment this step uses (e.g., "oven", "large pot", "cutting board", "blender")

Rules:
1. Return a JSON array only — no prose, no markdown fences, no comments
2. Steps must be ordered chronologically from mise en place to plating
3. is_active=false only when the cook genuinely walks away from the stove — use for preheat, bake, rise, rest
4. Use common equipment names; do not invent brand names
5. Estimate duration_minutes conservatively; a "chop an onion" step is 2 minutes, not 0
6. If the input includes a notes field with freeform text, parse existing instructions from it and rephrase into the standard shape — preserve the cook's intent and any custom ingredients they mention
7. Total duration_minutes across all steps should roughly match typical cook time for the recipe

Also return a freezer classification in the same response:
{
  "instructions": [...array of step objects...],
  "freezer_friendly": true | false,
  "freezer_shelf_life_weeks": number (1-52, only if freezer_friendly=true, else null),
  "freezer_reasoning": string (one sentence — audit trail)
}

Output ONLY the JSON object — no other text.
```

**User prompt shape:** `JSON.stringify({ recipe_name, ingredients: RecipeIngredient[], servings, notes? })`.

**Claude best practices applied:** (1) Explicit JSON-only output prevents prose-wrapping. (2) Field enumeration with types prevents hallucinated fields. (3) Explicit "no markdown fences" prevents the common ```json wrapper. (4) Combined step+freezer output in one call halves token usage. [CITED: https://docs.anthropic.com/en/api/messages — model default behavior]

**D.2 — Merge-intent regeneration prompt:**
```
You are regenerating cooking steps for a recipe whose ingredients just changed.

You receive:
- The updated ingredient list
- The previous step sequence that includes user edits (text changes, custom additions, reorderings)

Your task:
1. Produce a new step sequence that reflects the updated ingredients
2. PRESERVE user intent from the previous steps — rephrase where needed but never silently drop a user addition
3. For each previous step, decide: kept (unchanged), rephrased (same meaning, new wording), changed (ingredient swap), or removed (ingredient no longer in recipe)
4. If a user added a custom note (e.g., "do not salt the beans") and the updated ingredients no longer include that ingredient, flag it as UNCERTAIN — DO NOT silently remove

Return this exact JSON shape:
{
  "instructions": [...new steps...],
  "freezer_friendly": ...,
  "freezer_shelf_life_weeks": ...,
  "uncertain_user_additions": [
    { "previous_step_text": "do not salt the beans", "reason": "ingredient removed", "suggested_action": "remove" | "keep_as_note" }
  ]
}

If no uncertain items, return an empty array.
```

**UX on uncertain items:** UI-SPEC line 366 specifies the inline amber callout: `"Your note '{user text}' might conflict with step {N}. Keep it?"` with "Keep my note" / "Remove" buttons. The `uncertain_user_additions` array drives these callouts directly.

**D.3 — Freezer classification (combined with step generation in `generate-recipe-steps` per C.2):**
Already embedded in D.1 prompt. Signals the AI should use:
- Dairy content (creamy soups freeze poorly)
- Fresh greens (salads do not freeze)
- Cooked grains (rice, pasta, quinoa freeze well)
- Cooked legumes (beans, lentils freeze excellently)
- Raw vegetables (do not freeze as-is)
- Sauces and stews (freeze excellently, 3–6 months)
- Fried foods (lose texture, do not recommend)
- Breaded items (freeze well before cooking)
- Baked goods (variable — quickbreads yes, delicate pastries no)

**D.4 — Batch prep prompt:**
```
You are a batch prep planner for a household's weekly meal plan.

Input:
{
  weekStart: "YYYY-MM-DD",
  slots: [{ day_index, slot_name, meal_id, recipe_id, schedule_status: 'prep'|'consume'|'quick'|'away' }],
  recipes: [{ id, name, instructions: [...], freezer_friendly, freezer_shelf_life_weeks, ingredients: [{name, quantity_grams}] }]
}

Task: Produce an optimal batch prep schedule for the week.

Rules:
1. Identify shared ingredients across recipes — group recipes that share significant ingredients (e.g., 2+ cups of the same grain)
2. Identify shared equipment — group recipes that use the same oven/pot at compatible temperatures
3. Prefer cooking large batches of base ingredients (rice, beans, roasted vegetables) ONCE for multiple meals
4. For each recipe, decide storage: "fridge" if consumed within 3 days of the prep session; "freezer" if consumed later AND the recipe is freezer_friendly=true; otherwise "fridge" with a shorter shelf-life note
5. D-16: If a consume slot has no preceding prep session in the week, find the nearest prep slot (prefer preceding, fall back to following) and reassign the recipe. Include the reassignment in `reassignments[]`
6. Respect freezer_shelf_life_weeks — never recommend freezing a recipe longer than its shelf life

Return:
{
  "sessions": [
    {
      "session_id": "uuid-or-generated-key",
      "label": "Sunday afternoon — shared rice & beans",
      "day_index": 0,
      "slot_name": "Lunch",
      "recipe_ids": [...],
      "total_prep_minutes": 35,
      "shared_ingredients_callout": "2 cups rice cooked once for 3 meals" | null,
      "equipment_callout": "Uses the large pot for all three" | null,
      "storage_hints": [
        { "recipe_id": "...", "storage": "fridge" | "freezer", "shelf_life_days": 3 | null }
      ]
    }
  ],
  "reassignments": [
    { "slot_id": "...", "new_day_index": 0, "new_slot_name": "Lunch", "reason": "Moved to shared cooking session" }
  ],
  "total_time_minutes": 90
}
```

**D.5 — Multi-meal sequence prompt (`generate-cook-sequence` when `recipeIds.length > 1`):**
```
You are a cooking sequence planner for a cook who is preparing multiple recipes in one session.

Input:
{
  recipes: [{ id, name, instructions: [...rich steps with duration, is_active, equipment...] }],
  members: [{ id, name }],                       // 1 or 2 members cooking together
  mode: "combined" | "per-recipe"
}

Task: Produce an interleaved cooking sequence.

Rules:
1. Start the longest-duration steps first (longest-first scheduling) — maximise parallelism
2. Overlap passive steps (is_active=false) with active steps from other recipes
3. Detect equipment conflicts — if two recipes need the oven at different temperatures, schedule them serially and add a "transition" note
4. If mode="combined": produce ONE flat sequence with interleaved steps from all recipes
5. If mode="per-recipe": produce N sequences, one per recipe, each in its original order
6. If members.length == 2: assign each step to a member, balancing active-work load
7. Each step retains its original recipe_id so the UI can show which dish the step belongs to

Return:
{
  "sequence": [
    {
      "idx": 0,
      "recipe_id": "...",
      "text": "...",
      "duration_minutes": ...,
      "is_active": ...,
      "ingredients_used": [...],
      "equipment": [...],
      "owner_member_id": "member-uuid" | null
    }
  ],
  "equipment_conflicts": ["Oven needed at 350F and 425F — scheduled serially"],
  "total_duration_minutes": ...
}
```

**D.6 — Reheat sequence prompt (`generate-reheat-sequence`):**
```
You are a reheating instructions generator.

Input:
{
  recipe_name: "Lentil Soup",
  storage: "fridge" | "freezer",
  servings: 4
}

Task: Produce 2–3 short reheat steps.

Rules:
1. For freezer storage: first step is usually "thaw overnight in fridge" OR "microwave defrost 5 min"
2. For fridge storage: skip thawing
3. Final step is always "serve" or similar
4. Use safe internal temperatures where relevant (poultry 165F, other 145F)

Return:
{
  "steps": [
    { "text": "Thaw overnight in the fridge", "duration_minutes": 480, "is_active": false, "ingredients_used": [], "equipment": ["fridge"] },
    { "text": "Reheat in a covered pot over medium heat, 10-15 minutes", "duration_minutes": 12, "is_active": true, "ingredients_used": [], "equipment": ["stovetop", "pot"] },
    { "text": "Serve hot", "duration_minutes": 0, "is_active": true, "ingredients_used": [], "equipment": [] }
  ]
}
```

### E. Batch prep summary modal

**E.1 — Button placement in PlanGrid.tsx:** The existing header row with `GeneratePlanButton` is in PlanGrid.tsx (verified the `GeneratePlanButton` import at line 28 and the hook wiring at `generatePlan = useGeneratePlan()` line 141). BatchPrepButton sits immediately after in the same `flex items-center gap-3 flex-wrap` container per UI-SPEC line 204. Use the exact same `onClick` + loading-state pattern as `useGeneratePlan`.

**E.2 — 30s debounce location:** Hook-level (inside `useBatchPrepSummary`). The debounce watches the `queryClient` cache for changes to `['meal-plan-slots', planId]` (verified query key from useMealPlan.ts:24 + usage at PlanGrid.tsx:196). Code skeleton in Code Example 3 above. Rationale: hook-level keeps the component free of timing logic and ensures the debounce resets work from ANY mutation (assignSlot, clearSlot, toggleLock, dragEnd), not just the ones the modal component knows about.

**E.3 — Session card content:** Matches UI-SPEC lines 218–225. Driven entirely by the edge function response structure from D.4.

**E.4 — Stale indicator:** Inline amber row above the session cards, controlled by an `isStale` boolean state in the modal component. Lifts up to the debounce hook via a subscription API. UI-SPEC lines 214 specifies `bg-amber-500/10 border-b border-amber-500/30 px-4 py-2` with `animate-pulse` 8px amber dot + countdown text "Plan changed — refreshing in {N}s".

### F. Cook Mode route & state

**F.1 — Route registration:** See Example 4 above. Top-level routes OUTSIDE the AppShell `<Route element={<AppShell />}>` block (App.tsx lines 137–157). Place between line 157 (end of AppShell block) and line 160 (`/offline` route) to group with other top-level routes.

**F.2 — Page layout:** UI-SPEC lines 228–235 specifies `min-h-screen flex flex-col bg-background` — explicitly NOT the AppShell `px-4 py-6 font-sans pb-[64px]` because Cook Mode needs full viewport. Fixed top bar (sticky top-0), fixed footer with `pb-32` on body for clearance.

**F.3 — Step check-off hook:** Code Example 1 above. Optimistic update pattern: (a) `mutate` updates TanStack Query cache immediately; (b) Supabase `update` fires; (c) Realtime subscription invalidates on server confirmation; (d) on error, `onError` rolls back via `setQueryData`.

**F.4 — Per-member lane UI:** Lane ownership stored in `cook_sessions.step_state.steps[n].ownerMemberId`. Assigned by AI in `generate-cook-sequence` (D.5). UI renders owner avatar chip next to assigned steps (UI-SPEC lines 243, 249). "Swap owner" button on `MemberLaneHeader` (UI-SPEC line 286) lets any member reassign — updates cook_sessions directly and realtime propagates.

**F.5 — Multi-meal combined-vs-per-recipe mode storage:** Store in `cook_sessions.step_state.mode`. The `MultiMealPromptOverlay` (UI-SPEC line 296) is shown on entry per D-21 ("prompted each open") — so the mode is written to `cook_sessions` on prompt dismissal. Per D-21: "the previously chosen value is the focused default for quick Enter-key confirmation" — means we READ the previous session's mode for focus default but always overwrite on new cook session create.

**F.6 — Three entry points:**
- **(a) SlotCard tap:** New Cook button in the icon row per UI-SPEC lines 326–333. Insertion point is SlotCard.tsx lines 170–182 (currently holds `onSuggestAlternative` button). Navigate to `/cook/${slot.meal_id}?slotId=${slot.id}` — slot context enables D-21 flow branching.
- **(b) Recipe detail:** UI-SPEC lines 335–341. Add prominent `bg-primary` CTA beneath recipe title. Navigate to `/cook/${recipeId}?source=recipe`.
- **(c) Standalone `/cook`:** UI-SPEC lines 343–348. Route element `StandaloneCookPickerPage`. Reuses RecipesPage list pattern.

### G. PWA passive-step timer notifications

**G.1 — Current SW state:** `vite-plugin-pwa` ^1.2.0 with workbox is wired in `vite.config.ts:11-42`. The config uses `registerType: 'prompt'` but `main.tsx:9` calls `registerSW({ immediate: true })` which forces the prompt flow to auto-update. There is NO existing push/notification handler in the workbox config — confirmed by `grep -rn "notifications\|Notification\|showNotification\|requestPermission" src/` returning empty.

**G.2 — Notification dispatch API recommendation:** Use `navigator.serviceWorker.ready.then(reg => reg.showNotification(...))` rather than raw `new Notification(...)`. Code in Example 2. Rationale: MDN docs [CITED: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification] state that notifications dispatched through a service worker registration persist even if the originating page is closed, while `new Notification()` is tied to the page context and unreliable on mobile. No new SW code is required — the default workbox SW from `vite-plugin-pwa` is a service worker registration and supports `showNotification()`.

**G.3 — Permission denied handling:** Per UI-SPEC line 315: amber "Notifications blocked" banner with 7-day cooldown on re-show, tracked in `localStorage.cook-notification-dismissed-at`. The `useNotificationPermission` hook (Example 2) exposes the current permission state so the UI can switch between prompt/denied/granted banners.

**G.4 — Timer persistence across tab close:** This is the CRITICAL question. Three options:
1. **Client `setTimeout`:** Fails — timer is killed on tab close
2. **Service worker `setTimeout`:** Also fails — service workers are killed after ~30s idle
3. **Server-side dispatch with Web Push API:** Would require a push server — out of scope
4. **RECOMMENDED: Just-in-time dispatch via `showNotification()` at timer-zero from the foreground tab.** When the tab IS open, the countdown runs and fires at 0. When the tab is CLOSED mid-countdown, the notification will NOT fire — but the user can reopen the tab and the cook_session state is restored from Supabase with elapsed time calculated from `step_state.timerStartedAt + duration_minutes`. UI shows "Timer done — marked X minutes ago".

**Acceptable trade-off:** Full background timer delivery requires Web Push infrastructure (VAPID keys, push subscription storage, server-side cron). That's out of scope for Phase 23. The foreground-while-active approach is sufficient for the kitchen use case — the user is actively cooking and will not close the tab for long. Recommend documenting this limitation in UI-SPEC copy if needed.

### H. Freezer badge integration

**H.1 — SlotCard badge:** UI-SPEC lines 181–194. Render position is INSIDE the existing icon row (`flex items-center gap-1 ml-2 shrink-0` at SlotCard.tsx line 134), BEFORE the Cook button. Icon-only variant (no label). Purely informational — no tap handler. Extends the existing icon-only patterns (LockBadge, drag handle).

**H.2 — Recipe list card badge:** Needs to locate RecipeListCard — not read in this session but inferable from RecipesPage which uses the same list pattern as MealsPage. Badge placement per UI-SPEC line 180: inline next to recipe name, after cost badge. Use the `FreezerBadge` component with variant="full" (label + icon).

**H.3 — Batch prep modal badge:** Per UI-SPEC line 183: renders on every session card with storage-hint variant. Sky blue for freezer, peach accent for fridge. Storage recommendation comes from AI response (D.4 `storage_hints[].storage`).

### I. queryKeys, hooks, and cache invalidation

**I.1 — queryKeys additions:** See Example 5 above.

**I.2 — Hook skeletons:**
```typescript
// src/hooks/useRecipeSteps.ts
export function useRecipeSteps(recipeId: string | undefined) { /* useQuery for recipes.instructions */ }
export function useUpdateRecipeSteps() { /* mutation writing recipes.instructions JSONB directly */ }
export function useRegenerateRecipeSteps() { /* mutation invoking generate-recipe-steps edge function */ }

// src/hooks/useBatchPrepSummary.ts
export function useBatchPrepSummary(planId: string | undefined) { /* useQuery invoking compute-batch-prep edge function */ }

// src/hooks/useCookSession.ts
export function useCookSession(sessionId: string | undefined) { /* useQuery + realtime — see Example 1 */ }
export function useCreateCookSession() { /* mutation upserting cook_sessions row */ }
export function useUpdateCookStep() { /* mutation patching cook_sessions.step_state */ }

// src/hooks/useFreezerClassification.ts
export function useToggleFreezerFriendly() { /* mutation updating recipes.freezer_friendly */ }
export function useUpdateShelfLifeWeeks() { /* mutation updating recipes.freezer_shelf_life_weeks */ }

// src/hooks/useNotificationPermission.ts  (Example 2)
```

All follow the `useFoodPrices.ts:8-57` pattern verbatim: destructure `useHousehold`, guard with `enabled: !!householdId`, invalidate via prefix arrays.

**I.3 — Cache invalidation rules (concrete):**
| Trigger | Invalidation |
|---------|-------------|
| Step edit (user-canonical) | `queryClient.invalidateQueries({ queryKey: queryKeys.recipeSteps.detail(recipeId) })` AND `queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(recipeId) })` |
| Ingredient edit on recipe | Same as above, AND invoke `useRegenerateRecipeSteps` mutation (D-27) |
| Plan slot drag (assignSlot/clearSlot) | Debounced 30s invalidation of `queryKeys.batchPrep.summary(householdId, planId)` (existing useEffect cache subscription from E.2) |
| Cook session step update | Supabase Realtime handles invalidation of `queryKeys.cookSession.detail(sessionId)` automatically (Example 1); as backup, the mutation's `onSuccess` also invalidates |
| Freezer toggle | `queryClient.invalidateQueries({ queryKey: queryKeys.recipeSteps.detail(recipeId) })` AND `queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) })` (to refresh badges in the list) |
| Recipe name change | NO invalidation of recipeSteps (D-27) — name is display-only |
| Recipe servings change | NO invalidation of recipeSteps (D-27) — durations are scale-invariant in MVP |

### J. Rate limiting & cost

**J.1 — Phase 22 rate limit implementation:** Verified at `supabase/functions/generate-plan/index.ts:151-164`. Uses `plan_generations` table with 24h rolling count, cap = 10. The check is:
```typescript
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const { count: recentJobCount } = await adminClient
  .from("plan_generations")
  .select("id", { count: "exact", head: true })
  .eq("household_id", householdId)
  .gt("created_at", twentyFourHoursAgo);
if ((recentJobCount ?? 0) >= 10) return /* rate limit error */;
```

**How Phase 23 shares it per D-29:** Extend `plan_generations` with a `kind text` column via migration 029 (values: `'plan'`, `'steps'`, `'batch_prep'`, `'cook_sequence'`, `'reheat'`). Each Phase 23 edge function inserts a row with `kind='steps'` etc before calling Claude. The count query stays identical (counts ALL kinds). Raises the cap to 20/day or 30/day to accommodate the higher call volume (recommended in Assumption A6 — needs user confirmation).

**J.2 — Backstop for client debounce:** The 30s client-side debounce (D-28) prevents burst calls during drag. Server-side backstop is the rate limit counter itself — a malicious client bypassing debounce still hits the 20/day wall. No additional server-side debouncing is recommended because it would hide legitimate manual recomputes.

### K. Cross-cutting concerns

**K.1 — Dark mode:** No new CSS tokens needed per UI-SPEC line 32 ("No new color tokens introduced"). Freezer badge uses Tailwind's `sky-100 dark:sky-900/30 sky-700 dark:sky-400` (UI-SPEC lines 146, 178). Cook Mode uses existing `--color-background`, `--color-surface`, `--color-text` variables. Contrast verified per UI-SPEC line 156 ("Contrast passes WCAG AA in both light and dark modes").

**K.2 — i18n:** Project does NOT support i18n — all copy is English-only. UI-SPEC lines 498–585 provides hard-coded English strings for every surface. No i18n work in Phase 23. (Implied by all existing files using hard-coded English; no `react-i18next` or equivalent in package.json.)

**K.3 — Test patterns:**
- **Hooks:** Mock Supabase via `vi.mock('../lib/supabase', ...)` — pattern from `tests/AppShell.test.tsx` lines 17–26. Test query + mutation + realtime subscription teardown.
- **Edge functions:** Project does NOT currently use `deno test` (no `.test.ts` files under `supabase/functions/`). Phase 23 can add deno tests OR skip and rely on integration tests from the React side. Recommend: skip deno tests, rely on integration tests that exercise the deployed edge function via `supabase.functions.invoke()`. Matches existing project practice.
- **Components:** vitest + @testing-library/react. Wrap in `<MemoryRouter>` for routing tests (pattern from AppShell.test.tsx:31). Mock TanStack Query via test QueryClient wrapper.

**K.4 — PWA offline:** Cook Mode ASSUMES online for the first load (to fetch `recipes.instructions` and create `cook_sessions` row). Once loaded, the timer countdown is pure-client. Check-offs queue in TanStack Query mutation queue on wifi drop and flush on reconnect. Supabase Realtime auto-reconnects after network drop. The `recipes.instructions` JSONB is cached by TanStack Query for the session duration. NO additional workbox route caching is needed because the Cook Mode flow does not refetch the recipe during cooking — once it has `instructions`, it renders from memory.

**Caveat (A5):** If the tab is closed and reopened offline, the Cook Mode page will not load because (a) TanStack Query cache is in-memory only and (b) no `react-query-persist-client` is configured. Accept this limitation for MVP; document in UI-SPEC if needed.

### L. Risk callouts (Nyquist validation input — Top 5 risks)

| # | Risk | Blast Radius | Verification Test |
|---|------|-------------|-------------------|
| **R-1** | AI returns malformed JSON for recipe steps -> Cook Mode crashes when rendering `instructions.map(step => ...)` | Every user opening Cook Mode for any recipe saved after Phase 23 ships | **V-01:** `parseStepsSafely(null)` returns `null`; `parseStepsSafely("not json")` returns `null`; `parseStepsSafely([validStep])` returns the array. Cook Mode renders an "AI failed — using notes fallback" empty state when `instructions` is null. Test: `npx vitest run src/components/cook/CookModeShell.test.tsx -t "null instructions"` |
| **R-2** | Realtime subscription leak — component unmounts without calling `supabase.removeChannel` -> memory grows across navigations | All users who open Cook Mode multiple times | **V-02:** Unit test for `useCookSession` that asserts `removeChannel` is called in the effect cleanup. Mock `supabase.channel` to count subscribe/unsubscribe. Test: `npx vitest run src/hooks/useCookSession.test.ts -t "cleanup"` |
| **R-3** | Notification permission denied -> passive timer "fires" but nothing happens -> user misses their rice and blames the app | Every user who denies permission on first cook | **V-03:** When `Notification.permission === 'denied'`, `NotificationPermissionPrompt` renders the amber "blocked" variant (UI-SPEC line 315) AND `CookStepTimer` still visually shows the "Done" state with `animate-bounce` (UI-SPEC line 262). Test: set `Notification.permission = 'denied'` in jsdom, mount timer with duration=1, wait for completion, assert visual state renders. |
| **R-4** | Migration 029 locks the `recipes` table during ALTER TABLE -> production read queries stall | Every household during the deploy window | **V-04:** `alter table ... add column` on a nullable column is a fast metadata-only operation in Postgres 11+ (no table rewrite). Verified by Supabase defaults. But the `create index ... where freezer_friendly = true` CAN lock. Use `create index concurrently` syntax OR accept the brief lock (table is small). Test: `SUPABASE_ACCESS_TOKEN=... npx supabase db push --dry-run` runs the migration against a staging DB; check query time < 100ms. |
| **R-5** | `tests/AppShell.test.tsx` nav count assertion breaks if anyone adds a Cook or Prep nav item -> PR fails CI | Every contributor | **V-05:** `npx vitest run tests/AppShell.test.tsx` must still pass with ZERO changes to Sidebar or MobileDrawer. Grep assertion: `git diff main -- src/components/layout/Sidebar.tsx` shows no line additions to `navItems` array. Extends to TabBar. |
| R-6 (bonus) | `compute-batch-prep` D-16 reassignment writes to wrong household due to missing `household_id` check | Any household with a non-trivial weekly plan | **V-06:** Edge function explicitly filters `meal_plan_slots.plan_id = planId` AND cross-checks `meal_plans.household_id = householdId` from the auth context before any UPDATE. Unit test: call function with mismatched household -> assert 403. |
| R-7 (bonus) | Eager step generation on recipe save fires on every onBlur of unrelated fields (name, servings) -> rate limit exhausted | Power users editing recipes heavily | **V-07:** `useRegenerateRecipeSteps` is called ONLY from the ingredients save handler, never from `localName` or `localServings` onBlur. Static grep assertion: `useRegenerateRecipeSteps` only imported in `RecipeBuilder.tsx` inside the ingredient save callback. Integration test: edit recipe name 10 times, confirm `plan_generations` row count unchanged. |
| R-8 (bonus) | `cook_sessions.step_state` JSONB write race between Partner A and Partner B overwrites a check-off | Collaborative cooking sessions | **V-08:** Use `jsonb_set` or merge-patch semantics in the update mutation rather than full JSONB replacement. Test: two concurrent `useUpdateCookStep` mutations for different step indices should both persist. |

## Validation Architecture (final summary — for VALIDATION.md generation)

**Framework:** Vitest 4.1.0 + @testing-library/react 16.3.2. Run command: `npx vitest run` (from CLAUDE.md).

**Top-level verification tests to generate:**
1. **V-01 Malformed JSON resilience** — `parseStepsSafely` unit test + Cook Mode null-instructions render test
2. **V-02 Realtime cleanup** — `useCookSession` subscription cleanup test
3. **V-03 Notification denied fallback** — `NotificationPermissionPrompt` + `CookStepTimer` denied-state render test
4. **V-04 Migration dry-run** — `supabase db push --dry-run` passes in CI
5. **V-05 Nav count preserved** — `tests/AppShell.test.tsx` passes unchanged after Phase 23 merge
6. **V-06 Cross-household isolation** — RLS test on `cook_sessions` insert with wrong household_id returns 403
7. **V-07 Regeneration scoping** — static import grep confirms `useRegenerateRecipeSteps` only called from ingredient mutation
8. **V-08 JSONB concurrent write** — `useUpdateCookStep` merges partial state, doesn't replace
9. **V-09 30s debounce correctness** — `useBatchPrepSummary` unit test with fake timers confirms reset behavior
10. **V-10 Rate limit shared** — integration test confirms a call to `generate-recipe-steps` increments the same counter that `generate-plan` checks

**Sampling rate:**
- Per task commit: `npx vitest run <file>` for the modified file
- Per wave merge: `npx vitest run src/hooks src/components/cook src/components/plan tests/AppShell.test.tsx && npx tsc -b`
- Phase gate: full `npx vitest run` green + `npx supabase db push --dry-run` + Playwright UAT on `/cook/:mealId`, `/cook` standalone, `/plan` batch prep modal, `/recipes/:id` cook CTA

**Wave 0 gaps listed above in the Validation Architecture section.**

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already in `package.json` and verified in use
- Architecture (4-function split, JSONB step_state, top-level routes): HIGH — every pattern has a verified precedent
- AI prompts: MEDIUM — prompt structures are sound but need tuning during execution; JSON validation is the safety net
- Freezer badge integration: HIGH — UI-SPEC is exhaustive and the SlotCard icon row insertion point is trivial to verify
- PWA notifications (service worker dispatch): MEDIUM — MDN docs confirm the API; untested in this specific project context. iOS Safari PWA support needs live verification
- Rate limit extension: MEDIUM — the `plan_generations` extension is clean but the 20/day cap is a guess that needs user input
- Offline Cook Mode after tab close: LOW — depends on adding `@tanstack/react-query-persist-client` which is not in scope

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days — all sources are stable and internal)

## RESEARCH COMPLETE
