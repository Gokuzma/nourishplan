# Phase 28: Resolve Prep Sequence Edge Function Orphans - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the two orphaned Phase 23 edge functions (`generate-cook-sequence` and `generate-reheat-sequence`) into `CookModePage` so the existing UI scaffolding (the `flowMode === 'reheat'` branch and the `MultiMealPromptOverlay` Combined/Per-recipe choice) actually invokes the deployed AI functions instead of falling through to hardcoded placeholders. Closes v2.0 audit WARN-01 by **completing the feature**, not by removing it. Updates `REQUIREMENTS.md` PREP-02 traceability so the SATISFIED claim already in `23-VERIFICATION.md` becomes retroactively accurate.

**In scope:**
- Two new TanStack Query mutation hooks: `useGenerateCookSequence` + `useGenerateReheatSequence` (follow `useImportRecipe.ts` pattern)
- `CookModePage` wiring at the two existing branches (`flowMode === 'reheat'` line 360, `flowMode === 'multi-meal-prompt'` line 393 → `handleStartCook` line 273)
- Full-screen "Planning your cook session…" overlay during cook-sequence call (Phase 25 `ImportRecipeModal` pending-state pattern)
- Graceful fallback on edge function failure (per Phase 25 D-10 pattern)
- Redeploy both edge functions with `--no-verify-jwt` to guarantee live source matches repo source
- One-line `REQUIREMENTS.md` PREP-02 traceability update

**Out of scope (deferred):**
- AI cost / usage telemetry — no project-wide tracking exists today; full table + retrofit + UI is its own v2.1+ phase
- Any amendment to `23-VERIFICATION.md` (its SATISFIED claim becomes accurate post-wire-in; light-touch per D-06)
- Changes to `useRecipeSteps.ts` / `generate-recipe-steps` (those serve per-recipe steps, separate concern)
- New cost dashboard or budgeting for AI calls

</domain>

<decisions>
## Implementation Decisions

### Primary fork

- **D-01:** Wire both edge functions in. Close WARN-01 by completing the feature, not by deletion. Rationale: the UI scaffolding (`MultiMealPromptOverlay`, `flowMode === 'reheat'` branch) already exists and the "Combined" choice currently lies (routes to single-recipe flow); wire-in makes PREP-02's already-claimed SATISFIED status retroactively accurate. Per-cook spend is acceptable (Sonnet ~$0.01–0.03 multi-meal; Haiku ~$0.001 reheat).

### Reheat flow

- **D-02:** When `generate-reheat-sequence` returns an error, malformed JSON, or `success: false`, fall back to the existing hardcoded 3-step microwave sequence at `CookModePage.tsx:363-367`. Storage hint (`fridge | freezer`) is passed to the edge function but ignored in fallback. Matches Phase 25 D-10 graceful-degradation pattern: AI is enhancement, never blocker.

### Combined cook flow

