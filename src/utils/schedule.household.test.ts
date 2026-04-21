import { describe, it, expect } from 'vitest'
import { buildHouseholdGrid, buildHouseholdTooltips } from './schedule'
import type { MemberScheduleSlot, ScheduleStatus } from '../types/database'

function makeRow(overrides: Partial<MemberScheduleSlot> = {}): MemberScheduleSlot {
  return {
    id: 'row-id',
    household_id: 'hh-1',
    member_user_id: 'user-1',
    member_profile_id: null,
    day_of_week: 1,
    slot_name: 'Dinner',
    status: 'prep',
    updated_at: '2026-04-20T00:00:00Z',
    ...overrides,
  }
}

describe('buildHouseholdGrid', () => {
  it('Test 1 — returns an empty Map for empty input (no crash)', () => {
    const grid = buildHouseholdGrid([])
    expect(grid.size).toBe(0)
  })

  it('Test 2 — single member single row maps to "day:slot" -> status', () => {
    const grid = buildHouseholdGrid([
      makeRow({ day_of_week: 1, slot_name: 'Dinner', status: 'away' }),
    ])
    expect(grid.get('1:Dinner')).toBe('away')
    expect(grid.size).toBe(1)
  })

  it('Test 3 — precedence: quick beats consume on same (day, slot)', () => {
    const grid = buildHouseholdGrid([
      makeRow({ member_user_id: 'a', day_of_week: 2, slot_name: 'Lunch', status: 'consume' }),
      makeRow({ member_user_id: 'b', day_of_week: 2, slot_name: 'Lunch', status: 'quick' }),
    ])
    expect(grid.get('2:Lunch')).toBe('quick')
  })

  it('Test 4 — precedence full ladder: away wins over [consume, quick, away, prep]', () => {
    const rows: MemberScheduleSlot[] = [
      makeRow({ member_user_id: 'a', day_of_week: 3, slot_name: 'Breakfast', status: 'consume' }),
      makeRow({ member_user_id: 'b', day_of_week: 3, slot_name: 'Breakfast', status: 'quick' }),
      makeRow({ member_user_id: 'c', day_of_week: 3, slot_name: 'Breakfast', status: 'away' }),
      makeRow({ member_user_id: 'd', day_of_week: 3, slot_name: 'Breakfast', status: 'prep' }),
    ]
    const grid = buildHouseholdGrid(rows)
    expect(grid.get('3:Breakfast')).toBe('away')
  })

  it('Test 5 — all-prep (day, slot) yields no entry (no dot for prep)', () => {
    const rows: MemberScheduleSlot[] = [
      makeRow({ member_user_id: 'a', day_of_week: 0, slot_name: 'Breakfast', status: 'prep' }),
      makeRow({ member_user_id: 'b', day_of_week: 0, slot_name: 'Breakfast', status: 'prep' }),
      makeRow({ member_user_id: 'c', day_of_week: 0, slot_name: 'Breakfast', status: 'prep' }),
    ]
    const grid = buildHouseholdGrid(rows)
    expect(grid.get('0:Breakfast')).toBeUndefined()
    expect(grid.size).toBe(0)
  })

  it('Test 6 — mixed prep + consume: prep contributes nothing, consume wins', () => {
    const rows: MemberScheduleSlot[] = [
      makeRow({ member_user_id: 'a', day_of_week: 4, slot_name: 'Snack', status: 'prep' }),
      makeRow({ member_user_id: 'b', day_of_week: 4, slot_name: 'Snack', status: 'consume' }),
    ]
    const grid = buildHouseholdGrid(rows)
    expect(grid.get('4:Snack')).toBe('consume')
  })
})

describe('buildHouseholdTooltips', () => {
  it('Test 7 — single away member named "Dad" -> "Away: Dad."', () => {
    const names = new Map<string, string>([['user-dad', 'Dad']])
    const tooltips = buildHouseholdTooltips(
      [makeRow({ member_user_id: 'user-dad', day_of_week: 1, slot_name: 'Dinner', status: 'away' })],
      names
    )
    expect(tooltips.get('1:Dinner')).toBe('Away: Dad.')
  })

  it('Test 8 — multi-status precedence-ordered: "Away: A. Quick: B. Consume: C."', () => {
    const names = new Map<string, string>([
      ['user-a', 'A'],
      ['user-b', 'B'],
      ['user-c', 'C'],
    ])
    const rows: MemberScheduleSlot[] = [
      makeRow({ member_user_id: 'user-a', day_of_week: 5, slot_name: 'Lunch', status: 'away' }),
      makeRow({ member_user_id: 'user-b', day_of_week: 5, slot_name: 'Lunch', status: 'quick' }),
      makeRow({ member_user_id: 'user-c', day_of_week: 5, slot_name: 'Lunch', status: 'consume' }),
    ]
    const tooltips = buildHouseholdTooltips(rows, names)
    expect(tooltips.get('5:Lunch')).toBe('Away: A. Quick: B. Consume: C.')
  })

  it('Test 9 — prep members are omitted entirely (no "Prep: B." filler)', () => {
    const names = new Map<string, string>([
      ['user-a', 'A'],
      ['user-b', 'B'],
    ])
    const rows: MemberScheduleSlot[] = [
      makeRow({ member_user_id: 'user-a', day_of_week: 2, slot_name: 'Dinner', status: 'away' }),
      makeRow({ member_user_id: 'user-b', day_of_week: 2, slot_name: 'Dinner', status: 'prep' }),
    ]
    const tooltips = buildHouseholdTooltips(rows, names)
    expect(tooltips.get('2:Dinner')).toBe('Away: A.')
  })

  it('Test 10 — unknown member id falls back to first 8 chars of UUID', () => {
    const names = new Map<string, string>()
    const tooltips = buildHouseholdTooltips(
      [makeRow({
        member_user_id: 'abcdef1234-5678-9abc-defg-hijklmnopqrs',
        day_of_week: 6,
        slot_name: 'Breakfast',
        status: 'quick',
      })],
      names
    )
    expect(tooltips.get('6:Breakfast')).toBe('Quick: abcdef12.')
  })
})
