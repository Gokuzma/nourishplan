import { useState } from 'react'

interface MealRatingRowProps {
  recipeId: string
  recipeName: string
  onRate: (recipeId: string, rating: number) => void
  saved?: boolean
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function MealRatingRow({ recipeId, recipeName, onRate, saved }: MealRatingRowProps) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)

  if (saved) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium text-text">{recipeName}</span>
        <span className="text-xs text-primary">Saved</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-text flex-1 mr-3">{recipeName}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => {
          const isFilled = hoveredStar !== null ? n <= hoveredStar : false
          return (
            <button
              key={n}
              aria-label={`Rate ${recipeName} ${n} out of 5 stars`}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
                isFilled ? 'text-primary' : 'text-text/20'
              }`}
              onMouseEnter={() => setHoveredStar(n)}
              onMouseLeave={() => setHoveredStar(null)}
              onFocus={() => setHoveredStar(n)}
              onBlur={() => setHoveredStar(null)}
              onClick={() => onRate(recipeId, n)}
            >
              <StarIcon filled={isFilled} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
