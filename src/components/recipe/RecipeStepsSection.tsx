import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { RecipeStep } from '../../types/database'
import { generateStepId } from '../../utils/recipeSteps'
import { useRecipeSteps, useUpdateRecipeSteps, useRegenerateRecipeSteps } from '../../hooks/useRecipeSteps'
import { RecipeStepRow } from './RecipeStepRow'

interface RecipeStepsSectionProps {
  recipeId: string
  recipeName: string
  servings: number
  ingredientsSnapshot: { name: string; quantity_grams: number }[]
  notes?: string | null
}

type UncertainAddition = { previous_step_text: string; reason: string; suggested_action: 'remove' | 'keep_as_note' }

export function RecipeStepsSection({ recipeId, recipeName, servings, ingredientsSnapshot, notes }: RecipeStepsSectionProps) {
  const { data, isLoading } = useRecipeSteps(recipeId)
  const updateSteps = useUpdateRecipeSteps()
  const regenerateSteps = useRegenerateRecipeSteps()

  const [edited, setEdited] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [uncertain, setUncertain] = useState<UncertainAddition[]>([])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const steps: RecipeStep[] = useMemo(() => data?.instructions ?? [], [data])

  const persist = useCallback((next: RecipeStep[]) => {
    updateSteps.mutate({ recipeId, steps: next })
    setEdited(true)
  }, [recipeId, updateSteps])

  const handleStepChange = useCallback((stepId: string, patch: Partial<RecipeStep>) => {
    const next = steps.map(s => s.id === stepId ? { ...s, ...patch } : s)
    persist(next)
  }, [steps, persist])

  const handleDelete = useCallback((stepId: string) => {
    const next = steps.filter(s => s.id !== stepId)
    persist(next)
  }, [steps, persist])

  const handleAddStep = useCallback(() => {
    const next: RecipeStep[] = [
      ...steps,
      { id: generateStepId(), text: '', duration_minutes: 0, is_active: true, ingredients_used: [], equipment: [] },
    ]
    persist(next)
  }, [steps, persist])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = steps.findIndex(s => s.id === active.id)
    const newIdx = steps.findIndex(s => s.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    persist(arrayMove(steps, oldIdx, newIdx))
  }, [steps, persist])

  const handleRegenerate = useCallback(async () => {
    try {
      const result = await regenerateSteps.mutateAsync({
        recipeId,
        recipeName,
        servings,
        ingredientsSnapshot,
        existingSteps: steps.length > 0 ? steps : undefined,
        notes: notes ?? null,
      })
      if (result.uncertain_user_additions && result.uncertain_user_additions.length > 0) {
        setUncertain(result.uncertain_user_additions)
      } else {
        setUncertain([])
      }
      setEdited(false)
    } catch (err) {
      console.error('regenerate failed', err)
    }
    setConfirmRegenerate(false)
  }, [recipeId, recipeName, servings, ingredientsSnapshot, steps, notes, regenerateSteps])

  const chipLabel = (() => {
    if (regenerateSteps.isPending) return 'Generating...'
    if (!data || data.instructions === null) return 'AI will generate'
    const base = `${steps.length} steps`
    return edited ? `${base} · edited` : base
  })()

  const chipClass = (() => {
    if (regenerateSteps.isPending) return 'bg-primary/10 text-primary'
    if (edited) return 'bg-accent/10 text-accent'
    if (!data || data.instructions === null) return 'bg-text/5 text-text/50'
    return 'bg-primary/10 text-primary'
  })()

  if (isLoading) {
    return (
      <section className="py-4 border-t border-accent/20">
        <div className="text-sm text-text/50">Loading steps...</div>
      </section>
    )
  }

  return (
    <section className="py-4 border-t border-accent/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text font-sans">Steps</h3>
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${chipClass}`}>
            {chipLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => (steps.length > 0 ? setConfirmRegenerate(true) : handleRegenerate())}
          className="text-xs text-primary underline font-sans"
          disabled={regenerateSteps.isPending}
        >
          Regenerate from ingredients
        </button>
      </div>

      {confirmRegenerate && (
        <div className="mb-3 bg-amber-500/10 border border-amber-500/30 rounded-[--radius-btn] px-3 py-2 text-xs flex items-center justify-between gap-2">
          <span className="text-amber-700 dark:text-amber-400">Replace your edits? Your step additions will be kept where possible.</span>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={handleRegenerate} className="bg-primary text-white rounded-[--radius-btn] px-2 py-1 text-xs font-semibold">Replace</button>
            <button type="button" onClick={() => setConfirmRegenerate(false)} className="text-text/60 underline text-xs">Cancel</button>
          </div>
        </div>
      )}

      {uncertain.map((u, i) => (
        <div key={i} className="mb-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-[--radius-btn] px-3 py-2 text-xs flex items-start gap-2">
          <span>Your note '{u.previous_step_text}' might conflict. Keep it?</span>
          <div className="flex gap-2 ml-auto shrink-0">
            <button type="button" onClick={() => setUncertain(prev => prev.filter((_, idx) => idx !== i))} className="bg-primary text-white rounded-[--radius-btn] px-2 py-1 text-xs font-semibold">Keep my note</button>
            <button type="button" onClick={() => setUncertain(prev => prev.filter((_, idx) => idx !== i))} className="text-text/60 underline text-xs">Remove</button>
          </div>
        </div>
      ))}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {steps.map((step, idx) => (
            <RecipeStepRow
              key={step.id}
              step={step}
              index={idx}
              onChange={patch => handleStepChange(step.id, patch)}
              onDelete={() => handleDelete(step.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {steps.length === 0 && !regenerateSteps.isPending && (
        <p className="text-sm text-text/50 text-center py-4 font-sans">No steps yet. Save the recipe to auto-generate, or add steps manually.</p>
      )}

      <button
        type="button"
        onClick={handleAddStep}
        className="mt-2 w-full border border-dashed border-accent/30 text-text/60 rounded-[--radius-btn] px-3 py-2 text-sm hover:border-primary hover:text-primary font-sans"
      >
        + Add step
      </button>
    </section>
  )
}
