import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import type { MealPlan, MealPlanSlot, Meal, MealItem } from '../types/database'

export type SlotWithMeal = MealPlanSlot & {
  meals: (Meal & { meal_items: MealItem[] }) | null
}

/**
 * Returns the meal plan for the current household and given week start date.
 * Returns null if no plan exists yet for this week.
 */
export function useMealPlan(weekStart: string) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: queryKeys.mealPlan.root(householdId, weekStart),
    queryFn: async (): Promise<MealPlan | null> => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('household_id', householdId!)
        .eq('week_start', weekStart)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!householdId && !!weekStart,
  })
}

/**
 * Mutation to upsert a meal_plan row for the current week.
 * Uses upsert with ignoreDuplicates to handle race conditions.
 */
export function useCreateMealPlan() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (weekStart: string): Promise<MealPlan> => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase
        .from('meal_plans')
        .upsert(
          { household_id: householdId, week_start: weekStart, created_by: userId },
          { onConflict: 'household_id,week_start', ignoreDuplicates: true },
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlan.root(householdId, data.week_start) })
    },
  })
}

/**
 * Returns all slots for a plan, joined with meals and their meal_items.
 * Enabled only when planId is truthy.
 */
export function useMealPlanSlots(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mealPlan.slots(planId),
    queryFn: async (): Promise<SlotWithMeal[]> => {
      const { data, error } = await supabase
        .from('meal_plan_slots')
        .select('*, meals(*, meal_items(*))')
        .eq('plan_id', planId!)
        .order('day_index')
        .order('slot_order')

      if (error) throw error
      return (data ?? []) as unknown as SlotWithMeal[]
    },
    enabled: !!planId,
  })
}

/**
 * Mutation to upsert a slot row.
 * Upserts on (plan_id, day_index, slot_name) conflict key.
 */
export function useAssignSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      planId,
      dayIndex,
      slotName,
      slotOrder,
      mealId,
      isOverride,
    }: {
      planId: string
      dayIndex: number
      slotName: string
      slotOrder: number
      mealId: string
      isOverride: boolean
    }): Promise<MealPlanSlot> => {
      const { data, error } = await supabase
        .from('meal_plan_slots')
        .upsert(
          {
            plan_id: planId,
            day_index: dayIndex,
            slot_name: slotName,
            slot_order: slotOrder,
            meal_id: mealId,
            is_override: isOverride,
          },
          { onConflict: 'plan_id,day_index,slot_name' },
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlan.slots(planId) })
    },
  })
}

/**
 * Mutation to clear a slot (set meal_id = null).
 */
export function useClearSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      slotId,
    }: {
      slotId: string
      planId: string
    }): Promise<void> => {
      const { error } = await supabase
        .from('meal_plan_slots')
        .update({ meal_id: null, is_override: false })
        .eq('id', slotId)

      if (error) throw error
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlan.slots(planId) })
    },
  })
}

/**
 * Mutation to clear every unlocked slot of a plan (meal_id = null) so the
 * week can be replanned around locked meals.
 */
export function useClearUnlockedSlots() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ planId }: { planId: string }): Promise<void> => {
      const { error } = await supabase
        .from('meal_plan_slots')
        .update({ meal_id: null, is_override: false })
        .eq('plan_id', planId)
        .eq('is_locked', false)

      if (error) throw error
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlan.slots(planId) })
    },
  })
}

/**
 * Mutation to delete a week's plan entirely (slots cascade via FK), returning
 * the week to the Start Week prompt. RLS allows the plan creator or an admin.
 */
export function useDeleteMealPlan() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async ({ planId }: { planId: string; weekStart: string }): Promise<void> => {
      const { error } = await supabase.from('meal_plans').delete().eq('id', planId)
      if (error) throw error
    },
    onSuccess: (_, { weekStart }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlan.root(membership?.household_id, weekStart),
      })
    },
  })
}

/**
 * Mutation to toggle the is_locked flag on a slot.
 */
export function useToggleLock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      slotId,
      isLocked,
    }: {
      slotId: string
      isLocked: boolean
      planId: string
    }): Promise<void> => {
      const { error } = await supabase
        .from('meal_plan_slots')
        .update({ is_locked: isLocked })
        .eq('id', slotId)
      if (error) throw error
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlan.slots(planId) })
    },
  })
}
