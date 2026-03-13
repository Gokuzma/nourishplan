import { describe, it, expect } from 'vitest';
import { buildTargetUpsertPayload } from '../src/utils/mealPlan';
import type { NutritionTarget } from '../src/types/database';

describe('NutritionTarget type shape', () => {
  it('accepts micronutrients and custom_goals as Record<string, number>', () => {
    const target = {
      id: 'test-id',
      household_id: 'household-id',
      user_id: 'user-id',
      member_profile_id: null,
      calories: 2000,
      protein_g: 50,
      carbs_g: 275,
      fat_g: 65,
      micronutrients: { fiber_g: 25, sodium_mg: 2300 },
      custom_goals: { water_ml: 2500, sugar_g: 50 },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } satisfies NutritionTarget;

    expect(target.micronutrients.fiber_g).toBe(25);
    expect(target.micronutrients.sodium_mg).toBe(2300);
    expect(target.custom_goals.water_ml).toBe(2500);
    expect(target.custom_goals.sugar_g).toBe(50);
  });
});

describe('buildTargetUpsertPayload', () => {
  const baseParams = {
    householdId: 'household-id',
    calories: 2000,
    protein_g: 50,
    carbs_g: 275,
    fat_g: 65,
  };

  it('builds payload with user_id set and member_profile_id null when userId provided', () => {
    const payload = buildTargetUpsertPayload({
      ...baseParams,
      userId: 'user-id',
    });
    expect(payload.user_id).toBe('user-id');
    expect(payload.member_profile_id).toBeNull();
    expect(payload.household_id).toBe('household-id');
  });

  it('builds payload with member_profile_id set and user_id null when memberProfileId provided', () => {
    const payload = buildTargetUpsertPayload({
      ...baseParams,
      memberProfileId: 'profile-id',
    });
    expect(payload.member_profile_id).toBe('profile-id');
    expect(payload.user_id).toBeNull();
    expect(payload.household_id).toBe('household-id');
  });

  it('throws when both userId and memberProfileId are provided', () => {
    expect(() =>
      buildTargetUpsertPayload({
        ...baseParams,
        userId: 'user-id',
        memberProfileId: 'profile-id',
      })
    ).toThrow();
  });

  it('throws when neither userId nor memberProfileId is provided', () => {
    expect(() =>
      buildTargetUpsertPayload({ ...baseParams })
    ).toThrow();
  });
});

describe('micronutrients JSONB round-trip', () => {
  it('produces valid payload with empty micronutrients', () => {
    const payload = buildTargetUpsertPayload({
      householdId: 'household-id',
      userId: 'user-id',
      micronutrients: {},
    });
    expect(payload.micronutrients).toEqual({});
  });

  it('produces valid payload with populated micronutrients', () => {
    const payload = buildTargetUpsertPayload({
      householdId: 'household-id',
      userId: 'user-id',
      micronutrients: { fiber_g: 25 },
    });
    expect(payload.micronutrients).toEqual({ fiber_g: 25 });
  });
});

describe('custom_goals JSONB round-trip', () => {
  it('produces valid payload with empty custom_goals', () => {
    const payload = buildTargetUpsertPayload({
      householdId: 'household-id',
      userId: 'user-id',
      custom_goals: {},
    });
    expect(payload.custom_goals).toEqual({});
  });

  it('produces valid payload with populated custom_goals', () => {
    const payload = buildTargetUpsertPayload({
      householdId: 'household-id',
      userId: 'user-id',
      custom_goals: { water_ml: 2500 },
    });
    expect(payload.custom_goals).toEqual({ water_ml: 2500 });
  });
});
