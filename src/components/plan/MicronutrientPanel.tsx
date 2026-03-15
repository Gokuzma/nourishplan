import { useState } from 'react'
import {
  MICRONUTRIENT_DISPLAY_ORDER,
  MICRONUTRIENT_LABELS,
  MICRONUTRIENT_UNITS,
} from '../../utils/nutrition'

interface MicronutrientPanelProps {
  micronutrients: Record<string, number> | null | undefined
  servingsMultiplier?: number
  showToggle?: boolean
}

/**
 * Collapsible micronutrient display panel.
 * When showToggle is true, displays a per-person / per-serving toggle.
 * Per-person multiplies values by servingsMultiplier; per-serving shows raw values.
 * Skips nutrients with null, zero, or undefined values.
 * Display order: fiber > sodium > calcium > iron > potassium > vitamin C > vitamin A.
 * Default state is collapsed.
 */
export function MicronutrientPanel({
  micronutrients,
  servingsMultiplier = 1,
  showToggle = false,
}: MicronutrientPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [perPerson, setPerPerson] = useState(false)

  // Collect nutrients that have a meaningful value
  const visibleNutrients = MICRONUTRIENT_DISPLAY_ORDER.filter(key => {
    const value = micronutrients?.[key]
    return value !== null && value !== undefined && value !== 0
  })

  // If no micronutrient data, render nothing
  if (!micronutrients || visibleNutrients.length === 0) {
    return null
  }

  function getValue(key: string): number {
    const raw = micronutrients![key] ?? 0
    return perPerson ? raw * servingsMultiplier : raw
  }

  return (
    <div className="bg-surface rounded-[--radius-card] border border-secondary overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text/70 hover:text-text transition-colors"
        aria-expanded={expanded}
      >
        <span>Micronutrients</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-secondary/50">
          {/* Per-person / Per-serving toggle */}
          {showToggle && (
            <div className="flex items-center gap-2 mt-3 mb-2">
              <span className="text-xs text-text/50">Show:</span>
              <button
                onClick={() => setPerPerson(false)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  !perPerson
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-text/50 hover:text-text'
                }`}
              >
                Per serving
              </button>
              <button
                onClick={() => setPerPerson(true)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  perPerson
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-text/50 hover:text-text'
                }`}
              >
                Per person
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2">
            {visibleNutrients.map(key => {
              const value = getValue(key)
              const label = MICRONUTRIENT_LABELS[key] ?? key
              const unit = MICRONUTRIENT_UNITS[key] ?? ''
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-text/70">{label}</span>
                  <span className="text-text/60 font-medium">
                    {value.toFixed(1)}{unit}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
