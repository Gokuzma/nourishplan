import { useState } from 'react'
import { useWeeklySpend } from '../../hooks/useWeeklySpend'
import { formatCost } from '../../utils/cost'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface BudgetSummarySectionProps {
  weeklyBudget: number | null
  weekStart: string
  householdId: string | undefined
  onEditBudget: (newBudget: number | null) => void
  plannedDayCosts?: { dayIndex: number; cost: number }[]
}

export function BudgetSummarySection({
  weeklyBudget,
  weekStart,
  householdId,
  onEditBudget,
  plannedDayCosts,
}: BudgetSummarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const { data: spendData } = useWeeklySpend(householdId, weekStart)
  const totalSpend = spendData?.totalSpend ?? 0

  function handleEditStart() {
    setEditValue(weeklyBudget != null ? String(weeklyBudget) : '')
    setIsEditing(true)
  }

  function handleEditSave() {
    const parsed = editValue.trim() === '' ? null : parseFloat(editValue)
    onEditBudget(isNaN(parsed as number) ? null : parsed)
    setIsEditing(false)
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleEditSave()
    if (e.key === 'Escape') setIsEditing(false)
  }

  const spendPercent = weeklyBudget && weeklyBudget > 0 ? (totalSpend / weeklyBudget) * 100 : 0
  const fillWidth = Math.min(spendPercent, 100)
  const isOver = weeklyBudget != null && totalSpend > weeklyBudget
  const isNear = !isOver && spendPercent >= 80

  const fillColor = isOver ? 'bg-red-500' : isNear ? 'bg-amber-400' : 'bg-primary'

  const remaining = weeklyBudget != null ? weeklyBudget - totalSpend : null

  return (
    <div className="rounded-xl border border-accent/20 bg-surface p-4 mt-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text/60 font-medium">Weekly Budget</span>
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          aria-label="Toggle budget section"
          className="text-text/40 hover:text-text transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 200ms ease',
            }}
          >
            <polyline points="2 5 7 10 12 5" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Budget amount row */}
          <div className="flex items-center gap-2 mb-3">
            {weeklyBudget == null ? (
              <p className="text-sm text-text/50 flex-1">
                No budget set. Add a weekly budget to track your household's food spend.
              </p>
            ) : isEditing ? (
              <input
                type="number"
                min="0"
                step="0.01"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={handleEditKeyDown}
                autoFocus
                className="flex-1 px-2 py-1 rounded border border-accent/30 bg-background text-text text-sm focus:outline-none focus:border-primary"
              />
            ) : (
              <span className="text-sm font-medium text-text flex-1">
                {formatCost(weeklyBudget)}/week
              </span>
            )}
            {!isEditing && (
              <button
                onClick={handleEditStart}
                className="text-xs text-primary underline hover:text-primary/70 transition-colors shrink-0"
              >
                {weeklyBudget == null ? 'Set Budget' : 'Edit Budget'}
              </button>
            )}
          </div>

          {/* Spend bar */}
          {weeklyBudget != null && (
            <>
              <div
                role="progressbar"
                aria-valuenow={totalSpend}
                aria-valuemax={weeklyBudget}
                aria-label="Weekly spend"
                className="h-2 rounded-full bg-secondary overflow-hidden mb-1"
              >
                <div
                  className={`h-full rounded-full ${fillColor} transition-all duration-300 ease-out`}
                  style={{ width: `${fillWidth}%` }}
                />
              </div>

              <p className="text-xs text-text/50 mb-2">
                {isOver
                  ? `Over budget · ${formatCost(totalSpend)} spent of ${formatCost(weeklyBudget)}`
                  : `spent ${formatCost(totalSpend)} of ${formatCost(weeklyBudget)} · ${formatCost(remaining!)} remaining`}
              </p>
            </>
          )}

          {/* Per-day cost chips */}
          {plannedDayCosts && plannedDayCosts.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {plannedDayCosts.map(({ dayIndex, cost }) => (
                <span
                  key={dayIndex}
                  className="text-xs px-2 py-1 rounded-full bg-background border border-accent/20"
                >
                  {DAY_LABELS[dayIndex % 7]} · {formatCost(cost)}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
