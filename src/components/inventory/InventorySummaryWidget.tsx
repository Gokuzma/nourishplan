import { useNavigate } from 'react-router-dom'
import { useInventoryItems } from '../../hooks/useInventory'
import { getExpiringSoonItems } from '../../utils/inventory'
import { ExpiryBadge } from './ExpiryBadge'

export function InventorySummaryWidget() {
  const navigate = useNavigate()
  const { data: items = [] } = useInventoryItems()

  const activeItems = items.filter(i => !i.removed_at)

  const counts = { fridge: 0, freezer: 0, pantry: 0 }
  activeItems.forEach(i => { counts[i.storage_location]++ })

  const expiringSoon = getExpiringSoonItems(activeItems, 7)
    .sort((a, b) => {
      if (!a.expires_at) return 1
      if (!b.expires_at) return -1
      return a.expires_at.localeCompare(b.expires_at)
    })
    .slice(0, 5)

  if (activeItems.length === 0) {
    return (
      <div className="bg-surface rounded-[--radius-card] border border-secondary p-4">
        <p className="text-sm font-medium text-text mb-1">Inventory</p>
        <p className="text-xs text-text/50">No items in inventory.{' '}
          <button
            onClick={() => navigate('/inventory')}
            className="text-primary underline"
          >
            Add items
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-[--radius-card] border border-secondary p-4">
      <p className="text-sm font-medium text-text mb-1">Inventory</p>
      <p className="text-xs text-text/60 mb-2">
        Fridge: {counts.fridge} &middot; Freezer: {counts.freezer} &middot; Pantry: {counts.pantry}
      </p>

      {expiringSoon.length > 0 && (
        <div>
          <p className="text-xs text-text/50 mb-1">Expiring soon:</p>
          <ul className="flex flex-col gap-0.5">
            {expiringSoon.map(item => (
              <li key={item.id} className="flex items-center gap-2 text-xs text-text/70">
                <span>&bull;</span>
                <span className="flex-1 truncate">{item.food_name}</span>
                {item.expires_at && (
                  <span className="text-text/40">
                    ({new Date(item.expires_at + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })})
                  </span>
                )}
                <ExpiryBadge expiresAt={item.expires_at ?? null} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => navigate('/inventory')}
        className="text-xs text-primary mt-2 block"
      >
        View all &rarr;
      </button>
    </div>
  )
}
