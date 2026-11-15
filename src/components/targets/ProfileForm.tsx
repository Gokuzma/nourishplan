import { useState, useEffect } from 'react'
import { useNutritionTarget, useSaveMemberStats } from '../../hooks/useNutritionTargets'
import { ageInYears } from '../../utils/nutritionProfile'
import { kgToLb, lbToKg, cmToFtIn, ftInToCm } from '../../utils/units'
import type { ActivityLevel } from '../../types/database'

type Units = 'metric' | 'imperial'

const UNITS_STORAGE_KEY = 'np-units'
const NOTES_MAX_LENGTH = 500
const MS_PER_DAY = 86400000
const MAX_DAYS_UNTIL_DUE = 300
const MAX_DAYS_PAST_DUE = 28

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Lightly active' },
  { value: 'moderate', label: 'Moderately active' },
  { value: 'active', label: 'Active' },
  { value: 'very_active', label: 'Very active' },
]

const inputClass =
  'rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50'

interface Props {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  isChild: boolean
  canEdit: boolean
  birthYearFallback?: number | null
}

function readStoredUnits(): Units {
  try {
    return localStorage.getItem(UNITS_STORAGE_KEY) === 'metric' ? 'metric' : 'imperial'
  } catch {
    return 'imperial'
  }
}

