-- Grocery list tables for auto-generated weekly grocery lists

-- grocery_lists: one snapshot per household per week
CREATE TABLE IF NOT EXISTS public.grocery_lists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start   date NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE (household_id, week_start)
);

ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members read grocery_lists"
  ON public.grocery_lists FOR SELECT TO authenticated
  USING (household_id = get_user_household_id());

CREATE POLICY "household members insert grocery_lists"
  ON public.grocery_lists FOR INSERT TO authenticated
  WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "household members update grocery_lists"
  ON public.grocery_lists FOR UPDATE TO authenticated
  USING (household_id = get_user_household_id());

CREATE POLICY "household members delete grocery_lists"
  ON public.grocery_lists FOR DELETE TO authenticated
  USING (household_id = get_user_household_id());

-- grocery_items: line items (generated + manual)
-- household_id is denormalized for RLS efficiency (avoids join to grocery_lists on every row-level check)
CREATE TABLE IF NOT EXISTS public.grocery_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id           uuid NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  household_id      uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  food_name         text NOT NULL,
  food_id           text,
  quantity          numeric,
  unit              text,
  category          text NOT NULL DEFAULT 'Other',
  category_source   text NOT NULL DEFAULT 'auto',
  is_checked        boolean NOT NULL DEFAULT false,
  checked_by        uuid REFERENCES auth.users(id),
  checked_at        timestamptz,
  is_manual         boolean NOT NULL DEFAULT false,
  is_staple_restock boolean NOT NULL DEFAULT false,
  estimated_cost    numeric,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members read grocery_items"
  ON public.grocery_items FOR SELECT TO authenticated
  USING (household_id = get_user_household_id());

CREATE POLICY "household members insert grocery_items"
  ON public.grocery_items FOR INSERT TO authenticated
  WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "household members update grocery_items"
  ON public.grocery_items FOR UPDATE TO authenticated
  USING (household_id = get_user_household_id());

CREATE POLICY "household members delete grocery_items"
  ON public.grocery_items FOR DELETE TO authenticated
  USING (household_id = get_user_household_id());

-- Enable Supabase realtime for grocery_items (required for live sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_items;

-- set_updated_at trigger on grocery_items (reuses existing function from foundation migration)
CREATE TRIGGER set_grocery_items_updated_at
  BEFORE UPDATE ON public.grocery_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
