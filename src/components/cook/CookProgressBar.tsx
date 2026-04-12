interface CookProgressBarProps {
  completedSteps: number
  totalSteps: number
}

export function CookProgressBar({ completedSteps, totalSteps }: CookProgressBarProps) {
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${completedSteps} of ${totalSteps} steps complete`}
      className="h-1.5 bg-primary/20 w-full"
    >
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
