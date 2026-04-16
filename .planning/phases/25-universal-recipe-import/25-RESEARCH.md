# Phase 25: Universal Recipe Import - Research

**Researched:** 2026-04-16
**Domain:** Supabase edge function + HTML scraping + YouTube transcript extraction + Claude AI parsing + React modal UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Entry Point & Flow**
- D-01: Primary "Import Recipe" button on RecipesPage, visible alongside existing "Create Recipe" button
- D-02: Button opens a modal with a single text input field (accepts URLs or raw text)
- D-03: After submission, navigate to RecipeBuilder with a loading skeleton — fields populate as the AI responds
- D-04: Auto-detect input type (blog URL, YouTube URL, raw text) — no user selection needed

**Source Handling**
- D-05: Server-side fetch in a new Supabase edge function (follows `create-recipe-from-suggestion` pattern)
- D-06: For YouTube URLs, extract video transcript/captions and have AI parse recipe from transcript text
- D-07: Instagram support deferred — too fragile
- D-08: Single unified AI prompt handles all source types (blog HTML, YouTube transcripts, raw text)
- D-09: Always use AI for extraction — skip JSON-LD/Schema.org structured data parsing
- D-10: On fetch failure: clear error message suggesting user copy-paste recipe text as raw text fallback
- D-11: Store source URL on the recipe record for attribution

**Review & Save**
- D-12: Auto-save as draft — recipe is created in DB immediately, user lands in RecipeBuilder with all fields populated for editing
- D-13: Source link displayed on recipe detail page only (no badge on recipe cards)
- D-14: Extract both ingredients AND cooking steps from the source
- D-15: Set servings to household member count

**Nutrition Accuracy**
- D-16: AI estimates macros for each ingredient (calories/protein/fat/carbs per 100g) — same pattern as `create-recipe-from-suggestion`
- D-17: No confidence indicator
- D-18: AI converts all ingredient quantities to grams
- D-19: For unknown ingredients, create custom_food entries with AI-estimated macros
- D-20: Apply existing YIELD_FACTORS — AI categorizes each ingredient for raw-to-cooked conversion
- D-21: Match existing custom_food entries by name before creating new ones

### Claude's Discretion
- Loading skeleton design in RecipeBuilder during import
- Error state design in the import modal
- Exact AI prompt engineering and response parsing
- YouTube transcript API approach (iframe API, oEmbed, or third-party)
- Edge function timeout and retry strategy

### Deferred Ideas (OUT OF SCOPE)
- Instagram recipe import
- JSON-LD/Schema.org structured data extraction as a fast path before AI
- USDA/CNF database matching for imported ingredients
</user_constraints>

---

## Summary

Phase 25 adds universal recipe import: a user pastes a blog URL, YouTube URL, or raw recipe text into a modal on RecipesPage, a new Supabase edge function fetches and extracts the content, Claude AI parses a complete recipe (name, servings, ingredients with macros, cooking steps), the recipe is auto-saved as a draft, and the user is navigated to RecipeBuilder with all fields populated.

The implementation follows the existing `create-recipe-from-suggestion` edge function pattern closely. The primary novel problems are (1) HTML fetching and stripping for blog URLs, (2) YouTube transcript extraction without official API credentials, and (3) writing `instructions` as `RecipeStep[]` JSON (the Phase 23 format already used by `generate-recipe-steps`) rather than `create-recipe-from-suggestion`'s simple string in `notes`.

The `Recipe` type already has `instructions jsonb` (added in migration 029) and `notes text` columns. The only schema addition needed is a `source_url text` column on `recipes`, which requires a new migration. This is not a "new table" (success criterion 5 says "no new database tables"), so a single `ALTER TABLE` migration is acceptable.

