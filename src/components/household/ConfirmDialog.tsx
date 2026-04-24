import { useEffect } from 'react'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** When true, the confirm button renders as destructive (red) — use for Remove/Leave/Demote */
  destructive?: boolean
  isPending?: boolean
  /** Error text rendered beneath the action buttons (e.g. "At least one admin required") */
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reusable confirm dialog for Phase 30 admin actions (Promote / Demote / Remove / Leave — D-02).
 *
 * - ESC closes (unless isPending) per ImportRecipeModal pattern.
 * - Backdrop click closes (unless isPending).
 * - Error prop surfaces the DB trigger's "At least one admin required" message verbatim
 *   when a race condition slips past the UI's disabled-state guard.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  isPending = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isPending, onCancel])

  if (!isOpen) return null

  const confirmBase = 'rounded-btn px-4 py-2 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
  const confirmClass = destructive
    ? `${confirmBase} bg-red-600`
    : `${confirmBase} bg-primary`

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={isPending ? undefined : onCancel}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div
          className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6 relative"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-heading"
          aria-describedby="confirm-dialog-message"
        >
          <h2 id="confirm-dialog-heading" className="text-lg font-bold text-text mb-2">
            {title}
          </h2>
          <p id="confirm-dialog-message" className="text-sm text-text/70 mb-5">
            {message}
          </p>

          {error && (
            <p className="mb-4 text-sm text-red-500">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="rounded-btn px-4 py-2 text-sm font-semibold text-text/70 hover:bg-secondary/50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className={confirmClass}
            >
              {isPending ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
