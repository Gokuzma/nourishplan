import { useNavigate } from 'react-router-dom'
import type { Meal } from '../../types/database'

interface MealCardProps {
  meal: Meal & { meal_items?: { calories_per_100g: number; quantity_grams: number }[] }
  canDelete: boolean
  isConfirming: boolean
  onDeleteClick: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  isDeleting: boolean
}

/**
 * Summary card for a single meal in the meals list.
 * Shows name, item count, and total calories. Tap navigates to /meals/:id.
 * Delete is permission-gated (creator or admin) with inline confirmation.
 */
export function MealCard({ meal, canDelete, isConfirming, onDeleteClick, onConfirmDelete, onCancelDelete, isDeleting }: MealCardProps) {
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
      {isConfirming ? (
        <span className="flex items-center gap-2 text-xs" onClick={e => e.stopPropagation()}>
          <span className="text-text/60">Delete {meal.name.slice(0, 30)}?</span>
          <button onClick={e => { e.stopPropagation(); onConfirmDelete() }} disabled={isDeleting} className="text-red-500 font-semibold min-h-[44px] px-2">
            {isDeleting ? 'Deleting...' : 'Yes, delete'}
          </button>
          <button onClick={e => { e.stopPropagation(); onCancelDelete() }} className="text-primary min-h-[44px] px-2">Keep it</button>
        </span>
      ) : canDelete ? (
        <button
          onClick={e => { e.stopPropagation(); onDeleteClick() }}
          className="shrink-0 text-text/30 hover:text-red-500 transition-colors p-1.5"
          title="Delete meal"
          aria-label={`Delete ${meal.name}`}
        >
          ×
        </button>
      ) : null}
    </div>
  )
}
