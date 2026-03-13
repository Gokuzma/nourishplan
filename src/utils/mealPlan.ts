import type { NutritionTarget } from '../types/database';

export type NutritionTargetInsert = Omit<NutritionTarget, 'id' | 'created_at' | 'updated_at'>;

/**
 * Returns the ISO date string ('YYYY-MM-DD') for the week start containing today,
 * given the household's preferred week start day (0=Sun through 6=Sat).
 * Uses UTC methods throughout to avoid timezone-related day-of-week drift.
 */
export function getWeekStart(today: Date, weekStartDay: number): string {
  const day = today.getUTCDay(); // 0=Sun
  const diff = (day - weekStartDay + 7) % 7;
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - diff);
  return start.toISOString().slice(0, 10);
}

/**
 * Standard dietary reference intake presets (USDA 2020-2025 guidelines).
 * Used as starting defaults; users should customize for their individual needs.
 */
export const TARGET_PRESETS = {
  'Adult maintenance': { calories: 2000, protein_g: 50, carbs_g: 275, fat_g: 65 },
  'Weight loss': { calories: 1600, protein_g: 120, carbs_g: 150, fat_g: 53 },
  'Child 5-12': { calories: 1400, protein_g: 35, carbs_g: 195, fat_g: 47 },
  'Teen': { calories: 2200, protein_g: 65, carbs_g: 300, fat_g: 73 },
} as const;

/**
 * Default meal slot names shown in the plan grid.
 * Custom slots are stored as additional meal_plan_slots rows.
 */
export const DEFAULT_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;

/**
 * Build a NutritionTarget upsert payload.
 * Exactly one of userId or memberProfileId must be provided.
 */
export function buildTargetUpsertPayload(params: {
  householdId: string;
  userId?: string;
  memberProfileId?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  micronutrients?: Record<string, number>;
  custom_goals?: Record<string, number>;
}): NutritionTargetInsert {
  const { householdId, userId, memberProfileId, calories, protein_g, carbs_g, fat_g, micronutrients, custom_goals } = params;

  if (userId && memberProfileId) {
    throw new Error('Provide either userId or memberProfileId, not both.');
  }
  if (!userId && !memberProfileId) {
    throw new Error('Either userId or memberProfileId must be provided.');
  }

  return {
    household_id: householdId,
    user_id: userId ?? null,
    member_profile_id: memberProfileId ?? null,
    calories: calories ?? null,
    protein_g: protein_g ?? null,
    carbs_g: carbs_g ?? null,
    fat_g: fat_g ?? null,
    micronutrients: micronutrients ?? {},
    custom_goals: custom_goals ?? {},
  };
}