**Primary recommendation:** New edge function `import-recipe` modeled on `create-recipe-from-suggestion`, with a Deno `fetch()` for blog HTML (strip tags via regex in Deno), a YouTube transcript scrape via direct HTTP (no npm package — avoid Deno compatibility issues), AI parsing using the same `RecipeStep[]` shape as `generate-recipe-steps`, and a single migration to add `source_url` to `recipes`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Import modal UI | Browser/Client (React) | — | Modal state, textarea, loading/error display |
| Input type auto-detection | Edge function | — | D-04 — server handles detection so client stays simple |
| Blog URL HTML fetch | Edge function (Deno) | — | CORS blocks browser fetching arbitrary URLs |
| YouTube transcript fetch | Edge function (Deno) | — | Requires server-to-YouTube HTTP; no browser CORS |
| AI extraction + macro estimation | Edge function (Anthropic API) | — | API key secret must not leave server |
| Recipe + ingredient DB writes | Edge function (service role) | — | Uses admin client same as create-recipe-from-suggestion |
| Custom food dedup (D-21) | Edge function | — | Needs service role for household custom_foods query |
| Loading skeleton | Browser/Client (RecipeBuilder) | — | UI state while waiting for TanStack Query to populate |
| Source URL attribution display | Browser/Client (RecipeBuilder) | — | Renders recipe.source_url when present |
| Cache invalidation | Browser/Client (TanStack Query) | — | Invalidate `['recipes', householdId]` after import |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Deno built-in `fetch` | Deno std | HTTP fetch for blog HTML + YouTube | Already used in all edge functions — no extra import |
| Anthropic API (HTTP) | 2023-06-01 | AI recipe extraction | Same call pattern as `create-recipe-from-suggestion` |
| `@supabase/supabase-js` | 2 (via esm.sh) | Admin DB writes + auth check | Established pattern in all edge functions |
| `crypto.randomUUID()` | Deno built-in | Stable RecipeStep IDs (RecipeStep.id field) | Same as generate-recipe-steps pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `claude-haiku-4-5` | current | AI model for extraction | Same model as existing edge functions |
| Deno std `@0.168.0` | 0.168.0 | `serve()` HTTP server | Already pinned in all edge functions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw Deno fetch for YouTube | `youtube-transcript` npm via esm.sh | npm package easier but Deno ESM compatibility is fragile; raw fetch is more stable for serverless |
| Custom HTML stripper | `dompurify` or `linkedom` via esm.sh | Extra import for simple strip-tags operation; Deno regex strip is simpler and sufficient for plain text extraction |

**Installation:**
No new npm packages required. Edge function uses Deno imports (same pattern as existing functions).

---

## Architecture Patterns

### System Architecture Diagram

```
User (RecipesPage)
  |
  | tap "Import Recipe"
  v
ImportRecipeModal (React component)
  | submit URL or text
  v
supabase.functions.invoke('import-recipe', { body: { input, householdMemberCount } })
  |
  +-- if blog URL  --> Deno fetch(url) --> strip HTML --> text excerpt
  |
  +-- if YouTube URL --> fetch YouTube page --> extract timedTextUrl --> fetch XML captions --> text
  |
  +-- if raw text  --> use as-is
  |
  v
Anthropic API (claude-haiku-4-5)
  | JSON: { name, servings, source_url, ingredients[], steps[] }
  v
Edge function DB writes (admin client, service role):
  1. SELECT custom_foods WHERE name ILIKE ... (dedup check D-21)
  2. INSERT INTO recipes (name, servings, instructions, source_url, ...)
  3. INSERT INTO recipe_ingredients (one per ingredient)
  v
Return { success: true, recipeId }
  |
Client: navigate('/recipes/:recipeId')
  |
RecipeBuilder renders with import skeleton
  |
TanStack Query fills fields from useRecipe(recipeId) + useRecipeIngredients(recipeId)
  |
Full RecipeBuilder visible
```

### Recommended Project Structure
```
supabase/functions/import-recipe/
  index.ts                  # new edge function
supabase/migrations/
  030_recipe_source_url.sql # ALTER TABLE recipes ADD COLUMN source_url
src/components/recipe/
  ImportRecipeModal.tsx     # new modal component
src/pages/
  RecipesPage.tsx           # add "Import Recipe" button + modal state
src/components/recipe/
  RecipeBuilder.tsx         # add source_url attribution display
src/types/
  database.ts               # add source_url field to Recipe interface
```

