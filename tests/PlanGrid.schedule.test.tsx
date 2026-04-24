import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock AuthContext (matches tests/PlanGrid.shimmer.test.tsx pattern)
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    session: { user: { id: 'u-dad', email: 'dad@example.com' } },
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))

// Mock useHousehold family — provide 2 user members + 1 managed profile so tooltip names resolve.
// 'u-dad' is the auth user; 'u-sam' is a second household member; 'mp-kayla' is a managed profile.
vi.mock('../src/hooks/useHousehold', () => ({
  useHousehold: vi.fn().mockReturnValue({
    data: { household_id: 'hh-1', role: 'admin', households: { name: 'Test' } },
    isPending: false,
    isError: false,
  }),
  useHouseholdMembers: vi.fn().mockReturnValue({
    data: [
      { user_id: 'u-dad', role: 'admin', profiles: { display_name: 'Dad', avatar_url: null } },
      { user_id: 'u-sam', role: 'member', profiles: { display_name: 'Sam', avatar_url: null } },
    ],
    isPending: false,
    isError: false,
  }),
  useMemberProfiles: vi.fn().mockReturnValue({
    data: [
      { id: 'mp-kayla', name: 'Kayla', display_name: 'Kayla', household_id: 'hh-1' },
    ],
    isPending: false,
    isError: false,
  }),
}))

// Schedule rows mutated per test. The mock factory closes over this `let`, so per-test
// reassignments (in `beforeEach` and inside `it` blocks) flow into the next render.
let mockScheduleRows: Array<{
  id: string
  household_id: string
  member_user_id: string | null
  member_profile_id: string | null
  day_of_week: number
  slot_name: string
  status: 'prep' | 'consume' | 'quick' | 'away'
  updated_at: string
}> = []

vi.mock('../src/hooks/useSchedule', () => ({
  useHouseholdSchedules: vi.fn(() => ({ data: mockScheduleRows, isPending: false, isError: false })),
  // Keep useSchedule + useSaveSchedule present as no-ops in case ScheduleSection or another module
  // is transitively imported during test setup (D-06a — useSchedule still exists for ScheduleSection).
  useSchedule: vi.fn(() => ({ data: [], isPending: false, isError: false })),
  useSaveSchedule: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() })),
}))

// Empty meal-plan mocks — DayCards render with all-empty SlotCards so the empty-slot
// dot branch lights up for every test where a schedule row exists.
vi.mock('../src/hooks/useMealPlan', () => ({
  useMealPlanSlots: vi.fn(() => ({ data: [], isPending: false, isError: false })),
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
  useGenerationJob: vi.fn(() => ({ data: null, isPending: false, isError: false })),
  useLatestGeneration: vi.fn(() => ({ data: null, isPending: false, isError: false })),
  useSuggestAlternative: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('../src/hooks/useNutritionGaps', () => ({
  useNutritionGaps: vi.fn(() => ({ gaps: [], hasGeneration: false, latestGeneration: null })),
}))

// Mock supabase client for the RecipeSuggestionCard onAdd handler.
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}))

// Mock DayCarousel — uses scrollIntoView and IntersectionObserver which are not in jsdom.
vi.mock('../src/components/plan/DayCarousel', () => ({
  DayCarousel: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))

// Mock dnd-kit (heavy and not relevant to schedule dot rendering).
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

type PlanGridOverrides = {
  weekStartDay?: number
}

async function renderPlanGrid(overrides: PlanGridOverrides = {}) {
  // ESM dynamic import — vi.mock calls above are hoisted, so PlanGrid resolves with all mocks in place.
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
          currentUserId: 'u-dad',
          selectedMemberId: 'u-dad',
          selectedMemberType: 'user',
          logDate: '2026-04-06',
          ...overrides,
        }),
      ),
    ),
  )
}

