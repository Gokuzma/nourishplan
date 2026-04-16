# Phase 25: Universal Recipe Import - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 25-universal-recipe-import
**Areas discussed:** Entry point & flow, Source handling, Review before save, Nutrition accuracy

---

## Entry Point & Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Button on RecipesPage | Add an 'Import Recipe' button alongside existing recipe list | ✓ |
| Dedicated import page | New route like /recipes/import with a full-page form | |
| Floating action button | Persistent FAB accessible from multiple pages | |

**User's choice:** Button on RecipesPage
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Loading state in modal | Show progress indicator in the same modal | |
| Navigate to RecipeBuilder | Navigate with loading skeleton, fields fill in as AI responds | ✓ |
| Background with notification | Process in background, notify when done | |

**User's choice:** Navigate to RecipeBuilder
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Single text field | One input that auto-detects URL vs raw text | |
| Tabbed input | Tabs for 'Paste URL' and 'Paste Text' | |
| Minimal button → modal | Import button opens a modal with input field | ✓ |

**User's choice:** Minimal button → modal
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Primary action button | Visible alongside 'Create Recipe' button | ✓ |
| Secondary/subtle | Smaller link or icon near recipe list header | |
| Inside a menu | Under a '+' or '...' menu | |

**User's choice:** Primary action button
**Notes:** None

---

## Source Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect | System checks if input is URL or raw text | ✓ |
| User selects type | Dropdown for 'Blog URL', 'YouTube URL', 'Paste text' | |

**User's choice:** Auto-detect
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Transcript extraction | Fetch video transcript via YouTube API, AI parses recipe | ✓ |
| Description + metadata only | Extract from video description and title | |
| User pastes transcript | User manually copies transcript | |

**User's choice:** Transcript extraction
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side fetch in edge function | Edge function fetches URL, sends to AI | ✓ |
| Client-side fetch with proxy | Browser fetches via CORS proxy | |

**User's choice:** Server-side fetch in edge function
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Defer Instagram | Support blog URLs, YouTube, and raw text first | ✓ |
| Best-effort Instagram | Try to fetch public Instagram posts | |

**User's choice:** Defer Instagram
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Single unified prompt | One prompt handles all source types | ✓ |
| Specialized prompts per source | Different system prompts per source type | |

**User's choice:** Single unified prompt
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Extract if present, AI fallback | Check for JSON-LD first, fall back to AI | |
| Always use AI | Send full content to AI regardless | ✓ |
| JSON-LD only | Only import from blogs with structured data | |

**User's choice:** Always use AI
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Clear error + suggest raw text | Friendly error, suggest manual paste | ✓ |
| Silent retry then error | Retry once, then show error | |
| Partial result with warnings | Show whatever AI could extract with warnings | |

**User's choice:** Clear error + suggest raw text
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Store source URL | Save original URL on recipe record | ✓ |
| Don't track source | Treat imported recipes same as manual | |

**User's choice:** Store source URL
**Notes:** None

---

## Review Before Save

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-save as draft | Recipe created immediately, user edits in RecipeBuilder | ✓ |
| Preview first, save on confirm | Read-only preview before saving | |
| Save immediately, no review | Straight to library, edit later | |

**User's choice:** Auto-save as draft
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle 'Imported' badge | Small badge on recipe card | |
| No distinction | Imported recipes look identical | |
| Source link on recipe detail | Recipe detail shows 'Imported from [URL]' | ✓ |

**User's choice:** Source link on recipe detail
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Extract both ingredients and steps | AI parses ingredients AND cooking instructions | ✓ |
| Ingredients only | Only extract ingredients and macros | |

**User's choice:** Extract both ingredients and steps
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Set servings = household member count | Recipe servings match household size | ✓ |
| AI calculates custom servings per family | AI reads household calorie targets | |
| Use source recipe's servings as-is | Keep original serving count | |

**User's choice:** Set servings = household member count
**Notes:** User emphasized "serving should always be for the family calorie count!" — portioning system (Phase 24) handles per-person adjustments.

---

## Nutrition Accuracy

| Option | Description | Selected |
|--------|-------------|----------|
| AI estimates macros per ingredient | AI provides per-100g macros, same as create-recipe-from-suggestion | ✓ |
| Match ingredients to USDA/CNF | Look up ingredients in food databases | |
| Use source page nutrition | Use blog's nutrition info if available | |

**User's choice:** AI estimates macros per ingredient
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| No indicator | Treat AI-estimated nutrition same as any recipe | ✓ |
| Subtle 'AI estimated' note | Small note on nutrition display | |
| Accuracy warning banner | Yellow warning banner in RecipeBuilder | |

**User's choice:** No indicator
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| AI converts to grams | All quantities in grams regardless of source format | ✓ |
| Preserve original units | Keep original measurement units | |

**User's choice:** AI converts to grams
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Create custom food with AI estimates | Create custom_food entry with AI macros | ✓ |
| Skip unknown ingredients | Omit ingredients AI can't classify | |
| Flag for manual lookup | Add with zero macros, mark for lookup | |

**User's choice:** Create custom food with AI estimates
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Apply yield factors | Use existing YIELD_FACTORS, AI categorizes ingredients | ✓ |
| Skip yield factors | Import at face value without conversion | |
| You decide | Claude's discretion | |

**User's choice:** Apply yield factors
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| No dedup | Create fresh custom_food entries each time | |
| Match existing custom foods | Check for existing custom_food by name, reuse | ✓ |

**User's choice:** Match existing custom foods
**Notes:** User chose this to keep the food library clean and avoid duplicates.

---

## Claude's Discretion

- Loading skeleton design in RecipeBuilder during import
- Error state design in the import modal
- Exact AI prompt engineering and response parsing
- YouTube transcript API approach
- Edge function timeout and retry strategy

## Deferred Ideas

- Instagram recipe import — requires auth/API access, too fragile for v1
- JSON-LD/Schema.org structured data extraction as fast path
- USDA/CNF database matching for imported ingredients
