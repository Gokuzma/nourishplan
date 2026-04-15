import { useState } from 'react'

export interface RecipeMix {
  favorites: number
  liked: number
  novel: number
}

const DEFAULT_MIX: RecipeMix = { favorites: 50, liked: 30, novel: 20 }

function round5(n: number): number {
  return Math.round(n / 5) * 5
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n))
}

function isValidMix(value: unknown): value is RecipeMix {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.favorites === 'number' &&
    Number.isFinite(v.favorites) &&
    typeof v.liked === 'number' &&
    Number.isFinite(v.liked) &&
    typeof v.novel === 'number' &&
    Number.isFinite(v.novel)
  )
}

function rebalance(prev: RecipeMix, key: keyof RecipeMix, newValue: number): RecipeMix {
  const clampedNew = round5(clamp100(newValue))
  const otherKeys = (Object.keys(prev) as Array<keyof RecipeMix>).filter(k => k !== key)
  const k0 = otherKeys[0]
  const k1 = otherKeys[1]
  const otherSum = prev[k0] + prev[k1]
  const remaining = 100 - clampedNew

  let v0: number
  let v1: number
  if (otherSum <= 0) {
    v0 = round5(remaining / 2)
    v1 = remaining - v0
  } else {
    const ratio = prev[k0] / otherSum
    v0 = round5(remaining * ratio)
    v1 = remaining - v0
  }

  // Clamp both to [0,100]
  v0 = clamp100(v0)
  v1 = clamp100(v1)

  // Correct any drift so the total is exactly 100
  const total = clampedNew + v0 + v1
  if (total !== 100) {
    v1 = clamp100(v1 + (100 - total))
  }

  const next = { ...prev }
  next[key] = clampedNew
  next[k0] = v0
  next[k1] = v1
  return next
}

interface RecipeMixPanelProps {
  householdId: string
  onMixChange?: (mix: RecipeMix) => void
}

export function RecipeMixPanel({ householdId, onMixChange }: RecipeMixPanelProps) {
  const storageKey = `plan-recipe-mix-${householdId}`
  const [expanded, setExpanded] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [mix, setMix] = useState<RecipeMix>(() => getRecipeMix(householdId))

  function handleChange(key: keyof RecipeMix, rawValue: string) {
    const parsedValue = Number(rawValue)
    if (!Number.isFinite(parsedValue)) return

    setMix(prev => {
      const next = rebalance(prev, key, parsedValue)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // ignore
      }
      onMixChange?.(next)
      return next
    })

    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 1500)
  }

  const total = mix.favorites + mix.liked + mix.novel
  const sumCorrect = total === 100

  return (
    <div className={expanded ? 'bg-secondary rounded-[--radius-card]' : ''}>
      <button
        className="w-full py-2.5 px-3 bg-secondary rounded-[--radius-card] flex items-center justify-between"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold text-text font-sans">Recipe mix</span>
        <div className="flex items-center gap-2">
          {showSaved && (
            <span className="text-xs text-primary font-sans">Saved</span>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`transition-transform text-text/50 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="p-3 pt-1">
          <p className="text-xs text-text/60 font-sans mb-2">
            Adjust how often favorites, liked recipes, and new dishes appear in generated plans.
          </p>

          <div className="flex items-center gap-3 px-3 py-2 min-h-[44px]">
            <label htmlFor="recipe-mix-favorites" className="text-sm text-text font-sans flex-1">
              Favorites
            </label>
            <input
              id="recipe-mix-favorites"
              type="range"
              min="0"
              max="100"
              step="5"
              value={mix.favorites}
              onChange={e => handleChange('favorites', e.target.value)}
              aria-label="Favorites percentage"
              className="accent-[--color-accent] active:scale-110"
            />
            <span className="text-xs text-text/60 w-8 text-right">{mix.favorites}%</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 min-h-[44px]">
            <label htmlFor="recipe-mix-liked" className="text-sm text-text font-sans flex-1">
              Liked
            </label>
            <input
              id="recipe-mix-liked"
              type="range"
              min="0"
              max="100"
              step="5"
              value={mix.liked}
              onChange={e => handleChange('liked', e.target.value)}
              aria-label="Liked percentage"
              className="accent-[--color-accent] active:scale-110"
            />
            <span className="text-xs text-text/60 w-8 text-right">{mix.liked}%</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 min-h-[44px]">
            <label htmlFor="recipe-mix-novel" className="text-sm text-text font-sans flex-1">
              Novel
            </label>
            <input
              id="recipe-mix-novel"
              type="range"
              min="0"
              max="100"
              step="5"
              value={mix.novel}
              onChange={e => handleChange('novel', e.target.value)}
              aria-label="Novel percentage"
              className="accent-[--color-accent] active:scale-110"
            />
            <span className="text-xs text-text/60 w-8 text-right">{mix.novel}%</span>
          </div>

          <div
            role="status"
            className={`px-3 pt-1 text-xs font-sans ${sumCorrect ? 'text-primary' : 'text-amber-500'}`}
          >
            {sumCorrect ? 'Total: 100%' : `Total: ${total}% — must equal 100`}
          </div>
        </div>
      )}
    </div>
  )
}

export function getRecipeMix(householdId: string): RecipeMix {
  try {
    const stored = localStorage.getItem(`plan-recipe-mix-${householdId}`)
    if (stored) {
      const parsed = JSON.parse(stored) as unknown
      if (isValidMix(parsed)) {
        const sum = parsed.favorites + parsed.liked + parsed.novel
        if (Math.abs(sum - 100) <= 1) {
          return { favorites: parsed.favorites, liked: parsed.liked, novel: parsed.novel }
        }
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_MIX
}
