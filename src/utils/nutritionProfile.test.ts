import { describe, it, expect } from 'vitest'
import { ageInYears, buildApplyPayload, pregnancyStatus, suggestTargets, targetsDifferFromSuggestion } from './nutritionProfile'
import type { MemberStats } from './nutritionProfile'
import type { NutritionTarget } from '../types/database'

const today = new Date('2026-11-15')

function dueInDays(days: number): string {
  return new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10)
}

function makeStats(overrides: Partial<MemberStats> = {}): MemberStats {
  return {
    birth_date: '1990-06-01',
    sex: 'female',
    height_cm: 165,
    weight_kg: 60,
    target_weight_kg: 60,
    pre_pregnancy_weight_kg: null,
    activity_level: 'light',
    is_pregnant: false,
    due_date: null,
    ...overrides,
  }
}

function suggestion(stats: MemberStats, isChild = false) {
  const result = suggestTargets(stats, isChild, today)
  if (!result.ok) throw new Error('expected ok suggestion')
  return result.suggestion
}

describe('ageInYears', () => {
  it('counts completed years by UTC day', () => {
    expect(ageInYears('1990-06-01', today)).toBe(36)
    expect(ageInYears('2023-11-15', today)).toBe(3)
    expect(ageInYears('2023-11-16', today)).toBe(2)
  })
})

describe('pregnancyStatus', () => {
  it('T1 at week 13, T2 at week 14', () => {
    expect(pregnancyStatus(dueInDays(183), today)).toEqual({ trimester: 1 })
    expect(pregnancyStatus(dueInDays(182), today)).toEqual({ trimester: 2 })
  })

  it('T2 at week 27, T3 at week 28', () => {
    expect(pregnancyStatus(dueInDays(85), today)).toEqual({ trimester: 2 })
    expect(pregnancyStatus(dueInDays(84), today)).toEqual({ trimester: 3 })
  })

  it('due today is still T3', () => {
    expect(pregnancyStatus(dueInDays(0), today)).toEqual({ trimester: 3 })
  })

  it('is expired when past due', () => {
    expect(pregnancyStatus('2026-11-14', today)).toEqual({ expired: true, reason: 'past' })
  })

  it('is expired when due date is more than 300 days away', () => {
    expect(pregnancyStatus('2028-01-01', today)).toEqual({ expired: true, reason: 'too_far' })
  })
})

describe('suggestTargets adult', () => {
  it('adult female maintain', () => {
    const s = suggestion(makeStats())
    expect(s.kind).toBe('adult')
    expect(s.calories).toBe(1770)
    expect(s.protein_g).toBe(72)
    expect(s.fat_g).toBe(59)
    expect(s.carbs_g).toBe(238)
    expect(s.micronutrients).toEqual({ fiber_g: 25, calcium_mg: 1000, iron_mg: 18, folate_mcg: 400 })
    expect(s.explanation[0]).toBe('BMR 1,290 kcal × lightly active (1.375) = 1,774 kcal')
  })

  it('adult male lose', () => {
    const s = suggestion(makeStats({
      birth_date: '1985-01-01', sex: 'male', height_cm: 180, weight_kg: 90,
      target_weight_kg: 80, activity_level: 'moderate',
    }))
    expect(s.calories).toBe(2330)
    expect(s.protein_g).toBe(144)
    expect(s.explanation).toContain('−500 kcal to move toward 80 kg')
  })

  it('loss target never exceeds maintenance when maintenance is below the floor', () => {
    const s = suggestion(makeStats({
      birth_date: '1960-01-01', height_cm: 150, weight_kg: 50,
      target_weight_kg: 45, activity_level: 'sedentary',
    }))
    expect(s.calories).toBe(1140)
    expect(s.explanation).not.toContain('−500 kcal to move toward 45 kg')
    expect(s.explanation).toContain('Kept at maintenance — already below the 1,200 kcal minimum')
  })

  it('floor that binds partway states the actual reduction', () => {
    const s = suggestion(makeStats({
      birth_date: '1990-01-01', height_cm: 160, weight_kg: 60,
      target_weight_kg: 50, activity_level: 'sedentary',
    }))
    expect(s.calories).toBe(1200)
    expect(s.explanation).toContain('−311 kcal to move toward 50 kg')
  })

  it('gain adds 300', () => {
    const s = suggestion(makeStats({ target_weight_kg: 65 }))
    expect(s.calories).toBe(2070)
    expect(s.protein_g).toBe(72)
    expect(s.explanation).toContain('+300 kcal to move toward 65 kg')
  })

  it('target within 1 kg is maintenance', () => {
    expect(suggestion(makeStats({ target_weight_kg: 60.5 })).calories).toBe(1770)
  })

  it('isChild flag does not force child formulas for an adult', () => {
    expect(suggestion(makeStats(), true).kind).toBe('adult')
  })
})

