import { calcIngredientNutrition, calcMealNutrition, calcDayNutrition } from '../../utils/nutrition'
import { DEFAULT_SLOTS } from '../../utils/mealPlan'
import { ProgressRing } from './ProgressRing'
import { SlotCard } from './SlotCard'
import type { NutritionTarget } from '../../types/database'
import type { SlotWithMeal } from '../../hooks/useMealPlan'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function slotCalories(slot: SlotWithMeal): number {
  const meal = slot.meals
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

interface DayCardProps {
  dayIndex: number
  weekStart: string
  weekStartDay: number
  slots: SlotWithMeal[]
  memberTarget: NutritionTarget | null
  onAssignSlot: (slotName: string) => void
  onClearSlot: (slotId: string) => void
  onSwapSlot: (slotName: string) => void
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
  onAssignSlot,
  onClearSlot,
  onSwapSlot,
}: DayCardProps) {
  // Derive the actual calendar date for this day
  const weekStartDate = new Date(weekStart + 'T00:00:00Z')
  const dayDate = new Date(weekStartDate)
  dayDate.setUTCDate(weekStartDate.getUTCDate() + dayIndex)

  const dayName = DAY_NAMES[(weekStartDay + dayIndex) % 7]
  const dateLabel = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  // Build slot map: slot_name -> SlotWithMeal
  const slotMap = new Map<string, SlotWithMeal>()
  for (const s of slots) {
    slotMap.set(s.slot_name, s)
  }

  // Custom slots: not in DEFAULT_SLOTS
  const customSlots = slots.filter(s => !DEFAULT_SLOTS.includes(s.slot_name as typeof DEFAULT_SLOTS[number]))

  // Day nutrition totals
  const filledSlots = slots.filter(s => s.meals !== null)
  const dayTotal = calcDayNutrition(filledSlots.map(s => slotNutrition(s)))

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
        {DEFAULT_SLOTS.map((slotName, idx) => (
          <SlotCard
            key={slotName}
            slotName={slotName}
            slot={slotMap.get(slotName) ?? null}
            onAssign={() => onAssignSlot(slotName)}
            onClear={() => {
              const s = slotMap.get(slotName)
              if (s) onClearSlot(s.id)
            }}
            onSwap={() => onSwapSlot(slotName)}
          />
        ))}

        {/* Custom slots */}
        {customSlots.map(s => (
          <SlotCard
            key={s.id}
            slotName={s.slot_name}
            slot={s}
            onAssign={() => onAssignSlot(s.slot_name)}
            onClear={() => onClearSlot(s.id)}
            onSwap={() => onSwapSlot(s.slot_name)}
          />
        ))}
      </div>

      {/* Day nutrition bar */}
      <div className="mt-4 pt-3 border-t border-accent/20">
        <div className="flex items-center gap-3">
          {/* Progress rings: cal, protein, carbs, fat */}
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col items-center gap-0.5">
              <ProgressRing value={dayTotal.calories} target={memberTarget?.calories ?? 0} size={36} strokeWidth={4} color="#A8C5A0" />
              <span className="text-[10px] text-text/50">cal</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <ProgressRing value={dayTotal.protein} target={memberTarget?.protein_g ?? 0} size={36} strokeWidth={4} color="#93C5FD" />
              <span className="text-[10px] text-text/50">P</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <ProgressRing value={dayTotal.carbs} target={memberTarget?.carbs_g ?? 0} size={36} strokeWidth={4} color="#FCD34D" />
              <span className="text-[10px] text-text/50">C</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <ProgressRing value={dayTotal.fat} target={memberTarget?.fat_g ?? 0} size={36} strokeWidth={4} color="#F9A8D4" />
              <span className="text-[10px] text-text/50">F</span>
            </div>
          </div>

          {/* Macro numbers */}
          <div className="flex-1 text-xs text-text/50 space-y-0.5">
            <div className="flex gap-3">
              <span>P {Math.round(dayTotal.protein)}g</span>
              <span>C {Math.round(dayTotal.carbs)}g</span>
              <span>F {Math.round(dayTotal.fat)}g</span>
            </div>
            {memberTarget && (
              <div className="flex gap-3 text-[10px] text-text/30">
                <span>/ {memberTarget.protein_g ?? '—'}g</span>
                <span>/ {memberTarget.carbs_g ?? '—'}g</span>
                <span>/ {memberTarget.fat_g ?? '—'}g</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
