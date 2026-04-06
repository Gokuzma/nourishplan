interface GenerationJobBadgeProps {
  completedAt: string | null
}

function formatRelativeTime(completedAt: string): string {
  const diffMs = Date.now() - Date.parse(completedAt)
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function GenerationJobBadge({ completedAt }: GenerationJobBadgeProps) {
  if (!completedAt) return null

  return (
    <span className="text-xs text-text/40 font-sans">
      Generated {formatRelativeTime(completedAt)}
    </span>
  )
}
