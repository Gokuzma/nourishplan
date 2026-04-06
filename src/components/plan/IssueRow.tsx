interface IssueRowProps {
  type: 'violation' | 'monotony'
  text: string
  detail?: string
  strength?: 'dislikes' | 'refuses' | 'allergy'
  swapSuggestion?: string
  onSwap?: () => void
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
      <path d="M8 2L1 14h14L8 2z" />
      <path d="M8 6v4" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function RepeatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
      <path d="M2 8a6 6 0 0 1 6-6h4" strokeLinecap="round" />
      <path d="M14 8a6 6 0 0 1-6 6H4" strokeLinecap="round" />
      <path d="M10 2l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 14l-2-2 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IssueRow({ type, text, detail, strength, swapSuggestion, onSwap }: IssueRowProps) {
  let borderColor = 'border-l-primary/60'
  if (type === 'violation') {
    if (strength === 'allergy') borderColor = 'border-l-red-400'
    else if (strength === 'refuses') borderColor = 'border-l-amber-400'
    else borderColor = 'border-l-accent/40'
  }

  return (
    <div role="listitem" className={`py-2 px-3 border-l-[3px] ${borderColor}`}>
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 text-text/50">
          {type === 'violation' ? <WarningIcon /> : <RepeatIcon />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text">{text}</p>
          {detail && <p className="text-xs text-text/50">{detail}</p>}
          {swapSuggestion && onSwap && (
            <span
              className="text-xs text-primary underline cursor-pointer"
              onClick={onSwap}
            >
              Try {swapSuggestion} instead
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
