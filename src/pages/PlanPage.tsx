import { useState } from 'react'
import { useHousehold } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { useMealPlan, useCreateMealPlan } from '../hooks/useMealPlan'
import { useRepeatLastWeek, useLoadTemplate } from '../hooks/useMealPlanTemplates'
import { useNutritionTarget } from '../hooks/useNutritionTargets'
import { getWeekStart } from '../utils/mealPlan'
import { PlanGrid } from '../components/plan/PlanGrid'
import { MemberSelector } from '../components/plan/MemberSelector'
import { NewWeekPrompt } from '../components/plan/NewWeekPrompt'
import { TemplateManager } from '../components/plan/TemplateManager'

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

/**
 * /plan route — weekly meal plan grid with week navigation, member selector, and progress rings.
 */
export function PlanPage() {
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const household = membership?.households

  // Compute initial week start from household's week_start_day preference
  const weekStartDay = household?.week_start_day ?? 0
  const initialWeekStart = getWeekStart(new Date(), weekStartDay)
  const [weekStart, setWeekStart] = useState(initialWeekStart)

  // Member selector state — default to current user
  const [selectedMemberId, setSelectedMemberId] = useState(session?.user.id ?? '')
  const [selectedMemberType, setSelectedMemberType] = useState<'user' | 'profile'>('user')

  // Overflow menu state
  const [showOverflow, setShowOverflow] = useState(false)

  const householdId = membership?.household_id

  const { data: plan, isPending: planPending } = useMealPlan(weekStart)
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

  return (
    <div className="px-4 py-8 font-sans pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary mb-1">Meal Plan</h1>
        <p className="text-sm text-text/60">Plan your household's meals for the week.</p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevWeek}
          className="no-print p-2 rounded-full text-text/50 hover:text-text hover:bg-accent/10 transition-colors"
          aria-label="Previous week"
        >
          &larr;
        </button>
        <span className="text-sm font-medium text-text font-sans">{formatWeekRange(weekStart)}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNextWeek}
            className="no-print p-2 rounded-full text-text/50 hover:text-text hover:bg-accent/10 transition-colors"
            aria-label="Next week"
          >
            &rarr;
          </button>
          {/* Overflow menu - ⋮ button */}
          <div className="relative no-print">
            <button
              onClick={() => setShowOverflow(prev => !prev)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent/10 transition-colors text-text/50 hover:text-text"
              aria-label="More options"
              title="More options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
              </svg>
            </button>
            {showOverflow && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowOverflow(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-secondary rounded-[--radius-card] shadow-lg py-1 min-w-[180px]">
                  <button
                    onClick={() => { window.print(); setShowOverflow(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-accent/10 transition-colors flex items-center gap-2"
                  >
                    Print meal plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Member selector */}
      <div className="mb-6 no-print">
        <MemberSelector selectedMemberId={selectedMemberId} onSelect={handleMemberSelect} />
      </div>

      {/* Plan content */}
      {planPending ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-[--radius-card] bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : !plan ? (
        <NewWeekPrompt weekStart={weekStart} onChoice={handleNewWeekChoice} />
      ) : (
        <>
          <div className="no-print">
            <TemplateManager planId={plan.id} />
          </div>
          <PlanGrid
            planId={plan.id}
            weekStart={weekStart}
            weekStartDay={weekStartDay}
            memberTarget={memberTarget ?? null}
            householdId={householdId}
            currentUserId={session?.user.id}
            selectedMemberId={selectedMemberId}
            selectedMemberType={selectedMemberType}
          />
          <div className="print-only mt-4">
            <p className="text-xs font-semibold">Meal plan for week of {formatWeekRange(weekStart)}</p>
          </div>
        </>
      )}
    </div>
  )
}
