-- Fix: handle_new_user trigger lacked SECURITY DEFINER, so profile inserts
-- were silently blocked by RLS (no INSERT policy on profiles table).
-- Users created without a profile row then failed to join households due to
-- the household_members_user_id_profiles_fk foreign key constraint.
-- Also: Google OAuth stores name in 'full_name'/'name', not 'display_name'.

-- Make trigger bypass RLS and handle all OAuth provider name fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
exception when others then
  return new;
end;
$$;

-- Backfill: create profile rows for any existing users missing one
INSERT INTO public.profiles (id, display_name)
SELECT u.id, COALESCE(
  u.raw_user_meta_data ->> 'display_name',
  u.raw_user_meta_data ->> 'full_name',
  u.raw_user_meta_data ->> 'name',
  u.email
)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Fix: RLS UPDATE policies on household_invites conflict when a new member
-- (not admin) tries to mark an invite as used. Use a SECURITY DEFINER function
-- to bypass RLS for this specific operation.
CREATE OR REPLACE FUNCTION public.mark_invite_used(invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  update public.household_invites
  set used_at = now()
  where id = invite_id
    and used_at is null;
end;
$$;

GRANT EXECUTE ON FUNCTION public.mark_invite_used(uuid) TO authenticated;

-- Fix: "members read own household" RLS policy had a bug comparing
-- household_members.household_id = household_members.id (same table)
-- instead of household_members.household_id = households.id.
-- This caused the joined household name to always be null.
DROP POLICY IF EXISTS "members read own household" ON public.households;
CREATE POLICY "members read own household"
  ON public.households FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = households.id
        AND household_members.user_id = (SELECT auth.uid())
    )
  );