function storeUnits(units: Units) {
  try {
    localStorage.setItem(UNITS_STORAGE_KEY, units)
  } catch {
    // storage unavailable: the choice just won't persist
  }
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isDueDateOutOfRange(dueDate: string, today: Date): boolean {
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const daysUntilDue = Math.round((Date.parse(`${dueDate}T00:00:00Z`) - todayUtc) / MS_PER_DAY)
  return daysUntilDue > MAX_DAYS_UNTIL_DUE || daysUntilDue < -MAX_DAYS_PAST_DUE
}

export function ProfileForm({
  householdId,
  memberId,
  memberType,
  isChild,
  canEdit,
  birthYearFallback,
}: Props) {
  const { data: target, isPending } = useNutritionTarget(householdId, memberId, memberType)
  const save = useSaveMemberStats()

  const [units, setUnits] = useState<Units>(readStoredUnits)
  const [birthDate, setBirthDate] = useState('')
  const [sex, setSex] = useState<'female' | 'male' | ''>('')
  const [activity, setActivity] = useState<ActivityLevel | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [weight, setWeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [prePregnancyWeight, setPrePregnancyWeight] = useState('')
  const [isPregnant, setIsPregnant] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  function weightToDisplay(kg: number | null, unitSystem: Units): string {
    if (kg == null) return ''
    return String(unitSystem === 'imperial' ? kgToLb(kg) : kg)
  }

  function displayToKg(value: string): number | null {
    const parsed = parseNumber(value)
    if (parsed == null) return null
    return units === 'imperial' ? lbToKg(parsed) : parsed
  }

  function fillHeight(cm: number | null) {
    if (cm == null) {
      setHeightCm('')
      setHeightFt('')
      setHeightIn('')
      return
    }
    setHeightCm(String(cm))
    const { ft, in: inches } = cmToFtIn(cm)
    setHeightFt(String(ft))
    setHeightIn(String(inches))
  }

  function heightToCm(): number | null {
    if (units === 'metric') return parseNumber(heightCm)
    const ft = parseNumber(heightFt)
    const inches = parseNumber(heightIn)
    if (ft == null && inches == null) return null
    return ftInToCm(ft ?? 0, inches ?? 0)
  }

  const profileKey = JSON.stringify([
    target?.birth_date,
    target?.sex,
    target?.height_cm,
    target?.weight_kg,
    target?.target_weight_kg,
    target?.pre_pregnancy_weight_kg,
    target?.activity_level,
    target?.is_pregnant,
    target?.due_date,
    target?.notes,
  ])

  useEffect(() => {
    setBirthDate(target?.birth_date ?? (birthYearFallback ? `${birthYearFallback}-07-01` : ''))
    setSex(target?.sex ?? '')
    setActivity(target?.activity_level ?? '')
    fillHeight(target?.height_cm ?? null)
    setWeight(weightToDisplay(target?.weight_kg ?? null, units))
    setTargetWeight(weightToDisplay(target?.target_weight_kg ?? null, units))
    setPrePregnancyWeight(weightToDisplay(target?.pre_pregnancy_weight_kg ?? null, units))
    setIsPregnant(target?.is_pregnant ?? false)
    setDueDate(target?.due_date ?? '')
    setNotes(target?.notes ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey, birthYearFallback])

  function switchUnits(next: Units) {
    if (next === units) return
    const heightInCm = heightToCm()
    const weights = [weight, targetWeight, prePregnancyWeight].map(displayToKg)
    setUnits(next)
    storeUnits(next)
    fillHeight(heightInCm)
    setWeight(weightToDisplay(weights[0], next))
    setTargetWeight(weightToDisplay(weights[1], next))
    setPrePregnancyWeight(weightToDisplay(weights[2], next))
  }

  const isAdult = !isChild && (!birthDate || ageInYears(birthDate, new Date()) >= 18)
  const showPregnancyToggle = isAdult && sex !== 'male'
  const showPregnancy = showPregnancyToggle && isPregnant
  const showTargetWeight = isAdult && !showPregnancy

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const heightInCm = heightToCm()
    const weightKg = displayToKg(weight)
    const targetWeightKg = showTargetWeight ? displayToKg(targetWeight) : null
    const prePregnancyWeightKg = showPregnancy ? displayToKg(prePregnancyWeight) : null
    if ([heightInCm, weightKg, targetWeightKg, prePregnancyWeightKg].some((value) => value != null && value <= 0)) {
      setValidationError('Height and weights must be greater than 0.')
      return
    }
    if (showPregnancy && dueDate && isDueDateOutOfRange(dueDate, new Date())) {
      setValidationError('Check the due date.')
      return
    }
    setValidationError(null)
    save.mutate(
      {
        householdId,
        memberId,
        memberType,
        stats: {
          birth_date: birthDate || null,
          sex: sex || null,
          height_cm: heightInCm,
          weight_kg: weightKg,
          target_weight_kg: targetWeightKg,
          pre_pregnancy_weight_kg: prePregnancyWeightKg,
          activity_level: activity || null,
          is_pregnant: showPregnancy,
          due_date: showPregnancy ? dueDate || null : null,
          notes: notes.trim() ? notes : null,
        },
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      },
    )
  }

  if (isPending) {
    return <div className="h-40 animate-pulse rounded-card bg-secondary" />
  }

  const weightUnit = units === 'imperial' ? 'lb' : 'kg'

  return (
    <form onSubmit={handleSubmit} className="rounded-card border border-accent/30 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text/60">Profile</h3>
        <div className="flex gap-2">
          {(['metric', 'imperial'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => switchUnits(option)}
              className={`rounded-btn px-3 py-1.5 text-xs font-semibold transition-colors ${
                units === option ? 'bg-primary text-white' : 'border border-secondary bg-surface text-text/70'
              }`}
            >
              {option === 'metric' ? 'Metric' : 'Imperial'}
            </button>
          ))}
        </div>
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="profile-birth-date" className="text-sm font-medium text-text">
            Birth date
          </label>
          <input
            id="profile-birth-date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="profile-sex" className="text-sm font-medium text-text">
            Sex (used for calorie formulas)
          </label>
          <select
            id="profile-sex"
            value={sex}
            onChange={(e) => {
              const next = e.target.value as 'female' | 'male' | ''
              setSex(next)
              if (next === 'male') {
                setIsPregnant(false)
                setDueDate('')
                setPrePregnancyWeight('')
              }
            }}
            className={inputClass}
          >
            <option value="">Select…</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>

        {units === 'metric' ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="profile-height-cm" className="text-sm font-medium text-text">
              Height (cm)
            </label>
            <input
              id="profile-height-cm"
              type="number"
              min={0.1}
              step="any"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className={inputClass}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="profile-height-ft" className="text-sm font-medium text-text">
                Height (ft)
              </label>
              <input
                id="profile-height-ft"
                type="number"
                min={0}
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="profile-height-in" className="text-sm font-medium text-text">
                Height (in)
              </label>
              <input
                id="profile-height-in"
                type="number"
                min={0}
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="profile-weight" className="text-sm font-medium text-text">
            Weight ({weightUnit})
          </label>
          <input
            id="profile-weight"
            type="number"
            min={0.1}
            step="any"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="profile-activity" className="text-sm font-medium text-text">
            Activity level
          </label>
          <select
            id="profile-activity"
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityLevel | '')}
            className={inputClass}
          >
            <option value="">Select…</option>
            {ACTIVITY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {showPregnancyToggle && (
          <label className="flex items-center gap-2 text-sm font-medium text-text">
            <input
              type="checkbox"
              checked={isPregnant}
              onChange={(e) => setIsPregnant(e.target.checked)}
            />
            Pregnant
          </label>
        )}

        {showPregnancy && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="profile-due-date" className="text-sm font-medium text-text">
                Due date
              </label>
              <input
                id="profile-due-date"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="profile-pre-pregnancy-weight" className="text-sm font-medium text-text">
                Pre-pregnancy weight ({weightUnit})
              </label>
              <input
                id="profile-pre-pregnancy-weight"
                type="number"
                min={0.1}
                step="any"
                value={prePregnancyWeight}
                onChange={(e) => setPrePregnancyWeight(e.target.value)}
                className={inputClass}
              />
            </div>
          </>
        )}

        {showTargetWeight && (
          <div className="flex flex-col gap-1">
            <label htmlFor="profile-target-weight" className="text-sm font-medium text-text">
              Target weight ({weightUnit})
            </label>
            <input
              id="profile-target-weight"
              type="number"
              min={0.1}
              step="any"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="profile-notes" className="text-sm font-medium text-text">
            Notes
          </label>
          <textarea
            id="profile-notes"
            rows={3}
            maxLength={NOTES_MAX_LENGTH}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-text/50">Visible to your household and used by the meal planner.</p>
        </div>
      </fieldset>

      {canEdit && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-btn bg-primary px-5 py-2 font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save profile'}
          </button>
          {saved && <span className="text-sm font-medium text-green-600">Saved</span>}
          {validationError && <span className="text-sm text-red-500">{validationError}</span>}
          {save.isError && (
            <span className="text-sm text-red-500">
              {save.error instanceof Error ? save.error.message : 'Failed to save.'}
            </span>
          )}
        </div>
      )}
    </form>
  )
}
