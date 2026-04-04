import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useHousehold } from './useHousehold'
import { queryKeys } from '../lib/queryKeys'
import type { GroceryList } from '../types/database'

export function useGroceryList(weekStart: string) {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: queryKeys.grocery.list(householdId, weekStart),
    queryFn: async (): Promise<GroceryList | null> => {
      const { data, error } = await supabase
        .from('grocery_lists')
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
