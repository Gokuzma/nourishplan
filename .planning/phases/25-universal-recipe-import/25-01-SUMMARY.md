---
phase: 25-universal-recipe-import
plan: 01
subsystem: api
tags: [supabase-edge-function, deno, anthropic, claude-haiku, recipe-import, youtube-transcript, html-scraping, migration, ai-extraction]

# Dependency graph
requires:
  - phase: 23-prep-optimisation
    provides: RecipeStep[] shape on recipes.instructions jsonb (migration 029)
  - phase: 13-recipe-meal-plan-account-management
    provides: create-recipe-from-suggestion edge function pattern (auth, AI call, DB writes)
provides:
  - source_url column on recipes table (migration 030, not yet pushed)
  - Recipe.source_url: string | null in TypeScript type model
  - supabase/functions/import-recipe/index.ts — server pipeline for URL/text imports
  - Input-type auto-detection (youtube/url/text)
  - Blog HTML scrape with script/style/tag stripping + 12000 char cap
  - YouTube transcript extraction via ytInitialPlayerResponse captionTracks
  - AI-driven ingredient dedup against custom_foods (D-21) + new-row insertion (D-19)
  - Recipe write with Phase 23 RecipeStep[] on instructions column
affects:
  - 25-02 (ImportRecipeModal, useImportRecipe hook, RecipesPage button, RecipeBuilder source attribution + skeleton)
  - 25-03 (deployment of function and migration push)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge function structure follows create-recipe-from-suggestion (CORS, JWT auth via adminClient.auth.getUser, household lookup, service-role admin client, 200-only JSON envelope)"
    - "AbortController 10s timeout on all outbound HTTP fetches"
    - "User-Agent Mozilla header to avoid bot-detection on blog URL fetches"
    - "HTML stripping via regex (script/style removal, tag removal, whitespace collapse)"
    - "YouTube timed-text XML extracted via <text> tag regex with HTML-entity decoding"
    - "AI system prompt is a server-side constant — user input flows only into the user message (prompt-injection mitigation)"
    - "Custom food dedup by exact ilike name match (no wildcards per Pitfall 4); insert new row with AI-estimated macros when absent"
    - "Raw text imports get source_url=null; URL imports store trimmed input"
    - "instructions written as RecipeStep[] (Phase 23 shape) — never as a notes string"

key-files:
  created:
    - supabase/migrations/030_recipe_source_url.sql
    - supabase/functions/import-recipe/index.ts
  modified:
    - src/types/database.ts (Recipe interface: +source_url: string | null)

key-decisions:
  - "custom_foods has no category column; AI-supplied category is dropped at the custom_foods insert layer and carried only through recipe_ingredients (downstream YIELD_FACTORS lookup uses ingredient name/category only at read time in Phase 25-02 UI)"
  - "FETCH_TIMEOUT_MS=10000, MAX_CONTENT_CHARS=12000, MIN_USABLE_TEXT_CHARS=200 constants placed at top of index.ts for tuning visibility"
  - "AI system prompt request schema excludes quantity units other than grams — matches recipe_ingredients.quantity_grams column contract"
  - "Recipe INSERT servings fallback chain: AI-provided → household memberCount (D-15) → hard default 4"
  - "XML entity decoding (&amp;/&lt;/&gt;/&quot;/&#39;/&#NNN;) applied before joining YouTube transcript segments — raw entities would confuse the AI"
  - "Migration 030 is an ALTER TABLE only (not a new table); success criterion 5 (no new tables) is preserved"

patterns-established:
  - "detectInputType regex — blog vs YouTube vs text; reused by any future import surface"
  - "stripHtml helper — script/style blocks first, then tags, then whitespace collapse"
  - "fetchWithTimeout wrapper — AbortController pattern for outbound HTTP in edge functions"

requirements-completed: [IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-05]

# Metrics
duration: 3min
completed: 2026-04-19
---

# Phase 25 Plan 01: Universal Recipe Import — Server Pipeline Summary

**Supabase edge function `import-recipe` that auto-detects input type (blog URL / YouTube URL / raw text), fetches and strips source content server-side, calls Claude Haiku for structured extraction, dedups custom_foods by exact ilike name, and writes the recipe with Phase 23 RecipeStep[] instructions.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-19T22:29:45Z
- **Completed:** 2026-04-19T22:32:37Z
- **Tasks:** 2
- **Files created/modified:** 3

## Accomplishments
- Migration 030 adds `source_url text` to `recipes` (not yet pushed — deployment gated by plan 25-03)
- `Recipe.source_url: string | null` added to the TypeScript interface between `notes` and `instructions` fields
- New edge function `supabase/functions/import-recipe/index.ts` (460 lines) implementing the full server pipeline:
  - Input detection (youtube/url/text) per D-04
  - Blog HTML fetch with 10 s AbortController, `User-Agent: Mozilla/5.0`, script/style/tag stripping, 12 000-char truncate, 200-char minimum before D-10 error
  - YouTube transcript fetch via `ytInitialPlayerResponse` regex → `captionTracks[0].baseUrl` → XML `<text>` extraction with HTML entity decoding
  - Raw text passes straight through (truncated to 12 000 chars)
  - Auth identity extracted only from JWT via `adminClient.auth.getUser(token)` (L-013)
  - AI call to `claude-haiku-4-5` with `max_tokens: 2048`, system prompt as server-side constant, user content in the user message only (prompt-injection mitigation)
  - AI error detection: both missing-JSON and `{ error }` field returned as D-08 parse failure
  - Household member count query for D-15 default servings
  - Per-ingredient `custom_foods` dedup: exact `ilike(name)` match (no wildcards per Pitfall 4) — use existing id if found, insert new row with AI-estimated macros when absent (D-19, D-21)
  - Recipe INSERT with `source_url` column populated for URL inputs and null for text inputs, `instructions` written as full `RecipeStep[]` (Pitfall 5)
  - `recipe_ingredients` INSERT with inline macro snapshot per analog; non-fatal partial-success envelope when ingredient insert fails
  - All responses use HTTP 200 with `{ success, ... }` JSON body

