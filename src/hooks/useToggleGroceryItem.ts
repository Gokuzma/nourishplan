import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { queryKeys } from '../lib/queryKeys'
import type { GroceryItem } from '../types/database'

export function useToggleGroceryItem() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async ({
      item,
    }: {
      item: GroceryItem
    }) => {
      const userId = session?.user.id
      const newChecked = !item.is_checked
      const { data, error } = await supabase
        .from('grocery_items')
        .update({
          is_checked: newChecked,
          checked_by: newChecked ? (userId ?? null) : null,
          checked_at: newChecked ? new Date().toISOString() : null,
        })
        .eq('id', item.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async ({ item }) => {
      const queryKey = queryKeys.grocery.items(item.list_id)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<GroceryItem[]>(queryKey)
      queryClient.setQueryData<GroceryItem[]>(queryKey, old =>
        (old ?? []).map(i =>
          i.id === item.id ? { ...i, is_checked: !i.is_checked } : i
        )
      )
      return { previous, queryKey }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSuccess: (_data, { item }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.items(item.list_id) })
    },
  })
}
