/*
 * Live generation progress driven by plan_generations.pass_count, which the
 * generate-plan edge function updates as each solver pass starts:
 * 1 = shortlist, 2 = assign, 3-5 = verify/correct. 0 means the job row
 * exists but constraint gathering hasn't reached pass 1 yet.
 */
const PASS_FILL: Record<number, number> = { 0: 8, 1: 25, 2: 50, 3: 70, 4: 80, 5: 90 }

function labelForPass(passCount: number): string {
  if (passCount <= 0) return 'Reading pantry, schedules and preferences...'
  if (passCount === 1) return 'Shortlisting recipes...'
  if (passCount === 2) return 'Choosing meals for each slot...'
  return `Fixing rule violations — check ${passCount - 2} of 3...`
}

interface GenerationProgressBarProps {
  passCount: number
  isVisible: boolean
  isTimeout?: boolean
}

export function GenerationProgressBar({ passCount, isVisible, isTimeout }: GenerationProgressBarProps) {
  const fillPercent = isTimeout ? 100 : (PASS_FILL[passCount] ?? 90)
  const currentLabel = isTimeout
    ? 'Best plan found (time limit reached)'
    : labelForPass(passCount)

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
