const STEP_LABELS = [
  'Shortlisting recipes...',
  'Assigning to slots...',
  'Verifying constraints...',
  'Finalising plan...',
] as const

interface GenerationProgressBarProps {
  step: number
  isVisible: boolean
  isTimeout?: boolean
}

export function GenerationProgressBar({ step, isVisible, isTimeout }: GenerationProgressBarProps) {
  const fillPercent = Math.min(100, ((step + 1) / STEP_LABELS.length) * 100)
  const currentLabel = isTimeout
    ? 'Best plan found (time limit reached)'
    : (STEP_LABELS[step] ?? STEP_LABELS[STEP_LABELS.length - 1])

  return (
    <div
      className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fillPercent}
        aria-valuetext={currentLabel}
        className="h-1 w-full bg-primary/20 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      <p className={`text-xs font-sans text-center mt-1.5 ${isTimeout ? 'text-amber-500' : 'text-text/50'}`}>
        {currentLabel}
      </p>
    </div>
  )
}
