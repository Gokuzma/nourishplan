-- Add notes column to recipes table for RCPUX-02
-- Nullable: null means no notes added
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS notes text;
