-- Migration 007: Change ingredient_id from uuid to text
-- Purpose: Allow external food IDs (USDA numeric fdcId, Open Food Facts barcode strings)
-- to be stored as recipe ingredient references alongside existing custom food UUIDs.
-- Existing UUID values are preserved as text strings — no data loss.

ALTER TABLE public.recipe_ingredients
  ALTER COLUMN ingredient_id TYPE text USING ingredient_id::text;