### Pattern 1: Edge Function Structure (follows create-recipe-from-suggestion)
**What:** Deno edge function with CORS, bearer auth, household lookup, AI call, DB writes.
**When to use:** Every time.
**Example (from existing function — verified):**
```typescript
// Source: supabase/functions/create-recipe-from-suggestion/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  // ... auth, household lookup, AI call, DB writes
});
```
[VERIFIED: codebase — supabase/functions/create-recipe-from-suggestion/index.ts]

### Pattern 2: RecipeStep JSON shape (instructions column)
**What:** The `instructions` column on `recipes` stores `RecipeStep[]` as JSONB. The `generate-recipe-steps` edge function writes this format and `useRecipeSteps` reads it.
**When to use:** import-recipe must write `instructions` in the same RecipeStep shape so `RecipeStepsSection` renders correctly without modification.
**Example:**
```typescript
// Source: supabase/functions/generate-recipe-steps/index.ts (verified)
interface RecipeStep {
  id: string;          // crypto.randomUUID()
  text: string;
  duration_minutes: number;
  is_active: boolean;
  ingredients_used: string[];
  equipment: string[];
}
```
[VERIFIED: codebase — supabase/functions/generate-recipe-steps/index.ts + src/types/database.ts]

### Pattern 3: Auto-detect input type in edge function
**What:** Classify the user's pasted string before fetching.
**When to use:** D-04 — no UI selection.
**Example:**
```typescript
// [ASSUMED] — straightforward regex detection
function detectInputType(input: string): 'youtube' | 'url' | 'text' {
  const trimmed = input.trim();
  if (/^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/.test(trimmed)) return 'youtube';
  if (/^https?:\/\//.test(trimmed)) return 'url';
  return 'text';
}
```

### Pattern 4: YouTube transcript extraction (no official API key)
**What:** YouTube embeds caption track URLs in the video page HTML under `ytInitialPlayerResponse`. Fetching the `baseUrl` from that gives an XML timed-text file.
**When to use:** Anytime input is a YouTube URL.
**Key steps:**
1. `fetch('https://www.youtube.com/watch?v=VIDEO_ID', { headers: { 'Accept-Language': 'en' } })` to get the video page HTML
2. Extract the JSON blob from `var ytInitialPlayerResponse = {...}` in the HTML
3. Parse `ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl`
4. Fetch that URL to get XML timed-text, extract `<text>` elements, join as plain text

**Risk:** YouTube may change this format without notice. Treat as best-effort — fall back to D-10 error if extraction fails. [MEDIUM confidence — widely used pattern but undocumented by Google]

Alternative: `https://www.youtube.com/api/timedtext?v=VIDEO_ID&lang=en` (older endpoint, less reliable).

### Pattern 5: Blog HTML extraction
**What:** Fetch the blog URL, strip HTML tags with regex, pass plain text to AI.
**When to use:** Anytime input is a non-YouTube URL.
**Example:**
```typescript
// [ASSUMED] — standard approach for Deno edge functions
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000);
const html = await (await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0' },
  signal: controller.signal,
})).text();
const text = html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim()
  .slice(0, 12000); // truncate for AI token budget
```
Many recipe sites (AllRecipes, Serious Eats, etc.) serve HTML with recipe content visible in the DOM. Ad-heavy pages may have noisy HTML — but the AI prompt instructs it to extract only recipe content, so noise is acceptable.

### Pattern 6: Custom food dedup (D-21)
**What:** Before inserting a new `custom_foods` row, query existing ones by exact name.
**When to use:** For every ingredient from the import.
```typescript
// [VERIFIED: pattern] — uses service role admin client, same as create-recipe-from-suggestion
const { data: existing } = await adminClient
  .from('custom_foods')
  .select('id, name')
  .eq('household_id', membership.household_id)
  .ilike('name', ingredientName)   // exact name, no wildcards
  .is('deleted_at', null)
  .limit(1)
  .maybeSingle();

const ingredient_id = existing?.id ?? crypto.randomUUID();
// if no existing: also INSERT into custom_foods before inserting recipe_ingredient
```
Note: `create-recipe-from-suggestion` currently does NOT create custom_food rows — it uses inline macros only on `recipe_ingredients` with a generated UUID. Decision D-19/D-21 requires the new function to optionally create custom_food rows for dedup. This is a behavior difference from the existing pattern.

