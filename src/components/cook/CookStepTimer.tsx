import { useState } from 'react'
import { ProgressRing } from '../plan/ProgressRing'

interface CookStepTimerProps {
  secondsRemaining: number
  totalSeconds: number
  isRunning: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onSkip: () => void
  onComplete: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function CookStepTimer({
  secondsRemaining,
  totalSeconds,
  isRunning,
  onStart,
  onPause,
  onReset,
  onSkip,
  onComplete,
}: CookStepTimerProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  const isDone = secondsRemaining <= 0
  const isWarning = !isDone && secondsRemaining <= 60
  const hasElapsed = secondsRemaining < totalSeconds

  function handleSkipClick() {
    if (isRunning) {
      onPause()
    }
    setShowSkipConfirm(true)
  }

  function handleSkipConfirm() {
    setShowSkipConfirm(false)
    onSkip()
  }

  function handleSkipCancel() {
    setShowSkipConfirm(false)
    if (hasElapsed && !isDone) {
      onStart()
    }
  }

  if (showSkipConfirm) {
    return (
      <div className="flex flex-col items-center gap-3 py-3">
        <p className="text-sm text-text font-sans">Skip the rest of this wait?</p>
        <div className="flex gap-3">
          <button
            onClick={handleSkipConfirm}
            className="bg-primary text-white rounded-[--radius-btn] px-4 py-2 text-sm font-semibold"
          >
            Skip
          </button>
          <button
            onClick={handleSkipCancel}
            className="text-text/60 hover:text-text text-sm underline"
          >
            Keep waiting
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-2 py-3${isWarning ? ' animate-pulse' : ''}`}>
      <div className="relative flex items-center justify-center">
        <ProgressRing
          value={totalSeconds - secondsRemaining}
          target={totalSeconds}
          size={64}
          strokeWidth={4}
          color={isWarning ? '#f59e0b' : 'var(--color-primary, #A8C5A0)'}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {isDone ? (
            <div className={`flex flex-col items-center${isDone ? ' animate-bounce' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-xs text-primary font-semibold">Done</span>
            </div>
          ) : (
            <span
              className={`text-sm font-bold tabular-nums${isWarning ? ' text-amber-500' : ' text-text'}`}
              style={{ lineHeight: 1 }}
            >
              {formatTime(secondsRemaining)}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        {!isDone && (
          <>
            {!isRunning ? (
              <button
                onClick={onStart}
                className="bg-primary text-white rounded-[--radius-btn] px-4 py-2 text-sm font-semibold"
              >
                {hasElapsed ? 'Resume' : 'Start'}
              </button>
            ) : (
              <button
                onClick={onPause}
                className="bg-primary text-white rounded-[--radius-btn] px-4 py-2 text-sm font-semibold"
              >
                Pause
              </button>
            )}

            {!isRunning && hasElapsed && (
              <button
                onClick={onReset}
                className="bg-primary text-white rounded-[--radius-btn] px-4 py-2 text-sm font-semibold"
              >
                Reset
              </button>
            )}

            <button
              onClick={handleSkipClick}
              className="text-text/60 hover:text-text text-xs underline"
            >
              Skip
            </button>
          </>
        )}

        {isDone && (
          <button
            onClick={onComplete}
            className="bg-primary text-white rounded-[--radius-btn] px-4 py-2 text-sm font-semibold animate-pulse"
          >
            Mark complete
          </button>
        )}
      </div>
    </div>
  )
}
