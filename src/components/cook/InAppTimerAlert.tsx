import { useEffect, useState } from 'react'

interface InAppTimerAlertProps {
  stepText: string
  mealName: string
  onDismiss: () => void
}

export function InAppTimerAlert({ stepText, mealName, onDismiss }: InAppTimerAlertProps) {
  const [visible, setVisible] = useState(true)

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, 10000)
    return () => clearTimeout(t)
  }, [onDismiss])

  if (!visible) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 p-4 flex justify-center pointer-events-none">
      <div
        className="bg-primary text-white rounded-[--radius-card] shadow-xl px-4 py-3 flex items-center gap-3 max-w-sm pointer-events-auto animate-bounce"
        style={{ animationDuration: '2s', animationIterationCount: '2' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Timer complete</p>
          <p className="text-xs opacity-80 truncate">{mealName}: {stepText}</p>
        </div>
        <button
          type="button"
          onClick={() => { setVisible(false); onDismiss() }}
          className="text-white/60 hover:text-white flex-shrink-0 text-lg"
          aria-label="Dismiss timer alert"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
