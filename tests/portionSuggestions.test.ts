import { describe, it, expect } from 'vitest';
import {
  calcRemainingCalories,
  calcPortionSuggestions,
  hasMacroWarning,
} from '../src/utils/portionSuggestions';
import type { NutritionTarget, FoodLog } from '../src/types/database';

// --- helpers ---

function makeTarget(overrides: Partial<NutritionTarget> = {}): NutritionTarget {
  return {
    id: 'target-1',
    household_id: 'hh-1',
    user_id: 'user-1',
    member_profile_id: null,
    calories: 2000,
    protein_g: 100,
    carbs_g: 250,
    fat_g: 70,
    micronutrients: {},
    custom_goals: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeLog(overrides: Partial<FoodLog> = {}): FoodLog {
  return {
    id: 'log-1',
    household_id: 'hh-1',
    logged_by: 'user-1',
    member_user_id: 'user-1',
    member_profile_id: null,
    log_date: '2024-01-01',
    slot_name: 'lunch',
    meal_id: null,
    item_type: null,
    item_id: null,
    item_name: 'Test Food',
    servings_logged: 1,
    calories_per_serving: 400,
    protein_per_serving: 20,
    fat_per_serving: 10,
    carbs_per_serving: 50,
    micronutrients: {},
    is_private: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// --- calcRemainingCalories ---

describe('calcRemainingCalories', () => {
  it('returns target minus logged calories', () => {
    const target = makeTarget({ calories: 2000 });
    const logs = [
      makeLog({ calories_per_serving: 400, servings_logged: 1 }),
      makeLog({ id: 'log-2', calories_per_serving: 200, servings_logged: 2 }),
    ];
    expect(calcRemainingCalories(target, logs)).toBeCloseTo(1200);
  });

  it('clamps to zero when logged exceeds target', () => {
    const target = makeTarget({ calories: 2000 });
    const logs = [makeLog({ calories_per_serving: 2500, servings_logged: 1 })];
    expect(calcRemainingCalories(target, logs)).toBe(0);
  });

  it('returns 0 when target is null', () => {
    const logs = [makeLog({ calories_per_serving: 500, servings_logged: 1 })];
    expect(calcRemainingCalories(null, logs)).toBe(0);
  });

  it('returns full target when logs are empty', () => {
    const target = makeTarget({ calories: 2000 });
    expect(calcRemainingCalories(target, [])).toBe(2000);
  });

  it('returns 0 when target calories is null', () => {
    const target = makeTarget({ calories: null });
    expect(calcRemainingCalories(target, [])).toBe(0);
  });
});

// --- calcPortionSuggestions ---

describe('calcPortionSuggestions', () => {
  const dishMacros = { calories: 400, protein: 20, fat: 10, carbs: 50 };

  it('splits proportionally by remaining calories', () => {
    const members = [
      {
        memberId: 'user-a',
        memberName: 'Alice',
        memberType: 'user' as const,
        target: makeTarget({ user_id: 'user-a', calories: 2000 }),
        logsToday: [makeLog({ member_user_id: 'user-a', calories_per_serving: 800, servings_logged: 1 })],
      },
      {
        memberId: 'user-b',
        memberName: 'Bob',
        memberType: 'user' as const,
        target: makeTarget({ id: 'target-2', user_id: 'user-b', calories: 2000 }),
        logsToday: [makeLog({ id: 'log-b', member_user_id: 'user-b', calories_per_serving: 1200, servings_logged: 1 })],
      },
    ];
    // Alice remaining: 1200, Bob remaining: 800
    // Total: 2000, Alice: 60%, Bob: 40%
    const result = calcPortionSuggestions(members, 400, dishMacros, 'user-a');
    const alice = result.suggestions.find(s => s.memberId === 'user-a')!;
    const bob = result.suggestions.find(s => s.memberId === 'user-b')!;
    expect(alice.percentage).toBeCloseTo(60);
    expect(alice.servings).toBeCloseTo(0.6);
    expect(bob.percentage).toBeCloseTo(40);
    expect(bob.servings).toBeCloseTo(0.4);
  });

  it('current user is sorted first', () => {
    const members = [
      {
        memberId: 'user-b',
        memberName: 'Bob',
        memberType: 'user' as const,
        target: makeTarget({ id: 'target-2', user_id: 'user-b', calories: 2000 }),
        logsToday: [],
      },
      {
        memberId: 'user-a',
        memberName: 'Alice',
        memberType: 'user' as const,
        target: makeTarget({ user_id: 'user-a', calories: 2000 }),
        logsToday: [],
      },
    ];
    const result = calcPortionSuggestions(members, 400, dishMacros, 'user-a');
    expect(result.suggestions[0].memberId).toBe('user-a');
  });

  it('member without target gets 1.0 serving with null percentage', () => {
    const members = [
      {
        memberId: 'user-a',
        memberName: 'Alice',
        memberType: 'user' as const,
        target: makeTarget({ user_id: 'user-a', calories: 2000 }),
        logsToday: [makeLog({ calories_per_serving: 800, servings_logged: 1 })],
      },
      {
        memberId: 'user-b',
        memberName: 'Bob',
        memberType: 'user' as const,
        target: null,
        logsToday: [],
      },
    ];
    const result = calcPortionSuggestions(members, 400, dishMacros, 'user-a');
    const bob = result.suggestions.find(s => s.memberId === 'user-b')!;
    expect(bob.percentage).toBeNull();
    expect(bob.servings).toBe(1.0);
  });

  it('all members at zero remaining get 1.0 serving default', () => {
    const members = [
      {
        memberId: 'user-a',
        memberName: 'Alice',
        memberType: 'user' as const,
        target: makeTarget({ user_id: 'user-a', calories: 2000 }),
        logsToday: [makeLog({ calories_per_serving: 2500, servings_logged: 1 })],
      },
      {
        memberId: 'user-b',
        memberName: 'Bob',
        memberType: 'user' as const,
        target: makeTarget({ id: 'target-2', user_id: 'user-b', calories: 2000 }),
        logsToday: [makeLog({ id: 'log-b', calories_per_serving: 2500, servings_logged: 1 })],
      },
    ];
    const result = calcPortionSuggestions(members, 400, dishMacros, 'user-a');
    for (const s of result.suggestions) {
      expect(s.servings).toBe(1.0);
    }
  });

  it('reports leftover percentage (100 minus sum of member percentages)', () => {
    const members = [
      {
        memberId: 'user-a',
        memberName: 'Alice',
        memberType: 'user' as const,
        target: makeTarget({ user_id: 'user-a', calories: 2000 }),
        logsToday: [makeLog({ calories_per_serving: 800, servings_logged: 1 })],
      },
    ];
    // Alice gets 100%, leftover = 0
    const result = calcPortionSuggestions(members, 400, dishMacros, 'user-a');
    expect(result.leftoverPercentage).toBeCloseTo(0);
  });

  it('member without target does not count toward leftover', () => {
    const members = [
      {
        memberId: 'user-a',
        memberName: 'Alice',
        memberType: 'user' as const,
        target: makeTarget({ user_id: 'user-a', calories: 2000 }),
        logsToday: [makeLog({ calories_per_serving: 800, servings_logged: 1 })],
      },
      {
        memberId: 'user-b',
        memberName: 'Bob',
        memberType: 'user' as const,
        target: null,
        logsToday: [],
      },
    ];
    // Only Alice has a target; she gets 100%, leftover = 0
    const result = calcPortionSuggestions(members, 400, dishMacros, 'user-a');
    expect(result.leftoverPercentage).toBeCloseTo(0);
  });
});

// --- hasMacroWarning ---

describe('hasMacroWarning', () => {
  it('returns false when no target provided', () => {
    const portionMacros = { calories: 200, protein: 20, fat: 5, carbs: 30 };
    expect(hasMacroWarning(null, [], portionMacros)).toBe(false);
  });

  it('no warning when combined total stays within 20% of target', () => {
    // protein target 100g, logged 70g, portion adds 15g => 85g total, within 80-120g range
    // carbs target 100g, logged 60g, portion adds 20g => 80g total, exactly at 80% boundary (no warning)
    // fat target 100g, logged 60g, portion adds 20g => 80g total, exactly at 80% boundary (no warning)
    const target = makeTarget({ protein_g: 100, carbs_g: 100, fat_g: 100 });
    const logs = [makeLog({ protein_per_serving: 70, fat_per_serving: 60, carbs_per_serving: 60, calories_per_serving: 400, servings_logged: 1 })];
    const portionMacros = { calories: 100, protein: 15, fat: 20, carbs: 20 };
    expect(hasMacroWarning(target, logs, portionMacros)).toBe(false);
  });

  it('warns when combined protein exceeds 120% of target', () => {
    // protein target 100g, logged 80g, portion adds 45g => 125g total, over by 25% (>120g)
    const target = makeTarget({ protein_g: 100, carbs_g: 500, fat_g: 200 });
    const logs = [makeLog({ protein_per_serving: 80, fat_per_serving: 10, carbs_per_serving: 50, calories_per_serving: 400, servings_logged: 1 })];
    const portionMacros = { calories: 200, protein: 45, fat: 5, carbs: 20 };
    expect(hasMacroWarning(target, logs, portionMacros)).toBe(true);
  });

  it('does not warn when protein is at 115% of target', () => {
    // protein target 100g, logged 70g, portion adds 45g => 115g total, within 20% over (<=120g)
    // carbs and fat targets set so logged+portion stays within 80-120% range
    const target = makeTarget({ protein_g: 100, carbs_g: 100, fat_g: 100 });
    const logs = [makeLog({ protein_per_serving: 70, fat_per_serving: 80, carbs_per_serving: 80, calories_per_serving: 400, servings_logged: 1 })];
    const portionMacros = { calories: 200, protein: 45, fat: 10, carbs: 10 };
    // protein: 70+45=115, target*1.2=120 => 115 < 120 => no warning
    // fat: 80+10=90, target*0.8=80 => 90 >= 80, target*1.2=120 => 90 <= 120 => no warning
    // carbs: 80+10=90, same as fat => no warning
    expect(hasMacroWarning(target, logs, portionMacros)).toBe(false);
  });

  it('warns when combined total is under 80% of target', () => {
    // carbs target 200g, logged 50g, portion adds 20g => 70g total, under 80% (160g)
    const target = makeTarget({ protein_g: 500, carbs_g: 200, fat_g: 500 });
    const logs = [makeLog({ protein_per_serving: 10, fat_per_serving: 5, carbs_per_serving: 50, calories_per_serving: 200, servings_logged: 1 })];
    const portionMacros = { calories: 100, protein: 10, fat: 5, carbs: 20 };
    expect(hasMacroWarning(target, logs, portionMacros)).toBe(true);
  });

  it('warns if fat exceeds 120% of target', () => {
    // fat target 70g, logged 60g, portion adds 20g => 80g total, over by >20% (>84g threshold)
    // 80 > 70 * 1.2 = 84? No, 80 < 84, so no warning for fat alone
    // Let's use: fat target 60g, logged 55g, portion adds 20g => 75g, 75 > 60*1.2 = 72 => warning
    const target = makeTarget({ protein_g: 500, carbs_g: 500, fat_g: 60 });
    const logs = [makeLog({ protein_per_serving: 10, fat_per_serving: 55, carbs_per_serving: 20, calories_per_serving: 200, servings_logged: 1 })];
    const portionMacros = { calories: 100, protein: 10, fat: 20, carbs: 10 };
    expect(hasMacroWarning(target, logs, portionMacros)).toBe(true);
  });

  it('no warning when macro target is null for that macro', () => {
    const target = makeTarget({ protein_g: null, carbs_g: null, fat_g: null });
    const logs = [makeLog({ protein_per_serving: 80, fat_per_serving: 60, carbs_per_serving: 200, calories_per_serving: 400, servings_logged: 1 })];
    const portionMacros = { calories: 300, protein: 50, fat: 50, carbs: 100 };
    expect(hasMacroWarning(target, logs, portionMacros)).toBe(false);
  });

  it('warning triggered by any one macro exceeding threshold', () => {
    // Only protein is over threshold; fat and carbs are fine
    const target = makeTarget({ protein_g: 100, carbs_g: 500, fat_g: 200 });
    const logs = [makeLog({ protein_per_serving: 100, fat_per_serving: 10, carbs_per_serving: 50, calories_per_serving: 400, servings_logged: 1 })];
    const portionMacros = { calories: 200, protein: 25, fat: 5, carbs: 10 };
    // 100 + 25 = 125 > 100 * 1.2 (120)
    expect(hasMacroWarning(target, logs, portionMacros)).toBe(true);
  });
});
