import type { MacroSummary } from '../../types/database'

interface NutritionBarProps {
  macros: MacroSummary
}

/**
 * Sticky bottom bar showing per-serving macro summary.
 * Positioned above the TabBar (bottom-16 on mobile, bottom-0 on md+).
 */
export function NutritionBar({ macros }: NutritionBarProps) {
  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 bg-surface border-t border-secondary/60 shadow-sm px-4 py-2.5 md:left-64">
      <p className="text-sm text-text/70 text-center font-sans">
        <span className="font-semibold text-text">Per serving:</span>
        {' '}
        <span className="font-medium text-primary">{macros.calories.toFixed(1)}</span>
        {' cal '}
        <span className="text-text/50">|</span>
        {' '}
        <span className="font-medium">{macros.protein.toFixed(1)}g</span>
        {' P '}
        <span className="text-text/50">|</span>
        {' '}
        <span className="font-medium">{macros.carbs.toFixed(1)}g</span>
        {' C '}
        <span className="text-text/50">|</span>
        {' '}
        <span className="font-medium">{macros.fat.toFixed(1)}g</span>
        {' F'}
      </p>
    </div>
  )
}
