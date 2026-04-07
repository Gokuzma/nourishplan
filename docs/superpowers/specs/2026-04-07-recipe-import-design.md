# Recipe Import — Design Spec

## Summary

Universal recipe import: paste a URL (YouTube, Instagram, blog, etc.) or raw text, and the AI extracts a complete recipe with ingredients, macros, and cooking instructions.

## UI

**Entry point:** "Import Recipe" button on the Recipes page, next to the existing "New Recipe" button.

**Modal:**
- Single textarea: "Paste a URL or recipe text"
- Submit button: "Import"
- Loading state: spinner + "Importing recipe..."
- Success: navigate to `/recipes/{id}` (recipe builder with everything populated)
- Error: inline error message in the modal

## Edge Function: `import-recipe`

Single Supabase edge function. Auth: Bearer token + household membership check (same as existing functions).

### Flow

1. **Detect input type** — URL (starts with `http`) vs raw text
2. **If URL:** fetch page HTML via `fetch()`, strip tags to plain text (limit ~10k chars). For YouTube URLs, extract video ID and fetch transcript via YouTube's timedtext API.
3. **Send to Claude Haiku** with system prompt to extract recipe as structured JSON:
   - `name`: string
   - `servings`: number
   - `instructions`: string (numbered steps)
   - `ingredients`: array of `{ name, quantity_grams, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g }`
4. **Create recipe** in `recipes` table (name, servings, notes=instructions, household_id, created_by)
5. **Create ingredients** in `recipe_ingredients` table with macro snapshots
6. **Return** `{ success: true, recipeId: string }`

### URL Handling

| Source | Strategy |
|--------|----------|
| Blog/website | Fetch HTML, strip to text |
| YouTube | Extract video ID, fetch auto-generated transcript |
| Instagram | Fetch page HTML, extract caption/text |
| Raw text | Pass directly to AI |

### Error Cases

- URL fetch fails (403, timeout) → return `{ success: false, error: "Could not fetch URL content" }`
- AI can't parse a recipe from content → return `{ success: false, error: "Could not find a recipe in that content" }`
- DB insert fails → return `{ success: false, error: "Failed to save recipe" }`

## Data Model

No schema changes needed. Uses existing:
- `recipes` (name, servings, notes, household_id, created_by)
- `recipe_ingredients` (recipe_id, ingredient_name, quantity_grams, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, ingredient_type, sort_order)

## Success Criteria

- User can paste a blog URL and get a complete recipe with ingredients and macros
- User can paste raw recipe text and get the same result
- User can paste a YouTube cooking video URL and get a recipe extracted from the transcript
- Recipe appears in the recipe builder ready to edit
- No new database tables or migrations required
