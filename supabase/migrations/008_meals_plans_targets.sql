-- NourishPlan Phase 3 Meal Planning & Targets Schema

-- ============================================================
-- ALTER HOUSEHOLDS: add week_start_day
-- ============================================================

alter table public.households
  add column if not exists week_start_day integer not null default 0
    check (week_start_day between 0 and 6);

-- ============================================================
-- MEALS
-- ============================================================

create table public.meals (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by   uuid not null references auth.users(id),
  name         text not null,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.meals enable row level security;

create policy "household members read meals"
  on public.meals for select
  to authenticated
  using (
    deleted_at is null
    and household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
  );

create policy "household members insert meals"
  on public.meals for insert
  to authenticated
  with check (
    household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
    and created_by = (select auth.uid())
  );

create policy "creator or admin updates meals"
  on public.meals for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = meals.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

create policy "creator or admin deletes meals"
  on public.meals for delete
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = meals.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

create trigger meals_updated_at
  before update on public.meals
  for each row execute function public.set_updated_at();

-- ============================================================
-- MEAL ITEMS
-- ============================================================

create table public.meal_items (
  id                uuid primary key default gen_random_uuid(),
  meal_id           uuid not null references public.meals(id) on delete cascade,
  item_type         text not null check (item_type in ('food', 'recipe')),
  item_id           text not null,
  quantity_grams    numeric not null,
  calories_per_100g numeric not null,
  protein_per_100g  numeric not null,
  fat_per_100g      numeric not null,
  carbs_per_100g    numeric not null,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

create index meal_items_meal_id_idx on public.meal_items(meal_id);

alter table public.meal_items enable row level security;

create policy "meal members read meal_items"
  on public.meal_items for select
  to authenticated
  using (
    exists (
      select 1 from public.meals m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = meal_items.meal_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "meal members insert meal_items"
  on public.meal_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.meals m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = meal_items.meal_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "meal members update meal_items"
  on public.meal_items for update
  to authenticated
  using (
    exists (
      select 1 from public.meals m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = meal_items.meal_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "meal members delete meal_items"
  on public.meal_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.meals m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = meal_items.meal_id
        and hm.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- MEAL PLANS
-- ============================================================

create table public.meal_plans (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  week_start   date not null,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  unique (household_id, week_start)
);

alter table public.meal_plans enable row level security;

create policy "household members read meal_plans"
  on public.meal_plans for select
  to authenticated
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
  );

create policy "household members insert meal_plans"
  on public.meal_plans for insert
  to authenticated
  with check (
    household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
    and created_by = (select auth.uid())
  );

create policy "creator or admin updates meal_plans"
  on public.meal_plans for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = meal_plans.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

create policy "creator or admin deletes meal_plans"
  on public.meal_plans for delete
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = meal_plans.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

-- ============================================================
-- MEAL PLAN SLOTS
-- ============================================================

create table public.meal_plan_slots (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.meal_plans(id) on delete cascade,
  day_index   integer not null check (day_index between 0 and 6),
  slot_name   text not null,
  slot_order  integer not null default 0,
  meal_id     uuid references public.meals(id) on delete set null,
  is_override boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (plan_id, day_index, slot_name)
);

create index meal_plan_slots_plan_id_idx on public.meal_plan_slots(plan_id);

alter table public.meal_plan_slots enable row level security;

create policy "plan members read meal_plan_slots"
  on public.meal_plan_slots for select
  to authenticated
  using (
    exists (
      select 1 from public.meal_plans mp
      join public.household_members hm on hm.household_id = mp.household_id
      where mp.id = meal_plan_slots.plan_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "plan members insert meal_plan_slots"
  on public.meal_plan_slots for insert
  to authenticated
  with check (
    exists (
      select 1 from public.meal_plans mp
      join public.household_members hm on hm.household_id = mp.household_id
      where mp.id = meal_plan_slots.plan_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "plan members update meal_plan_slots"
  on public.meal_plan_slots for update
  to authenticated
  using (
    exists (
      select 1 from public.meal_plans mp
      join public.household_members hm on hm.household_id = mp.household_id
      where mp.id = meal_plan_slots.plan_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "plan members delete meal_plan_slots"
  on public.meal_plan_slots for delete
  to authenticated
  using (
    exists (
      select 1 from public.meal_plans mp
      join public.household_members hm on hm.household_id = mp.household_id
      where mp.id = meal_plan_slots.plan_id
        and hm.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- MEAL PLAN TEMPLATES
-- ============================================================

create table public.meal_plan_templates (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now()
);

alter table public.meal_plan_templates enable row level security;

create policy "household members read meal_plan_templates"
  on public.meal_plan_templates for select
  to authenticated
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
  );

create policy "household members insert meal_plan_templates"
  on public.meal_plan_templates for insert
  to authenticated
  with check (
    household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
    and created_by = (select auth.uid())
  );

create policy "creator or admin updates meal_plan_templates"
  on public.meal_plan_templates for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = meal_plan_templates.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

create policy "creator or admin deletes meal_plan_templates"
  on public.meal_plan_templates for delete
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = meal_plan_templates.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

-- ============================================================
-- MEAL PLAN TEMPLATE SLOTS
-- ============================================================

create table public.meal_plan_template_slots (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.meal_plan_templates(id) on delete cascade,
  day_index   integer not null check (day_index between 0 and 6),
  slot_name   text not null,
  slot_order  integer not null default 0,
  meal_id     uuid references public.meals(id) on delete set null
);

create index meal_plan_template_slots_template_id_idx on public.meal_plan_template_slots(template_id);

alter table public.meal_plan_template_slots enable row level security;

create policy "template members read meal_plan_template_slots"
  on public.meal_plan_template_slots for select
  to authenticated
  using (
    exists (
      select 1 from public.meal_plan_templates t
      join public.household_members hm on hm.household_id = t.household_id
      where t.id = meal_plan_template_slots.template_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "template members insert meal_plan_template_slots"
  on public.meal_plan_template_slots for insert
  to authenticated
  with check (
    exists (
      select 1 from public.meal_plan_templates t
      join public.household_members hm on hm.household_id = t.household_id
      where t.id = meal_plan_template_slots.template_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "template members update meal_plan_template_slots"
  on public.meal_plan_template_slots for update
  to authenticated
  using (
    exists (
      select 1 from public.meal_plan_templates t
      join public.household_members hm on hm.household_id = t.household_id
      where t.id = meal_plan_template_slots.template_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "template members delete meal_plan_template_slots"
  on public.meal_plan_template_slots for delete
  to authenticated
  using (
    exists (
      select 1 from public.meal_plan_templates t
      join public.household_members hm on hm.household_id = t.household_id
      where t.id = meal_plan_template_slots.template_id
        and hm.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- NUTRITION TARGETS
-- ============================================================

create table public.nutrition_targets (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete cascade,
  member_profile_id uuid references public.member_profiles(id) on delete cascade,
  calories          numeric,
  protein_g         numeric,
  carbs_g           numeric,
  fat_g             numeric,
  micronutrients    jsonb not null default '{}',
  custom_goals      jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- exactly one of user_id or member_profile_id must be set
  constraint nutrition_targets_one_owner check (
    (user_id is not null and member_profile_id is null)
    or (user_id is null and member_profile_id is not null)
  ),
  unique (household_id, user_id),
  unique (household_id, member_profile_id)
);

create index nutrition_targets_household_id_idx on public.nutrition_targets(household_id);

alter table public.nutrition_targets enable row level security;

create policy "household members read nutrition_targets"
  on public.nutrition_targets for select
  to authenticated
  using (
    household_id = get_user_household_id()
  );

create policy "member or admin insert nutrition_targets"
  on public.nutrition_targets for insert
  to authenticated
  with check (
    (user_id = (select auth.uid()))
    or (get_user_household_role() = 'admin' and household_id = get_user_household_id())
  );

create policy "member or admin update nutrition_targets"
  on public.nutrition_targets for update
  to authenticated
  using (
    (user_id = (select auth.uid()))
    or (get_user_household_role() = 'admin' and household_id = get_user_household_id())
  );

create policy "member or admin delete nutrition_targets"
  on public.nutrition_targets for delete
  to authenticated
  using (
    (user_id = (select auth.uid()))
    or (get_user_household_role() = 'admin' and household_id = get_user_household_id())
  );

create trigger nutrition_targets_updated_at
  before update on public.nutrition_targets
  for each row execute function public.set_updated_at();