### Pattern 7: Writing recipe_ingredients (from create-recipe-from-suggestion)
**What:** Inline macro snapshot on recipe_ingredients row, no FK constraint on ingredient_id.
```typescript
// Source: supabase/functions/create-recipe-from-suggestion/index.ts (verified)
{
  recipe_id: recipe.id,
  ingredient_type: "food",
  ingredient_id: crypto.randomUUID(),   // or existing custom_food.id
  ingredient_name: ing.name,
  quantity_grams: ing.quantity_grams,
  calories_per_100g: ing.calories_per_100g,
  protein_per_100g: ing.protein_per_100g,
  fat_per_100g: ing.fat_per_100g,
  carbs_per_100g: ing.carbs_per_100g,
  sort_order: i,
}
```
`weight_state` defaults to `'raw'` when omitted — acceptable for import. [VERIFIED: codebase]

### Anti-Patterns to Avoid
- **Fetching URLs from the browser:** CORS blocks most external domains. All HTTP fetching must happen in the edge function.
- **npm packages for YouTube transcript:** Deno ESM compatibility for Node-specific packages is unreliable. Use raw Deno fetch to the YouTube timed-text endpoint instead.
- **Streaming AI response to browser:** `supabase.functions.invoke()` is request/response. The "skeleton while populating" UX in D-03 means the edge function completes ALL DB writes first, then returns the `recipeId`. The skeleton is shown while TanStack Query loads the newly-created recipe, not while the AI streams.
- **Adding custom_food rows without dedup:** D-21 requires name-matching to avoid duplicates. A missing dedup check silently bloats the food library.
- **Storing `source_url` in `notes`:** The UI-SPEC and D-11 require a dedicated `source_url` column. Using `notes` would corrupt the notes field display.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML tag stripping | Custom DOM parser | Regex `.replace(/<[^>]+>/g, ' ')` | Sufficient for text extraction; full DOM parser adds unnecessary Deno ESM risk |
| YouTube caption XML parsing | Custom XML parser | Deno regex on `<text>` elements | Timed-text format is trivial XML, no library needed |
| AI JSON response parsing | Custom streaming parser | `text.match(/\{[\s\S]*\}/)` then `JSON.parse` | Same approach as all existing edge functions [VERIFIED] |
| Macro calculation | New formula | `calcIngredientNutrition` from `src/utils/nutrition.ts` | Already verified and used across the app |
| Modal component | Custom overlay | Follow `AddInventoryItemModal` shell exactly | UI-SPEC mandates this exact pattern |

**Key insight:** The AI does the hard extraction work. The edge function's job is (1) fetch and strip down to text, (2) call AI, (3) write DB rows. Keep each step simple.

---

## Database Schema Delta

### source_url column on recipes (NEW — migration required)
The `Recipe` interface in `src/types/database.ts` does NOT have a `source_url` field. [VERIFIED: codebase scan confirmed no `source_url` anywhere in src/ or supabase/]

Required migration: `ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url text;`

This is not a new table — success criterion 5 is satisfied.

After the migration, `src/types/database.ts` must be updated:
- Add `source_url: string | null` to the `Recipe` interface
- Add `source_url?: string | null` to `recipes.Insert` and `recipes.Update`

### instructions column — already exists
`instructions jsonb` was added in migration `029_prep_optimisation.sql`. [VERIFIED: codebase]

### No other schema changes needed
- No new tables
- No changes to `recipe_ingredients` or `custom_foods` schema

---

## Runtime State Inventory

> Phase is greenfield (new edge function + new column + new UI). No rename/migration of existing state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `source_url` is a new nullable column; existing recipes default to NULL | None |
| Live service config | None | — |
| OS-registered state | None | — |
| Secrets/env vars | `ANTHROPIC_API_KEY` already in Supabase secrets | No change — import-recipe reuses the same key |
| Build artifacts | None | — |

---

## Common Pitfalls

