import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
}))

import { supabase } from '../src/lib/supabase'
import { ResetPasswordPage } from '../src/pages/ResetPasswordPage'

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any)
  })

  it('renders loading state initially', () => {
    render(React.createElement(ResetPasswordPage))
    expect(screen.getByText(/Verifying reset link/i)).toBeInTheDocument()
  })

  it('shows password form after PASSWORD_RECOVERY event', async () => {
    let authCallback: ((event: string, session: unknown) => void) | null = null
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
      authCallback = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } } as any
    })

    render(React.createElement(ResetPasswordPage))

    expect(screen.getByText(/Verifying reset link/i)).toBeInTheDocument()

    await act(async () => {
      authCallback?.('PASSWORD_RECOVERY', { session: {} })
    })

    expect(screen.getByRole('button', { name: /Set New Password/i })).toBeInTheDocument()
  })
})
