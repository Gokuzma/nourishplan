import { useState, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { calcIngredientNutrition, calcMealNutrition } from '../../utils/nutrition'
import { ProgressRing } from './ProgressRing'
import { PortionSuggestionRow } from './PortionSuggestionRow'
import { DragHandle } from './DragHandle'
import { LockBadge } from './LockBadge'
import { AIRationaleTooltip } from './AIRationaleTooltip'
import { FreezerBadge } from './FreezerBadge'
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
  onSuggestAlternative?: () => void
  suggestions?: PortionResult | null
  currentUserId?: string
  memberTarget?: NutritionTarget | null
  isLocked?: boolean
  onToggleLock?: () => void
  violationCount?: number
  hasAllergyViolation?: boolean
  scheduleStatus?: 'prep' | 'consume' | 'quick' | 'away'
  isFreezerFriendly?: boolean
  onCook?: () => void
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

function OccupiedSlotCard({ slotName, slot, onAssign, onClear, onSwap, onLog, onSuggestAlternative, suggestions, currentUserId, memberTarget, isLocked, onToggleLock, violationCount, hasAllergyViolation, isFreezerFriendly, onCook }: SlotCardProps & { slot: SlotWithMeal }) {
  const [expanded, setExpanded] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const tooltipId = `rationale-${slot.id}`
  const generation_rationale = slot.generation_rationale ?? null
  const handleCloseTooltip = useCallback(() => setTooltipOpen(false), [])
  const meal = slot.meals ?? null
  const nutrition = calcSlotNutrition(meal)
  const calories = nutrition.calories

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot-${slot.id}`,
    data: { slot },
  })

  const isDeletedMeal = slot?.meal_id != null && !meal

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
    <div
      ref={setNodeRef}
      className={`relative rounded-lg border bg-surface shadow-sm ${isDragging ? 'opacity-50 border-dashed border-accent/30' : 'border-accent/30'} ${isLocked ? 'border-l-[3px] border-l-primary' : ''}`}
    >
      {/* Main row */}
      <div
        className="flex items-center justify-between py-2 px-3"
        onMouseEnter={generation_rationale ? () => setTooltipOpen(true) : undefined}
        onMouseLeave={generation_rationale ? () => setTooltipOpen(false) : undefined}
        onClick={generation_rationale ? () => setTooltipOpen(o => !o) : undefined}
        aria-describedby={generation_rationale ? tooltipId : undefined}
      >
        <DragHandle
          listeners={listeners as Record<string, Function>}
          attributes={attributes as Record<string, unknown>}
          ariaLabel={`Drag to reorder ${slotName}`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text truncate font-sans">
            {meal!.name}
            {violationCount && violationCount > 0 ? (
              <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[9px] font-bold leading-none align-middle ${hasAllergyViolation ? 'bg-red-500' : 'bg-amber-500'}`}>
                {violationCount}
              </span>
            ) : null}
          </p>
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
          {isFreezerFriendly && (
            <FreezerBadge variant="icon-only" className="mr-1" />
          )}
          {hasExpandableSuggestions && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(e2 => !e2) }}
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
          {onToggleLock && (
            <LockBadge isLocked={!!isLocked} onToggle={onToggleLock} />
          )}
          {onLog && (
            <button
              onClick={e => { e.stopPropagation(); onLog() }}
              className="p-1 rounded text-text/40 hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="Log meal"
              title="Log meal"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v12M2 8h12" />
              </svg>
            </button>
          )}
          {onSuggestAlternative && (
            <button
              onClick={e => { e.stopPropagation(); onSuggestAlternative() }}
              className="p-1 rounded text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors text-xs font-sans"
              aria-label="Suggest alternative"
              title="Suggest alternative"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 8a6 6 0 1 0 12 0" strokeLinecap="round" />
                <path d="M12 4l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onSwap() }}
            className="p-1 rounded text-text/40 hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Change meal"
            title="Change meal"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 2l3 3-8 8H3v-3L11 2z" />
            </svg>
          </button>
          {onCook && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCook() }}
              className="p-1 rounded text-text/40 hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="Cook this meal"
              title="Cook this meal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
                <line x1="6" y1="17" x2="18" y2="17" />
              </svg>
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onClear() }}
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
      {generation_rationale && (
        <AIRationaleTooltip
          id={tooltipId}
          text={generation_rationale}
          isOpen={tooltipOpen}
          onClose={handleCloseTooltip}
        />
      )}

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

/**
 * Single meal slot card showing assigned meal name + calories, or an empty state.
 * When suggestions are provided, shows the current user's portion inline with an
 * expandable section to see all household members' suggestions.
 */
export function SlotCard(props: SlotCardProps) {
  const { slotName, slot, onAssign } = props

  if (!slot?.meal_id && !slot?.meals) {
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

  return <OccupiedSlotCard {...props} slot={slot} />
}
