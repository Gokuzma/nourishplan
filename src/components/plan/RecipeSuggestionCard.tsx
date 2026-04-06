interface RecipeSuggestion {
  name: string
  prepMinutes: number
  description: string
}

interface RecipeSuggestionCardProps {
  suggestions: RecipeSuggestion[]
  onAdd: (suggestion: RecipeSuggestion) => void
}

export function RecipeSuggestionCard({ suggestions, onAdd }: RecipeSuggestionCardProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="bg-secondary/50 border border-primary/20 rounded-[--radius-card] px-4 py-3">
      <p className="text-sm font-semibold text-text font-sans mb-3">
        Add more recipes to improve suggestions
      </p>
      <div className="flex flex-col gap-2">
        {suggestions.map((suggestion, i) => (
          <div key={`${suggestion.name}-${i}`} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text font-sans truncate">{suggestion.name}</p>
              <p className="text-xs text-text/50 font-sans">{suggestion.prepMinutes} min · {suggestion.description}</p>
            </div>
            <button
              onClick={() => onAdd(suggestion)}
              className="shrink-0 text-xs text-primary bg-primary/10 rounded-[--radius-btn] px-2 py-1 hover:bg-primary/20 transition-colors font-sans"
            >
              Add to my recipes
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
