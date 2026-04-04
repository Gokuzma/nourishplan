-- Fix: joining user cannot mark invite as used because the only UPDATE policy
-- on household_invites requires admin role. After the member INSERT succeeds,
-- the joining user is a member but not an admin, so the used_at UPDATE fails.
-- Solution: allow any household member to mark invites as used.

create policy "members mark invites used"
  on public.household_invites for update
  to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_id = household_invites.household_id
        and user_id = (select auth.uid())
    )
  )
  with check (
    used_at is not null
  );
