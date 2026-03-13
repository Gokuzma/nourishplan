-- Fix: Migration 004 policies on custom_foods, recipes, and recipe_ingredients
-- query public.household_members directly inside policy USING/WITH CHECK clauses.
-- This triggers RLS on household_members itself, causing permission recursion
-- and 403 failures for authenticated users.
--
-- Solution: Drop all 12 broken policies and recreate them using the
-- security-definer helpers established in migration 002:
--   public.get_user_household_id()  — returns caller's household_id, bypasses RLS
--   public.get_user_household_role() — returns caller's role, bypasses RLS
--
-- For recipe_ingredients (which has no direct household_id column), policies
-- join through public.recipes using get_user_household_id() to avoid any
-- direct reference to public.household_members in policy clauses.

-- ============================================================
-- DROP BROKEN POLICIES — custom_foods (4)
-- ============================================================

drop policy if exists "household members read custom_foods" on public.custom_foods;
drop policy if exists "household members insert custom_foods" on public.custom_foods;
drop policy if exists "creator or admin updates custom_foods" on public.custom_foods;
drop policy if exists "creator or admin deletes custom_foods" on public.custom_foods;

-- ============================================================
-- DROP BROKEN POLICIES — recipes (4)
-- ============================================================

drop policy if exists "household members read recipes" on public.recipes;
drop policy if exists "household members insert recipes" on public.recipes;
drop policy if exists "creator or admin updates recipes" on public.recipes;
drop policy if exists "creator or admin deletes recipes" on public.recipes;

-- ============================================================
-- DROP BROKEN POLICIES — recipe_ingredients (4)
-- ============================================================

drop policy if exists "recipe members read recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "recipe members insert recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "recipe members update recipe_ingredients" on public.recipe_ingredients;
drop policy if exists "recipe members delete recipe_ingredients" on public.recipe_ingredients;

-- ============================================================
-- RECREATE POLICIES — custom_foods (4)
-- ============================================================

-- Household members can read non-deleted foods
create policy "household members read custom_foods"
  on public.custom_foods for select
  to authenticated
  using (
    deleted_at is null
    and household_id = public.get_user_household_id()
  );

-- Members can insert foods into their household
create policy "household members insert custom_foods"
  on public.custom_foods for insert
  to authenticated
  with check (
    household_id = public.get_user_household_id()
    and created_by = (select auth.uid())
  );

-- Creator or household admin can update
create policy "creator or admin updates custom_foods"
  on public.custom_foods for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or (
      household_id = public.get_user_household_id()
      and public.get_user_household_role() = 'admin'
    )
  );

-- Creator or household admin can delete (hard delete; soft delete via UPDATE)
create policy "creator or admin deletes custom_foods"
  on public.custom_foods for delete
  to authenticated
  using (
    created_by = (select auth.uid())
    or (
      household_id = public.get_user_household_id()
      and public.get_user_household_role() = 'admin'
    )
  );

-- ============================================================
-- RECREATE POLICIES — recipes (4)
-- ============================================================

-- Household members can read non-deleted recipes
create policy "household members read recipes"
  on public.recipes for select
  to authenticated
  using (
    deleted_at is null
    and household_id = public.get_user_household_id()
  );

-- Members can insert recipes into their household
create policy "household members insert recipes"
  on public.recipes for insert
  to authenticated
  with check (
    household_id = public.get_user_household_id()
    and created_by = (select auth.uid())
  );

-- Creator or household admin can update
create policy "creator or admin updates recipes"
  on public.recipes for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or (
      household_id = public.get_user_household_id()
      and public.get_user_household_role() = 'admin'
    )
  );

-- Creator or household admin can delete
create policy "creator or admin deletes recipes"
  on public.recipes for delete
  to authenticated
  using (
    created_by = (select auth.uid())
    or (
      household_id = public.get_user_household_id()
      and public.get_user_household_role() = 'admin'
    )
  );

-- ============================================================
-- RECREATE POLICIES — recipe_ingredients (4)
-- ============================================================
-- recipe_ingredients has no direct household_id column; access is determined
-- by looking up the parent recipe's household_id via get_user_household_id().
-- No join to household_members is needed in the policy clause.

-- Users with access to the parent recipe can read ingredients
create policy "recipe members read recipe_ingredients"
  on public.recipe_ingredients for select
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.household_id = public.get_user_household_id()
    )
  );

-- Users with access to the parent recipe can insert ingredients
create policy "recipe members insert recipe_ingredients"
  on public.recipe_ingredients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.household_id = public.get_user_household_id()
    )
  );

-- Users with access to the parent recipe can update ingredients
create policy "recipe members update recipe_ingredients"
  on public.recipe_ingredients for update
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.household_id = public.get_user_household_id()
    )
  );

-- Users with access to the parent recipe can delete ingredients
create policy "recipe members delete recipe_ingredients"
  on public.recipe_ingredients for delete
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.household_id = public.get_user_household_id()
    )
  );
