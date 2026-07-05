# NourishPlan — open work handoff

## Status (2026-04-27)

All five "broken flow" surfaces from the prior handoff are green in prod (`nourishplan.gregok.ca`):

| Flow | Status | Fix |
|---|---|---|
| Generate plan | ✅ working | already fixed prior session (column rename) |
| Slot kcal display | ✅ fixed | edge fn now also inserts the recipe `meal_items` row (commit `5007ebf`) |
| Grocery list | ✅ working | backend was fine; cache invalidation gap fixed (commit `9c8ddbd`) |
| Batch prep | ✅ fixed | function deployed (was missing); `max_tokens` 4096→8192 (commit `0278946`) |
| Cook from slot | ✅ working | navigation, recipe load, resume/start prompt all functional |

Stacy's Apr 26 plan was regenerated end-to-end after the meal_items fix; every slot card now shows real kcal numbers (125 / 306 / 607 / 1234 etc.).

Lessons logged: `L-033` (meals must wrap recipe meal_items), `L-034` (edge fn CORS = undeployed), `L-035` (TanStack invalidations must cover every prefix).

---

## Still open — feature work (not bugs)

### A. Searchable + slot-prioritized recipe picker — ✅ DONE 2026-07-05

Shipped as part of the recipe discovery + selector work (commit `5383f96`), with
per-serving macros on each row via `useRecipeMacros`. See
`docs/superpowers/specs/2026-07-05-recipe-discovery-and-selector.md`.
**Deploy note**: `recipe-supply` edge fn (new `discover` mode) is deployed; the
frontend still needs `npx vercel --prod` — the stored Vercel token expired and
needs an interactive `npx vercel login` first.

### B. View-and-cook a planned recipe (scaled to household + per-member nutrition)

**Current state**: filled SlotCard already has a "Cook this meal" icon (works). User wants a separate "View recipe" affordance: see the recipe's ingredients/steps, scaled from `recipe.servings` to `household.member_count`, with a per-member nutrition card.

**Changes**:
1. Add a "View recipe" button to `OccupiedSlotCard` (in `src/components/plan/SlotCard.tsx`, near the existing Cook icon at line 215). Resolve the recipe id via `slot.meals?.meal_items?.find(mi => mi.item_type === 'recipe')?.item_id` and `navigate(\`/recipes/\${recipeId}\`)`.
2. On `RecipePage.tsx`, add a "scale to household" toggle that multiplies `recipe_ingredients[].quantity_grams` by `household.member_count / recipe.servings`.
3. Add a per-member nutrition card showing each member's per-serving calories/macros against their `nutrition_targets`.

---

## Reference

- Test account: `claude-test@nourishplan.test` / `ClaudeTest!2026`
- Stacy's household ID: `b7322b95-4917-43bf-a3a9-10f4378f7524`
- Schema: `supabase/migrations/`
- Lessons: `lessons.md` (project root)
- Last deploy: `dpl_H4j3KgPEfcfs2PxzTxzkyQNtT6wC` (Vercel) + `generate-plan` v18, `compute-batch-prep` v2 (Supabase Functions)
