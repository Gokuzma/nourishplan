import { useState, useEffect } from 'react'
import { useImportRecipe } from '../../hooks/useImportRecipe'

interface ImportRecipeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (recipeId: string) => void
}

export function ImportRecipeModal({ isOpen, onClose, onSuccess }: ImportRecipeModalProps) {
  const importRecipe = useImportRecipe()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const isPending = importRecipe.isPending

  // Reset state each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setInput('')
      setError(null)
    }
  }, [isOpen])

  // Close on Escape (unless a fetch is in flight)
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isPending, onClose])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = input.trim()
    if (!trimmed) return
    try {
      const recipeId = await importRecipe.mutateAsync({ input: trimmed })
      onSuccess(recipeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Check your connection and try again.')
    }
  }

  return (
    <>
      {/* Backdrop — click to close when idle, no-op while loading */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={isPending ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div
          className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6 relative"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-recipe-heading"
        >
          <h2 id="import-recipe-heading" className="text-lg font-bold text-text mb-4">
            Import Recipe
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <textarea
                value={input}
                onChange={e => { setInput(e.target.value); setError(null) }}
                disabled={isPending}
                rows={4}
                style={{ maxHeight: '12rem', resize: 'vertical' }}
                className="w-full rounded-[--radius-btn] border border-secondary bg-background px-3 py-2 text-sm text-text focus:outline-none focus:border-accent disabled:opacity-50"
                placeholder="Paste a URL or recipe text…"
                autoFocus
              />
              <p className="text-xs text-text/40">
                Supports blog URLs, YouTube URLs, or pasted recipe text
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending || !input.trim()}
                className="flex-1 rounded-[--radius-btn] bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isPending && (
                  <span
                    className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isPending ? 'Importing…' : 'Import Recipe'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="text-sm text-text/50 hover:text-text transition-colors px-2 py-2.5 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
