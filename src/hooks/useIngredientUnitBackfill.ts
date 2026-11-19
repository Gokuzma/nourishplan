import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useHousehold } from './useHousehold'

const MAX_BATCHES = 10
const started = new Set<string>()

/**
 * Once per app load, converts this household's older recipe ingredients from
 * grams to recipe-style amounts ("2", "1 cup") in the background. Display only;
 * grams never change. Quietly does nothing if it fails — grams still show.
 */
export function useIngredientUnitBackfill() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  useEffect(() => {
    if (!householdId || started.has(householdId)) return
    started.add(householdId)
    ;(async () => {
      let converted = 0
      for (let i = 0; i < MAX_BATCHES; i++) {
        const { data, error } = await supabase.functions.invoke('ingredient-units', { body: {} })
        if (error || !data?.success) break
        converted += data.updated ?? 0
        if (!data.remaining) break
      }
      if (converted > 0) {
        queryClient.invalidateQueries({ queryKey: ['recipe-ingredients'] })
        queryClient.invalidateQueries({ queryKey: ['recipes', householdId] })
      }
    })()
  }, [householdId, queryClient])
}
