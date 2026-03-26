import { useState } from 'react'
import type { InventoryItem, RemovalReason } from '../../types/database'
import { ExpiryBadge } from './ExpiryBadge'

interface InventoryItemRowProps {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  onRemove: (id: string, reason: RemovalReason) => void
  isRemoving?: boolean
}

export function InventoryItemRow({ item, onEdit, onRemove, isRemoving }: InventoryItemRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)

  function handleRowClick() {
    setExpanded(v => !v)
    if (confirming) setConfirming(false)
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation()
    onEdit(item)
  }

  function handleRemoveClick(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirming(true)
  }

  function handleConfirmRemove(reason: RemovalReason) {
    onRemove(item.id, reason)
    setConfirming(false)
    setExpanded(false)
  }

  function handleCancelRemove(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirming(false)
  }

  return (
    <div className={`bg-surface border border-secondary rounded-[--radius-card] hover:border-accent/40 transition-colors ${isRemoving ? 'opacity-50' : ''}`}>
      <div
        className="p-3 cursor-pointer"
        onClick={handleRowClick}
        role="button"
        aria-expanded={expanded}
        aria-label={`${item.food_name} inventory entry`}
      >
        <div className="flex items-center gap-3">
          {/* Chevron */}
          <span
            className={`text-xs text-text/30 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            &#9658;
          </span>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-medium text-text">{item.food_name}</span>
              {item.is_staple && (
                <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                  Staple
                </span>
              )}
              {item.is_opened && (
                <span className="text-xs text-text/50">Opened</span>
              )}
            </div>
            {item.brand && (
              <p className="text-xs text-text/50 mt-0.5">{item.brand}</p>
            )}
          </div>

          {/* Quantity */}
          <span className="text-sm text-text/70 shrink-0">
            {item.quantity_remaining} {item.unit}
          </span>

          {/* Expiry badge */}
          <div className="shrink-0">
            <ExpiryBadge expiresAt={item.expires_at} />
          </div>
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && !confirming && (
        <div className="px-3 pb-3 flex items-center gap-2 border-t border-secondary/30 pt-2">
          <button
            onClick={handleEdit}
            className="text-xs text-text/60 hover:text-text transition-colors px-3 py-1.5 rounded-[--radius-btn] border border-secondary hover:border-accent/40 min-h-[44px] flex items-center"
          >
            Edit
          </button>
          <button
            onClick={handleRemoveClick}
            className="text-xs text-red-600 hover:text-red-700 transition-colors px-3 py-1.5 rounded-[--radius-btn] border border-red-200 hover:border-red-300 min-h-[44px] flex items-center"
          >
            Remove
          </button>
        </div>
      )}

      {/* Inline remove confirmation */}
      {confirming && (
        <div
          className="-mt-px border-t-0 border border-red-200 rounded-b-[--radius-card] bg-red-50 dark:bg-red-900/10 px-3 pb-3 pt-2"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs text-text/70 mb-2">
            Remove {item.food_name}? Choose a reason:
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleConfirmRemove('used')}
              className="text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-[--radius-btn] min-h-[44px] flex items-center hover:bg-primary/90 transition-colors"
            >
              Used
            </button>
            <button
              onClick={() => handleConfirmRemove('discarded')}
              className="text-xs font-medium bg-red-600 text-white px-3 py-1.5 rounded-[--radius-btn] min-h-[44px] flex items-center hover:bg-red-700 transition-colors"
            >
              Discarded (spoiled or wasted)
            </button>
            <button
              onClick={handleCancelRemove}
              className="text-xs text-text/50 hover:text-text transition-colors px-2 py-1.5 min-h-[44px] flex items-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
