import { useState, useEffect, useMemo } from 'react'
import type { InventoryItem, StorageLocation, InventoryUnit } from '../../types/database'
import type { BarcodeProduct } from '../../utils/barcodeLookup'
import { barcodeServingNutrition } from '../../utils/barcodeLookup'
import { useAddInventoryItem, useUpdateInventoryItem, useInventoryItems } from '../../hooks/useInventory'

interface AddInventoryItemModalProps {
  isOpen: boolean
  onClose: () => void
  editItem?: InventoryItem | null
  scanResult?: { product: BarcodeProduct | null; barcode: string } | null
  leftoverDefaults?: { recipeName: string; recipeId: string } | null
  defaultLocation?: StorageLocation
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

export function AddInventoryItemModal({ isOpen, onClose, editItem, scanResult, leftoverDefaults, defaultLocation }: AddInventoryItemModalProps) {
  const addItem = useAddInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const { data: allItems = [] } = useInventoryItems()

  // Families buy the same items forever — suggest names they've used before
  const knownNames = useMemo(() => {
    const names = new Set<string>()
    for (const it of allItems) {
      if (!it.is_leftover) names.add(it.food_name)
    }
    return [...names].sort()
  }, [allItems])

  const [foodName, setFoodName] = useState('')
  const [brand, setBrand] = useState('')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [unit, setUnit] = useState<InventoryUnit>('units')
  const [location, setLocation] = useState<StorageLocation>('fridge')
  const [expiryDate, setExpiryDate] = useState('')
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [isStaple, setIsStaple] = useState(false)
  const [isReadyMeal, setIsReadyMeal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addedCount, setAddedCount] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

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
      setIsReadyMeal(editItem.is_ready_meal)
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
      setLocation(defaultLocation ?? 'fridge')
      setExpiryDate('')
      setPurchasePrice('')
      setIsStaple(false)
    } else {
      setFoodName('')
      setBrand('')
      setQuantity(1)
      setUnit('units')
      setLocation(defaultLocation ?? 'fridge')
      setExpiryDate(defaultExpiryDate(null))
      setPurchasePrice('')
      setIsStaple(false)
    }
    if (!editItem) setIsReadyMeal(false)
    setError(null)
    setAddedCount(0)
    // Auto-open the details section when the item already uses those fields
    setShowDetails(!!(editItem && (editItem.brand || editItem.purchase_price != null || editItem.is_staple)))
  }, [editItem, scanResult, leftoverDefaults, defaultLocation, isOpen])

  if (!isOpen) return null

  function readyMealFields() {
    if (!isReadyMeal) return { is_ready_meal: false }
    const fromBarcode = scanResult?.product ? barcodeServingNutrition(scanResult.product) : null
    return fromBarcode
      ? { is_ready_meal: true, ...fromBarcode, nutrition_source: 'barcode' as const }
      : { is_ready_meal: true }
  }

  async function handleSubmit(e: React.FormEvent, addAnother = false) {
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
            is_ready_meal: isReadyMeal,
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
          ...readyMealFields(),
        })
      }
      if (addAnother && !editItem) {
        // Keep the modal open for the next item: clear per-item fields but keep
        // location and unit — people stock one shelf at a time.
        setFoodName('')
        setBrand('')
        setQuantity(1)
        setExpiryDate('')
        setPurchasePrice('')
        setIsStaple(false)
        setIsReadyMeal(false)
        setAddedCount(c => c + 1)
        document.getElementById('inv-food-name')?.focus()
      } else {
        onClose()
      }
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
                list="inv-known-names"
                className="w-full rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                placeholder="e.g. Chicken breast"
              />
              <datalist id="inv-known-names">
                {knownNames.map(n => <option key={n} value={n} />)}
              </datalist>
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
              <div className="flex gap-1.5 mb-2">
                {([['+3 days', 3], ['1 week', 7], ['2 weeks', 14], ['1 month', 30]] as const).map(([label, days]) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + days)
                      setExpiryDate(d.toISOString().slice(0, 10))
                    }}
                    className="rounded-[--radius-btn] border border-secondary px-2.5 py-1 text-xs text-text/70 hover:text-text hover:border-accent transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                id="inv-expiry"
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isReadyMeal}
                onChange={e => setIsReadyMeal(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-primary"
              />
              <span className="text-sm text-text/70">
                Ready meal — eaten as is or just heated (frozen meals, burritos, pizza)
                {editItem?.is_ready_meal && editItem.serving_calories != null && (
                  <span className="block text-xs text-text/50">
                    ≈ {Math.round(editItem.serving_calories)} kcal per serving{editItem.nutrition_source === 'estimate' ? ' (estimate)' : ''}
                  </span>
                )}
              </span>
            </label>

            {/* Rarely-used fields, tucked away to keep the common path short */}
            <button
              type="button"
              onClick={() => setShowDetails(v => !v)}
              aria-expanded={showDetails}
              className="text-left text-sm text-text/50 hover:text-text transition-colors"
            >
              {showDetails ? '▾' : '▸'} More details (brand, price, staple)
            </button>
            {showDetails && (
              <>
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

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStaple}
                    onChange={e => setIsStaple(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-text/70">Mark as staple for restock alerts</span>
                </label>
              </>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {/* Actions */}
            {addedCount > 0 && (
              <p className="text-xs text-green-700" role="status">
                ✓ {addedCount} item{addedCount === 1 ? '' : 's'} added this session
              </p>
            )}
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
              {!editItem && (
                <button
                  type="button"
                  onClick={e => handleSubmit(e as unknown as React.FormEvent, true)}
                  disabled={isPending}
                  className="rounded-[--radius-btn] border border-secondary px-3 py-2.5 text-sm font-medium text-text/70 hover:text-text disabled:opacity-50 transition-colors"
                >
                  Save +1 more
                </button>
              )}
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
