import { useState, useEffect, useRef } from 'react'
import { useFoodSearch } from '../../hooks/useFoodSearch'
import { useCustomFoods, useDeleteCustomFood } from '../../hooks/useCustomFoods'
import { useInsertFoodLog } from '../../hooks/useFoodLogs'
import { useHousehold } from '../../hooks/useHousehold'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { PortionStepper } from '../log/PortionStepper'
import type { PortionUnit } from '../log/PortionStepper'
import { FoodDetailPanel } from './FoodDetailPanel'
import { CustomFoodForm } from './CustomFoodForm'
import type { NormalizedFoodResult, CustomFood } from '../../types/database'

interface FoodSearchOverlayProps {
  mode: 'log' | 'select'
  // log mode props
  logDate?: string
  memberId?: string
  memberType?: 'user' | 'profile'
  onClose: () => void
  // select mode props
  onSelect?: (food: NormalizedFoodResult) => void
}

type ActiveTab = 'search' | 'myfoods'

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

function SourceBadge({ source }: { source: NormalizedFoodResult['source'] }) {
  if (source === 'custom') return null
  return (
    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary/60 text-text/50 leading-none">
      {source === 'cnf' ? 'CNF' : 'USDA'}
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

const GRAMS_UNIT: PortionUnit = { description: 'grams', grams: 1 }

function buildUnits(food: NormalizedFoodResult): PortionUnit[] {
  if (!food.portions || food.portions.length === 0) return []
  const units: PortionUnit[] = food.portions.map(p => ({
    description: p.description,
    grams: p.grams,
  }))
  units.push(GRAMS_UNIT)
  return units
}

interface ResultRowProps {
  food: NormalizedFoodResult
  mode: 'log' | 'select'
  isExpanded: boolean
  onRowClick: () => void
  onViewDetails: (food: NormalizedFoodResult) => void
  onLog?: (food: NormalizedFoodResult, quantity: number, unit: PortionUnit) => Promise<void>
  isLogging?: boolean
  logError?: boolean
  verification?: VerificationResult
  canEdit?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

function ResultRow({
  food,
  mode,
  isExpanded,
  onRowClick,
  onViewDetails,
  onLog,
  isLogging,
  logError,
  verification,
  canEdit,
  onEdit,
  onDelete,
}: ResultRowProps) {
  const units = buildUnits(food)
  const hasUnits = units.length > 0
  const [quantity, setQuantity] = useState(1.0)
  const [selectedUnit, setSelectedUnit] = useState<PortionUnit>(hasUnits ? units[0] : GRAMS_UNIT)
  const [showVerifTooltip, setShowVerifTooltip] = useState(false)

  return (
    <div
      className={`bg-surface rounded-[--radius-card] px-3 py-2.5 border transition-colors ${
        isExpanded ? 'border-primary/40' : 'border-secondary hover:border-primary/40'
      }`}
    >
      {/* Collapsed row content */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={onRowClick}
        role="button"
        aria-expanded={mode === 'log' ? isExpanded : undefined}
      >
        <span className="text-sm text-text flex-1 truncate">{food.name}</span>
        <SourceBadge source={food.source} />
        {/* Verification badges */}
        {verification?.verified && !verification.warning && (
          <div className="relative shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setShowVerifTooltip(v => !v) }}
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors leading-none"
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
        <MacroText food={food} />
        {mode === 'select' && (
          <span className="shrink-0 text-xs text-primary font-medium">Add to Recipe</span>
        )}
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
            aria-label="Edit food"
          >
            ✎
          </button>
        )}
        {canEdit && onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="shrink-0 text-text/40 hover:text-red-500 transition-colors p-1"
            aria-label={`Delete ${food.name}`}
          >
            ×
          </button>
        )}
      </div>

      {/* Expanded section — log mode only */}
      {isExpanded && mode === 'log' && (
        <div className="mt-2 pt-2 border-t border-secondary/40 flex flex-col gap-2">
          <PortionStepper
            value={quantity}
            onChange={setQuantity}
            units={hasUnits ? units : undefined}
            selectedUnit={hasUnits ? selectedUnit : undefined}
            onUnitChange={hasUnits ? setSelectedUnit : undefined}
          />
          {logError && (
            <p className="text-xs text-red-400">Could not save. Try again.</p>
          )}
          <button
            onClick={() => onLog?.(food, quantity, hasUnits ? selectedUnit : GRAMS_UNIT)}
            disabled={isLogging}
            className="w-full rounded-[--radius-btn] bg-primary text-surface py-2 text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isLogging ? 'Logging…' : 'Log Food'}
          </button>
        </div>
      )}
    </div>
  )
}

function SearchTab({
  query,
  mode,
  expandedId,
  onExpandToggle,
  onSelect,
  onViewDetails,
  onLog,
  loggingId,
  logErrorId,
}: {
  query: string
  mode: 'log' | 'select'
  expandedId: string | null
  onExpandToggle: (id: string) => void
  onSelect?: (food: NormalizedFoodResult) => void
  onViewDetails: (food: NormalizedFoodResult) => void
  onLog: (food: NormalizedFoodResult, quantity: number, unit: PortionUnit) => Promise<void>
  loggingId: string | null
  logErrorId: string | null
}) {
  const { data, isLoading, error } = useFoodSearch(query)
  const [verificationMap, setVerificationMap] = useState<Record<string, VerificationResult>>({})

  useEffect(() => {
    if (!data || data.length === 0) {
      setVerificationMap({})
      return
    }
    setVerificationMap({})
    verifyFoodResults(data).then(results => setVerificationMap(results)).catch(() => {})
  }, [data])

  if (query.length < 2) {
    return <p className="text-sm text-text/50 text-center py-6">Type at least 2 characters to search.</p>
  }
  if (isLoading) return <LoadingSkeleton />
  if (error) return <p className="text-sm text-red-500 text-center py-4">Search unavailable. Check your connection and try again.</p>
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm font-medium text-text/70">No foods found</p>
        <p className="text-xs text-text/50 mt-1">Try a different spelling. No typo correction is available.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map(food => (
        <ResultRow
          key={food.id}
          food={food}
          mode={mode}
          isExpanded={expandedId === food.id}
          onRowClick={() => mode === 'select' ? onSelect?.(food) : onExpandToggle(food.id)}
          onViewDetails={onViewDetails}
          onLog={onLog}
          isLogging={loggingId === food.id}
          logError={logErrorId === food.id}
          verification={verificationMap[food.id]}
        />
      ))}
    </div>
  )
}

export function FoodSearchOverlay({
  mode,
  logDate,
  memberId,
  memberType,
  onClose,
  onSelect,
}: FoodSearchOverlayProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('search')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [logErrorId, setLogErrorId] = useState<string | null>(null)
  const [detailFood, setDetailFood] = useState<NormalizedFoodResult | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingFood, setEditingFood] = useState<CustomFood | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const { data: customFoods, isLoading: customLoading } = useCustomFoods()
  const deleteFood = useDeleteCustomFood()
  const insertLog = useInsertFoodLog()

  const isAdmin = membership?.role === 'admin'

  // Autofocus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Debounce query with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  function canEditFood(food: CustomFood): boolean {
    if (isAdmin) return true
    return food.created_by === session?.user.id
  }

  function handleRowToggle(id: string) {
    if (mode === 'select') return
    setExpandedId(prev => (prev === id ? null : id))
    setLogErrorId(null)
  }

  async function handleLog(food: NormalizedFoodResult, quantity: number, unit: PortionUnit) {
    if (!logDate || !memberId || !memberType) return

    const caloriesPerServing = (unit.grams / 100) * food.calories
    const proteinPerServing = (unit.grams / 100) * food.protein
    const fatPerServing = (unit.grams / 100) * food.fat
    const carbsPerServing = (unit.grams / 100) * food.carbs

    const itemType = food.source === 'custom' ? 'food' : food.source

    setLoggingId(food.id)
    setLogErrorId(null)

    try {
      await insertLog.mutateAsync({
        ...(memberType === 'user'
          ? { member_user_id: memberId }
          : { member_profile_id: memberId }),
        log_date: logDate,
        slot_name: null,
        meal_id: null,
        item_type: itemType,
        item_id: food.id,
        item_name: food.name,
        servings_logged: quantity,
        calories_per_serving: caloriesPerServing,
        protein_per_serving: proteinPerServing,
        fat_per_serving: fatPerServing,
        carbs_per_serving: carbsPerServing,
        micronutrients: Object.fromEntries(
          Object.entries(food.micronutrients ?? {}).map(
            ([key, val]) => [key, (unit.grams / 100) * val]
          )
        ),
        serving_unit: unit.description,
        is_private: false,
      })
      setExpandedId(null)
    } catch {
      setLogErrorId(food.id)
    } finally {
      setLoggingId(null)
    }
  }

  async function handleDeleteCustomFood(id: string) {
    try {
      await deleteFood.mutateAsync(id)
    } finally {
      setDeleteConfirm(null)
    }
  }

  const filteredCustomFoods = (customFoods ?? []).filter(f =>
    !query || f.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col transition-opacity duration-150"
      role="dialog"
      aria-label="Add Food"
    >
      {/* Header */}
      <div className="bg-surface border-b border-secondary px-4 py-3 flex items-center gap-3">
        <button
          onClick={onClose}
          className="text-text/60 hover:text-text transition-colors"
          aria-label="Back to home"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-base font-semibold text-text flex-1">Add Food</span>
        {mode === 'select' && (
          <button
            onClick={onClose}
            className="text-sm text-text/60 hover:text-text transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="px-4 py-4 bg-surface border-b border-secondary">
        <input
          ref={searchInputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search foods…"
          className="w-full bg-transparent text-sm text-text placeholder:text-text/40 focus:outline-none"
          autoFocus
        />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-secondary bg-surface px-4">
        <button
          onClick={() => setActiveTab('search')}
          className={`py-2.5 text-sm font-medium mr-4 border-b-2 -mb-px transition-colors ${
            activeTab === 'search'
              ? 'text-primary border-primary'
              : 'text-text/50 border-transparent hover:text-text'
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setActiveTab('myfoods')}
          className={`py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'myfoods'
              ? 'text-primary border-primary'
              : 'text-text/50 border-transparent hover:text-text'
          }`}
        >
          My Foods
        </button>
      </div>

      {/* Scrollable results */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
        {activeTab === 'search' && (
          <SearchTab
            query={debouncedQuery}
            mode={mode}
            expandedId={expandedId}
            onExpandToggle={handleRowToggle}
            onSelect={food => { onSelect?.(food); onClose() }}
            onViewDetails={setDetailFood}
            onLog={handleLog}
            loggingId={loggingId}
            logErrorId={logErrorId}
          />
        )}

        {activeTab === 'myfoods' && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-end pt-1">
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
              <div className="text-center py-8">
                <p className="text-sm font-medium text-text/70">No custom foods yet</p>
                <p className="text-xs text-text/50 mt-1">Add your own foods with custom nutrition data.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredCustomFoods.map(food => {
                  const normalized = customFoodToNormalized(food)
                  return (
                    <ResultRow
                      key={food.id}
                      food={normalized}
                      mode={mode}
                      isExpanded={expandedId === food.id}
                      onRowClick={() => {
                        if (mode === 'select') {
                          onSelect?.(normalized)
                          onClose()
                        } else {
                          handleRowToggle(food.id)
                        }
                      }}
                      onViewDetails={setDetailFood}
                      onLog={handleLog}
                      isLogging={loggingId === food.id}
                      logError={logErrorId === food.id}
                      canEdit={canEditFood(food)}
                      onEdit={() => setEditingFood(food)}
                      onDelete={() => setDeleteConfirm(food.id)}
                    />
                  )
                })}
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
          onAdd={mode === 'select' ? (food) => { onSelect?.(food); onClose() } : undefined}
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
            <h3 className="font-semibold text-text mb-2">
              Delete {customFoods?.find(f => f.id === deleteConfirm)?.name ?? 'custom food'}? This cannot be undone.
            </h3>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-[--radius-btn] border border-secondary py-2 text-sm text-text/60 hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCustomFood(deleteConfirm)}
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
