-- Allow real grocery spend to be recorded (logged when purchased items are
-- added to the pantry). Previously only 'cook' | 'food_log' were allowed, so
-- the purse tracked consumption, never what the household actually spent.
ALTER TABLE public.spend_logs
  DROP CONSTRAINT IF EXISTS spend_logs_source_check;

ALTER TABLE public.spend_logs
  ADD CONSTRAINT spend_logs_source_check CHECK (source IN ('cook', 'food_log', 'grocery'));
