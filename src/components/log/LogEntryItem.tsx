import type { FoodLog } from '../../types/database'

interface LogEntryItemProps {
  log: FoodLog
  onEdit: (log: FoodLog) => void
  onDelete: (id: string) => void
}

/**
 * Tappable row for an individual food log entry.
 * Shows item name, slot, servings, calories, and privacy indicator.
 * Delete button on the right; tapping the row opens edit.
 */
export function LogEntryItem({ log, onEdit, onDelete }: LogEntryItemProps) {
  const totalCalories = Math.round(log.calories_per_serving * log.servings_logged)

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete(log.id)
  }

  return (
    <div
      className="bg-surface rounded-[--radius-card] p-3 border border-secondary flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => onEdit(log)}
      role="button"
      aria-label={`Edit log entry: ${log.item_name}`}
    >
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-text truncate">{log.item_name}</span>
          {log.is_private && (
            <span className="text-text/40 text-xs" aria-label="Private entry">
              &#128274;
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {log.slot_name && (
            <span className="text-xs text-text/50">{log.slot_name}</span>
          )}
          {log.slot_name && (
            <span className="text-xs text-text/30">&middot;</span>
          )}
          <span className="text-xs text-text/50">
            {log.servings_logged === 1
              ? '1 serving'
              : `${log.servings_logged} servings`}
          </span>
        </div>
      </div>

      {/* Calories */}
      <div className="text-sm font-semibold text-primary shrink-0">
        {totalCalories} kcal
      </div>

      {/* Delete button */}
      <button
        onClick={handleDeleteClick}
        className="p-1.5 text-text/30 hover:text-red-400 transition-colors shrink-0"
        aria-label={`Delete ${log.item_name}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  )
}
