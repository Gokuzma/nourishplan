-- Extend plan_generations.status to accept 'partial'.
-- 'partial' = Pass 2 (assign) completed successfully but correction passes 3-5
-- were skipped because the wall-clock budget was exhausted. The assignment is
-- written to meal_plan_slots but not verified by the correction loop.

ALTER TABLE plan_generations DROP CONSTRAINT IF EXISTS plan_generations_status_check;

ALTER TABLE plan_generations
  ADD CONSTRAINT plan_generations_status_check
  CHECK (status IN ('running', 'done', 'timeout', 'partial', 'error'));
