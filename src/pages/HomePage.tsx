import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../hooks/useHousehold'
import { useFoodLogs, useBulkInsertFoodLogs, useUpdateFoodLog, useDeleteFoodLog } from '../hooks/useFoodLogs'
import { useNutritionTarget } from '../hooks/useNutritionTargets'
import { useMealPlan, useMealPlanSlots } from '../hooks/useMealPlan'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { MemberSelector } from '../components/plan/MemberSelector'
import { DailyLogList } from '../components/log/DailyLogList'
import { NutrientBreakdown } from '../components/log/NutrientBreakdown'
import { LogMealModal } from '../components/log/LogMealModal'
import { FoodSearchOverlay } from '../components/food/FoodSearchOverlay'
import { PortionStepper } from '../components/log/PortionStepper'
import {
  calcLogEntryNutrition,
  calcDayNutrition,
  MICRONUTRIENT_DISPLAY_ORDER,
  MICRONUTRIENT_LABELS,
  MICRONUTRIENT_UNITS,
} from '../utils/nutrition'
import { getWeekStart } from '../utils/mealPlan'
import { getUnloggedSlots } from '../utils/foodLogs'
import { InventorySummaryWidget } from '../components/inventory/InventorySummaryWidget'
import { RateMealsCard } from '../components/feedback/RateMealsCard'
import { Nameplate, StoryHead, SectionHead, Folio, Rule } from '../components/editorial'
import { Icon } from '../components/Icon'
import type { FoodLog } from '../types/database'
import type { SlotWithMeal } from '../hooks/useMealPlan'

