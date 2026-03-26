import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../hooks/useHousehold'
import { useFoodLogs, useBulkInsertFoodLogs, useUpdateFoodLog, useDeleteFoodLog } from '../hooks/useFoodLogs'
import { useNutritionTarget } from '../hooks/useNutritionTargets'
import { useMealPlan, useMealPlanSlots } from '../hooks/useMealPlan'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { ProgressRing } from '../components/plan/ProgressRing'
import { MemberSelector } from '../components/plan/MemberSelector'
import { DailyLogList } from '../components/log/DailyLogList'
import { NutrientBreakdown } from '../components/log/NutrientBreakdown'
import { LogMealModal } from '../components/log/LogMealModal'
import { FoodSearchOverlay } from '../components/food/FoodSearchOverlay'
import { PortionStepper } from '../components/log/PortionStepper'
import { calcLogEntryNutrition, calcDayNutrition, MICRONUTRIENT_DISPLAY_ORDER, MICRONUTRIENT_LABELS } from '../utils/nutrition'
import { getWeekStart } from '../utils/mealPlan'
import { getUnloggedSlots } from '../utils/foodLogs'
import { InventorySummaryWidget } from '../components/inventory/InventorySummaryWidget'
import type { FoodLog } from '../types/database'
import type { SlotWithMeal } from '../hooks/useMealPlan'

