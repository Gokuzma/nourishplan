-- Add meal-slot tags to recipes so the planner can prefer breakfast-friendly
-- recipes for Breakfast slots (and not assign Cabbage Soup at 7am).
-- Array because some recipes legitimately fit multiple slots (frittata = breakfast OR brunch).
-- Empty array = no preference; planner treats it as eligible for any slot.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS meal_types text[] NOT NULL DEFAULT '{}';

-- Partial index for fast slot-match lookup. Postgres GIN handles array containment well.
CREATE INDEX IF NOT EXISTS recipes_meal_types_idx
  ON public.recipes USING GIN (meal_types);

COMMENT ON COLUMN public.recipes.meal_types IS
  'Meal slots this recipe is appropriate for. Values: Breakfast | Lunch | Dinner | Snacks. Empty = unrestricted.';
