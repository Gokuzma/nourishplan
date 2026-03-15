-- NourishPlan v1.1 Polish: Schema changes for Phase 8 UI polish and usability features
-- Changes:
--   1. custom_foods.portions — user-defined measurement units (jsonb array)
--   2. nutrition_targets.macro_mode — grams vs percent display preference
--   3. Profiles RLS — household member visibility (display_name, avatar_url)
--   4. Households admin UPDATE policy — allow admin to rename household
--   5. Profiles UPDATE policy — ensure users can update own profile

-- ============================================================
-- 1. custom_foods.portions
-- ============================================================
-- Each entry: { description: string, grams: number }
-- Example: [{"description": "1 cup", "grams": 240}]
ALTER TABLE public.custom_foods
ADD COLUMN IF NOT EXISTS portions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================
-- 2. nutrition_targets.macro_mode
-- ============================================================
ALTER TABLE public.nutrition_targets
ADD COLUMN IF NOT EXISTS macro_mode text NOT NULL DEFAULT 'grams'
  CHECK (macro_mode IN ('grams', 'percent'));

-- ============================================================
-- 3. Profiles RLS — household member visibility
-- ============================================================
-- Existing policy only lets users see their own row.
-- Household members need to see each other's display_name and avatar_url.
CREATE POLICY "household members can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm1
      JOIN public.household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.user_id = (SELECT auth.uid())
        AND hm2.user_id = profiles.id
    )
  );

-- ============================================================
-- 4. Households admin UPDATE policy
-- ============================================================
CREATE POLICY "admins update household"
  ON public.households FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = households.id
        AND user_id = (SELECT auth.uid())
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = households.id
        AND user_id = (SELECT auth.uid())
        AND role = 'admin'
    )
  );

-- ============================================================
-- 5. Profiles UPDATE policy (ensure it exists)
-- ============================================================
-- Foundation migration already created this policy; drop and recreate
-- to make this migration idempotent and safe on fresh deployments.
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
