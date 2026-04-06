import { useState } from 'react'
import { useWontEatEntries, useAddWontEat, useUpdateWontEatStrength, useRemoveWontEat } from '../../hooks/useWontEat'
import type { WontEatEntry } from '../../types/database'

const STRENGTH_OPTIONS: { value: WontEatEntry['strength']; label: string }[] = [
  { value: 'dislikes', label: 'Dislikes' },
  { value: 'refuses', label: 'Refuses' },
  { value: 'allergy', label: 'Allergy' },
]

function strengthClasses(strength: WontEatEntry['strength'], active: boolean): string {
  if (!active) return 'text-xs px-2 py-1 rounded border border-secondary text-text/40 hover:border-primary/40 transition-colors'
  if (strength === 'dislikes') return 'text-xs px-2 py-1 rounded border border-accent/40 bg-text/10 text-text/50'
  if (strength === 'refuses') return 'text-xs px-2 py-1 rounded border border-amber-300 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
  return 'text-xs px-2 py-1 rounded border border-red-300 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
}

interface Props {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  memberName?: string
}

export function WontEatSection({ householdId, memberId, memberType, memberName }: Props) {
  const { data: entries } = useWontEatEntries(householdId, memberId, memberType)
  const addWontEat = useAddWontEat()
  const updateStrength = useUpdateWontEatStrength()
  const removeWontEat = useRemoveWontEat()

  const [newFood, setNewFood] = useState('')

  function handleAdd() {
    const trimmed = newFood.trim()
    if (!trimmed) return
    addWontEat.mutate({ householdId, memberId, memberType, foodName: trimmed })
    setNewFood('')
  }

  return (
    <div>
      <h4 className="text-base font-semibold text-text mt-6">
        {memberName ? `${memberName} — ` : ''}Won't Eat
      </h4>

      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={newFood}
          onChange={e => setNewFood(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Type a food name"
          className="flex-1 px-3 py-2 rounded-[--radius-btn] border border-secondary bg-background text-text text-sm focus:outline-none focus:border-primary"
        />
        <button
          onClick={handleAdd}
          disabled={addWontEat.isPending}
          className="bg-primary text-white px-4 py-2 rounded-[--radius-btn] text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          Add food
        </button>
      </div>

      {!entries || entries.length === 0 ? (
        <div className="mt-3">
          <p className="text-sm text-text/50">No items added yet.</p>
          <p className="text-xs text-text/40">Type a food you won't eat and tap Add food.</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-center gap-2 py-1.5">
              <span className="text-sm text-text flex-1 min-w-0 truncate">
                {entry.food_name}
                {entry.source === 'ai_restriction' && (
                  <span className="text-xs text-accent/60 ml-1">(auto)</span>
                )}
              </span>

              <div
                role="group"
                aria-label="Preference strength"
                className="flex gap-1 flex-shrink-0"
              >
                {STRENGTH_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    aria-pressed={entry.strength === opt.value}
                    onClick={() =>
                      updateStrength.mutate({ id: entry.id, strength: opt.value, householdId })
                    }
                    className={strengthClasses(opt.value, entry.strength === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                aria-label={`Remove ${entry.food_name}`}
                onClick={() => removeWontEat.mutate({ id: entry.id, householdId })}
                className="text-text/30 hover:text-red-500 transition-colors text-base leading-none flex-shrink-0 ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
