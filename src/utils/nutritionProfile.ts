import type { ActivityLevel, NutritionTarget } from '../types/database'

export type MemberStats = Pick<
  NutritionTarget,
  | 'birth_date'
  | 'sex'
  | 'height_cm'
  | 'weight_kg'
  | 'target_weight_kg'
  | 'pre_pregnancy_weight_kg'
  | 'activity_level'
  | 'is_pregnant'
  | 'due_date'
>

export type ProfileField =
  | 'birth_date'
  | 'sex'
  | 'height_cm'
  | 'weight_kg'
  | 'activity_level'
  | 'due_date'

export interface SuggestedTargets {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  micronutrients: Record<'fiber_g' | 'calcium_mg' | 'iron_mg' | 'folate_mcg', number>
  explanation: string[]
  kind: 'adult' | 'pregnant' | 'child'
  trimester?: 1 | 2 | 3
}

export type SuggestionResult =
  | { ok: true; suggestion: SuggestedTargets }
  | { ok: false; missing: ProfileField[]; reason?: 'under_one' }

type Micronutrients = SuggestedTargets['micronutrients']
type Sex = 'female' | 'male'

const MS_PER_DAY = 86400000

const ACTIVITY_ORDER: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']
const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}
const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: 'sedentary',
  light: 'lightly active',
  moderate: 'moderately active',
  active: 'active',
  very_active: 'very active',
}
const PA_COEFFICIENTS: Record<Sex, number[]> = {
  male: [1.0, 1.13, 1.26, 1.26, 1.42],
  female: [1.0, 1.16, 1.31, 1.31, 1.56],
}

function utcDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY)
}

function parseUtcDay(dateString: string): Date {
  return new Date(`${dateString}T00:00:00Z`)
}

function formatKcal(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

function roundToTen(value: number): number {
  return Math.round(value / 10) * 10
}

export function ageInYears(birthDate: string, today: Date): number {
  const birth = parseUtcDay(birthDate)
  let age = today.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age -= 1
  }
  return age
}

export function pregnancyStatus(
  dueDate: string,
  today: Date,
): { trimester: 1 | 2 | 3 } | { expired: true; reason: 'past' | 'too_far' } {
  const daysUntilDue = utcDayNumber(parseUtcDay(dueDate)) - utcDayNumber(today)
  if (daysUntilDue < 0) return { expired: true, reason: 'past' }
  if (daysUntilDue > 300) return { expired: true, reason: 'too_far' }
  const gestationalWeek = Math.floor((280 - daysUntilDue) / 7)
  if (gestationalWeek < 14) return { trimester: 1 }
  if (gestationalWeek < 28) return { trimester: 2 }
  return { trimester: 3 }
}

function microsForAge(age: number, sex: Sex): Micronutrients {
  const male = sex === 'male'
  if (age <= 3) return { fiber_g: 19, calcium_mg: 700, iron_mg: 7, folate_mcg: 150 }
  if (age <= 8) return { fiber_g: 25, calcium_mg: 1000, iron_mg: 10, folate_mcg: 200 }
  if (age <= 13) {
    return { fiber_g: male ? 31 : 26, calcium_mg: 1300, iron_mg: 8, folate_mcg: 300 }
  }
  if (age <= 18) {
    return { fiber_g: male ? 38 : 26, calcium_mg: 1300, iron_mg: male ? 11 : 15, folate_mcg: 400 }
  }
  if (age <= 50) {
    return { fiber_g: male ? 38 : 25, calcium_mg: 1000, iron_mg: male ? 8 : 18, folate_mcg: 400 }
  }
  return { fiber_g: male ? 30 : 21, calcium_mg: male ? 1000 : 1200, iron_mg: 8, folate_mcg: 400 }
}

function buildMacros(calories: number, proteinGrams: number, fatFraction: number) {
  const protein_g = Math.round(proteinGrams)
  const fat_g = Math.round((fatFraction * calories) / 9)
  const carbs_g = Math.round((calories - 4 * protein_g - 9 * fat_g) / 4)
  return { protein_g, fat_g, carbs_g }
}

function childEnergy(age: number, sex: Sex, activity: ActivityLevel, heightCm: number, weightKg: number): number {
  if (age < 3) return 89 * weightKg - 100 + 20
  const heightM = heightCm / 100
  const growth = age <= 8 ? 20 : 25
  const pa = PA_COEFFICIENTS[sex][ACTIVITY_ORDER.indexOf(activity)]
  if (sex === 'male') {
    return 88.5 - 61.9 * age + pa * (26.7 * weightKg + 903 * heightM) + growth
  }
  return 135.3 - 30.8 * age + pa * (10 * weightKg + 934 * heightM) + growth
}

function childProteinPerKg(age: number): number {
  if (age <= 3) return 1.05
  if (age <= 13) return 0.95
  return 0.85
}

function suggestForChild(
  age: number,
  sex: Sex,
  activity: ActivityLevel,
  heightCm: number,
  weightKg: number,
): SuggestedTargets {
  const calories = roundToTen(childEnergy(age, sex, activity, heightCm, weightKg))
  const fatFraction = age <= 3 ? 0.35 : 0.3
  return {
    calories,
    ...buildMacros(calories, childProteinPerKg(age) * weightKg, fatFraction),
    micronutrients: microsForAge(age, sex),
    explanation: [`IOM energy estimate for a ${age}-year-old ${sex === 'male' ? 'boy' : 'girl'}`],
    kind: 'child',
  }
}

