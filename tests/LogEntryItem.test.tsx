import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LogEntryItem } from '../src/components/log/LogEntryItem'

const mockLog = {
  id: 'log-1',
  item_name: 'Banana',
  servings_logged: 1,
  serving_unit: 'medium',
  calories_per_serving: 105,
  protein_per_serving: 1.3,
  fat_per_serving: 0.4,
  carbs_per_serving: 27,
  micronutrients: { fiber: 3.1, potassium: 422, vitamin_c: 10.3 },
  is_private: false,
  slot_name: 'Breakfast',
  created_at: '2026-03-15T00:00:00Z',
}

const mockLogNoMicros = {
  ...mockLog,
  id: 'log-2',
  micronutrients: {},
}

describe('LogEntryItem drill-down', () => {
  it('does not show micronutrients by default', () => {
    render(<LogEntryItem log={mockLog} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText('Micronutrients')).toBeNull()
  })

  it('shows micronutrients section when row is clicked', () => {
    render(<LogEntryItem log={mockLog} onEdit={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Banana log entry/i }))
    expect(screen.getByText('Micronutrients')).toBeTruthy()
  })

  it('hides micronutrients when clicked again', () => {
    render(<LogEntryItem log={mockLog} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const row = screen.getByRole('button', { name: /Banana log entry/i })
    fireEvent.click(row)
    fireEvent.click(row)
    expect(screen.queryByText('Micronutrients')).toBeNull()
  })

  it('shows "No micronutrient data" for empty micronutrients', () => {
    render(<LogEntryItem log={mockLogNoMicros} onEdit={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Banana log entry/i }))
    expect(screen.getByText(/No micronutrient data/i)).toBeTruthy()
  })

  it('calls onEdit when Edit button is clicked, not on row click', () => {
    const onEdit = vi.fn()
    render(<LogEntryItem log={mockLog} onEdit={onEdit} onDelete={vi.fn()} />)
    // Row click should NOT call onEdit
    fireEvent.click(screen.getByRole('button', { name: /Banana log entry/i }))
    expect(onEdit).not.toHaveBeenCalled()
    // Edit button should call onEdit
    fireEvent.click(screen.getByRole('button', { name: /Edit Banana/i }))
    expect(onEdit).toHaveBeenCalledWith(mockLog)
  })
})
