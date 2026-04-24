import { useState, useMemo } from 'react'
import { useHousehold, useHouseholdMembers, useMemberProfiles } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { useMealPlan, useCreateMealPlan, useMealPlanSlots } from '../hooks/useMealPlan'
import { useRepeatLastWeek, useLoadTemplate } from '../hooks/useMealPlanTemplates'
import { useNutritionTarget } from '../hooks/useNutritionTargets'
import { getWeekStart } from '../utils/mealPlan'
import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { PlanGrid } from '../components/plan/PlanGrid'
import { MemberSelector } from '../components/plan/MemberSelector'
import { NewWeekPrompt } from '../components/plan/NewWeekPrompt'
import { TemplateManager } from '../components/plan/TemplateManager'
import { BudgetStrip } from '../components/plan/BudgetStrip'
import { IssuesPanel } from '../components/plan/IssuesPanel'
import { usePlanViolations } from '../hooks/usePlanViolations'
import { useMonotonyWarnings } from '../hooks/useMonotonyWarnings'
import { Nameplate, StoryHead, Folio } from '../components/editorial'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00Z')
  const end = new Date(weekStart + 'T00:00:00Z')
  end.setUTCDate(start.getUTCDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(start)} – ${fmt(end)}`
}

function formatLong(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00Z')
  const end = new Date(weekStart + 'T00:00:00Z')
  end.setUTCDate(start.getUTCDate() + 6)
  const fmt = (d: Date, withMonth = false) =>
    d.toLocaleDateString('en-US', withMonth
      ? { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }
      : { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(start)} — ${fmt(end, true)}`.toUpperCase()
}

// ISO-style week number (rough, for display only)
function weekOfYear(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z')
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const days = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000)
  return Math.ceil((days + startOfYear.getUTCDay() + 1) / 7)
}

/**
 * /plan — weekly meal plan rendered in the Sunday Supper Gazette editorial style.
 * Mobile: nameplate.sm + day-pill scrubber inside PlanGrid.
 * Desktop: full nameplate + 7×4 ruled grid inside PlanGrid.
 */
