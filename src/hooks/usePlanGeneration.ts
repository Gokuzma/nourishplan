import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import type { PlanGeneration } from '../types/database'

export function useGeneratePlan() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useMutation({
    mutationFn: async (params: { planId: string; weekStart: string; priorityOrder: string[] }) => {
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          householdId,
          planId: params.planId,
          weekStart: params.weekStart,
          priorityOrder: params.priorityOrder,
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
  const queryClient = useQueryClient()

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
      const status = query.state.data?.status
      if (status === 'done' || status === 'partial' || status === 'timeout' || status === 'error') return false
      return 2000
    },
  })
}

export function useLatestGeneration(planId: string | undefined) {
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
  })
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
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: {
          householdId,
          planId: params.planId,
          weekStart: params.weekStart,
          priorityOrder: params.priorityOrder,
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
