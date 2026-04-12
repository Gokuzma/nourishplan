import { useState, useEffect } from 'react'
import { useToggleFreezerFriendly, useUpdateShelfLifeWeeks } from '../../hooks/useFreezerClassification'

interface RecipeFreezerToggleProps {
  recipeId: string
  value: boolean | null
  shelfLifeWeeks: number | null
}

export function RecipeFreezerToggle({ recipeId, value, shelfLifeWeeks }: RecipeFreezerToggleProps) {
  const toggle = useToggleFreezerFriendly()
  const updateWeeks = useUpdateShelfLifeWeeks()
  const [localWeeks, setLocalWeeks] = useState<number>(shelfLifeWeeks ?? 4)

  useEffect(() => {
    setLocalWeeks(shelfLifeWeeks ?? 4)
  }, [shelfLifeWeeks])

  const handleSelect = (next: boolean | null) => {
    toggle.mutate({ recipeId, value: next })
  }

  const handleWeeksBlur = () => {
    const weeks = Math.max(1, Math.min(52, Math.floor(localWeeks)))
    if (weeks !== shelfLifeWeeks) {
      updateWeeks.mutate({ recipeId, weeks })
    }
  }

  const options: { value: boolean | null; label: string; key: string }[] = [
    { value: null, label: 'Auto', key: 'auto' },
    { value: true, label: 'Yes', key: 'yes' },
    { value: false, label: 'No', key: 'no' },
  ]

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-t border-accent/20">
      <div className="flex flex-col">
        <label className="text-sm font-medium text-text font-sans">Freezes well</label>
        <span className="text-xs text-text/50 font-sans">AI will suggest this if you leave it blank</span>
      </div>
      <div className="flex items-center gap-3">
        <div
          role="radiogroup"
          aria-label="Freezes well"
          className="inline-flex bg-secondary rounded-[--radius-btn] p-1"
        >
          {options.map(opt => {
            const selected = value === opt.value
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleSelect(opt.value)}
                className={`px-3 py-1 rounded-[--radius-btn] text-xs font-medium font-sans transition-colors ${selected ? 'bg-primary text-white' : 'text-text/60 hover:text-text'}`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        {value === true && (
          <div className="flex items-center gap-1">
            <label htmlFor={`shelf-${recipeId}`} className="text-xs text-text/60 font-sans">Shelf life</label>
            <input
              id={`shelf-${recipeId}`}
              type="number"
              min={1}
              max={52}
              value={localWeeks}
              onChange={e => setLocalWeeks(Number(e.target.value) || 0)}
              onBlur={handleWeeksBlur}
              className="w-14 bg-background border border-accent/20 rounded-[--radius-btn] px-2 py-1 text-sm font-sans text-right text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-xs text-text/60 font-sans">weeks</span>
          </div>
        )}
      </div>
    </div>
  )
}
