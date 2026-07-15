import { useState } from 'react'
import { useClearUnlockedSlots, useDeleteMealPlan } from '../../hooks/useMealPlan'

interface ResetWeekMenuProps {
  planId: string
  weekStart: string
  lockedCount: number
  canDelete: boolean
}

/**
 * "Reset week" control on PlanPage. Opens a modal with two destructive
 * options, each behind a confirm step: clear unlocked meals (keeps locked
 * slots for regeneration) or delete the week entirely (back to Start Week).
 * Delete is only offered to the plan creator or a household admin (RLS).
 */
export function ResetWeekMenu({ planId, weekStart, lockedCount, canDelete }: ResetWeekMenuProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<null | 'clear' | 'delete'>(null)

  const clearUnlocked = useClearUnlockedSlots()
  const deleteMealPlan = useDeleteMealPlan()

  function close() {
    setOpen(false)
    setConfirming(null)
  }

  async function handleClear() {
    await clearUnlocked.mutateAsync({ planId })
    close()
  }

  async function handleDelete() {
    await deleteMealPlan.mutateAsync({ planId, weekStart })
    close()
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-sm">
        Reset week
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-[--radius-card] border border-accent/30 bg-surface p-6 shadow-lg">
            <h3 className="text-base font-bold text-primary mb-1">Reset Week</h3>

            {confirming === 'clear' ? (
              <>
                <p className="text-sm text-text mb-4 mt-3">
                  This removes every meal that isn&apos;t locked
                  {lockedCount > 0 ? ` (${lockedCount} locked meal${lockedCount === 1 ? '' : 's'} will stay)` : ''}.
                  You can then regenerate or refill the week. Continue?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirming(null)}
                    className="rounded-[--radius-btn] px-4 py-2 text-sm text-text/60 hover:text-text transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleClear}
                    disabled={clearUnlocked.isPending}
                    className="rounded-[--radius-btn] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {clearUnlocked.isPending ? 'Clearing…' : 'Clear meals'}
                  </button>
                </div>
              </>
            ) : confirming === 'delete' ? (
              <>
                <p className="text-sm text-text mb-4 mt-3">
                  This deletes the whole week — every meal, including locked ones —
                  and takes you back to the Start Week options. This cannot be undone. Continue?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirming(null)}
                    className="rounded-[--radius-btn] px-4 py-2 text-sm text-text/60 hover:text-text transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMealPlan.isPending}
                    className="rounded-[--radius-btn] bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleteMealPlan.isPending ? 'Deleting…' : 'Delete week'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text/60 mb-4">How would you like to reset this week?</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setConfirming('clear')}
                    className="flex flex-col items-start rounded-[--radius-btn] border border-secondary bg-background px-4 py-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <span className="font-semibold text-text">Clear unlocked meals</span>
                    <span className="text-xs text-text/50 mt-0.5">
                      Keep locked meals, empty the rest so you can replan
                    </span>
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => setConfirming('delete')}
                      className="flex flex-col items-start rounded-[--radius-btn] border border-red-200 bg-background px-4 py-3 text-left hover:border-red-400 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/10 transition-colors"
                    >
                      <span className="font-semibold text-red-600">Delete week entirely</span>
                      <span className="text-xs text-text/50 mt-0.5">
                        Remove the plan and start over from the Start Week options
                      </span>
                    </button>
                  )}
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={close}
                    className="rounded-[--radius-btn] px-4 py-2 text-sm text-text/60 hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
