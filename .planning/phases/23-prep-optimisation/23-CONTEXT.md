# Phase 23: Prep Optimisation - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

The app helps families cook efficiently by producing three linked artifacts from the weekly plan: (1) a batch prep summary that shows how to group and schedule the week's prep work, (2) a day-of task sequence (Cook Mode) that runs steps in longest-first order across one or many recipes with live timers and per-member step ownership, and (3) a freezer-friendly flag on recipes so make-ahead candidates are visible at a glance. All three are AI-generated and AI-scheduled, consistent with Phase 22's AI-first architecture. Phase 23 builds on the Phase 21 `prep`/`consume`/`quick`/`away` slot statuses and the Phase 22 linkage decision that consume slots pull from preceding prep sessions.

</domain>

<decisions>
## Implementation Decisions

### Recipe Data Model Additions
- **D-01:** `recipes.instructions` JSONB column stores the step array. One migration, no new table. Each step object: `{ text, duration_minutes, is_active, ingredients_used[], equipment[] }` — the "rich step" shape that enables multi-meal parallel scheduling and equipment conflict detection
- **D-02:** `recipes.freezer_friendly` boolean + `recipes.freezer_shelf_life_weeks` integer columns. Both nullable — null means not yet classified
- **D-03:** Step generation fires on recipe save (eager). Recipe save invokes the AI steps edge function; steps are ready before anyone opens Cook Mode. Trades credits for responsiveness
- **D-04:** When a recipe's ingredients change, the regeneration prompt includes the previous user-edited steps as input and asks the AI to merge intent — rephrasing where needed, preserving custom additions, surfacing a confirmation prompt when the AI is unsure whether a user addition should survive

### Step Sourcing & Editability
- **D-05:** AI generates step sequences. If the recipe already has imported instructions (e.g., from Phase 25 Universal Recipe Import later, or freeform `notes`), AI parses them into the standard rich-step format. Otherwise AI creates a sequence from name + ingredients using cooking best practices
- **D-06:** Per-step schema: text, duration_minutes, is_active (hands-on vs passive waiting/cooking), ingredients_used[], equipment[] — all AI-populated
- **D-07:** Users can fully edit AI-generated steps in the recipe editor: text, duration, active/passive flag, and reorder. Edits persist and are treated as canonical until the next regeneration
- **D-08:** Duration estimates are AI-decided with no per-household calibration in MVP — same step, same recipe, same duration for every household

### Freezer-Friendly Flag
- **D-09:** AI auto-suggests the freezer_friendly flag + shelf-life weeks on recipe save (same edge function trip as step generation, or a sibling call). User can toggle the boolean and edit the weeks in the recipe editor. Both user overrides persist
- **D-10:** Backfill for existing recipes is lazy on plan generation — any recipe the Phase 22 planning engine selects into a generated plan gets classified during that AI pass if its flag is null. Avoids a big bulk job on Phase 23 deploy
- **D-11:** Freezer badge renders on recipe cards (recipe list), plan slots (SlotCard), and the batch prep summary modal — full surface coverage as required by PREP-03
- **D-12:** Shelf-life weeks stored alongside the boolean enables Phase 23's batch prep modal to recommend fridge vs freeze per recipe based on how far ahead of its consume slot it's being prepped

