import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'

export interface BatchPrepStorageHint {
  recipe_id: string
  storage: 'fridge' | 'freezer'
  shelf_life_days: number | null
}

export interface BatchPrepSession {
  session_id: string
  label: string
  day_index: number
  slot_name: string
  recipe_ids: string[]
  total_prep_minutes: number
  shared_ingredients_callout: string | null
  equipment_callout: string | null
  storage_hints: BatchPrepStorageHint[]
}

export interface BatchPrepReassignment {
  slot_id: string
  new_day_index: number
  new_slot_name: string
  reason: string
}

export interface BatchPrepSummary {
  success: boolean
  sessions: BatchPrepSession[]
  reassignments: BatchPrepReassignment[]
  total_time_minutes: number
  error?: string
}

const DEBOUNCE_MS = 30_000

interface UseBatchPrepSummaryParams {
  planId: string | undefined
  isModalOpen: boolean
  weekStart: string
}

export function useBatchPrepSummary({ planId, isModalOpen, weekStart }: UseBatchPrepSummaryParams) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  const [isStale, setIsStale] = useState(false)
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(0)
  const debounceTimerRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<number | null>(null)

  const query = useQuery<BatchPrepSummary>({
    queryKey: queryKeys.batchPrep.summary(householdId, planId),
    queryFn: async () => {
      if (!householdId || !planId || !session) {
        return { success: false, sessions: [], reassignments: [], total_time_minutes: 0, error: 'Not ready' }
      }
      const { data, error } = await supabase.functions.invoke('compute-batch-prep', {
        body: { planId, householdId, weekStart },
      })
      if (error) throw error
      return data as BatchPrepSummary
    },
    enabled: !!householdId && !!planId && isModalOpen,
    staleTime: Infinity,
  })

  const refresh = useCallback(() => {
    setIsStale(false)
    setSecondsUntilRefresh(0)
    queryClient.invalidateQueries({ queryKey: queryKeys.batchPrep.summary(householdId, planId) })
  }, [queryClient, householdId, planId])

  // D-17 + D-28: 30s debounce reset on every meal-plan-slots cache update
  useEffect(() => {
    if (!isModalOpen || !planId) return

    const clearTimers = () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      if (countdownTimerRef.current !== null) {
        window.clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }

    const startDebounce = () => {
      clearTimers()
      setIsStale(true)
      setSecondsUntilRefresh(Math.floor(DEBOUNCE_MS / 1000))

      countdownTimerRef.current = window.setInterval(() => {
        setSecondsUntilRefresh(prev => Math.max(0, prev - 1))
      }, 1000)

      debounceTimerRef.current = window.setTimeout(() => {
        refresh()
        clearTimers()
      }, DEBOUNCE_MS)
    }

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        Array.isArray(event.query.queryKey) &&
        event.query.queryKey[0] === 'meal-plan-slots' &&
        event.query.queryKey[1] === planId
      ) {
        startDebounce()
      }
    })

    return () => {
      unsubscribe()
      clearTimers()
    }
  }, [isModalOpen, planId, queryClient, refresh])

  const reassignmentsApplied = useMemo<BatchPrepReassignment[]>(() => {
    return query.data?.reassignments ?? []
  }, [query.data])

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isStale,
    secondsUntilRefresh,
    refresh,
    reassignmentsApplied,
  }
}
