import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { NormalizedFoodResult } from '../types/database'

/**
 * Searches USDA or Open Food Facts via Supabase Edge Functions.
 * Returns empty array for queries shorter than 2 characters.
 * Results are cached for 5 minutes.
 */
export function useFoodSearch(tab: 'usda' | 'off', query: string) {
  return useQuery({
    queryKey: ['food-search', tab, query],
    queryFn: async (): Promise<NormalizedFoodResult[]> => {
      if (query.length < 2) return []

      const functionName = tab === 'usda' ? 'search-usda' : 'search-off'
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { query },
      })

      if (error) throw error
      return (data as NormalizedFoodResult[]) ?? []
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  })
}
