-- Fix: household_members RLS policies self-reference the same table,
-- causing infinite recursion (500 errors from PostgREST).
-- Solution: security-definer helpers that bypass RLS for the inner lookup.

-- ============================================================
-- HELPER FUNCTIONS (security definer — bypass RLS)
-- ============================================================

create or replace function public.get_user_household_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select household_id
  from public.household_members
  where user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.get_user_household_role()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select role::text
  from public.household_members
  where user_id = (select auth.uid())
  limit 1;
$$;

-- ============================================================
-- DROP broken policies
-- ============================================================

drop policy if exists "members read all household members" on public.household_members;
drop policy if exists "admins insert members" on public.household_members;

-- ============================================================
-- RECREATE with helper functions (no self-reference)
-- ============================================================

-- Members can read all members of their own household
create policy "members read all household members"
  on public.household_members for select
  to authenticated
  using ( household_id = public.get_user_household_id() );

-- Admins can insert new members into their household
create policy "admins insert members"
  on public.household_members for insert
  to authenticated
  with check (
    household_id = public.get_user_household_id()
    and public.get_user_household_role() = 'admin'
  );
