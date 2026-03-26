-- Inventory items table for household pantry/fridge/freezer tracking

CREATE TABLE public.inventory_items (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id             uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  added_by                 uuid NOT NULL REFERENCES auth.users(id),
  food_name                text NOT NULL,
  brand                    text,
  food_id                  text,
  quantity_remaining       numeric NOT NULL CHECK (quantity_remaining >= 0),
  unit                     text NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'L', 'units')),
  storage_location         text NOT NULL CHECK (storage_location IN ('pantry', 'fridge', 'freezer')),
  is_opened                boolean NOT NULL DEFAULT false,
  is_staple                boolean NOT NULL DEFAULT false,
  purchased_at             date NOT NULL DEFAULT CURRENT_DATE,
  expires_at               date,
  purchase_price           numeric CHECK (purchase_price >= 0),
  removed_at               timestamptz,
  removed_reason           text CHECK (removed_reason IN ('used', 'discarded')),
  is_leftover              boolean NOT NULL DEFAULT false,
  leftover_from_recipe_id  uuid,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_inventory_items_household
  ON public.inventory_items (household_id)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_expiry
  ON public.inventory_items (household_id, expires_at)
  WHERE removed_at IS NULL;

-- Row Level Security
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members read inventory_items"
  ON public.inventory_items FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM public.household_members
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "household members insert inventory_items"
  ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
    AND added_by = (SELECT auth.uid())
  );

-- Any household member can update any item (not restricted to added_by)
-- per Research Pitfall 5: household items are shared resources
CREATE POLICY "household members update inventory_items"
  ON public.inventory_items FOR UPDATE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM public.household_members
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
