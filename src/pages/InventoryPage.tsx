import { useState } from 'react'
import type { StorageLocation, InventoryItem, RemovalReason } from '../types/database'
import type { BarcodeProduct } from '../utils/barcodeLookup'
import { useInventoryItems, useRemoveInventoryItem } from '../hooks/useInventory'
import { InventoryItemRow } from '../components/inventory/InventoryItemRow'
import { AddInventoryItemModal } from '../components/inventory/AddInventoryItemModal'
import { BarcodeScanner } from '../components/inventory/BarcodeScanner'
import { QuickScanMode } from '../components/inventory/QuickScanMode'

const TABS: { label: string; value: StorageLocation }[] = [
  { label: 'Pantry', value: 'pantry' },
  { label: 'Fridge', value: 'fridge' },
  { label: 'Freezer', value: 'freezer' },
]

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<StorageLocation>('fridge')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [showQuickScan, setShowQuickScan] = useState(false)
  const [scanResult, setScanResult] = useState<{ product: BarcodeProduct | null; barcode: string } | null>(null)

  const { data: items, isPending } = useInventoryItems(activeTab)
  const removeItem = useRemoveInventoryItem()

  function handleEdit(item: InventoryItem) {
    setEditItem(item)
    setScanResult(null)
    setShowAddModal(true)
  }

  function handleRemove(id: string, reason: RemovalReason) {
    removeItem.mutate({ id, reason })
  }

  function handleModalClose() {
    setShowAddModal(false)
    setEditItem(null)
    setScanResult(null)
  }

  function handleBarcodeFound(product: BarcodeProduct | null, barcode: string) {
    setShowScanner(false)
    setScanResult({ product, barcode })
    setEditItem(null)
    setShowAddModal(true)
  }

  const activeTabId = `tab-${activeTab}`
  const panelId = `panel-${activeTab}`

  return (
    <div className="px-4 py-6 font-sans pb-[64px]">
      {/* Page header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Inventory</h1>
          <p className="text-sm text-text/50 mt-1">
            Manage your pantry, fridge, and freezer stock.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowScanner(true)}
            className="rounded-[--radius-btn] border border-secondary px-3 py-2 text-sm text-text/70 hover:text-text transition-colors"
          >
            Scan
          </button>
          <button
            onClick={() => setShowQuickScan(true)}
            className="rounded-[--radius-btn] border border-secondary px-3 py-2 text-sm text-text/70 hover:text-text transition-colors"
          >
            Quick Scan
          </button>
          <button
            onClick={() => { setEditItem(null); setScanResult(null); setShowAddModal(true) }}
            className="rounded-[--radius-btn] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Add Item
          </button>
        </div>
      </div>

      {/* Tab strip */}
      <div
        role="tablist"
        className="flex border-b border-secondary mb-4"
      >
        {TABS.map(tab => (
          <button
            key={tab.value}
            id={`tab-${tab.value}`}
            role="tab"
            aria-selected={activeTab === tab.value}
            aria-controls={`panel-${tab.value}`}
            onClick={() => setActiveTab(tab.value)}
            className={`pb-2 px-4 text-sm border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-accent text-text font-medium'
                : 'border-transparent text-text/50 hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={activeTabId}
      >
        {isPending ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-[--radius-card] bg-secondary animate-pulse" />
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {items.map(item => (
              <InventoryItemRow
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onRemove={handleRemove}
                isRemoving={removeItem.isPending && removeItem.variables?.id === item.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-text/50">
              Nothing in your {TABS.find(t => t.value === activeTab)?.label} yet.
            </p>
          </div>
        )}
      </div>

      <AddInventoryItemModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        editItem={editItem}
        scanResult={scanResult}
      />

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onBarcodeFound={handleBarcodeFound}
      />

      <QuickScanMode
        isOpen={showQuickScan}
        onClose={() => setShowQuickScan(false)}
      />
    </div>
  )
}
