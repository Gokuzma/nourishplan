import { DEFAULT_SLOTS } from '../../utils/mealPlan'
import { PlanCell } from './PlanCell'
import type { SlotWithMeal } from '../../hooks/useMealPlan'
import type { ScheduleStatus } from '../../types/database'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const DAY_COUNT = 7
const ROMAN = ['i.', 'ii.', 'iii.', 'iv.'] as const

interface DesktopPlanGridProps {
  weekStart: string
  weekStartDay: number
  slotsByDay: Record<number, SlotWithMeal[]>
  todayDateStr: string
  weekNumber: number
  weekRange: string
  slotSchedulesByDay?: Map<number, Map<string, ScheduleStatus>>
  slotTooltipsByDay?: Map<number, Map<string, string>>
  slotViolationsByDay?: Map<number, Map<string, { count: number; hasAllergy: boolean }>>
  getSlotFreezerFriendly: (slot: SlotWithMeal) => boolean
  pendingDropSlotKey: string | null
  onAssign: (dayIndex: number, slotName: string) => void
  onSwap: (dayIndex: number, slotName: string) => void
  onClear: (slotId: string) => void
  onToggleLock: (slotId: string, isLocked: boolean) => void
  onDropSwap: () => void
  onDropReplace: () => void
  onDropCancel: () => void
}

function dayDateLabel(weekStart: string, dayIndex: number): string {
  const d = new Date(weekStart + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dayIndex)
  return String(d.getUTCDate())
}

function dayDateStr(weekStart: string, dayIndex: number): string {
  const d = new Date(weekStart + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dayIndex)
  return d.toISOString().slice(0, 10)
}

/**
 * Desktop 7×4 ruled meal-plan grid (Gazette editorial style).
 * Header row: corner block + 7 day headers (today highlighted tomato).
 * 4 meal rows: italic Fraunces roman numeral label + 7 PlanCell cells per row.
 */
export function DesktopPlanGrid({
  weekStart,
  weekStartDay,
  slotsByDay,
  todayDateStr,
  weekNumber,
  weekRange,
  slotSchedulesByDay,
  slotTooltipsByDay,
  slotViolationsByDay,
  getSlotFreezerFriendly,
  pendingDropSlotKey,
  onAssign,
  onSwap,
  onClear,
  onToggleLock,
  onDropSwap,
  onDropReplace,
  onDropCancel,
}: DesktopPlanGridProps) {
  return (
    <div className="plan-grid">
      {/* Corner header */}
      <div className="ghead" style={{ borderRight: '2px solid var(--rule-c)' }}>
        <div className="dn">Week {weekNumber}</div>
        <div className="dd" style={{ fontSize: 14, fontStyle: 'italic' }}>{weekRange}</div>
      </div>

      {/* 7 day-of-week headers */}
      {Array.from({ length: DAY_COUNT }, (_, di) => {
        const dayName = DAY_NAMES[(weekStartDay + di) % 7]
        const dateStr = dayDateStr(weekStart, di)
        const isToday = dateStr === todayDateStr
        return (
          <div key={di} className={`ghead ${isToday ? 'today' : ''}`}>
            <div className="dn">{dayName.toUpperCase()}</div>
            <div className="dd">{dayDateLabel(weekStart, di)}</div>
          </div>
        )
      })}

      {/* 4 meal rows */}
      {DEFAULT_SLOTS.map((slotName, mi) => (
        <Row
          key={slotName}
          slotName={slotName}
          mealNo={ROMAN[mi]}
          weekStart={weekStart}
          weekStartDay={weekStartDay}
          slotsByDay={slotsByDay}
          todayDateStr={todayDateStr}
          slotSchedulesByDay={slotSchedulesByDay}
          slotTooltipsByDay={slotTooltipsByDay}
          slotViolationsByDay={slotViolationsByDay}
          getSlotFreezerFriendly={getSlotFreezerFriendly}
          pendingDropSlotKey={pendingDropSlotKey}
          onAssign={onAssign}
          onSwap={onSwap}
          onClear={onClear}
          onToggleLock={onToggleLock}
          onDropSwap={onDropSwap}
          onDropReplace={onDropReplace}
          onDropCancel={onDropCancel}
        />
      ))}
    </div>
  )
}

interface RowProps {
  slotName: string
  mealNo: string
  weekStart: string
  weekStartDay: number
  slotsByDay: Record<number, SlotWithMeal[]>
  todayDateStr: string
  slotSchedulesByDay?: Map<number, Map<string, ScheduleStatus>>
  slotTooltipsByDay?: Map<number, Map<string, string>>
  slotViolationsByDay?: Map<number, Map<string, { count: number; hasAllergy: boolean }>>
  getSlotFreezerFriendly: (slot: SlotWithMeal) => boolean
  pendingDropSlotKey: string | null
  onAssign: (dayIndex: number, slotName: string) => void
  onSwap: (dayIndex: number, slotName: string) => void
  onClear: (slotId: string) => void
  onToggleLock: (slotId: string, isLocked: boolean) => void
  onDropSwap: () => void
  onDropReplace: () => void
  onDropCancel: () => void
}

function Row({
  slotName,
  mealNo,
  weekStart,
  weekStartDay,
  slotsByDay,
  todayDateStr,
  slotSchedulesByDay,
  slotTooltipsByDay,
  slotViolationsByDay,
  getSlotFreezerFriendly,
  pendingDropSlotKey,
  onAssign,
  onSwap,
  onClear,
  onToggleLock,
  onDropSwap,
  onDropReplace,
  onDropCancel,
}: RowProps) {
  return (
    <>
      <div className="gmeal-label">
        <div className="no">{mealNo}</div>
        <div className="lab">{slotName}</div>
      </div>
      {Array.from({ length: DAY_COUNT }, (_, di) => {
        const slot = (slotsByDay[di] ?? []).find(s => s.slot_name === slotName) ?? null
        const dateStr = dayDateStr(weekStart, di)
        const isToday = dateStr === todayDateStr
        const dropKey = `${di}:${slotName}`
        const dayOfWeek = (weekStartDay + di) % 7
        return (
          <PlanCell
            key={di}
            dayIndex={di}
            slotName={slotName}
            slot={slot}
            isToday={isToday}
            isLocked={!!slot?.is_locked}
            scheduleStatus={slotSchedulesByDay?.get(dayOfWeek)?.get(slotName)}
            scheduleTooltip={slotTooltipsByDay?.get(dayOfWeek)?.get(slotName)}
            violationCount={slotViolationsByDay?.get(di)?.get(slotName)?.count}
            hasAllergyViolation={slotViolationsByDay?.get(di)?.get(slotName)?.hasAllergy}
            isFreezerFriendly={slot ? getSlotFreezerFriendly(slot) : false}
            pendingDrop={pendingDropSlotKey === dropKey}
            onAssign={() => onAssign(di, slotName)}
            onSwap={() => onSwap(di, slotName)}
            onClear={() => slot && onClear(slot.id)}
            onToggleLock={() => slot && onToggleLock(slot.id, !slot.is_locked)}
            onDropSwap={onDropSwap}
            onDropReplace={onDropReplace}
            onDropCancel={onDropCancel}
          />
        )
      })}
    </>
  )
}
