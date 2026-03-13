import { useState } from 'react'
import { useHousehold } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { useMealPlan, useCreateMealPlan } from '../hooks/useMealPlan'
import { useNutritionTarget } from '../hooks/useNutritionTargets'
import { getWeekStart } from '../utils/mealPlan'
import { PlanGrid } from '../components/plan/PlanGrid'
import { MemberSelector } from '../components/plan/MemberSelector'

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

  const householdId = membership?.household_id

  const { data: plan, isPending: planPending } = useMealPlan(weekStart)
  const createPlan = useCreateMealPlan()
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

  async function handleCreatePlan() {
    await createPlan.mutateAsync(weekStart)
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
          className="p-2 rounded-full text-text/50 hover:text-text hover:bg-accent/10 transition-colors"
          aria-label="Previous week"
        >
          &larr;
        </button>
        <span className="text-sm font-medium text-text font-sans">{formatWeekRange(weekStart)}</span>
        <button
          onClick={handleNextWeek}
          className="p-2 rounded-full text-text/50 hover:text-text hover:bg-accent/10 transition-colors"
          aria-label="Next week"
        >
          &rarr;
        </button>
      </div>

      {/* Member selector */}
      <div className="mb-6">
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
        <div className="text-center py-16">
          <p className="text-text/50 text-sm mb-4">No plan for this week yet.</p>
          <button
            onClick={handleCreatePlan}
            disabled={createPlan.isPending}
            className="rounded-[--radius-btn] bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createPlan.isPending ? 'Creating…' : 'Create Plan for This Week'}
          </button>
        </div>
      ) : (
        <PlanGrid
          planId={plan.id}
          weekStart={weekStart}
          weekStartDay={weekStartDay}
          memberTarget={memberTarget ?? null}
        />
      )}
    </div>
  )
}
