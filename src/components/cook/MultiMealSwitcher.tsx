import { useActiveCookSessions } from '../../hooks/useCookSession'
import type { CookSession } from '../../types/database'

interface MultiMealSwitcherProps {
  currentSessionId: string
  onSwitch: (sessionId: string) => void
}

function getSessionLabel(session: CookSession): string {
  return session.started_at
    ? new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Session'
}

function StatusDot({ status }: { status: CookSession['status'] }) {
  if (status === 'in_progress') {
    return (
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0"
        aria-hidden="true"
      />
    )
  }
  if (status === 'completed') {
    return (
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-text/30 shrink-0"
        aria-hidden="true"
      />
    )
  }
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0"
      aria-hidden="true"
    />
  )
}

export function MultiMealSwitcher({ currentSessionId, onSwitch }: MultiMealSwitcherProps) {
  const { data: sessions } = useActiveCookSessions()

  if (!sessions || sessions.length <= 1) return null

  return (
    <div
      role="tablist"
      aria-label="Switch cook session"
      className="flex gap-1 max-w-[40vw] overflow-x-auto scrollbar-none"
    >
      {sessions.map(session => {
        const isActive = session.id === currentSessionId
        return (
          <button
            key={session.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSwitch(session.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'bg-secondary text-text/60'
            }`}
          >
            <StatusDot status={session.status} />
            <span>{getSessionLabel(session)}</span>
          </button>
        )
      })}
    </div>
  )
}
