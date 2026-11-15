-- 041: member profile stats on nutrition_targets (drives calorie & macro suggestions)

alter table public.nutrition_targets
  add column birth_date date,
  add column sex text check (sex in ('female', 'male')),
  add column height_cm numeric check (height_cm > 0),
  add column weight_kg numeric check (weight_kg > 0),
  add column target_weight_kg numeric check (target_weight_kg > 0),
  add column pre_pregnancy_weight_kg numeric check (pre_pregnancy_weight_kg > 0),
  add column activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  add column is_pregnant boolean not null default false,
  add column due_date date,
  add column notes text check (char_length(notes) <= 500);
