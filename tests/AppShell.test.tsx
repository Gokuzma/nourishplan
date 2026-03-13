import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

// Mock useAuth
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    session: { user: { email: 'test@example.com' } },
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))

// Mock useHousehold to avoid Supabase client initialization in tests
vi.mock('../src/hooks/useHousehold', () => ({
  useHousehold: vi.fn().mockReturnValue({
    data: { household_id: 'hh-1', role: 'admin', households: { name: 'Test Household' } },
    isPending: false,
    isError: false,
  }),
  useHouseholdMembers: vi.fn().mockReturnValue({ data: [], isPending: false, isError: false }),
  useCreateInvite: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false, error: null }),
}))

describe('AppShell', () => {
  it('renders 5 navigation tabs', async () => {
    const { TabBar } = await import('../src/components/layout/TabBar')

    render(
      React.createElement(MemoryRouter, null,
        React.createElement(TabBar, null)
      )
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Foods')).toBeInTheDocument()
    expect(screen.getByText('Recipes')).toBeInTheDocument()
    expect(screen.getByText('Household')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('Sidebar renders 6 navigation items including coming-soon Plan', async () => {
    const { Sidebar } = await import('../src/components/layout/Sidebar')

    render(
      React.createElement(MemoryRouter, null,
        React.createElement(Sidebar, null)
      )
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Foods')).toBeInTheDocument()
    expect(screen.getByText('Recipes')).toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByText('Household')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()

    // Plan tab should have coming-soon indicator
    const planTab = screen.getByRole('link', { name: /plan/i })
    expect(planTab).toHaveAttribute('aria-disabled', 'true')
  })

  it('Sidebar shows app name', async () => {
    const { Sidebar } = await import('../src/components/layout/Sidebar')

    render(
      React.createElement(MemoryRouter, null,
        React.createElement(Sidebar, null)
      )
    )

    expect(screen.getByText('NourishPlan')).toBeInTheDocument()
  })

  it('Sidebar has a logout button', async () => {
    const { Sidebar } = await import('../src/components/layout/Sidebar')

    render(
      React.createElement(MemoryRouter, null,
        React.createElement(Sidebar, null)
      )
    )

    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })
})

test('AppShell test infrastructure works', () => expect(true).toBe(true))
