import { useState, useMemo } from 'react'
import {
  useRecipe,
  useRecipeIngredients,
  useUpdateRecipe,
  useAddIngredient,
  useUpdateIngredient,
  useRemoveIngredient,
} from '../../hooks/useRecipes'
import { calcIngredientNutrition, calcRecipePerServing } from '../../utils/nutrition'
import { FoodSearch } from '../food/FoodSearch'
import { NutritionBar } from './NutritionBar'
import { IngredientRow } from './IngredientRow'
import type { NormalizedFoodResult, MacroSummary, RecipeIngredient } from '../../types/database'

interface RecipeBuilderProps {
  recipeId: string
}

interface FoodDataEntry {
  name: string
  macros: MacroSummary
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
  ingredient: RecipeIngredient
  onConfirm: (grams: number) => void
  onCancel: () => void
}

function EditQuantityModal({ ingredient, onConfirm, onCancel }: EditQuantityModalProps) {
  const [grams, setGrams] = useState<string>(String(ingredient.quantity_grams))

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
 * Main recipe builder component.
 * Manages ingredient list, food search overlay, and live per-serving nutrition bar.
 */
export function RecipeBuilder({ recipeId }: RecipeBuilderProps) {
  const { data: recipe, isPending: recipePending } = useRecipe(recipeId)
  const { data: ingredients, isPending: ingredientsPending } = useRecipeIngredients(recipeId)

  const updateRecipe = useUpdateRecipe()
  const addIngredient = useAddIngredient()
  const updateIngredient = useUpdateIngredient()
  const removeIngredient = useRemoveIngredient()

  const [localName, setLocalName] = useState<string | null>(null)
  const [localServings, setLocalServings] = useState<string | null>(null)
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [pendingFood, setPendingFood] = useState<NormalizedFoodResult | null>(null)
  const [editingIngredient, setEditingIngredient] = useState<RecipeIngredient | null>(null)
  const [foodDataMap, setFoodDataMap] = useState<Record<string, FoodDataEntry>>({})

  const displayName = localName ?? recipe?.name ?? ''
  const displayServings = localServings ?? String(recipe?.servings ?? 1)

  function handleNameBlur() {
    if (!recipe || localName === null) return
    const trimmed = localName.trim()
    if (trimmed && trimmed !== recipe.name) {
      updateRecipe.mutate({ id: recipe.id, updates: { name: trimmed } })
    }
    setLocalName(null)
  }

  function handleServingsBlur() {
    if (!recipe || localServings === null) return
    const parsed = parseInt(localServings, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed !== recipe.servings) {
      updateRecipe.mutate({ id: recipe.id, updates: { servings: parsed } })
    }
    setLocalServings(null)
  }

  function handleFoodSelected(food: NormalizedFoodResult) {
    setShowFoodSearch(false)
    setPendingFood(food)
  }

  function handleQuantityConfirm(grams: number) {
    if (!pendingFood) return

    const food = pendingFood
    const macros: MacroSummary = {
      calories: food.calories,
      protein: food.protein,
      fat: food.fat,
      carbs: food.carbs,
    }

    setFoodDataMap(prev => ({
      ...prev,
      [food.id]: { name: food.name, macros },
    }))

    const nextOrder = (ingredients?.length ?? 0)
    addIngredient.mutate({
      recipe_id: recipeId,
      ingredient_type: 'food',
      ingredient_id: food.id,
      quantity_grams: grams,
      weight_state: 'raw',
      sort_order: nextOrder,
    })

    setPendingFood(null)
  }

  function handleEditConfirm(grams: number) {
    if (!editingIngredient) return
    updateIngredient.mutate({
      id: editingIngredient.id,
      recipe_id: editingIngredient.recipe_id,
      updates: { quantity_grams: grams },
    })
    setEditingIngredient(null)
  }

  function handleRemove(ingredient: RecipeIngredient) {
    removeIngredient.mutate({ id: ingredient.id, recipe_id: ingredient.recipe_id })
  }

  const perServingNutrition = useMemo(() => {
    if (!ingredients || !recipe) return { calories: 0, protein: 0, fat: 0, carbs: 0 }

    const servings = recipe.servings > 0 ? recipe.servings : 1
    const withNutrition = ingredients
      .map(ing => {
        const entry = foodDataMap[ing.ingredient_id]
        if (!entry) return null
        return { nutrition: calcIngredientNutrition(entry.macros, ing.quantity_grams) }
      })
      .filter((x): x is { nutrition: MacroSummary } => x !== null)

    if (withNutrition.length === 0) return { calories: 0, protein: 0, fat: 0, carbs: 0 }
    return calcRecipePerServing(withNutrition, servings)
  }, [ingredients, recipe, foodDataMap])

  if (recipePending) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text/50 font-sans text-sm">Loading recipe…</p>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text/50 font-sans text-sm">Recipe not found.</p>
      </div>
    )
  }

  return (
    <>
      <div className="px-4 py-6 pb-28 font-sans max-w-2xl mx-auto">
        {/* Recipe header */}
        <div className="mb-6 flex flex-col gap-3">
          <input
            type="text"
            value={displayName}
            onChange={e => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Recipe name"
            className="text-2xl font-bold text-primary bg-transparent border-b border-secondary focus:border-primary focus:outline-none py-1 w-full"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-text/60 shrink-0">Servings:</label>
            <input
              type="number"
              min="1"
              step="1"
              value={displayServings}
              onChange={e => setLocalServings(e.target.value)}
              onBlur={handleServingsBlur}
              className="w-20 rounded-[--radius-btn] border border-accent/30 bg-surface px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Ingredient list */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-text mb-3">Ingredients</h2>
          {ingredientsPending ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map(i => (
                <div key={i} className="h-14 rounded-[--radius-btn] bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : !ingredients || ingredients.length === 0 ? (
            <p className="text-sm text-text/50 text-center py-8">
              No ingredients yet. Add one below.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {ingredients.map(ing => (
                <IngredientRow
                  key={ing.id}
                  ingredient={ing}
                  foodData={foodDataMap[ing.ingredient_id] ?? null}
                  onEdit={() => setEditingIngredient(ing)}
                  onRemove={() => handleRemove(ing)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add ingredient button */}
        <button
          onClick={() => setShowFoodSearch(true)}
          className="w-full rounded-[--radius-btn] border border-primary/40 text-primary hover:bg-primary/5 py-2.5 text-sm font-medium transition-colors"
        >
          + Add Ingredient
        </button>
      </div>

      {/* Sticky nutrition bar */}
      <NutritionBar macros={perServingNutrition} />

      {/* Food search overlay */}
      {showFoodSearch && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-secondary/60">
            <button
              onClick={() => setShowFoodSearch(false)}
              className="text-text/60 hover:text-text transition-colors p-1"
              aria-label="Close search"
            >
              ←
            </button>
            <h2 className="font-semibold text-text">Add Ingredient</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <FoodSearch mode="select" onSelect={handleFoodSelected} />
          </div>
        </div>
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
      {editingIngredient && (
        <EditQuantityModal
          ingredient={editingIngredient}
          onConfirm={handleEditConfirm}
          onCancel={() => setEditingIngredient(null)}
        />
      )}
    </>
  )
}
