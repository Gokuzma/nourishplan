alter table public.meal_plan_slots
  add column if not exists is_locked boolean not null default false;

comment on column public.meal_plan_slots.is_locked is
  'When true, auto-generation (Phase 22) skips this slot. Users can still drag/edit locked slots manually.';
