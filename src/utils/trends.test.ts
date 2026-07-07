import { describe, it, expect } from 'vitest'
import {
  listRecentWeekStarts,
  aggregateMemberWeekKcal,
  aggregateSpendByWeek,
  memberKeyForLog,
} from './trends'

describe('listRecentWeekStarts', () => {
  it('returns the requested number of week starts, oldest first, ending at the current week', () => {
    // 2026-07-06 is a Monday; weekStartDay 0 (Sunday) → current week starts 2026-07-05
    const weeks = listRecentWeekStarts(new Date('2026-07-06T12:00:00Z'), 0, 4)
    expect(weeks).toEqual(['2026-06-14', '2026-06-21', '2026-06-28', '2026-07-05'])
  })

  it('respects a Monday week start', () => {
    const weeks = listRecentWeekStarts(new Date('2026-07-06T12:00:00Z'), 1, 2)
    expect(weeks).toEqual(['2026-06-29', '2026-07-06'])
  })
})

describe('memberKeyForLog', () => {
  it('prefers the user id when both are somehow present', () => {
    expect(memberKeyForLog({ member_user_id: 'u1', member_profile_id: 'p1' })).toBe('user:u1')
  })

  it('uses the profile id for managed profiles', () => {
    expect(memberKeyForLog({ member_user_id: null, member_profile_id: 'p1' })).toBe('profile:p1')
  })

  it('returns null when the log targets nobody', () => {
    expect(memberKeyForLog({ member_user_id: null, member_profile_id: null })).toBeNull()
  })
})

describe('aggregateMemberWeekKcal', () => {
  const logs = [
    // Alice (user u1), week of 2026-07-05: two days
    { member_user_id: 'u1', member_profile_id: null, log_date: '2026-07-05', servings_logged: 1, calories_per_serving: 600 },
    { member_user_id: 'u1', member_profile_id: null, log_date: '2026-07-05', servings_logged: 2, calories_per_serving: 300 },
    { member_user_id: 'u1', member_profile_id: null, log_date: '2026-07-06', servings_logged: 1, calories_per_serving: 800 },
    // Ben (profile p1), same week: one day
    { member_user_id: null, member_profile_id: 'p1', log_date: '2026-07-06', servings_logged: 1, calories_per_serving: 500 },
    // Alice, previous week
    { member_user_id: 'u1', member_profile_id: null, log_date: '2026-07-01', servings_logged: 1, calories_per_serving: 1000 },
    // Unassigned log — ignored
    { member_user_id: null, member_profile_id: null, log_date: '2026-07-05', servings_logged: 1, calories_per_serving: 999 },
  ]

  it('sums servings × calories per member per week and counts distinct logged days', () => {
    const cells = aggregateMemberWeekKcal(logs, 0)
    const alice = cells.find(c => c.memberKey === 'user:u1' && c.weekStart === '2026-07-05')
    expect(alice).toBeDefined()
    expect(alice!.totalKcal).toBe(600 + 600 + 800)
    expect(alice!.daysLogged).toBe(2)
    expect(alice!.avgDailyKcal).toBe(1000)
  })

  it('buckets logs into weeks by the household week start day', () => {
    const cells = aggregateMemberWeekKcal(logs, 0)
    const alicePrev = cells.find(c => c.memberKey === 'user:u1' && c.weekStart === '2026-06-28')
    expect(alicePrev).toBeDefined()
    expect(alicePrev!.totalKcal).toBe(1000)
  })

  it('keeps members separate', () => {
    const cells = aggregateMemberWeekKcal(logs, 0)
    const ben = cells.find(c => c.memberKey === 'profile:p1' && c.weekStart === '2026-07-05')
    expect(ben!.totalKcal).toBe(500)
    expect(ben!.daysLogged).toBe(1)
  })

  it('skips logs that target no member', () => {
    const cells = aggregateMemberWeekKcal(logs, 0)
    expect(cells.every(c => c.memberKey !== null)).toBe(true)
    const week = cells.filter(c => c.weekStart === '2026-07-05')
    expect(week.reduce((s, c) => s + c.totalKcal, 0)).toBe(2000 + 500)
  })
})

describe('aggregateSpendByWeek', () => {
  it('summarises each week with the same receipts-first rule as the purse', () => {
    const spendRows = [
      { week_start: '2026-07-05', amount: 120, source: 'grocery' },
      { week_start: '2026-07-05', amount: 40, source: 'cook' },
      { week_start: '2026-06-28', amount: 55, source: 'cook' },
    ]
    const foodLogCosts = [
      { log_date: '2026-07-06', cost: 12.5 },
      { log_date: '2026-06-30', cost: null },
    ]
    const byWeek = aggregateSpendByWeek(spendRows, foodLogCosts, 0)

    // Week with grocery spend: grocery + takeout, cook informational
    const current = byWeek.get('2026-07-05')!
    expect(current.totalSpend).toBeCloseTo(132.5)
    expect(current.grocerySpend).toBe(120)
    expect(current.cookSpend).toBe(40)

    // Week without grocery spend: falls back to cook + takeout
    const prev = byWeek.get('2026-06-28')!
    expect(prev.totalSpend).toBe(55)
  })

  it('returns an empty map for no data', () => {
    expect(aggregateSpendByWeek([], [], 0).size).toBe(0)
  })
})
