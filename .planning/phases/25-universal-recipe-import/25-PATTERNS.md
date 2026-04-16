# Phase 25: Universal Recipe Import — Pattern Map

**Mapped:** 2026-04-16
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/import-recipe/index.ts` | edge-function | request-response | `supabase/functions/create-recipe-from-suggestion/index.ts` | exact |
| `supabase/migrations/030_recipe_source_url.sql` | migration | transform | `supabase/migrations/029_prep_optimisation.sql` | role-match |
| `src/components/recipe/ImportRecipeModal.tsx` | component | request-response | `src/components/inventory/AddInventoryItemModal.tsx` | exact |
| `src/hooks/useImportRecipe.ts` | hook | request-response | `src/hooks/useRecipeSteps.ts` (`useRegenerateRecipeSteps`) | exact |
| `src/pages/RecipesPage.tsx` (modify) | page | request-response | itself — existing file | self |
| `src/components/recipe/RecipeBuilder.tsx` (modify) | component | request-response | itself — existing file | self |
| `src/types/database.ts` (modify) | type | transform | itself — existing file | self |

---

## Pattern Assignments

### `supabase/functions/import-recipe/index.ts` (edge-function, request-response)

**Analog:** `supabase/functions/create-recipe-from-suggestion/index.ts`

**Imports pattern** (lines 1-7):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

**CORS + serve entry pattern** (lines 4-27):
```typescript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  // ...
});
```

**Auth + household lookup pattern** (lines 53-82):
```typescript
const authHeader = req.headers.get("Authorization");
const token = authHeader?.replace("Bearer ", "");
if (!token) {
  return new Response(
    JSON.stringify({ success: false, error: "Authorization required" }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}

const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
if (authError || !user) {
  return new Response(
    JSON.stringify({ success: false, error: "Invalid auth token" }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}

const { data: membership } = await adminClient
  .from("household_members")
  .select("household_id")
  .eq("user_id", user.id)
  .limit(1)
  .single();

if (!membership) {
  return new Response(
    JSON.stringify({ success: false, error: "No household found" }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}
```

**Admin client pattern** (lines 47-51):
```typescript
const adminClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
```

**AI call pattern** (lines 85-103):
```typescript
const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: "...",
    messages: [
      {
        role: "user",
        content: `...`,
      },
    ],
  }),
});
```

**AI JSON parse pattern** (lines 112-131):
```typescript
const aiData = await aiResponse.json();
const aiText = aiData.content?.[0]?.text ?? "";
const jsonMatch = aiText.match(/\{[\s\S]*\}/);

if (!jsonMatch) {
  return new Response(
    JSON.stringify({ success: false, error: "Failed to parse AI recipe" }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}

let generated: GeneratedRecipe;
try {
  generated = JSON.parse(jsonMatch[0]);
} catch {
  return new Response(
    JSON.stringify({ success: false, error: "Invalid AI recipe format" }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}
```

**Recipe INSERT pattern** (lines 133-151):
```typescript
const { data: recipe, error: recipeError } = await adminClient
  .from("recipes")
  .insert({
    name,
    household_id: membership.household_id,
    created_by: user.id,
    servings: generated.servings || 4,
    notes: generated.instructions || null,
  })
  .select("id")
  .single();

if (recipeError || !recipe) {
  return new Response(
    JSON.stringify({ success: false, error: "Failed to create recipe" }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}
```

**recipe_ingredients INSERT pattern** (lines 153-178) — NOTE: import-recipe writes `instructions` JSONB column using RecipeStep[] shape (from generate-recipe-steps analog), not notes string:
```typescript
const ingredients = (generated.ingredients || []).map((ing, i) => ({
  recipe_id: recipe.id,
  ingredient_type: "food" as const,
  ingredient_id: crypto.randomUUID(),
  ingredient_name: ing.name,
  quantity_grams: ing.quantity_grams || 100,
  calories_per_100g: ing.calories_per_100g || 0,
  protein_per_100g: ing.protein_per_100g || 0,
  fat_per_100g: ing.fat_per_100g || 0,
  carbs_per_100g: ing.carbs_per_100g || 0,
  sort_order: i,
}));

if (ingredients.length > 0) {
  const { error: ingError } = await adminClient
    .from("recipe_ingredients")
    .insert(ingredients);
  // ... handle ingError
}
```

**RecipeStep shape** (from `supabase/functions/generate-recipe-steps/index.ts` lines 14-21) — import-recipe MUST write instructions in this shape:
```typescript
interface RecipeStep {
  id: string;          // crypto.randomUUID()
  text: string;
  duration_minutes: number;
  is_active: boolean;
  ingredients_used: string[];
  equipment: string[];
}

// Writing to recipes row (lines 311-318 of generate-recipe-steps):
await adminClient
  .from("recipes")
  .update({
    instructions: withIds,   // RecipeStep[] not string
  })
  .eq("id", recipeId)
  .eq("household_id", householdId);
```

**Step ID assignment pattern** (lines 295-302 of generate-recipe-steps):
```typescript
const withIds: RecipeStep[] = parsed.instructions.map(s => ({
  id: generateStepId(),          // crypto.randomUUID()
  text: String(s.text ?? ""),
  duration_minutes: Number(s.duration_minutes ?? 0),
  is_active: Boolean(s.is_active),
  ingredients_used: Array.isArray(s.ingredients_used) ? s.ingredients_used.map(String) : [],
  equipment: Array.isArray(s.equipment) ? s.equipment.map(String) : [],
}));
```

**Error handling pattern** (lines 185-190):
```typescript
} catch (err) {
  return new Response(
    JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}
```

**CRITICAL DIFFERENCE from analog:** The import function adds these behaviours not present in `create-recipe-from-suggestion`:
1. Deno `fetch()` for blog/YouTube HTML with `AbortController` timeout (10s)
2. YouTube transcript extraction via `ytInitialPlayerResponse` JSON blob in page HTML
3. HTML stripping via regex before sending to AI
4. `source_url` field on the recipes INSERT
5. `instructions` column (RecipeStep[]) written, not `notes` string
6. Household member COUNT query for D-15 servings: `SELECT COUNT(*) FROM household_members WHERE household_id = membership.household_id`
7. Custom food dedup query per D-21: `.from('custom_foods').select('id').eq('household_id', membership.household_id).ilike('name', ingredientName).is('deleted_at', null).limit(1).maybeSingle()`

---

### `supabase/migrations/030_recipe_source_url.sql` (migration, transform)

**Analog:** `supabase/migrations/029_prep_optimisation.sql`

**Migration header pattern** (lines 1-4):
```sql
-- Phase 23: Prep Optimisation
-- Adds rich-step instructions + freezer metadata to recipes, creates cook_sessions table,
-- raises Phase 22 rate limit to 20/day and adds a kind column for per-call reporting.
-- Implements D-01, D-02, D-22, D-23, D-24, D-26, R-01, R-02.
```

**ALTER TABLE ADD COLUMN pattern** (lines 7-10):
```sql
alter table public.recipes
  add column if not exists instructions jsonb,
  add column if not exists freezer_friendly boolean,
  add column if not exists freezer_shelf_life_weeks integer;
```

**For import-recipe migration, copy this pattern:**
```sql
-- Phase 25: Universal Recipe Import
-- Adds source_url column to recipes for attribution (D-11).
-- Implements D-11.

alter table public.recipes
  add column if not exists source_url text;
```

No index needed — `source_url` is display-only, not queried. No RLS changes needed — existing household isolation on `recipes` covers the new column.

---

### `src/components/recipe/ImportRecipeModal.tsx` (component, request-response)

**Analog:** `src/components/inventory/AddInventoryItemModal.tsx`

**Props interface pattern** (lines 6-12):
```typescript
interface AddInventoryItemModalProps {
  isOpen: boolean
  onClose: () => void
  editItem?: InventoryItem | null
  // ...
}
```

**Early-return guard pattern** (line 90):
```typescript
if (!isOpen) return null
```

**Modal shell structure** (lines 142-154) — UI-SPEC mandates this exact shell:
```tsx
return (
  <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 bg-black/40 z-50"
      onClick={onClose}
      aria-hidden="true"
    />

    {/* Panel */}
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6 relative">
        <h2 className="text-lg font-bold text-text mb-4">
          {/* modal title */}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* fields */}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-[--radius-btn] bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Saving…' : 'Add to Inventory'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-text/50 hover:text-text transition-colors px-2 py-2.5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </>
)
```

**Input field CSS pattern** (lines 172-180):
```tsx
<input
  id="inv-food-name"
  type="text"
  value={foodName}
  onChange={e => setFoodName(e.target.value)}
  className="w-full rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
  placeholder="e.g. Chicken breast"
/>
```

**Error state pattern** (lines 290-292):
```tsx
{error && (
  <p className="text-sm text-red-600">{error}</p>
)}
```

**Error handling in submit** (lines 133-137):
```typescript
} catch {
  setError('Could not save this item. Check your connection and try again.')
}
```

**DIFFERENCES for ImportRecipeModal:**
- Use `<textarea>` instead of `<input>` (UI-SPEC: 4 rows min, auto-expand to 8)
- Backdrop `onClick` must be disabled during loading (no close when fetch in-flight)
- Submit button shows inline spinner (`animate-spin`) + "Importing…" when pending
- Modal needs `role="dialog"` `aria-modal="true"` `aria-labelledby` (UI-SPEC accessibility)
- "Import Recipe" button is ghost/outlined variant on RecipesPage: `rounded-[--radius-btn] border border-primary text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/10 transition-colors`

---

### `src/hooks/useImportRecipe.ts` (hook, request-response)

**Analog:** `src/hooks/useRecipeSteps.ts` — specifically `useRegenerateRecipeSteps` (lines 84-118)

**Imports pattern** (lines 1-7):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
```

**Edge function invocation mutation pattern** (lines 90-117):
```typescript
export function useRegenerateRecipeSteps() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useMutation({
    mutationFn: async (params: RegenerateParams): Promise<RegenerateResponse> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')
      const { data, error } = await supabase.functions.invoke('generate-recipe-steps', {
        body: {
          recipeId: params.recipeId,
          householdId,
          // ...
        },
      })
      if (error) throw error
      const response = data as RegenerateResponse
      if (!response.success) {
        throw new Error(response.error ?? 'Step regeneration failed')
      }
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipeSteps.detail(variables.recipeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(variables.recipeId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) })
    },
  })
}
```

**Cache invalidation pattern for import** — after import, invalidate recipes list:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['recipes'] })
}
```
Per `useCreateRecipe` in `useRecipes.ts` line 97 — prefix array `['recipes']` invalidates all recipe queries.

---

### `src/pages/RecipesPage.tsx` (modify — add Import button + modal state)

**Analog:** itself — existing file at `src/pages/RecipesPage.tsx`

**Existing button pattern** (lines 51-57) — "New Recipe" button to copy and adapt for "Import Recipe":
```tsx
<button
  onClick={handleCreate}
  disabled={createRecipe.isPending}
  className="rounded-[--radius-btn] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
>
  {createRecipe.isPending ? 'Creating…' : '+ New Recipe'}
</button>
```

**Import button variant** (ghost/outlined, per UI-SPEC):
```tsx
<button
  onClick={() => setImportModalOpen(true)}
  className="rounded-[--radius-btn] border border-primary text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/10 transition-colors"
>
  Import Recipe
</button>
```

**Header row layout** (lines 46-58) — wrap both buttons in a flex gap container:
```tsx
<div className="mb-6 flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-primary">Recipes</h1>
    <p className="text-sm text-text/60 mt-1">Create and manage your household recipes.</p>
  </div>
  <div className="flex items-center gap-2">
    {/* Import Recipe button */}
    {/* New Recipe button */}
  </div>
</div>
```

**State pattern** (lines 26-27) — add modal open state alongside existing deleteConfirm:
```typescript
const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
// add:
const [importModalOpen, setImportModalOpen] = useState(false)
```

---

### `src/components/recipe/RecipeBuilder.tsx` (modify — add skeleton + source URL)

**Analog:** itself — existing file

**Existing skeleton pattern** (referenced in UI-SPEC line 117) — matches existing inline skeleton in RecipeBuilder:
```tsx
<div className="h-16 rounded-[--radius-card] bg-secondary/50 animate-pulse" />
```

**Loading state key** — skeleton should key on `isPending` from existing hooks already used in RecipeBuilder:
```typescript
const { data: recipe, isPending: recipePending } = useRecipe(recipeId)
const { data: ingredients, isPending: ingredientsPending } = useRecipeIngredients(recipeId)
// skeleton is shown when recipePending || ingredientsPending
```

**Notes display pattern in RecipesPage** (lines 85-87) — source URL attribution follows same `text-xs text-text/40` style:
```tsx
{recipe.notes && (
  <p className="text-xs text-text/40 truncate">{recipe.notes}</p>
)}
```

**Source URL attribution** — position below recipe title/notes, above ingredients:
```tsx
{recipe.source_url && (
  <p className="text-xs text-text/40 mb-3">
    <a
      href={recipe.source_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View original recipe source"
    >
      {(() => {
        try {
          return `Imported from ${new URL(recipe.source_url).hostname}`
        } catch {
          return `Imported from ${recipe.source_url.slice(0, 60)}${recipe.source_url.length > 60 ? '…' : ''}`
        }
      })()}
    </a>
  </p>
)}
```

---

### `src/types/database.ts` (modify — add source_url to Recipe interface)

**Analog:** itself — existing file

**Existing Recipe interface** (lines 74-87):
```typescript
export interface Recipe {
  id: string
  household_id: string
  created_by: string
  name: string
  servings: number
  notes: string | null
  instructions: RecipeStep[] | null
  freezer_friendly: boolean | null
  freezer_shelf_life_weeks: number | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}
```

**Add after `notes`:**
```typescript
  source_url: string | null
```

No separate Insert/Update interface exists in this file — the single `Recipe` interface covers all shapes.

---

## Shared Patterns

### Authentication (all edge functions)
**Source:** `supabase/functions/create-recipe-from-suggestion/index.ts` lines 52-82
**Apply to:** `supabase/functions/import-recipe/index.ts`
```typescript
// Identity comes from JWT only — never from request body (L-013)
const authHeader = req.headers.get("Authorization");
const token = authHeader?.replace("Bearer ", "");
const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
```

### CORS Response Headers (all edge functions)
**Source:** `supabase/functions/create-recipe-from-suggestion/index.ts` lines 4-7
**Apply to:** `supabase/functions/import-recipe/index.ts`
```typescript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// All responses must spread: { ...CORS_HEADERS, "Content-Type": "application/json" }
```

### Success/Error Response Envelope (all edge functions)
**Source:** `supabase/functions/create-recipe-from-suggestion/index.ts` lines 181-183
**Apply to:** `supabase/functions/import-recipe/index.ts`
```typescript
// Always status 200, success/error in body — never use 4xx/5xx status
return new Response(
  JSON.stringify({ success: true, recipeId: recipe.id }),
  { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
);
```

### TanStack Query cache invalidation (all mutations)
**Source:** `src/hooks/useRecipes.ts` lines 96-98
**Apply to:** `src/hooks/useImportRecipe.ts`
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['recipes'] })
}
```

### Hook session + household guard (all mutation hooks that call edge functions)
**Source:** `src/hooks/useRecipeSteps.ts` lines 91-93
**Apply to:** `src/hooks/useImportRecipe.ts`
```typescript
if (!session) throw new Error('Not authenticated')
if (!householdId) throw new Error('No household found')
```

### Modal error state (all modal components)
**Source:** `src/components/inventory/AddInventoryItemModal.tsx` lines 43, 290-292, 133-137
**Apply to:** `src/components/recipe/ImportRecipeModal.tsx`
```typescript
const [error, setError] = useState<string | null>(null)
// In submit catch: setError('...')
// In JSX: {error && <p className="text-sm text-red-600">{error}</p>}
```

### `queryKeys.recipes.*` key shapes
**Source:** `src/lib/queryKeys.ts` lines 12-16
**Apply to:** All recipe-related cache invalidations in `useImportRecipe.ts`
```typescript
recipes: {
  list: (householdId: string | undefined) => ['recipes', householdId] as const,
  detail: (id: string) => ['recipe', id] as const,
  ingredients: (recipeId: string) => ['recipe-ingredients', recipeId] as const,
},
```

---

## No Analog Found

All files have analogs. No entries in this section.

---

## Metadata

**Analog search scope:** `supabase/functions/`, `src/components/recipe/`, `src/components/inventory/`, `src/hooks/`, `src/pages/`, `src/types/`, `supabase/migrations/`, `tests/`
**Files scanned:** 14
**Pattern extraction date:** 2026-04-16
