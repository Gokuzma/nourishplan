import { useState } from 'react'

interface ReheatStep {
  id: string
  text: string
}

interface ReheatSequenceCardProps {
  storage: 'fridge' | 'freezer'
  steps: ReheatStep[]
  onDone: () => void
}

export function ReheatSequenceCard({ storage, steps, onDone }: ReheatSequenceCardProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  function toggleStep(id: string) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="bg-surface rounded-[--radius-card] px-4 py-4 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text">
        Reheat from {storage}
      </h2>
      <ol className="flex flex-col gap-2">
        {steps.map((step, idx) => (
          <li key={step.id} className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => toggleStep(step.id)}
              className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${checked[step.id] ? 'bg-primary border-primary text-white' : 'border-accent/40 bg-background'}`}
              aria-label={`Step ${idx + 1}: ${checked[step.id] ? 'completed' : 'not completed'}`}
            >
              {checked[step.id] && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M1.5 5l2.5 2.5 4.5-4" />
                </svg>
              )}
            </button>
            <span className={`text-sm font-sans ${checked[step.id] ? 'text-text/40 line-through' : 'text-text'}`}>
              {step.text}
            </span>
          </li>
        ))}
      </ol>
      <div className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-accent/20 px-4 py-3">
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-primary text-white rounded-[--radius-btn] h-12 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 8.5l3.5 3.5 7-7" />
          </svg>
          Done reheating
        </button>
      </div>
    </div>
  )
}
