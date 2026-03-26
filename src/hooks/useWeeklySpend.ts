import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'

export function useWeeklySpend(
  householdId: string | undefined,
  weekStart: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.weeklySpend.root(householdId, weekStart!),
    queryFn: async (): Promise<{
      totalSpend: number
      cookSpend: number
      foodLogSpend: number
    }> => {
      const { data: cookData, error: cookErr } = await supabase
        .from('spend_logs')
        .select('amount')
        .eq('household_id', householdId!)
        .eq('week_start', weekStart!)
      if (cookErr) throw cookErr

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

      const cookSpend = (cookData ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
      const foodLogSpend = (logData ?? []).reduce(
        (sum, r) => sum + ((r as { cost: number | null }).cost ?? 0),
        0
      )

      return { totalSpend: cookSpend + foodLogSpend, cookSpend, foodLogSpend }
    },
    enabled: !!householdId && !!weekStart,
  })
}
