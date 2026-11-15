import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import type { PlanGeneration } from '../types/database'
import type { RecipeMix } from '../components/plan/RecipeMixPanel'

export function useGeneratePlan() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useMutation({
    mutationFn: async (params: {
      planId: string
      weekStart: string
      priorityOrder: string[]
      recipeMix?: RecipeMix
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          householdId,
          planId: params.planId,
          weekStart: params.weekStart,
          priorityOrder: params.priorityOrder,
          recipeMix: params.recipeMix,
        },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Generation failed')
      return data as { success: true; jobId: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-generation', householdId] })
    },
  })
}

export function useGenerationJob(jobId: string | null) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: queryKeys.planGeneration.job(jobId, householdId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_generations')
        .select('*')
        .eq('id', jobId!)
        .single()
      if (error) throw error
      return data as PlanGeneration
    },
    enabled: !!jobId && !!householdId,
    refetchInterval: (query) => {
      const job = query.state.data
      const status = job?.status
      if (status === 'done' || status === 'partial' || status === 'timeout' || status === 'error') return false
      // Stop polling a job wedged in 'running' past the wall-clock budget +
      // margin — the edge function crashed without writing a terminal status.
      if (job?.created_at && Date.now() - new Date(job.created_at).getTime() > 5 * 60 * 1000) return false
      return 2000
    },
  })
}

export function useLatestGeneration(planId: string | undefined, poll = false) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: ['plan-generation', householdId, planId, 'latest'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_generations')
        .select('*')
        .eq('plan_id', planId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as PlanGeneration | null
    },
    enabled: !!planId && !!householdId,
    // The generate-plan request stays open for the whole run, so during
    // generation the fresh job row (and its live pass_count) is only
    // visible by polling this query.
    refetchInterval: poll ? 2000 : false,
  })
}

const DEFAULT_TYPICAL_SECONDS = 45

export function useTypicalGenerationSeconds(): number {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  const { data } = useQuery({
    queryKey: queryKeys.planGeneration.typical(householdId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_generations')
        .select('created_at, completed_at')
        .eq('household_id', householdId!)
        .in('status', ['done', 'partial'])
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      const durations = (data ?? [])
        .map(row => (new Date(row.completed_at as string).getTime() - new Date(row.created_at).getTime()) / 1000)
        .sort((a, b) => a - b)
      if (durations.length === 0) return DEFAULT_TYPICAL_SECONDS
      const mid = Math.floor(durations.length / 2)
      const median = durations.length % 2 === 1 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2
      return Math.round(median)
    },
    enabled: !!householdId,
  })

  return data ?? DEFAULT_TYPICAL_SECONDS
}

export function useSuggestAlternative() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      planId: string
      weekStart: string
      dayIndex: number
      slotName: string
      priorityOrder: string[]
      recipeMix?: RecipeMix
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          householdId,
          planId: params.planId,
          weekStart: params.weekStart,
          priorityOrder: params.priorityOrder,
          recipeMix: params.recipeMix,
          singleSlot: { dayIndex: params.dayIndex, slotName: params.slotName },
        },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Suggestion failed')
      return data
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlan.slots(params.planId) })
    },
  })
}