export function suggestTargets(stats: MemberStats, _isChild: boolean, today: Date): SuggestionResult {
  const knownAge = stats.birth_date ? ageInYears(stats.birth_date, today) : null
  if (knownAge != null && knownAge < 1) return { ok: false, missing: [], reason: 'under_one' }

  const missing: ProfileField[] = []
  if (!stats.birth_date) missing.push('birth_date')
  if (!stats.sex) missing.push('sex')
  if (stats.height_cm == null) missing.push('height_cm')
  if (stats.weight_kg == null) missing.push('weight_kg')
  if (!stats.activity_level) missing.push('activity_level')
  if (stats.is_pregnant && (knownAge == null || knownAge >= 18) && !stats.due_date) missing.push('due_date')
  if (
    missing.length > 0 ||
    !stats.birth_date ||
    !stats.sex ||
    stats.height_cm == null ||
    stats.weight_kg == null ||
    !stats.activity_level
  ) {
    return { ok: false, missing }
  }

  const age = ageInYears(stats.birth_date, today)

  const { sex, height_cm: heightCm, weight_kg: weightKg, activity_level: activity } = stats

  if (age < 18) {
    return { ok: true, suggestion: suggestForChild(age, sex, activity, heightCm, weightKg) }
  }

  const explanation: string[] = []
  let pregnancy: { trimester: 1 | 2 | 3 } | null = null
  if (stats.is_pregnant && stats.due_date) {
    const status = pregnancyStatus(stats.due_date, today)
    if ('trimester' in status) {
      pregnancy = status
    } else {
      explanation.push(
        status.reason === 'past'
          ? 'Due date has passed: update pregnancy?'
          : 'Due date looks too far away: check it.',
      )
    }
  }

  const baseWeight = pregnancy ? (stats.pre_pregnancy_weight_kg ?? weightKg) : weightKg
  const bmr = 10 * baseWeight + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
  const maintenance = bmr * ACTIVITY_MULTIPLIER[activity]
  explanation.unshift(
    `BMR ${formatKcal(bmr)} kcal × ${ACTIVITY_LABEL[activity]} (${ACTIVITY_MULTIPLIER[activity]}) = ${formatKcal(maintenance)} kcal`,
  )

  if (pregnancy) {
    const extra = [0, 340, 452][pregnancy.trimester - 1]
    if (extra > 0) explanation.push(`+${extra} kcal for trimester ${pregnancy.trimester}`)
    const calories = roundToTen(maintenance + extra)
    const proteinGrams = pregnancy.trimester === 1 ? 1.2 * baseWeight : 1.2 * baseWeight + 25
    return {
      ok: true,
      suggestion: {
        calories,
        ...buildMacros(calories, proteinGrams, 0.3),
        micronutrients: { ...microsForAge(age, sex), calcium_mg: 1000, iron_mg: 27, folate_mcg: 600 },
        explanation,
        kind: 'pregnant',
        trimester: pregnancy.trimester,
      },
    }
  }

  let target = maintenance
  let proteinPerKg = 1.2
  const goalWeight = stats.target_weight_kg
  if (goalWeight != null && goalWeight < weightKg - 1) {
    const floor = sex === 'male' ? 1500 : 1200
    target = Math.max(floor, maintenance - 500)
    proteinPerKg = 1.6
    const reduction = Math.round(maintenance - target)
    explanation.push(
      reduction > 0
        ? `−${formatKcal(reduction)} kcal to move toward ${goalWeight} kg`
        : `Held at the ${formatKcal(floor)} kcal minimum`,
    )
  } else if (goalWeight != null && goalWeight > weightKg + 1) {
    target = maintenance + 300
    explanation.push(`+300 kcal to move toward ${goalWeight} kg`)
  }

  const calories = roundToTen(target)
  return {
    ok: true,
    suggestion: {
      calories,
      ...buildMacros(calories, proteinPerKg * weightKg, 0.3),
      micronutrients: microsForAge(age, sex),
      explanation,
      kind: 'adult',
    },
  }
}

export function buildApplyPayload(
  existing: NutritionTarget | null,
  s: SuggestedTargets,
): {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  micronutrients: Record<string, number>
  custom_goals: Record<string, number>
  macro_mode: 'grams' | 'percent'
} {
  return {
    calories: s.calories,
    protein_g: s.protein_g,
    carbs_g: s.carbs_g,
    fat_g: s.fat_g,
    micronutrients: { ...(existing?.micronutrients ?? {}), ...s.micronutrients },
    custom_goals: existing?.custom_goals ?? {},
    macro_mode: existing?.macro_mode ?? 'grams',
  }
}

export function targetsDifferFromSuggestion(existing: NutritionTarget | null, s: SuggestedTargets): boolean {
  if (!existing || existing.calories == null) return true
  if (Math.abs(existing.calories - s.calories) > 50) return true
  return (
    Math.abs((existing.protein_g ?? 0) - s.protein_g) > 5 ||
    Math.abs((existing.carbs_g ?? 0) - s.carbs_g) > 5 ||
    Math.abs((existing.fat_g ?? 0) - s.fat_g) > 5
  )
}
