import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useHousehold } from './useHousehold'
import { useInventoryItems } from './useInventory'
import { computeFifoDeductions, convertToGrams } from '../utils/inventory'
import type { InventoryItem } from '../types/database'

export interface DeductionResult {
  deductions: { item: InventoryItem; deductAmount: number }[]
  missing: string[]
  error?: string
}

export function useInventoryDeduct() {
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const { data: allItems } = useInventoryItems() // no location filter — search all

  return useMutation({
    mutationFn: async (
      needs: { food_id: string | null; food_name: string; quantity_grams: number }[]
    ): Promise<DeductionResult> => {
      const householdId = membership?.household_id
      if (!householdId || !allItems) {
        return { deductions: [], missing: needs.map(n => n.food_name) }
      }

      const activeItems = allItems.filter(i => !i.removed_at)
      const { deductions, missing } = computeFifoDeductions(activeItems, needs)

      if (deductions.length === 0) return { deductions: [], missing }

      // Batch update: for each deduction, compute new quantity_remaining in the item's original unit
      const updates = deductions
        .map(d => {
          const currentGrams = convertToGrams(d.item.quantity_remaining, d.item.unit)
          if (currentGrams === null) return null // 'units' type — skip
          const newGrams = Math.max(0, currentGrams - d.deductAmount)
          // Convert back to original unit
          const conversionFactor = d.item.unit === 'kg' || d.item.unit === 'L' ? 1000 : 1
          const newQuantity = newGrams / conversionFactor
          return { id: d.item.id, quantity_remaining: Math.round(newQuantity * 100) / 100 }
        })
        .filter(Boolean) as { id: string; quantity_remaining: number }[]

      // Execute batch updates
      for (const upd of updates) {
        const { error } = await supabase
          .from('inventory_items')
          .update({ quantity_remaining: upd.quantity_remaining, updated_at: new Date().toISOString() })
          .eq('id', upd.id)
        if (error) {
          return { deductions, missing, error: error.message }
        }
      }

      return { deductions, missing }
    },
    onSuccess: () => {
      const householdId = membership?.household_id
      if (householdId) {
        queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })
      }
    },
  })
}
