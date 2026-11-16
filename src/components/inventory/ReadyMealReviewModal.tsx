import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useHousehold } from '../../hooks/useHousehold'

interface ReadyMealReviewModalProps {
  isOpen: boolean
  onClose: () => void
}

export interface ReadyMealProposal {
  id: string
  food_name: string
  quantity_remaining: number
  unit: string
  storage_location: string
  ready_meal_slots: string[] | null
  serving_grams: number | null
  servings_per_unit: number | null
  serving_calories: number | null
  serving_protein_g: number | null
  serving_carbs_g: number | null
  serving_fat_g: number | null
}

export function ReadyMealReviewModal({ isOpen, onClose }: ReadyMealReviewModalProps) {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposals, setProposals] = useState<ReadyMealProposal[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setProposals([])
    supabase.functions.invoke('classify-inventory', { body: {} }).then(({ data, error: fnError }) => {
      if (cancelled) return
      if (fnError || !data?.success) {
        setError(data?.error || 'Could not check your inventory. Try again.')
      } else {
        const items = data.items as ReadyMealProposal[]
        setProposals(items)
        setSelected(new Set(items.map(i => i.id)))
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [isOpen])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      for (const p of proposals.filter(p => selected.has(p.id))) {
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({
            is_ready_meal: true,
            ready_meal_slots: p.ready_meal_slots,
            serving_grams: p.serving_grams,
            servings_per_unit: p.servings_per_unit,
            serving_calories: p.serving_calories,
            serving_protein_g: p.serving_protein_g,
            serving_carbs_g: p.serving_carbs_g,
            serving_fat_g: p.serving_fat_g,
            nutrition_source: p.serving_calories != null ? 'estimate' : null,
          })
          .eq('id', p.id)
        if (updateError) throw updateError
      }
      await queryClient.invalidateQueries({ queryKey: ['inventory', membership?.household_id] })
      onClose()
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto p-6 relative" role="dialog" aria-label="Find ready meals">
          <h2 className="text-lg font-bold text-text mb-1">Find ready meals</h2>
          <p className="text-sm text-text/60 mb-3">
            Ready meals are food you eat as is or just heat — the planner can put them in meals where nobody is cooking. Calories are estimates per serving.
          </p>

          {loading && <p className="text-sm text-text/60" role="status">Looking through your inventory…</p>}
          {!loading && !error && proposals.length === 0 && (
            <p className="text-sm text-text/60">No new ready meals found.</p>
          )}

          {proposals.length > 0 && (
            <div className="flex flex-col gap-2">
              {proposals.map(p => (
                <label key={p.id} className="flex items-start gap-3 rounded-[--radius-btn] border border-secondary p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="w-4 h-4 mt-0.5 accent-primary"
                    aria-label={`${p.food_name} is a ready meal`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-text">{p.food_name}</span>
                    <span className="block text-xs text-text/50">
                      {[
                        `${p.quantity_remaining} ${p.unit} · ${p.storage_location}`,
                        (p.ready_meal_slots ?? []).join(', '),
                        p.serving_calories != null ? `≈ ${Math.round(p.serving_calories)} kcal per serving` : null,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <div className="flex items-center gap-3 pt-4">
            {proposals.length > 0 && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving || selected.size === 0}
                className="flex-1 rounded-[--radius-btn] bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : `Mark ${selected.size} as ready meal${selected.size === 1 ? '' : 's'}`}
              </button>
            )}
            <button type="button" onClick={onClose} className="text-sm text-text/50 hover:text-text transition-colors px-2 py-2.5">
              {proposals.length > 0 ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
