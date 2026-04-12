import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CookProgressBar } from './CookProgressBar'
import type { CookSession } from '../../types/database'

interface CookModeShellProps {
  mealName: string
  subtitle?: string
  completedSteps: number
  totalSteps: number
  hasProgress: boolean
  concurrentSessions?: CookSession[]
  currentSessionId?: string
  children: React.ReactNode
  footer: React.ReactNode
}

export function CookModeShell({
  mealName,
  subtitle,
  completedSteps,
  totalSteps,
  hasProgress,
  concurrentSessions = [],
  currentSessionId,
  children,
  footer,
}: CookModeShellProps) {
  const navigate = useNavigate()
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  function handleBackTap() {
    if (hasProgress) {
      setShowExitConfirm(true)
    } else {
      navigate(-1)
    }
  }

  function confirmExit() {
    setShowExitConfirm(false)
    navigate(-1)
  }

  const showMultiSwitcher = concurrentSessions.length > 1

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-surface border-b border-accent/20 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackTap}
          aria-label="Exit cook mode"
          className="p-1 -ml-1 text-text/60 hover:text-text transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>

        <div className="flex-1 min-w-0 mx-3 text-center">
          <p className="text-sm font-semibold text-text truncate">{mealName}</p>
          {subtitle && (
            <p className="text-xs text-text/50 truncate">{subtitle}</p>
          )}
        </div>

        {showMultiSwitcher ? (
          <div role="tablist" className="flex gap-1 max-w-[40vw] overflow-x-auto scrollbar-none">
            {concurrentSessions.map(s => {
              const isActive = s.id === currentSessionId
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => navigate(`/cook/session/${s.id}`)}
                  className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${isActive ? 'bg-primary text-white' : 'bg-secondary text-text/60'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${isActive ? 'bg-white' : 'bg-primary/40'}`} aria-hidden="true" />
                  {s.meal_id ?? 'Recipe'}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="w-6" />
        )}
      </div>

      {/* Progress bar */}
      <CookProgressBar completedSteps={completedSteps} totalSteps={totalSteps} />

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {children}
      </div>

      {/* Footer */}
      {footer}

      {/* Exit confirmation overlay */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="max-w-sm w-full bg-surface rounded-2xl shadow-xl p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-text">Exit cook mode?</h2>
            <p className="text-sm text-text/70 font-sans">Progress will be saved.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmExit}
                className="flex-1 bg-primary text-white rounded-[--radius-btn] px-4 py-2 text-sm font-semibold"
              >
                Exit
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-secondary text-text rounded-[--radius-btn] px-4 py-2 text-sm font-semibold"
              >
                Keep cooking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
