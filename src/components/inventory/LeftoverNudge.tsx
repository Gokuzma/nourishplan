import { Link } from 'react-router-dom'
import { useInventoryItems } from '../../hooks/useInventory'

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function displayName(foodName: string): string {
  return foodName.replace(/^Leftover:\s*/i, '').replace(/\s*\(leftover\)\s*$/i, '')
}

export function LeftoverNudge() {
  const { data: items = [] } = useInventoryItems()
  const today = new Date().toISOString().slice(0, 10)
  const leftovers = items.filter(
    i => i.is_leftover && (i.expires_at == null || i.expires_at >= today)
  )
  // Multiple containers of the same dish collapse into one nudge (earliest expiry)
  const byName = new Map<string, { name: string; expires_at: string | null }>()
  for (const l of leftovers) {
    const name = displayName(l.food_name)
    const existing = byName.get(name.toLowerCase())
    if (!existing || (l.expires_at != null && (existing.expires_at == null || l.expires_at < existing.expires_at))) {
      byName.set(name.toLowerCase(), { name, expires_at: l.expires_at })
    }
  }
  if (byName.size === 0) return null

  return (
    <div className="py-2">
      {[...byName.values()].map(l => (
        <Link
          key={l.name}
          to="/inventory"
          className="no-underline"
          style={{ display: 'block', padding: '8px 0', borderBottom: '1px dashed var(--rule-softer)' }}
        >
          <span className="pip warn" style={{ color: 'var(--ink-dim)' }}>
            Leftover ready — {l.name}
            {l.expires_at ? ` · use by ${formatShortDate(l.expires_at)}` : ''}
          </span>
        </Link>
      ))}
    </div>
  )
}
