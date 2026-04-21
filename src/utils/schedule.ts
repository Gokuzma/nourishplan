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

// Precedence: away > quick > consume > prep. Higher index in STATUS_CYCLE = higher precedence.
function precedence(s: ScheduleStatus): number {
  return STATUS_CYCLE.indexOf(s)
}

/**
 * Aggregates per-member schedule rows into a single household status per (day, slot).
 * Precedence: away > quick > consume > prep. 'prep' is dropped — returned Map contains
 * only entries where at least one member has a non-prep status.
 * Key format: `${day_of_week}:${slot_name}` (slot_name is singular, matches DB).
 */
export function buildHouseholdGrid(rows: MemberScheduleSlot[]): ScheduleGrid {
  const grid = new Map<string, ScheduleStatus>()
  for (const row of rows) {
    if (row.status === 'prep') continue
    const key = `${row.day_of_week}:${row.slot_name}`
    const existing = grid.get(key)
    if (!existing || precedence(row.status) > precedence(existing)) {
      grid.set(key, row.status)
    }
  }
  return grid
}

/**
 * Builds the dot `title` tooltip string per (day, slot).
 * Format: "Away: Dad. Quick: Sam, Kayla." — Title-Case status + colon + space +
 * comma-separated names + period. Statuses ordered by precedence high->low; 'prep'
 * members are omitted entirely (D-07). Unknown member IDs fall back to first 8 UUID chars.
 */
export function buildHouseholdTooltips(
  rows: MemberScheduleSlot[],
  memberNameById: Map<string, string>
): Map<string, string> {
  const byKey = new Map<string, Map<ScheduleStatus, string[]>>()
  for (const row of rows) {
    if (row.status === 'prep') continue
    const memberId = row.member_user_id ?? row.member_profile_id ?? ''
    const name = memberNameById.get(memberId) ?? memberId.slice(0, 8)
    const key = `${row.day_of_week}:${row.slot_name}`
    if (!byKey.has(key)) byKey.set(key, new Map())
    const statusMap = byKey.get(key)!
    if (!statusMap.has(row.status)) statusMap.set(row.status, [])
    statusMap.get(row.status)!.push(name)
  }
  const tooltips = new Map<string, string>()
  // High->low precedence order for tooltip display
  const DISPLAY_ORDER: ScheduleStatus[] = ['away', 'quick', 'consume']
  const TITLE_CASE: Record<Exclude<ScheduleStatus, 'prep'>, string> = {
    away: 'Away',
    quick: 'Quick',
    consume: 'Consume',
  }
  for (const [key, statusMap] of byKey) {
    const parts: string[] = []
    for (const status of DISPLAY_ORDER) {
      const names = statusMap.get(status)
      if (names && names.length > 0) {
        parts.push(`${TITLE_CASE[status]}: ${names.join(', ')}.`)
      }
    }
    if (parts.length > 0) tooltips.set(key, parts.join(' '))
  }
  return tooltips
}
