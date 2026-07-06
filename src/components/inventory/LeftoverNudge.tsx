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

export function LeftoverNudge() {
  const { data: items = [] } = useInventoryItems()
  const today = new Date().toISOString().slice(0, 10)
  const leftovers = items.filter(
    i => i.is_leftover && (i.expires_at == null || i.expires_at >= today)
  )
  if (leftovers.length === 0) return null

  return (
    <div className="py-2">
      {leftovers.map(l => (
        <Link
          key={l.id}
          to="/inventory"
          className="no-underline"
          style={{ display: 'block', padding: '8px 0', borderBottom: '1px dashed var(--rule-softer)' }}
        >
          <span className="pip warn">
            Leftover ready — {l.food_name.replace(/^Leftover:\s*/i, '')}
            {l.expires_at ? ` · use by ${formatShortDate(l.expires_at)}` : ''}
          </span>
        </Link>
      ))}
    </div>
  )
}