### Pitfall 1: Supabase edge function 150s request timeout
**What goes wrong:** Blog fetch + AI extraction can exceed 10s on a slow site. YouTube page fetch is usually fast, but AI call with large transcript input can be slow.
**Why it happens:** The Supabase free tier enforces a 150s wall-clock limit per request; the AI call alone can take 15-30s for a 2048-token response. [VERIFIED: Supabase docs]
**How to avoid:** (a) Truncate HTML/transcript to 12,000 characters before sending to AI (enough for any recipe). (b) Set `max_tokens: 2048` on the AI call (same as existing functions). (c) Add an `AbortController` with a 10s timeout on the HTML fetch step.
**Warning signs:** `504 Gateway Timeout` in client; function logs showing "wall clock time limit reached".

### Pitfall 2: YouTube page structure changes
**What goes wrong:** The `ytInitialPlayerResponse` JSON blob location or `captionTracks` path changes — transcript extraction returns empty string — AI receives no recipe content.
**Why it happens:** YouTube's internal page structure is undocumented and changes without notice.
**How to avoid:** Treat YouTube transcript extraction as best-effort. If extraction returns empty or fails, return the D-10 error message instructing the user to copy-paste. Log the failure on the edge function.
**Warning signs:** Imported YouTube recipes return with no content and the modal shows the fetch failure error.

### Pitfall 3: AI hallucinating recipe content for paywalled blog pages
**What goes wrong:** Many recipe blogs return a paywall or cookie consent page when fetched without a session cookie. The AI receives near-empty HTML and generates a hallucinated recipe.
**Why it happens:** Server-side fetch has no session cookie.
**How to avoid:** (a) Pass `User-Agent: Mozilla/5.0` header to avoid bot detection on most sites. (b) Check that the stripped text length exceeds a minimum (e.g., 200 chars) before sending to AI; if too short, return the D-10 "could not fetch" error.
**Warning signs:** Imported recipe has vague ingredient names like "ingredient 1", or recipe name doesn't match the URL domain.

### Pitfall 4: custom_food dedup misfire
**What goes wrong:** The `ilike` name match is too broad (e.g., "chicken" matches "chicken broth", "chicken breast", "chicken powder") — wrong ingredient's macros are used.
**Why it happens:** Case-insensitive partial name matching.
**How to avoid:** Use exact case-insensitive match (`ilike` with the full name, no `%` wildcards), not a partial match. The intent of D-21 is exact name match, not substring.
**Warning signs:** Imported recipe shows macros inconsistent with ingredient weight.

### Pitfall 5: instructions format mismatch with RecipeStepsSection
**What goes wrong:** The import edge function writes `instructions` as a plain string array instead of `RecipeStep[]`, causing `RecipeStepsSection` to show nothing or crash.
**Why it happens:** `create-recipe-from-suggestion` stores instructions as a plain string in `notes`, not in the `instructions` JSONB column. The new import function must use the Phase 23 RecipeStep format.
**How to avoid:** Conform to the `RecipeStep` interface: `{ id: crypto.randomUUID(), text, duration_minutes, is_active, ingredients_used, equipment }`. The AI prompt must request this exact shape.
**Warning signs:** RecipeBuilder shows the steps section empty after import even though the edge function returned success.

### Pitfall 6: Skeleton timing — edge function completes before navigation
**What goes wrong:** The edge function is fast (< 2s) and by the time RecipeBuilder mounts, TanStack Query has already fetched the recipe — no skeleton is ever visible.
**Why it happens:** TanStack Query cache is initially empty for the new recipe ID, so first load always fetches from the server. But if the fetch completes before the skeleton renders, it flashes.
**How to avoid:** Key the skeleton on `isPending` from `useRecipe(recipeId)` and `useRecipeIngredients(recipeId)`. These are always true on first render. Document this in the plan so the implementation uses these hooks.
**Warning signs:** Skeleton flashes for less than 100ms on fast connections.

---

## Code Examples

### AI prompt for import (unified across all source types)
```typescript
// [ASSUMED] — exact wording is Claude's discretion per CONTEXT.md
const systemPrompt = `You are a recipe extractor. Given recipe content (from a blog post, YouTube video transcript, or raw text), extract a complete recipe.

