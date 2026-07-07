import { getWeekStart } from './mealPlan'
import { summariseWeeklySpend } from './cost'

export interface MemberWeekKcal {
  memberKey: string
  weekStart: string
  totalKcal: number
  daysLogged: number
  avgDailyKcal: number
}

export interface WeekSpend {
  totalSpend: number
  cookSpend: number
  grocerySpend: number
  foodLogSpend: number
}

/**
 * Returns the last `count` week-start dates (oldest first), ending at the
 * week containing `today`. Same UTC arithmetic as getWeekStart.
 */
export function listRecentWeekStarts(today: Date, weekStartDay: number, count: number): string[] {
  const current = getWeekStart(today, weekStartDay)
  const weeks: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(current + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - i * 7)
    weeks.push(d.toISOString().slice(0, 10))
  }
  return weeks
}

/**
 * Stable identity for the member a food log targets.
 * Auth users and managed profiles live in different columns; null means
 * the log targets nobody and is excluded from per-member trends.
 */
export function memberKeyForLog(log: {
  member_user_id: string | null
  member_profile_id: string | null
}): string | null {
  if (log.member_user_id) return `user:${log.member_user_id}`
  if (log.member_profile_id) return `profile:${log.member_profile_id}`
  return null
}

/**
 * Aggregates food logs into per-member, per-week calorie totals.
 * avgDailyKcal divides by days the member actually logged, so sparse
 * logging reads as a daily average rather than a weekly shortfall.
 */
export function aggregateMemberWeekKcal(
  logs: {
    member_user_id: string | null
    member_profile_id: string | null
    log_date: string
    servings_logged: number
    calories_per_serving: number
  }[],
  weekStartDay: number
): MemberWeekKcal[] {
  const cells = new Map<string, { memberKey: string; weekStart: string; totalKcal: number; days: Set<string> }>()

  for (const log of logs) {
    const memberKey = memberKeyForLog(log)
    if (!memberKey) continue
    const weekStart = getWeekStart(new Date(log.log_date + 'T00:00:00Z'), weekStartDay)
    const cellKey = `${memberKey}|${weekStart}`
    let cell = cells.get(cellKey)
    if (!cell) {
      cell = { memberKey, weekStart, totalKcal: 0, days: new Set() }
      cells.set(cellKey, cell)
    }
    cell.totalKcal += log.servings_logged * log.calories_per_serving
    cell.days.add(log.log_date)
  }

  return [...cells.values()].map(c => ({
    memberKey: c.memberKey,
    weekStart: c.weekStart,
    totalKcal: c.totalKcal,
    daysLogged: c.days.size,
    avgDailyKcal: c.days.size > 0 ? c.totalKcal / c.days.size : 0,
  }))
}

/**
 * Groups spend rows and food-log costs by week and summarises each week
 * with the same receipts-first rule the purse uses (summariseWeeklySpend).
 */
export function aggregateSpendByWeek(
  spendRows: { week_start: string; amount: number | null; source: string }[],
  foodLogCosts: { log_date: string; cost: number | null }[],
  weekStartDay: number
): Map<string, WeekSpend> {
  const spendByWeek = new Map<string, { amount: number | null; source: string }[]>()
  for (const row of spendRows) {
    const rows = spendByWeek.get(row.week_start) ?? []
    rows.push(row)
    spendByWeek.set(row.week_start, rows)
  }

  const costsByWeek = new Map<string, (number | null)[]>()
  for (const log of foodLogCosts) {
    const weekStart = getWeekStart(new Date(log.log_date + 'T00:00:00Z'), weekStartDay)
    const costs = costsByWeek.get(weekStart) ?? []
    costs.push(log.cost)
    costsByWeek.set(weekStart, costs)
  }

  const result = new Map<string, WeekSpend>()
  const allWeeks = new Set([...spendByWeek.keys(), ...costsByWeek.keys()])
  for (const weekStart of allWeeks) {
    result.set(weekStart, summariseWeeklySpend(
      spendByWeek.get(weekStart) ?? [],
      costsByWeek.get(weekStart) ?? []
    ))
  }
  return result
}
