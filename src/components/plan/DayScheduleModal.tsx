import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../hooks/useAuth'
import { useHousehold, useHouseholdMembers, useMemberProfiles } from '../../hooks/useHousehold'
import {
  useHouseholdSchedules,
  useScheduleExceptions,
  useSaveDayScheduleExceptions,
} from '../../hooks/useSchedule'
import type { DayExceptionEntry } from '../../hooks/useSchedule'
import { SLOT_NAMES, STATUS_LABELS, STATUS_ORDER } from '../../utils/schedule'
import { dayOfWeekFor } from '../../utils/mealPlan'
import type { ScheduleStatus } from '../../types/database'

interface DayScheduleModalProps {
  householdId: string
  weekStart: string
  dayIndex: number
  onClose: () => void
}

interface EditableMember {
  id: string
  type: 'user' | 'profile'
  name: string
  editable: boolean
}

function dayTitle(weekStart: string, dayIndex: number): string {
  const d = new Date(weekStart + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dayIndex)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/**
 * "Who's around" editor for one day of the plan week. Shows every family
 * member with a status dropdown per meal slot, initialized from the base
 * weekly pattern merged with this week's exceptions. Saving stores only
 * the statuses that differ from the base pattern as week-specific
 * exceptions — the recurring schedule in Settings is never touched.
 * Portaled to body (L-054).
 */
export function DayScheduleModal({
  householdId,
  weekStart,
  dayIndex,
  onClose,
}: DayScheduleModalProps) {
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const { data: householdMembers = [] } = useHouseholdMembers()
  const { data: memberProfiles = [] } = useMemberProfiles()
  const { data: baseRows = [] } = useHouseholdSchedules(householdId)
  const { data: exceptionRows = [] } = useScheduleExceptions(householdId, weekStart)
  const saveDay = useSaveDayScheduleExceptions()

  const dayOfWeek = dayOfWeekFor(weekStart, dayIndex)
  const isAdmin = membership?.role === 'admin'
  const currentUserId = session?.user.id

  const members: EditableMember[] = useMemo(() => {
    const result: EditableMember[] = []
    for (const hm of householdMembers) {
      result.push({
        id: hm.user_id,
        type: 'user',
        name: hm.profiles?.display_name ?? hm.user_id.slice(0, 8),
        editable: isAdmin || hm.user_id === currentUserId,
      })
    }
    for (const mp of memberProfiles) {
      result.push({ id: mp.id, type: 'profile', name: mp.name, editable: true })
    }
    return result
  }, [householdMembers, memberProfiles, isAdmin, currentUserId])

  // Base status per member/slot for this day of the week
  const baseStatus = useMemo(() => {
    const map = new Map<string, ScheduleStatus>()
    for (const row of baseRows) {
      if (row.day_of_week !== dayOfWeek) continue
      const memberId = row.member_user_id ?? row.member_profile_id ?? ''
      map.set(`${memberId}:${row.slot_name}`, row.status)
    }
    return map
  }, [baseRows, dayOfWeek])

  // Draft: effective status (exception over base) per member/slot
  const [draft, setDraft] = useState<Map<string, ScheduleStatus> | null>(null)
  const effective = useMemo(() => {
    const map = new Map<string, ScheduleStatus>(baseStatus)
    for (const ex of exceptionRows) {
      if (ex.day_of_week !== dayOfWeek) continue
      const memberId = ex.member_user_id ?? ex.member_profile_id ?? ''
      map.set(`${memberId}:${ex.slot_name}`, ex.status)
    }
    return map
  }, [baseStatus, exceptionRows, dayOfWeek])

  const values = draft ?? effective

  function handleChange(memberId: string, slotName: string, status: ScheduleStatus) {
    setDraft(prev => {
      const next = new Map(prev ?? effective)
      next.set(`${memberId}:${slotName}`, status)
      return next
    })
  }

  async function handleSave() {
    const editableMembers = members.filter(m => m.editable)
    const entries: DayExceptionEntry[] = []
    for (const member of editableMembers) {
      for (const slotName of SLOT_NAMES) {
        const key = `${member.id}:${slotName}`
        const value = values.get(key) ?? 'prep'
        const base = baseStatus.get(key) ?? 'prep'
        if (value !== base) {
          entries.push({ memberId: member.id, memberType: member.type, slotName, status: value })
        }
      }
    }
    await saveDay.mutateAsync({
      householdId,
      weekStart,
      dayOfWeek,
      members: editableMembers.map(m => ({ memberId: m.id, memberType: m.type })),
      entries,
    })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-[--radius-card] border border-accent/30 bg-surface p-6 shadow-lg max-h-[85vh] overflow-y-auto">
        <h3 className="text-base font-bold text-primary mb-1">
          Who&apos;s around — {dayTitle(weekStart, dayIndex)}
        </h3>
        <p className="text-sm text-text/60 mb-4">
          Changes apply to this day only; the usual weekly schedule in Settings stays as is.
        </p>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_repeat(4,minmax(0,72px))] gap-1 items-center mb-1">
          <div />
          {SLOT_NAMES.map(slotName => (
            <div key={slotName} className="text-[10px] text-text/50 text-center uppercase tracking-wide">
              {slotName}
            </div>
          ))}
        </div>

        {members.map(member => (
          <div
            key={`${member.type}:${member.id}`}
            className="grid grid-cols-[1fr_repeat(4,minmax(0,72px))] gap-1 items-center py-1"
          >
            <div className="text-sm text-text truncate pr-1">{member.name}</div>
            {SLOT_NAMES.map(slotName => {
              const key = `${member.id}:${slotName}`
              const value = values.get(key) ?? 'prep'
              const differsFromUsual = value !== (baseStatus.get(key) ?? 'prep')
              return (
                <select
                  key={slotName}
                  value={value}
                  disabled={!member.editable}
                  onChange={e => handleChange(member.id, slotName, e.target.value as ScheduleStatus)}
                  aria-label={`${member.name} ${slotName}: ${STATUS_LABELS[value]}`}
                  title={differsFromUsual ? 'Differs from the usual weekly schedule' : undefined}
                  className={`min-h-[36px] border rounded text-xs font-semibold text-center appearance-none bg-background text-text disabled:opacity-40 ${
                    differsFromUsual ? 'border-primary ring-1 ring-primary/40' : 'border-secondary'
                  }`}
                >
                  {STATUS_ORDER.map(option => (
                    <option key={option} value={option}>
                      {STATUS_LABELS[option]}
                    </option>
                  ))}
                </select>
              )
            })}
          </div>
        ))}

        <p className="text-xs text-text/50 mt-2">
          Highlighted cells differ from the usual schedule for this day.
        </p>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="rounded-[--radius-btn] px-4 py-2 text-sm text-text/60 hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveDay.isPending}
            className="rounded-[--radius-btn] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saveDay.isPending ? 'Saving…' : 'Save day'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
