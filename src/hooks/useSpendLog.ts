import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import { getWeekStart } from '../utils/mealPlan'

export function useCreateSpendLog() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (params: {
      recipe_id?: string
      amount: number
      is_partial: boolean
      log_date?: string
    }) => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')
      const logDate = params.log_date ?? new Date().toISOString().slice(0, 10)
      const weekStart = getWeekStart(
        new Date(logDate + 'T00:00:00Z'),
        membership?.households?.week_start_day ?? 0
      )
      const { data, error } = await supabase
        .from('spend_logs')
        .insert({
          household_id: householdId,
          logged_by: userId,
          log_date: logDate,
          week_start: weekStart,
          source: 'cook' as const,
          recipe_id: params.recipe_id ?? null,
          amount: params.amount,
          is_partial: params.is_partial,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      const householdId = membership?.household_id
      if (householdId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.weeklySpend.root(householdId, data.week_start),
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.spendLogs.byWeek(householdId, data.week_start),
        })
      }
    },
  })
}
