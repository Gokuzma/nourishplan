import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MEAL_SLOTS, type MealSlot } from '../../utils/recipeSupply'
import { calcPerServingMacros } from '../../utils/recipeMacros'
import {
  useDiscoverRecipes,
  useCommitGapRecipes,
  type ProposedRecipe,
} from '../../hooks/useRecipeSupply'

interface DiscoverRecipesModalProps {
  onClose: () => void
}

const BATCH_SIZE = 6

function SuggestionCard({
  proposal,
  added,
  saving,
  onAdd,
}: {
  proposal: ProposedRecipe
  added: boolean
  saving: boolean
  onAdd: () => void
}) {
  const [showIngredients, setShowIngredients] = useState(false)
  const macros = calcPerServingMacros(proposal.ingredients, proposal.servings)

  return (
    <div className="p-3" style={{ border: '1px solid var(--rule-soft)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="serif" style={{ fontSize: 17, lineHeight: 1.15 }}>{proposal.name}</div>
          {proposal.description && (
            <p className="serif-italic text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
              {proposal.description}
            </p>
          )}
          <div className="mono tnum mt-1.5" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
            {proposal.slot} · {Math.round(macros.calories)} kcal · P {Math.round(macros.protein)}g · F {Math.round(macros.fat)}g · C {Math.round(macros.carbs)}g / serving
          </div>
        </div>
        <button
          onClick={onAdd}
          disabled={added || saving}
          className={added ? 'btn btn-sm' : 'btn btn-primary btn-sm'}
          style={{ flexShrink: 0 }}
        >
          {added ? 'Added ✓' : saving ? 'Adding…' : '+ Add to book'}
        </button>
      </div>

      <button
        onClick={() => setShowIngredients((v) => !v)}
        className="mono mt-2"
        style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}
      >
        {showIngredients ? '− Hide' : '+ Show'} {proposal.ingredients.length} ingredient{proposal.ingredients.length === 1 ? '' : 's'}
      </button>
      {showIngredients && (
        <ul className="mt-1.5 text-sm" style={{ color: 'var(--ink-dim)' }}>
          {proposal.ingredients.map((ing, i) => (
            <li key={i} className="flex justify-between py-0.5" style={{ borderTop: '1px dashed var(--rule-soft)' }}>
              <span>{ing.name}</span>
              <span className="mono tnum" style={{ fontSize: 11 }}>{Math.round(ing.quantity_grams)} g</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DiscoverRecipesModal({ onClose }: DiscoverRecipesModalProps) {
  const discover = useDiscoverRecipes()
  const commit = useCommitGapRecipes()

  const [craving, setCraving] = useState('')
  const [slot, setSlot] = useState<MealSlot | undefined>(undefined)
  const [proposals, setProposals] = useState<ProposedRecipe[]>([])
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set())
  const [savingName, setSavingName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const busy = discover.isPending

  async function handleGenerate(append: boolean) {
    setError(null)
    try {
      const batch = await discover.mutateAsync({ slot, count: BATCH_SIZE, craving: craving || undefined })
      setProposals((prev) => (append ? [...prev, ...batch] : batch))
      if (batch.length === 0) setError('No suggestions came back. Try a different craving or slot.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
  }

  async function handleAdd(proposal: ProposedRecipe) {
    setError(null)
    setSavingName(proposal.name)
    try {
      await commit.mutateAsync([proposal])
      setAddedNames((prev) => new Set(prev).add(proposal.name))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingName(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div
        className="relative bg-paper-2 w-full sm:max-w-xl max-h-[88vh] overflow-y-auto p-5"
        style={{ border: '1.5px solid var(--rule-c)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discover-heading"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="mono" style={{ color: 'var(--tomato)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              What's cooking this week
            </div>
            <h2 id="discover-heading" className="serif" style={{ fontSize: 24, marginTop: 4 }}>Discover recipes</h2>
          </div>
          <button onClick={onClose} disabled={busy} className="btn btn-ghost btn-sm" aria-label="Close">×</button>
        </div>

        <input
          type="text"
          value={craving}
          onChange={(e) => setCraving(e.target.value)}
          placeholder="What are you in the mood for? e.g. cozy soups, high-protein, kid-friendly"
          className="w-full px-3 py-2 text-sm bg-transparent"
          style={{ border: '1px solid var(--rule-soft)' }}
          disabled={busy}
        />

        <div className="flex gap-1.5 mt-3 flex-wrap">
          {[undefined, ...MEAL_SLOTS].map((s) => (
            <button
              key={s ?? 'Any'}
              onClick={() => setSlot(s)}
              disabled={busy}
              className={`btn btn-sm ${slot === s ? 'btn-primary' : ''}`}
            >
              {s ?? 'Any slot'}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleGenerate(false)}
          disabled={busy}
          className="btn btn-primary btn-sm mt-4 w-full"
          style={{ justifyContent: 'center' }}
        >
          {busy ? 'Dreaming up recipes…' : proposals.length > 0 ? 'Suggest a fresh batch' : 'Suggest recipes'}
        </button>

        {error && <p className="text-sm mt-3 text-red-500">{error}</p>}

        {proposals.length > 0 && (
          <>
            <p className="text-sm mt-4 mb-2" style={{ color: 'var(--ink-dim)' }}>
              Tailored to your household's tastes and restrictions. Add the ones that spark something.
            </p>
            <div className="flex flex-col gap-2">
              {proposals.map((p, i) => (
                <SuggestionCard
                  key={`${p.name}-${i}`}
                  proposal={p}
                  added={addedNames.has(p.name)}
                  saving={savingName === p.name}
                  onAdd={() => handleAdd(p)}
                />
              ))}
            </div>
            <button
              onClick={() => handleGenerate(true)}
              disabled={busy}
              className="btn btn-sm mt-3 w-full"
              style={{ justifyContent: 'center' }}
            >
              {busy ? 'Dreaming up recipes…' : 'Suggest more'}
            </button>
            {addedNames.size > 0 && (
              <Link
                to="/plan"
                className="btn btn-primary btn-sm mt-2 w-full no-underline"
                style={{ justifyContent: 'center' }}
              >
                {addedNames.size} added — go plan the week →
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