Return ONLY valid JSON matching this exact schema:
{
  "name": "Recipe Name",
  "servings": number,
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity_grams": number,
      "category": "meat|poultry|fish|vegetables|legumes|grains|dairy|other",
      "calories_per_100g": number,
      "protein_per_100g": number,
      "fat_per_100g": number,
      "carbs_per_100g": number
    }
  ],
  "steps": [
    {
      "text": "imperative sentence describing one action",
      "duration_minutes": number,
      "is_active": boolean,
      "ingredients_used": ["ingredient name"],
      "equipment": ["equipment name"]
    }
  ]
}

Rules:
1. Convert all ingredient quantities to grams.
2. Use realistic per-100g nutritional values.
3. For the category field, choose from: meat, poultry, fish, vegetables, legumes, grains, dairy, other.
4. If content is too vague to extract a recipe, return { "error": "Could not extract recipe" }.
5. Return ONLY the JSON object — no prose, no markdown.`;
```

### Client-side import hook
```typescript
// Pattern: follows useRegenerateRecipeSteps approach [VERIFIED: useRecipeSteps.ts]
// [ASSUMED] — exact shape TBD in plan
export function useImportRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, householdMemberCount }: { input: string; householdMemberCount: number }) => {
      const { data, error } = await supabase.functions.invoke('import-recipe', {
        body: { input, householdMemberCount },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error ?? 'Import failed');
      return data.recipeId as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}
```

### source_url attribution in RecipeBuilder
```tsx
// Pattern: below recipe title/notes, above ingredients — mirrors notes display pattern
// [ASSUMED] — exact positioning follows UI-SPEC
{recipe.source_url && (
  <p className="text-xs text-text/40 mb-3">
    <a
      href={recipe.source_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View original recipe source"
    >
      Imported from {new URL(recipe.source_url).hostname}
    </a>
  </p>
)}
```
Note: Wrap in a try/catch if `new URL()` could throw for invalid URLs — fall back to truncated raw URL per the UI-SPEC copywriting contract.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `instructions` stored in `notes` text | `instructions` stored as `RecipeStep[]` JSONB | Phase 23 (migration 029) | Import must write `instructions` column, not `notes` |
| No `source_url` on recipes | Need `source_url text` column | This phase (migration 030) | One `ALTER TABLE` migration required |
| `create-recipe-from-suggestion` uses inline macros only, no custom_foods creation | Import (D-21) matches existing custom_foods by name | This phase | Additional query per ingredient at import time |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | YouTube timed-text URL is in `ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl` | Architecture Patterns – Pattern 4 | Transcript extraction fails; user must paste text manually (D-10 fallback handles this) |
| A2 | Truncating HTML/transcript to 12,000 chars is sufficient for AI to extract a complete recipe | Common Pitfalls – Pitfall 1 | Some long recipes may have truncated steps; adjust to 16,000 if failures occur |
| A3 | Using `ilike` with exact name (no wildcards) satisfies D-21 dedup intent | Architecture Patterns – Pattern 6 | Either over-matches (wrong food ID used) or under-matches (duplicates created) |
| A4 | `weight_state` omission defaults to `'raw'` in recipe_ingredients — acceptable for imported ingredients | Architecture Patterns – Pattern 7 | Imported ingredient calorie display may be wrong if DB default differs; check migration 018 |
| A5 | The loading skeleton in RecipeBuilder should key on `isPending` from `useRecipe` + `useRecipeIngredients` | Common Pitfalls – Pitfall 6 | Skeleton may never appear if fetch is fast — degrades gracefully |
| A6 | `householdMemberCount` for D-15 servings is obtained by querying `household_members` count inside the edge function | Architecture Patterns – System Diagram | Planner must confirm count source; client could also pass it |

---

## Open Questions (RESOLVED)

1. **Should the edge function create `custom_foods` rows or just inline macros?**
   - **RESOLVED:** Create custom_food rows for unknown ingredients per locked decision D-19. Flow: ilike dedup check (D-21) -> if match found, use existing ID -> if no match, INSERT new custom_food row with AI-estimated macros, then use that ID for recipe_ingredients.

2. **How should `householdMemberCount` be obtained for D-15?**
   - **RESOLVED:** Query `COUNT(*)` from `household_members` where `household_id = membership.household_id` inside the edge function — same admin client pattern used for the membership lookup. No need for the client to pass it.
