import { useState, useEffect } from 'react'

interface GeneratePlanButtonProps {
  onGenerate: () => void
  isGenerating: boolean
  isComplete: boolean
}

export function GeneratePlanButton({ onGenerate, isGenerating, isComplete }: GeneratePlanButtonProps) {
  const [showComplete, setShowComplete] = useState(false)

  useEffect(() => {
    if (isComplete) {
      setShowComplete(true)
      const timer = setTimeout(() => setShowComplete(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isComplete])

  const label = isGenerating
    ? 'Generating...'
    : showComplete
    ? 'Plan ready'
    : 'Generate Plan'

  return (
    <button
      onClick={onGenerate}
      disabled={isGenerating}
      aria-busy={isGenerating}
      aria-label="Generate weekly meal plan"
      className="btn btn-primary"
      style={{ minWidth: 180 }}
    >
      {isGenerating && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="animate-spin shrink-0"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" strokeOpacity="0.3" />
          <path d="M8 2a6 6 0 0 1 6 6" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </button>
  )
}