describe('suggestTargets pregnant', () => {
  const pregnant = {
    birth_date: '1994-01-01', is_pregnant: true, due_date: '2027-03-01',
    pre_pregnancy_weight_kg: 62, weight_kg: 68, target_weight_kg: 50,
  }

  it('T2 uses pre-pregnancy weight', () => {
    const s = suggestion(makeStats(pregnant))
    expect(s.kind).toBe('pregnant')
    expect(s.trimester).toBe(2)
    expect(s.calories).toBe(2170)
    expect(s.protein_g).toBe(99)
    expect(s.micronutrients.iron_mg).toBe(27)
    expect(s.micronutrients.folate_mcg).toBe(600)
    expect(s.micronutrients.calcium_mg).toBe(1000)
    expect(s.explanation).toContain('+340 kcal for trimester 2')
  })

  it('falls back to current weight without pre-pregnancy weight', () => {
    const s = suggestion(makeStats({ ...pregnant, pre_pregnancy_weight_kg: null }))
    expect(s.calories).toBe(2250)
  })

  it('expired pregnancy computes as adult', () => {
    const s = suggestion(makeStats({ ...pregnant, due_date: '2026-10-01', target_weight_kg: 60, weight_kg: 60 }))
    expect(s.kind).toBe('adult')
    expect(s.trimester).toBeUndefined()
    expect(s.explanation).toContain('Due date has passed: update pregnancy?')
  })
})

describe('suggestTargets expired and required fields', () => {
  it('due date too far away gets its own message', () => {
    const s = suggestion(makeStats({
      birth_date: '1994-01-01', is_pregnant: true, due_date: '2028-01-01',
    }))
    expect(s.kind).toBe('adult')
    expect(s.explanation).toContain('Due date looks too far away: check it.')
    expect(s.explanation).not.toContain('Due date has passed: update pregnancy?')
  })

  it('pregnant adult without due date is missing due_date', () => {
    const result = suggestTargets(makeStats({ birth_date: '1994-01-01', is_pregnant: true, due_date: null }), false, today)
    expect(result).toEqual({ ok: false, missing: ['due_date'] })
  })

  it('pregnant minor does not require due_date', () => {
    const result = suggestTargets(makeStats({ birth_date: '2010-01-01', is_pregnant: true, due_date: null }), true, today)
    expect(result.ok).toBe(true)
  })

  it('under one is reported before missing fields', () => {
    const result = suggestTargets(
      makeStats({ birth_date: '2026-06-01', sex: null, height_cm: null, weight_kg: null, activity_level: null }),
      true,
      today,
    )
    expect(result).toEqual({ ok: false, missing: [], reason: 'under_one' })
  })
})

describe('buildApplyPayload', () => {
  const suggested = {
    calories: 2100, protein_g: 100, carbs_g: 250, fat_g: 70,
    micronutrients: { fiber_g: 25, calcium_mg: 1000, iron_mg: 18, folate_mcg: 400 },
    explanation: [], kind: 'adult' as const,
  }
  const existing = {
    id: 't', household_id: 'h', user_id: 'u', member_profile_id: null,
    calories: 1800, protein_g: 80, carbs_g: 200, fat_g: 60,
    micronutrients: { iron_mg: 8, sodium_mg: 2300 },
    custom_goals: { water_ml: 2000 },
    macro_mode: 'percent' as const,
    created_at: '', updated_at: '',
  } as unknown as NutritionTarget

  it('keeps custom goals, other micros and macro mode while overwriting suggested micros', () => {
    const payload = buildApplyPayload(existing, suggested)
    expect(payload.custom_goals).toEqual({ water_ml: 2000 })
    expect(payload.micronutrients.sodium_mg).toBe(2300)
    expect(payload.micronutrients.iron_mg).toBe(18)
    expect(payload.macro_mode).toBe('percent')
    expect(payload.calories).toBe(2100)
  })

  it('defaults for a missing target', () => {
    const payload = buildApplyPayload(null, suggested)
    expect(payload.custom_goals).toEqual({})
    expect(payload.macro_mode).toBe('grams')
    expect(payload.micronutrients).toEqual(suggested.micronutrients)
  })
})

