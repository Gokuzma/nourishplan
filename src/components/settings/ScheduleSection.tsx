import { useState, useEffect } from 'react'
import { useSchedule, useSaveSchedule } from '../../hooks/useSchedule'
import {
  buildGrid,
  getOrderedDays,
  SLOT_NAMES,
  DAY_LABELS,
  STATUS_LABELS,
} from '../../utils/schedule'
import type { ScheduleGrid } from '../../utils/schedule'
import type { ScheduleStatus } from '../../types/database'

interface Props {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  memberName?: string
  weekStartDay?: number
  isChild?: boolean
}

const STATUS_STYLES: Record<ScheduleStatus, string> = {
  prep: 'bg-primary/20 border-primary/40 text-primary',
  batch: 'bg-violet-100 border-violet-300 text-violet-700 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-300',
  consume: 'bg-accent/20 border-accent/40 text-text/70',
  quick: 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300',
  away: 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400',
}

const STATUS_OPTIONS: ScheduleStatus[] = ['prep', 'batch', 'consume', 'quick', 'away']

const CHILD_STATUS_OPTIONS: ScheduleStatus[] = ['prep', 'away']

const CHILD_STATUS_LABELS: Partial<Record<ScheduleStatus, string>> = {
  prep: 'Home',
  away: 'Away',
}

const CHILD_STATUS_LEGEND: { status: ScheduleStatus; text: string }[] = [
  { status: 'prep', text: 'Home — eats with the family' },
  { status: 'away', text: 'Away — eats somewhere else (daycare, school, grandparents)' },
]

const STATUS_LEGEND: { status: ScheduleStatus; text: string }[] = [
  { status: 'prep', text: 'Cook — make a meal and eat it then' },
  { status: 'batch', text: 'Batch — cook extra for later meals' },
  { status: 'consume', text: 'Eat — leftovers or already-prepped food' },
  { status: 'quick', text: 'Quick — something fast (under 20 min)' },
  { status: 'away', text: 'Away — not eating at home' },
]

export function ScheduleSection({
  householdId,
  memberId,
  memberType,
  memberName,
  weekStartDay,
  isChild,
}: Props) {
  const { data: slots } = useSchedule(householdId, memberId, memberType)
  const saveSchedule = useSaveSchedule()

  const [grid, setGrid] = useState<ScheduleGrid>(new Map())

  useEffect(() => {
    if (!slots) return
    const loaded = buildGrid(slots)
    if (isChild) {
      for (const [key, status] of loaded) {
        if (status !== 'away') loaded.set(key, 'prep')
      }
    }
    setGrid(loaded)
  }, [slots, isChild])

  function handleStatusChange(dayOfWeek: number, slotName: string, next: ScheduleStatus) {
    const key = `${dayOfWeek}:${slotName}`
    setGrid(prev => {
      const updated = new Map(prev)
      updated.set(key, next)
      return updated
    })
  }

  const orderedDays = getOrderedDays(weekStartDay ?? 1)
  const options = isChild ? CHILD_STATUS_OPTIONS : STATUS_OPTIONS
  const labelFor = (status: ScheduleStatus) =>
    (isChild ? CHILD_STATUS_LABELS[status] : undefined) ?? STATUS_LABELS[status]
  const legend = isChild ? CHILD_STATUS_LEGEND : STATUS_LEGEND

  return (
    <div className="mt-4">
      <h4 className="text-base font-semibold text-text mt-4">
        {memberName ? `${memberName} — ` : ''}Weekly Schedule
      </h4>
      <p className="text-xs text-text/60 mt-1 max-w-prose">
        {isChild
          ? `${memberName ?? 'This child'} eats whatever the family is having, so most meals stay on Home. Mark Away only for meals eaten somewhere else, like daycare lunch.`
          : 'Pick what you are doing for each meal. The plan combines everyone in the household: the strictest choice of whoever is home wins, and a meal is only skipped when everyone is away.'}
      </p>

      <div className="overflow-x-auto mt-3">
        <div role="grid" className="min-w-max">
          {/* Day headers */}
          <div className="flex">
            <div className="w-16 flex-shrink-0" />
            {orderedDays.map(day => (
              <div
                key={day}
                className="w-16 text-xs text-text/50 text-center px-0.5"
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
                  <select
                    key={day}
                    role="gridcell"
                    value={status}
                    onChange={e =>
                      handleStatusChange(day, slotName, e.target.value as ScheduleStatus)
                    }
                    aria-label={`${DAY_LABELS[day]} ${slotName}: ${labelFor(status)}`}
                    className={`w-16 min-h-[44px] border rounded text-xs font-semibold transition-colors mx-0.5 text-center appearance-none cursor-pointer ${STATUS_STYLES[status]}`}
                  >
                    {options.map(option => (
                      <option key={option} value={option}>
                        {labelFor(option)}
                      </option>
                    ))}
                  </select>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <ul className="mt-3 flex flex-col gap-1">
        {legend.map(({ status, text }) => (
          <li key={status} className="flex items-center gap-2 text-xs text-text/60">
            <span className={`inline-block w-3 h-3 rounded border flex-shrink-0 ${STATUS_STYLES[status]}`} />
            {text}
          </li>
        ))}
      </ul>

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
