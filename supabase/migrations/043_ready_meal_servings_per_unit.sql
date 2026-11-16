-- 043: counted ready meals need servings per unit (a frozen pizza ~3, a fish stick ~0.2)

alter table public.inventory_items
  add column servings_per_unit numeric check (servings_per_unit > 0 and servings_per_unit <= 50);
