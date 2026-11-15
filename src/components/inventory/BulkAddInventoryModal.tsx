import { useEffect, useRef, useState } from 'react'
import type { StorageLocation, InventoryUnit } from '../../types/database'
import { useBulkAddInventoryItems } from '../../hooks/useInventory'
import { supabase } from '../../lib/supabase'
import { Icon } from '../Icon'

interface BulkAddInventoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export interface ParsedInventoryItem {
  food_name: string
  quantity: number
  unit: InventoryUnit
  storage_location: StorageLocation
  expires_at: string | null
  purchase_price: number | null
  brand: string | null
}

// Must match MAX_INPUT_CHARS / MAX_ITEMS in supabase/functions/parse-inventory
const MAX_INPUT_CHARS = 8000
const MAX_ITEMS = 100
const NEARLY_FULL_CHARS = 7000
const AUTO_STOP_CHARS = 7600

const UNIT_OPTIONS: InventoryUnit[] = ['g', 'kg', 'ml', 'L', 'units']
const LOCATION_OPTIONS: { label: string; value: StorageLocation }[] = [
  { label: 'Pantry', value: 'pantry' },
  { label: 'Fridge', value: 'fridge' },
  { label: 'Freezer', value: 'freezer' },
]

const PLACEHOLDER = `Tell it what you have — talk, type, or paste.

"2 kg of rice and 3 cans of tuna in the pantry, a dozen eggs and milk in the fridge, two chicken breasts in the freezer"

Or paste rows straight from a spreadsheet.`

