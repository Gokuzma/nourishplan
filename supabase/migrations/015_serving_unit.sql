-- Add serving_unit column to food_logs for CALC-03
-- Nullable: null means legacy entry, display as "serving"
ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS serving_unit TEXT;
