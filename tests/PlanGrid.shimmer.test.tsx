import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock AuthContext (matches tests/AppShell.test.tsx pattern)
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    session: { user: { id: 'user-1', email: 'test@example.com' } },
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))

// Mock useHousehold family
vi.mock('../src/hooks/useHousehold', () => ({
  useHousehold: vi.fn().mockReturnValue({
    data: { household_id: 'hh-1', role: 'admin', households: { name: 'Test' } },
    isPending: false,
    isError: false,
  }),
  useHouseholdMembers: vi.fn().mockReturnValue({ data: [], isPending: false, isError: false }),
  useMemberProfiles: vi.fn().mockReturnValue({ data: [], isPending: false, isError: false }),
}))

// Shared mutable mock slot state per test — rewrite before each render
let mockSlots: unknown[] = []
let mockGenerationJobStatus: 'running' | 'done' | null = null

vi.mock('../src/hooks/useMealPlan', () => ({
  useMealPlanSlots: vi.fn(() => ({ data: mockSlots, isPending: false, isError: false })),
  useAssignSlot: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  useClearSlot: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() })),
  useToggleLock: vi.fn(() => ({ mutate: vi.fn() })),
}))

vi.mock('../src/hooks/useMeals', () => ({
  useMeals: vi.fn(() => ({ data: [], isPending: false, isError: false })),
}))

vi.mock('../src/hooks/useFoodLogs', () => ({
  useHouseholdDayLogs: vi.fn(() => ({ data: [], isPending: false, isError: false })),
}))

vi.mock('../src/hooks/useNutritionTargets', () => ({
  useNutritionTargets: vi.fn(() => ({ data: [], isPending: false, isError: false })),
}))

vi.mock('../src/hooks/usePlanGeneration', () => ({
  useGeneratePlan: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  useGenerationJob: vi.fn(() => ({
    data: mockGenerationJobStatus ? { id: 'job-1', status: mockGenerationJobStatus } : null,
    isPending: false,
    isError: false,
  })),
  useLatestGeneration: vi.fn(() => ({ data: null, isPending: false, isError: false })),
  useSuggestAlternative: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('../src/hooks/useNutritionGaps', () => ({
  useNutritionGaps: vi.fn(() => ({ gaps: [], hasGeneration: false, latestGeneration: null })),
}))

// Mock supabase client for the RecipeSuggestionCard onAdd handler
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}))

// Mock DayCarousel — uses scrollIntoView and IntersectionObserver which are not in jsdom
vi.mock('../src/components/plan/DayCarousel', () => ({
  DayCarousel: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))

// Mock DndContext etc — dnd-kit is heavy and not relevant to the shimmer test
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  DragOverlay: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
  useDraggable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
    transform: null,
  }),
  useDroppable: vi.fn().mockReturnValue({ setNodeRef: vi.fn(), isOver: false }),
}))

async function renderPlanGrid() {
  // ESM dynamic import — matches tests/AppShell.test.tsx canonical pattern.
  // vi.mock calls above are hoisted, so this import resolves with all mocks in place.
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
          weekStart: '2026-04-06',
          weekStartDay: 0,
          memberTarget: null,
          householdId: 'hh-1',
          currentUserId: 'user-1',
          selectedMemberId: 'user-1',
          selectedMemberType: 'user',
          logDate: '2026-04-06',
        }),
      ),
    ),
  )
}

function makeLockedSlot(dayIndex: number, slotName: string, mealName: string) {
  return {
    id: `slot-${dayIndex}-${slotName}`,
    plan_id: 'plan-1',
    day_index: dayIndex,
    slot_name: slotName,
    slot_order: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'].indexOf(slotName),
    meal_id: `meal-${dayIndex}-${slotName}`,
    is_override: false,
    is_locked: true,
    generation_rationale: null,
    created_at: '2026-04-06T00:00:00Z',
    meals: {
      id: `meal-${dayIndex}-${slotName}`,
      household_id: 'hh-1',
      created_by: 'user-1',
      name: mealName,
      deleted_at: null,
      created_at: '2026-04-06T00:00:00Z',
      updated_at: '2026-04-06T00:00:00Z',
      meal_items: [],
    },
  }
}

describe('PlanGrid shimmer rendering during generation (Gap D)', () => {
  beforeEach(() => {
    mockSlots = []
    mockGenerationJobStatus = 'running'
  })

  it('day with ZERO locked slots shows exactly 4 shimmers', async () => {
    // No slots in mock — all 4 slot positions will be missing and should shimmer
    mockSlots = []
    await renderPlanGrid()

    // Mobile container for day 0
    const mobileDay0 = screen.queryByTestId('shimmer-day-0')
    expect(mobileDay0).not.toBeNull()
    const mobileShimmers = mobileDay0!.querySelectorAll('[aria-hidden="true"].animate-pulse')
    expect(mobileShimmers.length).toBe(4)

    // Desktop container for day 0
    const desktopDay0 = screen.queryByTestId('shimmer-day-0-desktop')
    expect(desktopDay0).not.toBeNull()
    const desktopShimmers = desktopDay0!.querySelectorAll('[aria-hidden="true"].animate-pulse')
    expect(desktopShimmers.length).toBe(4)
  })

  it('day with ONE locked slot shows 3 shimmers + 1 real slot (no duplicate content)', async () => {
    mockSlots = [makeLockedSlot(1, 'Dinner', 'Chicken Rice Bowl')]
    await renderPlanGrid()

    // Desktop day 1 container should have:
    //   - 3 SlotShimmer elements (Breakfast, Lunch, Snacks)
    //   - 1 real SlotCard referring to "Chicken Rice Bowl"
    //   - NO dayCards[i] substitution (would cause 6+ elements)
    const desktopDay1 = screen.queryByTestId('shimmer-day-1-desktop')
    expect(desktopDay1).not.toBeNull()

    const shimmers = desktopDay1!.querySelectorAll('[aria-hidden="true"].animate-pulse')
    expect(shimmers.length).toBe(3)

    // The locked meal name should appear exactly once inside this day container
    const dayText = desktopDay1!.textContent || ''
    const occurrences = dayText.split('Chicken Rice Bowl').length - 1
    expect(occurrences).toBe(1)
  })

  it('day with ALL 4 locked slots shows 0 shimmers + 4 real slots', async () => {
    mockSlots = [
      makeLockedSlot(2, 'Breakfast', 'Vegetable Omelette'),
      makeLockedSlot(2, 'Lunch', 'Greek Salad'),
      makeLockedSlot(2, 'Dinner', 'Pasta Primavera'),
      makeLockedSlot(2, 'Snacks', 'Tomato Soup'),
    ]
    await renderPlanGrid()

    const desktopDay2 = screen.queryByTestId('shimmer-day-2-desktop')
    expect(desktopDay2).not.toBeNull()

    const shimmers = desktopDay2!.querySelectorAll('[aria-hidden="true"].animate-pulse')
    expect(shimmers.length).toBe(0)

    // All 4 locked meal names should appear within this day's container
    const dayText = desktopDay2!.textContent || ''
    expect(dayText).toContain('Vegetable Omelette')
    expect(dayText).toContain('Greek Salad')
    expect(dayText).toContain('Pasta Primavera')
    expect(dayText).toContain('Tomato Soup')
  })
})
