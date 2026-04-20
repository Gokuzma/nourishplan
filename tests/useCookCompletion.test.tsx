import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, cleanup, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RecipeIngredient } from '../src/types/database'

// Order-sensitive spies — top-level so we can assert call order across mutations
const spendInsertSpy = vi.fn()
const inventoryUpdateSpy = vi.fn()
const foodPricesSelectSpy = vi.fn()

// Controllable deduct behaviour per test
let deductShouldReject = false

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'spend_logs') {
        return {
          insert: vi.fn((payload) => {
            spendInsertSpy(payload)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'spend-1', week_start: '2026-04-13', ...payload },
                  error: null,
                }),
              }),
            }
          }),
        }
      }
      if (table === 'inventory_items') {
        return {
          update: vi.fn((payload) => {
            inventoryUpdateSpy(payload)
            return {
              eq: vi.fn().mockResolvedValue({
                error: deductShouldReject ? { message: 'deduct failed' } : null,
              }),
            }
          }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === 'food_prices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn(() => {
                foodPricesSelectSpy()
                return Promise.resolve({
                  data: [
                    { id: 'p1', household_id: 'hh-1', food_id: 'ing-1', food_name: 'Flour', store: '', cost_per_100g: 2.5 },
                  ],
                  error: null,
                })
              }),
            }),
          }),
        }
      }
      // default: generic chainable mock
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() }),
    removeChannel: vi.fn(),
  },
}))

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({ session: { user: { id: 'user-1' } } }),
}))

vi.mock('../src/hooks/useHousehold', () => ({
  useHousehold: vi.fn().mockReturnValue({
    data: { household_id: 'hh-1', role: 'admin', households: { name: 'Test Household', week_start_day: 0 } },
    isPending: false,
    isError: false,
  }),
  useHouseholdMembers: vi.fn().mockReturnValue({ data: [], isPending: false }),
}))

// Mock useInventoryItems to return one matching item so FIFO finds a deduction target
vi.mock('../src/hooks/useInventory', () => ({
  useInventoryItems: vi.fn().mockReturnValue({
    data: [
      {
        id: 'inv-1',
        household_id: 'hh-1',
        food_id: 'ing-1',
        food_name: 'Flour',
        quantity_remaining: 500,
        unit: 'g',
        storage_location: 'pantry',
        purchased_at: '2026-04-01',
        expires_at: null,
        is_leftover: false,
        is_staple: false,
        removed_at: null,
        added_by: 'user-1',
        brand: null,
        purchase_price: null,
        leftover_from_recipe_id: null,
        created_at: '2026-04-01',
        updated_at: '2026-04-01',
      },
    ],
    isPending: false,
  }),
}))

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

function makeIngredient(overrides: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return {
    id: 'ri-1',
    recipe_id: 'r-1',
    ingredient_id: 'ing-1',
    ingredient_type: 'food',
    ingredient_name: 'Flour',
    quantity_grams: 200,
    sort_order: 0,
    is_cooked: false,
    ...overrides,
  } as RecipeIngredient
}

