-- 042: ready meals in inventory + honest "Eat" slot fills in the meal plan

alter table public.inventory_items
  add column is_ready_meal boolean not null default false,
  add column ready_meal_slots text[] check (ready_meal_slots <@ array['Breakfast', 'Lunch', 'Dinner', 'Snacks']),
  add column serving_grams numeric check (serving_grams > 0),
  add column serving_calories numeric check (serving_calories >= 0),
  add column serving_protein_g numeric check (serving_protein_g >= 0),
  add column serving_carbs_g numeric check (serving_carbs_g >= 0),
  add column serving_fat_g numeric check (serving_fat_g >= 0),
  add column nutrition_source text check (nutrition_source in ('estimate', 'barcode'));

alter table public.meal_plan_slots
  add column fill_source text check (fill_source in ('leftover', 'ready_meal', 'make_ahead')),
  add column fill_note text check (char_length(fill_note) <= 120),
  add column extra_portions integer not null default 0 check (extra_portions >= 0);
