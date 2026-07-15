-- 040: 'batch' schedule status + admins may set any household member's schedule

-- 1. Add 'batch' to the allowed statuses on both schedule tables
alter table public.member_schedule_slots
  drop constraint member_schedule_slots_status_check;
alter table public.member_schedule_slots
  add constraint member_schedule_slots_status_check
  check (status in ('prep', 'batch', 'consume', 'quick', 'away'));

alter table public.member_schedule_exceptions
  drop constraint member_schedule_exceptions_status_check;
alter table public.member_schedule_exceptions
  add constraint member_schedule_exceptions_status_check
  check (status in ('prep', 'batch', 'consume', 'quick', 'away'));

-- 2. Extend insert RLS: household admins may insert schedule rows for any
--    member of their household (target must belong to the same household).
drop policy "household members insert member_schedule_slots"
  on public.member_schedule_slots;
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
      or (
        exists (
          select 1 from public.household_members
          where household_id = member_schedule_slots.household_id
            and user_id = auth.uid()
            and role = 'admin'
        )
        and (
          (member_user_id is not null and exists (
            select 1 from public.household_members
            where household_id = member_schedule_slots.household_id
              and user_id = member_schedule_slots.member_user_id
          ))
          or (member_profile_id is not null and exists (
            select 1 from public.member_profiles
            where id = member_profile_id
              and household_id = member_schedule_slots.household_id
          ))
        )
      )
    )
  );

drop policy "household members insert member_schedule_exceptions"
  on public.member_schedule_exceptions;
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
      or (
        exists (
          select 1 from public.household_members
          where household_id = member_schedule_exceptions.household_id
            and user_id = auth.uid()
            and role = 'admin'
        )
        and (
          (member_user_id is not null and exists (
            select 1 from public.household_members
            where household_id = member_schedule_exceptions.household_id
              and user_id = member_schedule_exceptions.member_user_id
          ))
          or (member_profile_id is not null and exists (
            select 1 from public.member_profiles
            where id = member_profile_id
              and household_id = member_schedule_exceptions.household_id
          ))
        )
      )
    )
  );