### Batch Prep Summary
- **D-13:** Entry point is a button on the Plan page (sits alongside Phase 22's "Generate Plan" button). Tapping opens the batch prep summary as a modal — not a nav tab, not a collapsible section
- **D-14:** Summary content per prep session: recipes in the session, total prep time, shared ingredients callout (e.g., "2 cups rice cooked once for 3 meals"), and per-recipe storage hint (fridge for near-term consume, freezer for far-term consume or flagged-freezer recipes)
- **D-15:** AI chooses the grouping strategy per week — it looks at the whole plan and picks whichever grouping (shared ingredient, shared equipment, schedule prep slots, or a mix) gives the best time savings. Not a fixed rule
- **D-16:** When a consume slot has no preceding prep session in the week, the AI auto-reassigns the recipe to a nearby prep slot (writes back to the plan). The user sees the reassignment reflected in the plan grid after batch prep computation
- **D-17:** Batch prep summary auto-refreshes on plan changes with a 30-second debounce — rapid slot drags coalesce into a single recompute after the user stops editing

### Cook Mode (Day-of Task Sequence)
- **D-18:** Dedicated `/cook/:mealId` route — not a modal and not an expanded SlotCard. Full-page Cook Mode experience
- **D-19:** Full active cook mode: per-step check-offs, per-step start timers, notification-driven passive step completion (see D-25), progress bar
- **D-20:** Cook Mode can be opened from three places: (a) the Plan grid (tap a SlotCard → "Cook" action), (b) the Recipe detail page at `/recipes/:id` (ad-hoc cook without a plan slot), and (c) a standalone `/cook` shortcut that lets the user pick any recipe
- **D-21:** Cook Mode flow varies by slot status:
  - **Consume slot:** Reheat-only sequence (AI generates short reheat steps using the stored fridge/freezer hint — e.g., "thaw overnight", "oven 350F 20 min")
  - **Prep slot with multiple recipes:** User is prompted each open to choose combined multi-meal view (longest-first across all recipes) or per-recipe view
  - **Quick slot:** Same full cook mode flow as a day-of scratch cook (no special short-form)
  - **Day-of scratch cook (any slot):** Full sequence from AI-generated steps

### Cook Mode State & Household Sharing
- **D-22:** Cook session state persists to Supabase in a new `cook_sessions` table. User can close the tab on one device and resume on another. Requires new table + RLS
- **D-23:** Per-member lanes — the cook session tracks step ownership per household member so two people can cook the same meal collaboratively without interfering. AI assigns step ownership (or suggests an assignment that members can adjust)
- **D-24:** Realtime subscription on cook_sessions so Partner A's check-off on step 3 appears on Partner B's screen immediately. Reuses the Supabase Realtime pattern already used in the grocery list
- **D-25:** Passive-step timers use PWA service worker notifications — a local notification fires when a passive timer hits zero even if the app tab is closed. Requires the Notification permission prompt on first cook
- **D-26:** Multiple concurrent cook sessions supported — the user can have cook mode open for breakfast, lunch, and dinner simultaneously and switch between them. Each session is a row in cook_sessions

### AI Cost, Caching, Rate Limiting
- **D-27:** Step cache lives on the recipe itself (D-01). Any ingredient edit on the recipe invalidates steps and triggers regeneration with merge-intent prompting (D-04). Name changes do NOT invalidate. Servings changes do NOT invalidate (durations stay the same regardless of scale in MVP)
- **D-28:** Batch prep summary auto-refresh is debounced 30 seconds after the last plan change (D-17) to prevent burst AI calls during slot dragging
- **D-29:** Phase 23 AI calls (steps, freezer classify, batch prep schedule, reheat sequence, multi-meal schedule) share the Phase 22 per-household daily rate limit. One combined budget — simpler for users to reason about
- **D-30:** Phase 23 edge function(s) follow the Phase 20/22 pattern (Deno + Supabase client + shared ANTHROPIC_API_KEY secret). Model selection (Haiku vs Sonnet) per-call is Claude's discretion

### Claude's Discretion
- Exact Supabase Edge Function boundaries — one omnibus `prep-optimise` function, or separate `generate-steps`, `classify-freezer`, `compute-batch-prep`, `compute-multi-meal-sequence` functions (split for isolation or unify for fewer cold starts)
- Haiku vs Sonnet selection per call based on task complexity
- `cook_sessions` table schema details (step state column shape, lane/member dimension, indexes for realtime filtering)
- Notification permission prompt UX (when to ask, how to handle denied state)
- Multi-meal combined-vs-per-recipe prompt UI (modal, inline toggle, etc.)
- Batch prep summary modal layout and visual design
- Rich step object additional fields if the AI needs them (e.g., temperature, tools_needed beyond `equipment`)
- "Stale plan" indicator while the 30-second debounce is pending
- AI prompt design for step generation, merge-intent regeneration, freezer classification, and multi-meal scheduling
- RLS policies on `cook_sessions` and any other new tables

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Prep — PREP-01 (batch prep suggestions for the week), PREP-02 (day-of task sequencing for a meal), PREP-03 (freezer-friendly flagging)

### Dependency phases (read CONTEXT.md for each)
- `.planning/phases/17-inventory-engine/17-CONTEXT.md` — Storage location enum `pantry` / `fridge` / `freezer` already exists (`src/types/database.ts` line 488); batch prep storage hints build on this
- `.planning/phases/19-drag-and-drop-planner/19-CONTEXT.md` — SlotCard structure and locked-slot mechanism; Cook Mode opens from SlotCard taps
- `.planning/phases/20-feedback-engine-dietary-restrictions/20-CONTEXT.md` — AI edge function pattern (classify-restrictions), per-member settings pattern that cook_sessions reuses
- `.planning/phases/21-schedule-model/21-CONTEXT.md` — `prep` / `consume` / `quick` / `away` slot statuses (D-01), batch prep as the primary workflow (D-02), per-slot granularity (D-04). Phase 23 consumes every one of these
- `.planning/phases/22-constraint-based-planning-engine/22-CONTEXT.md` — Edge Function + Claude API pattern (D-01–D-07), shared Anthropic API key + rate limiting (D-07), `plan_generations` table pattern (D-23), AI matches recipe complexity to schedule status (D-20)

### Existing code
- `src/types/database.ts` — `Recipe` interface (line 65), `StorageLocation` enum (line 488). Phase 23 extends `Recipe` with `instructions`, `freezer_friendly`, `freezer_shelf_life_weeks`
- `src/lib/queryKeys.ts` — Add `cookSession`, `batchPrep`, `recipeSteps` namespaces following existing conventions
- `src/hooks/useMealPlan.ts` — `useMealPlanSlots`, `useAssignSlot`, `useToggleLock` patterns; batch prep auto-reassignment (D-16) extends the same upsert pattern
- `src/utils/schedule.ts` — Schedule status types from Phase 21; grouping logic reads from these
- `src/components/plan/PlanGrid.tsx` — Plan page grid; batch prep button sits alongside Phase 22's "Generate Plan" button
- `src/components/plan/SlotCard.tsx` — Slot card; Cook Mode action added alongside existing lock and violation badges
- `src/components/layout/Sidebar.tsx` + `TabBar.tsx` — Navigation; Phase 23 does NOT add a Prep tab (tests assert exact nav count; batch prep is a modal, cook mode is a route outside the main nav)
- `supabase/functions/` — `analyze-ratings`, `classify-restrictions`, `generate-plan` establish the Deno + Supabase client + Anthropic API pattern to replicate

### v2.0 architectural decisions
- `.planning/STATE.md` §v2.0 Decisions — Async job pattern, queryKeys centralisation
- `.planning/PROJECT.md` §Out of Scope — "Smart prep automation" was deferred "after prep optimization is stable" — Phase 23 IS that stabilisation step
- Existing Supabase Realtime usage in the grocery list feature — same pattern for cook_sessions realtime subscriptions

### Migration baseline
- `supabase/migrations/` — Latest is `028_plan_generations_partial_status.sql`. Phase 23 starts at `029_`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Edge function pattern:** `analyze-ratings`, `classify-restrictions`, `generate-plan` — Deno + Supabase client + `ANTHROPIC_API_KEY` secret + per-household rate limiting. Phase 23 replicates this for steps / freezer classify / batch prep / multi-meal scheduling
- **`SlotCard` badge system:** Already supports colored badges (lock, violation) — extends cleanly for freezer-friendly and Cook Mode action
- **Supabase Realtime:** Already wired for grocery list — same pattern for cook_sessions live updates
- **Recipe editor:** Has existing form sections for ingredients, notes — new "Steps" section slots in consistently
- **`plan_generations` table (Phase 22):** Pattern for job metadata + constraint snapshots. `cook_sessions` follows the same shape conceptually but is a live-state table rather than a completed-job log
- **PWA service worker:** Already registered via `vite-plugin-pwa` (workbox) — Notification permission + local notification plumbing builds on it

### Established Patterns
- TanStack Query with household-scoped query keys and `enabled: !!householdId` guards
- Supabase Edge Functions with shared Anthropic API key for AI features
- Supabase RLS via `get_user_household_id()` helper
- Per-member settings using `member_user_id` XOR `member_profile_id` constraint (cook_sessions per-member lanes reuse this)
- TanStack Query cache invalidation via prefix arrays (e.g., `['cookSession', householdId]`)
- Mobile-first page layout: `px-4 py-6 font-sans pb-[64px]`

### Integration Points
- **`recipes` table:** Add `instructions` JSONB, `freezer_friendly` boolean, `freezer_shelf_life_weeks` integer
- **`cook_sessions` table (new):** Live cook state with per-member lane ownership; Supabase Realtime enabled
- **New Supabase Edge Functions (or one omnibus):** `generate-recipe-steps`, `classify-freezer`, `compute-batch-prep`, `compute-multi-meal-sequence`, `generate-reheat-sequence` — Claude's discretion whether to split or unify
- **New routes:** `/cook/:mealId`, `/cook` (standalone recipe picker), potentially `/cook/session/:sessionId` for resumable sessions
- **Plan page:** New "Batch prep" button next to "Generate Plan"; modal opens with the AI-computed summary
- **Recipe editor:** New Steps section with edit / reorder / duration / active-flag controls; freezer toggle + shelf-life weeks input
- **Recipe detail page (`/recipes/:id`):** "Cook this recipe" ad-hoc Cook Mode entry point
- **queryKeys:** New `cookSession`, `batchPrep`, `recipeSteps` namespaces
- **Service worker:** Notification permission prompt + local notification dispatch for passive step timers

### Constraints Discovered
- Recipes table has NO existing step or cook-time columns — Phase 23 is the first to add them
- `notes` field is freeform text; if Phase 25 (Universal Recipe Import) lands first, importer can write to `notes` and Phase 23's AI parses it. If Phase 23 lands first, recipes start with null instructions and AI generates from name + ingredients
- Nav item count is asserted by tests (`tests/AppShell.test.tsx`) — Phase 23 MUST NOT add a new Sidebar / TabBar entry. Modal + dedicated route (outside nav) avoids the test churn

</code_context>

<specifics>
## Specific Ideas

- **AI-first everywhere** — consistent with Phase 22. No hand-coded longest-first scheduler; AI both generates steps AND sequences them for multi-meal prep. Phase 23 code orchestrates and caches, it does not compute the schedule itself
- **User-edit intent preservation** — when a user customises AI-generated steps and then edits the recipe's ingredients, the regeneration prompt receives the previous user-edited steps and is instructed to preserve intent (rephrasing is OK; losing additions is not). The AI should surface a confirmation prompt when unsure whether a user addition should survive the regeneration
- **Per-member lanes for collaborative cooking** — Cook Mode is designed for two people cooking together. AI suggests step ownership; the realtime sync is so one partner can see what the other is doing. This is a deliberate UX goal, not a technical side-effect
- **Rich step objects over minimal steps** — every step carries ingredients_used and equipment so multi-meal scheduling can detect conflicts (one oven, two dishes at different temps). Even if single-meal cook mode doesn't use these fields today, the schema is ready
- **Eager step generation on recipe save** — the user accepted the credit cost in exchange for Cook Mode always being ready
- **Debounced 30s auto-refresh on batch prep** — picked the responsive-but-not-wasteful middle ground over immediate refresh or manual-only
- **PWA notifications** — the passive-step timer completion is the key UX moment ("the rice is done"), worth the permission prompt friction
- **Standalone /cook route is a deliberate scope expansion** — cook mode is useful even without a plan slot, so the entry points include ad-hoc cooking from the recipe detail page and a top-level /cook shortcut

</specifics>

<deferred>
## Deferred Ideas

- **Per-household duration calibration** — global "I cook slower/faster" offset and per-recipe duration overrides were considered but deferred. MVP uses AI estimates only. If users consistently report inaccurate timings after launch, add calibration in a follow-up phase
- **Versioned recipe instructions with rollback** — considered but deferred. JSONB column is canonical with no history. If users lose edits to a bad AI regeneration and complain, add versioning later
- **Per-recipe + servings cache combinations** — considered but MVP assumes durations are scale-invariant. If 6-serving vs 2-serving durations diverge meaningfully, revisit
- **Separate rate limits for Phase 23 AI calls** — MVP shares the Phase 22 daily cap. If prep-related cost dominates in practice, split the budgets
- **Equipment-conflict enforcement in batch prep** — the rich step objects carry `equipment[]` so the AI CAN detect conflicts, but there's no hard-block enforcement. Extend later if impossible schedules appear
- **Recipe import from URL** — this is Phase 25 territory (Universal Recipe Import). Phase 23 is forward-compatible (if `notes` contains imported text, the AI parses it into steps) but does not implement the import itself
- **Smart prep automation** — explicitly marked "Out of Scope in PROJECT.md until prep optimization is stable"; Phase 23 IS the stabilisation phase, so the next milestone can unlock this

</deferred>

<post_research_resolutions>
## Post-Research Resolutions (2026-04-10)

After `23-RESEARCH.md` surfaced three open questions, the user resolved them:

- **R-01: Rate limit cap → raise to 20/day, add `kind` column.** The shared per-household daily counter used by Phase 22 (`plan_generations`-backed) is raised from 10/day to 20/day, and the counter row gains a `kind` column so steps / batch-prep / cook-sequence / reheat / freezer-classify usage can be reported independently. CONTEXT.md D-29 (shared budget) still holds — this is a single cap, not separate caps. Migration 029 (or a sibling) introduces the `kind` column and raises the limit. Supersedes RESEARCH.md §J.

- **R-02: Mid-cook recipe edit → live-bind, no snapshot.** `cook_sessions.step_state` does NOT snapshot `recipes.instructions`. The Cook Mode UI reads steps live from the recipe; if the recipe is edited during an active cook, the session reflects the new steps. Planner MUST handle the edge cases this creates: (a) previously checked-off step indexes may no longer correspond to the same step text after an edit — use a stable step id (not index) inside `step_state`, (b) if a step is deleted, its check-off state is discarded silently, (c) if a step is added, it appears unchecked. Supersedes RESEARCH.md §D2 snapshot recommendation.

- **R-03: Cross-platform PWA notifications required.** Passive-step timer notifications MUST work on Android, iOS, macOS, and Windows — every platform the PWA can install on. Use the Web Notifications API via `navigator.serviceWorker.ready.then(reg => reg.showNotification(...))` as the primary path. Add an in-app fallback (audible chime + visual banner) that fires when the OS notification cannot be dispatched (permission denied, browser tab backgrounded on a platform that blocks SW notifications). The UAT plan MUST include a matrix of {Chrome Android, Safari iOS ≥16.4, macOS Safari, macOS Chrome, Windows Chrome/Edge} with an explicit pass/fail per platform. If iOS 16.4+ reliability is sketchy in UAT, the in-app fallback covers it but the attempt is mandatory. Supersedes RESEARCH.md §G recommendation to plan-then-verify only.

These resolutions are LOCKED. Treat them as equivalent to the D-01..D-30 decisions above.

</post_research_resolutions>

---

*Phase: 23-prep-optimisation*
*Context gathered: 2026-04-10*
*Post-research resolutions: 2026-04-10*
