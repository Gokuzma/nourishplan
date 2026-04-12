// V-03: NotificationPermissionBanner renders denied state with fallback text
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// localStorage mock — scoped to this file, restored after all tests
const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
}
const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage')
vi.stubGlobal('localStorage', localStorageMock)

afterAll(() => {
  // Restore original localStorage so other test files are unaffected
  if (originalLocalStorage) {
    Object.defineProperty(window, 'localStorage', originalLocalStorage)
  }
})

// Mock useNotificationPermission to control permission state in each test
const mockRequest = vi.fn()
const mockDismiss = vi.fn()

vi.mock('../src/hooks/useNotificationPermission', () => ({
  useNotificationPermission: vi.fn(() => ({
    permission: 'default',
    request: mockRequest,
    dismiss: mockDismiss,
    shouldShowPrompt: true,
    fire: vi.fn(),
  })),
}))

describe('NotificationPermissionBanner (V-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage store between tests
    for (const key of Object.keys(localStorageStore)) {
      delete localStorageStore[key]
    }
    localStorageMock.getItem.mockImplementation((key: string) => localStorageStore[key] ?? null)
  })

  it('renders "Notifications blocked" text when permission is denied', async () => {
    const { useNotificationPermission } = await import('../src/hooks/useNotificationPermission')
    vi.mocked(useNotificationPermission).mockReturnValue({
      permission: 'denied',
      request: mockRequest,
      dismiss: mockDismiss,
      shouldShowPrompt: true,
      fire: vi.fn(),
    })

    const { NotificationPermissionBanner } = await import(
      '../src/components/cook/NotificationPermissionBanner'
    )

    render(
      React.createElement(NotificationPermissionBanner, {
        onPermissionChange: vi.fn(),
      })
    )

    expect(screen.getByText(/Notifications blocked/i)).toBeInTheDocument()
    expect(screen.getByText(/browser settings/i)).toBeInTheDocument()
  })

  it('renders prompt UI when permission is default', async () => {
    const { useNotificationPermission } = await import('../src/hooks/useNotificationPermission')
    vi.mocked(useNotificationPermission).mockReturnValue({
      permission: 'default',
      request: mockRequest,
      dismiss: mockDismiss,
      shouldShowPrompt: true,
      fire: vi.fn(),
    })

    const { NotificationPermissionBanner } = await import(
      '../src/components/cook/NotificationPermissionBanner'
    )

    render(
      React.createElement(NotificationPermissionBanner, {
        onPermissionChange: vi.fn(),
      })
    )

    expect(screen.getByText(/Get notified when timers finish/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Allow notifications/i })).toBeInTheDocument()
  })

  it('renders nothing when permission is granted', async () => {
    const { useNotificationPermission } = await import('../src/hooks/useNotificationPermission')
    vi.mocked(useNotificationPermission).mockReturnValue({
      permission: 'granted',
      request: mockRequest,
      dismiss: mockDismiss,
      shouldShowPrompt: false,
      fire: vi.fn(),
    })

    const { NotificationPermissionBanner } = await import(
      '../src/components/cook/NotificationPermissionBanner'
    )

    const { container } = render(
      React.createElement(NotificationPermissionBanner, {
        onPermissionChange: vi.fn(),
      })
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when permission is unsupported', async () => {
    const { useNotificationPermission } = await import('../src/hooks/useNotificationPermission')
    vi.mocked(useNotificationPermission).mockReturnValue({
      permission: 'unsupported',
      request: mockRequest,
      dismiss: mockDismiss,
      shouldShowPrompt: false,
      fire: vi.fn(),
    })

    const { NotificationPermissionBanner } = await import(
      '../src/components/cook/NotificationPermissionBanner'
    )

    const { container } = render(
      React.createElement(NotificationPermissionBanner, {
        onPermissionChange: vi.fn(),
      })
    )

    expect(container.firstChild).toBeNull()
  })

  it('hides the denied banner when dismissed within 7-day cooldown', async () => {
    const { useNotificationPermission } = await import('../src/hooks/useNotificationPermission')
    vi.mocked(useNotificationPermission).mockReturnValue({
      permission: 'denied',
      request: mockRequest,
      dismiss: mockDismiss,
      shouldShowPrompt: false,
      fire: vi.fn(),
    })

    // Seed a recent dismissal timestamp so the component sees the cooldown
    localStorageStore['cook-notification-dismissed-at'] = String(Date.now())
    localStorageMock.getItem.mockImplementation((key: string) => localStorageStore[key] ?? null)

    const { NotificationPermissionBanner } = await import(
      '../src/components/cook/NotificationPermissionBanner'
    )

    const { container } = render(
      React.createElement(NotificationPermissionBanner, {
        onPermissionChange: vi.fn(),
      })
    )

    // With a recent dismissal, the cooldown check in the component hides the banner
    expect(container.firstChild).toBeNull()
  })
})
