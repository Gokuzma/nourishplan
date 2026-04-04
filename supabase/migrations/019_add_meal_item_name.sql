-- Add item_name column to meal_items so the UI can display the food name
-- instead of showing the raw item_id.
ALTER TABLE public.meal_items ADD COLUMN item_name text NOT NULL DEFAULT '';
