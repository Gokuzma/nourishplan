import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { useGroceryList } from '../hooks/useGroceryList'
import { useGroceryItems } from '../hooks/useGroceryItems'
import { useGenerateGroceryList } from '../hooks/useGenerateGroceryList'
import { useToggleGroceryItem } from '../hooks/useToggleGroceryItem'
import { useAddManualGroceryItem } from '../hooks/useAddManualGroceryItem'
import { useMealPlan } from '../hooks/useMealPlan'
import { getWeekStart } from '../utils/mealPlan'
import { formatCost } from '../utils/cost'
import { GroceryCategorySection } from '../components/grocery/GroceryCategorySection'
import { GroceryAlreadyHaveSection } from '../components/grocery/GroceryAlreadyHaveSection'
import { BudgetWarningBanner } from '../components/grocery/BudgetWarningBanner'
import { ManualAddItemInput } from '../components/grocery/ManualAddItemInput'
import type { GroceryItem } from '../types/database'

interface UndoToast {
  itemId: string
  message: string
}

export function GroceryPage() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id
  const weeklyBudget = membership?.households?.weekly_budget ?? null
  const weekStartDay = membership?.households?.week_start_day ?? 0
  const weekStart = getWeekStart(new Date(), weekStartDay)

  const { data: list, isPending: listLoading } = useGroceryList(weekStart)
  const { data: items = [] } = useGroceryItems(list?.id)
  const { data: mealPlan, isPending: planLoading } = useMealPlan(weekStart)

  const generateMutation = useGenerateGroceryList()
  const toggleItem = useToggleGroceryItem()
  const addManualItem = useAddManualGroceryItem()

  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const [undoTimerId, setUndoTimerId] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Split items into need-to-buy and already-have
  const needToBuy = items.filter((i: GroceryItem) => i.notes !== 'inventory-covered')
  const alreadyHave = items.filter((i: GroceryItem) => i.notes === 'inventory-covered')

  // Group need-to-buy by category
  const categoriesMap = new Map<string, GroceryItem[]>()
  for (const item of needToBuy) {
    const cat = item.category
    const existing = categoriesMap.get(cat) ?? []
    existing.push(item)
    categoriesMap.set(cat, existing)
  }
  const categories = Array.from(categoriesMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  // Compute estimated total
  const estimatedTotal = needToBuy.reduce((sum, item) => {
    return sum + (item.estimated_cost ?? 0)
  }, 0)

  const isOverBudget = weeklyBudget != null && estimatedTotal > weeklyBudget
  const overAmount = weeklyBudget != null ? estimatedTotal - weeklyBudget : 0

  function handleToggle(itemId: string, _checked: boolean) {
    const item = items.find((i: GroceryItem) => i.id === itemId)
    if (!item) return

    // Clear previous undo timer
    if (undoTimerId) clearTimeout(undoTimerId)

    toggleItem.mutate({ item })

    // Show undo toast only when checking (not unchecking)
    if (!item.is_checked) {
      setUndoToast({ itemId, message: 'Item checked' })
      const timer = setTimeout(() => setUndoToast(null), 4000)
      setUndoTimerId(timer)
    } else {
      setUndoToast(null)
    }
  }

  function handleUndo() {
    if (!undoToast) return
    const item = items.find((i: GroceryItem) => i.id === undoToast.itemId)
    if (item) toggleItem.mutate({ item })
    if (undoTimerId) clearTimeout(undoTimerId)
    setUndoToast(null)
    setUndoTimerId(null)
  }

  function handleGenerate() {
    generateMutation.mutate()
  }

  function handleRegenerate() {
    setShowRegenerateConfirm(false)
    generateMutation.mutate()
  }

  function handleManualAdd(name: string) {
    if (!list?.id) return
    addManualItem.mutate({ listId: list.id, name })
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerId) clearTimeout(undoTimerId)
    }
  }, [undoTimerId])

  const isLoading = listLoading || planLoading

  if (isLoading && !householdId) {
    return (
      <div className="px-4 py-6 font-sans pb-[64px]">
        <p className="text-text/60 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 font-sans pb-[64px]">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-text">Grocery List</h1>
        {list && !showRegenerateConfirm && (
          <button
            type="button"
            onClick={() => setShowRegenerateConfirm(true)}
            disabled={generateMutation.isPending}
            className="text-sm text-text/60 border border-secondary rounded-[--radius-btn] px-3 py-1.5 min-h-[44px] hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Regenerate List
          </button>
        )}
      </div>

      {/* Regenerate confirmation */}
      {showRegenerateConfirm && (
        <div className="mb-4 bg-surface border border-secondary rounded-[--radius-card] px-4 py-3 text-sm">
          <p className="text-text mb-3">
            Regenerate List — checked items will be reset. Continue?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={generateMutation.isPending}
              className="bg-accent text-white px-4 py-2 rounded-[--radius-btn] text-sm min-h-[44px] disabled:opacity-50"
            >
              {generateMutation.isPending ? 'Regenerating…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(false)}
              className="border border-secondary px-4 py-2 rounded-[--radius-btn] text-sm text-text/70 min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* No meal plan empty state */}
      {!mealPlan && !planLoading && (
        <div className="py-12 text-center">
          <h2 className="text-lg font-semibold text-text mb-2">No active meal plan</h2>
          <p className="text-sm text-text/60 mb-6">
            Create a meal plan for this week to generate your grocery list.
          </p>
          <Link
            to="/plan"
            className="inline-block bg-accent text-white rounded-[--radius-btn] px-6 py-2.5 min-h-[44px] text-sm font-medium"
          >
            Go to Plan
          </Link>
        </div>
      )}

      {/* Has meal plan but no list yet */}
      {mealPlan && !list && !listLoading && (
        <div className="py-12 text-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full bg-accent text-white rounded-[--radius-btn] min-h-[44px] text-sm font-medium py-3 disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Generating…' : 'Generate Grocery List'}
          </button>
          {generateMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-3">
              Couldn&apos;t generate your list. Check your connection and try again.
            </p>
          )}
        </div>
      )}

      {/* List exists */}
      {list && (
        <>
          {/* Cost summary bar */}
          <div className="bg-surface border border-secondary rounded-[--radius-card] px-4 py-3 mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-text">
              Est. total: {formatCost(estimatedTotal)}
            </span>
            {needToBuy.length > 0 && (
              <span className="text-xs text-text/50">
                {needToBuy.filter(i => i.is_checked).length} of {needToBuy.length} checked
              </span>
            )}
          </div>

          {/* Over-budget warning */}
          {isOverBudget && weeklyBudget != null && (
            <div className="mb-4">
              <BudgetWarningBanner overAmount={overAmount} weeklyBudget={weeklyBudget} />
            </div>
          )}

          {/* Need to Buy section */}
          {needToBuy.length > 0 ? (
            <div className="mb-2">
              <h2 className="text-base font-semibold text-text mb-3 px-3">Need to Buy</h2>
              {categories.map(([category, categoryItems]) => (
                <GroceryCategorySection
                  key={category}
                  category={category}
                  items={categoryItems}
                  onToggle={handleToggle}
                />
              ))}
              <ManualAddItemInput onAdd={handleManualAdd} />
            </div>
          ) : (
            <div className="py-8 text-center">
              <h2 className="text-base font-semibold text-text mb-2">No ingredients to shop for</h2>
              <p className="text-sm text-text/60">
                Your meal plan doesn&apos;t have any recipe ingredients yet. Add recipes to your plan to generate a list.
              </p>
              <div className="mt-4">
                <ManualAddItemInput onAdd={handleManualAdd} />
              </div>
            </div>
          )}

          {/* Already Have section */}
          <GroceryAlreadyHaveSection items={alreadyHave} />
        </>
      )}

      {/* Undo toast */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[72px] left-1/2 -translate-x-1/2 bg-surface border border-secondary rounded-[--radius-card] px-4 py-2.5 text-sm text-text shadow-lg flex items-center gap-3 z-40"
        >
          <span>Item checked</span>
          <button
            type="button"
            onClick={handleUndo}
            className="text-primary font-medium hover:underline"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
