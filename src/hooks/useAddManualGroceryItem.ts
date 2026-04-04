import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'

export function useAddManualGroceryItem() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async ({ listId, name }: { listId: string; name: string }) => {
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase
        .from('grocery_items')
        .insert({
          list_id: listId,
          household_id: householdId,
          food_name: name,
          food_id: null,
          quantity: null,
          unit: null,
          category: 'Other',
          category_source: 'auto',
          is_checked: false,
          checked_by: null,
          checked_at: null,
          is_manual: true,
          is_staple_restock: false,
          estimated_cost: null,
          notes: 'Added by you',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, { listId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grocery.items(listId) })
    },
  })
}