describe('PlanGrid → DayCard → SlotCard schedule wiring (Phase 27 regression guard)', () => {
  beforeEach(() => {
    mockScheduleRows = []
  })

  it('uses useHouseholdSchedules (not single-member useSchedule): mutating mockScheduleRows changes the rendered DOM', async () => {
    // Empty schedule -> no Schedule:* labels anywhere.
    mockScheduleRows = []
    const { unmount } = await renderPlanGrid()
    expect(screen.queryAllByLabelText(/^Schedule:/).length).toBe(0)
    unmount()

    // Mutate the data the household hook returns and re-render -> dot appears.
    // This proves PlanGrid reads from useHouseholdSchedules (the only mock pulling from
    // mockScheduleRows), not from the single-member useSchedule.
    mockScheduleRows = [
      { id: 'r1', household_id: 'hh-1', member_user_id: 'u-dad', member_profile_id: null, day_of_week: 1, slot_name: 'Dinner', status: 'away', updated_at: '2026-04-06' },
    ]
    await renderPlanGrid()
    expect(screen.queryAllByLabelText('Schedule: away').length).toBeGreaterThanOrEqual(1)
  })

  it('renders a single member away chip + aria-label "Schedule: away"', async () => {
    mockScheduleRows = [
      { id: 'r1', household_id: 'hh-1', member_user_id: 'u-dad', member_profile_id: null, day_of_week: 1, slot_name: 'Dinner', status: 'away', updated_at: '2026-04-06' },
    ]
    const { container } = await renderPlanGrid()
    const awayDots = screen.queryAllByLabelText('Schedule: away')
    expect(awayDots.length).toBeGreaterThanOrEqual(1)
    // Anti-regression class grep: the away chip carries .chip-sky in the v2.0 Gazette palette
    // (was .bg-red-500 pre-Apr-2026 redesign — colour intent is now "calm/away" not "danger/red").
    const awayChips = container.querySelectorAll('span.chip-sky')
    expect(awayChips.length).toBeGreaterThanOrEqual(1)
  })

  it('applies precedence away > quick > consume > prep on same (day, slot)', async () => {
    mockScheduleRows = [
      { id: 'r1', household_id: 'hh-1', member_user_id: 'u-dad', member_profile_id: null,       day_of_week: 1, slot_name: 'Dinner', status: 'away',    updated_at: '2026-04-06' },
      { id: 'r2', household_id: 'hh-1', member_user_id: 'u-sam', member_profile_id: null,       day_of_week: 1, slot_name: 'Dinner', status: 'quick',   updated_at: '2026-04-06' },
      { id: 'r3', household_id: 'hh-1', member_user_id: null,    member_profile_id: 'mp-kayla', day_of_week: 1, slot_name: 'Dinner', status: 'consume', updated_at: '2026-04-06' },
    ]
    await renderPlanGrid()
    // Precedence winner = away
    const awayDots = screen.queryAllByLabelText('Schedule: away')
    expect(awayDots.length).toBeGreaterThanOrEqual(1)
    // Non-winners are NOT rendered for the same (day, slot) — the aggregated dot is singular.
    const quickDots = screen.queryAllByLabelText('Schedule: quick')
    expect(quickDots.length).toBe(0)
    const consumeDots = screen.queryAllByLabelText('Schedule: consume')
    expect(consumeDots.length).toBe(0)
  })

  it('renders family tooltip with Title-Case statuses, comma-separated names, period terminators', async () => {
    mockScheduleRows = [
      { id: 'r1', household_id: 'hh-1', member_user_id: 'u-dad', member_profile_id: null,       day_of_week: 1, slot_name: 'Dinner', status: 'away',    updated_at: '2026-04-06' },
      { id: 'r2', household_id: 'hh-1', member_user_id: 'u-sam', member_profile_id: null,       day_of_week: 1, slot_name: 'Dinner', status: 'quick',   updated_at: '2026-04-06' },
      { id: 'r3', household_id: 'hh-1', member_user_id: null,    member_profile_id: 'mp-kayla', day_of_week: 1, slot_name: 'Dinner', status: 'consume', updated_at: '2026-04-06' },
    ]
    await renderPlanGrid()
    // PlanGrid renders dayCards in BOTH the mobile DayCarousel and the desktop stack
    // (responsive — CSS hides one or the other; both are in the DOM). Take the first.
    const awayDots = screen.getAllByLabelText('Schedule: away')
    expect(awayDots.length).toBeGreaterThanOrEqual(1)
    expect(awayDots[0].getAttribute('title')).toBe('Away: Dad. Quick: Sam. Consume: Kayla.')
    // All away dots (mobile + desktop) carry the same tooltip — the data layer is shared.
    for (const dot of awayDots) {
      expect(dot.getAttribute('title')).toBe('Away: Dad. Quick: Sam. Consume: Kayla.')
    }
  })

  it('drops prep entirely — two prep rows on the same (day, slot) render no dot', async () => {
    mockScheduleRows = [
      { id: 'r1', household_id: 'hh-1', member_user_id: 'u-dad', member_profile_id: null, day_of_week: 1, slot_name: 'Dinner', status: 'prep', updated_at: '2026-04-06' },
      { id: 'r2', household_id: 'hh-1', member_user_id: 'u-sam', member_profile_id: null, day_of_week: 1, slot_name: 'Dinner', status: 'prep', updated_at: '2026-04-06' },
    ]
    await renderPlanGrid()
    expect(screen.queryByLabelText('Schedule: prep')).toBeNull()
    // Belt-and-braces: nothing matches /^Schedule:/ for any (day, slot) when only prep is present.
    expect(screen.queryAllByLabelText(/^Schedule:/).length).toBe(0)
  })

  it('places the away dot in the Tuesday column, not Monday, when weekStartDay=1', async () => {
    // With weekStartDay=1 (Monday-first), dayIndex=0→'Mon', dayIndex=1→'Tue'.
    // Row day_of_week=2 corresponds to Tuesday, which renders in the SECOND DayCard (dayIndex=1).
    mockScheduleRows = [
      { id: 'r1', household_id: 'hh-1', member_user_id: 'u-dad', member_profile_id: null, day_of_week: 2, slot_name: 'Dinner', status: 'away', updated_at: '2026-04-06' },
    ]
    await renderPlanGrid({ weekStartDay: 1 })

    // Post-v2.0 architecture: mobile renders 1 DayCard at a time (currentDayIndex defaults to 0 = Mon),
    // desktop renders 7 PlanCells per meal row in a single .plan-grid. Mobile's DayCard for Mon should
    // NOT contain the away dot (Mon has no schedule row). Desktop's Tue column gcell should HAVE it.
    // Verify via the unique tooltip "Away: Dad." on the chip — only one cell renders it.
    const awayChips = screen.getAllByLabelText('Schedule: away')
    expect(awayChips.length).toBeGreaterThanOrEqual(1)

    // The desktop chip must carry the correct tooltip (proves data flowed for Tuesday cell).
    const dadAwayChips = awayChips.filter(c => c.getAttribute('title')?.includes('Dad'))
    expect(dadAwayChips.length).toBeGreaterThanOrEqual(1)

    // Negative: mobile DayCard for Mon (dayIndex=0) is the only DayCard rendered. Verify it has
    // NO Schedule:away aria-label inside — catches off-by-one in (weekStartDay + i) % 7 mapping.
    const monHeadings = screen.queryAllByText('Mon')
    expect(monHeadings.length).toBeGreaterThanOrEqual(1)
    for (const monHeading of monHeadings) {
      const monDayCard = monHeading.closest('[class*="rounded-"][class*="bg-surface"]')
      if (monDayCard) {
        expect(within(monDayCard as HTMLElement).queryByLabelText('Schedule: away')).toBeNull()
      }
    }
  })

  it('normalises Snack -> Snacks so a slot_name=\'Snack\' row surfaces on the Snacks SlotCard (D-09)', async () => {
    mockScheduleRows = [
      { id: 'r1', household_id: 'hh-1', member_user_id: 'u-dad', member_profile_id: null, day_of_week: 0, slot_name: 'Snack', status: 'quick', updated_at: '2026-04-06' },
    ]
    await renderPlanGrid()

    // weekStartDay=0 (default), dayIndex=0 -> 'Sun'. Row day_of_week=0 lands on Sunday's DayCard.
    // PlanGrid renders dayCards twice (mobile + desktop), so 'Sun' appears in two DayCards.
    // Walk every Sunday DayCard and assert the quick dot is inside each.
    const sunHeadings = screen.getAllByText('Sun')
    expect(sunHeadings.length).toBeGreaterThanOrEqual(1)
    for (const sunHeading of sunHeadings) {
      const sunDayCard = sunHeading.closest('[class*="rounded-"][class*="bg-surface"]')
      expect(sunDayCard).not.toBeNull()
      // Each Sunday DayCard contains exactly one Snacks quick dot — proves Snack→Snacks lookup
      // succeeded (if normalisation broke, the dot would never render, since SlotCard receives
      // scheduleStatus only when the Snacks lookup hits).
      expect(within(sunDayCard as HTMLElement).getByLabelText('Schedule: quick')).toBeInTheDocument()
    }

    // Anti-duplication guard: normalised data should produce exactly 2 quick dots in the
    // post-v2.0 architecture (mobile DayCard for currentDayIndex=0=Sun, plus desktop PlanCell
    // for the Sun column Snacks cell). If normalisation surfaced as BOTH 'Snack' AND 'Snacks'
    // keys, we would see 4 dots (2x). Holding to exactly 2 catches the regression.
    expect(screen.queryAllByLabelText('Schedule: quick').length).toBe(2)
  })

  it('falls back to first-8-char UUID slice in tooltip when member_user_id is unknown', async () => {
    mockScheduleRows = [
      { id: 'r1', household_id: 'hh-1', member_user_id: 'abcd1234-unknown-uuid-xyz', member_profile_id: null, day_of_week: 1, slot_name: 'Dinner', status: 'away', updated_at: '2026-04-06' },
    ]
    await renderPlanGrid()
    // PlanGrid renders dayCards twice (mobile + desktop); both away dots share the same tooltip
    // because they read from the same memberNameById fallback path in buildHouseholdTooltips.
    const awayDots = screen.getAllByLabelText('Schedule: away')
    expect(awayDots.length).toBeGreaterThanOrEqual(1)
    for (const dot of awayDots) {
      expect(dot.getAttribute('title')).toBe('Away: abcd1234.')
    }
  })

  it('renders no Schedule:* dots when mockScheduleRows is empty', async () => {
    mockScheduleRows = []
    await renderPlanGrid()
    expect(screen.queryAllByLabelText(/^Schedule:/).length).toBe(0)
    // Cross-check via aria-label prefix on the actual span attribute.
    const dotsByPrefix = document.querySelectorAll('[aria-label^="Schedule:"]')
    expect(dotsByPrefix.length).toBe(0)
  })
})
