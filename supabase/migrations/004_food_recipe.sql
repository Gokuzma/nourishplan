-- NourishPlan Phase 2 Food & Recipe Schema
-- Apply via: Supabase Dashboard SQL Editor or `supabase db push`

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- CUSTOM FOODS
-- ============================================================

create table public.custom_foods (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references public.households(id) on delete cascade,
  created_by          uuid not null references auth.users(id),
  name                text not null,
  serving_description text,
  serving_grams       numeric not null,
  calories_per_100g   numeric not null,
  protein_per_100g    numeric not null,
  fat_per_100g        numeric not null,
  carbs_per_100g      numeric not null,
  fiber_per_100g      numeric,
  sugar_per_100g      numeric,
  sodium_per_100g     numeric,
  micronutrients      jsonb not null default '{}',
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.custom_foods enable row level security;

-- Household members can read non-deleted foods
create policy "household members read custom_foods"
  on public.custom_foods for select
  to authenticated
  using (
    deleted_at is null
    and household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
  );

-- Members can insert foods into their household
create policy "household members insert custom_foods"
  on public.custom_foods for insert
  to authenticated
  with check (
    household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
    and created_by = (select auth.uid())
  );

-- Creator or household admin can update
create policy "creator or admin updates custom_foods"
  on public.custom_foods for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = custom_foods.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

-- Creator or household admin can delete (hard delete; soft delete via UPDATE)
create policy "creator or admin deletes custom_foods"
  on public.custom_foods for delete
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = custom_foods.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

create trigger custom_foods_updated_at
  before update on public.custom_foods
  for each row execute function public.set_updated_at();

-- ============================================================
-- RECIPES
-- ============================================================

create table public.recipes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by   uuid not null references auth.users(id),
  name         text not null,
  servings     integer not null default 1 check (servings > 0),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.recipes enable row level security;

-- Household members can read non-deleted recipes
create policy "household members read recipes"
  on public.recipes for select
  to authenticated
  using (
    deleted_at is null
    and household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
  );

-- Members can insert recipes into their household
create policy "household members insert recipes"
  on public.recipes for insert
  to authenticated
  with check (
    household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
    and created_by = (select auth.uid())
  );

-- Creator or household admin can update
create policy "creator or admin updates recipes"
  on public.recipes for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = recipes.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

-- Creator or household admin can delete
create policy "creator or admin deletes recipes"
  on public.recipes for delete
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.household_members
      where household_id = recipes.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- ============================================================
-- RECIPE INGREDIENTS
-- ============================================================

create table public.recipe_ingredients (
  id              uuid primary key default gen_random_uuid(),
  recipe_id       uuid not null references public.recipes(id) on delete cascade,
  ingredient_type text not null check (ingredient_type in ('food', 'recipe')),
  ingredient_id   uuid not null,
  quantity_grams  numeric not null,
  weight_state    text not null default 'raw' check (weight_state in ('raw', 'cooked')),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.recipe_ingredients enable row level security;

-- Users with access to the parent recipe can read/write ingredients
create policy "recipe members read recipe_ingredients"
  on public.recipe_ingredients for select
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = recipe_ingredients.recipe_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "recipe members insert recipe_ingredients"
  on public.recipe_ingredients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = recipe_ingredients.recipe_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "recipe members update recipe_ingredients"
  on public.recipe_ingredients for update
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = recipe_ingredients.recipe_id
        and hm.user_id = (select auth.uid())
    )
  );

create policy "recipe members delete recipe_ingredients"
  on public.recipe_ingredients for delete
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = recipe_ingredients.recipe_id
        and hm.user_id = (select auth.uid())
    )
  );
