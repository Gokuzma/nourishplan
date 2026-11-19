-- 044: counted foods (eggs, cans, pizzas) keep a price each. cost_per_100g stays
-- filled in (cost_per_unit / grams_per_unit × 100) so recipe costing, which is
-- gram-based, keeps working unchanged.

alter table public.food_prices
  add column cost_per_unit numeric check (cost_per_unit >= 0),
  add column grams_per_unit numeric check (grams_per_unit > 0);
