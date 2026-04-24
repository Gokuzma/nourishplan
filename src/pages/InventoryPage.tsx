import { useState, useMemo } from 'react'
import type { StorageLocation, InventoryItem, RemovalReason } from '../types/database'
import type { BarcodeProduct } from '../utils/barcodeLookup'
import { useInventoryItems, useRemoveInventoryItem } from '../hooks/useInventory'
import { getExpiryUrgency } from '../utils/inventory'
import { InventoryItemRow } from '../components/inventory/InventoryItemRow'
import { AddInventoryItemModal } from '../components/inventory/AddInventoryItemModal'
import { BarcodeScanner } from '../components/inventory/BarcodeScanner'
import { QuickScanMode } from '../components/inventory/QuickScanMode'
import { Nameplate, StoryHead, Folio } from '../components/editorial'
import { Icon } from '../components/Icon'

const TABS: { label: string; value: StorageLocation; icon: 'pantry' | 'fridge' | 'freezer' }[] = [
  { label: 'Pantry', value: 'pantry', icon: 'pantry' },
  { label: 'Fridge', value: 'fridge', icon: 'fridge' },
  { label: 'Freezer', value: 'freezer', icon: 'freezer' },
]

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<StorageLocation>('fridge')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [showQuickScan, setShowQuickScan] = useState(false)
  const [scanResult, setScanResult] = useState<{ product: BarcodeProduct | null; barcode: string } | null>(null)

  const { data: items, isPending } = useInventoryItems(activeTab)
  const { data: pantryItems = [] } = useInventoryItems('pantry')
  const { data: fridgeItems = [] } = useInventoryItems('fridge')
  const { data: freezerItems = [] } = useInventoryItems('freezer')
  const removeItem = useRemoveInventoryItem()

  const counts = {
    pantry: pantryItems.length,
    fridge: fridgeItems.length,
    freezer: freezerItems.length,
  }
  const total = counts.pantry + counts.fridge + counts.freezer

  // Urgent: items urgently expiring (≤3 days) or already expired, across all locations
  const urgent = useMemo(() => {
    const all = [...pantryItems, ...fridgeItems, ...freezerItems]
    return all
      .filter(i => {
        const urgency = getExpiryUrgency(i.expires_at ?? null)
        return urgency === 'urgent' || urgency === 'expired'
      })
      .sort((a, b) => (a.expires_at ?? '').localeCompare(b.expires_at ?? ''))
      .slice(0, 5)
  }, [pantryItems, fridgeItems, freezerItems])

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
    <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans">
      {/* Nameplate */}
      <div className="hidden md:block">
        <Nameplate
          left={`${total} items on the books`}
          title={<>The <span className="amp">Pantry</span></>}
          right={`Pantry ${counts.pantry} · Fridge ${counts.fridge} · Freezer ${counts.freezer}`}
        />
      </div>
      <div className="md:hidden">
        <Nameplate
          left="STOCK"
          title="Pantry"
          right={String(total)}
          size="sm"
        />
      </div>

      {/* Story head */}
      <StoryHead
        kicker="INVENTORY"
        headline="The Pantry"
        byline={urgent.length > 0 ? `Sorted by expiry\n${urgent.length} need${urgent.length === 1 ? 's' : ''} using` : null}
        size="sm"
      />

      {/* URGENT BAND */}
      {urgent.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--sky)',
            color: 'var(--on-accent-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            borderTop: '2px solid var(--rule-c)',
            borderBottom: '2px solid var(--rule-c)',
            marginTop: 14,
          }}
        >
          <span
            className="stamp"
            style={{ color: 'var(--on-accent-dark)', borderColor: 'var(--on-accent-dark)', background: 'rgba(250, 250, 249, 0.6)' }}
          >
            Use soon!
          </span>
          <div
            className="mono"
            style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', flex: 1, minWidth: 0 }}
          >
            {urgent.map(u => u.food_name).join(' · ')} — expiring within 2 days
          </div>
        </div>
      )}

      {/* TABS + Add */}
      <div className="flex items-end justify-between gap-2 flex-wrap mt-4">
        <div role="tablist" className="tabs" style={{ flex: 1, minWidth: 280 }}>
          {TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              id={`tab-${tab.value}`}
              role="tab"
              aria-selected={activeTab === tab.value}
              aria-controls={`panel-${tab.value}`}
              onClick={() => setActiveTab(tab.value)}
              className={`t ${activeTab === tab.value ? 'active' : ''}`}
            >
              <Icon name={tab.icon} size={16} />
              <span>{tab.label}</span>
              <span className="n">· {counts[tab.value]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 no-print pb-2">
          <button type="button" onClick={() => setShowScanner(true)} className="btn btn-sm" aria-label="Scan barcode">
            <Icon name="search" size={14} /> Scan
          </button>
          <button type="button" onClick={() => setShowQuickScan(true)} className="btn btn-sm">
            Quick scan
          </button>
          <button
            type="button"
            onClick={() => { setEditItem(null); setScanResult(null); setShowAddModal(true) }}
            className="btn btn-primary btn-sm"
          >
            <Icon name="plus" size={14} /> Add item
          </button>
        </div>
      </div>

      {/* Section heading: column header row (eyebrows) — desktop only */}
      <div
        className="hidden md:grid mt-4"
        style={{
          gridTemplateColumns: '36px 2fr 1fr 1fr 120px',
          gap: 16,
          padding: '14px 4px 8px',
          borderBottom: '1px solid var(--rule-c)',
        }}
      >
        <span className="eyebrow">#</span>
        <span className="eyebrow">Item</span>
        <span className="eyebrow">Quantity</span>
        <span className="eyebrow">Location</span>
        <span className="eyebrow" style={{ textAlign: 'right' }}>Expires</span>
      </div>

      {/* TAB PANEL — list of items */}
      <div id={panelId} role="tabpanel" aria-labelledby={activeTabId} className="mt-2">
        {isPending ? (
          <div className="flex flex-col gap-2 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-paper-2 animate-pulse" style={{ border: '1px solid var(--rule-soft)' }} />
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="flex flex-col">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="grid items-baseline"
                style={{
                  gridTemplateColumns: '36px 1fr',
                  gap: 12,
                  borderBottom: '1px dashed var(--rule-softer)',
                  padding: '8px 0',
                }}
              >
                <span
                  className="mono tnum"
                  style={{ fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.04em', alignSelf: 'start', paddingTop: 16 }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div style={{ minWidth: 0 }}>
                  <InventoryItemRow
                    item={item}
                    onEdit={handleEdit}
                    onRemove={handleRemove}
                    isRemoving={removeItem.isPending && removeItem.variables?.id === item.id}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="serif-italic" style={{ fontSize: 18, color: 'var(--ink-soft)' }}>
              — nothing in your {TABS.find(t => t.value === activeTab)?.label.toLowerCase()} yet —
            </p>
            <button
              type="button"
              onClick={() => { setEditItem(null); setScanResult(null); setShowAddModal(true) }}
              className="btn btn-primary btn-sm mt-4"
            >
              Add the first item
            </button>
          </div>
        )}
      </div>

      {/* Folio — desktop only */}
      <div className="hidden md:block">
        <Folio
          num="05"
          title="The Pantry"
          tagline="Count what you keep. Keep what you'll use."
          pageOf="PAGE 5 OF 10"
        />
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
