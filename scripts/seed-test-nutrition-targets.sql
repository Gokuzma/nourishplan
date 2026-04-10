-- Seed nutrition_targets for the UAT test household.
-- Purpose: unblock manual UAT of Phase 22 NutritionGapCard render branch.
-- See .planning/phases/22-constraint-based-planning-engine/22-HUMAN-UAT.md Gap C.
--
-- Usage (operator runs this manually when UAT test data is needed):
--   export $(grep SUPABASE_ACCESS_TOKEN .env.local | xargs)
--   psql "$SUPABASE_DB_URL" -f scripts/seed-test-nutrition-targets.sql
-- OR copy-paste into the Supabase SQL Editor for project qnawovgcjpkwdjkjszag.
--
-- Idempotent: safe to run multiple times. Existing rows for the household's
-- members are updated with the target values; new rows are inserted.
--
-- Household: c2531bd4-b680-404a-b769-ab4dc8b6f62c (UAT Test Family)
--
-- Target values chosen to be high enough that any reasonable weekly plan will
-- produce gaps > 10% below target, exercising the NutritionGapCard render
-- branch (calcWeeklyGaps default threshold = 90%).

DO $$
DECLARE
  v_household_id uuid := 'c2531bd4-b680-404a-b769-ab4dc8b6f62c';
  v_member record;
BEGIN
  -- Loop over every household_member in the target household and ensure each
  -- has a nutrition_targets row. Upsert by (household_id, user_id).
  FOR v_member IN
    SELECT user_id
    FROM public.household_members
    WHERE household_id = v_household_id
  LOOP
    INSERT INTO public.nutrition_targets (
      household_id,
      user_id,
      member_profile_id,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      micronutrients,
      custom_goals,
      macro_mode
    )
    VALUES (
      v_household_id,
      v_member.user_id,
      NULL,
      2000,
      150,
      200,
      65,
      '{}'::jsonb,
      '{}'::jsonb,
      'grams'
    )
    ON CONFLICT (household_id, user_id)
    DO UPDATE SET
      calories = EXCLUDED.calories,
      protein_g = EXCLUDED.protein_g,
      carbs_g = EXCLUDED.carbs_g,
      fat_g = EXCLUDED.fat_g,
      updated_at = now();
  END LOOP;

  -- Same for member_profiles (managed child profiles).
  FOR v_member IN
    SELECT id AS profile_id
    FROM public.member_profiles
    WHERE household_id = v_household_id
  LOOP
    INSERT INTO public.nutrition_targets (
      household_id,
      user_id,
      member_profile_id,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      micronutrients,
      custom_goals,
      macro_mode
    )
    VALUES (
      v_household_id,
      NULL,
      v_member.profile_id,
      1400,
      35,
      195,
      47,
      '{}'::jsonb,
      '{}'::jsonb,
      'grams'
    )
    ON CONFLICT (household_id, member_profile_id)
    DO UPDATE SET
      calories = EXCLUDED.calories,
      protein_g = EXCLUDED.protein_g,
      carbs_g = EXCLUDED.carbs_g,
      fat_g = EXCLUDED.fat_g,
      updated_at = now();
  END LOOP;
END$$;

-- Sanity check: report the inserted/updated rows.
SELECT user_id, member_profile_id, calories, protein_g, carbs_g, fat_g, updated_at
FROM public.nutrition_targets
WHERE household_id = 'c2531bd4-b680-404a-b769-ab4dc8b6f62c'
ORDER BY user_id NULLS LAST, member_profile_id NULLS LAST;