- **D-03:** Both `Combined` and `Per recipe` modes invoke `generate-cook-sequence` with the appropriate `mode` parameter (`'combined' | 'per-recipe'`). Uniform code path; per-recipe mode benefits from member balancing on 2+ cooks even without interleaving.
- **D-04:** During the `generate-cook-sequence` call (2–5s Sonnet latency), render a full-screen "Planning your cook session…" overlay (centered spinner + message). Same pattern as Phase 25 `ImportRecipeModal` pending state. Disables backdrop dismissal during the pending window.
- **D-05:** When `generate-cook-sequence` fails, fall back to per-recipe concatenation (each recipe's steps in original order, no interleaving, no member ownership). User still gets a working Cook Mode session. Consistent with D-02.

### Traceability and deployment

- **D-06:** Light-touch on Phase 23 records. Update `REQUIREMENTS.md` PREP-02 row from `Phase 23` to `Phase 23, Phase 28 (wire-in)`. Mark `Pending` → `Validated` after Phase 28 ships. Do NOT amend `23-VERIFICATION.md` — its SATISFIED claim becomes accurate post-wire-in. Phase 28's own `28-SUMMARY.md` and `28-VERIFICATION.md` carry the full closure narrative.
- **D-07:** Redeploy both edge functions in Phase 28 regardless of current Supabase state. Use `npx supabase functions deploy generate-cook-sequence --no-verify-jwt` and same for `generate-reheat-sequence`. Eliminates "is the live function the same as repo source?" ambiguity. (Lessons L-025: `--no-verify-jwt` is project standard; `adminClient.auth.getUser()` inside the function handles JWT.)

### Telemetry

- **D-08:** No AI cost telemetry in Phase 28. Console.log of token usage rejected. Full cost-tracking (new `ai_usage` table, retrofit all 7+ existing AI edge functions, dashboard UI) deferred to v2.1+ as its own phase. Phase 28 ships without observability for the new spend.

### Claude's Discretion

- Exact loading-overlay copy ("Planning your cook session…" is suggested but final wording is the planner's call)
- Whether the cook-sequence error fallback shows a toast/notice ("AI optimization unavailable, using simple sequence") or silent fall-through — planner picks
- Hook signature shape (mutation vs query — likely mutation since it's request-driven, but planner confirms vs `useImportRecipe`)
- Whether `ReheatSequenceCard` props need a new `isPending` state for the AI-fetching window, or if the existing card's empty render covers it

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 28 scope and audit context
- `.planning/ROADMAP.md` §Phase 28 (lines 541-552) — phase goal + 5 success criteria
- `.planning/v2.0-MILESTONE-AUDIT.md` §WARN-01 (line 243) — original audit finding
- `.planning/REQUIREMENTS.md` §PREP-02 (line 175) + traceability row (line 320) — what needs traceability update

### Edge functions being wired in
- `supabase/functions/generate-cook-sequence/index.ts` — Sonnet/Haiku, 332 LOC, request shape `{cookSessionId, householdId, recipeIds, mode, memberIds}`, response `{sequence, equipment_conflicts, total_duration_minutes}`
- `supabase/functions/generate-reheat-sequence/index.ts` — Haiku, 274 LOC, request shape `{recipeId, householdId, storageHint, servings?}`, response `{steps: [{text, duration_minutes, is_active, ingredients_used, equipment}]}`

### Consumer file (the wire-in target)
- `src/pages/CookModePage.tsx` — `flowMode` state machine (line 29); reheat branch (line 360 — currently uses hardcoded `reheat-1/2/3` fallback); multi-meal-prompt branch (line 393); `handleStartCook(mode)` (line 273 — currently does NOT call the edge function, just creates a session)
- `src/components/cook/ReheatSequenceCard.tsx` — current reheat UI component
- `src/components/cook/MultiMealPromptOverlay.tsx` — Combined/Per-recipe choice (the prompt that currently leads to the lie)

### Hook patterns to follow
- `src/hooks/useImportRecipe.ts` — primary analog: session/householdId guards before `supabase.functions.invoke`, throws on `response.success === false`, invalidates broad TanStack prefix on success
- `src/hooks/useRecipeSteps.ts` — secondary analog: contains `useRegenerateRecipeSteps` mutation that calls `generate-recipe-steps` edge function
- `src/hooks/useImportRecipe.ts` is the closer template (mutation that invokes an edge function and returns AI-shaped data)

### Phase 23 origin and Phase 25 pending-UX precedent
- `.planning/phases/23-prep-optimisation/23-CONTEXT.md` — D-21 (consume slot → reheat; prep slot multi-recipe → multi-meal prompt), D-23 (per-member lane ownership)
- `.planning/phases/23-prep-optimisation/23-02-PLAN.md` (lines 707-915) — original spec for both edge functions (request/response shapes, model selection rules)
- `.planning/phases/23-prep-optimisation/23-VERIFICATION.md` (lines 48-49, 108) — current PREP-02 SATISFIED claim
- `.planning/phases/25-universal-recipe-import/25-CONTEXT.md` — D-10 graceful-fallback pattern reference (paste-text fallback when URL fetch fails)
- `src/components/recipe/ImportRecipeModal.tsx` — pending-state overlay pattern for D-04

### Project conventions
- `lessons.md` §L-025 — `--no-verify-jwt` for all edge functions (project standard); `adminClient.auth.getUser()` inside handles JWT
- `lessons.md` §L-001 — worktree cleanup before vitest
- `CLAUDE.md` §"Hooks follow the useFoodPrices pattern" — `householdId` from `useHousehold()`, `enabled: !!householdId`, `queryKeys.*` for cache keys

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useImportRecipe.ts`**: Direct hook template for `useGenerateCookSequence` and `useGenerateReheatSequence` — same `supabase.functions.invoke` pattern, same `success: false` error throw, same TanStack Query invalidation discipline
- **`ImportRecipeModal.tsx`**: Pending-state UX template for D-04 full-screen "Planning your cook session…" overlay — backdrop disabled during pending, centered message, no close button while loading
- **`ReheatSequenceCard.tsx`**: Already accepts `steps: {id, text}[]` and `storage: 'fridge' | 'freezer'` props — wire-in just changes the source of `steps` from hardcoded array to AI response
- **`MultiMealPromptOverlay.tsx`**: Already in place — no UX change needed, only the downstream `handleStartCook(mode)` behavior changes

### Established Patterns
- **Edge function deploy:** `npx supabase functions deploy <name> --no-verify-jwt` (L-025); all 7+ existing AI functions follow this
- **Edge function consumer hook:** mutation that invokes the function, throws on `success === false`, returns the data field on success, invalidates TanStack prefix arrays for cache hygiene
- **Graceful AI fallback:** Phase 25 D-10 — AI is enhancement, never blocker; on failure, fall back to a deterministic local computation that keeps the user moving
- **Loading overlay:** Phase 25 `ImportRecipeModal` — full-screen during pending, no backdrop dismissal, simple centered text + spinner
- **flowMode state machine:** explicit string union type with branch-per-state in JSX render — keeps each flow's UI declarative

### Integration Points
- `CookModePage.tsx:104` — when `flowMode` transitions to `'reheat'`, the new `useGenerateReheatSequence` mutation fires; while pending, render existing `ReheatSequenceCard` with skeleton or spinner; on success, render with AI steps; on failure, render with the existing hardcoded fallback
- `CookModePage.tsx:273` — `handleStartCook(mode)` becomes the call site for `useGenerateCookSequence`. Sequence: (1) create cook session via `createSession.mutateAsync`, (2) invoke `useGenerateCookSequence.mutateAsync({cookSessionId: newSession.id, householdId, recipeIds, mode, memberIds})`, (3) on success store the AI sequence in CookSession state and switch to `flowMode === 'cook'`; on failure use per-recipe concatenation and switch to cook anyway
- `useCookSession` (or wherever cook session shape lives) — needs to optionally store the AI-returned `sequence: SequenceItem[]` so `CookModeShell` renders steps in the AI-determined order rather than naive concatenation

</code_context>

<specifics>
## Specific Ideas

- **Loading overlay copy:** "Planning your cook session…" is the suggested wording. Final copy is planner's discretion but must convey "AI is computing the sequence" not "loading the page".
- **Reheat fallback storage-awareness:** D-02 keeps the existing 3-step microwave fallback as-is even when `storageHint === 'freezer'`. Future polish (storage-aware fallback) would require a new fallback array; out of scope.
- **PREP-02 row update target:** Change `Phase 23` to `Phase 23, Phase 28 (wire-in)` in REQUIREMENTS.md line 320. Phase 28 is NOT a gap-closure phase in the gap-closure sense (no failing UAT), so the parenthetical is `(wire-in)` not `(gap closure)`.

</specifics>

<deferred>
## Deferred Ideas

### Captured for v2.1+ (out of Phase 28 scope)

- **AI cost/usage telemetry phase** — new `ai_usage` table (function name, model, input_tokens, output_tokens, cost_usd, household_id, created_at), retrofit all 7+ existing AI edge functions to log per call, simple cost dashboard in Settings or Admin view. Phase 28 deliberately ships without this; cost will be opaque until the dedicated phase happens.
- **Storage-aware reheat fallback** — when AI fails AND `storageHint === 'freezer'`, show a 4-step thaw-then-reheat sequence instead of the 3-step microwave-only fallback. Polish nice-to-have.
- **Equipment-conflict surfacing in UI** — `generate-cook-sequence` returns `equipment_conflicts: string[]` (e.g., "Oven needed at 350F and 425F — scheduled serially"). Phase 28 doesn't render these; future polish could surface as a notice card above the cook sequence.
- **Cross-meal equipment conflict prediction beyond combined mode** — proactively flag equipment conflicts at meal-plan time (not just at cook time). Whole new feature.
- **Prep-day reminders** — push notifications the day before a planned prep session. Notification stack exists from Phase 23; just no scheduling. Separate phase.

### Reviewed Todos (not folded)

None — no pending todos in `.planning/todos/` matched Phase 28's scope.

</deferred>

---

*Phase: 28-resolve-prep-sequence-edge-function-orphans*
*Context gathered: 2026-04-21*