function todayString(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function getDayIndex(dateStr: string, weekStart: string): number {
  const [dy, dm, dd] = dateStr.split('-').map(Number)
  const [wy, wm, wd] = weekStart.split('-').map(Number)
  const dateMs = Date.UTC(dy, dm - 1, dd)
  const weekMs = Date.UTC(wy, wm - 1, wd)
  return Math.round((dateMs - weekMs) / 86400000)
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const day = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
  const dayN = date.getUTCDate()
  const month = date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
  const year = date.getUTCFullYear()
  return `${day} · ${dayN} ${month} ${year}`.toUpperCase()
}

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const day = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const dayN = date.getUTCDate()
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${day} · ${dayN} ${month}`.toUpperCase()
}

// Issue number — purely decorative, derived from days since 2024-01-01.
function issueNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = Date.UTC(y, m - 1, d)
  const epoch = Date.UTC(2024, 0, 1)
  return Math.max(1, Math.floor((date - epoch) / 86400000))
}

interface NBarProps {
  label: string
  value: number
  target: number
  unit: string
}

function NBar({ label, value, target, unit }: NBarProps) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  const tickPct = target > 0 ? Math.min(100, (target / target) * 100) : 100
  return (
    <div className="nbar">
      <span className="nlabel">{label}</span>
      <div className="ntrack">
        <div className="nfill" style={{ width: `${pct}%` }} />
        {target > 0 && <div className="ntick" style={{ left: `${tickPct}%` }} />}
      </div>
      <span className="nvals tnum">
        {Math.round(value).toLocaleString()}
        {target > 0 && <span className="of"> / {Math.round(target).toLocaleString()} {unit}</span>}
        {target === 0 && <span className="of"> {unit}</span>}
      </span>
    </div>
  )
}

// ─── Edit Log Modal (unchanged behaviour, lightly restyled) ────────────────────

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
      <div className="relative bg-paper-2 w-full max-w-md p-5" style={{ border: '1.5px solid var(--rule-c)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="kicker mono" style={{ color: 'var(--tomato)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Edit entry</div>
            <h2 className="serif" style={{ fontSize: 22, fontStyle: 'italic', marginTop: 4 }}>{log.item_name}</h2>
            {log.slot_name && <p className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>{log.slot_name}</p>}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close">×</button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4 py-3" style={{ borderTop: '1px dashed var(--rule-soft)', borderBottom: '1px dashed var(--rule-soft)' }}>
          <div className="text-center">
            <p className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Cal</p>
            <p className="serif tnum" style={{ fontSize: 18, fontStyle: 'italic' }}>{Math.round(log.calories_per_serving * servings)}</p>
          </div>
          <div className="text-center">
            <p className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Pro</p>
            <p className="serif tnum" style={{ fontSize: 18, fontStyle: 'italic' }}>{(log.protein_per_serving * servings).toFixed(1)}g</p>
          </div>
          <div className="text-center">
            <p className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Carb</p>
            <p className="serif tnum" style={{ fontSize: 18, fontStyle: 'italic' }}>{(log.carbs_per_serving * servings).toFixed(1)}g</p>
          </div>
          <div className="text-center">
            <p className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Fat</p>
            <p className="serif tnum" style={{ fontSize: 18, fontStyle: 'italic' }}>{(log.fat_per_serving * servings).toFixed(1)}g</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--butter)', marginBottom: 8 }}>Servings</p>
          <PortionStepper value={servings} onChange={setServings} />
        </div>

        <label className="flex items-center gap-2 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
            className="accent-primary"
          />
          <span className="text-sm text-text/70">Mark as private</span>
        </label>

        {(updateLog.isError || deleteLog.isError) && (
          <p className="text-sm text-red-500 mb-3">Operation failed. Please try again.</p>
        )}

        <div className="flex gap-2 flex-wrap">
          <button onClick={handleDelete} disabled={deleteLog.isPending} className="btn btn-sm" style={{ color: 'var(--tomato)', borderColor: 'var(--tomato)' }}>Delete</button>
          <button onClick={onClose} className="btn btn-sm">Cancel</button>
          <button onClick={handleSave} disabled={updateLog.isPending} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
            {updateLog.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
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
  const [showMicroDetail, setShowMicroDetail] = useState(false)

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

  const dayIndex = getDayIndex(selectedDate, weekStart)
  const daySlots = allSlots.filter(s => s.day_index === dayIndex && s.meal_id != null)
  const unloggedSlots = getUnloggedSlots(daySlots, logs)

  // Tonight — find dinner-ish slot for selected day, prefer Dinner > Supper > Lunch
  const tonightSlot = daySlots.find(s => /dinner|supper/i.test(s.slot_name))
    ?? daySlots.find(s => /lunch/i.test(s.slot_name))
    ?? daySlots[0]
    ?? null

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

  const calPct = target?.calories ? Math.round((totals.calories / target.calories) * 100) : null

  return (
    <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans">
      {/* Nameplate — full on desktop, compact on mobile */}
      <div className="hidden md:block">
        <Nameplate
          left={formatDateLong(selectedDate)}
          title={<>Nourish<span className="amp">·</span>plan</>}
          right="The Sunday Supper Gazette"
        />
      </div>
      <div className="md:hidden">
        <Nameplate
          left={formatDateShort(selectedDate)}
          title="The Daily"
          right={`№${issueNumber(selectedDate).toLocaleString()}`}
          size="sm"
        />
      </div>

      {/* Story head */}
      <StoryHead
        kicker="FRONT PAGE · 01 — THE DAILY"
        headline="The day,"
        headlineAccent="so far."
        byline={calPct != null ? `${Math.round(totals.calories).toLocaleString()} of ${Math.round(target!.calories).toLocaleString()} kcal\n${calPct}% to target` : null}
        size="sm"
      />

      {/* Date picker + member selector — controls row */}
      <div className="flex items-center justify-between gap-3 flex-wrap mt-4 mb-2 no-print">
        <div className="flex items-center gap-3">
          <label className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="mono tnum"
            style={{
              background: 'transparent',
              border: '1.5px solid var(--rule-c)',
              padding: '6px 10px',
              color: 'var(--ink)',
              fontSize: 12,
              letterSpacing: '0.04em',
              outline: 'none',
            }}
            aria-label="Select date"
          />
        </div>
        {session?.user.id && (
          <MemberSelector selectedMemberId={selectedMemberId} onSelect={handleMemberSelect} />
        )}
      </div>

      {/* 3-column editorial layout (desktop) — single column on mobile */}
      <div
        className="grid gap-0 md:gap-8 mt-4"
        style={{ gridTemplateColumns: '1fr' }}
      >
        <div className="hidden md:grid md:gap-8" style={{ gridTemplateColumns: '1.3fr 1fr 0.9fr' }}>
          {/* COL 1 — Nutrition lead */}
          <div>
            <SectionHead
              no="01"
              label="The Ledger of the Day"
              aux={calPct != null ? `${calPct}% to target` : 'no target set'}
            />
            <Rule />
            <div className="py-3">
              <NBar label="CAL" value={totals.calories} target={target?.calories ?? 0} unit="kcal" />
              <NBar label="PRO" value={totals.protein} target={target?.protein_g ?? 0} unit="g" />
              <NBar label="CRB" value={totals.carbs} target={target?.carbs_g ?? 0} unit="g" />
              <NBar label="FAT" value={totals.fat} target={target?.fat_g ?? 0} unit="g" />
              {target?.micronutrients?.fiber != null && (
                <NBar label="FIB" value={microTotals.fiber ?? 0} target={target.micronutrients.fiber} unit="g" />
              )}
            </div>
            <Rule />
            <button
              type="button"
              onClick={() => setShowMicroDetail(v => !v)}
              className="mono"
              style={{
                background: 'transparent',
                border: 0,
                padding: '12px 0 0',
                color: 'var(--butter)',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {showMicroDetail ? '— Hide micros' : '+ Show micros'}
              {hasIncompleteMicroData && <span style={{ color: 'var(--ink-soft)' }}>· partial data</span>}
            </button>
            {showMicroDetail && (
              <div className="py-2">
                {MICRONUTRIENT_DISPLAY_ORDER.map(key => (
                  <NBar
                    key={key}
                    label={MICRONUTRIENT_LABELS[key]?.slice(0, 4).toUpperCase() ?? key.toUpperCase()}
                    value={microTotals[key] ?? 0}
                    target={target?.micronutrients?.[key] ?? 0}
                    unit={MICRONUTRIENT_UNITS[key] ?? ''}
                  />
                ))}
                <div style={{ marginTop: 8 }}>
                  <NutrientBreakdown logs={logs} target={target} />
                </div>
              </div>
            )}
          </div>

          {/* COL 2 — Log + journal */}
          <div style={{ borderLeft: '1px solid var(--rule-soft)', borderRight: '1px solid var(--rule-soft)', paddingLeft: 24, paddingRight: 24 }}>
            <SectionHead no="02" label="Log a bite" aux={isOnline ? '' : 'OFFLINE'} />
            <button
              type="button"
              onClick={() => setSearchOverlayOpen(true)}
              disabled={!isOnline}
              className="search"
              style={{ marginTop: 8, width: '100%', cursor: isOnline ? 'pointer' : 'not-allowed', opacity: isOnline ? 1 : 0.5 }}
              aria-label="Search foods to log"
            >
              <Icon name="search" size={18} />
              <span className="serif-italic" style={{ fontSize: 16, color: 'var(--ink-soft)', flex: 1, textAlign: 'left' }}>
                What have you eaten?
              </span>
              <span className="mono" style={{ fontSize: 9, color: 'var(--ink-soft)', letterSpacing: '0.14em' }}>USDA · MINE</span>
            </button>
            {unloggedSlots.length > 0 && (
              <button
                type="button"
                onClick={handleLogAll}
                disabled={!isOnline || bulkInsert.isPending}
                className="btn btn-sm"
                style={{ marginTop: 12, color: 'var(--tomato)', borderColor: 'var(--tomato)' }}
              >
                {bulkInsert.isPending ? 'Logging…' : `Log all planned (${unloggedSlots.length})`}
              </button>
            )}

            <SectionHead no="03" label="Today's journal" aux={`${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`} />
            <Rule />
            <div className="py-2">
              <DailyLogList
                logs={logs}
                unloggedSlots={unloggedSlots}
                onLogMeal={slot => setLogMealSlot(slot)}
                onEditLog={log => setEditLog(log)}
                onDeleteLog={handleDeleteLog}
              />
            </div>
            {logs.length === 0 && unloggedSlots.length === 0 && (
              <p className="serif-italic" style={{ fontSize: 14, color: 'var(--ink-soft)', paddingTop: 12 }}>
                — nothing logged yet —
              </p>
            )}
          </div>

          {/* COL 3 — Marginalia: tonight + inventory */}
          <div>
            {tonightSlot && (
              <>
                <SectionHead no="04" label="Tonight" aux={tonightSlot.slot_name.toUpperCase()} />
                <Rule />
                <div className="py-3">
                  <div className="eyebrow" style={{ marginBottom: 6 }}>{tonightSlot.is_locked ? 'Locked in —' : 'Planned —'}</div>
                  <div className="serif" style={{ fontSize: 24, fontStyle: 'italic', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                    {tonightSlot.meals?.name ?? '—'}
                  </div>
                  {tonightSlot.meals && (
                    <div className="mono tnum" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 10 }}>
                      {Math.round(tonightSlot.meals.meal_items.reduce((s, i) => s + i.calories_per_100g * i.quantity_grams / 100, 0))} kcal
                    </div>
                  )}
                </div>
              </>
            )}

            <SectionHead no={tonightSlot ? '05' : '04'} label="Inventory pulse" />
            <Rule />
            <div className="py-2">
              <InventorySummaryWidget />
            </div>

            <div className="py-3">
              <RateMealsCard />
            </div>
          </div>
        </div>

        {/* MOBILE — single stack */}
        <div className="md:hidden">
          <SectionHead
            no="01"
            label="The Ledger of the Day"
            aux={calPct != null ? `${calPct}% to target` : ''}
          />
          <Rule />
          <div className="py-3">
            <NBar label="CAL" value={totals.calories} target={target?.calories ?? 0} unit="kcal" />
            <NBar label="PRO" value={totals.protein} target={target?.protein_g ?? 0} unit="g" />
            <NBar label="CRB" value={totals.carbs} target={target?.carbs_g ?? 0} unit="g" />
            <NBar label="FAT" value={totals.fat} target={target?.fat_g ?? 0} unit="g" />
          </div>
          <Rule />

          <SectionHead no="02" label="Log a bite" aux={isOnline ? '' : 'OFFLINE'} />
          <button
            type="button"
            onClick={() => setSearchOverlayOpen(true)}
            disabled={!isOnline}
            className="search"
            style={{ marginTop: 8, width: '100%', cursor: isOnline ? 'pointer' : 'not-allowed', opacity: isOnline ? 1 : 0.5 }}
            aria-label="Search foods to log"
          >
            <Icon name="search" size={18} />
            <span className="serif-italic" style={{ fontSize: 16, color: 'var(--ink-soft)', flex: 1, textAlign: 'left' }}>
              What have you eaten?
            </span>
          </button>
          {unloggedSlots.length > 0 && (
            <button
              type="button"
              onClick={handleLogAll}
              disabled={!isOnline || bulkInsert.isPending}
              className="btn btn-sm"
              style={{ marginTop: 12, color: 'var(--tomato)', borderColor: 'var(--tomato)' }}
            >
              {bulkInsert.isPending ? 'Logging…' : `Log all planned (${unloggedSlots.length})`}
            </button>
          )}

          <SectionHead no="03" label="Today's journal" aux={`${logs.length}`} />
          <Rule />
          <div className="py-2">
            <DailyLogList
              logs={logs}
              unloggedSlots={unloggedSlots}
              onLogMeal={slot => setLogMealSlot(slot)}
              onEditLog={log => setEditLog(log)}
              onDeleteLog={handleDeleteLog}
            />
          </div>

          {tonightSlot && (
            <>
              <SectionHead no="04" label="Tonight" aux={tonightSlot.slot_name.toUpperCase()} />
              <Rule />
              <div className="py-3">
                <div className="serif" style={{ fontSize: 22, fontStyle: 'italic', lineHeight: 1.05 }}>
                  {tonightSlot.meals?.name ?? '—'}
                </div>
              </div>
            </>
          )}

          <SectionHead no={tonightSlot ? '05' : '04'} label="Inventory pulse" />
          <Rule />
          <div className="py-2">
            <InventorySummaryWidget />
          </div>

          <button
            type="button"
            onClick={() => setShowMicroDetail(v => !v)}
            className="mono"
            style={{
              background: 'transparent',
              border: 0,
              padding: '20px 0',
              color: 'var(--butter)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            {showMicroDetail ? '— Hide micronutrients' : '+ Micronutrients'}
          </button>
          {showMicroDetail && (
            <div className="pb-4">
              {MICRONUTRIENT_DISPLAY_ORDER.map(key => (
                <NBar
                  key={key}
                  label={MICRONUTRIENT_LABELS[key]?.slice(0, 4).toUpperCase() ?? key.toUpperCase()}
                  value={microTotals[key] ?? 0}
                  target={target?.micronutrients?.[key] ?? 0}
                  unit={MICRONUTRIENT_UNITS[key] ?? ''}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Folio — desktop only */}
      <div className="hidden md:block">
        <Folio
          num="01"
          title="The Daily"
          tagline={target?.calories ? `Targets for ${selectedMemberId === session?.user.id ? 'you' : 'member'}.` : '—'}
          pageOf="PAGE 1 OF 10"
        />
      </div>

      {/* Modals — unchanged behaviour */}
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

      {searchOverlayOpen && (
        <FoodSearchOverlay
          mode="log"
          logDate={selectedDate}
          memberId={selectedMemberId}
          memberType={selectedMemberType}
          onClose={() => setSearchOverlayOpen(false)}
        />
      )}

      {editLog && (
        <EditLogModal log={editLog} onClose={() => setEditLog(null)} />
      )}
    </div>
  )
}
