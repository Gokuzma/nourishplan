import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { NormalizedFoodResult } from '../types/database'

/**
 * Searches USDA and CNF simultaneously via Supabase Edge Functions.
 * Results are merged with CNF priority: when both sources return a food
 * with the same name, the CNF result is used and the USDA duplicate is dropped.
 * Returns empty array for queries shorter than 2 characters.
 * Results are cached for 5 minutes.
 */
export function useFoodSearch(query: string) {
  const usdaQuery = useQuery({
    queryKey: ['food-search', 'usda', query],
    queryFn: async (): Promise<NormalizedFoodResult[]> => {
      if (query.length < 2) return []
      const { data, error } = await supabase.functions.invoke('search-usda', {
        body: { query },
      })
      if (error) throw error
      return (data as NormalizedFoodResult[]) ?? []
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  })

  const cnfQuery = useQuery({
    queryKey: ['food-search', 'cnf', query],
    queryFn: async (): Promise<NormalizedFoodResult[]> => {
      if (query.length < 2) return []
      const { data, error } = await supabase.functions.invoke('search-cnf', {
        body: { query },
      })
      if (error) throw error
      return (data as NormalizedFoodResult[]) ?? []
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Show results progressively: loading only while both are still fetching
  // and neither has returned data yet
  const hasAnyData = (usdaQuery.data && usdaQuery.data.length > 0) || (cnfQuery.data && cnfQuery.data.length > 0)
  const isLoading = (usdaQuery.isLoading || cnfQuery.isLoading) && !hasAnyData
  // Only report error if both sources failed
  const error = (usdaQuery.error && cnfQuery.error) ? usdaQuery.error : null

  // Merge results: CNF first, skip USDA items whose lowercase name already appears in CNF
  // useMemo prevents new array reference on every render (avoids infinite useEffect loops in consumers)
  const data = useMemo(() => {
    const cnfResults = cnfQuery.data ?? []
    const usdaResults = usdaQuery.data ?? []

    const seenNames = new Set<string>()
    const merged: NormalizedFoodResult[] = []

    for (const food of cnfResults) {
      seenNames.add(food.name.toLowerCase())
      merged.push(food)
    }

    for (const food of usdaResults) {
      if (!seenNames.has(food.name.toLowerCase())) {
        merged.push(food)
      }
    }

    return merged
  }, [cnfQuery.data, usdaQuery.data])

  return { data, isLoading, error }
}
