import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../../types/database'

interface CookEntryPointOnRecipeDetailProps {
  recipe: Recipe
}

export function CookEntryPointOnRecipeDetail({ recipe }: CookEntryPointOnRecipeDetailProps) {
  const navigate = useNavigate()
  const isPreparing = recipe.instructions === null

  function handleCook() {
    navigate(`/cook/${recipe.id}?source=recipe`)
  }

  return (
    <button
      onClick={handleCook}
      disabled={isPreparing}
      className="w-full sm:w-[200px] bg-primary text-white rounded-[--radius-btn] px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors hover:bg-primary/90"
    >
      {isPreparing ? (
        <>
          <svg
            className="animate-spin w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span>Preparing steps...</span>
        </>
      ) : (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
            <line x1="6" y1="17" x2="18" y2="17" />
            <line x1="6" y1="21" x2="18" y2="21" />
          </svg>
          <span>Cook this recipe</span>
        </>
      )}
    </button>
  )
}
