import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

let mockMembers: { user_id: string; profiles: { display_name: string } }[] | undefined
let mockProfiles: { id: string; name: string; is_child: boolean; birth_year: number | null }[] | undefined
const useNutritionTargetSpy = vi.fn().mockReturnValue({ data: null })

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'u-adult' } } }),
}))
vi.mock('../src/hooks/useHousehold', () => ({
  useHousehold: () => ({ data: { household_id: 'hh-1', role: 'admin' } }),
  useHouseholdMembers: () => ({ data: mockMembers }),
  useMemberProfiles: () => ({ data: mockProfiles }),
}))
vi.mock('../src/hooks/useNutritionTargets', () => ({
  useNutritionTarget: (...args: unknown[]) => useNutritionTargetSpy(...args),
}))
vi.mock('../src/components/targets/ProfileForm', () => ({
  ProfileForm: ({ memberType }: { memberType: string }) => <div data-testid="profile-form">{memberType}</div>,
}))
vi.mock('../src/components/targets/SuggestedTargetsCard', () => ({
  SuggestedTargetsCard: ({ memberType }: { memberType: string }) => <div data-testid="suggested-card">{memberType}</div>,
}))
vi.mock('../src/components/targets/NutritionTargetsForm', () => ({
  NutritionTargetsForm: ({ memberType }: { memberType: string }) => <div data-testid="targets-form">{memberType}</div>,
}))

import { MemberTargetsPage } from '../src/pages/MemberTargetsPage'

function renderPage(memberId: string) {
  return render(
    <MemoryRouter initialEntries={[`/members/${memberId}/targets`]}>
      <Routes>
        <Route path="/members/:id/targets" element={<MemberTargetsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockMembers = undefined
  mockProfiles = undefined
  useNutritionTargetSpy.mockClear()
})

describe('MemberTargetsPage cold load', () => {
  it('does not render the forms or fetch the target while members are loading', () => {
    mockProfiles = []
    renderPage('u-adult')
    expect(screen.getByText('Loading…')).toBeTruthy()
    expect(screen.queryByTestId('profile-form')).toBeNull()
    expect(screen.queryByTestId('suggested-card')).toBeNull()
    expect(screen.queryByTestId('targets-form')).toBeNull()
    for (const call of useNutritionTargetSpy.mock.calls) expect(call[0]).toBeUndefined()
  })

  it('does not render the forms while member profiles are loading', () => {
    mockMembers = [{ user_id: 'u-adult', profiles: { display_name: 'Sam' } }]
    renderPage('u-adult')
    expect(screen.queryByTestId('profile-form')).toBeNull()
  })

  it('renders the forms with memberType user once both lists have loaded', () => {
    mockMembers = [{ user_id: 'u-adult', profiles: { display_name: 'Sam' } }]
    mockProfiles = []
    renderPage('u-adult')
    expect(screen.getByTestId('profile-form').textContent).toBe('user')
    expect(screen.getByTestId('suggested-card').textContent).toBe('user')
    expect(screen.getByTestId('targets-form').textContent).toBe('user')
    expect(useNutritionTargetSpy).toHaveBeenLastCalledWith('hh-1', 'u-adult', 'user')
  })

  it('renders memberType profile for a managed profile', () => {
    mockMembers = [{ user_id: 'u-adult', profiles: { display_name: 'Sam' } }]
    mockProfiles = [{ id: 'p-kid', name: 'Kiddo', is_child: true, birth_year: 2023 }]
    renderPage('p-kid')
    expect(screen.getByTestId('profile-form').textContent).toBe('profile')
  })
})
