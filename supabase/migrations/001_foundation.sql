-- NourishPlan Phase 1 Foundation Schema
-- Apply via: Supabase Dashboard SQL Editor or `supabase db push`
-- All tables use (select auth.uid()) pattern for RLS performance (avoids per-row re-evaluation)

-- ============================================================
-- PROFILES
-- ============================================================

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users see own profile"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name'
  );
  return new;
exception when others then
  -- Never block signup due to trigger failure
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- HOUSEHOLDS
-- ============================================================

create table public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;

-- Authenticated users can create households (anyone can create one)
create policy "authenticated users insert households"
  on public.households for insert
  to authenticated
  with check (true);

-- Members can only see their own household
create policy "members read own household"
  on public.households for select
  to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_id = id
        and user_id = (select auth.uid())
    )
  );

-- ============================================================
-- HOUSEHOLD ROLE ENUM
-- ============================================================

create type household_role as enum ('admin', 'member');

-- ============================================================
-- HOUSEHOLD MEMBERS
-- ============================================================

create table public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         household_role not null default 'member',
  joined_at    timestamptz not null default now(),
  unique (household_id, user_id)
);

alter table public.household_members enable row level security;

-- Members can read their own membership row
create policy "members read own membership"
  on public.household_members for select
  to authenticated
  using ( user_id = (select auth.uid()) );

-- Members can read all members of their own household (for member list UI)
create policy "members read all household members"
  on public.household_members for select
  to authenticated
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
  );

-- Bootstrap: authenticated users can insert their own row as admin when creating a household
-- (At creation time the user has no existing membership yet, so we cannot check via existing rows)
create policy "creator inserts self as admin"
  on public.household_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'admin'
  );

-- Admins can insert new members (for accepting invites)
create policy "admins insert members"
  on public.household_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = (select auth.uid())
        and hm.role = 'admin'
    )
  );

-- ============================================================
-- HOUSEHOLD INVITES
-- ============================================================

create table public.household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token        text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by   uuid not null references auth.users(id),
  expires_at   timestamptz not null default now() + interval '7 days',
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.household_invites enable row level security;

-- Only household admins can create invite tokens
create policy "admins create invites"
  on public.household_invites for insert
  to authenticated
  with check (
    exists (
      select 1 from public.household_members
      where household_id = household_invites.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

-- Anyone authenticated can read valid (non-expired, unused) invites by token (for join flow)
-- expires_at check enforced at DB level so stale tokens cannot be used even if app code is bypassed
create policy "authenticated read valid invites"
  on public.household_invites for select
  to authenticated
  using (
    expires_at > now()
    and used_at is null
  );

-- Admins can update invite (mark as used)
create policy "admins update invites"
  on public.household_invites for update
  to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_id = household_invites.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

-- ============================================================
-- MEMBER PROFILES (managed children/household members)
-- ============================================================

create table public.member_profiles (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  managed_by   uuid not null references auth.users(id),
  name         text not null,
  is_child     boolean not null default false,
  birth_year   int,
  created_at   timestamptz not null default now()
);

alter table public.member_profiles enable row level security;

-- managed_by user has full CRUD on their own managed profiles
create policy "admins manage member_profiles"
  on public.member_profiles for all
  to authenticated
  using ( managed_by = (select auth.uid()) )
  with check ( managed_by = (select auth.uid()) );
