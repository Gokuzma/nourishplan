-- Web push subscriptions, one row per browser/device subscription.
-- Members manage only their own rows; senders read via service role.
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  household_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "Users can add their own push subscriptions"
  on push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can see their own push subscriptions"
  on push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can update their own push subscriptions"
  on push_subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can remove their own push subscriptions"
  on push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());
