import { useState, useEffect } from 'react'
import { useFoodSearch } from '../../hooks/useFoodSearch'
import { useCustomFoods, useDeleteCustomFood } from '../../hooks/useCustomFoods'
import { useHousehold } from '../../hooks/useHousehold'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { FoodDetailPanel } from './FoodDetailPanel'
import { CustomFoodForm } from './CustomFoodForm'
import type { NormalizedFoodResult, CustomFood } from '../../types/database'

type ActiveTab = 'usda' | 'off' | 'custom'

interface FoodSearchProps {
  onSelect?: (food: NormalizedFoodResult) => void
  mode?: 'browse' | 'select'
}

interface VerificationResult {
  verified: boolean
  warning?: string
  reason?: string
}

function customFoodToNormalized(food: CustomFood): NormalizedFoodResult {
  return {
    id: food.id,
    name: food.name,
    source: 'custom',
    calories: food.calories_per_100g,
    protein: food.protein_per_100g,
    fat: food.fat_per_100g,
    carbs: food.carbs_per_100g,
    fiber: food.fiber_per_100g ?? undefined,
    sugar: food.sugar_per_100g ?? undefined,
    sodium: food.sodium_per_100g ?? undefined,
    micronutrients: food.micronutrients,
  }
}

function MacroText({ food }: { food: NormalizedFoodResult }) {
  return (
    <span className="text-xs text-text/50 shrink-0 ml-2 text-right">
      <span className="font-medium text-text/70">{Math.round(food.calories)}</span>
      <span> kcal</span>
      <span className="hidden sm:inline"> · P {food.protein.toFixed(1)}g · C {food.carbs.toFixed(1)}g · F {food.fat.toFixed(1)}g</span>
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-12 rounded-[--radius-btn] bg-secondary/50 animate-pulse" />
      ))}
    </div>
  )
}

interface ResultRowProps {
  food: NormalizedFoodResult
  mode: 'browse' | 'select'
  onSelect?: (food: NormalizedFoodResult) => void
  onViewDetails: (food: NormalizedFoodResult) => void
  canEdit?: boolean
  onEdit?: () => void
  onDelete?: () => void
  verification?: VerificationResult
}

