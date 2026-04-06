import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { useMealPlanSlots, useAssignSlot, useClearSlot, useToggleLock } from '../../hooks/useMealPlan'
import { useMeals } from '../../hooks/useMeals'
import { useHouseholdDayLogs } from '../../hooks/useFoodLogs'
import { useNutritionTargets } from '../../hooks/useNutritionTargets'
import { useHouseholdMembers, useMemberProfiles } from '../../hooks/useHousehold'
import { useGeneratePlan, useGenerationJob, useLatestGeneration, useSuggestAlternative } from '../../hooks/usePlanGeneration'
import { useNutritionGaps } from '../../hooks/useNutritionGaps'
import { calcPortionSuggestions } from '../../utils/portionSuggestions'
import { calcIngredientNutrition, calcMealNutrition } from '../../utils/nutrition'
import { computeSwapSuggestions } from '../../utils/swapSuggestions'
import { LogMealModal } from '../log/LogMealModal'
import { DayCard } from './DayCard'
import { DayCarousel } from './DayCarousel'
import { SlotCard } from './SlotCard'
import { SlotShimmer } from './SlotShimmer'
import { GeneratePlanButton } from './GeneratePlanButton'
import { GenerationProgressBar } from './GenerationProgressBar'
import { PriorityOrderPanel, getPriorityOrder } from './PriorityOrderPanel'
import { NutritionGapCard } from './NutritionGapCard'
import { RecipeSuggestionCard } from './RecipeSuggestionCard'
import { GenerationJobBadge } from './GenerationJobBadge'
import { DEFAULT_SLOTS } from '../../utils/mealPlan'
import { useQueryClient } from '@tanstack/react-query'
import type { NutritionTarget, Meal, MealItem } from '../../types/database'
import type { SlotWithMeal } from '../../hooks/useMealPlan'
import type { MemberInput, PortionResult } from '../../utils/portionSuggestions'
import type { SwapSuggestion } from './NutritionGapCard'

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
  slotViolationsByDay?: Map<number, Map<string, { count: number; hasAllergy: boolean }>>
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
 * Mobile: horizontal DayCarousel with scroll-snap.
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
  const toggleLock = useToggleLock()
  const queryClient = useQueryClient()

  // Generation hooks
  const generatePlan = useGeneratePlan()
  const suggestAlternative = useSuggestAlternative()
  const { data: latestGeneration } = useLatestGeneration(planId)
  const { gaps } = useNutritionGaps(planId)

  const swapSuggestions = useMemo(() => {
    if (gaps.length === 0 || !slots.length || !meals.length) return []
    const slotMeals = slots
      .filter(s => s.meals)
      .map(s => s.meals!)
    const allMeals = [...slotMeals, ...meals.filter(m => !slotMeals.some(sm => sm.id === m.id))] as (Meal & { meal_items: MealItem[] })[]
    return computeSwapSuggestions(gaps, slots, allMeals, weekStart, weekStartDay)
  }, [gaps, slots, meals, weekStart, weekStartDay])

  const handleApplySwap = useCallback((swap: SwapSuggestion) => {
    const slotOrder = DEFAULT_SLOTS.indexOf(swap.slotName as typeof DEFAULT_SLOTS[number])
    const order = slotOrder >= 0 ? slotOrder : DEFAULT_SLOTS.length
    assignSlot.mutate({
      planId,
      dayIndex: swap.dayIndex,
      slotName: swap.slotName,
      slotOrder: order,
      mealId: swap.mealId,
      isOverride: true,
    })
  }, [planId, assignSlot])

  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [generationStep, setGenerationStep] = useState(0)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [priorityOrder, setPriorityOrder] = useState<string[]>(() =>
    householdId ? getPriorityOrder(householdId) : []
  )

  const { data: activeJob } = useGenerationJob(activeJobId)

  const isGenerating = activeJob?.status === 'running' || generatePlan.isPending
  const isGenerationComplete = activeJob?.status === 'done'
  const isTimeout = activeJob?.status === 'timeout'

  // Advance progress step while generation runs
  useEffect(() => {
    if (!isGenerating) {
      setGenerationStep(0)
      return
    }
    const interval = setInterval(() => {
      setGenerationStep(prev => Math.min(prev + 1, 3))
    }, 3000)
    return () => clearInterval(interval)
  }, [isGenerating])

  // On job completion: refresh slot data and clear job
  useEffect(() => {
    if (activeJob?.status === 'done' || activeJob?.status === 'timeout' || activeJob?.status === 'error') {
      queryClient.invalidateQueries({ queryKey: ['meal-plan-slots', planId] })
      if (activeJob.status === 'error') {
        setGenerationError('Plan generation failed. Try again.')
      }
      setTimeout(() => setActiveJobId(null), 2000)
    }
  }, [activeJob?.status, planId, queryClient])

  const handleGenerate = useCallback(async () => {
    if (!planId) return
    setGenerationError(null)
    try {
      const result = await generatePlan.mutateAsync({
        planId,
        weekStart,
        priorityOrder: householdId ? getPriorityOrder(householdId) : priorityOrder,
      })
      setActiveJobId(result.jobId)
    } catch {
      setGenerationError('Plan generation failed. Try again.')
    }
  }, [planId, weekStart, householdId, priorityOrder, generatePlan])

  // Recipe count — show suggestion card if fewer than 7
  const recipeCount = useMemo(() => {
    const mealNames = new Set(slots.map(s => s.meals?.name).filter(Boolean))
    return mealNames.size
  }, [slots])

  const suggestedRecipes = useMemo(() => {
    const snapshot = latestGeneration?.constraint_snapshot as Record<string, unknown> | undefined
    return (snapshot?.suggestedRecipes as { name: string; prepMinutes: number; description: string }[] | undefined) ?? []
  }, [latestGeneration])

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

  const [logModalState, setLogModalState] = useState<{
    slot: SlotWithMeal
    suggestedServings?: number
  } | null>(null)

  // Drag-and-drop state
  const [activeSlot, setActiveSlot] = useState<SlotWithMeal | null>(null)
  const [pendingSlots, setPendingSlots] = useState<SlotWithMeal[] | null>(null)
  const [pendingDrop, setPendingDrop] = useState<{
    sourceSlot: SlotWithMeal
    targetSlot: SlotWithMeal
    targetDayIndex: number
    targetSlotName: string
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
  )

  // Use optimistic slots when available
  const displaySlots = pendingSlots ?? slots

  function openPicker(dayIndex: number, slotName: string, isSwap: boolean) {
    setPickerState({ dayIndex, slotName, isSwap })
  }

  async function handleMealSelect(mealId: string) {
    if (!pickerState) return
    const { dayIndex, slotName, isSwap } = pickerState

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

  function handleDragStart(event: DragStartEvent) {
    const slot = event.active.data.current?.slot as SlotWithMeal
    setActiveSlot(slot)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveSlot(null)
    if (!over) return

    const sourceSlot = active.data.current?.slot as SlotWithMeal
    const overData = over.data.current as {
      dayIndex: number
      slotName: string
      currentSlot: SlotWithMeal | null
    }

    // Same slot — no action
    if (sourceSlot.day_index === overData.dayIndex && sourceSlot.slot_name === overData.slotName) return

    // Target is empty: move immediately
    if (!overData.currentSlot?.meal_id) {
      executeMoveToEmpty(sourceSlot, overData.dayIndex, overData.slotName)
      return
    }

    // Target is occupied: show action menu
    setPendingDrop({
      sourceSlot,
      targetSlot: overData.currentSlot,
      targetDayIndex: overData.dayIndex,
      targetSlotName: overData.slotName,
    })
  }

  function executeMoveToEmpty(sourceSlot: SlotWithMeal, targetDayIndex: number, targetSlotName: string) {
    // Optimistic update
    setPendingSlots(prev => {
      const base = prev ?? slots
      return base.map(s => {
        if (s.id === sourceSlot.id) return { ...s, meal_id: null, meals: null }
        if (s.day_index === targetDayIndex && s.slot_name === targetSlotName) {
          return { ...s, meal_id: sourceSlot.meal_id, meals: sourceSlot.meals }
        }
        return s
      })
    })

    const slotOrder = DEFAULT_SLOTS.indexOf(targetSlotName as typeof DEFAULT_SLOTS[number])
    const order = slotOrder >= 0 ? slotOrder : DEFAULT_SLOTS.length

    Promise.all([
      assignSlot.mutateAsync({
        planId,
        dayIndex: targetDayIndex,
        slotName: targetSlotName,
        slotOrder: order,
        mealId: sourceSlot.meal_id!,
        isOverride: false,
      }),
      clearSlot.mutateAsync({ slotId: sourceSlot.id, planId }),
    ]).finally(() => setPendingSlots(null))
  }

  function executeSwap() {
    if (!pendingDrop) return
    const { sourceSlot, targetSlot, targetDayIndex, targetSlotName } = pendingDrop

    // Optimistic update
    setPendingSlots(prev => {
      const base = prev ?? slots
      return base.map(s => {
        if (s.id === sourceSlot.id) return { ...s, meal_id: targetSlot.meal_id, meals: targetSlot.meals }
        if (s.id === targetSlot.id) return { ...s, meal_id: sourceSlot.meal_id, meals: sourceSlot.meals }
        return s
      })
    })
    setPendingDrop(null)

    const targetOrder = DEFAULT_SLOTS.indexOf(targetSlotName as typeof DEFAULT_SLOTS[number])
    const sourceOrder = DEFAULT_SLOTS.indexOf(sourceSlot.slot_name as typeof DEFAULT_SLOTS[number])

    Promise.all([
      assignSlot.mutateAsync({
        planId,
        dayIndex: targetDayIndex,
        slotName: targetSlotName,
        slotOrder: targetOrder >= 0 ? targetOrder : DEFAULT_SLOTS.length,
        mealId: sourceSlot.meal_id!,
        isOverride: false,
      }),
      assignSlot.mutateAsync({
        planId,
        dayIndex: sourceSlot.day_index,
        slotName: sourceSlot.slot_name,
        slotOrder: sourceOrder >= 0 ? sourceOrder : DEFAULT_SLOTS.length,
        mealId: targetSlot.meal_id!,
        isOverride: false,
      }),
    ]).finally(() => setPendingSlots(null))
  }

  function executeReplace() {
    if (!pendingDrop) return
    const { sourceSlot, targetDayIndex, targetSlotName } = pendingDrop

    // Optimistic update
    setPendingSlots(prev => {
      const base = prev ?? slots
      return base.map(s => {
        if (s.id === sourceSlot.id) return { ...s, meal_id: null, meals: null }
        if (s.day_index === targetDayIndex && s.slot_name === targetSlotName) {
          return { ...s, meal_id: sourceSlot.meal_id, meals: sourceSlot.meals }
        }
        return s
      })
    })
    setPendingDrop(null)

    const slotOrder = DEFAULT_SLOTS.indexOf(targetSlotName as typeof DEFAULT_SLOTS[number])
    const order = slotOrder >= 0 ? slotOrder : DEFAULT_SLOTS.length

    Promise.all([
      assignSlot.mutateAsync({
        planId,
        dayIndex: targetDayIndex,
        slotName: targetSlotName,
        slotOrder: order,
        mealId: sourceSlot.meal_id!,
        isOverride: false,
      }),
      clearSlot.mutateAsync({ slotId: sourceSlot.id, planId }),
    ]).finally(() => setPendingSlots(null))
  }

  function handleDropCancel() {
    setPendingDrop(null)
  }

  function handleToggleLock(slotId: string, isLocked: boolean) {
    toggleLock.mutate({ slotId, isLocked, planId })
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

    for (const slot of displaySlots) {
      if (!slot.meals) continue
      const macros = calcSlotMacros(slot.meals)
      const key = `${slot.day_index}:${slot.slot_name}`
      const result = calcPortionSuggestions(memberInputs, macros.calories, macros, currentUserId)
      map.set(key, result)
    }

    return map
  }, [displaySlots, memberInputs, currentUserId])

  // Group slots by day_index
  const slotsByDay: Record<number, typeof displaySlots> = {}
  for (let i = 0; i < DAY_COUNT; i++) {
    slotsByDay[i] = displaySlots.filter(s => s.day_index === i)
  }

  // Compute pendingDropSlotKey for DropActionMenu positioning
  const pendingDropSlotKey = pendingDrop
    ? `${pendingDrop.targetDayIndex}:${pendingDrop.targetSlotName}`
    : null

  const dayCards = Array.from({ length: DAY_COUNT }, (_, i) => {
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
        onAssignSlot={slotName => openPicker(i, slotName, false)}
        onClearSlot={slotId => clearSlot.mutate({ slotId, planId })}
        onSwapSlot={slotName => openPicker(i, slotName, true)}
        onLogSlot={(slot, suggestedServings) => setLogModalState({ slot, suggestedServings })}
        onToggleLock={handleToggleLock}
        onSuggestAlternative={slotName =>
          suggestAlternative.mutate({
            planId,
            weekStart,
            dayIndex: i,
            slotName,
            priorityOrder: householdId ? getPriorityOrder(householdId) : priorityOrder,
          })
        }
        pendingDropSlotKey={pendingDropSlotKey}
        onDropSwap={executeSwap}
        onDropReplace={executeReplace}
        onDropCancel={handleDropCancel}
        slotViolations={slotViolationsByDay?.get(i)}
      />
    )
  })

  return (
    <>
      {/* Generation controls */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <GeneratePlanButton
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            isComplete={isGenerationComplete}
          />
          {latestGeneration?.completed_at && (
            <GenerationJobBadge completedAt={latestGeneration.completed_at} />
          )}
        </div>

        {(isGenerating || isTimeout) && (
          <GenerationProgressBar
            step={generationStep}
            isVisible={isGenerating || isTimeout}
            isTimeout={isTimeout}
          />
        )}

        {generationError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-[--radius-card] px-4 py-3 font-sans">
            {generationError}
          </div>
        )}

        {householdId && (
          <PriorityOrderPanel
            householdId={householdId}
            onOrderChange={setPriorityOrder}
          />
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Mobile: horizontal carousel with scroll-snap */}
        <div className="md:hidden">
          <DayCarousel currentDayIndex={currentDayIndex} onDayChange={setCurrentDayIndex}>
            {isGenerating
              ? dayCards.map((_, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-[--radius-card] border border-accent/30 bg-surface shadow-sm p-4">
                  {DEFAULT_SLOTS.map(slotName => {
                    const slot = displaySlots.find(s => s.day_index === i && s.slot_name === slotName)
                    return slot?.is_locked
                      ? dayCards[i]
                      : <SlotShimmer key={slotName} />
                  })}
                </div>
              ))
              : dayCards}
          </DayCarousel>
        </div>

        {/* Desktop: scrollable stack */}
        <div className="hidden md:flex flex-col gap-4">
          {isGenerating
            ? dayCards.map((_, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-[--radius-card] border border-accent/30 bg-surface shadow-sm p-4">
                {DEFAULT_SLOTS.map(slotName => {
                  const slot = displaySlots.find(s => s.day_index === i && s.slot_name === slotName)
                  return slot?.is_locked
                    ? <div key={slotName}>{dayCards[i]}</div>
                    : <SlotShimmer key={slotName} />
                })}
              </div>
            ))
            : dayCards}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-in' }}>
          {activeSlot ? (
            <div className="shadow-xl scale-105 opacity-95 rounded-lg">
              <SlotCard
                slotName={activeSlot.slot_name}
                slot={activeSlot}
                onAssign={() => {}}
                onClear={() => {}}
                onSwap={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Nutrition gap card — after generation */}
      {latestGeneration && gaps.length > 0 && (
        <div className="mt-4">
          <NutritionGapCard gaps={gaps} swapSuggestions={swapSuggestions} onApplySwap={handleApplySwap} />
        </div>
      )}

      {/* Recipe suggestion card — when catalog is small */}
      {recipeCount < 7 && suggestedRecipes.length > 0 && (
        <div className="mt-4">
          <RecipeSuggestionCard
            suggestions={suggestedRecipes}
            onAdd={() => {}}
          />
        </div>
      )}

      {/* Meal picker modal — outside DndContext */}
      {pickerState && (
        <MealPicker
          meals={meals}
          onSelect={handleMealSelect}
          onClose={() => setPickerState(null)}
        />
      )}

      {/* Log meal modal — outside DndContext */}
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
