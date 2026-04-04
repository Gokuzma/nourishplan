import { GroceryItemRow } from './GroceryItemRow'
import type { GroceryItem } from '../../types/database'

interface GroceryCategorySectionProps {
  category: string
  items: GroceryItem[]
  onToggle: (id: string, checked: boolean) => void
}

export function GroceryCategorySection({ category, items, onToggle }: GroceryCategorySectionProps) {
  // Sort: unchecked first (alphabetical), checked at bottom
  const sorted = [...items].sort((a, b) => {
    if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
    return a.food_name.localeCompare(b.food_name)
  })

  return (
    <section role="region" aria-label={category} className="mb-4">
      <h2 className="text-base font-semibold text-text px-3 py-1 mb-1">{category}</h2>
      <div className="flex flex-col">
        {sorted.map(item => (
          <GroceryItemRow key={item.id} item={item} onToggle={onToggle} />
        ))}
      </div>
    </section>
  )
}
