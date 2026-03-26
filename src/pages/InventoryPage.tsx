import { useState } from 'react'
import { useInventoryItems, useAddInventoryItem, useUpdateInventoryItem, useRemoveInventoryItem } from '../hooks/useInventory'
import { BarcodeScanner } from '../components/inventory/BarcodeScanner'
import { QuickScanMode } from '../components/inventory/QuickScanMode'
import type { StorageLocation, InventoryItem, RemovalReason } from '../types/database'
import type { BarcodeProduct } from '../utils/barcodeLookup'

type Tab = StorageLocation

const TABS: { key: Tab; label: string }[] = [
  { key: 'pantry', label: 'Pantry' },
  { key: 'fridge', label: 'Fridge' },
  { key: 'freezer', label: 'Freezer' },
]

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('fridge')
  const [showScanner, setShowScanner] = useState(false)
  const [showQuickScan, setShowQuickScan] = useState(false)
  const [scanResult, setScanResult] = useState<{ product: BarcodeProduct | null; barcode: string } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const { data: items = [], isLoading } = useInventoryItems(activeTab)
  const addItem = useAddInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const removeItem = useRemoveInventoryItem()

  function handleBarcodeFound(product: BarcodeProduct | null, barcode: string) {
    setShowScanner(false)
    setScanResult({ product, barcode })
    setShowAddModal(true)
  }

  function handleRemove(id: string, reason: RemovalReason) {
    removeItem.mutate({ id, reason })
    setConfirmRemoveId(null)
    setExpandedId(null)
  }

  return (
    <div className="min-h-screen bg-background pb-[3xl]">
      {/* Page header */}
      <div className="px-4 py-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-text">Inventory</h1>
            <p className="text-sm text-text/60 mt-0.5">Manage your pantry, fridge, and freezer stock.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowScanner(true)}
              className="text-sm px-3 py-1.5 border border-secondary rounded-[--radius-btn] text-text/70 hover:text-text"
            >
              Scan
            </button>
            <button
              onClick={() => setShowQuickScan(true)}
              className="text-sm px-3 py-1.5 border border-secondary rounded-[--radius-btn] text-text/70 hover:text-text"
            >
              Quick Scan
            </button>
            <button
              onClick={() => { setScanResult(null); setShowAddModal(true) }}
              className="text-sm px-3 py-2 bg-primary text-white rounded-[--radius-btn] font-medium"
            >
              + Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Location tab strip */}
      <div className="flex border-b border-secondary px-4" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2 mr-6 text-sm border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-accent text-text font-medium'
                : 'border-transparent text-text/50 hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Item list */}
      <div role="tabpanel" className="px-4 py-3 space-y-2">
        {isLoading && (
          <p className="text-sm text-text/50 py-8 text-center">Loading…</p>
        )}
        {!isLoading && items.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-base font-medium text-text">Your inventory is empty</p>
            <p className="text-sm text-text/50 mt-1">
              Nothing in your {activeTab} yet.
            </p>
          </div>
        )}
        {items.map(item => {
          const isExpanded = expandedId === item.id
          const isConfirming = confirmRemoveId === item.id
          return (
            <div key={item.id}>
              <div
                role="button"
                aria-expanded={isExpanded}
                aria-label={`${item.food_name} inventory entry`}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="bg-surface border border-secondary rounded-[--radius-card] px-3 py-3 flex items-start gap-2 cursor-pointer hover:border-accent/40 transition-colors"
              >
                <span className={`text-text/40 mt-0.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-text">{item.food_name}</span>
                    {item.is_staple && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Staple</span>
                    )}
                    {item.is_opened && (
                      <span className="text-xs text-text/50">Opened</span>
                    )}
                  </div>
                  {item.brand && (
                    <p className="text-xs text-text/50 mt-0.5">{item.brand}</p>
                  )}
                  {isExpanded && (
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={e => { e.stopPropagation(); setEditItem(item); setShowAddModal(true) }}
                        className="text-xs text-primary font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmRemoveId(item.id) }}
                        className="text-xs text-red-600 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-none text-right">
                  <p className="text-sm text-text">
                    {item.quantity_remaining} {item.unit}
                  </p>
                  {item.expires_at && (
                    <p className="text-xs text-text/50 mt-0.5">
                      Exp {new Date(item.expires_at + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Inline remove confirmation */}
              {isConfirming && (
                <div
                  className="bg-surface border border-secondary border-t-0 rounded-b-[--radius-card] px-3 py-2 -mt-px"
                  onClick={e => e.stopPropagation()}
                >
                  <p className="text-xs text-text/70 mb-2">Remove {item.food_name}? Choose a reason:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRemove(item.id, 'used')}
                      className="text-xs px-3 py-1.5 bg-primary text-white rounded-[--radius-btn]"
                    >
                      Used
                    </button>
                    <button
                      onClick={() => handleRemove(item.id, 'discarded')}
                      className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-[--radius-btn]"
                    >
                      Discarded (spoiled or wasted)
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="text-xs px-3 py-1.5 text-text/60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add/Edit modal */}
      {showAddModal && (
        <AddInventoryItemModal
          initialData={editItem || (scanResult ? {
            food_name: scanResult.product?.food_name || '',
            brand: scanResult.product?.brand || '',
            food_id: scanResult.barcode,
          } : null)}
          onClose={() => { setShowAddModal(false); setEditItem(null); setScanResult(null) }}
          onSave={async (data) => {
            if (editItem) {
              await updateItem.mutateAsync({ id: editItem.id, updates: data })
            } else {
              await addItem.mutateAsync(data as Parameters<typeof addItem.mutateAsync>[0])
            }
            setShowAddModal(false)
            setEditItem(null)
            setScanResult(null)
          }}
          isEdit={!!editItem}
        />
      )}

      {/* Barcode scanner overlay */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onBarcodeFound={handleBarcodeFound}
      />

      {/* Quick scan mode overlay */}
      <QuickScanMode
        isOpen={showQuickScan}
        onClose={() => setShowQuickScan(false)}
      />
    </div>
  )
}

// Inline add/edit modal
interface AddInventoryItemModalProps {
  initialData: Partial<InventoryItem & { food_name: string; brand: string; food_id: string }> | null
  onClose: () => void
  onSave: (data: Partial<InventoryItem>) => Promise<void>
  isEdit: boolean
}

function AddInventoryItemModal({ initialData, onClose, onSave, isEdit }: AddInventoryItemModalProps) {
  const [foodName, setFoodName] = useState(initialData?.food_name || '')
  const [brand, setBrand] = useState(initialData?.brand || '')
  const [quantity, setQuantity] = useState(String(initialData?.quantity_remaining ?? 1))
  const [unit, setUnit] = useState<'g' | 'kg' | 'ml' | 'L' | 'units'>(initialData?.unit || 'units')
  const [location, setLocation] = useState<StorageLocation>(initialData?.storage_location || 'fridge')
  const [expiresAt, setExpiresAt] = useState(initialData?.expires_at || '')
  const [price, setPrice] = useState(String(initialData?.purchase_price ?? ''))
  const [isStaple, setIsStaple] = useState(initialData?.is_staple || false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!foodName.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        food_name: foodName.trim(),
        brand: brand.trim() || null,
        food_id: initialData?.food_id ?? null,
        quantity_remaining: parseFloat(quantity) || 1,
        unit,
        storage_location: location,
        expires_at: expiresAt || null,
        purchase_price: price ? parseFloat(price) : null,
        is_staple: isStaple,
      } as Partial<InventoryItem>)
    } catch {
      setError('Could not save this item. Check your connection and try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-text mb-4">{isEdit ? 'Edit Item' : 'Add to Inventory'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text/60 block mb-1">Item name *</label>
            <input
              type="text"
              value={foodName}
              onChange={e => setFoodName(e.target.value)}
              required
              className="w-full border border-secondary rounded-[--radius-btn] px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-text/60 block mb-1">Brand (optional)</label>
            <input
              type="text"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              className="w-full border border-secondary rounded-[--radius-btn] px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-text/60 block mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="0"
                step="any"
                className="w-full border border-secondary rounded-[--radius-btn] px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary"
              />
            </div>
            <div className="w-28">
              <label className="text-xs text-text/60 block mb-1">Unit</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as typeof unit)}
                className="w-full border border-secondary rounded-[--radius-btn] px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary"
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="L">L</option>
                <option value="units">units</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-text/60 block mb-1">Storage location</label>
            <div className="flex gap-2">
              {(['pantry', 'fridge', 'freezer'] as StorageLocation[]).map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`flex-1 py-1.5 text-sm rounded-[--radius-btn] border capitalize ${
                    location === loc
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-secondary text-text/60'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-text/60 block mb-1">Expiry date (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full border border-secondary rounded-[--radius-btn] px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-text/60 block mb-1">Add price for cost tracking (optional)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full border border-secondary rounded-[--radius-btn] px-3 py-2 text-sm bg-background text-text focus:outline-none focus:border-primary"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
            <input
              type="checkbox"
              checked={isStaple}
              onChange={e => setIsStaple(e.target.checked)}
              className="rounded"
            />
            Mark as staple for restock alerts
          </label>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !foodName.trim()}
              className="flex-1 bg-primary text-white py-2 rounded-[--radius-btn] text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Inventory'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-text/60 px-3"
            >
              Dismiss
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
