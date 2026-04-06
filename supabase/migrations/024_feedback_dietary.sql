-- Feedback engine and dietary restrictions tables for Phase 20

-- recipe_ratings: per-member recipe ratings (1-5 stars) after cooking
create table public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  recipe_name text not null,
  rated_by_user_id uuid references auth.users(id) on delete set null,
  rated_by_member_profile_id uuid references public.member_profiles(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  rated_at date not null default current_date,
  created_at timestamptz not null default now(),
  constraint recipe_ratings_member_check check (
    (rated_by_user_id is null) <> (rated_by_member_profile_id is null)
  )
);

create unique index recipe_ratings_unique
  on public.recipe_ratings(recipe_id, rated_at,
    coalesce(rated_by_user_id::text, rated_by_member_profile_id::text));

alter table public.recipe_ratings enable row level security;

create policy "household members read recipe_ratings"
  on public.recipe_ratings for select to authenticated
  using (household_id = get_user_household_id());

create policy "household members insert recipe_ratings"
  on public.recipe_ratings for insert to authenticated
  with check (
    household_id = get_user_household_id()
    and (
      rated_by_user_id = auth.uid()
      or (rated_by_member_profile_id is not null and exists (
        select 1 from public.member_profiles
        where id = rated_by_member_profile_id and managed_by = auth.uid()
      ))
    )
  );

create policy "household members update recipe_ratings"
  on public.recipe_ratings for update to authenticated
  using (household_id = get_user_household_id());

create policy "household members delete recipe_ratings"
  on public.recipe_ratings for delete to authenticated
  using (household_id = get_user_household_id());

-- dietary_restrictions: per-member dietary restrictions (predefined + custom)
create table public.dietary_restrictions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  member_profile_id uuid references public.member_profiles(id) on delete cascade,
  predefined text[] not null default '{}',
  custom_entries text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint dietary_restrictions_member_check check (
    (member_user_id is null) <> (member_profile_id is null)
  )
);

create unique index dietary_restrictions_member_unique
  on public.dietary_restrictions(
    coalesce(member_user_id::text, member_profile_id::text));

alter table public.dietary_restrictions enable row level security;

create policy "household members read dietary_restrictions"
  on public.dietary_restrictions for select to authenticated
  using (household_id = get_user_household_id());

create policy "household members insert dietary_restrictions"
  on public.dietary_restrictions for insert to authenticated
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

create policy "household members update dietary_restrictions"
  on public.dietary_restrictions for update to authenticated
  using (household_id = get_user_household_id());

create policy "household members delete dietary_restrictions"
  on public.dietary_restrictions for delete to authenticated
  using (household_id = get_user_household_id());

-- wont_eat_entries: per-member food avoidance entries with preference strength
create table public.wont_eat_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  member_profile_id uuid references public.member_profiles(id) on delete cascade,
  food_name text not null,
  strength text not null default 'dislikes'
    check (strength in ('dislikes', 'refuses', 'allergy')),
  source text not null default 'manual'
    check (source in ('manual', 'ai_restriction', 'ai_suggestion')),
  created_at timestamptz not null default now(),
  constraint wont_eat_member_check check (
    (member_user_id is null) <> (member_profile_id is null)
  )
);

alter table public.wont_eat_entries enable row level security;

create policy "household members read wont_eat_entries"
  on public.wont_eat_entries for select to authenticated
  using (household_id = get_user_household_id());

create policy "household members insert wont_eat_entries"
  on public.wont_eat_entries for insert to authenticated
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

create policy "household members update wont_eat_entries"
  on public.wont_eat_entries for update to authenticated
  using (household_id = get_user_household_id());

create policy "household members delete wont_eat_entries"
  on public.wont_eat_entries for delete to authenticated
  using (household_id = get_user_household_id());

-- ai_recipe_tags: AI-generated tags for recipes (e.g. 'crowd-pleaser', 'divisive', 'filling')
create table public.ai_recipe_tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag text not null,
  confidence real,
  generated_at timestamptz not null default now(),
  unique (household_id, recipe_id, tag)
);

alter table public.ai_recipe_tags enable row level security;

create policy "household members read ai_recipe_tags"
  on public.ai_recipe_tags for select to authenticated
  using (household_id = get_user_household_id());

create policy "household members insert ai_recipe_tags"
  on public.ai_recipe_tags for insert to authenticated
  with check (household_id = get_user_household_id());

create policy "household members delete ai_recipe_tags"
  on public.ai_recipe_tags for delete to authenticated
  using (household_id = get_user_household_id());
