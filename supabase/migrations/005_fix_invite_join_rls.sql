-- Fix: authenticated users joining via invite link receive a 403 because
-- no RLS policy permits self-insert as 'member' when a valid invite exists.
-- Solution: security-definer helper that checks household_invites without
-- triggering RLS recursion, then a new INSERT policy on household_members.

-- ============================================================
-- HELPER FUNCTION (security definer — bypasses RLS on household_invites)
-- ============================================================

create or replace function public.has_valid_invite(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_invites
    where household_id = p_household_id
      and used_at is null
      and expires_at > now()
  );
$$;

-- ============================================================
-- NEW POLICY: allow invite-based self-join as member
-- ============================================================

create policy "invite_join_as_member"
  on public.household_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'member'
    and public.has_valid_invite(household_id)
  );
