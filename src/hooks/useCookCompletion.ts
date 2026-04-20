import { useCreateSpendLog } from './useSpendLog'
import { useInventoryDeduct, type DeductionResult } from './useInventoryDeduct'
import { useFoodPrices, getPriceForIngredient } from './useFoodPrices'
import { computeRecipeCostPerServing } from '../utils/cost'
import type { RecipeIngredient } from '../types/database'

export interface CookCompletionInput {
  recipeId: string
  recipeName: string
  servings: number
  ingredients: RecipeIngredient[]
}

export interface CookCompletionOutcome {
  deductionResult: DeductionResult | null
  isPartial: boolean
  totalCost: number
  spendLogged: boolean
}

export function useCookCompletion() {
  const spendLog = useCreateSpendLog()
  const inventoryDeduct = useInventoryDeduct()
  const { data: foodPrices } = useFoodPrices()

  async function runCookCompletion(
    input: CookCompletionInput
  ): Promise<CookCompletionOutcome> {
    const prices = foodPrices ?? []
    const servings = input.servings > 0 ? input.servings : 1

    // Cost calc — mirrors RecipeBuilder.tsx:578-588 exactly (per D-11)
    const ingredientsWithCost = input.ingredients.map(ing => ({
      quantity_grams: ing.quantity_grams,
      cost_per_100g: getPriceForIngredient(prices, ing.ingredient_id),
    }))
    const { costPerServing, pricedCount, totalCount } = computeRecipeCostPerServing(
      ingredientsWithCost,
      servings
    )
    const totalCost = costPerServing * servings
    const isPartial = pricedCount < totalCount

    // Spend log FIRST (per D-11)
    let spendLogged = false
    try {
      await spendLog.mutateAsync({
        recipe_id: input.recipeId,
        amount: totalCost,
        is_partial: isPartial,
      })
      spendLogged = true
    } catch {
      // Spend failed — do not attempt deduct (no cook happened financially)
      return { deductionResult: null, isPartial, totalCost, spendLogged: false }
    }

    // Inventory deduct SECOND — non-blocking on failure (per D-12)
    const needs = input.ingredients.map(ing => ({
      food_id: ing.ingredient_id,
      food_name: ing.ingredient_name ?? '',
      quantity_grams: ing.quantity_grams,
    }))
    try {
      const deductionResult = await inventoryDeduct.mutateAsync(needs)
      return { deductionResult, isPartial, totalCost, spendLogged }
    } catch {
      // Deduct failure does NOT roll back spend (per D-12)
      return { deductionResult: null, isPartial, totalCost, spendLogged }
    }
  }

  return { runCookCompletion, isPending: spendLog.isPending || inventoryDeduct.isPending }
}
