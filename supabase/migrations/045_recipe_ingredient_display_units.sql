-- 045: recipe ingredients read like a normal recipe ("2 eggs", "1 cup rice").
-- quantity_grams stays the source of truth for nutrition, cost and inventory;
-- these two columns are display only. display_unit '' = a count of the named
-- food ("2" eggs); null = not converted yet (shown in grams).

alter table public.recipe_ingredients
  add column display_amount numeric check (display_amount > 0),
  add column display_unit text check (char_length(display_unit) <= 30);
