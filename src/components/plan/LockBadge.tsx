interface LockBadgeProps {
  isLocked: boolean
  onToggle: () => void
  className?: string
}

export function LockBadge({ isLocked, onToggle, className }: LockBadgeProps) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={isLocked}
      aria-label={isLocked ? 'Unlock this slot' : 'Lock this slot'}
      onClick={onToggle}
      className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
        isLocked
          ? 'bg-primary text-white'
          : 'bg-surface border border-accent/30 text-text/40'
      } ${className ?? ''}`}
    >
      {isLocked ? (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="8" width="10" height="7" rx="1" fill="currentColor" />
          <path d="M5 8V5a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="8" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M5 8V5a3 3 0 016 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      )}
    </button>
  )
}
