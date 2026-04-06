import { useDroppable } from '@dnd-kit/core'
import { calcIngredientNutrition, calcMealNutrition, calcDayNutrition } from '../../utils/nutrition'
import { DEFAULT_SLOTS } from '../../utils/mealPlan'
import { ProgressRing } from './ProgressRing'
import { SlotCard } from './SlotCard'
import { DropActionMenu } from './DropActionMenu'
import type { NutritionTarget } from '../../types/database'
import type { SlotWithMeal } from '../../hooks/useMealPlan'
import type { PortionResult } from '../../utils/portionSuggestions'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function slotNutrition(slot: SlotWithMeal) {
  const meal = slot.meals
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

function DroppableSlot({
  dayIndex,
  slotName,
  children,
  currentSlot,
}: {
  dayIndex: number
  slotName: string
  children: React.ReactNode
  currentSlot: SlotWithMeal | null
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drop-${dayIndex}-${slotName}`,
    data: { dayIndex, slotName, currentSlot },
  })
  return (
    <div
      ref={setNodeRef}
      className={isOver ? 'ring-2 ring-primary/60 rounded-lg bg-primary/5 transition-all' : 'transition-all'}
    >
      {children}
    </div>
  )
}

interface DayCardProps {
  dayIndex: number
  weekStart: string
  weekStartDay: number
  slots: SlotWithMeal[]
  memberTarget: NutritionTarget | null
  currentUserId?: string
  slotSuggestions?: Map<string, PortionResult | null>
  onAssignSlot: (slotName: string) => void
  onClearSlot: (slotId: string) => void
  onSwapSlot: (slotName: string) => void
  onLogSlot?: (slot: SlotWithMeal, suggestedServings?: number) => void
  onToggleLock?: (slotId: string, isLocked: boolean) => void
  pendingDropSlotKey?: string | null
  onDropSwap?: () => void
  onDropReplace?: () => void
  onDropCancel?: () => void
  slotViolations?: Map<string, { count: number; hasAllergy: boolean }>
}

/**
 * Single day card with slot list, nutrition total, and progress rings.
 */
export function DayCard({
  dayIndex,
  weekStart,
  weekStartDay,
  slots,
  memberTarget,
  currentUserId,
  slotSuggestions,
  onAssignSlot,
  onClearSlot,
  onSwapSlot,
  onLogSlot,
  onToggleLock,
  pendingDropSlotKey,
  onDropSwap,
  onDropReplace,
  onDropCancel,
  slotViolations,
}: DayCardProps) {
  const weekStartDate = new Date(weekStart + 'T00:00:00Z')
  const dayDate = new Date(weekStartDate)
  dayDate.setUTCDate(weekStartDate.getUTCDate() + dayIndex)

  const dayName = DAY_NAMES[(weekStartDay + dayIndex) % 7]
  const dateLabel = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  const slotMap = new Map<string, SlotWithMeal>()
  for (const s of slots) {
    slotMap.set(s.slot_name, s)
  }

  const customSlots = slots.filter(s => !DEFAULT_SLOTS.includes(s.slot_name as typeof DEFAULT_SLOTS[number]))

  const filledSlots = slots.filter(s => s.meals !== null)
  const dayTotal = calcDayNutrition(filledSlots.map(s => slotNutrition(s)))

  function getSuggestedServings(slotName: string): number | undefined {
    if (!currentUserId || !slotSuggestions) return undefined
    const result = slotSuggestions.get(slotName)
    if (!result) return undefined
    const suggestion = result.suggestions.find(s => s.memberId === currentUserId)
    return suggestion?.servings
  }

  return (
    <div className="rounded-[--radius-card] border border-accent/30 bg-surface shadow-sm p-4 font-sans">
      {/* Day header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-base font-semibold text-text">{dayName}</span>
          <span className="ml-2 text-sm text-text/50">{dateLabel}</span>
        </div>
        <div className="text-sm font-medium text-text/70">
          {Math.round(dayTotal.calories)} kcal
        </div>
      </div>

      {/* Slots */}
      <div className="flex flex-col gap-2">
        {DEFAULT_SLOTS.map((slotName) => {
          const s = slotMap.get(slotName) ?? null
          const dropKey = `${dayIndex}:${slotName}`
          return (
            <DroppableSlot key={slotName} dayIndex={dayIndex} slotName={slotName} currentSlot={s}>
              <SlotCard
                slotName={slotName}
                slot={s}
                suggestions={slotSuggestions?.get(slotName) ?? null}
                currentUserId={currentUserId}
                memberTarget={memberTarget}
                onAssign={() => onAssignSlot(slotName)}
                onClear={() => {
                  if (s) onClearSlot(s.id)
                }}
                onSwap={() => onSwapSlot(slotName)}
                onLog={s?.meals && onLogSlot
                  ? () => onLogSlot(s, getSuggestedServings(slotName))
                  : undefined}
                isLocked={s?.is_locked}
                onToggleLock={s && onToggleLock ? () => onToggleLock(s.id, !s.is_locked) : undefined}
                violationCount={slotViolations?.get(slotName)?.count}
                hasAllergyViolation={slotViolations?.get(slotName)?.hasAllergy}
              />
              {pendingDropSlotKey === dropKey && onDropSwap && onDropReplace && onDropCancel && (
                <DropActionMenu onSwap={onDropSwap} onReplace={onDropReplace} onCancel={onDropCancel} />
              )}
            </DroppableSlot>
          )
        })}

        {/* Custom slots */}
        {customSlots.map(s => {
          const dropKey = `${dayIndex}:${s.slot_name}`
          return (
            <DroppableSlot key={s.id} dayIndex={dayIndex} slotName={s.slot_name} currentSlot={s}>
              <SlotCard
                slotName={s.slot_name}
                slot={s}
                suggestions={slotSuggestions?.get(s.slot_name) ?? null}
                currentUserId={currentUserId}
                memberTarget={memberTarget}
                onAssign={() => onAssignSlot(s.slot_name)}
                onClear={() => onClearSlot(s.id)}
                onSwap={() => onSwapSlot(s.slot_name)}
                onLog={s.meals && onLogSlot
                  ? () => onLogSlot(s, getSuggestedServings(s.slot_name))
                  : undefined}
                isLocked={s.is_locked}
                onToggleLock={onToggleLock ? () => onToggleLock(s.id, !s.is_locked) : undefined}
                violationCount={slotViolations?.get(s.slot_name)?.count}
                hasAllergyViolation={slotViolations?.get(s.slot_name)?.hasAllergy}
              />
              {pendingDropSlotKey === dropKey && onDropSwap && onDropReplace && onDropCancel && (
                <DropActionMenu onSwap={onDropSwap} onReplace={onDropReplace} onCancel={onDropCancel} />
              )}
            </DroppableSlot>
          )
        })}
      </div>

      {/* Day nutrition bar */}
      <div className="mt-4 pt-3 border-t border-accent/20">
        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center gap-0.5">
            <ProgressRing value={dayTotal.calories} target={memberTarget?.calories ?? 0} size={44} strokeWidth={4} color="#A8C5A0" showValue />
            <span className="text-[10px] text-text/50">cal</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <ProgressRing value={dayTotal.protein} target={memberTarget?.protein_g ?? 0} size={36} strokeWidth={4} color="#93C5FD" showValue />
            <span className="text-[10px] text-text/50">P</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <ProgressRing value={dayTotal.carbs} target={memberTarget?.carbs_g ?? 0} size={36} strokeWidth={4} color="#FCD34D" showValue />
            <span className="text-[10px] text-text/50">C</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <ProgressRing value={dayTotal.fat} target={memberTarget?.fat_g ?? 0} size={36} strokeWidth={4} color="#F9A8D4" showValue />
            <span className="text-[10px] text-text/50">F</span>
          </div>
        </div>
      </div>
    </div>
  )
}
