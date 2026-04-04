-- Fix: PostgREST cannot resolve household_members -> profiles join
-- because there's no direct FK between them (both reference auth.users indirectly).
-- Also: profiles SELECT policy only allows viewing own profile,
-- so household members can't see each other's display names.

-- 1. Add direct FK from household_members.user_id to profiles.id
--    (profiles.id = auth.users.id, so this is semantically correct)
alter table public.household_members
  add constraint household_members_user_id_profiles_fk
  foreign key (user_id) references public.profiles(id);

-- 2. Allow household members to see each other's profiles
create policy "household members see each other"
  on public.profiles for select
  to authenticated
  using (
    id in (
      select hm.user_id
      from public.household_members hm
      where hm.household_id = public.get_user_household_id()
    )
  );
