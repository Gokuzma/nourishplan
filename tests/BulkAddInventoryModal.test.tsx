import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BulkAddInventoryModal } from '../src/components/inventory/BulkAddInventoryModal'

const invoke = vi.fn()
vi.mock('../src/lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }))
const bulkAddMutate = vi.fn()
const spendMutate = vi.fn()
vi.mock('../src/hooks/useInventory', () => ({ useBulkAddInventoryItems: () => ({ mutateAsync: bulkAddMutate }) }))
vi.mock('../src/hooks/useSpendLog', () => ({ useCreateSpendLog: () => ({ mutateAsync: spendMutate, isPending: false }) }))
vi.mock('../src/utils/receiptImage', () => ({
  MAX_RECEIPT_PHOTOS: 3,
  prepareReceiptImage: async () => ({ data: 'abc', media_type: 'image/jpeg' }),
}))

function typeText(value: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value } })
}

describe('BulkAddInventoryModal limits', () => {
  it('shows the character count against the 8,000 limit', () => {
    render(<BulkAddInventoryModal isOpen onClose={() => {}} />)
    typeText('2 kg rice')
    expect(screen.getByTestId('batch-meter').textContent).toContain('9 / 8,000 characters · up to 100 items per batch')
  })

  it('warns when the batch is nearly full', () => {
    render(<BulkAddInventoryModal isOpen onClose={() => {}} />)
    typeText('a'.repeat(7000))
    expect(screen.getByText(/Nearly full/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  it('blocks Continue and says how much to remove when over the limit', () => {
    render(<BulkAddInventoryModal isOpen onClose={() => {}} />)
    typeText('a'.repeat(8050))
    expect(screen.getByRole('alert').textContent).toContain('remove 50 characters')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('tells you when only the first 100 items were read', async () => {
    invoke.mockResolvedValueOnce({
      data: { success: true, truncated: true, items: [{ food_name: 'rice', quantity: 2, unit: 'kg', storage_location: 'pantry', expires_at: null, purchase_price: null, brand: null }] },
      error: null,
    })
    render(<BulkAddInventoryModal isOpen onClose={() => {}} />)
    typeText('lots of things')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/Only the first 100 items were read/)).toBeInTheDocument()
  })

  it('stops the mic automatically when a dictated batch fills up', async () => {
    let instance: { onresult: ((e: unknown) => void) | null; stop: () => void } | null = null
    const stop = vi.fn()
    class FakeRecognition {
      continuous = false; interimResults = false; lang = ''
      onresult: ((e: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null
      constructor() { instance = this } // eslint-disable-line @typescript-eslint/no-this-alias
      start() {}
      stop() { stop() }
    }
    ;(window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = FakeRecognition
    render(<BulkAddInventoryModal isOpen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dictate your list' }))
    await act(async () => {
      instance!.onresult!({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'b'.repeat(7700) } }] })
      await Promise.resolve()
    })
    expect(stop).toHaveBeenCalled()
    expect(screen.getByText(/This batch is full, so the mic stopped/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dictate your list' })).toBeInTheDocument()
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  })
})

describe('BulkAddInventoryModal receipt scan', () => {
  const receiptReply = {
    data: {
      success: true,
      receiptTotal: 42.5,
      items: [{ food_name: 'Whole Milk', quantity: 2, unit: 'L', storage_location: 'fridge', expires_at: null, purchase_price: 5.49, brand: null }],
    },
    error: null,
  }
  const photo = () => new File(['x'], 'receipt.jpg', { type: 'image/jpeg' })

  it('sends the photo and shows the items with the receipt total', async () => {
    invoke.mockResolvedValueOnce(receiptReply)
    render(<BulkAddInventoryModal isOpen onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Scan a receipt'), { target: { files: [photo()] } })
    expect(await screen.findByText(/Add the receipt total, \$42.50/)).toBeInTheDocument()
    expect(invoke).toHaveBeenLastCalledWith('parse-inventory', { body: { images: [{ data: 'abc', media_type: 'image/jpeg' }] } })
    expect(screen.getByDisplayValue('Whole Milk')).toBeInTheDocument()
  })

  it('logs the total as grocery spend when ticked, and not when unticked', async () => {
    invoke.mockResolvedValueOnce(receiptReply)
    spendMutate.mockClear()
    const { unmount } = render(<BulkAddInventoryModal isOpen onClose={() => {}} initialReceiptFiles={[photo()]} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Add 1 item' }))
    await act(async () => { await Promise.resolve() })
    expect(spendMutate).toHaveBeenCalledWith({ amount: 42.5, is_partial: false, source: 'grocery' })
    unmount()

    invoke.mockResolvedValueOnce(receiptReply)
    spendMutate.mockClear()
    render(<BulkAddInventoryModal isOpen onClose={() => {}} initialReceiptFiles={[photo()]} />)
    fireEvent.click(await screen.findByRole('checkbox', { name: /Add the receipt total/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 item' }))
    await act(async () => { await Promise.resolve() })
    expect(bulkAddMutate).toHaveBeenCalled()
    expect(spendMutate).not.toHaveBeenCalled()
  })

  it('refuses more than 3 photos', async () => {
    render(<BulkAddInventoryModal isOpen onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Scan a receipt'), { target: { files: [photo(), photo(), photo(), photo()] } })
    expect(await screen.findByText('Pick up to 3 photos of one receipt.')).toBeInTheDocument()
  })
})
