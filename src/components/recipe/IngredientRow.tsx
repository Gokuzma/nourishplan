import type { RecipeIngredient, MacroSummary } from '../../types/database'

interface IngredientRowProps {
  ingredient: RecipeIngredient
  foodData: { name: string; macros: MacroSummary } | null
  onEdit: () => void
  onRemove: () => void
}

/**
 * Single ingredient row showing food name, quantity, per-ingredient nutrition,
 * and edit/remove actions.
 */
export function IngredientRow({ ingredient, foodData, onEdit, onRemove }: IngredientRowProps) {
  const name = foodData?.name ?? 'Loading...'
  const macros = foodData?.macros

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-[--radius-btn] border border-secondary/50 bg-surface">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {ingredient.ingredient_type === 'recipe' && (
            <span
              className="shrink-0 text-xs bg-accent/20 text-accent font-medium px-1.5 py-0.5 rounded"
              title="Recipe ingredient"
            >
              R
            </span>
          )}
          <span className="text-sm text-text truncate">{name}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text/50">{ingredient.quantity_grams}g</span>
          {macros && (
            <span className="text-xs text-text/40">
              {macros.calories.toFixed(0)} kcal · P {macros.protein.toFixed(1)}g · C {macros.carbs.toFixed(1)}g · F {macros.fat.toFixed(1)}g
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onEdit}
        className="shrink-0 text-text/40 hover:text-primary transition-colors p-1.5"
        title="Edit quantity"
        aria-label="Edit ingredient"
      >
        ✎
      </button>
      <button
        onClick={onRemove}
        className="shrink-0 text-text/40 hover:text-red-500 transition-colors p-1.5"
        title="Remove ingredient"
        aria-label="Remove ingredient"
      >
        ×
      </button>
    </div>
  )
}
