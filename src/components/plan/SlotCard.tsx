import { calcIngredientNutrition, calcMealNutrition } from '../../utils/nutrition'
import type { MealPlanSlot, Meal, MealItem } from '../../types/database'

export type SlotWithMeal = MealPlanSlot & {
  meals: (Meal & { meal_items: MealItem[] }) | null
}

interface SlotCardProps {
  slotName: string
  slot: SlotWithMeal | null
  onAssign: () => void
  onClear: () => void
  onSwap: () => void
}

function calcSlotCalories(meal: (Meal & { meal_items: MealItem[] }) | null): number {
  if (!meal || !meal.meal_items.length) return 0
  const items = meal.meal_items.map(item => ({
    nutrition: calcIngredientNutrition(
      {
        calories: item.calories_per_100g,
        protein: item.protein_per_100g,
        fat: item.fat_per_100g,
        carbs: item.carbs_per_100g,
      },
      item.quantity_grams,
    ),
  }))
  return calcMealNutrition(items).calories
}

/**
 * Single meal slot card showing assigned meal name + calories, or an empty state.
 */
export function SlotCard({ slotName, slot, onAssign, onClear, onSwap }: SlotCardProps) {
  const meal = slot?.meals ?? null
  const calories = calcSlotCalories(meal)

  if (!meal) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-dashed border-accent/30 bg-background/50">
        <span className="text-sm text-text/50 font-sans">{slotName}</span>
        <button
          onClick={onAssign}
          className="w-7 h-7 rounded-full bg-primary/10 text-primary text-lg font-semibold flex items-center justify-center hover:bg-primary/20 transition-colors"
          aria-label={`Add meal to ${slotName}`}
        >
          +
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-accent/30 bg-surface shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate font-sans">{meal.name}</p>
        <p className="text-xs text-text/50 font-sans">{Math.round(calories)} kcal</p>
      </div>
      <div className="flex items-center gap-1 ml-2 shrink-0">
        {!slot?.is_override && (
          <button
            onClick={onSwap}
            className="p-1 rounded text-text/40 hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Swap meal"
            title="Swap meal"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 4h10M8 1l3 3-3 3M15 12H5M8 9l-3 3 3 3" />
            </svg>
          </button>
        )}
        {slot?.is_override && (
          <button
            onClick={onSwap}
            className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
            aria-label="Change meal"
            title="Change meal"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 2l3 3-8 8H3v-3L11 2z" />
            </svg>
          </button>
        )}
        <button
          onClick={onClear}
          className="p-1 rounded text-text/30 hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label="Remove meal"
          title="Remove meal"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>
    </div>
  )
}