export function PlanPage() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const household = membership?.households

  const weekStartDay = household?.week_start_day ?? 0
  const initialWeekStart = getWeekStart(new Date(), weekStartDay)
  const [weekStart, setWeekStart] = useState(initialWeekStart)

  const [selectedMemberId, setSelectedMemberId] = useState(session?.user.id ?? '')
  const [selectedMemberType, setSelectedMemberType] = useState<'user' | 'profile'>('user')

  const householdId = membership?.household_id

  const { data: plan, isPending: planPending } = useMealPlan(weekStart)

  const priorWeekStart = useMemo(() => {
    const [y, m, d] = weekStart.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    date.setUTCDate(date.getUTCDate() - 7)
    return date.toISOString().slice(0, 10)
  }, [weekStart])

  const { data: priorWeekPlan } = useMealPlan(priorWeekStart)
  const { data: slots = [] } = useMealPlanSlots(plan?.id)
  const { data: priorWeekSlots = [] } = useMealPlanSlots(priorWeekPlan?.id)
  const { data: householdMembers = [] } = useHouseholdMembers()
  const { data: memberProfiles = [] } = useMemberProfiles()

  const members = useMemo(() => {
    const result: { id: string; name: string }[] = []
    for (const hm of householdMembers) {
      result.push({ id: hm.user_id, name: hm.profiles?.display_name ?? hm.user_id.slice(0, 8) })
    }
    for (const p of memberProfiles) {
      result.push({ id: p.id, name: p.name })
    }
    return result
  }, [householdMembers, memberProfiles])

  const { violations, hasAllergyViolation } = usePlanViolations(householdId, slots, members)
  const monotonyWarnings = useMonotonyWarnings(slots, weekStart, priorWeekSlots)

  const slotViolationsByDay = useMemo(() => {
    const byDay = new Map<number, Map<string, { count: number; hasAllergy: boolean }>>()
    for (const v of violations) {
      let dayMap = byDay.get(v.dayIndex)
      if (!dayMap) {
        dayMap = new Map()
        byDay.set(v.dayIndex, dayMap)
      }
      const existing = dayMap.get(v.mealType) ?? { count: 0, hasAllergy: false }
      existing.count++
      if (v.strength === 'allergy') existing.hasAllergy = true
      dayMap.set(v.mealType, existing)
    }
    return byDay
  }, [violations])

  const createPlan = useCreateMealPlan()
  const repeatLastWeek = useRepeatLastWeek()
  const loadTemplate = useLoadTemplate()
  const { data: memberTarget } = useNutritionTarget(householdId, selectedMemberId, selectedMemberType)

  function handlePrevWeek() {
    setWeekStart(w => addDays(w, -7))
  }

  function handleNextWeek() {
    setWeekStart(w => addDays(w, 7))
  }

  function handleMemberSelect(id: string, type: 'user' | 'profile') {
    setSelectedMemberId(id)
    setSelectedMemberType(type)
  }

  async function handleEditBudget(newBudget: number | null) {
    if (!householdId) return
    await supabase.from('households').update({ weekly_budget: newBudget }).eq('id', householdId)
    queryClient.invalidateQueries({ queryKey: ['household'] })
  }

  async function handleNewWeekChoice(choice: 'fresh' | 'repeat' | 'template', templateId?: string, planStart?: string) {
    const targetWeekStart = planStart ?? weekStart
    if (planStart && planStart !== weekStart) {
      setWeekStart(planStart)
    }
    const newPlan = await createPlan.mutateAsync(targetWeekStart)

    if (choice === 'repeat') {
      const previousWeekStart = addDays(targetWeekStart, -7)
      await repeatLastWeek.mutateAsync({ currentPlanId: newPlan.id, previousWeekStart })
    } else if (choice === 'template' && templateId) {
      await loadTemplate.mutateAsync({ templateId, planId: newPlan.id })
    }
  }

  const wk = weekOfYear(weekStart)
  const filledCount = slots.filter(s => s.meal_id != null).length
  const lockedCount = slots.filter(s => s.is_locked).length

  return (
    <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans">
      {/* Nameplate — full on desktop, compact on mobile */}
      <div className="hidden md:block">
        <Nameplate
          left={formatLong(weekStart)}
          title={<>The <span className="amp">Week</span></>}
          right={`${filledCount} of 28 slots · ${lockedCount} locked`}
        />
      </div>
      <div className="md:hidden">
        <Nameplate
          left={`WK ${wk}`}
          title="The Week"
          right={`${filledCount} · ${lockedCount}L`}
          size="sm"
        />
      </div>

      {/* Story head */}
      <StoryHead
        kicker="PLAN"
        headline="The Week"
        byline={household?.name ?? null}
        size="sm"
      />

      {/* Toolbar — week segment + member selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap mt-4 mb-4 no-print">
        <div className="seg">
          <button type="button" onClick={handlePrevWeek} aria-label="Previous week">← Prev</button>
          <button type="button" className="active" aria-current="page" title={formatLong(weekStart)}>
            {formatWeekRange(weekStart)}
          </button>
          <button type="button" onClick={handleNextWeek} aria-label="Next week">Next →</button>
        </div>
        {session?.user.id && (
          <MemberSelector
            selectedMemberId={selectedMemberId}
            onSelect={handleMemberSelect}
          />
        )}
      </div>

      {/* Plan content */}
      {planPending ? (
        <div className="flex flex-col gap-3 mt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-paper-2 animate-pulse" style={{ border: '1px solid var(--rule-soft)' }} />
          ))}
        </div>
      ) : !plan ? (
        <div className="mt-6">
          <NewWeekPrompt weekStart={weekStart} onChoice={handleNewWeekChoice} />
        </div>
      ) : (
        <>
          {/* Budget strip — ticket stub */}
          <div className="mb-6">
            <BudgetStrip
              weeklyBudget={household?.weekly_budget ?? null}
              weekStart={weekStart}
              householdId={householdId}
              onEditBudget={handleEditBudget}
            />
          </div>

          {/* Template manager — Save/Load */}
          <div className="no-print mb-4">
            <TemplateManager planId={plan.id} />
          </div>

          {/* The grid */}
          <PlanGrid
            planId={plan.id}
            weekStart={weekStart}
            weekStartDay={weekStartDay}
            memberTarget={memberTarget ?? null}
            householdId={householdId}
            currentUserId={session?.user.id}
            selectedMemberId={selectedMemberId}
            selectedMemberType={selectedMemberType}
            slotViolationsByDay={slotViolationsByDay}
          />

          <div className="mt-4 no-print">
            <IssuesPanel
              violations={violations}
              monotonyWarnings={monotonyWarnings}
              hasAllergyViolation={hasAllergyViolation}
            />
          </div>

          <div className="print-only mt-4">
            <p className="text-xs font-semibold">Meal plan for week of {formatWeekRange(weekStart)}</p>
          </div>

          {/* Folio — page footer */}
          <div className="hidden md:block">
            <Folio
              num="04"
              title="The Plan"
              tagline={household?.name ? `A week, composed — for ${household.name}.` : 'A week, composed.'}
              pageOf="PAGE 4 OF 10"
            />
          </div>
        </>
      )}
    </div>
  )
}
