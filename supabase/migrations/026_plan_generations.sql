CREATE TABLE plan_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  triggered_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'timeout', 'error')),
  constraint_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority_order text[] NOT NULL DEFAULT ARRAY['Nutrition','Preferences','Budget','Variety','Inventory'],
  pass_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE plan_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_generations_select"
  ON plan_generations FOR SELECT
  USING (household_id = get_user_household_id());

CREATE POLICY "plan_generations_insert"
  ON plan_generations FOR INSERT
  WITH CHECK (household_id = get_user_household_id());

ALTER TABLE meal_plan_slots ADD COLUMN IF NOT EXISTS generation_rationale text;
