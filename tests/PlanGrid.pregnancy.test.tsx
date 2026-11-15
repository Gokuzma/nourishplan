import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    session: { user: { id: 'u-dad', email: 'dad@example.com' } },
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))

vi.mock('../src/hooks/useHousehold', () => ({
  useHousehold: vi.fn().mockReturnValue({
    data: { household_id: 'hh-1', role: 'admin', households: { name: 'Test' } },
    isPending: false,
    isError: false,
  }),
  useHouseholdMembers: vi.fn().mockReturnValue({ data: [], isPending: false, isError: false }),
  useMemberProfiles: vi.fn().mockReturnValue({ data: [], isPending: false, isError: false }),
}))

vi.mock('../src/hooks/useSchedule', () => ({
  useHouseholdSchedules: vi.fn(() => ({ data: [], isPending: false, isError: false })),
  useScheduleExceptions: vi.fn(() => ({ data: [], isPending: false, isError: false })),
  useSaveDayScheduleExceptions: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  useSchedule: vi.fn(() => ({ data: [], isPending: false, isError: false })),
  useSaveSchedule: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() })),
}))

vi.mock('../src/hooks/useMealPlan', () => ({
  useMealPlanSlots: vi.fn(() => ({ data: [], isPending: false, isError: false })),
  useAssignSlot: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  useClearSlot: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() })),
  useToggleLock: vi.fn(() => ({ mutate: vi.fn() })),
}))

vi.mock('../src/hooks/useMeals', () => ({
  useMeals: vi.fn(() => ({ data: [], isPending: false, isError: false })),
  useGetOrCreateMealForRecipe: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue('meal-id'), isPending: false })),
}))

vi.mock('../src/hooks/useFoodLogs', () => ({
  useHouseholdDayLogs: vi.fn(() => ({ data: [], isPending: false, isError: false })),
}))

vi.mock('../src/hooks/useNutritionTargets', () => ({
  useNutritionTargets: vi.fn(() => ({ data: [], isPending: false, isError: false })),
}))

let mockSnapshot: Record<string, unknown> | undefined

vi.mock('../src/hooks/usePlanGeneration', () => ({
  useGeneratePlan: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  useGenerationJob: vi.fn(() => ({ data: null, isPending: false, isError: false })),
  useLatestGeneration: vi.fn(() => ({
    data: mockSnapshot === undefined
      ? null
      : { id: 'gen-1', status: 'complete', completed_at: null, constraint_snapshot: mockSnapshot },
    isPending: false,
    isError: false,
  })),
  useSuggestAlternative: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('../src/hooks/useNutritionGaps', () => ({
  useNutritionGaps: vi.fn(() => ({ gaps: [], hasGeneration: false, latestGeneration: null })),
}))

vi.mock('../src/lib/supabase', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } },
}))

vi.mock('../src/components/plan/DayCarousel', () => ({
  DayCarousel: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  DragOverlay: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
  useDraggable: vi.fn().mockReturnValue({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), isDragging: false, transform: null }),
  useDroppable: vi.fn().mockReturnValue({ setNodeRef: vi.fn(), isOver: false }),
}))

async function renderPlanGrid() {
  const { PlanGrid } = await import('../src/components/plan/PlanGrid')
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(PlanGrid, {
          planId: 'plan-1',
          weekStart: '2026-04-05',
          weekStartDay: 0,
          memberTarget: null,
          householdId: 'hh-1',
          currentUserId: 'u-dad',
          selectedMemberId: 'u-dad',
          selectedMemberType: 'user',
          logDate: '2026-04-06',
        }),
      ),
    ),
  )
}

const BANNER_TEXT = 'Not pregnancy-safety checked. Regenerate or review.'

describe('PlanGrid unchecked pregnancy-safety banner', () => {
  beforeEach(() => {
    mockSnapshot = undefined
  })

  it('shows the alert banner when pregnancy is active and the check did not run', async () => {
    mockSnapshot = { pregnancySafety: { active: true, checked: false } }
    await renderPlanGrid()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(BANNER_TEXT)
    expect(screen.queryByRole('button', { name: /dismiss|close/i })).toBeNull()
  })

  it('hides the banner when the check completed', async () => {
    mockSnapshot = { pregnancySafety: { active: true, checked: true } }
    await renderPlanGrid()
    expect(screen.queryByText(BANNER_TEXT)).toBeNull()
  })

  it('hides the banner when pregnancy is not active', async () => {
    mockSnapshot = { pregnancySafety: { active: false, checked: false } }
    await renderPlanGrid()
    expect(screen.queryByText(BANNER_TEXT)).toBeNull()
  })

  it('hides the banner when the snapshot has no pregnancySafety key', async () => {
    mockSnapshot = {}
    await renderPlanGrid()
    expect(screen.queryByText(BANNER_TEXT)).toBeNull()
  })
})
