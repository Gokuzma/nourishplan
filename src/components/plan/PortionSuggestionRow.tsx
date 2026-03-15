import type { MemberSuggestion } from '../../utils/portionSuggestions'

interface PortionSuggestionRowProps {
  suggestion: MemberSuggestion
  isCurrentUser: boolean
}

/**
 * Displays a single member's portion suggestion: name, percentage, and servings.
 * Shows a macro warning indicator when the suggested portion would push any macro
 * outside the ±20% threshold.
 *
 * Format: "{percentage}% ({servings} svg)" — or just "{servings} svg" if no target.
 */
export function PortionSuggestionRow({ suggestion, isCurrentUser }: PortionSuggestionRowProps) {
  const { memberName, percentage, servings, hasMacroWarning } = suggestion

  const servingsLabel = servings.toFixed(1)
  const portionText =
    percentage !== null
      ? `${Math.round(percentage)}% (${servingsLabel} svg)`
      : `${servingsLabel} svg`

  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className={isCurrentUser ? 'font-semibold text-text' : 'text-text/70'}>
        {isCurrentUser ? 'You' : memberName}
      </span>
      <div className="flex items-center gap-1.5">
        {hasMacroWarning && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-bold leading-none"
            title="This portion may push a macro outside your daily target by more than 20%"
            aria-label="Macro warning"
          >
            !
          </span>
        )}
        <span className={isCurrentUser ? 'font-medium text-text' : 'text-text/60'}>
          {portionText}
        </span>
      </div>
    </div>
  )
}
