import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { lookupBarcode } from '../../utils/barcodeLookup'
import type { BarcodeProduct } from '../../utils/barcodeLookup'
import { useAddInventoryItem } from '../../hooks/useInventory'

interface ScannedEntry {
  barcode: string
  product: BarcodeProduct | null
  count: number
}

interface QuickScanModeProps {
  isOpen: boolean
  onClose: () => void
}

export function QuickScanMode({ isOpen, onClose }: QuickScanModeProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scannedItems, setScannedItems] = useState<ScannedEntry[]>([])
  const [isLookingUp, setIsLookingUp] = useState(false)
  const addInventoryItem = useAddInventoryItem()
  // Track last scanned barcode and time to debounce duplicate scans (Pitfall 3)
  const lastBarcodeRef = useRef<string | null>(null)
  const lastBarcodeTimeRef = useRef<number>(0)
  const processingRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    setScannedItems([])
    lastBarcodeRef.current = null
    lastBarcodeTimeRef.current = 0
    processingRef.current = false

    if (!navigator.mediaDevices) return

    const codeReader = new BrowserMultiFormatReader()

    const startScanning = async () => {
      try {
        await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          async (result, err) => {
            if (!result) {
              void err
              return
            }
            const barcode = result.getText()
            const now = Date.now()

            // Debounce: ignore same barcode within 2 seconds (Pitfall 3)
            if (
              barcode === lastBarcodeRef.current &&
              now - lastBarcodeTimeRef.current < 2000
            ) {
              return
            }

            // Queue: process one at a time (Pitfall 3)
            if (processingRef.current) return

            lastBarcodeRef.current = barcode
            lastBarcodeTimeRef.current = now
            processingRef.current = true

            await handleBarcodeScan(barcode)

            processingRef.current = false
          }
        )
      } catch {
        // Camera unavailable — quick scan mode needs camera, fail silently
      }
    }

    startScanning()

    return () => {
      BrowserMultiFormatReader.releaseAllStreams()
    }
  }, [isOpen])

  async function handleBarcodeScan(barcode: string) {
    setIsLookingUp(true)
    const product = await lookupBarcode(barcode)
    setIsLookingUp(false)

    // Auto-add to inventory with defaults (D-16, D-17)
    try {
      await addInventoryItem.mutateAsync({
        food_name: product?.food_name || barcode,
        brand: product?.brand || undefined,
        food_id: barcode,
        quantity_remaining: 1,
        unit: 'units',
        storage_location: 'fridge',
      })
    } catch {
      // Inventory add failure should not stop scanning
    }

    // Update scanned items display (D-17: always create new entry, but show count in UI)
    setScannedItems(prev => {
      const existing = prev.find(e => e.barcode === barcode)
      if (existing) {
        return prev.map(e =>
          e.barcode === barcode ? { ...e, count: e.count + 1 } : e
        )
      }
      return [{ barcode, product, count: 1 }, ...prev]
    })
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="Quick scan mode"
      >
        <div className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-secondary">
            <div>
              <span className="text-text font-medium">Quick scan</span>
              {scannedItems.length > 0 && (
                <span className="ml-2 text-text/50 text-sm">
                  {scannedItems.reduce((sum, e) => sum + e.count, 0)} added
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="bg-primary text-white px-4 py-1.5 rounded-[--radius-btn] text-sm font-medium"
            >
              Done
            </button>
          </div>

          {/* Camera viewfinder */}
          <div className="px-4 pt-4">
            <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-32 h-32">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary animate-pulse" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary animate-pulse" />
                </div>
              </div>
              {isLookingUp && (
                <div className="absolute bottom-2 inset-x-0 text-center">
                  <span className="text-white/80 text-sm bg-black/60 px-2 py-0.5 rounded">Looking up item…</span>
                </div>
              )}
            </div>
          </div>

          {/* Scanned items list */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {scannedItems.length === 0 ? (
              <p className="text-text/50 text-sm text-center py-6">
                Point your camera at barcodes. Items will be added automatically.
              </p>
            ) : (
              <ul className="divide-y divide-secondary">
                {scannedItems.map(entry => (
                  <li key={entry.barcode} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {entry.product?.food_name || entry.barcode}
                      </p>
                      {entry.product?.brand && (
                        <p className="text-xs text-text/50">{entry.product.brand}</p>
                      )}
                      {!entry.product?.food_name && (
                        <p className="text-xs text-text/50">Barcode: {entry.barcode}</p>
                      )}
                    </div>
                    {entry.count > 1 && (
                      <span className="flex-none bg-primary/20 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                        ×{entry.count}
                      </span>
                    )}
                    <span className="flex-none text-xs text-primary">Added</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
