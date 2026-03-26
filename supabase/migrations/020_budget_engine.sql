-- 1. Add weekly_budget to households
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS weekly_budget numeric;

-- 2. Global food price lookup table
CREATE TABLE IF NOT EXISTS public.food_prices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  food_id      text NOT NULL,
  food_name    text NOT NULL,
  store        text NOT NULL DEFAULT '',
  cost_per_100g numeric NOT NULL CHECK (cost_per_100g >= 0),
  created_by   uuid NOT NULL REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, food_id, store)
);

ALTER TABLE public.food_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members read food_prices"
  ON public.food_prices FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM public.household_members
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "household members insert food_prices"
  ON public.food_prices FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "household members update food_prices"
  ON public.food_prices FOR UPDATE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM public.household_members
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "household members delete food_prices"
  ON public.food_prices FOR DELETE TO authenticated
  USING (household_id IN (
    SELECT household_id FROM public.household_members
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE TRIGGER food_prices_updated_at
  BEFORE UPDATE ON public.food_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Add cost column to food_logs (for takeout tracking per D-14)
ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS cost numeric;

-- 4. Spend log table (cook events per D-13)
CREATE TABLE IF NOT EXISTS public.spend_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  logged_by    uuid NOT NULL REFERENCES auth.users(id),
  log_date     date NOT NULL,
  week_start   date NOT NULL,
  source       text NOT NULL CHECK (source IN ('cook', 'food_log')),
  recipe_id    uuid,
  amount       numeric NOT NULL CHECK (amount >= 0),
  is_partial   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spend_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members read spend_logs"
  ON public.spend_logs FOR SELECT TO authenticated
  USING (household_id IN (
    SELECT household_id FROM public.household_members
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "household members insert spend_logs"
  ON public.spend_logs FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
    AND logged_by = (SELECT auth.uid())
  );
