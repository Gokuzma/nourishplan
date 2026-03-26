import { useState } from 'react'
import type { FoodLog, NutritionTarget } from '../../types/database'

interface NutrientBreakdownProps {
  logs: FoodLog[]
  target: NutritionTarget | null
}

/**
 * Collapsible section showing micronutrient and custom goal actual vs target.
 * Default state is collapsed.
 */
export function NutrientBreakdown({ logs, target }: NutrientBreakdownProps) {
  const [expanded, setExpanded] = useState(false)

  const hasTargetData =
    target !== null &&
    (target.calories != null ||
      target.protein_g != null ||
      target.carbs_g != null ||
      target.fat_g != null ||
      Object.keys(target.micronutrients ?? {}).length > 0 ||
      Object.keys(target.custom_goals ?? {}).length > 0)

  // Sum micronutrients across all log entries
  function sumNutrient(key: string): number {
    return logs.reduce((acc, log) => {
      return acc + (log.micronutrients?.[key] ?? 0) * log.servings_logged
    }, 0)
  }

  return (
    <div className="bg-surface rounded-[--radius-card] border border-secondary overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text/70 hover:text-text transition-colors"
        aria-expanded={expanded}
      >
        <span>Nutrient Details</span>
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

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-secondary/50">
          {!hasTargetData ? (
            <p className="text-sm text-text/50 mt-3">Set targets to see comparison</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {/* Macros */}
              {(target!.calories != null || target!.protein_g != null || target!.carbs_g != null || target!.fat_g != null) && (() => {
                const totalCalories = logs.reduce((acc, log) => acc + log.calories_per_serving * log.servings_logged, 0)
                const totalProtein = logs.reduce((acc, log) => acc + log.protein_per_serving * log.servings_logged, 0)
                const totalCarbs = logs.reduce((acc, log) => acc + log.carbs_per_serving * log.servings_logged, 0)
                const totalFat = logs.reduce((acc, log) => acc + log.fat_per_serving * log.servings_logged, 0)
                const macros = [
                  { label: 'Calories', actual: totalCalories, target: target!.calories, unit: 'kcal' },
                  { label: 'Protein', actual: totalProtein, target: target!.protein_g, unit: 'g' },
                  { label: 'Carbs', actual: totalCarbs, target: target!.carbs_g, unit: 'g' },
                  { label: 'Fat', actual: totalFat, target: target!.fat_g, unit: 'g' },
                ].filter(m => m.target != null)
                return (
                  <div>
                    <p className="text-xs font-semibold text-text/50 uppercase tracking-wide mb-2">Macros</p>
                    <div className="flex flex-col gap-2">
                      {macros.map(m => {
                        const pct = m.target! > 0 ? Math.min((m.actual / m.target!) * 100, 100) : 0
                        return (
                          <div key={m.label}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-text/70">{m.label}</span>
                              <span className="text-text/60">
                                {m.actual.toFixed(1)} / {m.target} {m.unit}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Micronutrients */}
              {Object.keys(target!.micronutrients ?? {}).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text/50 uppercase tracking-wide mb-2">Micronutrients</p>
                  <div className="flex flex-col gap-2">
                    {Object.entries(target!.micronutrients).map(([key, targetValue]) => {
                      const actual = sumNutrient(key)
                      const pct = targetValue > 0 ? Math.min((actual / targetValue) * 100, 100) : 0
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text/70 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-text/60">
                              {actual.toFixed(1)} / {targetValue}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/70 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Custom goals */}
              {Object.keys(target!.custom_goals ?? {}).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text/50 uppercase tracking-wide mb-2">Custom Goals</p>
                  <div className="flex flex-col gap-2">
                    {Object.entries(target!.custom_goals).map(([key, targetValue]) => {
                      const actual = sumNutrient(key)
                      const pct = targetValue > 0 ? Math.min((actual / targetValue) * 100, 100) : 0
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text/70 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-text/60">
                              {actual.toFixed(1)} / {targetValue}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent/70 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