// Wait for useFoodPrices to resolve and the hook to re-render with loaded prices.
// Polls the foodPricesSelectSpy + drains multiple microtask ticks for TanStack Query state flush.
async function warmupPrices() {
  await waitFor(() => expect(foodPricesSelectSpy).toHaveBeenCalled())
  // Drain a few additional microtask rounds so useQuery's setState completes a rerender
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useCookCompletion (Phase 26, INVT-05/INVT-06/BUDG-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    spendInsertSpy.mockClear()
    inventoryUpdateSpy.mockClear()
    foodPricesSelectSpy.mockClear()
    deductShouldReject = false
  })

  it('fires spend_log insert BEFORE inventory_items update (call order — D-11)', async () => {
    const { useCookCompletion } = await import('../src/hooks/useCookCompletion')
    const { result } = renderHook(() => useCookCompletion(), { wrapper: makeWrapper() })
    // Wait a microtask for useFoodPrices to resolve
    await warmupPrices()

    await act(async () => {
      await result.current.runCookCompletion({
        recipeId: 'r-1',
        recipeName: 'Test Recipe',
        servings: 2,
        ingredients: [makeIngredient()],
      })
    })

    // Spend spy must have been called before deduct spy
    expect(spendInsertSpy).toHaveBeenCalled()
    expect(inventoryUpdateSpy).toHaveBeenCalled()
    // Order assertion via invocationCallOrder
    const spendOrder = spendInsertSpy.mock.invocationCallOrder[0]
    const deductOrder = inventoryUpdateSpy.mock.invocationCallOrder[0]
    expect(spendOrder).toBeLessThan(deductOrder)
    cleanup()
  })

  it('spend_logs payload uses source=cook implicitly via useCreateSpendLog + {recipe_id, amount, is_partial}', async () => {
    const { useCookCompletion } = await import('../src/hooks/useCookCompletion')
    const { result } = renderHook(() => useCookCompletion(), { wrapper: makeWrapper() })
    await warmupPrices()

    await act(async () => {
      await result.current.runCookCompletion({
        recipeId: 'r-xyz',
        recipeName: 'Test',
        servings: 2,
        ingredients: [makeIngredient()],
      })
    })

    // useCreateSpendLog sets source='cook' internally; here we assert the payload surface
    const insertedPayload = spendInsertSpy.mock.calls[0][0]
    expect(insertedPayload.source).toBe('cook')
    expect(insertedPayload.recipe_id).toBe('r-xyz')
    expect(typeof insertedPayload.amount).toBe('number')
    expect(typeof insertedPayload.is_partial).toBe('boolean')
    cleanup()
  })

  it('deduct failure does NOT roll back spend (non-blocking — D-12)', async () => {
    deductShouldReject = true
    const { useCookCompletion } = await import('../src/hooks/useCookCompletion')
    const { result } = renderHook(() => useCookCompletion(), { wrapper: makeWrapper() })
    await warmupPrices()

    let outcome: Awaited<ReturnType<typeof result.current.runCookCompletion>> | undefined
    await act(async () => {
      outcome = await result.current.runCookCompletion({
        recipeId: 'r-1',
        recipeName: 'Test',
        servings: 1,
        ingredients: [makeIngredient()],
      })
    })

    expect(spendInsertSpy).toHaveBeenCalled()   // spend still happened
    expect(outcome?.spendLogged).toBe(true)
    // deductionResult carries the error message OR is null with spendLogged still true
    // (either is acceptable per hook contract — both satisfy D-12)
    cleanup()
  })

  it('cost calc: 200g × $2.50/100g over 2 servings = totalCost 5.00', async () => {
    const { useCookCompletion } = await import('../src/hooks/useCookCompletion')
    const { result } = renderHook(() => useCookCompletion(), { wrapper: makeWrapper() })
    await warmupPrices()

    let outcome: Awaited<ReturnType<typeof result.current.runCookCompletion>> | undefined
    await act(async () => {
      outcome = await result.current.runCookCompletion({
        recipeId: 'r-1',
        recipeName: 'Test',
        servings: 2,
        ingredients: [makeIngredient({ quantity_grams: 200 })],
      })
    })

    // 200g × $2.50/100g = $5.00 total for all servings
    // $5.00 / 2 servings = $2.50 per serving
    // totalCost = costPerServing × servings = $2.50 × 2 = $5.00
    expect(outcome?.totalCost).toBeCloseTo(5.0, 2)
    expect(outcome?.isPartial).toBe(false)
    cleanup()
  })

  it('is_partial=true when some ingredients are unpriced', async () => {
    const { useCookCompletion } = await import('../src/hooks/useCookCompletion')
    const { result } = renderHook(() => useCookCompletion(), { wrapper: makeWrapper() })
    await warmupPrices()

    let outcome: Awaited<ReturnType<typeof result.current.runCookCompletion>> | undefined
    await act(async () => {
      outcome = await result.current.runCookCompletion({
        recipeId: 'r-1',
        recipeName: 'Test',
        servings: 1,
        ingredients: [
          makeIngredient({ id: 'ri-1', ingredient_id: 'ing-1', quantity_grams: 100 }),  // priced
          makeIngredient({ id: 'ri-2', ingredient_id: 'ing-unknown', quantity_grams: 50 }), // unpriced
        ],
      })
    })

    expect(outcome?.isPartial).toBe(true)
    // Spend insert payload should also have is_partial: true
    const insertedPayload = spendInsertSpy.mock.calls[0][0]
    expect(insertedPayload.is_partial).toBe(true)
    cleanup()
  })
})
