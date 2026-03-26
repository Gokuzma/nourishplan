import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'
import type { NormalizedFoodResult } from '../types/database'

/**
 * Scores a food name against a query using five relevance tiers:
 * exact match (1.0), starts-with (0.9), word boundary (0.7), contains (0.5), no match (0.3).
 * Returns 0.5 for empty queries (neutral).
 */
export function scoreFood(name: string, query: string, dataType?: string): number {
  const n = name.toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) return 0.5
  let score: number
  if (n === q) score = 1.0
  else if (n.startsWith(q)) score = 0.9
  else if (n.split(/\s+/).some(word => word.startsWith(q))) score = 0.7
  else if (n.includes(q)) score = 0.5
  else score = 0.3

  // Boost Foundation/SR Legacy data types
  if (dataType === 'Foundation' || dataType === 'SR Legacy') score += 0.1
  // Penalize ALL-CAPS names (branded products)
  if (name === name.toUpperCase() && name.length > 3) score -= 0.1
  // Penalize names with 2+ commas (obscure variants)
  if ((name.match(/,/g) ?? []).length >= 2) score -= 0.05
  // Boost whole foods containing ", raw"
  if (n.includes(', raw')) score += 0.02

  return score
}

/**
 * Searches USDA and CNF simultaneously via Supabase Edge Functions.
 * Results are merged with CNF priority: when both sources return a food
 * with the same name, the CNF result is used and the USDA duplicate is dropped.
 * Returns empty array for queries shorter than 2 characters.
 * Results are cached for 5 minutes.
 */
export function useFoodSearch(query: string) {
  const usdaQuery = useQuery({
    queryKey: queryKeys.foodSearch.usda(query),
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
    retry: 2,
    retryDelay: (attempt) => attempt * 1500,
  })

  const cnfQuery = useQuery({
    queryKey: queryKeys.foodSearch.cnf(query),
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
    retry: 2,
    retryDelay: (attempt) => attempt * 1500,
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

    const scored = merged.map(food => ({ food, score: scoreFood(food.name, query, food.dataType) }))
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.food.name.length - b.food.name.length
    })
    return scored.map(s => s.food)
  }, [cnfQuery.data, usdaQuery.data, query])

  return { data, isLoading, error }
}