/** Returns today's date as YYYY-MM-DD using UTC to avoid timezone drift. */
function todayString(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Compute the day_index for a YYYY-MM-DD string relative to its week start. */
function getDayIndex(dateStr: string, weekStart: string): number {
  const [dy, dm, dd] = dateStr.split('-').map(Number)
  const [wy, wm, wd] = weekStart.split('-').map(Number)
  const dateMs = Date.UTC(dy, dm - 1, dd)
  const weekMs = Date.UTC(wy, wm - 1, wd)
  return Math.round((dateMs - weekMs) / 86400000)
}

// ─── Edit Log Modal ───────────────────────────────────────────────────────────

interface EditLogModalProps {
  log: FoodLog
  onClose: () => void
}

function EditLogModal({ log, onClose }: EditLogModalProps) {
  const [servings, setServings] = useState(log.servings_logged)
  const [isPrivate, setIsPrivate] = useState(log.is_private)

  const updateLog = useUpdateFoodLog()
  const deleteLog = useDeleteFoodLog()

  async function handleSave() {
    try {
      await updateLog.mutateAsync({ id: log.id, servings_logged: servings, is_private: isPrivate })
      onClose()
    } catch {
      // surfaced via updateLog.isError
    }
  }

  async function handleDelete() {
    try {
      await deleteLog.mutateAsync(log.id)
      onClose()
    } catch {
      // surfaced via deleteLog.isError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg text-primary">{log.item_name}</h2>
            {log.slot_name && (
              <p className="text-sm text-text/50">{log.slot_name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-text/40 hover:text-text transition-colors p-1" aria-label="Close">
            ×
          </button>
        </div>

        <div className="flex gap-4 mb-4 p-3 rounded-[--radius-card] bg-secondary/20">
          <div className="text-center flex-1">
            <p className="text-xs text-text/50">Calories</p>
            <p className="font-semibold text-text">{Math.round(log.calories_per_serving * servings)}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-text/50">Protein</p>
            <p className="font-semibold text-text">{(log.protein_per_serving * servings).toFixed(1)}g</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-text/50">Carbs</p>
            <p className="font-semibold text-text">{(log.carbs_per_serving * servings).toFixed(1)}g</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-text/50">Fat</p>
            <p className="font-semibold text-text">{(log.fat_per_serving * servings).toFixed(1)}g</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-text/70 mb-2">Servings</p>
          <PortionStepper value={servings} onChange={setServings} />
        </div>

        <label className="flex items-center gap-2 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
            className="rounded border-secondary accent-primary"
          />
          <span className="text-sm text-text/70">Mark as private</span>
        </label>

        {(updateLog.isError || deleteLog.isError) && (
          <p className="text-sm text-red-500 mb-3">Operation failed. Please try again.</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={deleteLog.isPending}
            className="rounded-[--radius-btn] border border-red-200 py-2.5 px-4 text-sm text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-[--radius-btn] border border-secondary py-2.5 text-sm text-text/60 hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateLog.isPending}
            className="flex-1 rounded-[--radius-btn] bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {updateLog.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Micronutrient ring colors ────────────────────────────────────────────────

const MICRO_RING_COLORS: Record<string, string> = {
  fiber: '#A8C5A0',
  sodium: '#A2C4D8',
  calcium: '#C4B4D8',
  iron: '#D8A2A2',
  potassium: '#D8C8A2',
  vitamin_c: '#C8D8A2',
  vitamin_a: '#D8B4A2',
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export function HomePage() {
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const isOnline = useOnlineStatus()

  const householdId = membership?.household_id
  const weekStartDay = membership?.households?.week_start_day ?? 0

  const [selectedDate, setSelectedDate] = useState(todayString)
  const [selectedMemberId, setSelectedMemberId] = useState<string>(session?.user.id ?? '')
  const [selectedMemberType, setSelectedMemberType] = useState<'user' | 'profile'>('user')

  const [logMealSlot, setLogMealSlot] = useState<SlotWithMeal | null>(null)
  const [editLog, setEditLog] = useState<FoodLog | null>(null)
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false)

  const weekStart = getWeekStart(new Date(`${selectedDate}T00:00:00Z`), weekStartDay)

  const { data: logs = [] } = useFoodLogs(householdId, selectedDate, selectedMemberId, selectedMemberType)
  const { data: target = null } = useNutritionTarget(householdId, selectedMemberId, selectedMemberType)
  const { data: mealPlan } = useMealPlan(weekStart)
  const { data: allSlots = [] } = useMealPlanSlots(mealPlan?.id)

  const bulkInsert = useBulkInsertFoodLogs()
  const deleteLog = useDeleteFoodLog()

  const totals = calcDayNutrition(logs.map(calcLogEntryNutrition))

  const microTotals = MICRONUTRIENT_DISPLAY_ORDER.reduce((acc, key) => {
    acc[key] = logs.reduce((sum, log) =>
      sum + ((log.micronutrients?.[key] ?? 0) * log.servings_logged), 0)
    return acc
  }, {} as Record<string, number>)

  const hasIncompleteMicroData = logs.length > 0 && logs.some(log =>
    Object.keys(log.micronutrients ?? {}).length === 0
  )

  const [showMicroDetail, setShowMicroDetail] = useState(false)

  const dayIndex = getDayIndex(selectedDate, weekStart)
  const daySlots = allSlots.filter(s => s.day_index === dayIndex && s.meal_id != null)
  const unloggedSlots = getUnloggedSlots(daySlots, logs)

  function handleMemberSelect(id: string, type: 'user' | 'profile') {
    setSelectedMemberId(id)
    setSelectedMemberType(type)
  }

  async function handleLogAll() {
    if (!isOnline || unloggedSlots.length === 0) return

    const rows = unloggedSlots
      .filter(slot => slot.meals != null)
      .map(slot => {
        const meal = slot.meals!
        const totalCal = meal.meal_items.reduce((s, i) => s + i.calories_per_100g * i.quantity_grams / 100, 0)
        const totalPro = meal.meal_items.reduce((s, i) => s + i.protein_per_100g * i.quantity_grams / 100, 0)
        const totalFat = meal.meal_items.reduce((s, i) => s + i.fat_per_100g * i.quantity_grams / 100, 0)
        const totalCarb = meal.meal_items.reduce((s, i) => s + i.carbs_per_100g * i.quantity_grams / 100, 0)

        return {
          ...(selectedMemberType === 'user'
            ? { member_user_id: selectedMemberId }
            : { member_profile_id: selectedMemberId }),
          log_date: selectedDate,
          slot_name: slot.slot_name,
          meal_id: meal.id,
          item_type: 'meal' as const,
          item_id: meal.id,
          item_name: meal.name,
          servings_logged: 1.0,
          calories_per_serving: totalCal,
          protein_per_serving: totalPro,
          fat_per_serving: totalFat,
          carbs_per_serving: totalCarb,
          micronutrients: {},
          serving_unit: 'serving',
          is_private: false,
        }
      })

    if (rows.length > 0) {
      await bulkInsert.mutateAsync(rows)
    }
  }

  async function handleDeleteLog(id: string) {
    await deleteLog.mutateAsync(id)
  }

  const ringColors = {
    calories: '#A8C5A0',
    protein: '#7EC8E3',
    carbs: '#F5C34B',
    fat: '#E8B4A2',
  }

  return (
    <div className="px-4 py-6 font-sans flex flex-col gap-5 pb-24">
      {/* Header: date picker + member selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="rounded-[--radius-btn] border border-accent/30 bg-surface px-3 py-1.5 text-sm text-text font-sans focus:outline-none focus:border-primary"
            aria-label="Select date"
          />
          {/* date input already shows selected date */}
        </div>
        {session?.user.id && (
          <MemberSelector
            selectedMemberId={selectedMemberId}
            onSelect={handleMemberSelect}
          />
        )}
      </div>

      {/* Progress rings */}
      <div className="bg-surface rounded-[--radius-card] border border-secondary p-4">
        <div className="flex items-center justify-around gap-2 overflow-x-auto">
          <div className="flex flex-col items-center gap-1.5">
            <ProgressRing
              value={totals.calories}
              target={target?.calories ?? 0}
              size={76}
              strokeWidth={7}
              color={ringColors.calories}
              showValue
            />
            <span className="text-xs text-text/50">kcal</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <ProgressRing
              value={totals.protein}
              target={target?.protein_g ?? 0}
              size={76}
              strokeWidth={7}
              color={ringColors.protein}
              showValue
            />
            <span className="text-xs text-text/50">protein</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <ProgressRing
              value={totals.carbs}
              target={target?.carbs_g ?? 0}
              size={76}
              strokeWidth={7}
              color={ringColors.carbs}
              showValue
            />
            <span className="text-xs text-text/50">carbs</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <ProgressRing
              value={totals.fat}
              target={target?.fat_g ?? 0}
              size={76}
              strokeWidth={7}
              color={ringColors.fat}
              showValue
            />
            <span className="text-xs text-text/50">fat</span>
          </div>
        </div>
      </div>

      {/* Micronutrient summary — tap to expand detail */}
      <div
        className="bg-surface rounded-[--radius-card] border border-secondary"
        onClick={() => setShowMicroDetail(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowMicroDetail(v => !v) }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text/50 uppercase tracking-wide">Micronutrients</p>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text/40"
              style={{ transform: showMicroDetail ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {MICRONUTRIENT_DISPLAY_ORDER.map(key => (
              <div key={key} className="flex flex-col items-center gap-1">
                <ProgressRing
                  value={microTotals[key] ?? 0}
                  target={target?.micronutrients?.[key] ?? 0}
                  size={40}
                  strokeWidth={3}
                  color={MICRO_RING_COLORS[key]}
                />
                <span className="text-xs text-text/50 text-center leading-tight">
                  {MICRONUTRIENT_LABELS[key]?.toLowerCase() ?? key}
                </span>
              </div>
            ))}
          </div>
          {hasIncompleteMicroData && (
            <p className="text-xs text-text/40 mt-2">
              * Some foods have no micronutrient data — totals may be incomplete
            </p>
          )}
        </div>

        {/* Expanded detail view with per-nutrient progress bars */}
        {showMicroDetail && (
          <div className="border-t border-secondary/50" onClick={(e) => e.stopPropagation()}>
            <NutrientBreakdown logs={logs} target={target} />
          </div>
        )}
      </div>

      {/* Inventory summary widget */}
      <InventorySummaryWidget />

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {unloggedSlots.length > 0 && (
          <button
            onClick={handleLogAll}
            disabled={!isOnline || bulkInsert.isPending}
            title={!isOnline ? 'Available when online' : undefined}
            className="w-full rounded-[--radius-btn] border border-primary/40 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkInsert.isPending ? 'Logging...' : `Log all (${unloggedSlots.length} remaining)`}
          </button>
        )}

        {/* Search bar trigger */}
        <button
          onClick={() => setSearchOverlayOpen(true)}
          disabled={!isOnline}
          title={!isOnline ? 'Available when online' : undefined}
          className="w-full rounded-[--radius-card] bg-surface border border-secondary px-4 py-4 flex items-center gap-2 text-left hover:border-primary/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text/40 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-sm text-text/40">Log food...</span>
        </button>
      </div>

      {/* Daily log list */}
      <DailyLogList
        logs={logs}
        unloggedSlots={unloggedSlots}
        onLogMeal={slot => setLogMealSlot(slot)}
        onEditLog={log => setEditLog(log)}
        onDeleteLog={handleDeleteLog}
      />

      {/* Log meal modal (new log from plan slot) */}
      {logMealSlot?.meals && (
        <LogMealModal
          isOpen
          onClose={() => setLogMealSlot(null)}
          meal={logMealSlot.meals}
          slotName={logMealSlot.slot_name}
          logDate={selectedDate}
          memberId={selectedMemberId}
          memberType={selectedMemberType}
        />
      )}

      {/* Food search overlay */}
      {searchOverlayOpen && (
        <FoodSearchOverlay
          mode="log"
          logDate={selectedDate}
          memberId={selectedMemberId}
          memberType={selectedMemberType}
          onClose={() => setSearchOverlayOpen(false)}
        />
      )}

      {/* Edit log modal */}
      {editLog && (
        <EditLogModal
          log={editLog}
          onClose={() => setEditLog(null)}
        />
      )}
    </div>
  )
}
