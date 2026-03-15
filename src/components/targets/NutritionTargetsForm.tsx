import { useState, useEffect } from 'react'
import { useNutritionTarget, useUpsertNutritionTargets } from '../../hooks/useNutritionTargets'
import { TARGET_PRESETS } from '../../utils/mealPlan'
import {
  pctToGrams,
  gramsToPct,
  isMacroSumValid,
  PROTEIN_KCAL_PER_G,
  CARBS_KCAL_PER_G,
  FAT_KCAL_PER_G,
} from '../../utils/macroConversion'

const PRESET_NAMES = ['Custom', ...Object.keys(TARGET_PRESETS)] as const

const DEFAULT_MICROS = [
  { key: 'fiber_g', label: 'Fiber (g)' },
  { key: 'sodium_mg', label: 'Sodium (mg)' },
  { key: 'calcium_mg', label: 'Calcium (mg)' },
  { key: 'iron_mg', label: 'Iron (mg)' },
  { key: 'vitamin_c_mg', label: 'Vitamin C (mg)' },
]

interface Props {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  canEdit: boolean
}

interface MacroState {
  calories: string
  protein_g: string
  carbs_g: string
  fat_g: string
}

const emptyMacros: MacroState = { calories: '', protein_g: '', carbs_g: '', fat_g: '' }