// Minimal ambient typing for the vendor-prefixed Web Speech API.
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function BulkAddInventoryModal({ isOpen, onClose }: BulkAddInventoryModalProps) {
  const bulkAdd = useBulkAddInventoryItems()
  const [step, setStep] = useState<'input' | 'review'>('input')
  const [text, setText] = useState('')
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ParsedInventoryItem[]>([])
  const [truncated, setTruncated] = useState(false)
  const [autoStopped, setAutoStopped] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const voiceSupported = getSpeechRecognition() !== null

  // Reset when (re)opened; stop the mic when closed or unmounted
  useEffect(() => {
    if (isOpen) {
      setStep('input')
      setText('')
      setInterim('')
      setItems([])
      setError(null)
      setTruncated(false)
      setAutoStopped(false)
    }
    return () => stopListening()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setListening(false)
    setInterim('')
  }

  function toggleListening() {
    if (listening) {
      stopListening()
      return
    }
    const Impl = getSpeechRecognition()
    if (!Impl) return
    const recognition = new Impl()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-CA'
    setAutoStopped(false)
    recognition.onresult = (event) => {
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const transcript = result[0].transcript.trim()
          if (transcript) {
            setText(prev => {
              const next = prev.trim() ? `${prev.trim()}, ${transcript}` : transcript
              if (next.length >= AUTO_STOP_CHARS) {
                setAutoStopped(true)
                queueMicrotask(stopListening)
              }
              return next
            })
          }
        } else {
          interimText += result[0].transcript
        }
      }
      setInterim(interimText)
    }
    // Browsers stop recognition after silence; restart while the user wants it on
    recognition.onend = () => {
      try { recognition.start() } catch { setListening(false) }
    }
    recognition.onerror = () => stopListening()
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  async function handleParse() {
    stopListening()
    setError(null)
    setParsing(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('parse-inventory', {
        body: { input: text },
      })
      if (fnError) throw fnError
      if (!data?.success) throw new Error(data?.error || 'Could not understand that list.')
      setItems(data.items as ParsedInventoryItem[])
      setTruncated(data.truncated === true)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not understand that list. Try again.')
    } finally {
      setParsing(false)
    }
  }

  function updateItem(index: number, updates: Partial<ParsedInventoryItem>) {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...updates } : it)))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleAddAll() {
    setError(null)
    const valid = items.filter(it => it.food_name.trim() && it.quantity > 0)
    if (valid.length === 0) {
      setError('Nothing to add — every row needs a name and a quantity.')
      return
    }
    try {
      await bulkAdd.mutateAsync(
        valid.map(it => ({
          food_name: it.food_name.trim(),
          brand: it.brand ?? undefined,
          quantity_remaining: it.quantity,
          unit: it.unit,
          storage_location: it.storage_location,
          expires_at: it.expires_at,
          purchase_price: it.purchase_price,
        }))
      )
      onClose()
    } catch {
      setError('Could not save the items. Check your connection and try again.')
    }
  }

  if (!isOpen) return null

  const charCount = text.trim().length
  const overLimit = charCount > MAX_INPUT_CHARS
  const nearlyFull = charCount >= NEARLY_FULL_CHARS

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto p-6 relative">
          <h2 className="text-lg font-bold text-text mb-1">
            {step === 'input' ? 'Bulk add to inventory' : `Review ${items.length} item${items.length === 1 ? '' : 's'}`}
          </h2>

          {step === 'input' ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text/60">
                Say it, type it, or paste it from a spreadsheet — everything gets sorted into items you can review before saving.
              </p>
              <textarea
                value={interim ? `${text}${text.trim() ? ', ' : ''}${interim}` : text}
                onChange={e => setText(e.target.value)}
                rows={7}
                className="w-full rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                placeholder={PLACEHOLDER}
              />
              <div data-testid="batch-meter">
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden" aria-hidden="true">
                  <div
                    className={`h-full ${overLimit ? 'bg-red-600' : nearlyFull ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, (charCount / MAX_INPUT_CHARS) * 100)}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${overLimit ? 'text-red-600' : 'text-text/60'}`}>
                  {charCount.toLocaleString('en-CA')} / {MAX_INPUT_CHARS.toLocaleString('en-CA')} characters · up to {MAX_ITEMS} items per batch
                </p>
                {overLimit ? (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    Too long for one batch — remove {(charCount - MAX_INPUT_CHARS).toLocaleString('en-CA')} characters, or cut the end and add it in the next batch.
                  </p>
                ) : autoStopped ? (
                  <p className="text-xs text-amber-700 mt-1" role="status">
                    This batch is full, so the mic stopped. Tap Continue to review it, then start the next batch.
                  </p>
                ) : nearlyFull ? (
                  <p className="text-xs text-amber-700 mt-1" role="status">
                    Nearly full — finish this area, then tap Continue and start a new batch.
                  </p>
                ) : null}
              </div>
              {listening && (
                <p className="text-xs text-red-600 animate-pulse" role="status">
                  ● Listening… speak naturally, tap the mic again to stop.
                </p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center gap-3 pt-1">
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    aria-pressed={listening}
                    aria-label={listening ? 'Stop dictating' : 'Dictate your list'}
                    className={`rounded-[--radius-btn] px-4 py-2.5 text-sm font-semibold transition-colors ${
                      listening ? 'bg-red-600 text-white' : 'bg-secondary text-text hover:bg-secondary/70'
                    }`}
                  >
                    {listening ? '■ Stop' : '🎤 Dictate'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={parsing || !text.trim() || overLimit}
                  className="flex-1 rounded-[--radius-btn] bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {parsing ? 'Sorting it out…' : 'Continue'}
                </button>
                <button type="button" onClick={onClose} className="text-sm text-text/50 hover:text-text transition-colors px-2 py-2.5">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text/60">
                Check the details — tap any field to adjust, then add everything at once.
              </p>
              {truncated && (
                <p className="text-sm text-amber-700" role="alert">
                  Only the first {MAX_ITEMS} items were read. Add these, then bulk add the rest of that list as a new batch.
                </p>
              )}
              <div className="flex flex-col gap-2">
                {items.map((item, i) => (
                  <div key={i} className="rounded-[--radius-btn] border border-secondary p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.food_name}
                        onChange={e => updateItem(i, { food_name: e.target.value })}
                        aria-label={`Item ${i + 1} name`}
                        className="flex-1 rounded-[--radius-btn] border border-secondary bg-background px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        aria-label={`Remove ${item.food_name}`}
                        className="text-text/40 hover:text-red-600 transition-colors px-1"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(i, { quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                        min={0}
                        step="any"
                        aria-label={`Item ${i + 1} quantity`}
                        className="w-20 rounded-[--radius-btn] border border-secondary bg-background px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
                      />
                      <select
                        value={item.unit}
                        onChange={e => updateItem(i, { unit: e.target.value as InventoryUnit })}
                        aria-label={`Item ${i + 1} unit`}
                        className="rounded-[--radius-btn] border border-secondary bg-background px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
                      >
                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <select
                        value={item.storage_location}
                        onChange={e => updateItem(i, { storage_location: e.target.value as StorageLocation })}
                        aria-label={`Item ${i + 1} location`}
                        className="flex-1 rounded-[--radius-btn] border border-secondary bg-background px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
                      >
                        {LOCATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    {(item.expires_at || item.purchase_price != null || item.brand) && (
                      <p className="text-xs text-text/50">
                        {[
                          item.brand,
                          item.expires_at ? `expires ${item.expires_at}` : null,
                          item.purchase_price != null ? `$${item.purchase_price.toFixed(2)}` : null,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="text-sm text-text/50 hover:text-text transition-colors px-2 py-2.5"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleAddAll}
                  disabled={bulkAdd.isPending || items.length === 0}
                  className="flex-1 rounded-[--radius-btn] bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {bulkAdd.isPending ? 'Adding…' : `Add ${items.length} item${items.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
