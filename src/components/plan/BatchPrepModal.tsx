import { useEffect, useRef } from 'react'
import { useBatchPrepSummary } from '../../hooks/useBatchPrepSummary'
import type { BatchPrepReassignment } from '../../hooks/useBatchPrepSummary'
import { useRecipes } from '../../hooks/useRecipes'
import { BatchPrepSessionCard } from './BatchPrepSessionCard'

interface BatchPrepModalProps {
  open: boolean
  onClose: () => void
  planId: string
  weekStart: string
  onOpenCookMode: (sessionId: string) => void
  onReassignmentsApplied?: (reassignments: BatchPrepReassignment[]) => void
}

export function BatchPrepModal({ open, onClose, planId, weekStart, onOpenCookMode, onReassignmentsApplied }: BatchPrepModalProps) {
  const { data, isLoading, isStale, secondsUntilRefresh, reassignmentsApplied } = useBatchPrepSummary({
    planId,
    isModalOpen: open,
    weekStart,
  })
  const { data: recipes = [] } = useRecipes()

  const prevReassignmentsLen = useRef(0)

  useEffect(() => {
    if (reassignmentsApplied.length > 0 && reassignmentsApplied.length !== prevReassignmentsLen.current) {
      prevReassignmentsLen.current = reassignmentsApplied.length
      onReassignmentsApplied?.(reassignmentsApplied)
    }
  }, [reassignmentsApplied, onReassignmentsApplied])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const sessions = data?.sessions ?? []
  const totalTime = data?.total_time_minutes ?? 0
  const hasSessions = sessions.length > 0
  const firstSessionId = sessions[0]?.session_id

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-prep-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-accent/20">
          <div className="flex items-center gap-2">
            <h3 id="batch-prep-title" className="text-xl font-bold text-text font-sans">Batch prep for this week</h3>
            {totalTime > 0 && (
              <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5 font-sans">~{totalTime} min total</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text/40 hover:text-text transition-colors text-xl leading-none"
            aria-label="Close batch prep summary"
          >
            ×
          </button>
        </div>

        {/* Stale indicator */}
        {isStale && (
          <div
            className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-700 dark:text-amber-400 font-sans flex items-center gap-2"
            aria-live="polite"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
            <span>Plan changed — refreshing in {secondsUntilRefresh}s</span>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {isLoading && !data && (
            <>
              <div className="h-24 bg-secondary/50 rounded-[--radius-card] animate-pulse" />
              <div className="h-24 bg-secondary/50 rounded-[--radius-card] animate-pulse" />
              <div className="h-24 bg-secondary/50 rounded-[--radius-card] animate-pulse" />
            </>
          )}
          {!isLoading && !hasSessions && (
            <p className="text-sm text-text/50 text-center py-8 font-sans">No prep ahead needed — every meal is quick or day-of cook</p>
          )}
          {hasSessions && sessions.map(session => (
            <BatchPrepSessionCard
              key={session.session_id}
              session={session}
              recipes={recipes}
              onCookThisSession={onOpenCookMode}
            />
          ))}
        </div>

        {/* Footer */}
        {hasSessions && firstSessionId && (
          <div className="p-4 border-t border-accent/20">
            <button
              type="button"
              onClick={() => onOpenCookMode(firstSessionId)}
              className="w-full bg-primary text-white rounded-[--radius-btn] px-4 py-2.5 text-sm font-semibold font-sans hover:bg-primary/90 transition-colors"
            >
              Start batch prep cook mode
            </button>
          </div>
        )}

        {reassignmentsApplied.length > 0 && (
          <div className="sr-only" aria-live="polite">
            {reassignmentsApplied.length} plan slot(s) were reassigned
          </div>
        )}
      </div>
    </div>
  )
}
