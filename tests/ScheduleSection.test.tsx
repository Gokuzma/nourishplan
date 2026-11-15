import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ScheduleSection } from '../src/components/settings/ScheduleSection'

let mockRows: { day_of_week: number; slot_name: string; status: string }[] = []

vi.mock('../src/hooks/useSchedule', () => ({
  useSchedule: vi.fn(() => ({ data: mockRows })),
  useSaveSchedule: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

describe('ScheduleSection', () => {
  it('adult schedule offers all five statuses and explains how the household combines', () => {
    mockRows = []
    render(<ScheduleSection householdId="hh-1" memberId="u-1" memberType="user" />)
    const cell = screen.getByLabelText('Mon Dinner: Cook')
    expect(within(cell).getAllByRole('option').map(o => o.textContent)).toEqual(['Cook', 'Batch', 'Eat', 'Quick', 'Away'])
    expect(screen.getByText(/only skipped when everyone is away/i)).toBeInTheDocument()
  })

  it('child schedule offers only Home and Away with a child-specific explainer', () => {
    mockRows = []
    render(<ScheduleSection householdId="hh-1" memberId="mp-1" memberType="profile" memberName="Alex" isChild />)
    const cell = screen.getByLabelText('Mon Lunch: Home')
    expect(within(cell).getAllByRole('option').map(o => o.textContent)).toEqual(['Home', 'Away'])
    expect(screen.getByText(/Alex eats whatever the family is having/)).toBeInTheDocument()
  })

  it('child schedule shows previously saved non-away statuses as Home', () => {
    mockRows = [
      { day_of_week: 1, slot_name: 'Lunch', status: 'consume' },
      { day_of_week: 2, slot_name: 'Lunch', status: 'away' },
    ]
    render(<ScheduleSection householdId="hh-1" memberId="mp-1" memberType="profile" memberName="Alex" isChild />)
    expect(screen.getByLabelText('Mon Lunch: Home')).toHaveValue('prep')
    expect(screen.getByLabelText('Tue Lunch: Away')).toHaveValue('away')
  })
})
