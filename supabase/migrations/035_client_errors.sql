-- Error monitoring: runtime errors reported by the SPA (global handlers +
-- TanStack Query/Mutation caches). Insert-only for authenticated users;
-- reads are service-role only (no select policy).
create table client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  household_id uuid,
  source text not null default 'client',
  message text not null,
  stack text,
  context jsonb not null default '{}'::jsonb,
  url text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index client_errors_created_at_idx on client_errors (created_at);

alter table client_errors enable row level security;

create policy "Users can report their own errors"
  on client_errors for insert
  to authenticated
  with check (user_id = auth.uid());
