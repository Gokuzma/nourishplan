import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BulkAddInventoryModal } from '../src/components/inventory/BulkAddInventoryModal'

const invoke = vi.fn()
vi.mock('../src/lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }))
vi.mock('../src/hooks/useInventory', () => ({ useBulkAddInventoryItems: () => ({ mutateAsync: vi.fn() }) }))

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
