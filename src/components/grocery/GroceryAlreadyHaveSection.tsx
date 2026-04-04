import { useState } from 'react'
import type { GroceryItem } from '../../types/database'

interface GroceryAlreadyHaveSectionProps {
  items: GroceryItem[]
}

export function GroceryAlreadyHaveSection({ items }: GroceryAlreadyHaveSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (items.length === 0) return null

  return (
    <section className="mt-6">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(v => !v)}
        className="flex items-center gap-2 px-3 py-2 w-full text-left min-h-[44px]"
      >
        <span className="text-base font-semibold text-text">Already Have</span>
        <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
          {items.length}
        </span>
        <span className="ml-auto text-text/50 text-sm">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="flex flex-col opacity-60">
          {[...items].sort((a, b) => a.food_name.localeCompare(b.food_name)).map(item => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2 min-h-[44px]">
              <div className="w-5 h-5 flex-shrink-0 rounded-sm border-2 border-secondary bg-primary/20 flex items-center justify-center" aria-hidden="true">
                <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-text">{item.food_name}</span>
                {item.quantity != null && item.unit && (
                  <span className="block text-xs text-text/50 mt-0.5">
                    {item.quantity} {item.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
