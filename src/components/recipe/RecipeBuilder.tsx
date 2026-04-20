import { useState, useMemo, useEffect } from 'react'
import {
  useRecipe,
  useRecipeIngredients,
  useUpdateRecipe,
  useAddIngredient,
  useUpdateIngredient,
  useRemoveIngredient,
  useRecipes,
} from '../../hooks/useRecipes'
import {
  calcIngredientNutrition,
  calcRecipePerServing,
  wouldCreateCycle,
  applyYieldFactor,
  YIELD_FACTORS,
} from '../../utils/nutrition'
import { useFoodPrices, useSaveFoodPrice, getPriceForIngredient } from '../../hooks/useFoodPrices'
import { normaliseToCostPer100g, computeRecipeCostPerServing, formatCost } from '../../utils/cost'
import type { DeductionResult } from '../../hooks/useInventoryDeduct'
import { useCookCompletion } from '../../hooks/useCookCompletion'
import { supabase } from '../../lib/supabase'
import { FoodSearchOverlay } from '../food/FoodSearchOverlay'
import { NutritionBar } from './NutritionBar'
import { IngredientRow } from './IngredientRow'
import { MicronutrientPanel } from '../plan/MicronutrientPanel'
import { CookDeductionReceipt } from '../inventory/CookDeductionReceipt'
import { AddInventoryItemModal } from '../inventory/AddInventoryItemModal'
import type { NormalizedFoodResult, MacroSummary, RecipeIngredient, Recipe } from '../../types/database'
import { RecipeStepsSection } from './RecipeStepsSection'
import { RecipeFreezerToggle } from './RecipeFreezerToggle'
import { useRecipeSteps, useRegenerateRecipeSteps } from '../../hooks/useRecipeSteps'
import { CookEntryPointOnRecipeDetail } from '../cook/CookEntryPointOnRecipeDetail'

// Default yield factor when ingredient category is unknown (general cooking loss ~15%)
const DEFAULT_YIELD_FACTOR = YIELD_FACTORS['vegetables'] // 0.85

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 0) return 'today'
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

interface RecipeBuilderProps {
  recipeId: string
}

