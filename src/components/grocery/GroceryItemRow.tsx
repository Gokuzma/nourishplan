import { formatCost } from '../../utils/cost'
import { formatDisplayQuantity } from '../../utils/groceryGeneration'
import type { GroceryItem } from '../../types/database'

interface GroceryItemRowProps {
  item: GroceryItem
  onToggle: (id: string, checked: boolean) => void
}

export function GroceryItemRow({ item, onToggle }: GroceryItemRowProps) {
  const isChecked = item.is_checked

  const displayQty =
    item.quantity != null && item.unit
      ? `${item.quantity} ${item.unit}`
      : item.quantity != null
        ? (() => {
            const { display_quantity, display_unit } = formatDisplayQuantity(item.quantity)
            return `${display_quantity} ${display_unit}`
          })()
        : null

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${item.food_name} — ${isChecked ? 'checked' : 'unchecked'}`}
      className={`flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-[--radius-btn] cursor-pointer select-none transition-colors hover:bg-secondary ${isChecked ? 'opacity-60' : ''}`}
      onClick={() => onToggle(item.id, !isChecked)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle(item.id, !isChecked)
        }
      }}
    >
      {/* Checkbox */}
      <div
        className={`w-5 h-5 flex-shrink-0 rounded-sm border-2 border-secondary flex items-center justify-center ${
          isChecked ? 'bg-primary border-primary' : 'bg-surface'
        }`}
        aria-hidden="true"
      >
        {isChecked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${isChecked ? 'line-through text-text/40' : 'text-text'}`}>
          {item.food_name}
        </span>
        {item.is_staple_restock && (
          <span className="ml-2 bg-accent/20 text-accent text-xs px-1.5 py-0.5 rounded-full">
            Restock
          </span>
        )}
        {displayQty && (
          <span className={`block text-xs mt-0.5 ${isChecked ? 'text-text/30' : 'text-text/50'}`}>
            {displayQty}
          </span>
        )}
      </div>

      {/* Price */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.estimated_cost != null ? (
          <span className={`text-sm ${isChecked ? 'text-text/40' : 'text-text/70'}`}>
            {formatCost(item.estimated_cost)}
          </span>
        ) : (
          <span className="text-sm text-text/40">?</span>
        )}

        {/* Retailer lookup */}
        <a
          href={`https://www.google.com/search?q=buy+${encodeURIComponent(item.food_name)}+grocery`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Search for ${item.food_name} at a grocery store`}
          className="text-text/40 hover:text-text/70 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          🔍
        </a>
      </div>
    </div>
  )
}
