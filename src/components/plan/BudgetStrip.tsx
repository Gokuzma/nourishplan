import { useState } from 'react'
import { useWeeklySpend } from '../../hooks/useWeeklySpend'
import { formatCost } from '../../utils/cost'

interface BudgetStripProps {
  weeklyBudget: number | null
  weekStart: string
  householdId: string | undefined
  onEditBudget: (newBudget: number | null) => void
}

const SLOTS_PER_WEEK = 28

export function BudgetStrip({ weeklyBudget, weekStart, householdId, onEditBudget }: BudgetStripProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const { data: spendData } = useWeeklySpend(householdId, weekStart)
  const totalSpend = spendData?.totalSpend ?? 0

  function handleEditStart() {
    setEditValue(weeklyBudget != null ? String(weeklyBudget) : '')
    setIsEditing(true)
  }

  function handleEditSave() {
    const trimmed = editValue.trim()
    if (trimmed === '') {
      onEditBudget(null)
    } else {
      const parsed = parseFloat(trimmed)
      onEditBudget(isNaN(parsed) ? null : parsed)
    }
    setIsEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleEditSave()
    if (e.key === 'Escape') setIsEditing(false)
  }

  const remaining = weeklyBudget != null ? weeklyBudget - totalSpend : null
  const perMeal = weeklyBudget != null ? weeklyBudget / SLOTS_PER_WEEK : null
  const isOver = weeklyBudget != null && totalSpend > weeklyBudget

  return (
    <div className="budget-strip">
      {/* Weekly cap — editable */}
      <div>
        <div className="blabel">This week&apos;s purse</div>
        {isEditing ? (
          <input
            type="number"
            min="0"
            step="0.01"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="bnum tnum"
            style={{
              background: 'transparent',
              border: '1px dashed var(--rule-soft)',
              color: 'var(--ink)',
              outline: 'none',
              width: '100%',
              padding: '2px 4px',
            }}
            aria-label="Edit weekly budget"
          />
        ) : (
          <button
            type="button"
            onClick={handleEditStart}
            className="bnum tnum"
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              color: 'inherit',
              fontFamily: 'inherit',
              fontStyle: 'inherit',
              fontSize: 'inherit',
              letterSpacing: 'inherit',
            }}
            aria-label={weeklyBudget == null ? 'Set weekly budget' : 'Edit weekly budget'}
          >
            {weeklyBudget == null ? <em>—</em> : formatCost(weeklyBudget)}
          </button>
        )}
      </div>

      {/* Spent */}
      <div>
        <div className="blabel">Spent</div>
        <div className="bnum tnum">
          {formatCost(totalSpend)}
          {weeklyBudget != null && (
            <span className="of"> / {formatCost(weeklyBudget)}</span>
          )}
        </div>
      </div>

      {/* Remaining (accent red if over budget, chartreuse if comfortable) */}
      <div>
        <div className="blabel">Remaining</div>
        <div className={`bnum tnum ${isOver ? 'accent' : 'chart'}`}>
          {remaining == null ? <em>—</em> : (isOver ? `−${formatCost(Math.abs(remaining))}` : formatCost(remaining))}
        </div>
      </div>

      {/* Per meal */}
      <div>
        <div className="blabel">Per meal</div>
        <div className="bnum tnum">
          {perMeal == null ? <em>—</em> : formatCost(perMeal)}
        </div>
      </div>
    </div>
  )
}
