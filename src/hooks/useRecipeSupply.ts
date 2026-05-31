import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useHousehold } from './useHousehold'
import type { MealSlot } from '../utils/recipeSupply'

export interface ProposedIngredient {
  name: string
  quantity_grams: number
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
}

export interface ProposedRecipe {
  name: string
  slot: MealSlot
  servings: number
  instructions: string
  ingredients: ProposedIngredient[]
}

interface PreviewResponse {
  success: boolean
  proposals?: ProposedRecipe[]
  error?: string
}

interface CommitResponse {
  success: boolean
  created?: { id: string; name: string }[]
  error?: string
}

interface ClassifyResponse {
  success: boolean
  classified?: number
  total?: number
  error?: string
}

function useReady() {
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  return { session, householdId: membership?.household_id }
}

/** Generate slot-appropriate recipes for review WITHOUT saving them. */
export function usePreviewGapRecipes() {
  const { session, householdId } = useReady()
  return useMutation({
    mutationFn: async ({ slot, count }: { slot: MealSlot; count: number }): Promise<ProposedRecipe[]> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')
      const { data, error } = await supabase.functions.invoke('recipe-supply', {
        body: { mode: 'preview', slot, count },
      })
      if (error) throw error
      const res = data as PreviewResponse
      if (!res.success || !res.proposals) throw new Error(res.error ?? 'Generation failed')
      return res.proposals
    },
  })
}

/** Persist reviewed recipes (each tagged with its slot). */
export function useCommitGapRecipes() {
  const queryClient = useQueryClient()
  const { session, householdId } = useReady()
  return useMutation({
    mutationFn: async (recipes: ProposedRecipe[]): Promise<{ id: string; name: string }[]> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')
      const { data, error } = await supabase.functions.invoke('recipe-supply', {
        body: { mode: 'commit', recipes },
      })
      if (error) throw error
      const res = data as CommitResponse
      if (!res.success || !res.created) throw new Error(res.error ?? 'Save failed')
      return res.created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

/** Backfill meal_types for the household's untagged recipes. */
export function useClassifyRecipes() {
  const queryClient = useQueryClient()
  const { session, householdId } = useReady()
  return useMutation({
    mutationFn: async (): Promise<{ classified: number; total: number }> => {
      if (!session) throw new Error('Not authenticated')
      if (!householdId) throw new Error('No household found')
      const { data, error } = await supabase.functions.invoke('recipe-supply', {
        body: { mode: 'classify' },
      })
      if (error) throw error
      const res = data as ClassifyResponse
      if (!res.success) throw new Error(res.error ?? 'Classification failed')
      return { classified: res.classified ?? 0, total: res.total ?? 0 }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
