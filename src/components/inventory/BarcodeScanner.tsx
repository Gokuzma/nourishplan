import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { lookupBarcode } from '../../utils/barcodeLookup'
import type { BarcodeProduct } from '../../utils/barcodeLookup'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onBarcodeFound: (product: BarcodeProduct | null, barcode: string) => void
}

type ScanStatus = 'scanning' | 'found' | 'not-found' | 'no-camera'

export function BarcodeScanner({ isOpen, onClose, onBarcodeFound }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanStatus, setScanStatus] = useState<ScanStatus>('scanning')
  const [manualBarcode, setManualBarcode] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const manualInputRef = useRef<HTMLInputElement>(null)
  const hasDetectedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    setScanStatus('scanning')
    hasDetectedRef.current = false

    if (!navigator.mediaDevices) {
      setScanStatus('no-camera')
      return
    }

    const codeReader = new BrowserMultiFormatReader()

    const startScanning = async () => {
      try {
        await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          async (result, err) => {
            if (result && !hasDetectedRef.current) {
              hasDetectedRef.current = true
              await handleBarcodeDetected(result.getText())
            }
            // err is a normal part of scanning (no barcode in frame), ignore it
            void err
          }
        )
      } catch {
        setScanStatus('no-camera')
      }
    }

    startScanning()

    return () => {
      BrowserMultiFormatReader.releaseAllStreams()
    }
  }, [isOpen])

  async function handleBarcodeDetected(barcode: string) {
    setIsLookingUp(true)
    const product = await lookupBarcode(barcode)
    setIsLookingUp(false)

    if (product && product.food_name) {
      setScanStatus('found')
      BrowserMultiFormatReader.releaseAllStreams()
      setTimeout(() => {
        onBarcodeFound(product, barcode)
      }, 500)
    } else {
      setScanStatus('not-found')
      BrowserMultiFormatReader.releaseAllStreams()
      setTimeout(() => {
        manualInputRef.current?.focus()
      }, 100)
    }
  }

  async function handleManualLookup() {
    if (!manualBarcode.trim()) return
    setIsLookingUp(true)
    const product = await lookupBarcode(manualBarcode.trim())
    setIsLookingUp(false)
    onBarcodeFound(product, manualBarcode.trim())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" role="dialog" aria-modal="true" aria-label="Barcode scanner">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-white font-medium">Scan Barcode</span>
        <button
          onClick={onClose}
          className="text-white text-xl w-10 h-10 flex items-center justify-center"
          aria-label="Close scanner"
        >
          ✕
        </button>
      </div>

      {/* Camera viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {scanStatus !== 'no-camera' && (
          <div className="relative w-full max-w-sm aspect-square">
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded"
              playsInline
              muted
            />
            {/* Corner guides */}
            <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary ${scanStatus === 'scanning' ? 'animate-pulse' : ''}`} />
            <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary ${scanStatus === 'scanning' ? 'animate-pulse' : ''}`} />
            <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary ${scanStatus === 'scanning' ? 'animate-pulse' : ''}`} />
            <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary ${scanStatus === 'scanning' ? 'animate-pulse' : ''}`} />
          </div>
        )}

        {/* Status text */}
        <div
          aria-live="polite"
          className="mt-4 text-center text-sm px-4"
        >
          {scanStatus === 'scanning' && !isLookingUp && (
            <p className="text-white/80">Point your camera at a barcode</p>
          )}
          {isLookingUp && (
            <p className="text-white/80">Looking up item…</p>
          )}
          {scanStatus === 'found' && (
            <p className="text-green-400 font-medium">Item found!</p>
          )}
          {scanStatus === 'not-found' && (
            <p className="text-white/80">
              Barcode not recognised. Enter the item name below to add it manually.
            </p>
          )}
        </div>
      </div>

      {/* Manual entry panel */}
      <div className="bg-surface rounded-t-2xl p-4">
        {scanStatus === 'no-camera' && (
          <p className="text-sm text-text/70 mb-3">
            Camera access is required to scan barcodes. Allow access in your browser settings, or enter the barcode below.
          </p>
        )}
        <p className="text-sm font-medium text-text mb-2">Enter barcode number</p>
        <div className="flex gap-2">
          <input
            ref={manualInputRef}
            type="text"
            inputMode="numeric"
            value={manualBarcode}
            onChange={e => setManualBarcode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
            placeholder="Enter barcode number"
            aria-label="Barcode number"
            className="flex-1 border border-secondary rounded-[--radius-btn] px-3 py-2 text-sm bg-background text-text placeholder:text-text/40 focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleManualLookup}
            disabled={!manualBarcode.trim() || isLookingUp}
            className="bg-primary text-white px-4 py-2 rounded-[--radius-btn] text-sm font-medium disabled:opacity-50"
          >
            Look up
          </button>
        </div>
      </div>
    </div>
  )
}
