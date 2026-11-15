import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { NutritionTarget } from '../src/types/database'

const saveMutate = vi.fn()
const applyMutate = vi.fn()

vi.mock('../src/hooks/useNutritionTargets', () => ({
  useNutritionTarget: vi.fn().mockReturnValue({ data: null, isPending: false }),
  useSaveMemberStats: () => ({ mutate: saveMutate, isPending: false, isError: false }),
  useApplySuggestedTargets: () => ({ mutate: applyMutate, isPending: false, isError: false }),
}))

import { ProfileForm } from '../src/components/targets/ProfileForm'
import { SuggestedTargetsCard } from '../src/components/targets/SuggestedTargetsCard'
import { useNutritionTarget } from '../src/hooks/useNutritionTargets'

const baseProps = { householdId: 'hh-1', memberId: 'm-1', memberType: 'profile' as const, canEdit: true }

function makeTarget(overrides: Partial<NutritionTarget> = {}): NutritionTarget {
  return {
    id: 't1',
    household_id: 'hh-1',
    user_id: null,
    member_profile_id: 'm-1',
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    micronutrients: {},
    custom_goals: {},
    macro_mode: 'grams',
    birth_date: '1985-03-10',
    sex: 'male',
    height_cm: 180,
    weight_kg: 80,
    target_weight_kg: null,
    pre_pregnancy_weight_kg: null,
    activity_level: 'moderate',
    is_pregnant: false,
    due_date: null,
    notes: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

beforeEach(() => {
  saveMutate.mockReset()
  applyMutate.mockReset()
  localStorage.clear()
  vi.mocked(useNutritionTarget).mockReturnValue({ data: null, isPending: false } as never)
})

describe('ProfileForm', () => {
  it('hides target weight and pregnant toggle for a child', () => {
    render(<ProfileForm {...baseProps} isChild />)
    expect(screen.queryByLabelText(/target weight/i)).toBeNull()
    expect(screen.queryByLabelText(/pregnant/i)).toBeNull()
  })

  it('shows target weight and pregnant toggle for an adult', () => {
    render(<ProfileForm {...baseProps} isChild={false} />)
    expect(screen.getByLabelText(/target weight/i)).toBeTruthy()
    expect(screen.getByLabelText(/pregnant/i)).toBeTruthy()
  })

  it('pregnant reveals due date and pre-pregnancy weight and hides target weight', () => {
    render(<ProfileForm {...baseProps} isChild={false} />)
    fireEvent.click(screen.getByLabelText(/pregnant/i))
    expect(screen.getByLabelText(/due date/i)).toBeTruthy()
    expect(screen.getByLabelText(/pre-pregnancy weight/i)).toBeTruthy()
    expect(screen.queryByLabelText(/target weight/i)).toBeNull()
  })

  it('saves metric values when entered in imperial', () => {
    render(<ProfileForm {...baseProps} isChild={false} />)
    fireEvent.change(screen.getByLabelText('Height (ft)'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Height (in)'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Weight (lb)'), { target: { value: '150' } })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))
    expect(saveMutate).toHaveBeenCalledTimes(1)
    const arg = saveMutate.mock.calls[0][0]
    expect(arg.householdId).toBe('hh-1')
    expect(arg.stats.height_cm).toBeCloseTo(162.6, 1)
    expect(arg.stats.weight_kg).toBeCloseTo(68.04, 2)
  })

  it('shows saved metric values back in imperial', () => {
    vi.mocked(useNutritionTarget).mockReturnValue({
      data: makeTarget({ height_cm: 162.6, weight_kg: 68.04 }),
      isPending: false,
    } as never)
    render(<ProfileForm {...baseProps} isChild={false} />)
    expect((screen.getByLabelText('Height (ft)') as HTMLInputElement).value).toBe('5')
    expect((screen.getByLabelText('Height (in)') as HTMLInputElement).value).toBe('4')
    expect((screen.getByLabelText('Weight (lb)') as HTMLInputElement).value).toBe('150')
  })

  it('prefills birth date from the birth year fallback', () => {
    render(<ProfileForm {...baseProps} isChild birthYearFallback={2018} />)
    expect((screen.getByLabelText(/birth date/i) as HTMLInputElement).value).toBe('2018-07-01')
  })

  it('caps notes at 500 characters', () => {
    render(<ProfileForm {...baseProps} isChild={false} />)
    expect(screen.getByLabelText(/notes/i).getAttribute('maxlength')).toBe('500')
    expect(screen.getByText('Visible to your household.')).toBeTruthy()
  })

  it('keeps unsaved edits when only calories change on the target', () => {
    vi.mocked(useNutritionTarget).mockReturnValue({ data: makeTarget({ calories: 2000 }), isPending: false } as never)
    const { rerender } = render(<ProfileForm {...baseProps} isChild={false} />)
    fireEvent.change(screen.getByLabelText('Weight (lb)'), { target: { value: '999' } })
    vi.mocked(useNutritionTarget).mockReturnValue({ data: makeTarget({ calories: 2500 }), isPending: false } as never)
    rerender(<ProfileForm {...baseProps} isChild={false} />)
    expect((screen.getByLabelText('Weight (lb)') as HTMLInputElement).value).toBe('999')
  })

  it('hides pregnant toggle for male and clears pregnancy when sex becomes male', () => {
    render(<ProfileForm {...baseProps} isChild={false} />)
    fireEvent.change(screen.getByLabelText(/sex/i), { target: { value: 'female' } })
    fireEvent.click(screen.getByLabelText(/pregnant/i))
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2027-01-01' } })
    fireEvent.change(screen.getByLabelText(/pre-pregnancy weight/i), { target: { value: '140' } })
    fireEvent.change(screen.getByLabelText(/sex/i), { target: { value: 'male' } })
    expect(screen.queryByLabelText(/pregnant/i)).toBeNull()
    expect(screen.queryByLabelText(/due date/i)).toBeNull()
    expect(screen.getByLabelText(/target weight/i)).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/sex/i), { target: { value: 'female' } })
    expect((screen.getByLabelText(/pregnant/i) as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByLabelText(/pregnant/i))
    expect((screen.getByLabelText(/pre-pregnancy weight/i) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/due date/i) as HTMLInputElement).value).toBe('')
  })

  it('clears a stale saved pregnancy on a male when saving', () => {
    vi.mocked(useNutritionTarget).mockReturnValue({
      data: makeTarget({ sex: 'male', is_pregnant: true, due_date: '2027-01-01', pre_pregnancy_weight_kg: 60 }),
      isPending: false,
    } as never)
    render(<ProfileForm {...baseProps} isChild={false} />)
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))
    const stats = saveMutate.mock.calls[0][0].stats
    expect(stats.is_pregnant).toBe(false)
    expect(stats.due_date).toBeNull()
    expect(stats.pre_pregnancy_weight_kg).toBeNull()
  })

  it('has no save button when read-only', () => {
    render(<ProfileForm {...baseProps} isChild={false} canEdit={false} />)
    expect(screen.queryByRole('button', { name: /save profile/i })).toBeNull()
  })
})