describe('targetsDifferFromSuggestion', () => {
  const suggested = {
    calories: 2000, protein_g: 100, carbs_g: 250, fat_g: 70,
    micronutrients: { fiber_g: 25, calcium_mg: 1000, iron_mg: 18, folate_mcg: 400 },
    explanation: [], kind: 'adult' as const,
  }
  const target = (overrides: Partial<NutritionTarget> = {}) =>
    ({ calories: 2000, protein_g: 100, carbs_g: 250, fat_g: 70, ...overrides }) as NutritionTarget

  it('is true for a missing target or null calories', () => {
    expect(targetsDifferFromSuggestion(null, suggested)).toBe(true)
    expect(targetsDifferFromSuggestion(target({ calories: null }), suggested)).toBe(true)
  })

  it('is false at 50 kcal and 5 g differences', () => {
    expect(targetsDifferFromSuggestion(target({ calories: 2050, protein_g: 105 }), suggested)).toBe(false)
  })

  it('is true past 50 kcal or 5 g', () => {
    expect(targetsDifferFromSuggestion(target({ calories: 2051 }), suggested)).toBe(true)
    expect(targetsDifferFromSuggestion(target({ carbs_g: 256 }), suggested)).toBe(true)
  })
})

describe('suggestTargets child', () => {
  it('toddler Alex', () => {
    const s = suggestion(makeStats({
      birth_date: '2023-06-01', sex: 'male', height_cm: 95, weight_kg: 15,
      target_weight_kg: null, activity_level: 'light',
    }), true)
    expect(s.kind).toBe('child')
    expect(s.calories).toBe(1340)
    expect(s.protein_g).toBe(16)
    expect(s.fat_g).toBe(52)
    expect(s.micronutrients).toEqual({ fiber_g: 19, calcium_mg: 700, iron_mg: 7, folate_mcg: 150 })
    expect(s.explanation).toContain('IOM energy estimate for a 3-year-old boy')
  })

  it('age 2 uses 1-2 equation', () => {
    const s = suggestion(makeStats({ birth_date: '2024-06-01', sex: 'male', height_cm: 85, weight_kg: 12 }), true)
    expect(s.calories).toBe(990)
  })

  it('age 3 boundary uses 3-8 equation', () => {
    const s = suggestion(makeStats({
      birth_date: '2023-11-15', sex: 'male', height_cm: 95, weight_kg: 15, activity_level: 'light',
    }), true)
    expect(s.calories).toBe(1340)
  })

  it('teen girl 15 uses +25', () => {
    const s = suggestion(makeStats({
      birth_date: '2011-01-01', sex: 'female', height_cm: 160, weight_kg: 52, activity_level: 'moderate',
    }), true)
    expect(s.calories).toBe(2340)
    expect(s.protein_g).toBe(44)
  })

  it('under 18 uses child path even without isChild, and ignores pregnancy', () => {
    const s = suggestion(makeStats({
      birth_date: '2011-01-01', height_cm: 160, weight_kg: 52, activity_level: 'moderate',
      is_pregnant: true, due_date: '2027-03-01',
    }))
    expect(s.kind).toBe('child')
  })

  it('under one', () => {
    const result = suggestTargets(makeStats({ birth_date: '2026-03-01' }), true, today)
    expect(result).toEqual({ ok: false, missing: [], reason: 'under_one' })
  })
})

describe('suggestTargets missing fields', () => {
  it('lists missing required fields', () => {
    const result = suggestTargets(makeStats({
      sex: null, height_cm: null, weight_kg: null, activity_level: null, birth_date: null,
    }), false, today)
    expect(result).toEqual({
      ok: false,
      missing: ['birth_date', 'sex', 'height_cm', 'weight_kg', 'activity_level'],
    })
  })

  it('pregnant without due_date lists due_date', () => {
    const result = suggestTargets(makeStats({ is_pregnant: true, due_date: null }), false, today)
    expect(result).toEqual({ ok: false, missing: ['due_date'] })
  })
})
