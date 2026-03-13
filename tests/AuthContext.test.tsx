import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Mock supabase — use inline functions to avoid hoisting issues
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

import { supabase } from '../src/lib/supabase'

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any)
  })

  it('initializes session from getSession on mount', async () => {
    const mockSession = { user: { id: '123', email: 'test@example.com' } }
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    })

    const { AuthProvider, useAuth } = await import('../src/contexts/AuthContext')

    function TestConsumer() {
      const { session, loading } = useAuth()
      if (loading) return React.createElement('div', null, 'loading')
      return React.createElement('div', null, session ? session.user.email : 'no-session')
    }

    render(
      React.createElement(AuthProvider, null,
        React.createElement(TestConsumer, null)
      ),
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  it('sets up onAuthStateChange subscription and cleans up on unmount', async () => {
    const mockUnsubscribe = vi.fn()
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    } as any)
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })

    const { AuthProvider } = await import('../src/contexts/AuthContext')

    const { unmount } = render(
      React.createElement(AuthProvider, null, React.createElement('div', null)),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(vi.mocked(supabase.auth.onAuthStateChange)).toHaveBeenCalled()
    })

    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('updates session when onAuthStateChange fires', async () => {
    let authCallback: ((event: string, session: any) => void) | null = null
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
      authCallback = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } } as any
    })

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })

    const { AuthProvider, useAuth } = await import('../src/contexts/AuthContext')

    function TestConsumer() {
      const { session } = useAuth()
      return React.createElement('div', null, session ? session.user.email : 'no-session')
    }

    render(
      React.createElement(AuthProvider, null,
        React.createElement(TestConsumer, null)
      ),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByText('no-session')).toBeInTheDocument()
    })

    const newSession = { user: { id: '456', email: 'new@example.com' } }
    act(() => {
      authCallback?.('SIGNED_IN', newSession)
    })

    await waitFor(() => {
      expect(screen.getByText('new@example.com')).toBeInTheDocument()
    })
  })

  it('signOut calls supabase.auth.signOut', async () => {
    const mockSession = { user: { id: '123', email: 'test@example.com' } }
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    })

    const { AuthProvider, useAuth } = await import('../src/contexts/AuthContext')

    function TestConsumer() {
      const { session, signOut } = useAuth()
      return React.createElement(
        'div',
        null,
        React.createElement('span', null, session ? session.user.email : 'no-session'),
        React.createElement('button', { onClick: signOut }, 'logout')
      )
    }

    const { getByRole } = render(
      React.createElement(AuthProvider, null,
        React.createElement(TestConsumer, null)
      ),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    await act(async () => {
      getByRole('button', { name: 'logout' }).click()
    })

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })
  })
})

test('AuthContext test infrastructure works', () => expect(true).toBe(true))
