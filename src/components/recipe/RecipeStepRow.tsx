import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RecipeStep } from '../../types/database'

interface RecipeStepRowProps {
  step: RecipeStep
  index: number
  onChange: (patch: Partial<RecipeStep>) => void
  onDelete: () => void
}

export function RecipeStepRow({ step, index, onChange, onDelete }: RecipeStepRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 py-2 px-1"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-text/30 cursor-grab touch-none pt-2"
        aria-label={`Drag to reorder step ${index + 1}`}
        title="Drag to reorder"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="3" r="1.5" /><circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" /><circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" /><circle cx="9" cy="13" r="1.5" />
        </svg>
      </button>
      <span className="text-xs text-text/40 font-sans w-6 pt-2 tabular-nums">{index + 1}</span>
      <input
        type="text"
        value={step.text}
        onChange={e => onChange({ text: e.target.value })}
        placeholder="Describe the step"
        className="flex-1 bg-background border border-accent/20 rounded-[--radius-btn] px-3 py-2 text-sm font-sans text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          min="0"
          step="1"
          value={step.duration_minutes}
          onChange={e => onChange({ duration_minutes: Math.max(0, Number(e.target.value) || 0) })}
          className="w-16 bg-background border border-accent/20 rounded-[--radius-btn] px-2 py-2 text-sm font-sans text-right text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label={`Duration for step ${index + 1} in minutes`}
        />
        <span className="text-xs text-text/50 font-sans">min</span>
      </div>
      <button
        type="button"
        onClick={() => onChange({ is_active: !step.is_active })}
        className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium font-sans ${step.is_active ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}
        aria-label={step.is_active ? 'Mark step as passive wait' : 'Mark step as hands-on'}
      >
        {step.is_active ? 'Active' : 'Passive'}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 text-text/30 hover:text-red-500 p-1"
        aria-label={`Delete step ${index + 1}`}
        title="Delete step"
      >
        ×
      </button>
    </div>
  )
}
