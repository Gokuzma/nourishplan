import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { getWeekStart } from '../utils/mealPlan'
import {
  aggregateIngredients,
  subtractInventory,
  assignCategories,
  addRestockStaples,
  computeItemCost,
  formatDisplayQuantity,
} from '../utils/groceryGeneration'

export function useGenerateGroceryList() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async () => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const weekStartDay = membership?.households?.week_start_day ?? 0
      const weekStart = getWeekStart(new Date(), weekStartDay)

      // 1. Fetch current meal plan
      const { data: mealPlan, error: planError } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('household_id', householdId)
        .eq('week_start', weekStart)
        .maybeSingle()
      if (planError) throw planError

      // 2. Fetch slots with meals and meal_items
      let slots: {
        meal_id: string | null
        meal_items: {
          id: string
          item_type: 'food' | 'recipe'
          item_id: string
          quantity_grams: number
          item_name: string
          recipe_ingredients?: {
            id: string
            ingredient_type: 'food' | 'recipe'
            ingredient_id: string
            quantity_grams: number
            ingredient_name?: string | null
            recipe_ingredients?: unknown[]
          }[]
        }[]
      }[] = []

      if (mealPlan) {
        const { data: slotsData, error: slotsError } = await supabase
          .from('meal_plan_slots')
          .select('meal_id, meals(id, meal_items(id, item_type, item_id, item_name, quantity_grams))')
          .eq('plan_id', mealPlan.id)
        if (slotsError) throw slotsError

        // Collect all recipe IDs used in meal items to fetch their ingredients
        const recipeIds = new Set<string>()
        for (const slot of slotsData ?? []) {
          const meal = (slot as { meal_id: string | null; meals: { id: string; meal_items: { item_type: string; item_id: string }[] } | null }).meals
          if (!meal) continue
          for (const item of meal.meal_items) {
            if (item.item_type === 'recipe') {
              recipeIds.add(item.item_id)
            }
          }
        }

        // Fetch recipe_ingredients for all recipes (single query)
        const recipeIngredientsMap = new Map<string, {
          id: string
          ingredient_type: 'food' | 'recipe'
          ingredient_id: string
          quantity_grams: number
          ingredient_name?: string | null
        }[]>()

        if (recipeIds.size > 0) {
          const { data: allIngredients, error: ingError } = await supabase
            .from('recipe_ingredients')
            .select('id, recipe_id, ingredient_type, ingredient_id, ingredient_name, quantity_grams')
            .in('recipe_id', Array.from(recipeIds))
          if (ingError) throw ingError

          for (const ing of allIngredients ?? []) {
            const existing = recipeIngredientsMap.get(ing.recipe_id) ?? []
            existing.push(ing)
            recipeIngredientsMap.set(ing.recipe_id, existing)
          }
        }

        // Build slots array with resolved recipe_ingredients
        slots = (slotsData ?? []).map(slot => {
          const mealData = (slot as { meal_id: string | null; meals: { id: string; meal_items: { id: string; item_type: 'food' | 'recipe'; item_id: string; item_name: string; quantity_grams: number }[] } | null }).meals
          if (!mealData) return { meal_id: slot.meal_id as string | null, meal_items: [] }
          return {
            meal_id: slot.meal_id as string | null,
            meal_items: mealData.meal_items.map(item => ({
              ...item,
              recipe_ingredients: item.item_type === 'recipe'
                ? recipeIngredientsMap.get(item.item_id) ?? []
                : undefined,
            })),
          }
        })
      }

      // 3. Fetch cooked recipe IDs for this week (D-03: skip already-cooked)
      const { data: spendLogs, error: spendError } = await supabase
        .from('spend_logs')
        .select('recipe_id')
        .eq('household_id', householdId)
        .eq('week_start', weekStart)
        .eq('source', 'cook')
        .not('recipe_id', 'is', null)
      if (spendError) throw spendError
      const cookedRecipeIds = new Set<string>(
        (spendLogs ?? []).map(l => l.recipe_id!).filter(Boolean)
      )

      // 4. Fetch inventory items
      const { data: inventoryItems, error: invError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('household_id', householdId)
        .is('removed_at', null)
      if (invError) throw invError

      // 5. Fetch food prices
      const { data: foodPrices, error: priceError } = await supabase
        .from('food_prices')
        .select('*')
        .eq('household_id', householdId)
      if (priceError) throw priceError

      // 6. Fetch previous grocery items for user category overrides
      const { data: previousItems, error: prevError } = await supabase
        .from('grocery_items')
        .select('food_id, food_name, category, category_source')
        .eq('household_id', householdId)
        .eq('category_source', 'user')
      if (prevError) throw prevError

      // 7. Run generation algorithm
      const aggregated = aggregateIngredients(slots, cookedRecipeIds)
      const { needToBuy, alreadyHave } = subtractInventory(aggregated, inventoryItems ?? [])
      const categorizedNeedToBuy = assignCategories(needToBuy, previousItems ?? [])

      // 8. Add restock staples
      const existingFoodIds = new Set<string>(
        needToBuy.map(i => i.food_id).filter((id): id is string => id !== null)
      )
      const restockItems = addRestockStaples(existingFoodIds, inventoryItems ?? [])
      const categorizedRestock = assignCategories(restockItems, previousItems ?? [])

      // 9. Upsert grocery_lists row
      const { data: groceryList, error: listError } = await supabase
        .from('grocery_lists')
        .upsert(
          {
            household_id: householdId,
            week_start: weekStart,
            generated_by: userId,
            generated_at: new Date().toISOString(),
          },
          { onConflict: 'household_id,week_start' }
        )
        .select()
        .single()
      if (listError) throw listError

      const listId = groceryList.id

      // 10. Delete existing non-manual items
      const { error: deleteError } = await supabase
        .from('grocery_items')
        .delete()
        .eq('list_id', listId)
        .eq('is_manual', false)
      if (deleteError) throw deleteError

      // 11. Build items to insert
      const allNeedToBuy = [...categorizedNeedToBuy, ...categorizedRestock]
      const needToBuyInserts = allNeedToBuy.map(item => {
        const { display_quantity, display_unit } = formatDisplayQuantity(item.quantity_grams)
        const estimatedCost = computeItemCost(item.quantity_grams, item.food_id, foodPrices ?? [])
        return {
          list_id: listId,
          household_id: householdId,
          food_name: item.food_name,
          food_id: item.food_id,
          quantity: display_quantity,
          unit: display_unit,
          category: item.category,
          category_source: item.category_source as 'auto' | 'user',
          is_checked: false,
          checked_by: null,
          checked_at: null,
          is_manual: false,
          is_staple_restock: item.is_staple_restock ?? false,
          estimated_cost: estimatedCost,
          notes: null,
        }
      })

      const categorizedAlreadyHave = assignCategories(alreadyHave, previousItems ?? [])
      const alreadyHaveInserts = categorizedAlreadyHave.map(item => {
        const { display_quantity, display_unit } = formatDisplayQuantity(item.quantity_grams)
        return {
          list_id: listId,
          household_id: householdId,
          food_name: item.food_name,
          food_id: item.food_id,
          quantity: display_quantity,
          unit: display_unit,
          category: item.category,
          category_source: item.category_source as 'auto' | 'user',
          is_checked: false,
          checked_by: null,
          checked_at: null,
          is_manual: false,
          is_staple_restock: false,
          estimated_cost: null,
          notes: 'inventory-covered',
        }
      })

      const allInserts = [...needToBuyInserts, ...alreadyHaveInserts]
      if (allInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('grocery_items')
          .insert(allInserts)
        if (insertError) throw insertError
      }

      return groceryList
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      if (householdId) {
        queryClient.invalidateQueries({ queryKey: ['grocery', householdId] })
      }
    },
  })
}