---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `ANTHROPIC_API_KEY` Supabase secret | Edge function AI call | [ASSUMED: yes — all other edge functions use it] | — | Import fails gracefully with "AI generation not configured" |
| Supabase CLI | Migration push | Check `.env.local` + `supabase --version` | — | — |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vite.config.ts` (vitest block) |
| Quick run command | `npx vitest run tests/import-recipe.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| — | Input type detection (URL vs YouTube vs raw text) | unit | `npx vitest run tests/import-recipe.test.ts` | Wave 0 |
| — | AI JSON response parsing (happy + malformed) | unit | `npx vitest run tests/import-recipe.test.ts` | Wave 0 |
| — | `source_url` attribution renders when present | component | `npx vitest run tests/recipe-builder.test.tsx` | Extend existing |
| — | ImportRecipeModal idle/loading/error states | component | `npx vitest run tests/import-recipe.test.ts` | Wave 0 |
| — | Full import flow (modal to RecipeBuilder) | manual/Playwright | Playwright live test | Manual |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/import-recipe.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/import-recipe.test.ts` — unit tests for input detection, JSON parsing, ImportRecipeModal states
- [ ] No new framework install needed (Vitest already configured)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT via `adminClient.auth.getUser(token)` — identical to existing edge functions |
| V3 Session Management | no | Stateless edge function |
| V4 Access Control | yes | Household membership check before any DB write (same pattern as existing) |
| V5 Input Validation | yes | AI prompt injection: user input must go into the `user` message content only, never the system prompt |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via malicious URL content | Tampering | User input wrapped as recipe source content in the `user` message; system prompt is a server-side constant and never interpolated with user data |
| SSRF via URL fetch | Elevation of Privilege | Deno edge functions run in a sandboxed network context; Supabase blocks private subnet access — accept as mitigated |
| Unauthorized recipe creation | Tampering | Household membership check enforced before any INSERT using `adminClient.auth.getUser(token)` — user identity never read from request body [VERIFIED: create-recipe-from-suggestion pattern + L-013] |
| Raw HTML content stored in DB | Information Disclosure | Recipe fields are plain text and numbers only; no HTML markup stored in DB; no raw HTML rendered in JSX |

---

## Sources

### Primary (HIGH confidence)
- `supabase/functions/create-recipe-from-suggestion/index.ts` — edge function pattern (auth, AI call, DB writes) [VERIFIED in session]
- `supabase/functions/generate-recipe-steps/index.ts` — RecipeStep JSON shape and instructions column format [VERIFIED in session]
- `src/types/database.ts` — Recipe, RecipeIngredient, CustomFood interfaces [VERIFIED in session]
- `src/hooks/useRecipes.ts` — TanStack Query patterns, cache invalidation [VERIFIED in session]
- `src/lib/queryKeys.ts` — query key structure [VERIFIED in session]
- `src/utils/nutrition.ts` — YIELD_FACTORS, calcIngredientNutrition [VERIFIED in session]
- `supabase/migrations/029_prep_optimisation.sql` — confirms `instructions jsonb` column exists [VERIFIED in session]
- `lessons.md` L-001 through L-020 — all applied as constraints [VERIFIED in session]
- `25-CONTEXT.md` — all decisions and canonical references [VERIFIED in session]
- `25-UI-SPEC.md` — component structure, interaction contracts, copywriting [VERIFIED in session]

### Secondary (MEDIUM confidence)
- [Supabase edge function limits docs](https://supabase.com/docs/guides/functions/limits) — 150s request timeout confirmed
- YouTube `ytInitialPlayerResponse` transcript extraction — widely documented community pattern, undocumented by Google

### Tertiary (LOW confidence)
- Specific YouTube `captionTracks[0].baseUrl` JSON path — needs runtime verification; treat as hypothesis requiring fallback

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing patterns verified in codebase
- Database schema delta: HIGH — confirmed `source_url` absent, `instructions` present
- Architecture: HIGH for edge function structure; MEDIUM for YouTube transcript path
- Pitfalls: HIGH — drawn from verified codebase patterns and known YouTube API fragility
- AI prompt engineering: MEDIUM — marked as Claude's discretion in CONTEXT.md

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (YouTube transcript approach may need re-verification sooner if YouTube updates their page structure)
