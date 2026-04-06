import { useState } from 'react'
import type { WeeklyGap } from '../../utils/nutritionGaps'

export interface SwapSuggestion {
  memberId: string
  memberName: string
  dayIndex: number
  dayName: string
  slotName: string
  recipeName: string
  nutrientGain: number
  nutrient: string
}

interface NutritionGapCardProps {
  gaps: WeeklyGap[]
  swapSuggestions?: SwapSuggestion[]
  onApplySwap?: (swap: SwapSuggestion) => void
}

export function NutritionGapCard({ gaps, swapSuggestions = [], onApplySwap }: NutritionGapCardProps) {
  const [expanded, setExpanded] = useState(false)

  if (gaps.length === 0) return null

  const memberCount = new Set(gaps.map(g => g.memberId)).size
  const memberLabel = `${memberCount} member${memberCount !== 1 ? 's' : ''}`

  return (
    <div className={expanded ? 'bg-secondary border border-accent/30 rounded-[--radius-card] p-2' : ''}>
      <button
        className="w-full px-4 py-3 bg-secondary rounded-[--radius-card] flex items-center justify-between"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-500 shrink-0">
            <path d="M8 2L1 14h14L8 2z" />
            <path d="M8 6v4" strokeLinecap="round" />
            <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
          </svg>
          <span className="text-sm font-semibold text-text">
            {memberLabel} below nutrition target this week
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
        <div className="mt-2 flex flex-col gap-2 px-2">
          {gaps.map((gap, i) => {
            const pct = Math.round(gap.percentOfTarget * 100)
            const deficit = Math.round(gap.weeklyTarget - gap.weeklyActual)
            const swap = swapSuggestions.find(
              s => s.memberId === gap.memberId && s.nutrient === gap.nutrient,
            )

            return (
              <div key={`${gap.memberId}-${gap.nutrient}-${i}`} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text font-sans">{gap.memberName}</span>
                  <span className="text-xs text-amber-500 font-semibold font-sans">
                    {gap.nutrient} {pct}% of target
                  </span>
                </div>
                <p className="text-xs text-text/50 font-sans">
                  {deficit > 0 ? `${deficit}${gap.nutrient === 'calories' ? ' kcal' : 'g'} short this week` : ''}
                </p>
                {swap && onApplySwap && (
                  <button
                    onClick={() => onApplySwap(swap)}
                    aria-label={`Swap ${swap.dayName} ${swap.slotName} to ${swap.recipeName} to close ${gap.memberName} ${gap.nutrient} gap`}
                    className="text-primary text-xs underline text-left font-sans"
                  >
                    Swap {swap.dayName} {swap.slotName} to {swap.recipeName} (+{swap.nutrientGain}g {swap.nutrient})
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
