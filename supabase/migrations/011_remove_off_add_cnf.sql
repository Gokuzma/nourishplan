-- Migration: Remove OFF-sourced data, prepare for CNF integration
-- OFF (Open Food Facts) data is identified by item_type = 'off' in food_logs.
-- This is a dev/demo database — destructive cleanup is acceptable.

-- Remove food log entries that came from Open Food Facts
-- OFF item IDs are barcodes (numeric strings, typically 8-13 digits)
-- and the item_type would be 'off'. Since item_type is free-text in food_logs,
-- we delete where item_type = 'off'.
DELETE FROM food_logs WHERE item_type = 'off';

-- Note: recipe_ingredients and meal_items do not store a source/type field
-- that reliably identifies OFF-sourced foods — they store ingredient_id as text
-- which could be a UUID (custom food), USDA numeric ID, or OFF barcode.
-- OFF barcodes are not distinguishable from USDA IDs by format alone,
-- so we cannot safely delete recipe/meal references without risking false positives.
-- No action taken on recipe_ingredients or meal_items.
