import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import type { CookSession, CookSessionStepState, RecipeStep } from '../types/database'

// ============================================================
// useCookSession — fetch + realtime subscribe for a single row
// ============================================================
export function useCookSession(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  const query = useQuery({
    queryKey: queryKeys.cookSession.detail(sessionId),
    queryFn: async (): Promise<CookSession | null> => {
      const { data, error } = await supabase
        .from('cook_sessions')
        .select('*')
        .eq('id', sessionId!)
        .maybeSingle()
      if (error) throw error
      return data as CookSession | null
    },
    enabled: !!sessionId && !!householdId,
  })

  // Realtime subscription — reuses the useGroceryItems pattern VERBATIM (D-24)
  useEffect(() => {
    if (!sessionId) return
    const channel = supabase.channel(`cook-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cook_sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.detail(sessionId) })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, queryClient])

  return query
}

// ============================================================
// useActiveCookSessions — list for MultiMealSwitcher (D-26)
// ============================================================
export function useActiveCookSessions() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useQuery({
    queryKey: queryKeys.cookSession.active(householdId),
    queryFn: async (): Promise<CookSession[]> => {
      const { data, error } = await supabase
        .from('cook_sessions')
        .select('*')
        .eq('household_id', householdId!)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as CookSession[]
    },
    enabled: !!householdId,
  })
}

// ============================================================
// useLatestCookSessionForMeal — resume support (D-22)
// ============================================================
export function useLatestCookSessionForMeal(mealId: string | undefined) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useQuery({
    queryKey: queryKeys.cookSession.latestForMeal(householdId, mealId),
    queryFn: async (): Promise<CookSession | null> => {
      const { data, error } = await supabase
        .from('cook_sessions')
        .select('*')
        .eq('household_id', householdId!)
        .eq('meal_id', mealId!)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as CookSession | null
    },
    enabled: !!householdId && !!mealId,
  })
}

// ============================================================
// useCreateCookSession — upsert new row with stable step ids (R-02)
// ============================================================
interface CreateCookSessionParams {
  meal_id?: string | null
  recipe_id?: string | null
  recipe_ids: string[]
  stepsByRecipeId: Record<string, RecipeStep[]>  // source instructions (live-bound via recipe id on R-02 reads)
  mode: 'combined' | 'per-recipe' | null
  initialOwnerMemberId?: string | null
  batch_prep_session_key?: string | null
}

export function useCreateCookSession() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useMutation({
    mutationFn: async (params: CreateCookSessionParams): Promise<CookSession> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')

      // R-02: stable ids, not indexes. step_state references step.id values that live on
      // recipes.instructions. If the recipe is edited later, unknown ids get silently
      // dropped and new ones appear unchecked per the decision.
      const steps: Record<string, CookSessionStepState> = {}
      const order: string[] = []
      for (const recipeId of params.recipe_ids) {
        const recipeSteps = params.stepsByRecipeId[recipeId] ?? []
        for (const step of recipeSteps) {
          steps[step.id] = {
            completed_at: null,
            completed_by: null,
            timer_started_at: null,
            owner_member_id: params.initialOwnerMemberId ?? null,
            recipe_id: recipeId,
          }
          order.push(step.id)
        }
      }

      const { data, error } = await supabase
        .from('cook_sessions')
        .insert({
          household_id: householdId,
          started_by: session.user.id,
          meal_id: params.meal_id ?? null,
          recipe_id: params.recipe_id ?? null,
          recipe_ids: params.recipe_ids,
          batch_prep_session_key: params.batch_prep_session_key ?? null,
          step_state: { steps, order },
          status: 'in_progress',
          mode: params.mode,
        })
        .select()
        .single()

      if (error) throw error
      return data as CookSession
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.active(householdId) })
      if (data.meal_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.latestForMeal(householdId, data.meal_id) })
      }
    },
  })
}

// ============================================================
// useUpdateCookStep — partial merge with optimistic update + rollback
// ============================================================
interface UpdateCookStepParams {
  sessionId: string
  stepId: string
  patch: Partial<CookSessionStepState>
}

export function useUpdateCookStep() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: UpdateCookStepParams): Promise<void> => {
      // Fetch current state to do a client-side merge. Since Supabase JS does not
      // expose jsonb_set, we read-modify-write the full step_state. Realtime
      // subscription broadcasts the result to all collaborators (D-24).
      const { data: current, error: readErr } = await supabase
        .from('cook_sessions')
        .select('step_state')
        .eq('id', params.sessionId)
        .single()
      if (readErr) throw readErr
      const currentState = current.step_state as CookSession['step_state']
      const existing = currentState.steps[params.stepId] ?? ({
        completed_at: null,
        completed_by: null,
        timer_started_at: null,
        owner_member_id: null,
        recipe_id: '',
      } as CookSessionStepState)
      const merged: CookSession['step_state'] = {
        order: currentState.order,
        steps: {
          ...currentState.steps,
          [params.stepId]: { ...existing, ...params.patch },
        },
      }
      const { error } = await supabase
        .from('cook_sessions')
        .update({ step_state: merged, updated_at: new Date().toISOString() })
        .eq('id', params.sessionId)
      if (error) throw error
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cookSession.detail(params.sessionId) })
      const previous = queryClient.getQueryData<CookSession>(queryKeys.cookSession.detail(params.sessionId))
      if (previous) {
        const existing = previous.step_state.steps[params.stepId] ?? ({
          completed_at: null,
          completed_by: null,
          timer_started_at: null,
          owner_member_id: null,
          recipe_id: '',
        } as CookSessionStepState)
        const optimistic: CookSession = {
          ...previous,
          step_state: {
            order: previous.step_state.order,
            steps: {
              ...previous.step_state.steps,
              [params.stepId]: { ...existing, ...params.patch },
            },
          },
        }
        queryClient.setQueryData(queryKeys.cookSession.detail(params.sessionId), optimistic)
      }
      return { previous }
    },
    onError: (_err, params, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.cookSession.detail(params.sessionId), context.previous)
      }
    },
    // Realtime handles invalidation on server confirm; also invalidate as backup
    onSettled: (_data, _err, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.detail(params.sessionId) })
    },
  })
}

// ============================================================
// useCompleteCookSession — marks session completed
// ============================================================
export function useCompleteCookSession() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('cook_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('started_by', session!.user.id)
      if (error) throw error
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.detail(sessionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.cookSession.active(householdId) })
    },
  })
}
