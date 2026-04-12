import { CookStepTimer } from './CookStepTimer'
import type { RecipeStep, CookSessionStepState } from '../../types/database'

interface CookStepCardProps {
  step: RecipeStep
  stepState: CookSessionStepState
  stepNumber: number
  isActive: boolean
  ownerName: string | null
  onCheckOff?: () => void
  onTimerStart: () => void
  onTimerPause: () => void
  onTimerReset: () => void
  onTimerSkip: () => void
  onTimerComplete: () => void
  timerSecondsRemaining: number | null
  timerRunning: boolean
}

function formatCompletedAt(isoString: string | null): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function CookStepCard({
  step,
  stepState,
  stepNumber,
  isActive,
  ownerName,
  onCheckOff: _onCheckOff,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  onTimerSkip,
  onTimerComplete,
  timerSecondsRemaining,
  timerRunning,
}: CookStepCardProps) {
  const isCompleted = stepState.completed_at !== null

  if (isCompleted) {
    return (
      <div className="bg-secondary/60 rounded-[--radius-card] px-4 py-2 flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-primary/40 text-white flex items-center justify-center text-xs shrink-0">
          {stepNumber}
        </div>
        <span className="text-sm text-text/40 font-sans line-through flex-1">{step.text}</span>
        <span className="text-xs text-text/40 font-sans ml-auto shrink-0">
          {formatCompletedAt(stepState.completed_at)}
        </span>
      </div>
    )
  }

  if (isActive) {
    const showTimerBlock =
      step.duration_minutes > 0 && timerSecondsRemaining !== null

    return (
      <div className="bg-surface border-2 border-primary rounded-[--radius-card] px-4 py-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0">
            {stepNumber}
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="text-base font-medium text-text font-sans">{step.text}</span>

            <div className="flex items-center gap-2 flex-wrap">
              {step.is_active ? (
                <span className="bg-accent/10 text-accent text-xs rounded-full px-2 py-0.5 font-sans">
                  Hands-on
                </span>
              ) : (
                <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5 font-sans">
                  Passive wait
                </span>
              )}
            </div>

            {step.ingredients_used.length > 0 && (
              <div className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text/40 shrink-0">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                  <path d="M7 2v20" />
                  <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                </svg>
                <span className="text-xs text-text/50 font-sans">
                  {step.ingredients_used.join(', ')}
                </span>
              </div>
            )}

            {step.equipment.length > 0 && (
              <div className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text/40 shrink-0">
                  <path d="M7 10H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h5" />
                  <path d="M15 12H9" />
                  <rect x="15" y="2" width="8" height="20" rx="2" />
                </svg>
                <span className="text-xs text-text/50 font-sans">
                  {step.equipment.join(', ')}
                </span>
              </div>
            )}

            {ownerName && (
              <span className="text-xs text-primary bg-primary/10 rounded-full px-2 py-0.5 self-start font-sans">
                {ownerName} is doing this
              </span>
            )}
          </div>
        </div>

        {showTimerBlock && (
          <div className="border-t border-accent/20 pt-3">
            <CookStepTimer
              secondsRemaining={timerSecondsRemaining!}
              totalSeconds={step.duration_minutes * 60}
              isRunning={timerRunning}
              onStart={onTimerStart}
              onPause={onTimerPause}
              onReset={onTimerReset}
              onSkip={onTimerSkip}
              onComplete={onTimerComplete}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-secondary rounded-[--radius-card] px-4 py-3 opacity-60 flex items-start gap-3">
      <div className="w-6 h-6 rounded-full border border-text/20 text-text/60 flex items-center justify-center text-xs shrink-0">
        {stepNumber}
      </div>
      <span className="text-sm text-text/60 font-sans flex-1">{step.text}</span>
      {step.duration_minutes > 0 && (
        <span className="text-xs text-text/40 font-sans ml-auto shrink-0">
          {step.duration_minutes} min
        </span>
      )}
      {ownerName && (
        <div className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0">
          {ownerName.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}
