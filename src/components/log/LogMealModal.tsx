import { useState, useEffect, useRef } from 'react'
import { PortionStepper } from './PortionStepper'
import { useInsertFoodLog } from '../../hooks/useFoodLogs'
import { calcIngredientNutrition, calcMealNutrition } from '../../utils/nutrition'
import type { Meal, MealItem } from '../../types/database'

interface LogMealModalProps {
  isOpen: boolean
  onClose: () => void
  meal: Meal & { meal_items: MealItem[] }
  slotName: string
  logDate: string
  memberId: string
  memberType: 'user' | 'profile'
  suggestedServings?: number
}

function calcMealMacros(meal_items: MealItem[]) {
  const items = meal_items.map(item => ({
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

export function LogMealModal({
  isOpen,
  onClose,
  meal,
  slotName,
  logDate,
  memberId,
  memberType,
  suggestedServings,
}: LogMealModalProps) {
  const [servings, setServings] = useState(
    suggestedServings !== undefined ? Math.round(suggestedServings * 10) / 10 : 1.0
  )
  const [isPrivate, setIsPrivate] = useState(false)
  // Track whether user has manually adjusted the stepper
  const hasUserEdited = useRef(false)

  // If suggestedServings arrives async (e.g. data loads after modal opens),
  // update the stepper only if the user hasn't touched it yet.
  useEffect(() => {
    if (suggestedServings !== undefined && !hasUserEdited.current) {
      setServings(Math.round(suggestedServings * 10) / 10)
    }
  }, [suggestedServings])

  function handleServingsChange(value: number) {
    hasUserEdited.current = true
    setServings(value)
  }

  const insertLog = useInsertFoodLog()
  const macros = calcMealMacros(meal.meal_items)

  if (!isOpen) return null

  async function handleLog() {
    try {
      await insertLog.mutateAsync({
        ...(memberType === 'user'
          ? { member_user_id: memberId }
          : { member_profile_id: memberId }),
        log_date: logDate,
        slot_name: slotName,
        meal_id: meal.id,
        item_type: 'meal',
        item_id: meal.id,
        item_name: meal.name,
        servings_logged: servings,
        calories_per_serving: macros.calories,
        protein_per_serving: macros.protein,
        fat_per_serving: macros.fat,
        carbs_per_serving: macros.carbs,
        micronutrients: {},
        is_private: isPrivate,
      })
      onClose()
    } catch {
      // Error is surfaced via insertLog.isError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg text-primary">{meal.name}</h2>
            <p className="text-sm text-text/50">{slotName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text/40 hover:text-text transition-colors p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Nutrition summary */}
        <div className="flex gap-4 mb-4 p-3 rounded-[--radius-card] bg-secondary/20">
          <div className="text-center flex-1">
            <p className="text-xs text-text/50">Calories</p>
            <p className="font-semibold text-text">{Math.round(macros.calories * servings)}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-text/50">Protein</p>
            <p className="font-semibold text-text">{(macros.protein * servings).toFixed(1)}g</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-text/50">Carbs</p>
            <p className="font-semibold text-text">{(macros.carbs * servings).toFixed(1)}g</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-text/50">Fat</p>
            <p className="font-semibold text-text">{(macros.fat * servings).toFixed(1)}g</p>
          </div>
        </div>

        {/* Portion stepper */}
        <div className="mb-4">
          <p className="text-sm font-medium text-text/70 mb-2">Servings</p>
          <PortionStepper value={servings} onChange={handleServingsChange} />
        </div>

        {/* Privacy toggle */}
        <label className="flex items-center gap-2 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
            className="rounded border-secondary accent-primary"
          />
          <span className="text-sm text-text/70">Mark as private</span>
        </label>

        {/* Error state */}
        {insertLog.isError && (
          <p className="text-sm text-red-500 mb-3">Failed to log meal. Please try again.</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-[--radius-btn] border border-secondary py-2.5 text-sm text-text/60 hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLog}
            disabled={insertLog.isPending}
            className="flex-1 rounded-[--radius-btn] bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {insertLog.isPending ? 'Logging...' : 'Log Meal'}
          </button>
        </div>
      </div>
    </div>
  )
}