describe('SuggestedTargetsCard', () => {
  const cardProps = { ...baseProps, isChild: false }

  it('explains it uses the saved profile', () => {
    render(<SuggestedTargetsCard {...cardProps} target={null} />)
    expect(screen.getByText('Based on your saved profile. Save changes to update.')).toBeTruthy()
  })

  it('lists missing fields', () => {
    render(<SuggestedTargetsCard {...cardProps} target={null} />)
    expect(screen.getByText(/Add .*birth date.* to get a suggestion/)).toBeTruthy()
  })

  it('applies the suggestion', () => {
    const target = makeTarget()
    render(<SuggestedTargetsCard {...cardProps} target={target} />)
    expect(screen.getByText('Estimates only.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Apply to targets' }))
    expect(applyMutate).toHaveBeenCalledTimes(1)
    const arg = applyMutate.mock.calls[0][0]
    expect(arg.existing).toBe(target)
    expect(arg.suggestion.kind).toBe('adult')
    expect(arg.suggestion.calories).toBeGreaterThan(0)
  })

  it('disables apply when targets already match', () => {
    const { unmount } = render(<SuggestedTargetsCard {...cardProps} target={makeTarget()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Apply to targets' }))
    const s = applyMutate.mock.calls[0][0].suggestion
    unmount()
    const matching = makeTarget({
      calories: s.calories,
      protein_g: s.protein_g,
      carbs_g: s.carbs_g,
      fat_g: s.fat_g,
    })
    render(<SuggestedTargetsCard {...cardProps} target={matching} />)
    const button = screen.getByRole('button', { name: 'Targets match suggestion' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('shows differ note when targets differ', () => {
    render(
      <SuggestedTargetsCard
        {...cardProps}
        target={makeTarget({ calories: 5000, protein_g: 1, carbs_g: 1, fat_g: 1 })}
      />,
    )
    expect(screen.getByText('Your targets differ from the suggestion')).toBeTruthy()
  })

  it('shows pediatrician note for under one', () => {
    const birth = `${new Date().getUTCFullYear()}-01-01`
    render(<SuggestedTargetsCard {...cardProps} isChild target={makeTarget({ birth_date: birth })} />)
    expect(screen.getByText('Under 1 year: talk to your pediatrician.')).toBeTruthy()
  })
})
