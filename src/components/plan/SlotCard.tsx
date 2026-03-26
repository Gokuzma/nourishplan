import { useState } from 'react'
import { calcIngredientNutrition, calcMealNutrition } from '../../utils/nutrition'
import { ProgressRing } from './ProgressRing'
import { PortionSuggestionRow } from './PortionSuggestionRow'
import type { MealPlanSlot, Meal, MealItem, NutritionTarget } from '../../types/database'
import type { PortionResult } from '../../utils/portionSuggestions'

export type SlotWithMeal = MealPlanSlot & {
  meals: (Meal & { meal_items: MealItem[] }) | null
}

interface SlotCardProps {
  slotName: string
  slot: SlotWithMeal | null
  onAssign: () => void
  onClear: () => void
  onSwap: () => void
  onLog?: () => void
  suggestions?: PortionResult | null
  currentUserId?: string
  memberTarget?: NutritionTarget | null
}

function calcSlotNutrition(meal: (Meal & { meal_items: MealItem[] }) | null) {
  if (!meal || !meal.meal_items.length) return { calories: 0, protein: 0, fat: 0, carbs: 0 }
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
  return calcMealNutrition(items)
}

/**
 * Single meal slot card showing assigned meal name + calories, or an empty state.
 * When suggestions are provided, shows the current user's portion inline with an
 * expandable section to see all household members' suggestions.
 */
export function SlotCard({ slotName, slot, onAssign, onClear, onSwap, onLog, suggestions, currentUserId, memberTarget }: SlotCardProps) {
  const [expanded, setExpanded] = useState(false)
  const meal = slot?.meals ?? null
  const nutrition = calcSlotNutrition(meal)
  const calories = nutrition.calories

  const isDeletedMeal = slot?.meal_id != null && !meal

  if (!slot?.meal_id && !meal) {
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

  if (isDeletedMeal) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-dashed border-secondary/50 bg-background/30">
        <div>
          <span className="text-sm text-text/40 font-sans italic">{slotName}</span>
          <span className="text-xs text-text/30 ml-2">(Deleted)</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onAssign} className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center hover:bg-primary/20 transition-colors" aria-label={`Replace deleted meal in ${slotName}`}>+</button>
          <button onClick={onClear} className="w-7 h-7 rounded-full bg-accent/10 text-text/40 text-sm flex items-center justify-center hover:bg-accent/20 transition-colors" aria-label={`Clear ${slotName}`}>×</button>
        </div>
      </div>
    )
  }

  const currentUserSuggestion = suggestions?.suggestions.find(s => s.memberId === currentUserId) ?? null
  const hasExpandableSuggestions = suggestions && suggestions.suggestions.length > 0

  return (
    <div className="rounded-lg border border-accent/30 bg-surface shadow-sm">
      {/* Main row */}
      <div className="flex items-center justify-between py-2 px-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text truncate font-sans">{meal!.name}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-text/50 font-sans">{Math.round(calories)} kcal</p>
            {currentUserSuggestion && (
              <span className="text-xs text-primary/80 font-sans">
                You: {currentUserSuggestion.percentage !== null
                  ? `${Math.round(currentUserSuggestion.percentage)}% (${currentUserSuggestion.servings.toFixed(1)} svg)`
                  : `${currentUserSuggestion.servings.toFixed(1)} svg`}
                {currentUserSuggestion.hasMacroWarning && (
                  <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-400 text-white text-[8px] font-bold leading-none align-middle">!</span>
                )}
              </span>
            )}
          </div>
          {memberTarget && (
            <div className="flex items-center gap-1.5 mt-1">
              <ProgressRing value={nutrition.calories} target={memberTarget.calories ?? 0} size={20} strokeWidth={2} color="#A8C5A0" />
              <ProgressRing value={nutrition.protein} target={memberTarget.protein_g ?? 0} size={20} strokeWidth={2} color="#93C5FD" />
              <ProgressRing value={nutrition.carbs} target={memberTarget.carbs_g ?? 0} size={20} strokeWidth={2} color="#FCD34D" />
              <ProgressRing value={nutrition.fat} target={memberTarget.fat_g ?? 0} size={20} strokeWidth={2} color="#F9A8D4" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {hasExpandableSuggestions && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 rounded text-text/40 hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label={expanded ? 'Collapse suggestions' : 'Expand suggestions'}
              title="Portion suggestions"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              >
                <path d="M2 4l4 4 4-4" />
              </svg>
            </button>
          )}
          {onLog && (
            <button
              onClick={onLog}
              className="p-1 rounded text-text/40 hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="Log meal"
              title="Log meal"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v12M2 8h12" />
              </svg>
            </button>
          )}
          <button
            onClick={onSwap}
            className="p-1 rounded text-text/40 hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Change meal"
            title="Change meal"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 2l3 3-8 8H3v-3L11 2z" />
            </svg>
          </button>
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

      {/* Expandable suggestions section */}
      {expanded && suggestions && (
        <div className="px-3 pb-2 pt-0 border-t border-accent/10">
          <div className="mt-1.5 flex flex-col gap-0.5">
            {suggestions.suggestions.map(s => (
              <PortionSuggestionRow
                key={s.memberId}
                suggestion={s}
                isCurrentUser={s.memberId === currentUserId}
              />
            ))}
            {suggestions.leftoverPercentage > 1 && (
              <div className="flex items-center justify-between text-xs pt-0.5 text-text/40">
                <span>Leftover</span>
                <span>{Math.round(suggestions.leftoverPercentage)}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
