import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'

export interface UpdateGroceryItemInput {
  id: string
  list_id: string
  food_name?: string
  quantity?: number | null
  unit?: string | null
  category?: string
  estimated_cost?: number | null
}

export function useUpdateGroceryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, list_id, ...updates }: UpdateGroceryItemInput) => {
      const patch: Record<string, unknown> = {}
      if (updates.food_name !== undefined) patch.food_name = updates.food_name
      if (updates.quantity !== undefined) patch.quantity = updates.quantity
      if (updates.unit !== undefined) patch.unit = updates.unit
      // When the user picks a category they implicitly override the auto-classifier.
      if (updates.category !== undefined) {
        patch.category = updates.category
        patch.category_source = 'user'
      }
      if (updates.estimated_cost !== undefined) patch.estimated_cost = updates.estimated_cost

      const { data, error } = await supabase
        .from('grocery_items')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      void list_id
      return data
    },
    onSuccess: (_data, { list_id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.items(list_id) })
    },
  })
}

export function useDeleteGroceryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, list_id }: { id: string; list_id: string }) => {
      const { error } = await supabase.from('grocery_items').delete().eq('id', id)
      if (error) throw error
      void list_id
    },
    onSuccess: (_data, { list_id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.items(list_id) })
    },
  })
}
