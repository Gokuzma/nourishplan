import { useState, useMemo } from 'react'
import type { Recipe } from '../../types/database'
import {
  computeSlotSupply,
  detectUnderSuppliedSlots,
  countUntagged,
} from '../../utils/recipeSupply'
import {
  usePreviewGapRecipes,
  useCommitGapRecipes,
  useClassifyRecipes,
  type ProposedRecipe,
} from '../../hooks/useRecipeSupply'

interface FillGapsModalProps {
  recipes: Recipe[]
  onClose: () => void
}

function kcalPerServing(r: ProposedRecipe): number {
  const total = r.ingredients.reduce((s, i) => s + (i.calories_per_100g * i.quantity_grams) / 100, 0)
  return Math.round(total / Math.max(1, r.servings))
}

export function FillGapsModal({ recipes, onClose }: FillGapsModalProps) {
  const supply = useMemo(() => computeSlotSupply(recipes), [recipes])
  const underSupplied = useMemo(() => detectUnderSuppliedSlots(recipes), [recipes])
  const untagged = useMemo(() => countUntagged(recipes), [recipes])

  const preview = usePreviewGapRecipes()
  const commit = useCommitGapRecipes()
  const classify = useClassifyRecipes()

  const [proposals, setProposals] = useState<ProposedRecipe[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const busy = preview.isPending || commit.isPending || classify.isPending

  async function handleClassify() {
    setError(null); setNotice(null)
    try {
      const { classified } = await classify.mutateAsync()
      setNotice(`Classified ${classified} untagged recipe${classified === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classification failed')
    }
  }

  async function handleGenerate() {
    setError(null); setNotice(null)
    try {
      const all: ProposedRecipe[] = []
      for (const slot of underSupplied) {
        const batch = await preview.mutateAsync({ slot: slot.slot, count: slot.shortfall })
        all.push(...batch)
      }
      setProposals(all)
      setSelected(new Set(all.map((_, i) => i)))
      if (all.length === 0) setNotice('No recipes were generated. Try again.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
  }

  async function handleSave() {
    if (!proposals) return
    setError(null)
    const chosen = proposals.filter((_, i) => selected.has(i))
    if (chosen.length === 0) { onClose(); return }
    try {
      await commit.mutateAsync(chosen)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div
        className="relative bg-paper-2 w-full sm:max-w-lg max-h-[88vh] overflow-y-auto p-5"
        style={{ border: '1.5px solid var(--rule-c)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fill-gaps-heading"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="mono" style={{ color: 'var(--tomato)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Recipe supply
            </div>
            <h2 id="fill-gaps-heading" className="serif" style={{ fontSize: 24, marginTop: 4 }}>Fill recipe gaps</h2>
          </div>
          <button onClick={onClose} disabled={busy} className="btn btn-ghost btn-sm" aria-label="Close">×</button>
        </div>

        {proposals === null ? (
          <>
            {/* Supply summary */}
            <div className="py-2" style={{ borderTop: '1px dashed var(--rule-soft)', borderBottom: '1px dashed var(--rule-soft)' }}>
              {supply.map((s) => (
                <div key={s.slot} className="flex items-center justify-between py-1.5">
                  <span className="serif" style={{ fontSize: 16 }}>{s.slot}</span>
                  <span className="mono tnum" style={{ fontSize: 12, color: s.shortfall > 0 ? 'var(--tomato)' : 'var(--ink-soft)' }}>
                    {s.available} / {s.target}
                    {s.shortfall > 0 && <span> · need {s.shortfall} more</span>}
                  </span>
                </div>
              ))}
            </div>

            {untagged > 0 && (
              <div className="mt-4">
                <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
                  {untagged} recipe{untagged === 1 ? ' has' : 's have'} no meal-type tag, so the planner treats them as eligible for any slot (including breakfast). Classify them first for cleaner plans.
                </p>
                <button onClick={handleClassify} disabled={busy} className="btn btn-sm mt-2">
                  {classify.isPending ? 'Classifying…' : `Classify ${untagged} untagged`}
                </button>
              </div>
            )}

            {notice && <p className="text-sm mt-3" style={{ color: 'var(--tomato)' }}>{notice}</p>}
            {error && <p className="text-sm mt-3 text-red-500">{error}</p>}

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleGenerate}
                disabled={busy || underSupplied.length === 0}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {preview.isPending
                  ? 'Generating…'
                  : underSupplied.length === 0
                    ? 'All slots well stocked'
                    : `Generate ${underSupplied.reduce((n, s) => n + s.shortfall, 0)} recipes`}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-3" style={{ color: 'var(--ink-dim)' }}>
              Review the generated recipes and uncheck any you don't want. Selected recipes will be saved to your cookbook.
            </p>
            <div className="flex flex-col gap-2">
              {proposals.map((r, i) => (
                <label
                  key={i}
                  className="flex items-start gap-3 p-3 cursor-pointer"
                  style={{ border: '1px solid var(--rule-soft)' }}
                >
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="mt-1 accent-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="serif" style={{ fontSize: 16, lineHeight: 1.1 }}>{r.name}</div>
                    <div className="mono mt-1" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                      {r.slot} · {r.ingredients.length} ingredient{r.ingredients.length === 1 ? '' : 's'} · ~{kcalPerServing(r)} kcal/serving
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {error && <p className="text-sm mt-3 text-red-500">{error}</p>}

            <div className="flex gap-2 mt-5 flex-wrap">
              <button onClick={() => { setProposals(null); setError(null) }} disabled={busy} className="btn btn-sm">Back</button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {commit.isPending ? 'Saving…' : `Save ${selected.size} recipe${selected.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
