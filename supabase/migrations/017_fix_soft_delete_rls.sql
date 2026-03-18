-- Fix soft-delete RLS: UPDATE WITH CHECK must allow setting deleted_at.
-- Without explicit WITH CHECK, PostgreSQL defaults to USING, which can
-- conflict with SELECT policies that require deleted_at IS NULL.
-- Adding WITH CHECK (true) allows any column values after USING passes.

-- recipes
DROP POLICY IF EXISTS "creator or admin updates recipes" ON public.recipes;
CREATE POLICY "creator or admin updates recipes"
  ON public.recipes FOR UPDATE TO authenticated
  USING (
    created_by = (select auth.uid())
    OR (
      household_id = public.get_user_household_id()
      AND public.get_user_household_role() = 'admin'
    )
  )
  WITH CHECK (true);

-- meals
DROP POLICY IF EXISTS "creator or admin updates meals" ON public.meals;
CREATE POLICY "creator or admin updates meals"
  ON public.meals FOR UPDATE TO authenticated
  USING (
    created_by = (select auth.uid())
    OR (
      household_id = public.get_user_household_id()
      AND public.get_user_household_role() = 'admin'
    )
  )
  WITH CHECK (true);

-- custom_foods
DROP POLICY IF EXISTS "creator or admin updates custom_foods" ON public.custom_foods;
CREATE POLICY "creator or admin updates custom_foods"
  ON public.custom_foods FOR UPDATE TO authenticated
  USING (
    created_by = (select auth.uid())
    OR (
      household_id = public.get_user_household_id()
      AND public.get_user_household_role() = 'admin'
    )
  )
  WITH CHECK (true);
