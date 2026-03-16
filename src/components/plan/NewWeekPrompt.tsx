import { useState } from 'react'
import { useTemplates } from '../../hooks/useMealPlanTemplates'
import type { MealPlanTemplate } from '../../types/database'

interface NewWeekPromptProps {
  weekStart: string
  onChoice: (choice: 'fresh' | 'repeat' | 'template', templateId?: string, planStart?: string) => void
}

/**
 * Modal shown when no meal_plan exists for the current week.
 * Offers three initialization options: fresh, repeat last week, or load template.
 * User can optionally change the plan start date before choosing.
 */
export function NewWeekPrompt({ weekStart, onChoice }: NewWeekPromptProps) {
  const [showTemplates, setShowTemplates] = useState(false)
  const [planStart, setPlanStart] = useState(weekStart)
  const { data: templates, isPending: templatesLoading } = useTemplates()

  const weekLabel = new Date(weekStart + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

  function handleFresh() {
    onChoice('fresh', undefined, planStart)
  }

  function handleRepeat() {
    onChoice('repeat', undefined, planStart)
  }

  function handleTemplateSelect(template: MealPlanTemplate) {
    onChoice('template', template.id, planStart)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-[--radius-card] border border-accent/30 bg-surface p-6 shadow-lg">
        <h2 className="text-lg font-bold text-primary mb-1">Start Week of {weekLabel}</h2>
        <p className="text-sm text-text/60 mb-4">How would you like to set up this week's plan?</p>

        <div className="mb-4">
          <label className="block text-sm text-text/60 mb-1">Plan start date</label>
          <input
            type="date"
            value={planStart}
            onChange={e => setPlanStart(e.target.value)}
            className="w-full border border-secondary rounded-[--radius-btn] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:border-primary"
          />
        </div>

        {!showTemplates ? (
          <div className="flex flex-col gap-3">
            {/* Start fresh */}
            <button
              onClick={handleFresh}
              className="flex flex-col items-start rounded-[--radius-btn] border border-secondary bg-background px-4 py-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <span className="font-semibold text-text">Start fresh</span>
              <span className="text-xs text-text/50 mt-0.5">Begin with an empty plan</span>
            </button>

            {/* Repeat last week */}
            <button
              onClick={handleRepeat}
              className="flex flex-col items-start rounded-[--radius-btn] border border-secondary bg-background px-4 py-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <span className="font-semibold text-text">Repeat last week</span>
              <span className="text-xs text-text/50 mt-0.5">Copy meals from the previous week</span>
            </button>

            {/* Load a template */}
            <button
              onClick={() => setShowTemplates(true)}
              className="flex flex-col items-start rounded-[--radius-btn] border border-secondary bg-background px-4 py-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <span className="font-semibold text-text">Load a template</span>
              <span className="text-xs text-text/50 mt-0.5">Use a saved template</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowTemplates(false)}
              className="text-sm text-text/50 hover:text-text transition-colors text-left"
            >
              &larr; Back
            </button>

            <p className="text-sm font-semibold text-text">Choose a template</p>

            {templatesLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-[--radius-btn] bg-secondary" />
                ))}
              </div>
            ) : !templates || templates.length === 0 ? (
              <p className="text-sm text-text/50">No templates saved yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {templates.map((template) => (
                  <li key={template.id}>
                    <button
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full flex flex-col items-start rounded-[--radius-btn] border border-secondary bg-background px-4 py-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <span className="font-semibold text-text">{template.name}</span>
                      <span className="text-xs text-text/50 mt-0.5">
                        Saved {new Date(template.created_at).toLocaleDateString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
