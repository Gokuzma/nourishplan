import { useState } from 'react'
import { MICRONUTRIENT_DISPLAY_ORDER, MICRONUTRIENT_LABELS } from '../../utils/nutrition'
import type { FoodLog } from '../../types/database'

interface LogEntryItemProps {
  log: FoodLog
  onEdit: (log: FoodLog) => void
  onDelete: (id: string) => void
}

/**
 * Tappable row for an individual food log entry.
 * Shows item name, slot, servings, calories, and privacy indicator.
 * Tapping the row expands to show micronutrient breakdown.
 * Edit button opens edit modal; delete button removes the entry.
 */
export function LogEntryItem({ log, onEdit, onDelete }: LogEntryItemProps) {
  const [expanded, setExpanded] = useState(false)
  const totalCalories = Math.round(log.calories_per_serving * log.servings_logged)

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm('Delete this entry?')) return
    onDelete(log.id)
  }

  return (
    <div
      className="bg-surface rounded-[--radius-card] p-3 border border-secondary cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => setExpanded(v => !v)}
      role="button"
      aria-expanded={expanded}
      aria-label={`${log.item_name} log entry`}
    >
      <div className="flex items-center gap-3">
        {/* Chevron indicator */}
        <span className="text-xs text-text/30 shrink-0" aria-hidden="true">
          {expanded ? '\u25BE' : '\u25B8'}
        </span>

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
              {`${parseFloat(log.servings_logged.toFixed(2))} ${log.serving_unit ?? 'serving'}`}
            </span>
          </div>
        </div>

        {/* Calories */}
        <div className="text-sm font-semibold text-primary shrink-0">
          {totalCalories} kcal
        </div>

        {/* Edit button */}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(log) }}
          className="text-xs text-text/40 hover:text-text transition-colors shrink-0 px-1"
          aria-label={`Edit ${log.item_name}`}
        >
          Edit
        </button>

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

      {/* Expanded micronutrient section */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-secondary/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-text/40 mb-1.5">Micronutrients</p>
          {(() => {
            const micros = log.micronutrients ?? {}
            const hasData = MICRONUTRIENT_DISPLAY_ORDER.some(key => (micros[key] ?? 0) * log.servings_logged > 0)
            if (!hasData) {
              return <p className="text-xs text-text/40 italic">No micronutrient data for this entry</p>
            }
            return (
              <div className="flex flex-col gap-0.5">
                {MICRONUTRIENT_DISPLAY_ORDER.map(key => {
                  const val = (micros[key] ?? 0) * log.servings_logged
                  if (val <= 0) return null
                  return (
                    <div key={key} className="flex justify-between text-xs text-text/60">
                      <span>{MICRONUTRIENT_LABELS[key]}</span>
                      <span>{val.toFixed(1)}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
