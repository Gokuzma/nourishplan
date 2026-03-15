import { useState } from 'react'
import { PortionStepper } from './PortionStepper'
import type { PortionUnit } from './PortionStepper'
import { FoodSearch } from '../food/FoodSearch'
import { useInsertFoodLog } from '../../hooks/useFoodLogs'
import type { NormalizedFoodResult } from '../../types/database'

interface FreeformLogModalProps {
  isOpen: boolean
  onClose: () => void
  logDate: string
  memberId: string
  memberType: 'user' | 'profile'
}

type Step = 'search' | 'confirm'

const GRAMS_UNIT: PortionUnit = { description: 'grams', grams: 1 }

function buildUnits(food: NormalizedFoodResult): PortionUnit[] {
  if (!food.portions || food.portions.length === 0) return []
  // Map portions to PortionUnit; append grams as fallback
  const units: PortionUnit[] = food.portions.map(p => ({
    description: p.description,
    grams: p.grams,
  }))
  units.push(GRAMS_UNIT)
  return units
}

export function FreeformLogModal({
  isOpen,
  onClose,
  logDate,
  memberId,
  memberType,
}: FreeformLogModalProps) {
  const [step, setStep] = useState<Step>('search')
  const [selectedFood, setSelectedFood] = useState<NormalizedFoodResult | null>(null)
  const [quantity, setQuantity] = useState(1.0)
  const [selectedUnit, setSelectedUnit] = useState<PortionUnit>(GRAMS_UNIT)
  const [isPrivate, setIsPrivate] = useState(false)

  const insertLog = useInsertFoodLog()

  if (!isOpen) return null

  function handleFoodSelect(food: NormalizedFoodResult) {
    setSelectedFood(food)
    setQuantity(1.0)
    // Default to first household serving unit, fall back to grams
    const units = buildUnits(food)
    setSelectedUnit(units.length > 0 ? units[0] : GRAMS_UNIT)
    setStep('confirm')
  }

  function handleBack() {
    setStep('search')
    setSelectedFood(null)
    insertLog.reset()
  }

  // Compute total grams from quantity × selected unit
  function totalGrams(): number {
    return quantity * selectedUnit.grams
  }

  // Scale per-100g macros by total grams
  function scaledMacro(per100g: number): number {
    return (totalGrams() / 100) * per100g
  }

  async function handleLog() {
    if (!selectedFood) return

    // Per-unit macros: calories for one unit of the selected portion (e.g. 1 cup)
    const caloriesPerServing = (selectedUnit.grams / 100) * selectedFood.calories
    const proteinPerServing = (selectedUnit.grams / 100) * selectedFood.protein
    const fatPerServing = (selectedUnit.grams / 100) * selectedFood.fat
    const carbsPerServing = (selectedUnit.grams / 100) * selectedFood.carbs

    // item_type: custom foods use 'food', external sources use their source string
    const itemType = selectedFood.source === 'custom' ? 'food' : selectedFood.source

    try {
      await insertLog.mutateAsync({
        ...(memberType === 'user'
          ? { member_user_id: memberId }
          : { member_profile_id: memberId }),
        log_date: logDate,
        slot_name: null,
        meal_id: null,
        item_type: itemType,
        item_id: selectedFood.id,
        item_name: selectedFood.name,
        servings_logged: quantity,
        calories_per_serving: caloriesPerServing,
        protein_per_serving: proteinPerServing,
        fat_per_serving: fatPerServing,
        carbs_per_serving: carbsPerServing,
        micronutrients: Object.fromEntries(
          Object.entries(selectedFood.micronutrients ?? {}).map(
            ([key, val]) => [key, (selectedUnit.grams / 100) * val]
          )
        ),
        serving_unit: selectedUnit.description,
        is_private: isPrivate,
      })
      onClose()
      setStep('search')
      setSelectedFood(null)
    } catch {
      // Error is surfaced via insertLog.isError
    }
  }

  const units = selectedFood ? buildUnits(selectedFood) : []
  const hasUnits = units.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {step === 'confirm' && (
              <button
                onClick={handleBack}
                className="text-text/40 hover:text-text transition-colors p-1"
                aria-label="Back to search"
              >
                &#8592;
              </button>
            )}
            <h2 className="font-bold text-lg text-primary">
              {step === 'search' ? 'Log Food' : 'Confirm Serving'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text/40 hover:text-text transition-colors p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {step === 'search' && (
          <FoodSearch mode="select" onSelect={handleFoodSelect} />
        )}

        {step === 'confirm' && selectedFood && (
          <div className="flex flex-col gap-4">
            {/* Item info */}
            <div>
              <p className="font-semibold text-text">{selectedFood.name}</p>
              <p className="text-xs text-text/50 mt-0.5">
                Per 100g: {Math.round(selectedFood.calories)} kcal &middot; P {selectedFood.protein.toFixed(1)}g &middot; C {selectedFood.carbs.toFixed(1)}g &middot; F {selectedFood.fat.toFixed(1)}g
              </p>
            </div>

            {/* Nutrition preview scaled by quantity × unit */}
            <div className="flex gap-4 p-3 rounded-[--radius-card] bg-secondary/20">
              <div className="text-center flex-1">
                <p className="text-xs text-text/50">Calories</p>
                <p className="font-semibold text-text">{Math.round(scaledMacro(selectedFood.calories))}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-xs text-text/50">Protein</p>
                <p className="font-semibold text-text">{scaledMacro(selectedFood.protein).toFixed(1)}g</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-xs text-text/50">Carbs</p>
                <p className="font-semibold text-text">{scaledMacro(selectedFood.carbs).toFixed(1)}g</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-xs text-text/50">Fat</p>
                <p className="font-semibold text-text">{scaledMacro(selectedFood.fat).toFixed(1)}g</p>
              </div>
            </div>

            {/* Portion stepper */}
            <div>
              <p className="text-sm font-medium text-text/70 mb-2">
                {hasUnits ? 'Amount' : 'Servings'}
              </p>
              <PortionStepper
                value={quantity}
                onChange={setQuantity}
                units={hasUnits ? units : undefined}
                selectedUnit={hasUnits ? selectedUnit : undefined}
                onUnitChange={hasUnits ? setSelectedUnit : undefined}
              />
            </div>

            {/* Privacy toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
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
              <p className="text-sm text-red-500">Failed to log food. Please try again.</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 rounded-[--radius-btn] border border-secondary py-2.5 text-sm text-text/60 hover:text-text transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleLog}
                disabled={insertLog.isPending}
                className="flex-1 rounded-[--radius-btn] bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {insertLog.isPending ? 'Logging...' : 'Log Food'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
