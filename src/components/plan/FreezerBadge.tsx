interface FreezerBadgeProps {
  variant: 'full' | 'compact' | 'icon-only' | 'storage-freezer' | 'storage-fridge'
  shelfLifeWeeks?: number | null
  shelfLifeDays?: number | null
  className?: string
}

function SnowflakeIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M8 2v12M2 8h12M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </svg>
  )
}

export function FreezerBadge({ variant, shelfLifeWeeks, shelfLifeDays, className = '' }: FreezerBadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium font-sans'

  if (variant === 'icon-only') {
    return (
      <span className={`inline-flex items-center text-sky-600 dark:text-sky-400 ${className}`} aria-label="Freezes well">
        <SnowflakeIcon />
      </span>
    )
  }

  if (variant === 'storage-freezer') {
    return (
      <span className={`${baseClasses} bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 ${className}`} aria-label="Freeze portion">
        <SnowflakeIcon />
        <span>Freeze portion</span>
      </span>
    )
  }

  if (variant === 'storage-fridge') {
    const label = typeof shelfLifeDays === 'number' ? `Fridge ${shelfLifeDays} days` : 'Fridge'
    return (
      <span className={`${baseClasses} bg-accent/20 text-accent ${className}`} aria-label={label}>
        <span>{label}</span>
      </span>
    )
  }

  // 'full' or 'compact' — sky-blue pill
  const label = variant === 'full' && typeof shelfLifeWeeks === 'number'
    ? `Freezes well · ${shelfLifeWeeks} wks`
    : 'Freezes well'

  return (
    <span className={`${baseClasses} bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 ${className}`} aria-label={label}>
      <SnowflakeIcon />
      <span>{label}</span>
    </span>
  )
}
