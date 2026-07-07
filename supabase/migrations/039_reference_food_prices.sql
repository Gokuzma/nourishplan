-- Reference food prices: official current retail averages (Statistics Canada
-- table 18-10-0245, monthly scanner data by province). Global — NOT household-
-- scoped — one row per (region, ingredient_name). The budget engine falls back
-- to these when a household hasn't entered its own price for an ingredient.
create table reference_food_prices (
  id uuid primary key default gen_random_uuid(),
  region text not null default 'ontario',
  ingredient_name text not null,
  cost_per_100g numeric not null,
  quantity_label text,
  statcan_product_id integer,
  source text not null default 'statcan',
  ref_period date,
  updated_at timestamptz not null default now(),
  unique (region, ingredient_name)
);

alter table reference_food_prices enable row level security;

-- Read-only for any signed-in user; writes are service-role only (sync function).
create policy "Signed-in users can read reference prices"
  on reference_food_prices for select
  to authenticated
  using (true);
