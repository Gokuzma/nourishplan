import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useMeal,
  useUpdateMeal,
  useAddMealItem,
  useUpdateMealItem,
  useRemoveMealItem,
} from '../../hooks/useMeals'
import { calcIngredientNutrition, calcMealNutrition } from '../../utils/nutrition'
import { FoodSearchOverlay } from '../food/FoodSearchOverlay'
import { NutritionBar } from '../recipe/NutritionBar'
import { MealItemRow } from './MealItemRow'
import type { NormalizedFoodResult, MealItem, MacroSummary } from '../../types/database'

interface MealBuilderProps {
  mealId: string
}

interface QuantityModalProps {
  food: NormalizedFoodResult
  onConfirm: (grams: number) => void
  onCancel: () => void
}

function QuantityModal({ food, onConfirm, onCancel }: QuantityModalProps) {
  const [grams, setGrams] = useState<string>(
    food.portions && food.portions.length > 0 ? String(food.portions[0].grams) : '100'
  )
  const [selectedPortion, setSelectedPortion] = useState<string>(
    food.portions && food.portions.length > 0 ? food.portions[0].description : 'custom'
  )

  function handlePortionChange(desc: string) {
    setSelectedPortion(desc)
    if (desc !== 'custom' && food.portions) {
      const portion = food.portions.find(p => p.description === desc)
      if (portion) setGrams(String(portion.grams))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(grams)
    if (!isNaN(parsed) && parsed > 0) {
      onConfirm(parsed)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm p-5 mx-0 sm:mx-4">
        <h2 className="font-bold text-lg text-primary mb-1">Set quantity</h2>
        <p className="text-sm text-text/60 mb-4 truncate">{food.name}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {food.portions && food.portions.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text/60">Portion</label>
              <select
                value={selectedPortion}
                onChange={e => handlePortionChange(e.target.value)}
                className="rounded-[--radius-btn] border border-accent/30 bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {food.portions.map(p => (
                  <option key={p.description} value={p.description}>
                    {p.description} ({p.grams}g)
                  </option>
                ))}
                <option value="custom">Custom (grams)</option>
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text/60">Grams</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={grams}
              onChange={e => { setSelectedPortion('custom'); setGrams(e.target.value) }}
              className="rounded-[--radius-btn] border border-accent/30 bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-[--radius-btn] border border-secondary py-2 text-sm text-text/60 hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-[--radius-btn] bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EditQuantityModalProps {
  item: MealItem
  onConfirm: (grams: number) => void
  onCancel: () => void
}

function EditQuantityModal({ item, onConfirm, onCancel }: EditQuantityModalProps) {
  const [grams, setGrams] = useState<string>(String(item.quantity_grams))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(grams)
    if (!isNaN(parsed) && parsed > 0) {
      onConfirm(parsed)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm p-5 mx-0 sm:mx-4">
        <h2 className="font-bold text-lg text-primary mb-4">Edit quantity</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text/60">Grams</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={grams}
              onChange={e => setGrams(e.target.value)}
              className="rounded-[--radius-btn] border border-accent/30 bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-[--radius-btn] border border-secondary py-2 text-sm text-text/60 hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-[--radius-btn] bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Meal builder component.
 * Manages item list, food search overlay, and live total nutrition bar.
 * Unlike RecipeBuilder, meals have no servings — NutritionBar shows total nutrition.
 */
export function MealBuilder({ mealId }: MealBuilderProps) {
  const navigate = useNavigate()
  const { data: meal, isPending: mealPending } = useMeal(mealId)

  const updateMeal = useUpdateMeal()
  const addMealItem = useAddMealItem()
  const updateMealItem = useUpdateMealItem()
  const removeMealItem = useRemoveMealItem()

  const [localName, setLocalName] = useState<string | null>(null)
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [pendingFood, setPendingFood] = useState<NormalizedFoodResult | null>(null)
  const [editingItem, setEditingItem] = useState<MealItem | null>(null)

  const displayName = localName ?? meal?.name ?? ''
  const items = meal?.meal_items ?? []

  function handleNameBlur() {
    if (!meal || localName === null) return
    const trimmed = localName.trim()
    if (trimmed && trimmed !== meal.name) {
      updateMeal.mutate({ id: meal.id, name: trimmed })
    }
    setLocalName(null)
  }

  function handleFoodSelected(food: NormalizedFoodResult) {
    setShowFoodSearch(false)
    setPendingFood(food)
  }

  function handleQuantityConfirm(grams: number) {
    if (!pendingFood) return

    const food = pendingFood
    const nextOrder = items.length

    addMealItem.mutate({
      meal_id: mealId,
      item_type: food.source === 'custom' ? 'food' : 'food',
      item_id: food.id,
      quantity_grams: grams,
      calories_per_100g: food.calories,
      protein_per_100g: food.protein,
      fat_per_100g: food.fat,
      carbs_per_100g: food.carbs,
      sort_order: nextOrder,
    })

    setPendingFood(null)
  }

  function handleEditConfirm(grams: number) {
    if (!editingItem) return
    updateMealItem.mutate({
      id: editingItem.id,
      meal_id: editingItem.meal_id,
      quantity_grams: grams,
    })
    setEditingItem(null)
  }

  function handleRemove(item: MealItem) {
    removeMealItem.mutate({ id: item.id, meal_id: item.meal_id })
  }

  const totalNutrition = useMemo((): MacroSummary => {
    if (!items || items.length === 0) return { calories: 0, protein: 0, fat: 0, carbs: 0 }

    const withNutrition = items.map(item => ({
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

    return calcMealNutrition(withNutrition)
  }, [items])

  if (mealPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text/50 font-sans text-sm">Loading meal…</p>
      </div>
    )
  }

  if (!meal) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text/50 font-sans text-sm">Meal not found.</p>
      </div>
    )
  }

  return (
    <>
      <div className="px-4 py-6 pb-28 font-sans max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate('/meals')}
          className="mb-4 text-sm text-text/50 hover:text-text transition-colors flex items-center gap-1"
        >
          ← Meals
        </button>

        {/* Meal name */}
        <div className="mb-6">
          <input
            type="text"
            value={displayName}
            onChange={e => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Meal name"
            className="text-2xl font-bold text-primary bg-transparent border-b border-secondary focus:border-primary focus:outline-none py-1 w-full"
          />
        </div>

        {/* Item list */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-text mb-3">Items</h2>
          {items.length === 0 ? (
            <p className="text-sm text-text/50 text-center py-8">
              No items yet. Add one below.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map(item => (
                <MealItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingItem(item)}
                  onRemove={() => handleRemove(item)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Search food trigger */}
        <button
          onClick={() => setShowFoodSearch(true)}
          className="w-full rounded-[--radius-card] bg-surface border border-secondary px-4 py-3 flex items-center gap-2 text-left hover:border-primary/40 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text/40 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-sm text-text/40">Search ingredients</span>
        </button>
      </div>

      {/* Sticky nutrition bar — shows total (not per-serving) */}
      <NutritionBar macros={totalNutrition} />

      {/* Food search overlay */}
      {showFoodSearch && (
        <FoodSearchOverlay
          mode="select"
          onSelect={(food) => {
            handleFoodSelected(food)
          }}
          onClose={() => setShowFoodSearch(false)}
        />
      )}

      {/* Quantity modal after food selection */}
      {pendingFood && (
        <QuantityModal
          food={pendingFood}
          onConfirm={handleQuantityConfirm}
          onCancel={() => setPendingFood(null)}
        />
      )}

      {/* Edit quantity modal */}
      {editingItem && (
        <EditQuantityModal
          item={editingItem}
          onConfirm={handleEditConfirm}
          onCancel={() => setEditingItem(null)}
        />
      )}
    </>
  )
}
