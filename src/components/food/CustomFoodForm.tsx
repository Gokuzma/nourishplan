import { useState } from 'react'
import { useCreateCustomFood, useUpdateCustomFood } from '../../hooks/useCustomFoods'
import type { CustomFood } from '../../types/database'

interface CustomFoodFormProps {
  food?: CustomFood
  onSave: () => void
  onCancel: () => void
}

const MICRO_FIELDS = [
  { key: 'vitamin_d', label: 'Vitamin D' },
  { key: 'calcium', label: 'Calcium' },
  { key: 'iron', label: 'Iron' },
  { key: 'potassium', label: 'Potassium' },
  { key: 'vitamin_c', label: 'Vitamin C' },
  { key: 'vitamin_a', label: 'Vitamin A' },
]

function numericField(value: string): number | null {
  const n = parseFloat(value)
  return isNaN(n) ? null : n
}

export function CustomFoodForm({ food, onSave, onCancel }: CustomFoodFormProps) {
  const isEdit = !!food
  const createFood = useCreateCustomFood()
  const updateFood = useUpdateCustomFood()

  const [name, setName] = useState(food?.name ?? '')
  const [servingDescription, setServingDescription] = useState(food?.serving_description ?? '')
  const [servingGrams, setServingGrams] = useState(food ? String(food.serving_grams) : '')
  const [calories, setCalories] = useState(food ? String(food.calories_per_100g) : '')
  const [protein, setProtein] = useState(food ? String(food.protein_per_100g) : '')
  const [fat, setFat] = useState(food ? String(food.fat_per_100g) : '')
  const [carbs, setCarbs] = useState(food ? String(food.carbs_per_100g) : '')
  const [fiber, setFiber] = useState(food?.fiber_per_100g != null ? String(food.fiber_per_100g) : '')
  const [sugar, setSugar] = useState(food?.sugar_per_100g != null ? String(food.sugar_per_100g) : '')
  const [sodium, setSodium] = useState(food?.sodium_per_100g != null ? String(food.sodium_per_100g) : '')
  const [microInputs, setMicroInputs] = useState<Record<string, string>>(() => {
    if (!food?.micronutrients) return {}
    return Object.fromEntries(
      Object.entries(food.micronutrients).map(([k, v]) => [k, String(v)])
    )
  })
  const [showMicros, setShowMicros] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass = 'w-full rounded-[--radius-card] border border-accent/30 bg-surface px-3 py-2 text-sm text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary/40'
  const labelClass = 'block text-sm font-medium text-text/70 mb-1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Name is required.'); return }
    const sg = numericField(servingGrams)
    if (sg === null || sg <= 0) { setError('Serving grams must be greater than 0.'); return }
    const cal = numericField(calories)
    if (cal === null || cal < 0) { setError('Calories must be 0 or greater.'); return }
    const prot = numericField(protein)
    if (prot === null || prot < 0) { setError('Protein must be 0 or greater.'); return }
    const fatVal = numericField(fat)
    if (fatVal === null || fatVal < 0) { setError('Fat must be 0 or greater.'); return }
    const carbVal = numericField(carbs)
    if (carbVal === null || carbVal < 0) { setError('Carbs must be 0 or greater.'); return }

    const micronutrients: Record<string, number> = {}
    for (const field of MICRO_FIELDS) {
      const val = numericField(microInputs[field.key] ?? '')
      if (val !== null) micronutrients[field.key] = val
    }

    const payload = {
      name: name.trim(),
      serving_description: servingDescription.trim() || null,
      serving_grams: sg,
      calories_per_100g: cal,
      protein_per_100g: prot,
      fat_per_100g: fatVal,
      carbs_per_100g: carbVal,
      fiber_per_100g: numericField(fiber),
      sugar_per_100g: numericField(sugar),
      sodium_per_100g: numericField(sodium),
      micronutrients,
    }

    try {
      if (isEdit && food) {
        await updateFood.mutateAsync({ id: food.id, updates: payload })
      } else {
        await createFood.mutateAsync(payload)
      }
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save food.')
    }
  }

  const isPending = createFood.isPending || updateFood.isPending

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className={labelClass}>Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputClass}
          placeholder="e.g. Homemade Granola"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Serving description</label>
          <input
            type="text"
            value={servingDescription}
            onChange={e => setServingDescription(e.target.value)}
            className={inputClass}
            placeholder="e.g. 2 cookies"
          />
        </div>
        <div>
          <label className={labelClass}>Serving size (g) *</label>
          <input
            type="number"
            value={servingGrams}
            onChange={e => setServingGrams(e.target.value)}
            className={inputClass}
            placeholder="grams"
            min="0.1"
            step="0.1"
          />
        </div>
      </div>

      <p className="text-xs text-text/50 font-medium uppercase tracking-wide -mb-2">Per 100g</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Calories (kcal) *</label>
          <input
            type="number"
            value={calories}
            onChange={e => setCalories(e.target.value)}
            className={inputClass}
            placeholder="0"
            min="0"
            step="0.1"
          />
        </div>
        <div>
          <label className={labelClass}>Protein (g) *</label>
          <input
            type="number"
            value={protein}
            onChange={e => setProtein(e.target.value)}
            className={inputClass}
            placeholder="0"
            min="0"
            step="0.1"
          />
        </div>
        <div>
          <label className={labelClass}>Fat (g) *</label>
          <input
            type="number"
            value={fat}
            onChange={e => setFat(e.target.value)}
            className={inputClass}
            placeholder="0"
            min="0"
            step="0.1"
          />
        </div>
        <div>
          <label className={labelClass}>Carbs (g) *</label>
          <input
            type="number"
            value={carbs}
            onChange={e => setCarbs(e.target.value)}
            className={inputClass}
            placeholder="0"
            min="0"
            step="0.1"
          />
        </div>
      </div>

      {/* Expandable micronutrients */}
      <button
        type="button"
        onClick={() => setShowMicros(v => !v)}
        className="text-left text-sm text-primary/80 hover:text-primary font-medium flex items-center gap-1"
      >
        <span>{showMicros ? '▾' : '▸'}</span>
        Add micronutrients
      </button>

      {showMicros && (
        <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-secondary/50">
          <div>
            <label className={labelClass}>Fiber (g)</label>
            <input type="number" value={fiber} onChange={e => setFiber(e.target.value)} className={inputClass} placeholder="0" min="0" step="0.1" />
          </div>
          <div>
            <label className={labelClass}>Sugar (g)</label>
            <input type="number" value={sugar} onChange={e => setSugar(e.target.value)} className={inputClass} placeholder="0" min="0" step="0.1" />
          </div>
          <div>
            <label className={labelClass}>Sodium (mg)</label>
            <input type="number" value={sodium} onChange={e => setSodium(e.target.value)} className={inputClass} placeholder="0" min="0" step="0.1" />
          </div>
          {MICRO_FIELDS.map(field => (
            <div key={field.key}>
              <label className={labelClass}>{field.label}</label>
              <input
                type="number"
                value={microInputs[field.key] ?? ''}
                onChange={e => setMicroInputs(prev => ({ ...prev, [field.key]: e.target.value }))}
                className={inputClass}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-[--radius-btn] border border-secondary py-2.5 text-sm font-medium text-text/60 hover:text-text hover:border-accent/40 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-[--radius-btn] bg-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? 'Saving…' : isEdit ? 'Update Food' : 'Save Food'}
        </button>
      </div>
    </form>
  )
}
