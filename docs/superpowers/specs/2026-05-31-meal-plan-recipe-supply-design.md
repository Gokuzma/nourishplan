# Sensible Meal Plans via Recipe Supply + De-Wildcarding

**Date:** 2026-05-31
**Status:** Approved (design)
**Author:** brainstorming session

## Problem

The AI plan generator places slot-inappropriate recipes — e.g. "Perfect Ramen Eggs"
(tagged `Dinner`) assigned to a **Breakfast** slot.

Investigation of the live OKC household (121 recipes) found the root cause:

| Slot | Recipes tagged |
|------|----------------|
| Dinner | 69 |
| Lunch | 17 |
| Snacks | 11 |
| **Breakfast** | **6** (two are dessert-ish: Lactation Cookies, Cornbread Muffins) |
| Untagged (`meal_types = []`, eligible anywhere) | 31 |

Two compounding causes:

1. **Thin supply.** Only ~4 genuine breakfast recipes for 7 weekly breakfast slots.
   The generator's documented fallback is "use a non-matching recipe when no
   slot-matching recipe is available" — so it pulls Dinner recipes into Breakfast.
2. **Wildcards.** 31 legacy untagged recipes are treated as eligible for *any* slot,
   polluting Breakfast further.

Slot-matching in `generate-plan` is only a **soft preference** (a prompt instruction),
not a hard filter. Per the approved approach we keep the soft preference and instead
fix **supply** and remove **wildcards** so the existing logic has good options.

### Key code findings

- `supabase/functions/create-recipe-from-suggestion/index.ts` already generates a
  complete recipe (servings, instructions, ingredients with per-100g nutrition) from a
  name + description — **but it does not set `meal_types`**. Recipes it creates become
  untagged wildcards. This is a latent bug and a likely source of some of the 31 untagged.
- `supabase/functions/import-recipe/index.ts` **does** tag `meal_types` with good rules
  ("Never put soups, stews, curries, or chili in Breakfast"). New imports are fine; the
  31 untagged are legacy (pre-tagging).
- `generate-plan` already emits `suggestedRecipes` for slots it cannot fill and there is a
  `create-recipe-from-suggestion` path to turn suggestions into real recipes.

## Goals

- Plans stop placing nonsensical meals (no Dinner recipes at Breakfast).
- Every household has enough slot-appropriate recipes to fill a week without forced misplacement.
- New AI-created recipes are always correctly slot-tagged.

## Non-goals

- Rewriting the generator's selection logic into a hard filter (explicitly rejected — keep
  soft preference; lunch/dinner leftover sharing stays valid).
- Hand-authoring a fixed seed recipe library (chose AI-generated supply instead).

## Approach (approved)

AI-generated recipe supply + classify legacy untagged recipes; keep the generator's
soft-preference logic.

### Component A — Slot-aware recipe generator (supply engine)

Extend `create-recipe-from-suggestion` into a slot-aware, batch-capable generator.

- **Inputs:** target slot (`Breakfast | Lunch | Dinner | Snacks`) + count `N`.
- **Behavior:** one AI call returns `N` distinct, slot-appropriate complete recipes
  (name, ingredients with per-100g nutrition, instructions, **and `meal_types` set to the
  target slot**).
- **Bug fix:** always set `meal_types` on created recipes (no new wildcards).
- **Nutrition sanity check:** reject or clamp implausible per-100g values
  (e.g. calories outside ~0–900/100g, macros outside 0–100g/100g) before insert.
- Backward compatible: the existing single-recipe `{ name, description }` path keeps
  working and gains `meal_types` tagging.

### Component B — Three triggers

- **B1 — "Fill recipe gaps" button** (Recipes page). Detects under-supplied slots,
  generates a batch via (A), shows the generated list for **review**, user saves.
  Fixes existing households (OKC) immediately.
- **B2 — Auto during plan generation.** In `generate-plan`, when a slot has fewer than the
  threshold of matching candidates, top up via (A) before assigning — replacing the
  current "suggest but leave gap" path with "create + tag + assign."
- **B3 — Auto-seed on new-household setup.** Generate a starter batch
  (breakfast/lunch/snack-weighted) when a household is created.

### Component C — Classify legacy untagged recipes (cleanup)

One-time AI backfill of `meal_types` for recipes where `meal_types = []`, reusing
`import-recipe`'s classification prompt/rules. After this, no recipe is a wildcard.
Scope: all households (the migration/backfill is global), not just OKC.

### Component D — Generator logic

Unchanged soft-preference prompt. The only addition is the threshold check that triggers
B2. Quality improvement comes from supply (A/B) + no wildcards (C).

## Decisions / defaults

- **Under-supplied threshold:** target ≥ 7 recipes per primary slot
  (Breakfast/Lunch/Dinner), ≥ 5 for Snacks — so a week needn't repeat.
- **Manual button (B1):** review before save (AI nutrition varies → user approves).
- **Batch generation:** one AI call per slot returning `N` recipes (cheaper/faster than N calls).
- **Nutrition guardrail:** validate per-100g ranges; drop or clamp out-of-range values.

## Phasing

- **Phase 1 — immediate fix:** A + C + B1.
  Classify the 31 untagged, ship the "Fill gaps" button, regenerate the OKC plan.
- **Phase 2 — automation:** B2 + B3.

## Affected areas

- `supabase/functions/create-recipe-from-suggestion/` — extend (slot, batch, meal_types, validation).
- `supabase/functions/generate-plan/` — threshold hook (Phase 2 / B2).
- New backfill (script or one-off function) for Component C.
- Frontend: Recipes page "Fill recipe gaps" UI + review modal (B1); setup flow seed (B3).
- Hooks/query keys for recipes (cache invalidation after generation).

## Testing

- Unit: nutrition sanity-check clamps/rejects out-of-range values; meal_types always set.
- Unit: under-supply detection counts per-slot eligibility correctly (tagged + untagged
  handling after classification).
- Integration: B1 generates N breakfast recipes, all tagged `Breakfast`, inserted with
  ingredients; regenerating a plan no longer places non-breakfast recipes in breakfast
  when supply ≥ threshold.
- Backfill (C): every previously-untagged recipe ends with a non-empty, valid `meal_types`.

## Risks

- **AI nutrition accuracy** — mitigated by the sanity check and review-before-save (B1).
- **Token/latency cost** of batch generation — mitigated by single-call-per-slot batching
  and only generating to reach the threshold.
- **Classification mistakes** on backfill (C) — acceptable; user can re-tag, and it is
  strictly better than untagged wildcards.
