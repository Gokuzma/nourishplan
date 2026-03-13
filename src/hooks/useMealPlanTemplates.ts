import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import type { MealPlanTemplate, MealPlanTemplateSlot } from '../types/database'

/**
 * Returns all meal plan templates for the current household.
 */
export function useTemplates() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: ['meal-plan-templates', householdId],
    queryFn: async (): Promise<MealPlanTemplate[]> => {
      const { data, error } = await supabase
        .from('meal_plan_templates')
        .select('*')
        .eq('household_id', householdId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })
}

/**
 * Mutation to save the current plan's slots as a named template.
 * Inserts a template row, then copies each slot from the plan into template_slots.
 */
export function useSaveAsTemplate() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async ({ name, planId }: { name: string; planId: string }): Promise<MealPlanTemplate> => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      // Insert template row
      const { data: template, error: templateError } = await supabase
        .from('meal_plan_templates')
        .insert({ name, household_id: householdId, created_by: userId })
        .select()
        .single()

      if (templateError) throw templateError

      // Fetch current plan's slots
      const { data: slots, error: slotsError } = await supabase
        .from('meal_plan_slots')
        .select('day_index, slot_name, slot_order, meal_id')
        .eq('plan_id', planId)

      if (slotsError) throw slotsError

      // Insert template slots (skip empty slots)
      const templateSlots = (slots ?? []).map((slot) => ({
        template_id: template.id,
        day_index: slot.day_index,
        slot_name: slot.slot_name,
        slot_order: slot.slot_order,
        meal_id: slot.meal_id,
      }))

      if (templateSlots.length > 0) {
        const { error: insertError } = await supabase
          .from('meal_plan_template_slots')
          .insert(templateSlots)

        if (insertError) throw insertError
      }

      return template
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: ['meal-plan-templates', householdId] })
    },
  })
}

/**
 * Mutation to load a template into an existing plan.
 * Upserts each template slot into meal_plan_slots on (plan_id, day_index, slot_name).
 */
export function useLoadTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ templateId, planId }: { templateId: string; planId: string }): Promise<void> => {
      // Fetch template slots
      const { data: templateSlots, error: slotsError } = await supabase
        .from('meal_plan_template_slots')
        .select('*')
        .eq('template_id', templateId)

      if (slotsError) throw slotsError

      if (!templateSlots || templateSlots.length === 0) return

      // Upsert into plan slots
      const planSlots = templateSlots.map((slot: MealPlanTemplateSlot) => ({
        plan_id: planId,
        day_index: slot.day_index,
        slot_name: slot.slot_name,
        slot_order: slot.slot_order,
        meal_id: slot.meal_id,
        is_override: false,
      }))

      const { error: upsertError } = await supabase
        .from('meal_plan_slots')
        .upsert(planSlots, { onConflict: 'plan_id,day_index,slot_name' })

      if (upsertError) throw upsertError
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan-slots', planId] })
    },
  })
}

/**
 * Mutation to delete a template (cascade deletes its slots via DB constraint).
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      const { error } = await supabase
        .from('meal_plan_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      queryClient.invalidateQueries({ queryKey: ['meal-plan-templates', householdId] })
    },
  })
}

/**
 * Mutation to copy last week's plan slots into the current week's plan.
 * Finds the previous week's plan and copies its slots via upsert.
 */
export function useRepeatLastWeek() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async ({
      currentPlanId,
      previousWeekStart,
    }: {
      currentPlanId: string
      previousWeekStart: string
    }): Promise<void> => {
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      // Find the previous week's plan
      const { data: prevPlan, error: planError } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('household_id', householdId)
        .eq('week_start', previousWeekStart)
        .maybeSingle()

      if (planError) throw planError
      if (!prevPlan) return // No previous plan — nothing to copy

      // Fetch previous plan's slots
      const { data: prevSlots, error: slotsError } = await supabase
        .from('meal_plan_slots')
        .select('day_index, slot_name, slot_order, meal_id')
        .eq('plan_id', prevPlan.id)

      if (slotsError) throw slotsError
      if (!prevSlots || prevSlots.length === 0) return

      // Upsert into current plan's slots
      const currentSlots = prevSlots.map((slot) => ({
        plan_id: currentPlanId,
        day_index: slot.day_index,
        slot_name: slot.slot_name,
        slot_order: slot.slot_order,
        meal_id: slot.meal_id,
        is_override: false,
      }))

      const { error: upsertError } = await supabase
        .from('meal_plan_slots')
        .upsert(currentSlots, { onConflict: 'plan_id,day_index,slot_name' })

      if (upsertError) throw upsertError
    },
    onSuccess: (_, { currentPlanId }) => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan-slots', currentPlanId] })
    },
  })
}
