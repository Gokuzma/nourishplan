interface BatchPrepButtonProps {
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
}

function BowlIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 13a8 8 0 0 0 16 0H4Z" />
      <path d="M8 9c0-1 .5-2 2-2s2 1 2 2" />
      <path d="M14 9c0-1 .5-2 2-2s2 1 2 2" />
      <path d="M3 13h18" />
    </svg>
  )
}

export function BatchPrepButton({ onClick, disabled, isLoading }: BatchPrepButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      aria-label="View batch prep summary for this week's plan"
      title={disabled ? 'Generate a plan first' : undefined}
      className="bg-secondary border border-primary/30 text-primary rounded-[--radius-btn] px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 w-full sm:w-[180px] disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary/50 transition-colors font-sans"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span>Computing...</span>
        </>
      ) : (
        <>
          <BowlIcon />
          <span>Batch prep</span>
        </>
      )}
    </button>
  )
}
