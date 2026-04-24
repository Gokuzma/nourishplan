-- Migration 031: Granular household member permissions (Phase 30)
-- Adds:
--   1. household_invites.role column (invite-time role selection)
--   2. Last-admin DB-enforced guard trigger on household_members
--   3. RPCs: change_member_role, remove_household_member, leave_household
--   4. RLS UPDATE/DELETE policies on household_members (defense-in-depth)
--
-- Error strings are contractual:
--   'At least one admin required' — SPEC Req #2 and #4 (exact string match in UI)

-- Section 1 — Invite role column (SPEC Req #5)
alter table public.household_invites
  add column if not exists role public.household_role not null default 'member';

-- Section 2 — Last-admin trigger (SPEC Req #2, DB-level enforcement per SPEC Constraint §2)
create or replace function public.enforce_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_count int;
  target_household uuid;
begin
  -- Only guard paths that could drop admin count
  if (tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin') then
    target_household := old.household_id;
  elsif (tg_op = 'DELETE' and old.role = 'admin') then
    target_household := old.household_id;
  else
    -- INSERT, UPDATE that doesn't demote, DELETE of a non-admin: no-op
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  -- Count OTHER admin rows in the same household (excluding the row being modified)
  select count(*) into admin_count
  from public.household_members
  where household_id = target_household
    and role = 'admin'
    and id <> old.id;

  if admin_count = 0 then
    raise exception 'At least one admin required' using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists enforce_last_admin_trg on public.household_members;
create trigger enforce_last_admin_trg
  before update or delete on public.household_members
  for each row execute function public.enforce_last_admin();

-- Section 3 — RPC: change_member_role (SPEC Req #1)
create or replace function public.change_member_role(
  member_row_id uuid,
  new_role public.household_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household uuid;
  caller_id uuid := (select auth.uid());
  caller_role public.household_role;
  same_household_admin_count int;
begin
  if caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Look up the target's household (and verify it exists)
  select household_id into target_household
  from public.household_members
  where id = member_row_id;

  if target_household is null then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  -- Caller must be an admin of the SAME household (cross-household guard)
  select role into caller_role
  from public.household_members
  where user_id = caller_id and household_id = target_household;

  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Only admins can change member roles' using errcode = '42501';
  end if;

  -- Defense-in-depth: pre-flight last-admin check (trigger also enforces this)
  if new_role <> 'admin' then
    select count(*) into same_household_admin_count
    from public.household_members
    where household_id = target_household and role = 'admin' and id <> member_row_id;
    if same_household_admin_count = 0 then
      raise exception 'At least one admin required' using errcode = 'P0001';
    end if;
  end if;

  update public.household_members
  set role = new_role
  where id = member_row_id;
end;
$$;

grant execute on function public.change_member_role(uuid, public.household_role) to authenticated;

-- Section 4 — RPC: remove_household_member (SPEC Req #3)
create or replace function public.remove_household_member(member_row_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household uuid;
  target_role public.household_role;
  caller_id uuid := (select auth.uid());
  caller_role public.household_role;
  same_household_admin_count int;
begin
  if caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select household_id, role into target_household, target_role
  from public.household_members
  where id = member_row_id;

  if target_household is null then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  select role into caller_role
  from public.household_members
  where user_id = caller_id and household_id = target_household;

  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Only admins can remove members' using errcode = '42501';
  end if;

  -- Defense-in-depth last-admin check
  if target_role = 'admin' then
    select count(*) into same_household_admin_count
    from public.household_members
    where household_id = target_household and role = 'admin' and id <> member_row_id;
    if same_household_admin_count = 0 then
      raise exception 'At least one admin required' using errcode = 'P0001';
    end if;
  end if;

  delete from public.household_members where id = member_row_id;
end;
$$;

grant execute on function public.remove_household_member(uuid) to authenticated;

-- Section 5 — RPC: leave_household (SPEC Req #4 — does NOT require admin)
create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_membership record;
  same_household_admin_count int;
begin
  if caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select id, household_id, role into caller_membership
  from public.household_members
  where user_id = caller_id;

  if caller_membership.id is null then
    raise exception 'Not a member of any household' using errcode = 'P0002';
  end if;

  -- Defense-in-depth last-admin check (the trigger will also enforce this)
  if caller_membership.role = 'admin' then
    select count(*) into same_household_admin_count
    from public.household_members
    where household_id = caller_membership.household_id
      and role = 'admin'
      and id <> caller_membership.id;
    if same_household_admin_count = 0 then
      raise exception 'At least one admin required' using errcode = 'P0001';
    end if;
  end if;

  delete from public.household_members where id = caller_membership.id;
end;
$$;

grant execute on function public.leave_household() to authenticated;

-- Section 6 — RLS UPDATE policy on household_members
-- (for the change_member_role RPC path; also blocks direct non-admin SQL)
drop policy if exists "admins update member roles" on public.household_members;
create policy "admins update member roles"
  on public.household_members for update
  to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = (select auth.uid())
        and hm.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = (select auth.uid())
        and hm.role = 'admin'
    )
  );

-- Section 7 — RLS DELETE policies on household_members
-- (admin DELETE + self-DELETE for leave)
drop policy if exists "admins delete members" on public.household_members;
create policy "admins delete members"
  on public.household_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = (select auth.uid())
        and hm.role = 'admin'
    )
  );

drop policy if exists "members delete self" on public.household_members;
create policy "members delete self"
  on public.household_members for delete
  to authenticated
  using ( user_id = (select auth.uid()) );
