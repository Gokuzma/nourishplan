-- Inventory consolidation marks duplicate rows as merged (their quantity moves
-- to the surviving row) — distinct from 'used'/'discarded' so waste analytics
-- stay honest.
ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_removed_reason_check;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_removed_reason_check CHECK (removed_reason IN ('used', 'discarded', 'merged'));
