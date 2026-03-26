import { useEffect } from 'react'
import type { DeductionResult } from '../../hooks/useInventoryDeduct'

interface CookDeductionReceiptProps {
  mealName: string
  result: DeductionResult
  onClose: () => void
}

export function CookDeductionReceipt({ mealName, result, onClose }: CookDeductionReceiptProps) {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 8000)
    return () => clearTimeout(timer)
  }, [onClose])

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

      <div className="flex justify-end mt-2">
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