function ResultRow({ food, mode, onSelect, onViewDetails, canEdit, onEdit, onDelete, verification }: ResultRowProps) {
  const [showVerifTooltip, setShowVerifTooltip] = useState(false)

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 rounded-[--radius-btn] border border-secondary/50 bg-surface hover:border-accent/40 transition-colors ${mode === 'select' ? 'cursor-pointer' : ''}`}
      onClick={mode === 'select' ? () => onSelect?.(food) : undefined}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-text truncate block">{food.name}</span>
          {/* AI verification badges */}
          {verification?.verified && !verification.warning && (
            <div className="relative shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setShowVerifTooltip(v => !v) }}
                className="text-xs text-blue-500 hover:text-blue-700 transition-colors leading-none"
                title="AI verified"
                aria-label="AI verification info"
              >
                ⓘ
              </button>
              {showVerifTooltip && (
                <div className="absolute left-0 top-5 z-10 bg-white border border-secondary/60 rounded-lg shadow-lg p-2.5 text-xs text-text w-48">
                  <p className="font-medium mb-0.5">AI Verified</p>
                  <p className="text-text/60">{verification.reason ?? 'Nutrition values confirmed by AI.'}</p>
                </div>
              )}
            </div>
          )}
          {verification?.warning && (
            <div className="relative shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setShowVerifTooltip(v => !v) }}
                className="text-xs text-amber-500 hover:text-amber-700 transition-colors leading-none"
                title="Nutrition warning"
                aria-label="Nutrition warning info"
              >
                ⚠
              </button>
              {showVerifTooltip && (
                <div className="absolute left-0 top-5 z-10 bg-white border border-amber-200 rounded-lg shadow-lg p-2.5 text-xs text-text w-48">
                  <p className="font-medium mb-0.5 text-amber-700">Nutrition Warning</p>
                  <p className="text-text/60">{verification.warning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <MacroText food={food} />
      <button
        onClick={e => { e.stopPropagation(); onViewDetails(food) }}
        className="shrink-0 text-xs text-primary/70 hover:text-primary border border-primary/30 hover:border-primary/60 rounded px-1.5 py-0.5 transition-colors"
        title="View full nutrition"
      >
        Details
      </button>
      {canEdit && onEdit && (
        <button
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="shrink-0 text-text/40 hover:text-text transition-colors p-1"
          title="Edit"
          aria-label="Edit food"
        >
          ✎
        </button>
      )}
      {canEdit && onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="shrink-0 text-text/40 hover:text-red-500 transition-colors p-1"
          title="Delete"
          aria-label="Delete food"
        >
          ×
        </button>
      )}
    </div>
  )
}

/**
 * Run AI verification on the top results in the background.
 * Returns a map of food id -> VerificationResult.
 * Fails silently — callers display results without badges on error.
 */
async function verifyFoodResults(
  foods: NormalizedFoodResult[],
): Promise<Record<string, VerificationResult>> {
  const results: Record<string, VerificationResult> = {}
  const top5 = foods.slice(0, 5)

  await Promise.allSettled(
    top5.map(async food => {
      const { data, error } = await supabase.functions.invoke('verify-nutrition', {
        body: {
          foodName: food.name,
          calories: food.calories,
          protein: food.protein,
          fat: food.fat,
          carbs: food.carbs,
        },
      })
      if (!error && data) {
        results[food.id] = {
          verified: data.verified ?? false,
          warning: data.warning ?? undefined,
          reason: data.reason ?? undefined,
        }
      }
    })
  )

  return results
}

function ApiTab({ tab, query, mode, onSelect, onViewDetails }: {
  tab: 'usda' | 'off'
  query: string
  mode: 'browse' | 'select'
  onSelect?: (food: NormalizedFoodResult) => void
  onViewDetails: (food: NormalizedFoodResult) => void
}) {
  const { data, isLoading, isError } = useFoodSearch(tab, query)
  const [verificationMap, setVerificationMap] = useState<Record<string, VerificationResult>>({})

  // Run AI verification in the background after results load
  useEffect(() => {
    if (!data || data.length === 0) {
      setVerificationMap({})
      return
    }
    setVerificationMap({})
    verifyFoodResults(data).then(results => setVerificationMap(results)).catch(() => {
      // Graceful degradation — no badges shown
    })
  }, [data])

  if (query.length < 2) {
    return <p className="text-sm text-text/50 text-center py-6">Type at least 2 characters to search.</p>
  }
  if (isLoading) return <LoadingSkeleton />
  if (isError) return <p className="text-sm text-red-500 text-center py-4">Search failed. Please try again.</p>
  if (!data || data.length === 0) return <p className="text-sm text-text/50 text-center py-6">No results found.</p>

  return (
    <div className="flex flex-col gap-1.5">
      {data.map(food => (
        <ResultRow
          key={food.id}
          food={food}
          mode={mode}
          onSelect={onSelect}
          onViewDetails={onViewDetails}
          verification={verificationMap[food.id]}
        />
      ))}
    </div>
  )
}

export function FoodSearch({ onSelect, mode = 'browse' }: FoodSearchProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('usda')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [detailFood, setDetailFood] = useState<NormalizedFoodResult | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingFood, setEditingFood] = useState<CustomFood | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const { data: customFoods, isLoading: customLoading } = useCustomFoods()
  const deleteFood = useDeleteCustomFood()

  const isAdmin = membership?.role === 'admin'

  // Debounce query with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const filteredCustomFoods = (customFoods ?? []).filter(f =>
    !query || f.name.toLowerCase().includes(query.toLowerCase())
  )

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'usda', label: 'USDA' },
    { key: 'off', label: 'Open Food Facts' },
    { key: 'custom', label: 'My Foods' },
  ]

  function canEditFood(food: CustomFood): boolean {
    if (isAdmin) return true
    return food.created_by === session?.user.id
  }

  async function handleDelete(id: string) {
    try {
      await deleteFood.mutateAsync(id)
    } finally {
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search foods..."
        className="w-full rounded-[--radius-card] border border-accent/30 bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      {/* Tabs */}
      <div className="flex border-b border-secondary">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text/50 hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[120px]">
        {activeTab === 'usda' && (
          <ApiTab
            tab="usda"
            query={debouncedQuery}
            mode={mode}
            onSelect={onSelect}
            onViewDetails={setDetailFood}
          />
        )}

        {activeTab === 'off' && (
          <ApiTab
            tab="off"
            query={debouncedQuery}
            mode={mode}
            onSelect={onSelect}
            onViewDetails={setDetailFood}
          />
        )}

        {activeTab === 'custom' && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddForm(true)}
                className="text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-[--radius-btn] px-3 py-1.5 font-medium transition-colors"
              >
                + Add Custom Food
              </button>
            </div>

            {customLoading ? (
              <LoadingSkeleton />
            ) : filteredCustomFoods.length === 0 ? (
              <p className="text-sm text-text/50 text-center py-6">
                {query ? 'No matching custom foods.' : 'No custom foods yet. Add one above.'}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filteredCustomFoods.map(food => (
                  <ResultRow
                    key={food.id}
                    food={customFoodToNormalized(food)}
                    mode={mode}
                    onSelect={onSelect}
                    onViewDetails={setDetailFood}
                    canEdit={mode === 'browse' && canEditFood(food)}
                    onEdit={() => setEditingFood(food)}
                    onDelete={() => setDeleteConfirm(food.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Food detail panel */}
      {detailFood && (
        <FoodDetailPanel
          food={detailFood}
          onClose={() => setDetailFood(null)}
          onAdd={onSelect ? (food) => { onSelect(food); setDetailFood(null) } : undefined}
        />
      )}

      {/* Add custom food modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <h2 className="font-bold text-lg text-primary mb-4">Add Custom Food</h2>
            <CustomFoodForm
              onSave={() => setShowAddForm(false)}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit custom food modal */}
      {editingFood && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingFood(null)} />
          <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <h2 className="font-bold text-lg text-primary mb-4">Edit Food</h2>
            <CustomFoodForm
              food={editingFood}
              onSave={() => setEditingFood(null)}
              onCancel={() => setEditingFood(null)}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-5 mx-4">
            <h3 className="font-semibold text-text mb-2">Delete custom food?</h3>
            <p className="text-sm text-text/60 mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-[--radius-btn] border border-secondary py-2 text-sm text-text/60 hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteFood.isPending}
                className="flex-1 rounded-[--radius-btn] bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteFood.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
