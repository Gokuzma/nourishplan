// V-02: Realtime subscription cleanup — useCookSession calls removeChannel on unmount
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock supabase before importing the hook
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}
const mockRemoveChannel = vi.fn()

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: mockRemoveChannel,
  },
}))

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ session: { user: { id: 'user-1' } } }),
}))

vi.mock('../src/hooks/useHousehold', () => ({
  useHousehold: vi.fn().mockReturnValue({
    data: { household_id: 'hh-1', role: 'admin', households: { name: 'Test Household' } },
    isPending: false,
    isError: false,
  }),
  useHouseholdMembers: vi.fn().mockReturnValue({ data: [], isPending: false }),
}))

describe('useCookSession Realtime cleanup (V-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock channel so each test has a fresh chain
    mockChannel.on.mockReturnThis()
    mockChannel.subscribe.mockReturnThis()
  })

  it('calls removeChannel on unmount', async () => {
    const { useCookSession } = await import('../src/hooks/useCookSession')
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { unmount } = renderHook(() => useCookSession('test-session-id'), { wrapper })

    // Unmount the hook — should trigger cleanup in the useEffect return
    unmount()
    cleanup()

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel)
  })

  it('does not subscribe when sessionId is undefined', async () => {
    const { useCookSession } = await import('../src/hooks/useCookSession')
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { unmount } = renderHook(() => useCookSession(undefined), { wrapper })
    unmount()
    cleanup()

    const { supabase } = await import('../src/lib/supabase')
    expect(supabase.channel).not.toHaveBeenCalled()
  })
})
