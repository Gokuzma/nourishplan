import { getExpiryUrgency } from '../../utils/inventory'

interface ExpiryBadgeProps {
  expiresAt: string | null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function ExpiryBadge({ expiresAt }: ExpiryBadgeProps) {
  const urgency = getExpiryUrgency(expiresAt)

  if (urgency === 'none' || expiresAt === null) return null

  if (urgency === 'expired') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Expired {formatDate(expiresAt)}
      </span>
    )
  }

  if (urgency === 'urgent') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent">
        Expires {formatDate(expiresAt)}
      </span>
    )
  }

  if (urgency === 'warning') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
        Expires {formatDate(expiresAt)}
      </span>
    )
  }

  // urgency === 'ok'
  return (
    <span className="text-text/50 text-xs">
      Exp {formatDate(expiresAt)}
    </span>
  )
}
