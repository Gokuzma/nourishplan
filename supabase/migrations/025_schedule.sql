-- Schedule model for Phase 21: per-member weekly availability windows

-- member_schedule_slots: recurring weekly pattern
create table public.member_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  member_profile_id uuid references public.member_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  slot_name text not null check (slot_name in ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  status text not null default 'prep' check (status in ('prep', 'consume', 'quick', 'away')),
  updated_at timestamptz not null default now(),
  constraint schedule_slot_member_check check (
    (member_user_id is null) <> (member_profile_id is null)
  )
);

create unique index member_schedule_slots_user_unique
  on public.member_schedule_slots(day_of_week, slot_name, member_user_id)
  where member_user_id is not null;

create unique index member_schedule_slots_profile_unique
  on public.member_schedule_slots(day_of_week, slot_name, member_profile_id)
  where member_profile_id is not null;

alter table public.member_schedule_slots enable row level security;

create policy "household members read member_schedule_slots"
  on public.member_schedule_slots for select to authenticated
  using (household_id = get_user_household_id());

create policy "household members insert member_schedule_slots"
  on public.member_schedule_slots for insert to authenticated
  with check (
    household_id = get_user_household_id()
    and (
      member_user_id = auth.uid()
      or (member_profile_id is not null and exists (
        select 1 from public.member_profiles
        where id = member_profile_id and managed_by = auth.uid()
      ))
    )
  );

create policy "household members update member_schedule_slots"
  on public.member_schedule_slots for update to authenticated
  using (household_id = get_user_household_id());

create policy "household members delete member_schedule_slots"
  on public.member_schedule_slots for delete to authenticated
  using (household_id = get_user_household_id());

-- member_schedule_exceptions: date-specific overrides
create table public.member_schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  member_profile_id uuid references public.member_profiles(id) on delete cascade,
  week_start date not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  slot_name text not null check (slot_name in ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  status text not null check (status in ('prep', 'consume', 'quick', 'away')),
  created_at timestamptz not null default now(),
  constraint schedule_exception_member_check check (
    (member_user_id is null) <> (member_profile_id is null)
  )
);

create unique index member_schedule_exceptions_user_unique
  on public.member_schedule_exceptions(week_start, day_of_week, slot_name, member_user_id)
  where member_user_id is not null;

create unique index member_schedule_exceptions_profile_unique
  on public.member_schedule_exceptions(week_start, day_of_week, slot_name, member_profile_id)
  where member_profile_id is not null;

alter table public.member_schedule_exceptions enable row level security;

create policy "household members read member_schedule_exceptions"
  on public.member_schedule_exceptions for select to authenticated
  using (household_id = get_user_household_id());

create policy "household members insert member_schedule_exceptions"
  on public.member_schedule_exceptions for insert to authenticated
  with check (
    household_id = get_user_household_id()
    and (
      member_user_id = auth.uid()
      or (member_profile_id is not null and exists (
        select 1 from public.member_profiles
        where id = member_profile_id and managed_by = auth.uid()
      ))
    )
  );

create policy "household members update member_schedule_exceptions"
  on public.member_schedule_exceptions for update to authenticated
  using (household_id = get_user_household_id());

create policy "household members delete member_schedule_exceptions"
  on public.member_schedule_exceptions for delete to authenticated
  using (household_id = get_user_household_id());