## Task Commits

1. **Task 1: Migration + type update** — `6f30956` (feat)
2. **Task 2: import-recipe edge function** — `2cfef69` (feat)

_Plan metadata commit to follow once SUMMARY.md and STATE.md are ready._

## Files Created/Modified
- `supabase/migrations/030_recipe_source_url.sql` — Adds source_url text column to recipes (D-11)
- `supabase/functions/import-recipe/index.ts` — New edge function; input detection, blog/YouTube fetch, AI extraction, custom_foods dedup, recipe + ingredients INSERT
- `src/types/database.ts` — Recipe interface gains `source_url: string | null` between notes and instructions

## Decisions Made
- **custom_foods insert omits `category`.** The plan action spec listed `category: ing.category || "other"` on the custom_foods insert, but migration 004 (`create table public.custom_foods`) defines no category column and no later migration adds one. The insert would have failed at runtime. The AI-supplied category is still emitted by the prompt and can be used at recipe display time via ingredient-name matching or in a future migration; it is simply not persisted on custom_foods today.
- **FETCH_TIMEOUT_MS, MAX_CONTENT_CHARS, MIN_USABLE_TEXT_CHARS constants** hoisted to the top of the file instead of inline magic numbers.
- **Raw text source_url = null.** Plan frontmatter requires "Recipe is saved with source_url" but decision D-11 explicitly says URL attribution only; storing the raw text blob as the URL would corrupt the attribution column. Implemented as: `sourceUrl = inputType !== "text" ? trimmedInput : null`.
- **HTML entity decoding on YouTube transcripts.** XML `<text>` nodes in timed-text files are HTML-entity-encoded (`&#39;`, `&amp;`, etc.). Without decoding, the AI would receive garbled text and extract wrong ingredient names. Added a small decode pass before truncation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Removed `category` column from custom_foods INSERT**
- **Found during:** Task 2 (edge function custom_foods dedup branch)
- **Issue:** The plan `<action>` snippet included `category: ing.category || "other"` inside the `custom_foods` insert, but the `custom_foods` table schema (migration 004 lines 21-39) has no `category` column, and no subsequent migration adds one. A Supabase insert with an unknown column would fail the entire ingredient creation path, making every import of a recipe with a new ingredient broken.
- **Fix:** Dropped `category` from the `custom_foods` insert object. AI-supplied category is still produced by the system prompt for potential downstream use via recipe_ingredients + YIELD_FACTORS lookup (a read-time concern deferred to plan 25-02's UI).
- **Files modified:** `supabase/functions/import-recipe/index.ts`
- **Verification:** `grep -n "category" supabase/functions/import-recipe/index.ts` confirms no `category` key in the `custom_foods").insert({...})` block; schema check against migration 004 confirms no such column exists.
- **Committed in:** `2cfef69` (Task 2 commit — fix landed in the same commit as the edge function body)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** The fix is necessary for correctness; every import with a new ingredient would have failed at runtime without it. No scope creep — the AI continues to emit category in its JSON, so if a future migration adds `custom_foods.category`, the field can be restored with a one-line change.

## Issues Encountered

- **Pre-existing test failures noticed.** `npx vitest run` reports 12 failing tests across `tests/theme.test.ts`, `tests/guide.test.ts`, `tests/auth.test.ts`, and `tests/AuthContext.test.tsx`. Per scope boundary rules, these are NOT in scope — the last commits touching those files are from phases 01 and 14, well before this plan. They fall under "pre-existing warnings / unrelated failures". Logged here only for awareness; no remediation attempted.
- **L-001 check passed.** `.claude/worktrees/` was empty at vitest time — no worktree-derived false negatives.

## User Setup Required

None in this plan. Deployment (migration push, edge function `deploy --no-verify-jwt` per L-025) is gated by plan 25-03 per the orchestrator's `<sequential_context>` block.

## Next Phase Readiness

- **Ready for plan 25-02:** Client-side UI (ImportRecipeModal, useImportRecipe hook, RecipesPage button wiring, RecipeBuilder source_url attribution + skeleton states) can be built against the `supabase.functions.invoke('import-recipe', { body: { input } })` contract documented here.
- **Ready for plan 25-03:** Migration 030 and the edge function are both present and unchanged; deployment (push migration, deploy with `--no-verify-jwt`) can run as a single orchestrated step.
- **No blockers.** The pre-existing test failures listed under "Issues Encountered" are independent of this plan and do not block Phase 25 progression.

## Self-Check: PASSED

Files exist:
- FOUND: supabase/migrations/030_recipe_source_url.sql
- FOUND: supabase/functions/import-recipe/index.ts
- FOUND: src/types/database.ts (modified — source_url present)

Commits exist:
- FOUND: 6f30956 (Task 1)
- FOUND: 2cfef69 (Task 2)

---
*Phase: 25-universal-recipe-import*
*Completed: 2026-04-19*
