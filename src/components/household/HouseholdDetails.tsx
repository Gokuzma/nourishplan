import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Household } from '../../types/database'

const fieldStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--rule-c)',
  padding: '8px 10px',
  fontSize: 14,
  color: 'var(--ink)',
}

interface HouseholdDetailsProps {
  householdId: string
  household: Household | null | undefined
  isAdmin: boolean
}

export function HouseholdDetails({ householdId, household, isAdmin }: HouseholdDetailsProps) {
  const queryClient = useQueryClient()

  const [householdName, setHouseholdName] = useState('')
  const [householdSaving, setHouseholdSaving] = useState(false)
  const [householdSaved, setHouseholdSaved] = useState(false)
  const [householdError, setHouseholdError] = useState<string | null>(null)

  const [weeklyBudget, setWeeklyBudget] = useState<string>('')
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetSaved, setBudgetSaved] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)

  useEffect(() => {
    if (household?.name) {
      setHouseholdName(household.name)
    }
  }, [household?.name])

  useEffect(() => {
    const budget = household?.weekly_budget
    if (budget != null) {
      setWeeklyBudget(String(budget))
    }
  }, [household?.weekly_budget])

  async function handleSaveHouseholdName() {
    setHouseholdSaving(true)
    setHouseholdError(null)
    setHouseholdSaved(false)
    try {
      const { error } = await supabase
        .from('households')
        .update({ name: householdName.trim() })
        .eq('id', householdId)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['household'] })
      setHouseholdSaved(true)
      setTimeout(() => setHouseholdSaved(false), 2000)
    } catch (err) {
      setHouseholdError(err instanceof Error ? err.message : 'Failed to save household name.')
    } finally {
      setHouseholdSaving(false)
    }
  }

  async function handleSaveWeeklyBudget() {
    setBudgetSaving(true)
    setBudgetError(null)
    setBudgetSaved(false)
    try {
      const parsed = weeklyBudget.trim() === '' ? null : parseFloat(weeklyBudget)
      const { error } = await supabase
        .from('households')
        .update({ weekly_budget: parsed })
        .eq('id', householdId)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['household'] })
      setBudgetSaved(true)
      setTimeout(() => setBudgetSaved(false), 2000)
    } catch (err) {
      setBudgetError(err instanceof Error ? err.message : 'Failed to save budget.')
    } finally {
      setBudgetSaving(false)
    }
  }

  return (
    <div>
      <div style={{ padding: '14px 0', borderBottom: '1px dashed var(--rule-soft)' }}>
        <label className="eyebrow block mb-1">Household Name</label>
        {isAdmin ? (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="flex-1"
                style={fieldStyle}
              />
              <button
                onClick={handleSaveHouseholdName}
                disabled={householdSaving}
                className="btn btn-primary btn-sm"
              >
                {householdSaving ? 'Saving...' : householdSaved ? 'Saved!' : 'Save'}
              </button>
            </div>
            {householdError && <p className="serif-italic mt-1" style={{ fontSize: 12, color: 'var(--tomato)' }}>{householdError}</p>}
          </>
        ) : (
          <p className="serif" style={{ fontSize: 15 }}>{household?.name}</p>
        )}
      </div>

      <div style={{ padding: '14px 0', borderBottom: '1px dashed var(--rule-soft)' }}>
        <label className="eyebrow block mb-1">Weekly Budget</label>
        {isAdmin ? (
          <>
            <div className="flex gap-2 items-center">
              <span className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(e.target.value)}
                className="flex-1 mono tnum"
                style={fieldStyle}
              />
              <button
                onClick={handleSaveWeeklyBudget}
                disabled={budgetSaving}
                className="btn btn-primary btn-sm"
              >
                {budgetSaving ? 'Saving...' : budgetSaved ? 'Saved!' : 'Save'}
              </button>
            </div>
            {budgetError && <p className="serif-italic mt-1" style={{ fontSize: 12, color: 'var(--tomato)' }}>{budgetError}</p>}
          </>
        ) : (
          <p className="serif" style={{ fontSize: 15 }}>
            {household?.weekly_budget != null ? `$${household.weekly_budget.toFixed(0)}` : 'Not set'}
          </p>
        )}
      </div>
    </div>
  )
}
