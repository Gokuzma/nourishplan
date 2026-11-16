# Ready meals and real "Eat" slots — design

## Why
Plan slots marked **Eat** ("leftovers or already-prepped food") showed a "USE UP"
chip on recipes nobody had cooked. In week one nothing has been batch-cooked, yet the
freezer is full of ready meals (Mexican Beef Rice ×4, breakfast burritos, pizza,
nuggets, fish sticks…) that the planner never uses, because it only plans recipes.

## Goals
- An Eat slot only ever shows food that will actually exist: leftovers of a meal
  cooked earlier that week, or a ready meal in inventory. Otherwise it is honestly
  labelled make-ahead.
- Week one works without any prior batch cooking (ready meals first).
- Ready meals carry estimated nutrition so plan calories stay meaningful.

## Non-goals
- Auto-deducting inventory when a planned ready meal is eaten.
- Changing how recipes are chosen for Cook/Batch/Quick slots by the AI.

## User-approved decisions
- Eat-slot fill order: (1) leftovers of a cooked meal 1–3 days earlier in the week,
  (2) a slot-appropriate ready meal from inventory, (3) a make-ahead recipe.
- Labels: `LEFTOVERS · from Mon dinner`; the source meal gets `+N PORTION(S)`;
  `FROM FREEZER · 4 left` (or FRIDGE/PANTRY); `MAKE AHEAD`. "USE UP" is removed.
- Quick slots may use a ready meal.
- Inventory gets a **Ready meal** flag; bulk add detects it; the user can toggle it;
  existing inventory gets a suggested list the user confirms.
- Ready meals without barcode data get AI-estimated calories/macros per serving,
  shown as estimates.
- Ready meals pass the pregnancy banned-term filter by name.

## Design
**Schema (migration 042, additive):**
- `inventory_items`: `is_ready_meal bool not null default false`,
  `ready_meal_slots text[]` (Breakfast/Lunch/Dinner/Snacks), `serving_grams numeric`
  (weight-based items only), `serving_calories`, `serving_protein_g`,
  `serving_carbs_g`, `serving_fat_g numeric`, `nutrition_source text`
  ('estimate' | 'barcode').
- `meal_plan_slots`: `fill_source text` ('leftover' | 'ready_meal' | 'make_ahead'),
  `fill_note text`, `extra_portions int not null default 0`.

**Servings:** a `units` item has one serving per unit; a weight item has
`quantity / serving_grams` servings (default 350 g). A slot needs one serving per
member not away. A ready meal is used only if enough servings remain (tracked across
the week as the plan consumes them).

**Planner (deterministic post-pass, pure function in `_shared/eatSlotFill.ts`):**
walk slots in time order. For an Eat slot: take the latest Cook/Batch slot 1–3 days
earlier with a recipe and compatible type (Breakfast↔Breakfast, Lunch/Dinner↔
Lunch/Dinner, Snacks↔Snacks); a Cook source feeds at most 1 Eat slot, a Batch source
at most 3. Else a ready meal whose slots include this slot type, enough servings,
not pregnancy-unsafe, preferring the one expiring soonest, then most servings. Else
keep the AI's recipe as make-ahead. Quick slots that the AI left empty may take a ready meal.
A ready meal is written as a `meals` row (name = item name) with one `food`
meal_item whose per-100g fields hold per-serving values at quantity 100 g, so the
existing kcal display shows kcal per serving.

**Manual edits** to a slot clear `fill_source`, `fill_note` and `extra_portions`.

**Detection/estimation:** `parse-inventory` returns `is_ready_meal`,
`ready_meal_slots` and per-serving estimates for ready meals. A new
`classify-inventory` function proposes ready meals + estimates for existing items;
the Inventory page shows a review list to confirm.

## Builder's calls (made during implementation)
- A same-day source counts (Tuesday lunch cooked extra can be Tuesday dinner).
- Labels read `From freezer` with the servings used in the tooltip; `+N portions`
  counts the people eating the leftovers.
- Ready meals also skip allergens/won't-eats by name, expired items, and past days.
- Counted ready meals carry `servings_per_unit` (migration 043): a frozen pizza ~3.
- Ready-meal meals use a food item `ready:<inventory id>` and are kept off the
  shopping list.

## Left to the builder
Exact copy, chip colours, prompt wording, the default serving size constant.