interface FoodDataEntry {
  name: string
  macros: MacroSummary
  micronutrients?: Record<string, number> | null
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
 * Fetch ingredients for a recipe from Supabase for cycle detection.
 */
async function getIngredientsForCycle(id: string): Promise<{ ingredient_type: string; ingredient_id: string }[]> {
  const { data } = await supabase
    .from('recipe_ingredients')
    .select('ingredient_type, ingredient_id')
    .eq('recipe_id', id)
  return data ?? []
}

/**
 * Recipe picker section shown inside the food search overlay.
 * Lists all household recipes excluding the current one being edited.
 */
interface RecipePickerProps {
  currentRecipeId: string
  recipes: Recipe[]
  onSelect: (recipe: Recipe) => void
  cycleError: string | null
}

function RecipePicker({ currentRecipeId, recipes, onSelect, cycleError }: RecipePickerProps) {
  const available = recipes.filter(r => r.id !== currentRecipeId)

  if (available.length === 0) {
    return (
      <p className="text-sm text-text/50 text-center py-4">
        No other recipes available to add.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {cycleError && (
        <p className="text-sm text-red-500 bg-red-50 rounded-[--radius-btn] px-3 py-2">
          {cycleError}
        </p>
      )}
      {available.map(recipe => (
        <button
          key={recipe.id}
          onClick={() => onSelect(recipe)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-[--radius-btn] border border-secondary/50 bg-surface hover:border-accent/40 transition-colors text-left w-full"
        >
          <span className="text-xs bg-accent/20 text-accent font-medium px-1.5 py-0.5 rounded shrink-0">R</span>
          <span className="text-sm text-text truncate flex-1">{recipe.name}</span>
          <span className="text-xs text-text/40 shrink-0">{recipe.servings} srv</span>
        </button>
      ))}
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
  const { data: allRecipes } = useRecipes()
  const { data: foodPrices } = useFoodPrices()
  const saveFoodPrice = useSaveFoodPrice()

  const updateRecipe = useUpdateRecipe()
  const addIngredient = useAddIngredient()
  const updateIngredient = useUpdateIngredient()
  const removeIngredient = useRemoveIngredient()
  const { runCookCompletion, isPending: cookPending } = useCookCompletion()
  const { data: stepsData } = useRecipeSteps(recipeId)
  const regenerateSteps = useRegenerateRecipeSteps()
  const [cookConfirmation, setCookConfirmation] = useState<string | null>(null)
  const [deductionResult, setDeductionResult] = useState<DeductionResult | null>(null)
  const [showLeftoverModal, setShowLeftoverModal] = useState(false)

  const [localName, setLocalName] = useState<string | null>(null)
  const [localServings, setLocalServings] = useState<string | null>(null)
  const [localNotes, setLocalNotes] = useState<string | null>(null)
  const [ingredientSearchOpen, setIngredientSearchOpen] = useState(false)
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [, setSearchTab] = useState<'food' | 'recipe'>('food')
  const [pendingFood, setPendingFood] = useState<NormalizedFoodResult | null>(null)
  const [pendingRecipe, setPendingRecipe] = useState<Recipe | null>(null)
  const [editingIngredient, setEditingIngredient] = useState<RecipeIngredient | null>(null)
  const [foodDataMap, setFoodDataMap] = useState<Record<string, FoodDataEntry>>({})

  // Hydrate foodDataMap from ingredient snapshot columns, falling back to custom_foods for legacy rows
  useEffect(() => {
    if (!ingredients || ingredients.length === 0) return

    const newEntries: Record<string, FoodDataEntry> = {}
    const missingIds: string[] = []

    for (const ing of ingredients) {
      if (foodDataMap[ing.ingredient_id]) continue

      // Use snapshot columns if available
      if (ing.calories_per_100g != null && ing.ingredient_name) {
        newEntries[ing.ingredient_id] = {
          name: ing.ingredient_name,
          macros: {
            calories: ing.calories_per_100g,
            protein: ing.protein_per_100g ?? 0,
            fat: ing.fat_per_100g ?? 0,
            carbs: ing.carbs_per_100g ?? 0,
          },
          micronutrients: ing.micronutrients ?? null,
        }
      } else if (ing.ingredient_type === 'food') {
        missingIds.push(ing.ingredient_id)
      }
    }

    if (Object.keys(newEntries).length > 0) {
      setFoodDataMap(prev => ({ ...prev, ...newEntries }))
    }

    if (missingIds.length === 0) return

    // Fallback: fetch from custom_foods for legacy ingredients without snapshots
    async function hydrate() {
      const { data: customFoods } = await supabase
        .from('custom_foods')
        .select('id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, micronutrients')
        .in('id', missingIds)

      if (!customFoods || customFoods.length === 0) return

      const fetched: Record<string, FoodDataEntry> = {}
      for (const f of customFoods) {
        fetched[f.id] = {
          name: f.name,
          macros: {
            calories: f.calories_per_100g,
            protein: f.protein_per_100g,
            fat: f.fat_per_100g,
            carbs: f.carbs_per_100g,
          },
          micronutrients: f.micronutrients ?? null,
        }
      }

      setFoodDataMap(prev => ({ ...prev, ...fetched }))
    }

    hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredients])

  // Sync notes from server on first load
  useEffect(() => {
    if (recipe?.notes !== undefined && localNotes === null) {
      setLocalNotes(recipe.notes ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.notes])

  const [cycleError, setCycleError] = useState<string | null>(null)
  const [cycleCheckInProgress, setCycleCheckInProgress] = useState(false)

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
    setIngredientSearchOpen(false)
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
      [food.id]: { name: food.name, macros, micronutrients: food.micronutrients ?? null },
    }))

    const nextOrder = (ingredients?.length ?? 0)
    addIngredient.mutate({
      recipe_id: recipeId,
      ingredient_type: 'food',
      ingredient_id: food.id,
      quantity_grams: grams,
      weight_state: 'raw',
      sort_order: nextOrder,
      ingredient_name: food.name,
      calories_per_100g: food.calories,
      protein_per_100g: food.protein,
      fat_per_100g: food.fat,
      carbs_per_100g: food.carbs,
      micronutrients: food.micronutrients ?? null,
    }, {
      onSuccess: () => {
        // D-03: eager step generation on ingredient mutation (V-07: name/servings changes do NOT trigger)
        if (recipe && ingredients) {
          const ingredientsSnapshot = [...ingredients, {
            ingredient_name: food.name,
            quantity_grams: grams,
          }].map(ing => ({
            name: (ing as { ingredient_name?: string | null; name?: string }).ingredient_name ?? (ing as { name?: string }).name ?? '',
            quantity_grams: ing.quantity_grams,
          }))
          regenerateSteps.mutate({
            recipeId,
            recipeName: recipe.name,
            servings: recipe.servings,
            ingredientsSnapshot,
            existingSteps: stepsData?.instructions ?? undefined,
            notes: recipe.notes,
          })
        }
      },
    })

    setPendingFood(null)
  }

  async function handleRecipeSelected(selectedRecipe: Recipe) {
    setCycleError(null)
    setCycleCheckInProgress(true)

    try {
      const hasCycle = await wouldCreateCycle(recipeId, selectedRecipe.id, getIngredientsForCycle)
      if (hasCycle) {
        setCycleError('Cannot add this recipe — it would create a circular reference.')
        return
      }

      // Proceed to quantity entry
      setPendingRecipe(selectedRecipe)
      setShowFoodSearch(false)
    } finally {
      setCycleCheckInProgress(false)
    }
  }

  async function handleRecipeQuantityConfirm(grams: number) {
    if (!pendingRecipe) return

    const selectedRecipe = pendingRecipe
    // Resolve sub-recipe nutrition: fetch its ingredients and calculate total macros per 100g equivalent
    const subNutrition = await resolveRecipeNutrition(selectedRecipe.id, grams)

    setFoodDataMap(prev => ({
      ...prev,
      [selectedRecipe.id]: { name: selectedRecipe.name, macros: subNutrition.per100g },
    }))

    const nextOrder = (ingredients?.length ?? 0)
    addIngredient.mutate({
      recipe_id: recipeId,
      ingredient_type: 'recipe',
      ingredient_id: selectedRecipe.id,
      quantity_grams: grams,
      weight_state: 'raw',
      sort_order: nextOrder,
      ingredient_name: selectedRecipe.name,
      calories_per_100g: subNutrition.per100g.calories,
      protein_per_100g: subNutrition.per100g.protein,
      fat_per_100g: subNutrition.per100g.fat,
      carbs_per_100g: subNutrition.per100g.carbs,
    }, {
      onSuccess: () => {
        // D-03: eager step generation on ingredient mutation (V-07: name/servings changes do NOT trigger)
        if (recipe && ingredients) {
          const ingredientsSnapshot = [...ingredients, {
            ingredient_name: selectedRecipe.name,
            quantity_grams: grams,
          }].map(ing => ({
            name: (ing as { ingredient_name?: string | null; name?: string }).ingredient_name ?? (ing as { name?: string }).name ?? '',
            quantity_grams: ing.quantity_grams,
          }))
          regenerateSteps.mutate({
            recipeId,
            recipeName: recipe.name,
            servings: recipe.servings,
            ingredientsSnapshot,
            existingSteps: stepsData?.instructions ?? undefined,
            notes: recipe.notes,
          })
        }
      },
    })

    setPendingRecipe(null)
  }

  function handleEditConfirm(grams: number) {
    if (!editingIngredient) return
    const editedIngId = editingIngredient.id
    updateIngredient.mutate({
      id: editingIngredient.id,
      recipe_id: editingIngredient.recipe_id,
      updates: { quantity_grams: grams },
    }, {
      onSuccess: () => {
        // D-03: eager step generation on ingredient mutation (V-07: name/servings changes do NOT trigger)
        if (recipe && ingredients) {
          const ingredientsSnapshot = ingredients.map(ing => ({
            name: ing.ingredient_name ?? '',
            quantity_grams: ing.id === editedIngId ? grams : ing.quantity_grams,
          }))
          regenerateSteps.mutate({
            recipeId,
            recipeName: recipe.name,
            servings: recipe.servings,
            ingredientsSnapshot,
            existingSteps: stepsData?.instructions ?? undefined,
            notes: recipe.notes,
          })
        }
      },
    })
    setEditingIngredient(null)
  }

  function handleRemove(ingredient: RecipeIngredient) {
    removeIngredient.mutate({ id: ingredient.id, recipe_id: ingredient.recipe_id })
  }

  function handleToggleWeightState(ingredient: RecipeIngredient) {
    const nextState = ingredient.weight_state === 'raw' ? 'cooked' : 'raw'
    updateIngredient.mutate({
      id: ingredient.id,
      recipe_id: ingredient.recipe_id,
      updates: { weight_state: nextState },
    })
  }

  function handleSavePrice(
    ingredient: RecipeIngredient,
    amount: number,
    quantityValue: number,
    unit: 'g' | 'kg' | 'ml' | 'l',
    store: string
  ) {
    const cost_per_100g = normaliseToCostPer100g(amount, quantityValue, unit)
    const foodName = foodDataMap[ingredient.ingredient_id]?.name ?? ingredient.ingredient_name ?? ''
    saveFoodPrice.mutate({
      food_id: ingredient.ingredient_id,
      food_name: foodName,
      store,
      cost_per_100g,
    })
  }

  async function handleMarkAsCooked() {
    if (!recipe || !ingredients) return
    const outcome = await runCookCompletion({
      recipeId: recipe.id,
      recipeName: recipe.name,
      servings: recipe.servings,
      ingredients,
    })
    if (outcome.spendLogged) {
      const msg = outcome.isPartial
        ? `Cooked — partial spend recorded (${formatCost(outcome.totalCost)} of estimated total)`
        : 'Cooked — spend recorded'
      setCookConfirmation(msg)
      setTimeout(() => setCookConfirmation(null), 2000)
    }
    if (outcome.deductionResult) {
      setDeductionResult(outcome.deductionResult)
    }
  }

  const perServingNutrition = useMemo(() => {
    if (!ingredients || !recipe) return { calories: 0, protein: 0, fat: 0, carbs: 0 }

    const servings = recipe.servings > 0 ? recipe.servings : 1
    const withNutrition = ingredients
      .map(ing => {
        const entry = foodDataMap[ing.ingredient_id]
        if (!entry) return null

        // Apply yield factor for cooked ingredients
        const effectiveGrams = applyYieldFactor(
          ing.quantity_grams,
          ing.weight_state,
          DEFAULT_YIELD_FACTOR,
        )

        return { nutrition: calcIngredientNutrition(entry.macros, effectiveGrams) }
      })
      .filter((x): x is { nutrition: MacroSummary } => x !== null)

    if (withNutrition.length === 0) return { calories: 0, protein: 0, fat: 0, carbs: 0 }
    return calcRecipePerServing(withNutrition, servings)
  }, [ingredients, recipe, foodDataMap])

  // Aggregate micronutrients from all ingredients that have micronutrient data (per serving)
  const perServingMicronutrients = useMemo((): Record<string, number> | null => {
    if (!ingredients || !recipe) return null

    const servings = recipe.servings > 0 ? recipe.servings : 1
    const totals: Record<string, number> = {}
    let hasAny = false

    for (const ing of ingredients) {
      const entry = foodDataMap[ing.ingredient_id]
      if (!entry?.micronutrients) continue

      const factor = ing.quantity_grams / 100
      for (const [key, value] of Object.entries(entry.micronutrients)) {
        if (value == null) continue
        totals[key] = (totals[key] ?? 0) + value * factor
        hasAny = true
      }
    }

    if (!hasAny) return null
    // Divide totals by servings to get per-serving values
    const perServing: Record<string, number> = {}
    for (const [key, total] of Object.entries(totals)) {
      perServing[key] = total / servings
    }
    return perServing
  }, [ingredients, recipe, foodDataMap])

  function handleOpenFoodSearch() {
    setSearchTab('food')
    setCycleError(null)
    setIngredientSearchOpen(true)
  }

  function handleOpenRecipeSearch() {
    setSearchTab('recipe')
    setCycleError(null)
    setShowFoodSearch(true)
  }

  if (recipePending && ingredientsPending) {
    return (
      <div
        className="px-4 py-6 font-sans pb-[64px]"
        aria-live="polite"
        aria-label="Importing recipe, please wait…"
      >
        <div className="flex flex-col gap-4">
          <div className="h-9 w-3/4 animate-pulse bg-secondary/50 rounded-[--radius-btn]" aria-hidden="true" />
          <div className="h-9 w-1/4 animate-pulse bg-secondary/50 rounded-[--radius-btn]" aria-hidden="true" />
          <div className="h-5 w-24 animate-pulse bg-secondary/50 rounded-[--radius-btn]" aria-hidden="true" />
          <div className="h-14 animate-pulse bg-secondary/50 rounded-[--radius-btn]" aria-hidden="true" />
          <div className="h-14 animate-pulse bg-secondary/50 rounded-[--radius-btn]" aria-hidden="true" />
          <div className="h-14 animate-pulse bg-secondary/50 rounded-[--radius-btn]" aria-hidden="true" />
          <div className="h-5 w-16 animate-pulse bg-secondary/50 rounded-[--radius-btn]" aria-hidden="true" />
          <div className="h-12 animate-pulse bg-secondary/50 rounded-[--radius-btn]" aria-hidden="true" />
          <div className="h-12 animate-pulse bg-secondary/50 rounded-[--radius-btn]" aria-hidden="true" />
        </div>
      </div>
    )
  }

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

  // Build a NormalizedFoodResult shim so QuantityModal can be reused for recipes
  const pendingRecipeAsFood: NormalizedFoodResult | null = pendingRecipe
    ? {
        id: pendingRecipe.id,
        name: pendingRecipe.name,
        source: 'custom',
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      }
    : null

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
          <textarea
            value={localNotes ?? recipe?.notes ?? ''}
            onChange={e => setLocalNotes(e.target.value)}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
            onBlur={() => {
              if (localNotes !== null && localNotes !== (recipe?.notes ?? '')) {
                updateRecipe.mutate({ id: recipeId, updates: { notes: localNotes || null } })
              }
              setLocalNotes(null)
            }}
            placeholder="Add notes or variations..."
            className="w-full text-sm text-text/50 bg-transparent border-none focus:outline-none resize-none overflow-hidden"
            rows={1}
          />
          {recipe?.created_at && (
            <span
              className="text-xs text-text/40"
              title={new Date(recipe.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
            >
              Created {relativeTime(recipe.created_at)}
            </span>
          )}
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

          {/* Source URL attribution (D-13) — shown only for imported recipes */}
          {recipe?.source_url && (
            <p className="text-xs text-text/40">
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View original recipe source"
              >
                {(() => {
                  try {
                    return `Imported from ${new URL(recipe.source_url).hostname}`
                  } catch {
                    return `Imported from ${recipe.source_url.slice(0, 60)}${recipe.source_url.length > 60 ? '…' : ''}`
                  }
                })()}
              </a>
            </p>
          )}

          {/* Cost per serving badge */}
          {(() => {
            const ingredientsWithCost = (ingredients ?? []).map(ing => ({
              quantity_grams: ing.quantity_grams,
              cost_per_100g: getPriceForIngredient(foodPrices ?? [], ing.ingredient_id),
            }))
            const { costPerServing, pricedCount, totalCount } = computeRecipeCostPerServing(ingredientsWithCost, recipe.servings)
            const isPartial = pricedCount < totalCount && pricedCount > 0
            const hasAnyPrice = pricedCount > 0
            if (!hasAnyPrice) return null
            return (
              <p className="text-xs text-text/50 font-sans">
                {isPartial
                  ? `${formatCost(costPerServing)}+/serving · (${pricedCount} of ${totalCount} priced)`
                  : `${formatCost(costPerServing)}/serving · ${recipe.servings} servings`}
              </p>
            )
          })()}

          {/* Freezer toggle */}
          {recipe && (
            <RecipeFreezerToggle
              recipeId={recipe.id}
              value={stepsData?.freezer_friendly ?? null}
              shelfLifeWeeks={stepsData?.freezer_shelf_life_weeks ?? null}
            />
          )}

          {/* Cook this recipe entry point */}
          {recipe && <CookEntryPointOnRecipeDetail recipe={recipe} />}

          {/* Mark as Cooked button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAsCooked}
              disabled={cookPending}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {cookPending ? 'Recording...' : 'Mark as Cooked'}
            </button>
            {cookConfirmation && (
              <span className="text-xs text-primary">{cookConfirmation}</span>
            )}
          </div>

          {/* Stores datalist for price entry autocomplete */}
          <datalist id="stores-datalist">
            {[...new Set((foodPrices ?? []).map(p => p.store).filter(Boolean))].map(store => (
              <option key={store} value={store} />
            ))}
          </datalist>
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
                  onToggleWeightState={() => handleToggleWeightState(ing)}
                  price={getPriceForIngredient(foodPrices ?? [], ing.ingredient_id)}
                  onSavePrice={(amount, qty, unit, store) => handleSavePrice(ing, amount, qty, unit, store)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Steps section */}
        {recipe && (
          <RecipeStepsSection
            recipeId={recipe.id}
            recipeName={recipe.name}
            servings={recipe.servings}
            ingredientsSnapshot={(ingredients ?? []).map(ing => ({ name: ing.ingredient_name ?? '', quantity_grams: ing.quantity_grams }))}
            notes={recipe.notes}
          />
        )}

        {/* Search ingredients trigger */}
        <button
          onClick={handleOpenFoodSearch}
          className="w-full rounded-[--radius-card] bg-surface border border-secondary px-4 py-3 flex items-center gap-2 text-left hover:border-primary/40 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text/40 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-sm text-text/40">Search ingredients</span>
        </button>

        {/* Add recipe ingredient button */}
        <button
          onClick={handleOpenRecipeSearch}
          className="w-full rounded-[--radius-btn] border border-primary/40 text-primary hover:bg-primary/5 py-2.5 text-sm font-medium transition-colors"
        >
          + Add Recipe as Ingredient
        </button>
      </div>

      {/* Sticky nutrition bar */}
      <NutritionBar macros={perServingNutrition} />

      {/* Micronutrient panel — shown below macro summary when ingredient data is available */}
      {perServingMicronutrients && (
        <div className="px-4 pb-4 max-w-2xl mx-auto w-full">
          <MicronutrientPanel micronutrients={perServingMicronutrients} />
        </div>
      )}

      {/* Food search overlay (food ingredients) */}
      {ingredientSearchOpen && (
        <FoodSearchOverlay
          mode="select"
          onSelect={(food) => {
            handleFoodSelected(food)
          }}
          onClose={() => setIngredientSearchOpen(false)}
        />
      )}

      {/* Recipe picker panel (recipe-as-ingredient) */}
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
            <h2 className="font-semibold text-text">Add Recipe as Ingredient</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="text-xs text-text/50 mb-3">
              Add an existing recipe as an ingredient. Circular references are prevented.
            </p>
            {cycleCheckInProgress && (
              <p className="text-sm text-text/50 mb-2">Checking for circular references…</p>
            )}
            <RecipePicker
              currentRecipeId={recipeId}
              recipes={allRecipes ?? []}
              onSelect={handleRecipeSelected}
              cycleError={cycleError}
            />
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

      {/* Quantity modal after recipe selection */}
      {pendingRecipeAsFood && (
        <QuantityModal
          food={pendingRecipeAsFood}
          onConfirm={handleRecipeQuantityConfirm}
          onCancel={() => setPendingRecipe(null)}
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

      {/* Cook deduction receipt */}
      {deductionResult && (
        <CookDeductionReceipt
          mealName={recipe?.name ?? 'Recipe'}
          result={deductionResult}
          onClose={() => setDeductionResult(null)}
          onSaveLeftover={() => setShowLeftoverModal(true)}
        />
      )}
      {showLeftoverModal && recipe && (
        <AddInventoryItemModal
          isOpen={showLeftoverModal}
          onClose={() => setShowLeftoverModal(false)}
          leftoverDefaults={{ recipeName: recipe.name, recipeId: recipe.id }}
        />
      )}
    </>
  )
}

/**
 * Resolve a sub-recipe's aggregate nutrition per 100g equivalent.
 * Fetches the sub-recipe's ingredients and sums macros, then normalises to per-100g.
 * Returns zeros on failure to allow graceful degradation.
 */
async function resolveRecipeNutrition(
  recipeId: string,
  quantityGrams: number,
): Promise<{ per100g: MacroSummary }> {
  try {
    const { data: ings } = await supabase
      .from('recipe_ingredients')
      .select('ingredient_type, ingredient_id, quantity_grams, weight_state')
      .eq('recipe_id', recipeId)

    if (!ings || ings.length === 0) {
      return { per100g: { calories: 0, protein: 0, fat: 0, carbs: 0 } }
    }

    // Resolve only food-type ingredients at depth=1 (shallow resolution for v1)
    const foodIds = ings
      .filter(i => i.ingredient_type === 'food')
      .map(i => i.ingredient_id)

    if (foodIds.length === 0) {
      return { per100g: { calories: 0, protein: 0, fat: 0, carbs: 0 } }
    }

    // Fetch food nutrition from custom_foods and usda/off cache
    // For v1, we try custom_foods; external food macros aren't stored server-side per-row,
    // so we return zero for non-custom foods (they'll show as Loading until browsed).
    const { data: customFoods } = await supabase
      .from('custom_foods')
      .select('id, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g')
      .in('id', foodIds)

    const foodMacroMap: Record<string, MacroSummary> = {}
    for (const f of customFoods ?? []) {
      foodMacroMap[f.id] = {
        calories: f.calories_per_100g,
        protein: f.protein_per_100g,
        fat: f.fat_per_100g,
        carbs: f.carbs_per_100g,
      }
    }

    let totalCal = 0, totalProt = 0, totalFat = 0, totalCarbs = 0
    for (const ing of ings) {
      if (ing.ingredient_type !== 'food') continue
      const m = foodMacroMap[ing.ingredient_id]
      if (!m) continue
      const effectiveGrams = applyYieldFactor(ing.quantity_grams, ing.weight_state, DEFAULT_YIELD_FACTOR)
      const contrib = calcIngredientNutrition(m, effectiveGrams)
      totalCal += contrib.calories
      totalProt += contrib.protein
      totalFat += contrib.fat
      totalCarbs += contrib.carbs
    }

    // Normalise total recipe nutrition to per-100g so calcIngredientNutrition works correctly
    const totalGrams = ings.reduce((s, i) => s + i.quantity_grams, 0) || quantityGrams
    const per100g: MacroSummary = {
      calories: (totalCal / totalGrams) * 100,
      protein: (totalProt / totalGrams) * 100,
      fat: (totalFat / totalGrams) * 100,
      carbs: (totalCarbs / totalGrams) * 100,
    }

    return { per100g }
  } catch {
    return { per100g: { calories: 0, protein: 0, fat: 0, carbs: 0 } }
  }
}

