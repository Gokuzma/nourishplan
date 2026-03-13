import type { NormalizedFoodResult } from '../../types/database'

interface FoodDetailPanelProps {
  food: NormalizedFoodResult
  onClose: () => void
  onAdd?: (food: NormalizedFoodResult) => void
}

function NutrientRow({ label, value, unit = 'g', bold = false }: {
  label: string
  value: number | undefined
  unit?: string
  bold?: boolean
}) {
  if (value === undefined || value === null) return null
  return (
    <div className={`flex justify-between py-1.5 border-b border-secondary/40 last:border-0 ${bold ? 'font-semibold' : ''}`}>
      <span className={bold ? 'text-text' : 'text-text/70'}>{label}</span>
      <span className={bold ? 'text-primary' : 'text-text/70'}>
        {value % 1 === 0 ? value : value.toFixed(1)}{unit}
      </span>
    </div>
  )
}

const MICRO_LABELS: Record<string, string> = {
  vitamin_d: 'Vitamin D',
  calcium: 'Calcium',
  iron: 'Iron',
  potassium: 'Potassium',
  vitamin_c: 'Vitamin C',
  vitamin_a: 'Vitamin A',
}

export function FoodDetailPanel({ food, onClose, onAdd }: FoodDetailPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-secondary/40">
          <div>
            <h2 className="font-bold text-lg text-primary leading-tight pr-4">{food.name}</h2>
            <span className="text-xs text-text/50 capitalize">{food.source === 'usda' ? 'USDA' : food.source === 'off' ? 'Open Food Facts' : 'My Foods'}</span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center text-text/60 hover:text-text hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Nutrition per 100g */}
        <div className="p-4">
          <p className="text-xs text-text/50 mb-3 font-medium uppercase tracking-wide">Nutrition per 100g</p>

          <div className="mb-2">
            <NutrientRow label="Calories" value={food.calories} unit=" kcal" bold />
            <NutrientRow label="Protein" value={food.protein} bold />
            <NutrientRow label="Fat" value={food.fat} bold />
            <NutrientRow label="Carbohydrates" value={food.carbs} bold />
          </div>

          {(food.fiber !== undefined || food.sugar !== undefined || food.sodium !== undefined) && (
            <div className="mt-3">
              <p className="text-xs text-text/40 mb-1 font-medium">Other nutrients</p>
              <NutrientRow label="Fiber" value={food.fiber} />
              <NutrientRow label="Sugar" value={food.sugar} />
              <NutrientRow label="Sodium" value={food.sodium} unit="mg" />
            </div>
          )}

          {food.micronutrients && Object.keys(food.micronutrients).length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-text/40 mb-1 font-medium">Micronutrients</p>
              {Object.entries(food.micronutrients).map(([key, value]) => (
                <NutrientRow
                  key={key}
                  label={MICRO_LABELS[key] ?? key}
                  value={value}
                  unit=""
                />
              ))}
            </div>
          )}
        </div>

        {/* Add button */}
        {onAdd && (
          <div className="p-4 pt-0">
            <button
              onClick={() => onAdd(food)}
              className="w-full bg-primary text-white rounded-[--radius-btn] py-2.5 font-semibold hover:opacity-90 transition-opacity"
            >
              Add to Recipe
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
