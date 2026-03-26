import { useState, useEffect } from 'react'
import type { InventoryItem, StorageLocation, InventoryUnit } from '../../types/database'
import type { BarcodeProduct } from '../../utils/barcodeLookup'
import { useAddInventoryItem, useUpdateInventoryItem } from '../../hooks/useInventory'

interface AddInventoryItemModalProps {
  isOpen: boolean
  onClose: () => void
  editItem?: InventoryItem | null
  scanResult?: { product: BarcodeProduct | null; barcode: string } | null
  leftoverDefaults?: { recipeName: string; recipeId: string } | null
}

const LOCATION_OPTIONS: { label: string; value: StorageLocation }[] = [
  { label: 'Pantry', value: 'pantry' },
  { label: 'Fridge', value: 'fridge' },
  { label: 'Freezer', value: 'freezer' },
]

const UNIT_OPTIONS: InventoryUnit[] = ['g', 'kg', 'ml', 'L', 'units']

function defaultExpiryDate(item?: InventoryItem | null): string {
  if (item?.is_leftover) {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().slice(0, 10)
  }
  return ''
}

export function AddInventoryItemModal({ isOpen, onClose, editItem, scanResult, leftoverDefaults }: AddInventoryItemModalProps) {
  const addItem = useAddInventoryItem()
  const updateItem = useUpdateInventoryItem()

  const [foodName, setFoodName] = useState('')
  const [brand, setBrand] = useState('')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [unit, setUnit] = useState<InventoryUnit>('units')
  const [location, setLocation] = useState<StorageLocation>('fridge')
  const [expiryDate, setExpiryDate] = useState('')
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [isStaple, setIsStaple] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill from editItem, scanResult, or leftoverDefaults
  useEffect(() => {
    if (editItem) {
      setFoodName(editItem.food_name)
      setBrand(editItem.brand ?? '')
      setQuantity(editItem.quantity_remaining)
      setUnit(editItem.unit)
      setLocation(editItem.storage_location)
      setExpiryDate(editItem.expires_at ?? defaultExpiryDate(editItem))
      setPurchasePrice(editItem.purchase_price ?? '')
      setIsStaple(editItem.is_staple)
    } else if (leftoverDefaults) {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() + 3)
      const defaultExpiry = d.toISOString().slice(0, 10)
      setFoodName(`Leftover: ${leftoverDefaults.recipeName}`)
      setBrand('')
      setQuantity('')
      setUnit('units')
      setLocation('fridge')
      setExpiryDate(defaultExpiry)
      setPurchasePrice('')
      setIsStaple(false)
    } else if (scanResult?.product) {
      setFoodName(scanResult.product.food_name)
      setBrand(scanResult.product.brand)
      setQuantity(1)
      setUnit('units')
      setLocation('fridge')
      setExpiryDate('')
      setPurchasePrice('')
      setIsStaple(false)
    } else {
      setFoodName('')
      setBrand('')
      setQuantity('')
      setUnit('units')
      setLocation('fridge')
      setExpiryDate(defaultExpiryDate(null))
      setPurchasePrice('')
      setIsStaple(false)
    }
    setError(null)
  }, [editItem, scanResult, leftoverDefaults, isOpen])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!foodName.trim()) {
      setError('Item name is required.')
      return
    }
    if (quantity === '' || quantity <= 0) {
      setError('Quantity must be greater than zero.')
      return
    }

    try {
      if (editItem) {
        await updateItem.mutateAsync({
          id: editItem.id,
          updates: {
            food_name: foodName.trim(),
            brand: brand.trim() || null,
            quantity_remaining: quantity as number,
            unit,
            storage_location: location,
            expires_at: expiryDate || null,
            purchase_price: purchasePrice === '' ? null : purchasePrice as number,
            is_staple: isStaple,
          },
        })
      } else {
        await addItem.mutateAsync({
          food_name: foodName.trim(),
          brand: brand.trim() || undefined,
          food_id: scanResult?.barcode || undefined,
          quantity_remaining: quantity as number,
          unit,
          storage_location: location,
          expires_at: expiryDate || null,
          purchase_price: purchasePrice === '' ? null : purchasePrice as number,
          is_staple: isStaple,
          is_leftover: leftoverDefaults ? true : undefined,
          leftover_from_recipe_id: leftoverDefaults ? leftoverDefaults.recipeId : undefined,
        })
      }
      onClose()
    } catch {
      setError('Could not save this item. Check your connection and try again.')
    }
  }

  const isPending = addItem.isPending || updateItem.isPending

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6 relative">
          <h2 className="text-lg font-bold text-text mb-4">
            {editItem ? 'Edit Item' : 'Add to Inventory'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Leftover origin label */}
            {leftoverDefaults && (
              <p className="text-xs text-text/50">
                Leftover from: {leftoverDefaults.recipeName}
              </p>
            )}

            {/* Item name */}
            <div>
              <label className="block text-sm font-medium text-text/70 mb-1" htmlFor="inv-food-name">
                Item name
              </label>
              <input
                id="inv-food-name"
                type="text"
                value={foodName}
                onChange={e => setFoodName(e.target.value)}
                required
                className="w-full rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                placeholder="e.g. Chicken breast"
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-text/70 mb-1" htmlFor="inv-brand">
                Brand <span className="text-text/40">(optional)</span>
              </label>
              <input
                id="inv-brand"
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                placeholder="e.g. President's Choice"
              />
            </div>

            {/* Quantity + unit */}
            <div>
              <label className="block text-sm font-medium text-text/70 mb-1">
                Quantity
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  min={0}
                  step="any"
                  required
                  className="flex-1 rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                  placeholder="0"
                />
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value as InventoryUnit)}
                  className="rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                >
                  {UNIT_OPTIONS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Storage location */}
            <div>
              <label className="block text-sm font-medium text-text/70 mb-1">
                Storage location
              </label>
              <div className="flex rounded-[--radius-btn] border border-secondary overflow-hidden">
                {LOCATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLocation(opt.value)}
                    className={`flex-1 py-2 text-sm transition-colors ${
                      location === opt.value
                        ? 'bg-primary text-white font-medium'
                        : 'bg-secondary text-text/70 hover:text-text'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry date */}
            <div>
              <label className="block text-sm font-medium text-text/70 mb-1" htmlFor="inv-expiry">
                Expiry date <span className="text-text/40">(optional)</span>
              </label>
              <input
                id="inv-expiry"
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
              />
            </div>

            {/* Purchase price */}
            <div>
              <label className="block text-sm font-medium text-text/70 mb-1" htmlFor="inv-price">
                Add price for cost tracking (optional)
              </label>
              <input
                id="inv-price"
                type="number"
                value={purchasePrice}
                onChange={e => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                min={0}
                step="0.01"
                className="w-full rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                placeholder="$0.00"
              />
            </div>

            {/* Staple toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isStaple}
                onChange={e => setIsStaple(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-text/70">Mark as staple for restock alerts</span>
            </label>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-[--radius-btn] bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending
                  ? 'Saving…'
                  : editItem ? 'Save Changes' : 'Add to Inventory'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-text/50 hover:text-text transition-colors px-2 py-2.5"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
