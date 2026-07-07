import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import {
  listRecentWeekStarts,
  aggregateMemberWeekKcal,
  aggregateSpendByWeek,
  type MemberWeekKcal,
  type WeekSpend,
} from '../utils/trends'

export const TREND_WEEKS = 8

export interface WeeklyTrendsData {
  weeks: string[]
  kcalCells: MemberWeekKcal[]
  spendByWeek: Record<string, WeekSpend>
}

/**
 * Fetches the last TREND_WEEKS weeks of food logs and spend logs and
 * aggregates them into per-member calorie trends and per-week purse totals.
 */
export function useWeeklyTrends(
  householdId: string | undefined,
  weekStartDay: number
) {
  const weeks = listRecentWeekStarts(new Date(), weekStartDay, TREND_WEEKS)
  const currentWeekStart = weeks[weeks.length - 1]

  return useQuery({
    queryKey: queryKeys.insights.trends(householdId, currentWeekStart),
    queryFn: async (): Promise<WeeklyTrendsData> => {
      const firstWeekStart = weeks[0]
      const end = new Date(currentWeekStart + 'T00:00:00Z')
      end.setUTCDate(end.getUTCDate() + 7)
      const endExclusive = end.toISOString().slice(0, 10)

      const { data: logs, error: logErr } = await supabase
        .from('food_logs')
        .select('member_user_id, member_profile_id, log_date, servings_logged, calories_per_serving, cost')
        .eq('household_id', householdId!)
        .gte('log_date', firstWeekStart)
        .lt('log_date', endExclusive)
      if (logErr) throw logErr

      const { data: spendRows, error: spendErr } = await supabase
        .from('spend_logs')
        .select('week_start, amount, source')
        .eq('household_id', householdId!)
        .gte('week_start', firstWeekStart)
      if (spendErr) throw spendErr

      const logRows = logs ?? []
      return {
        weeks,
        kcalCells: aggregateMemberWeekKcal(logRows, weekStartDay),
        spendByWeek: Object.fromEntries(
          aggregateSpendByWeek(
            spendRows ?? [],
            logRows.map(l => ({ log_date: l.log_date, cost: l.cost })),
            weekStartDay
          )
        ),
      }
    },
    enabled: !!householdId,
  })
}
