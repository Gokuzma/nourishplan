import { LogEntryItem } from './LogEntryItem'
import type { FoodLog } from '../../types/database'
import type { SlotWithMeal } from '../../hooks/useMealPlan'

interface DailyLogListProps {
  logs: FoodLog[]
  unloggedSlots: SlotWithMeal[]
  onLogMeal: (slot: SlotWithMeal) => void
  onEditLog: (log: FoodLog) => void
  onDeleteLog: (id: string) => void
}

/**
 * Renders logged food entries sorted by created_at plus unlogged plan slot cards.
 * Logged entries first (chronological), then unlogged plan slots grouped at the bottom.
 */
export function DailyLogList({
  logs,
  unloggedSlots,
  onLogMeal,
  onEditLog,
  onDeleteLog,
}: DailyLogListProps) {
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const hasContent = sortedLogs.length > 0 || unloggedSlots.length > 0

  if (!hasContent) {
    return (
      <div className="text-center py-10 text-text/40 text-sm">
        No meals logged yet. Use the search bar above to log food.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Logged entries */}
      {sortedLogs.map(log => (
        <LogEntryItem
          key={log.id}
          log={log}
          onEdit={onEditLog}
          onDelete={onDeleteLog}
        />
      ))}

      {/* Unlogged plan slots */}
      {unloggedSlots.length > 0 && (
        <>
          {sortedLogs.length > 0 && (
            <p className="text-xs text-text/40 font-medium uppercase tracking-wide mt-2 mb-1">Planned (not logged)</p>
          )}
          {unloggedSlots.map(slot => (
            <button
              key={slot.id}
              onClick={() => onLogMeal(slot)}
              className="w-full text-left bg-surface rounded-[--radius-card] p-3 border border-dashed border-secondary/60 hover:border-primary/50 transition-colors"
              aria-label={`Log planned meal: ${slot.meals?.name ?? 'Unknown'} for ${slot.slot_name}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-text/50">{slot.slot_name}</span>
                  <p className="text-sm text-text/70 font-medium mt-0.5">
                    {slot.meals?.name ?? 'Meal removed'}
                  </p>
                </div>
                <span className="text-xs text-primary/70 font-medium">Tap to log</span>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
