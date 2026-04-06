import { describe, it, expect } from 'vitest'
import {
  buildGrid,
  cycleStatus,
  getOrderedDays,
} from '../src/utils/schedule'
import type { MemberScheduleSlot } from '../src/types/database'

describe('buildGrid', () => {
  it('returns Map with key "0:Breakfast" = "prep" from one row', () => {
    const rows: MemberScheduleSlot[] = [
      {
        id: '1',
        household_id: 'hh1',
        member_user_id: 'u1',
        member_profile_id: null,
        day_of_week: 0,
        slot_name: 'Breakfast',
        status: 'prep',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]
    const grid = buildGrid(rows)
    expect(grid.get('0:Breakfast')).toBe('prep')
  })

  it('returns empty Map when given no rows', () => {
    const grid = buildGrid([])
    expect(grid.size).toBe(0)
    expect(grid.get('0:Breakfast') ?? 'prep').toBe('prep')
  })

  it('handles multiple rows across different days and slots', () => {
    const rows: MemberScheduleSlot[] = [
      {
        id: '2',
        household_id: 'hh1',
        member_user_id: 'u1',
        member_profile_id: null,
        day_of_week: 3,
        slot_name: 'Dinner',
        status: 'away',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '3',
        household_id: 'hh1',
        member_user_id: 'u1',
        member_profile_id: null,
        day_of_week: 5,
        slot_name: 'Lunch',
        status: 'consume',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]
    const grid = buildGrid(rows)
    expect(grid.get('3:Dinner')).toBe('away')
    expect(grid.get('5:Lunch')).toBe('consume')
  })
})

describe('cycleStatus', () => {
  it('cycles prep -> consume', () => {
    expect(cycleStatus('prep')).toBe('consume')
  })

  it('cycles consume -> quick', () => {
    expect(cycleStatus('consume')).toBe('quick')
  })

  it('cycles quick -> away', () => {
    expect(cycleStatus('quick')).toBe('away')
  })

  it('cycles away -> prep (wraps around)', () => {
    expect(cycleStatus('away')).toBe('prep')
  })
})

describe('getOrderedDays', () => {
  it('returns [1,2,3,4,5,6,0] when weekStartDay is 1 (Monday)', () => {
    expect(getOrderedDays(1)).toEqual([1, 2, 3, 4, 5, 6, 0])
  })

  it('returns [0,1,2,3,4,5,6] when weekStartDay is 0 (Sunday)', () => {
    expect(getOrderedDays(0)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('returns 7 elements starting from the given weekStartDay', () => {
    const days = getOrderedDays(3)
    expect(days).toHaveLength(7)
    expect(days[0]).toBe(3)
    expect(days[6]).toBe(2)
  })
})
