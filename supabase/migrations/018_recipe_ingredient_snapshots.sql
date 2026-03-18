-- Store ingredient nutrition snapshots in recipe_ingredients so macros
-- survive page refresh for USDA/CNF foods (which have no server-side storage).
ALTER TABLE public.recipe_ingredients
  ADD COLUMN IF NOT EXISTS ingredient_name text,
  ADD COLUMN IF NOT EXISTS calories_per_100g numeric,
  ADD COLUMN IF NOT EXISTS protein_per_100g numeric,
  ADD COLUMN IF NOT EXISTS fat_per_100g numeric,
  ADD COLUMN IF NOT EXISTS carbs_per_100g numeric,
  ADD COLUMN IF NOT EXISTS micronutrients jsonb;
