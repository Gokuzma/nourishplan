import { calcIngredientNutrition } from '../../utils/nutrition'
import type { MealItem, MacroSummary } from '../../types/database'

interface MealItemRowProps {
  item: MealItem
  onEdit: () => void
  onRemove: () => void
}

/**
 * Displays a single meal item row with per-100g macro snapshot and calculated nutrition.
 * Quantity is not directly editable in-row — tap the quantity to open edit modal.
 */
export function MealItemRow({ item, onEdit, onRemove }: MealItemRowProps) {
  const macros: MacroSummary = {
    calories: item.calories_per_100g,
    protein: item.protein_per_100g,
    fat: item.fat_per_100g,
    carbs: item.carbs_per_100g,
  }

  const nutrition = calcIngredientNutrition(macros, item.quantity_grams)

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-[--radius-btn] border border-secondary/50 bg-surface">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs bg-accent/20 text-accent font-medium px-1.5 py-0.5 rounded shrink-0">
            {item.item_type === 'food' ? 'F' : 'R'}
          </span>
          <p className="text-sm text-text truncate">{item.item_name || item.item_id}</p>
        </div>
        <p className="text-xs text-text/50">
          {nutrition.calories.toFixed(1)} cal · {nutrition.protein.toFixed(1)}g P · {nutrition.carbs.toFixed(1)}g C · {nutrition.fat.toFixed(1)}g F
        </p>
      </div>
      <button
        onClick={onEdit}
        className="shrink-0 text-sm text-text/60 hover:text-primary transition-colors px-2 py-1 rounded-[--radius-btn] border border-secondary/50 hover:border-primary/40"
        title="Edit quantity"
      >
        {item.quantity_grams}g
      </button>
      <button
        onClick={onRemove}
        className="shrink-0 text-text/30 hover:text-red-500 transition-colors p-1.5"
        title="Remove item"
        aria-label="Remove item"
      >
        ×
      </button>
    </div>
  )
}
