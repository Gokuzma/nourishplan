import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import { summariseWeeklySpend } from '../utils/cost'

export function useWeeklySpend(
  householdId: string | undefined,
  weekStart: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.weeklySpend.root(householdId, weekStart!),
    queryFn: async (): Promise<{
      totalSpend: number
      cookSpend: number
      grocerySpend: number
      foodLogSpend: number
    }> => {
      const { data: spendData, error: spendErr } = await supabase
        .from('spend_logs')
        .select('amount, source')
        .eq('household_id', householdId!)
        .eq('week_start', weekStart!)
      if (spendErr) throw spendErr

      const weekStartDate = new Date(weekStart! + 'T00:00:00Z')
      const nextWeek = new Date(weekStartDate)
      nextWeek.setUTCDate(nextWeek.getUTCDate() + 7)
      const nextWeekStart = nextWeek.toISOString().slice(0, 10)

      const { data: logData, error: logErr } = await supabase
        .from('food_logs')
        .select('cost')
        .eq('household_id', householdId!)
        .gte('log_date', weekStart!)
        .lt('log_date', nextWeekStart)
        .not('cost', 'is', null)
      if (logErr) throw logErr

      return summariseWeeklySpend(
        spendData ?? [],
        (logData ?? []).map(r => (r as { cost: number | null }).cost)
      )
    },
    enabled: !!householdId && !!weekStart,
  })
}
