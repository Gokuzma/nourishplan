import type { RecipeIngredient, MacroSummary } from '../../types/database'

interface IngredientRowProps {
  ingredient: RecipeIngredient
  foodData: { name: string; macros: MacroSummary } | null
  onEdit: () => void
  onRemove: () => void
  onToggleWeightState: () => void
}

/**
 * Single ingredient row showing food name, quantity, per-ingredient nutrition,
 * raw/cooked toggle, and edit/remove actions.
 */
export function IngredientRow({ ingredient, foodData, onEdit, onRemove, onToggleWeightState }: IngredientRowProps) {
  const name = foodData?.name ?? 'Loading...'
  const macros = foodData?.macros
  const isRecipe = ingredient.ingredient_type === 'recipe'
  const isCooked = ingredient.weight_state === 'cooked'

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-[--radius-btn] border border-secondary/50 bg-surface">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isRecipe && (
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

      {/* Raw/cooked toggle */}
      <button
        onClick={onToggleWeightState}
        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded border transition-colors ${
          isCooked
            ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
            : 'bg-surface text-text/50 border-secondary/60 hover:text-text hover:border-secondary'
        }`}
        title={isCooked ? 'Switch to raw weight' : 'Switch to cooked weight'}
        aria-label={isCooked ? 'Cooked — click to switch to raw' : 'Raw — click to switch to cooked'}
      >
        {isCooked ? 'Cooked' : 'Raw'}
      </button>

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
