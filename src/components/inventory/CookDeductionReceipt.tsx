import { useEffect } from 'react'
import type { DeductionResult } from '../../hooks/useInventoryDeduct'

interface CookDeductionReceiptProps {
  mealName: string
  result: DeductionResult
  onClose: () => void
  onSaveLeftover?: () => void
  onRate?: (rating: number) => void
  rated?: boolean
}

export function CookDeductionReceipt({ mealName, result, onClose, onSaveLeftover, onRate, rated }: CookDeductionReceiptProps) {
  // Auto-dismiss — longer when a rating is being offered so there's time to tap
  useEffect(() => {
    const timer = setTimeout(onClose, onRate && !rated ? 20000 : 8000)
    return () => clearTimeout(timer)
  }, [onClose, onRate, rated])

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 mx-4 bg-surface border border-secondary rounded-[--radius-card] p-4 shadow-xl z-50">
      <p className="font-medium text-text mb-2">Cooked: {mealName}</p>

      {result.error && (
        <p className="text-sm text-red-600 mb-2">
          Inventory could not be updated. Your cook was logged, but inventory was not deducted. Check your connection.
        </p>
      )}

      {result.deductions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-text/50 mb-1">Deducted from inventory:</p>
          <ul className="flex flex-col gap-0.5">
            {result.deductions.map((d, i) => (
              <li key={i} className="text-sm text-text flex items-center gap-1">
                <span className="text-primary">&#10003;</span>
                {d.item.food_name} {d.deductAmount}g
                {' '}({new Date(d.item.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} purchase)
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.missing.length > 0 && (
        <ul className="flex flex-col gap-0.5 mb-2">
          {result.missing.map((name, i) => (
            <li key={i} className="text-sm text-text/50 flex items-center gap-1">
              <span>&#9888;</span>
              {name} — not in inventory
            </li>
          ))}
        </ul>
      )}

      {onRate && (
        <div className="mb-2 pt-2 border-t border-secondary">
          {rated ? (
            <p className="text-sm text-text/60">Thanks — noted for next week's plan.</p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text/60">How was it?</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => onRate(star)}
                    className="text-xl leading-none text-primary/40 hover:text-primary transition-colors"
                    aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-2">
        {onSaveLeftover && (
          <button
            onClick={onSaveLeftover}
            className="bg-secondary border border-primary/30 text-primary px-4 py-2 rounded-[--radius-btn] text-sm"
          >
            Save leftover portion
          </button>
        )}
        <button
          onClick={onClose}
          className="bg-primary text-white px-4 py-2 rounded-[--radius-btn] text-sm"
        >
          Done
        </button>
      </div>
    </div>
  )
}
