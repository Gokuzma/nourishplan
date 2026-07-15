import type { ScheduleStatus, MemberScheduleSlot, MemberScheduleException } from '../types/database'

export const STATUS_ORDER: ScheduleStatus[] = ['prep', 'batch', 'consume', 'quick', 'away']
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

export function getOrderedDays(weekStartDay: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStartDay + i) % 7)
}

// Precedence: away > quick > consume > batch > prep. Higher index in STATUS_ORDER = higher precedence.
function precedence(s: ScheduleStatus): number {
  return STATUS_ORDER.indexOf(s)
}

/**
 * Overlays week-specific exception rows onto the recurring weekly pattern.
 * An exception replaces the member's base status for that (day, slot); exceptions
 * with no matching base row become synthetic rows so buildHouseholdGrid sees them.
 */
export function applyExceptions(
  base: MemberScheduleSlot[],
  exceptions: MemberScheduleException[]
): MemberScheduleSlot[] {
  if (!exceptions.length) return base
  const exceptionByKey = new Map<string, MemberScheduleException>()
  for (const ex of exceptions) {
    const memberId = ex.member_user_id ?? ex.member_profile_id ?? ''
    exceptionByKey.set(`${memberId}:${ex.day_of_week}:${ex.slot_name}`, ex)
  }
  const covered = new Set<string>()
  const result: MemberScheduleSlot[] = base.map(row => {
    const memberId = row.member_user_id ?? row.member_profile_id ?? ''
    const key = `${memberId}:${row.day_of_week}:${row.slot_name}`
    const ex = exceptionByKey.get(key)
    if (!ex) return row
    covered.add(key)
    return { ...row, status: ex.status }
  })
  for (const ex of exceptions) {
    const memberId = ex.member_user_id ?? ex.member_profile_id ?? ''
    const key = `${memberId}:${ex.day_of_week}:${ex.slot_name}`
    if (covered.has(key)) continue
    result.push({
      id: ex.id,
      household_id: ex.household_id,
      member_user_id: ex.member_user_id,
      member_profile_id: ex.member_profile_id,
      day_of_week: ex.day_of_week,
      slot_name: ex.slot_name,
      status: ex.status,
      updated_at: ex.created_at,
    })
  }
  return result
}

/**
 * Aggregates per-member schedule rows into a single household status per (day, slot).
 * Precedence: away > quick > consume > batch > prep. 'prep' is dropped — returned Map
 * contains only entries where at least one member has a non-prep status.
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
  const DISPLAY_ORDER: Exclude<ScheduleStatus, 'prep'>[] = ['away', 'quick', 'consume', 'batch']
  const TITLE_CASE: Record<Exclude<ScheduleStatus, 'prep'>, string> = {
    away: 'Away',
    quick: 'Quick',
    consume: 'Eat',
    batch: 'Batch',
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
