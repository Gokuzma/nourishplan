import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock supabase module
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

// Import after mock setup
import { supabase } from '../src/lib/supabase'

describe('signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls signUp with email, password and display_name', async () => {
    const { AuthForm } = await import('../src/components/auth/AuthForm')
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as any)

    render(React.createElement(AuthForm, null))

    // Should start in login mode — toggle to signup
    const toggleBtn = screen.getByRole('button', { name: /sign up/i })
    await userEvent.click(toggleBtn)

    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/password/i)
    const nameInput = screen.getByPlaceholderText(/display name/i)
    const submitBtn = screen.getByRole('button', { name: /create account/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.type(nameInput, 'Test User')
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: { data: { display_name: 'Test User' } },
      })
    })
  })

  it('calls signInWithPassword in login mode', async () => {
    const { AuthForm } = await import('../src/components/auth/AuthForm')
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as any)

    render(React.createElement(AuthForm, null))

    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/password/i)
    const submitBtn = screen.getByRole('button', { name: /log in/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('calls signInWithOAuth with google provider', async () => {
    const { AuthForm } = await import('../src/components/auth/AuthForm')
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: null },
      error: null,
    } as any)

    render(React.createElement(AuthForm, null))

    const googleBtn = screen.getByRole('button', { name: /google/i })
    await userEvent.click(googleBtn)

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' })
      )
    })
  })
})

describe('reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls resetPasswordForEmail when reset form submitted', async () => {
    const { ResetModal } = await import('../src/components/auth/ResetModal')
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    } as any)

    render(React.createElement(ResetModal, { onClose: vi.fn() }))

    const emailInput = screen.getByPlaceholderText(/email/i)
    const submitBtn = screen.getByRole('button', { name: /send reset/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ redirectTo: expect.any(String) })
      )
    })
  })

  it('shows success message after reset email sent', async () => {
    const { ResetModal } = await import('../src/components/auth/ResetModal')
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    } as any)

    render(React.createElement(ResetModal, { onClose: vi.fn() }))

    const emailInput = screen.getByPlaceholderText(/email/i)
    const submitBtn = screen.getByRole('button', { name: /send reset/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })
})

test('auth test infrastructure works', () => expect(true).toBe(true))
