import { useState, useRef, useMemo } from 'react'
import { useMealPlanSlots, useAssignSlot, useClearSlot } from '../../hooks/useMealPlan'
import { useMeals } from '../../hooks/useMeals'
import { useHouseholdDayLogs } from '../../hooks/useFoodLogs'
import { useNutritionTargets } from '../../hooks/useNutritionTargets'
import { useHouseholdMembers, useMemberProfiles } from '../../hooks/useHousehold'
import { calcPortionSuggestions } from '../../utils/portionSuggestions'
import { calcIngredientNutrition, calcMealNutrition } from '../../utils/nutrition'
import { LogMealModal } from '../log/LogMealModal'
import { DayCard } from './DayCard'
import type { NutritionTarget, Meal, MealItem } from '../../types/database'
import type { SlotWithMeal } from '../../hooks/useMealPlan'
import type { MemberInput, PortionResult } from '../../utils/portionSuggestions'

const DAY_COUNT = 7

interface MealPickerProps {
  meals: Meal[]
  onSelect: (mealId: string) => void
  onClose: () => void
}

function MealPicker({ meals, onSelect, onClose }: MealPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-accent/20">
          <h3 className="font-semibold text-text font-sans">Choose a Meal</h3>
          <button
            onClick={onClose}
            className="text-text/40 hover:text-text transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-1">
          {meals.length === 0 ? (
            <p className="text-sm text-text/50 text-center py-8 font-sans">No meals yet. Create meals first.</p>
          ) : (
            meals.map(meal => (
              <button
                key={meal.id}
                onClick={() => onSelect(meal.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-primary/5 text-sm text-text font-sans transition-colors"
              >
                {meal.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

interface SlotViolationCounts {
  count: number
  hasAllergy: boolean
}

interface PlanGridProps {
  planId: string
  weekStart: string
  weekStartDay: number
  memberTarget: NutritionTarget | null
  householdId?: string
  currentUserId?: string
  selectedMemberId?: string
  selectedMemberType?: 'user' | 'profile'
  logDate?: string
  slotViolationsByDay?: Map<number, Map<string, SlotViolationCounts>>
}

function calcSlotMacros(meal: (Meal & { meal_items: MealItem[] }) | null) {
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
 * Week grid orchestrating DayCards.
 * Mobile: single DayCard visible at a time with swipe navigation.
 * Desktop (md+): vertical scrollable stack of all 7 DayCards.
 *
 * Fetches household targets + today's logs once at grid level, then
 * computes per-slot portion suggestions synchronously in useMemo.
 */
export function PlanGrid({
  planId,
  weekStart,
  weekStartDay,
  memberTarget,
  householdId,
  currentUserId,
  selectedMemberId,
  selectedMemberType,
  logDate,
  slotViolationsByDay,
}: PlanGridProps) {
  const { data: slots = [] } = useMealPlanSlots(planId)
  const { data: meals = [] } = useMeals()
  const assignSlot = useAssignSlot()
  const clearSlot = useClearSlot()

  // Suggestion data — fetched once for the whole grid
  const today = logDate ?? new Date().toISOString().slice(0, 10)
  const { data: targets } = useNutritionTargets(householdId)
  const { data: allLogs } = useHouseholdDayLogs(householdId, today)
  const { data: householdMembers } = useHouseholdMembers()
  const { data: memberProfiles } = useMemberProfiles()

  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [pickerState, setPickerState] = useState<{
    dayIndex: number
    slotName: string
    isSwap: boolean
  } | null>(null)

  // Log modal state
  const [logModalState, setLogModalState] = useState<{
    slot: SlotWithMeal
    suggestedServings?: number
  } | null>(null)

  // Touch swipe state
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    touchStartX.current = null
    if (delta > 50) {
      setCurrentDayIndex(d => Math.min(d + 1, DAY_COUNT - 1))
    } else if (delta < -50) {
      setCurrentDayIndex(d => Math.max(d - 1, 0))
    }
  }

  function openPicker(dayIndex: number, slotName: string, isSwap: boolean) {
    setPickerState({ dayIndex, slotName, isSwap })
  }

  async function handleMealSelect(mealId: string) {
    if (!pickerState) return
    const { dayIndex, slotName, isSwap } = pickerState

    // Determine slot_order: index in DEFAULT_SLOTS or next available
    const { DEFAULT_SLOTS } = await import('../../utils/mealPlan')
    const slotOrder = DEFAULT_SLOTS.indexOf(slotName as typeof DEFAULT_SLOTS[number])
    const order = slotOrder >= 0 ? slotOrder : DEFAULT_SLOTS.length

    await assignSlot.mutateAsync({
      planId,
      dayIndex,
      slotName,
      slotOrder: order,
      mealId,
      isOverride: isSwap,
    })
    setPickerState(null)
  }

  // Build MemberInput array from fetched data (memoized — rebuilds when data changes)
  const memberInputs = useMemo<MemberInput[]>(() => {
    if (!targets || !allLogs || !householdMembers) return []

    const inputs: MemberInput[] = []

    for (const hm of householdMembers) {
      const target = targets.find(t => t.user_id === hm.user_id) ?? null
      const logsToday = allLogs.filter(l => l.member_user_id === hm.user_id)
      const name = hm.profiles?.display_name ?? hm.user_id.slice(0, 8)
      inputs.push({
        memberId: hm.user_id,
        memberName: name,
        memberType: 'user',
        target,
        logsToday,
      })
    }

    for (const profile of (memberProfiles ?? [])) {
      const target = targets.find(t => t.member_profile_id === profile.id) ?? null
      const logsToday = allLogs.filter(l => l.member_profile_id === profile.id)
      inputs.push({
        memberId: profile.id,
        memberName: profile.name,
        memberType: 'profile',
        target,
        logsToday,
      })
    }

    return inputs
  }, [targets, allLogs, householdMembers, memberProfiles])

  // Compute per-slot suggestions keyed by "dayIndex:slotName"
  const slotSuggestionsMap = useMemo<Map<string, PortionResult | null>>(() => {
    const map = new Map<string, PortionResult | null>()
    if (!currentUserId || memberInputs.length === 0) return map

    for (const slot of slots) {
      if (!slot.meals) continue
      const macros = calcSlotMacros(slot.meals)
      const key = `${slot.day_index}:${slot.slot_name}`
      const result = calcPortionSuggestions(memberInputs, macros.calories, macros, currentUserId)
      map.set(key, result)
    }

    return map
  }, [slots, memberInputs, currentUserId])

  // Group slots by day_index
  const slotsByDay: Record<number, typeof slots> = {}
  for (let i = 0; i < DAY_COUNT; i++) {
    slotsByDay[i] = slots.filter(s => s.day_index === i)
  }

  const dayCards = Array.from({ length: DAY_COUNT }, (_, i) => {
    // Build per-slot suggestions map for this day (keyed by slot_name)
    const daySuggestions = new Map<string, PortionResult | null>()
    for (const slot of (slotsByDay[i] ?? [])) {
      const key = `${i}:${slot.slot_name}`
      if (slotSuggestionsMap.has(key)) {
        daySuggestions.set(slot.slot_name, slotSuggestionsMap.get(key) ?? null)
      }
    }

    return (
      <DayCard
        key={i}
        dayIndex={i}
        weekStart={weekStart}
        weekStartDay={weekStartDay}
        slots={slotsByDay[i]}
        memberTarget={memberTarget}
        currentUserId={currentUserId}
        slotSuggestions={daySuggestions}
        slotViolations={slotViolationsByDay?.get(i)}
        onAssignSlot={slotName => openPicker(i, slotName, false)}
        onClearSlot={slotId => clearSlot.mutate({ slotId, planId })}
        onSwapSlot={slotName => openPicker(i, slotName, true)}
        onLogSlot={(slot, suggestedServings) => setLogModalState({ slot, suggestedServings })}
      />
    )
  })

  return (
    <>
      {/* Mobile: single card with swipe */}
      <div
        className="md:hidden min-h-[70vh]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Indicator dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {Array.from({ length: DAY_COUNT }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentDayIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentDayIndex ? 'bg-primary' : 'bg-accent/40'
              }`}
              aria-label={`Go to day ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setCurrentDayIndex(d => Math.max(d - 1, 0))}
            disabled={currentDayIndex === 0}
            className="p-2 rounded-full text-text/40 hover:text-text hover:bg-accent/10 disabled:opacity-20 transition-colors"
          >
            &larr;
          </button>
          <div className="flex-1">
            {dayCards[currentDayIndex]}
          </div>
          <button
            onClick={() => setCurrentDayIndex(d => Math.min(d + 1, DAY_COUNT - 1))}
            disabled={currentDayIndex === DAY_COUNT - 1}
            className="p-2 rounded-full text-text/40 hover:text-text hover:bg-accent/10 disabled:opacity-20 transition-colors"
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Desktop: scrollable stack */}
      <div className="hidden md:flex flex-col gap-4">
        {dayCards}
      </div>

      {/* Meal picker modal */}
      {pickerState && (
        <MealPicker
          meals={meals}
          onSelect={handleMealSelect}
          onClose={() => setPickerState(null)}
        />
      )}

      {/* Log meal modal */}
      {logModalState && logModalState.slot.meals && selectedMemberId && (
        <LogMealModal
          isOpen={true}
          onClose={() => setLogModalState(null)}
          meal={logModalState.slot.meals}
          slotName={logModalState.slot.slot_name}
          logDate={today}
          memberId={selectedMemberId}
          memberType={selectedMemberType ?? 'user'}
          suggestedServings={logModalState.suggestedServings}
        />
      )}
    </>
  )
}