export function NutritionTargetsForm({ householdId, memberId, memberType, canEdit }: Props) {
  const { data: target, isPending } = useNutritionTarget(householdId, memberId, memberType)
  const upsert = useUpsertNutritionTargets()

  const [preset, setPreset] = useState<string>('Custom')
  const [macros, setMacros] = useState<MacroState>(emptyMacros)
  const [percentages, setPercentages] = useState({ protein: '', carbs: '', fat: '' })
  const [macroMode, setMacroMode] = useState<'grams' | 'percent'>('grams')
  const [micros, setMicros] = useState<Record<string, string>>({})
  const [customGoals, setCustomGoals] = useState<{ key: string; value: string }[]>([])
  const [microsOpen, setMicrosOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  // Pre-fill form from loaded target
  useEffect(() => {
    if (!target) return
    const savedMode = target.macro_mode ?? 'grams'
    setMacroMode(savedMode)
    const gramsState = {
      calories: target.calories != null ? String(target.calories) : '',
      protein_g: target.protein_g != null ? String(target.protein_g) : '',
      carbs_g: target.carbs_g != null ? String(target.carbs_g) : '',
      fat_g: target.fat_g != null ? String(target.fat_g) : '',
    }
    setMacros(gramsState)
    // Compute initial percentages from saved grams
    const cal = target.calories ?? 0
    setPercentages({
      protein: target.protein_g != null ? String(gramsToPct(target.protein_g, cal, PROTEIN_KCAL_PER_G)) : '',
      carbs: target.carbs_g != null ? String(gramsToPct(target.carbs_g, cal, CARBS_KCAL_PER_G)) : '',
      fat: target.fat_g != null ? String(gramsToPct(target.fat_g, cal, FAT_KCAL_PER_G)) : '',
    })
    const microEntries: Record<string, string> = {}
    for (const k of DEFAULT_MICROS.map((m) => m.key)) {
      microEntries[k] = target.micronutrients[k] != null ? String(target.micronutrients[k]) : ''
    }
    // Include any custom micro keys from the saved target
    for (const [k, v] of Object.entries(target.micronutrients)) {
      if (!DEFAULT_MICROS.find((m) => m.key === k)) {
        microEntries[k] = String(v)
      }
    }
    setMicros(microEntries)
    setCustomGoals(
      Object.entries(target.custom_goals).map(([key, value]) => ({ key, value: String(value) }))
    )
  }, [target])

  function applyPreset(name: string) {
    setPreset(name)
    if (name === 'Custom') return
    const p = TARGET_PRESETS[name as keyof typeof TARGET_PRESETS]
    const gramsState = {
      calories: String(p.calories),
      protein_g: String(p.protein_g),
      carbs_g: String(p.carbs_g),
      fat_g: String(p.fat_g),
    }
    setMacros(gramsState)
    setPercentages({
      protein: String(gramsToPct(p.protein_g, p.calories, PROTEIN_KCAL_PER_G)),
      carbs: String(gramsToPct(p.carbs_g, p.calories, CARBS_KCAL_PER_G)),
      fat: String(gramsToPct(p.fat_g, p.calories, FAT_KCAL_PER_G)),
    })
  }

  function switchMode(mode: 'grams' | 'percent') {
    if (mode === macroMode) return
    const cal = parseFloat(macros.calories) || 0
    if (mode === 'percent') {
      setPercentages({
        protein: macros.protein_g ? String(gramsToPct(parseFloat(macros.protein_g), cal, PROTEIN_KCAL_PER_G)) : '',
        carbs: macros.carbs_g ? String(gramsToPct(parseFloat(macros.carbs_g), cal, CARBS_KCAL_PER_G)) : '',
        fat: macros.fat_g ? String(gramsToPct(parseFloat(macros.fat_g), cal, FAT_KCAL_PER_G)) : '',
      })
    } else {
      setMacros((m) => ({
        ...m,
        protein_g: percentages.protein ? String(pctToGrams(parseFloat(percentages.protein), cal, PROTEIN_KCAL_PER_G)) : '',
        carbs_g: percentages.carbs ? String(pctToGrams(parseFloat(percentages.carbs), cal, CARBS_KCAL_PER_G)) : '',
        fat_g: percentages.fat ? String(pctToGrams(parseFloat(percentages.fat), cal, FAT_KCAL_PER_G)) : '',
      }))
    }
    setMacroMode(mode)
  }

  function handleMacroChange(field: keyof MacroState, value: string) {
    setPreset('Custom')
    setMacros((m) => ({ ...m, [field]: value }))

    if (field === 'calories') {
      // Calorie changes in percent mode: prompt to recalculate grams
      if (macroMode === 'percent') {
        const newCal = parseFloat(value) || 0
        const confirmed = window.confirm('Update macro grams to match new calorie target?')
        if (confirmed) {
          setMacros((m) => ({
            ...m,
            calories: value,
            protein_g: percentages.protein ? String(pctToGrams(parseFloat(percentages.protein), newCal, PROTEIN_KCAL_PER_G)) : '',
            carbs_g: percentages.carbs ? String(pctToGrams(parseFloat(percentages.carbs), newCal, CARBS_KCAL_PER_G)) : '',
            fat_g: percentages.fat ? String(pctToGrams(parseFloat(percentages.fat), newCal, FAT_KCAL_PER_G)) : '',
          }))
        } else {
          // Keep existing grams, but mode becomes stale — switch to grams mode
          setMacroMode('grams')
        }
      }
      return
    }

    // When editing grams, recalculate the corresponding percentage
    if (macroMode === 'grams' || macroMode === 'percent') {
      const cal = parseFloat(macros.calories) || 0
      const grams = parseFloat(value) || 0
      if (field === 'protein_g') {
        setPercentages((p) => ({ ...p, protein: String(gramsToPct(grams, cal, PROTEIN_KCAL_PER_G)) }))
      } else if (field === 'carbs_g') {
        setPercentages((p) => ({ ...p, carbs: String(gramsToPct(grams, cal, CARBS_KCAL_PER_G)) }))
      } else if (field === 'fat_g') {
        setPercentages((p) => ({ ...p, fat: String(gramsToPct(grams, cal, FAT_KCAL_PER_G)) }))
      }
    }
  }

  function handlePercentageChange(macro: 'protein' | 'carbs' | 'fat', value: string) {
    setPreset('Custom')
    setPercentages((p) => ({ ...p, [macro]: value }))
    // Recalculate corresponding grams in real time
    const cal = parseFloat(macros.calories) || 0
    const pct = parseFloat(value) || 0
    const field = macro === 'protein' ? 'protein_g' : macro === 'carbs' ? 'carbs_g' : 'fat_g'
    const kcalPerG = macro === 'fat' ? FAT_KCAL_PER_G : PROTEIN_KCAL_PER_G
    setMacros((m) => ({ ...m, [field]: String(pctToGrams(pct, cal, kcalPerG)) }))
  }

  function handleMicroChange(key: string, value: string) {
    setMicros((m) => ({ ...m, [key]: value }))
  }

  function addCustomMicro() {
    setMicros((m) => ({ ...m, '': '' }))
  }

  function addCustomGoal() {
    setCustomGoals((g) => [...g, { key: '', value: '' }])
  }

  function updateCustomGoal(index: number, field: 'key' | 'value', value: string) {
    setCustomGoals((g) => g.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function removeCustomGoal(index: number) {
    setCustomGoals((g) => g.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const micronutrients: Record<string, number> = {}
    for (const [k, v] of Object.entries(micros)) {
      if (k.trim() && v.trim()) micronutrients[k.trim()] = parseFloat(v)
    }
    const custom_goals: Record<string, number> = {}
    for (const { key, value } of customGoals) {
      if (key.trim() && value.trim()) custom_goals[key.trim()] = parseFloat(value)
    }

    upsert.mutate(
      {
        householdId,
        memberId,
        ...(memberType === 'user' ? { userId: memberId } : { memberProfileId: memberId }),
        calories: macros.calories ? parseFloat(macros.calories) : undefined,
        protein_g: macros.protein_g ? parseFloat(macros.protein_g) : undefined,
        carbs_g: macros.carbs_g ? parseFloat(macros.carbs_g) : undefined,
        fat_g: macros.fat_g ? parseFloat(macros.fat_g) : undefined,
        micronutrients,
        custom_goals,
        macro_mode: macroMode,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      }
    )
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-card bg-secondary" />
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Preset selector */}
      {canEdit && (
        <div className="flex flex-col gap-1">
          <label htmlFor="preset" className="text-sm font-medium text-text">
            Preset template
          </label>
          <select
            id="preset"
            value={preset}
            onChange={(e) => applyPreset(e.target.value)}
            className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {PRESET_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Calories + Macros */}
      <div className="rounded-card border border-accent/30 bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text/60">
          Calories and Macros
        </h3>

        {/* Grams / Percent toggle */}
        {canEdit && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => switchMode('grams')}
              className={`rounded-btn px-3 py-1.5 text-xs font-semibold transition-colors ${
                macroMode === 'grams'
                  ? 'bg-primary text-white'
                  : 'border border-secondary bg-surface text-text/70'
              }`}
            >
              Grams
            </button>
            <button
              type="button"
              onClick={() => switchMode('percent')}
              className={`rounded-btn px-3 py-1.5 text-xs font-semibold transition-colors ${
                macroMode === 'percent'
                  ? 'bg-primary text-white'
                  : 'border border-secondary bg-surface text-text/70'
              }`}
            >
              Percent
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Calories — always in kcal */}
          <div className="flex flex-col gap-1">
            <label htmlFor="calories" className="text-sm font-medium text-text">
              Calories (kcal)
            </label>
            <input
              id="calories"
              type="number"
              min={0}
              value={macros.calories}
              onChange={(e) => handleMacroChange('calories', e.target.value)}
              disabled={!canEdit}
              className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              placeholder="0"
            />
          </div>

          {/* Protein */}
          <div className="flex flex-col gap-1">
            <label htmlFor="protein_g" className="text-sm font-medium text-text">
              {macroMode === 'percent' ? 'Protein (%)' : 'Protein (g)'}
            </label>
            <input
              id="protein_g"
              type="number"
              min={0}
              max={macroMode === 'percent' ? 100 : undefined}
              value={macroMode === 'percent' ? percentages.protein : macros.protein_g}
              onChange={(e) =>
                macroMode === 'percent'
                  ? handlePercentageChange('protein', e.target.value)
                  : handleMacroChange('protein_g', e.target.value)
              }
              disabled={!canEdit}
              className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              placeholder="0"
            />
          </div>

          {/* Carbs */}
          <div className="flex flex-col gap-1">
            <label htmlFor="carbs_g" className="text-sm font-medium text-text">
              {macroMode === 'percent' ? 'Carbs (%)' : 'Carbs (g)'}
            </label>
            <input
              id="carbs_g"
              type="number"
              min={0}
              max={macroMode === 'percent' ? 100 : undefined}
              value={macroMode === 'percent' ? percentages.carbs : macros.carbs_g}
              onChange={(e) =>
                macroMode === 'percent'
                  ? handlePercentageChange('carbs', e.target.value)
                  : handleMacroChange('carbs_g', e.target.value)
              }
              disabled={!canEdit}
              className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              placeholder="0"
            />
          </div>

          {/* Fat */}
          <div className="flex flex-col gap-1">
            <label htmlFor="fat_g" className="text-sm font-medium text-text">
              {macroMode === 'percent' ? 'Fat (%)' : 'Fat (g)'}
            </label>
            <input
              id="fat_g"
              type="number"
              min={0}
              max={macroMode === 'percent' ? 100 : undefined}
              value={macroMode === 'percent' ? percentages.fat : macros.fat_g}
              onChange={(e) =>
                macroMode === 'percent'
                  ? handlePercentageChange('fat', e.target.value)
                  : handleMacroChange('fat_g', e.target.value)
              }
              disabled={!canEdit}
              className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              placeholder="0"
            />
          </div>
        </div>

        {/* Percent mode: P+C+F sum validation */}
        {macroMode === 'percent' && (() => {
          const pPct = parseFloat(percentages.protein) || 0
          const cPct = parseFloat(percentages.carbs) || 0
          const fPct = parseFloat(percentages.fat) || 0
          const sum = Math.round((pPct + cPct + fPct) * 10) / 10
          if (!isMacroSumValid(pPct, cPct, fPct)) {
            return (
              <p className="text-sm text-red-500 mt-3">
                Percentages must sum to 100% (currently {sum}%)
              </p>
            )
          }
          return null
        })()}
      </div>

      {/* Micronutrients (expandable) */}
      <div className="rounded-card border border-accent/30 bg-surface">
        <button
          type="button"
          onClick={() => setMicrosOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-sm font-semibold text-text">Micronutrients</span>
          <span className="text-text/40 text-sm">{microsOpen ? '▲' : '▼'}</span>
        </button>

        {microsOpen && (
          <div className="flex flex-col gap-3 px-5 pb-5">
            {DEFAULT_MICROS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <label htmlFor={`micro-${key}`} className="text-sm font-medium text-text">
                  {label}
                </label>
                <input
                  id={`micro-${key}`}
                  type="number"
                  min={0}
                  value={micros[key] ?? ''}
                  onChange={(e) => handleMicroChange(key, e.target.value)}
                  disabled={!canEdit}
                  className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  placeholder="0"
                />
              </div>
            ))}

            {/* Custom micro keys from saved target */}
            {Object.entries(micros)
              .filter(([k]) => !DEFAULT_MICROS.find((m) => m.key === k))
              .map(([key]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-text">{key}</label>
                  <input
                    type="number"
                    min={0}
                    value={micros[key] ?? ''}
                    onChange={(e) => handleMicroChange(key, e.target.value)}
                    disabled={!canEdit}
                    className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    placeholder="0"
                  />
                </div>
              ))}

            {canEdit && (
              <button
                type="button"
                onClick={addCustomMicro}
                className="mt-1 rounded-btn border border-accent/40 px-3 py-1.5 text-xs font-semibold text-text hover:bg-secondary/20"
              >
                + Add micronutrient
              </button>
            )}
          </div>
        )}
      </div>

      {/* Custom Goals (expandable) */}
      <div className="rounded-card border border-accent/30 bg-surface">
        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-sm font-semibold text-text">Custom Goals</span>
          <span className="text-text/40 text-sm">{customOpen ? '▲' : '▼'}</span>
        </button>

        {customOpen && (
          <div className="flex flex-col gap-3 px-5 pb-5">
            {customGoals.length === 0 && (
              <p className="text-sm text-text/50">
                No custom goals yet. Examples: water_ml, sugar_g.
              </p>
            )}
            {customGoals.map(({ key, value }, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-text/60">Name</label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => updateCustomGoal(index, 'key', e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. water_ml"
                    className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-sm text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-text/60">Value</label>
                  <input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => updateCustomGoal(index, 'value', e.target.value)}
                    disabled={!canEdit}
                    placeholder="0"
                    className="rounded-btn border border-accent/40 bg-surface px-3 py-2 text-sm text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeCustomGoal(index)}
                    className="rounded-btn border border-red-300 px-2 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {canEdit && (
              <button
                type="button"
                onClick={addCustomGoal}
                className="mt-1 rounded-btn border border-accent/40 px-3 py-1.5 text-xs font-semibold text-text hover:bg-secondary/20"
              >
                + Add goal
              </button>
            )}
          </div>
        )}
      </div>

      {/* Save button */}
      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={upsert.isPending}
            className="rounded-btn bg-primary px-5 py-2 font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {upsert.isPending ? 'Saving…' : 'Save Targets'}
          </button>
          {saved && <span className="text-sm font-medium text-green-600">Saved</span>}
          {upsert.isError && (
            <span className="text-sm text-red-500">
              {upsert.error instanceof Error ? upsert.error.message : 'Failed to save.'}
            </span>
          )}
        </div>
      )}
    </form>
  )
}
