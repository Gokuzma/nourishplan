-- Phase 25: Universal Recipe Import
-- Adds source_url column to recipes for attribution (D-11).

alter table public.recipes
  add column if not exists source_url text;
