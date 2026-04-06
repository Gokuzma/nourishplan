import { useState } from 'react'
import { IssueRow } from './IssueRow'
import type { SlotViolation } from '../../hooks/usePlanViolations'
import type { MonotonyWarning } from '../../utils/monotonyDetection'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface IssuesPanelProps {
  violations: SlotViolation[]
  monotonyWarnings: MonotonyWarning[]
  hasAllergyViolation: boolean
}

export function IssuesPanel({ violations, monotonyWarnings, hasAllergyViolation }: IssuesPanelProps) {
  const totalCount = violations.length + monotonyWarnings.length
  const [expanded, setExpanded] = useState(hasAllergyViolation)

  if (totalCount === 0) {
    return (
      <p className="text-sm text-text/50 py-3 px-4">No issues this week. Your plan looks great.</p>
    )
  }

  return (
    <div className={expanded ? 'bg-secondary border border-accent/30 rounded-[--radius-card] p-2' : ''}>
      <button
        className="w-full py-3 px-4 bg-secondary rounded-[--radius-card] cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-500 shrink-0">
            <path d="M8 2L1 14h14L8 2z" />
            <path d="M8 6v4" strokeLinecap="round" />
            <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
          </svg>
          <span className="text-sm text-text">
            {totalCount} issue{totalCount !== 1 ? 's' : ''} this week
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`transition-transform text-text/50 ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {expanded && (
        <div role="list" className="mt-2 flex flex-col gap-1">
          {violations.map((v, i) => {
            const dayName = DAY_NAMES[v.dayIndex % 7] ?? `Day ${v.dayIndex}`
            return (
              <IssueRow
                key={`violation-${i}`}
                type="violation"
                text={`${v.foodName} in ${dayName} ${v.mealType} (${v.memberName} ${v.strength}s)`}
                detail={`Contains: ${v.foodName}`}
                strength={v.strength}
              />
            )
          })}
          {monotonyWarnings.map((w, i) => (
            <IssueRow
              key={`monotony-${i}`}
              type="monotony"
              text={`${w.recipeName} appears ${w.count}x this week — consider a swap.`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
