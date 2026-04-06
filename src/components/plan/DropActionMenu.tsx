import { useEffect } from 'react'

interface DropActionMenuProps {
  onSwap: () => void
  onReplace: () => void
  onCancel: () => void
}

export function DropActionMenu({ onSwap, onReplace, onCancel }: DropActionMenuProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="mt-1 bg-surface border border-accent/30 rounded-lg shadow-lg p-3 z-10 relative"
    >
      <p className="text-xs text-text/50 font-sans mb-2">Drop meal here?</p>
      <div className="flex flex-col gap-2">
        <button
          onClick={onSwap}
          aria-label="Swap meals between slots"
          className="w-full min-h-[44px] py-2 px-3 rounded-md bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          Swap
        </button>
        <button
          onClick={onReplace}
          aria-label="Replace meal in this slot"
          className="w-full min-h-[44px] py-2 px-3 rounded-md bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 transition-colors dark:bg-red-500/10 dark:hover:bg-red-500/20"
        >
          Replace
        </button>
      </div>
      <button
        onClick={onCancel}
        className="text-xs text-text/40 hover:text-text/60 mt-1 w-full text-center"
      >
        Cancel
      </button>
    </div>
  )
}
