-- NourishPlan Phase 4 Food Logs Schema

-- ============================================================
-- FOOD_LOGS
-- ============================================================

create table public.food_logs (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references public.households(id) on delete cascade,
  logged_by             uuid not null references auth.users(id),
  -- who the log is for (exactly one must be set):
  member_user_id        uuid references auth.users(id) on delete cascade,
  member_profile_id     uuid references public.member_profiles(id) on delete cascade,
  -- what was logged:
  log_date              date not null,
  slot_name             text,
  meal_id               uuid references public.meals(id) on delete set null,
  item_type             text,
  item_id               text,
  item_name             text not null,
  servings_logged       numeric not null check (servings_logged > 0),
  -- nutrition snapshot per-serving at log time:
  calories_per_serving  numeric not null,
  protein_per_serving   numeric not null,
  fat_per_serving       numeric not null,
  carbs_per_serving     numeric not null,
  micronutrients        jsonb not null default '{}',
  -- privacy:
  is_private            boolean not null default false,
  -- housekeeping:
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- exactly one target member:
  constraint food_logs_one_member check (
    (member_user_id is not null and member_profile_id is null)
    or (member_user_id is null and member_profile_id is not null)
  )
);

create index food_logs_household_date_idx on public.food_logs(household_id, log_date);
create index food_logs_member_user_idx on public.food_logs(member_user_id, log_date);
create index food_logs_member_profile_idx on public.food_logs(member_profile_id, log_date);

create trigger set_food_logs_updated_at
  before update on public.food_logs
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.food_logs enable row level security;

-- Read: household members see non-private logs; own logs always visible; admins see all
create policy "household members read food_logs"
  on public.food_logs for select
  to authenticated
  using (
    household_id = get_user_household_id()
    and (
      is_private = false
      or logged_by = (select auth.uid())
      or get_user_household_role() = 'admin'
    )
  );

-- Insert: household members insert logs, logged_by must be the current user
create policy "household members insert food_logs"
  on public.food_logs for insert
  to authenticated
  with check (
    household_id = get_user_household_id()
    and logged_by = (select auth.uid())
  );

-- Update: only the logger or an admin
create policy "logger or admin update food_logs"
  on public.food_logs for update
  to authenticated
  using (
    logged_by = (select auth.uid())
    or get_user_household_role() = 'admin'
  );

-- Delete: only the logger or an admin
create policy "logger or admin delete food_logs"
  on public.food_logs for delete
  to authenticated
  using (
    logged_by = (select auth.uid())
    or get_user_household_role() = 'admin'
  );
