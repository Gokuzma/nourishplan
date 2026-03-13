import { useNavigate } from 'react-router-dom'
import type { Meal } from '../../types/database'

interface MealCardProps {
  meal: Meal & { meal_items?: { calories_per_100g: number; quantity_grams: number }[] }
  onDelete: () => void
}

/**
 * Summary card for a single meal in the meals list.
 * Shows name, item count, and total calories. Tap navigates to /meals/:id.
 */
export function MealCard({ meal, onDelete }: MealCardProps) {
  const navigate = useNavigate()

  const itemCount = meal.meal_items?.length ?? 0
  const totalCalories = meal.meal_items?.reduce((sum, item) => {
    return sum + (item.calories_per_100g * item.quantity_grams) / 100
  }, 0) ?? 0

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-[--radius-card] border border-secondary/50 bg-surface hover:border-accent/40 transition-colors cursor-pointer"
      onClick={() => navigate(`/meals/${meal.id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{meal.name}</p>
        <p className="text-xs text-text/50 mt-0.5">
          {itemCount} item{itemCount !== 1 ? 's' : ''} · {totalCalories.toFixed(0)} cal
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="shrink-0 text-text/30 hover:text-red-500 transition-colors p-1.5"
        title="Delete meal"
        aria-label="Delete meal"
      >
        ×
      </button>
    </div>
  )
}
