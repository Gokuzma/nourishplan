import { useState, useEffect } from 'react'
import { useRestrictions, useSaveRestrictions } from '../../hooks/useDietaryRestrictions'

const PREDEFINED_CATEGORIES = [
  'Gluten-free',
  'Dairy-free',
  'Nut allergy',
  'Shellfish allergy',
  'Vegetarian',
  'Vegan',
  'Halal',
  'Kosher',
]

interface Props {
  householdId: string
  memberId: string
  memberType: 'user' | 'profile'
  memberName?: string
}

export function DietaryRestrictionsSection({ householdId, memberId, memberType, memberName }: Props) {
  const { data: restriction } = useRestrictions(householdId, memberId, memberType)
  const saveRestrictions = useSaveRestrictions()

  const [predefined, setPredefined] = useState<string[]>([])
  const [customEntries, setCustomEntries] = useState<string[]>([])
  const [newCustom, setNewCustom] = useState('')
  const [aiMappingActive, setAiMappingActive] = useState(false)

  useEffect(() => {
    if (restriction) {
      setPredefined(restriction.predefined ?? [])
      setCustomEntries(restriction.custom_entries ?? [])
    }
  }, [restriction])

  function togglePredefined(category: string) {
    setPredefined(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
  }

  function handleAddCustom() {
    const trimmed = newCustom.trim()
    if (!trimmed) return
    setCustomEntries(prev => [...prev, trimmed])
    setNewCustom('')
  }

  function handleRemoveCustom(entry: string) {
    setCustomEntries(prev => prev.filter(e => e !== entry))
  }

  function handleSave() {
    saveRestrictions.mutate(
      { householdId, memberId, memberType, predefined, customEntries },
      {
        onSuccess: () => {
          setAiMappingActive(true)
          setTimeout(() => setAiMappingActive(false), 5000)
        },
      }
    )
  }

  return (
    <div className="mt-4">
      <h4 className="text-base font-semibold text-text">
        {memberName ? `${memberName} — ` : ''}Dietary Restrictions
      </h4>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
        {PREDEFINED_CATEGORIES.map(category => (
          <label
            key={category}
            className="min-h-[44px] flex items-center gap-2 text-sm text-text cursor-pointer"
          >
            <input
              type="checkbox"
              checked={predefined.includes(category)}
              onChange={() => togglePredefined(category)}
              className="accent-primary w-4 h-4 flex-shrink-0"
            />
            {category}
          </label>
        ))}
      </div>

      {customEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {customEntries.map(entry => (
            <span
              key={entry}
              className="inline-flex items-center gap-1 bg-secondary border border-accent/30 rounded-full px-2 py-0.5 text-xs text-text"
            >
              {entry}
              <button
                onClick={() => handleRemoveCustom(entry)}
                aria-label={`Remove ${entry}`}
                className="text-text/40 hover:text-red-500 transition-colors ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={newCustom}
          onChange={e => setNewCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
          placeholder="Custom restriction"
          className="flex-1 px-3 py-2 rounded-[--radius-btn] border border-secondary bg-background text-text text-sm focus:outline-none focus:border-primary"
        />
        <button
          onClick={handleAddCustom}
          className="px-3 py-2 rounded-[--radius-btn] border border-secondary text-sm text-text/70 hover:border-primary/50 hover:text-text transition-colors whitespace-nowrap"
        >
          Add custom restriction
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saveRestrictions.isPending}
        className="bg-primary text-white px-4 py-2 rounded-[--radius-btn] text-sm mt-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saveRestrictions.isPending ? 'Saving...' : 'Save restrictions'}
      </button>

      {aiMappingActive && (
        <p className="text-xs text-text/50 italic mt-2">Mapping ingredients in the background...</p>
      )}
    </div>
  )
}
