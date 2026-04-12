import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface MultiMealPromptOverlayProps {
  recipeCount: number
  onCombined: () => void
  onPerRecipe: () => void
}

export function MultiMealPromptOverlay({ recipeCount, onCombined, onPerRecipe }: MultiMealPromptOverlayProps) {
  const navigate = useNavigate()
  const combinedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    combinedRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="max-w-sm w-full bg-surface rounded-2xl shadow-xl p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-text">How do you want to cook these?</h2>
        <p className="text-sm text-text/70 font-sans">
          This prep session covers {recipeCount} recipes. Would you like a combined longest-first sequence across all of them, or cook each one separately?
        </p>
        <div className="flex flex-col gap-3">
          <button
            ref={combinedRef}
            type="button"
            onClick={onCombined}
            className="bg-primary text-white rounded-[--radius-btn] px-4 py-3 text-sm font-semibold w-full"
          >
            Combined sequence
          </button>
          <button
            type="button"
            onClick={onPerRecipe}
            className="bg-secondary border border-primary/30 text-primary rounded-[--radius-btn] px-4 py-3 text-sm font-semibold w-full"
          >
            One recipe at a time
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-xs text-text/50 underline self-start"
        >
          Back
        </button>
      </div>
    </div>
  )
}
