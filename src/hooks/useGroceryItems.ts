import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import type { GroceryItem } from '../types/database'

export function useGroceryItems(listId: string | undefined) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.grocery.items(listId),
    queryFn: async (): Promise<GroceryItem[]> => {
      const { data, error } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('list_id', listId!)
        .order('category')
        .order('food_name')
      if (error) throw error
      return data ?? []
    },
    enabled: !!listId,
  })

  useEffect(() => {
    if (!listId) return
    const channel = supabase
      .channel(`grocery-items-${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `list_id=eq.${listId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.grocery.items(listId) })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [listId, queryClient])

  return query
}
