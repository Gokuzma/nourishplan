-- Phase 23: Prep Optimisation
-- Adds rich-step instructions + freezer metadata to recipes, creates cook_sessions table,
-- raises Phase 22 rate limit to 20/day and adds a kind column for per-call reporting.
-- Implements D-01, D-02, D-22, D-23, D-24, D-26, R-01, R-02.

-- 1. recipes additions (D-01, D-02)
alter table public.recipes
  add column if not exists instructions jsonb,
  add column if not exists freezer_friendly boolean,
  add column if not exists freezer_shelf_life_weeks integer;

-- Index for batch prep modal filtering of freezer-friendly recipes.
-- Partial index is intentional (only indexes the matching rows). Note L-006:
-- Supabase upserts against partial unique indexes silently fail — but this
-- is NOT a unique index, only a filtered lookup index, so upsert is unaffected.
create index if not exists recipes_freezer_friendly_idx
  on public.recipes (household_id, freezer_friendly)
  where freezer_friendly = true;

-- 2. cook_sessions table (D-22, D-23, D-26, R-02)
create table if not exists public.cook_sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  started_by uuid not null references auth.users(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  batch_prep_session_key text,
  recipe_ids uuid[] not null default '{}',
  step_state jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  mode text check (mode in ('combined', 'per-recipe')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- step_state JSONB shape (R-02: live-bind, stable ids, not index-based):
-- {
--   "steps": {
--     "<stable_step_id>": {
--       "completed_at": null | "timestamp",
--       "completed_by": null | "user_uuid",
--       "timer_started_at": null | "timestamp",
--       "owner_member_id": null | "member_uuid",
--       "recipe_id": "uuid"
--     }
--   },
--   "order": ["<stable_step_id>", ...]
-- }
-- Stable step ids mean recipe edits during a cook session survive: deleted steps
-- silently drop their state, added steps appear unchecked, edited text stays mapped
-- to the same entry.

alter table public.cook_sessions enable row level security;

drop policy if exists "household members read cook_sessions" on public.cook_sessions;
create policy "household members read cook_sessions"
  on public.cook_sessions for select to authenticated
  using (household_id = get_user_household_id());

drop policy if exists "household members insert cook_sessions" on public.cook_sessions;
create policy "household members insert cook_sessions"
  on public.cook_sessions for insert to authenticated
  with check (household_id = get_user_household_id());

drop policy if exists "household members update cook_sessions" on public.cook_sessions;
create policy "household members update cook_sessions"
  on public.cook_sessions for update to authenticated
  using (household_id = get_user_household_id());

drop policy if exists "household members delete cook_sessions" on public.cook_sessions;
create policy "household members delete cook_sessions"
  on public.cook_sessions for delete to authenticated
  using (household_id = get_user_household_id());

-- Realtime publication (D-24)
alter publication supabase_realtime add table public.cook_sessions;

-- Indexes for "resume latest active session" and standalone picker (L-006: no unique
-- partial indexes — plain composite indexes only).
create index if not exists cook_sessions_active_idx
  on public.cook_sessions (household_id, meal_id, status);

create index if not exists cook_sessions_started_by_idx
  on public.cook_sessions (started_by, status);

-- Updated_at trigger — reuses existing set_updated_at() helper
drop trigger if exists set_cook_sessions_updated_at on public.cook_sessions;
create trigger set_cook_sessions_updated_at
  before update on public.cook_sessions
  for each row execute function set_updated_at();

-- 3. plan_generations.kind column (R-01: tracks which Phase 23 AI call incremented the shared counter)
alter table public.plan_generations
  add column if not exists kind text not null default 'plan';

alter table public.plan_generations drop constraint if exists plan_generations_kind_check;
alter table public.plan_generations
  add constraint plan_generations_kind_check
  check (kind in ('plan', 'steps', 'batch_prep', 'cook_sequence', 'reheat'));

create index if not exists plan_generations_kind_idx
  on public.plan_generations (household_id, kind, created_at desc);

-- NOTE on rate limit raise (R-01: 10 -> 20/day): the cap is enforced in edge function
-- code (supabase/functions/*/index.ts), not as a DB constraint. Plan 02 updates the
-- edge function code to use `>= 20` instead of `>= 10`. This migration only adds
-- the `kind` column that Plan 02 will write.
