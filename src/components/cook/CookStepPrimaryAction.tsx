type ActionLabel =
  | 'Mark complete'
  | 'Start timer'
  | 'Mark complete now'
  | 'Finish cook session'
  | 'Exit cook mode'

interface CookStepPrimaryActionProps {
  label: ActionLabel
  onTap: () => void
  pulse?: boolean
  disabled?: boolean
}

export function CookStepPrimaryAction({ label, onTap, pulse = false, disabled = false }: CookStepPrimaryActionProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-accent/20 px-4 py-3">
      <button
        type="button"
        onClick={onTap}
        disabled={disabled}
        className={`w-full bg-primary text-white rounded-[--radius-btn] h-12 text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 ${pulse ? 'animate-pulse' : ''}`}
      >
        {(label === 'Mark complete' || label === 'Mark complete now' || label === 'Finish cook session') && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 8.5l3.5 3.5 7-7" />
          </svg>
        )}
        {label === 'Start timer' && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="5,2 14,8 5,14" fill="currentColor" stroke="none" />
          </svg>
        )}
        {label}
      </button>
    </div>
  )
}
