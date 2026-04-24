const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const DAY_COUNT = 7

interface DayPillsProps {
  weekStart: string
  weekStartDay: number
  todayDateStr: string
  currentDayIndex: number
  onSelect: (dayIndex: number) => void
}

function dayDateStr(weekStart: string, dayIndex: number): string {
  const d = new Date(weekStart + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dayIndex)
  return d.toISOString().slice(0, 10)
}

function dayOfMonth(weekStart: string, dayIndex: number): number {
  const d = new Date(weekStart + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dayIndex)
  return d.getUTCDate()
}

/**
 * Mobile day scrubber — horizontal scrollable strip of day pills.
 * Active pill = tomato bg, today pill gets a small tomato dot.
 */
export function DayPills({ weekStart, weekStartDay, todayDateStr, currentDayIndex, onSelect }: DayPillsProps) {
  return (
    <div
      className="no-scrollbar"
      style={{
        display: 'flex',
        overflowX: 'auto',
        borderTop: '2px solid var(--rule-c)',
        borderBottom: '2px solid var(--rule-c)',
        background: 'var(--paper-2)',
      }}
    >
      {Array.from({ length: DAY_COUNT }, (_, di) => {
        const dayName = DAY_NAMES[(weekStartDay + di) % 7]
        const dateStr = dayDateStr(weekStart, di)
        const isToday = dateStr === todayDateStr
        const isActive = di === currentDayIndex
        return (
          <button
            key={di}
            type="button"
            className={`day-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(di)}
            aria-label={`${dayName} ${dayOfMonth(weekStart, di)}`}
            aria-current={isActive ? 'page' : undefined}
            style={{ background: isActive ? 'var(--tomato)' : 'transparent', border: 0, position: 'relative' }}
          >
            <div className="dn">{dayName.toUpperCase()}</div>
            <div className="dd">{dayOfMonth(weekStart, di)}</div>
            {isToday && !isActive && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  bottom: 4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4,
                  height: 4,
                  background: 'var(--tomato)',
                  borderRadius: '50%',
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
