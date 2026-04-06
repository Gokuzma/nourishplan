import type { ScheduleStatus, MemberScheduleSlot } from '../types/database'

export const STATUS_CYCLE: ScheduleStatus[] = ['prep', 'consume', 'quick', 'away']
export const SLOT_NAMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export type ScheduleGrid = Map<string, ScheduleStatus>

export function buildGrid(rows: MemberScheduleSlot[]): ScheduleGrid {
  const grid = new Map<string, ScheduleStatus>()
  for (const row of rows) {
    grid.set(`${row.day_of_week}:${row.slot_name}`, row.status)
  }
  return grid
}

export function cycleStatus(current: ScheduleStatus): ScheduleStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

export function getOrderedDays(weekStartDay: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStartDay + i) % 7)
}
