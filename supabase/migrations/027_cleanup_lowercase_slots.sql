-- Clean up duplicate lowercase slot_name rows created by generate-plan edge function bug.
-- The frontend uses capitalized names (Breakfast, Lunch, Dinner, Snacks) but the
-- edge function was normalizing to lowercase, creating duplicate rows.
-- Keep the capitalized rows, delete the lowercase duplicates.

DELETE FROM public.meal_plan_slots
WHERE slot_name IN ('breakfast', 'lunch', 'dinner', 'snacks')
  AND EXISTS (
    SELECT 1 FROM public.meal_plan_slots AS keep
    WHERE keep.plan_id = meal_plan_slots.plan_id
      AND keep.day_index = meal_plan_slots.day_index
      AND keep.slot_name = INITCAP(meal_plan_slots.slot_name)
  );

-- For any remaining lowercase-only rows (no capitalized counterpart), capitalize them
UPDATE public.meal_plan_slots
SET slot_name = INITCAP(slot_name)
WHERE slot_name = LOWER(slot_name)
  AND slot_name IN ('breakfast', 'lunch', 'dinner', 'snacks');
