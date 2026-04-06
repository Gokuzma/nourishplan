import { useState, useEffect } from 'react'
import { useSchedule, useSaveSchedule } from '../../hooks/useSchedule'
import {
  buildGrid,
  cycleStatus,
  getOrderedDays,
  SLOT_NAMES,
  DAY_LABELS,
} from '../../utils/schedule'
import type { ScheduleGrid } from '../../utils/schedule'
import type { ScheduleStatus } from '../../types/database'

interface Props {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  memberName?: string
  weekStartDay?: number
}

const STATUS_STYLES: Record<ScheduleStatus, string> = {
  prep: 'bg-primary/20 border-primary/40 text-primary',
  consume: 'bg-accent/20 border-accent/40 text-text/70',
  quick: 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300',
  away: 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400',
}

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  prep: 'Prep',
  consume: 'Con',
  quick: 'Quick',
  away: 'Away',
}

export function ScheduleSection({
  householdId,
  memberId,
  memberType,
  memberName,
  weekStartDay,
}: Props) {
  const { data: slots } = useSchedule(householdId, memberId, memberType)
  const saveSchedule = useSaveSchedule()

  const [grid, setGrid] = useState<ScheduleGrid>(new Map())

  useEffect(() => {
    if (slots) {
      setGrid(buildGrid(slots))
    }
  }, [slots])

  function handleCellClick(dayOfWeek: number, slotName: string) {
    const key = `${dayOfWeek}:${slotName}`
    const current: ScheduleStatus = grid.get(key) ?? 'prep'
    const next = cycleStatus(current)
    setGrid(prev => {
      const updated = new Map(prev)
      updated.set(key, next)
      return updated
    })
  }

  const orderedDays = getOrderedDays(weekStartDay ?? 1)

  return (
    <div className="mt-4">
      <h4 className="text-base font-semibold text-text mt-4">
        {memberName ? `${memberName} — ` : ''}Weekly Schedule
      </h4>

      <div className="overflow-x-auto mt-3">
        <div role="grid" className="min-w-max">
          {/* Day headers */}
          <div className="flex">
            <div className="w-16 flex-shrink-0" />
            {orderedDays.map(day => (
              <div
                key={day}
                className="w-12 text-xs text-text/50 text-center px-0.5"
              >
                {DAY_LABELS[day]}
              </div>
            ))}
          </div>

          {/* Slot rows */}
          {SLOT_NAMES.map(slotName => (
            <div key={slotName} className="flex items-center mt-1">
              <div className="w-16 flex-shrink-0 text-xs text-text/60 pr-2 whitespace-nowrap">
                {slotName}
              </div>
              {orderedDays.map(day => {
                const status: ScheduleStatus = grid.get(`${day}:${slotName}`) ?? 'prep'
                return (
                  <button
                    key={day}
                    role="gridcell"
                    onClick={() => handleCellClick(day, slotName)}
                    aria-label={`${DAY_LABELS[day]} ${slotName}: ${status}. Tap to change.`}
                    className={`w-12 min-h-[44px] border rounded text-xs font-semibold transition-colors mx-0.5 ${STATUS_STYLES[status]}`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => saveSchedule.mutate({ householdId, memberId, memberType, grid })}
        disabled={saveSchedule.isPending}
        className="bg-primary text-white px-4 py-2 rounded-[--radius-btn] text-sm mt-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saveSchedule.isPending ? 'Saving...' : 'Save schedule'}
      </button>
    </div>
  )
}
