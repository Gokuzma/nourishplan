import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfilesSection } from '../src/components/settings/ProfilesSection';

// ACCTM-01: Account deletion with typed confirmation
describe('Account deletion (ACCTM-01)', () => {
  it('Danger Zone section renders at bottom of SettingsPage', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
    expect(src).toContain('Danger Zone');
    expect(src).toContain('Delete my account');
  });

  it('delete button is disabled until user types "DELETE" exactly', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
    expect(src).toContain("deleteConfirmText !== 'DELETE'");
    expect(src).toContain('Type DELETE to confirm');
  });

  it('admin user sees member picker for admin transfer before confirmation', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
    expect(src).toContain('selectedNewAdmin');
    expect(src).toContain('Transfer admin');
  });
});

const mockTargets: Record<string, unknown>[] = []
vi.mock('../src/hooks/useNutritionTargets', () => ({
  useNutritionTargets: () => ({ data: mockTargets }),
}))
vi.mock('../src/hooks/useHousehold', () => ({
  useHouseholdMembers: () => ({
    data: [
      { user_id: 'u-admin', role: 'admin', profiles: { display_name: 'Alex' } },
      { user_id: 'u-self', role: 'member', profiles: { display_name: 'Sam' } },
    ],
  }),
  useMemberProfiles: () => ({ data: [{ id: 'p-kid', name: 'Kiddo', is_child: true, birth_year: 2018 }] }),
}))

function target(overrides: Record<string, unknown>) {
  return {
    id: 't', household_id: 'h', user_id: null, member_profile_id: null,
    calories: null, protein_g: null, carbs_g: null, fat_g: null,
    micronutrients: {}, custom_goals: {}, macro_mode: 'grams',
    birth_date: null, sex: null, height_cm: null, weight_kg: null,
    target_weight_kg: null, pre_pregnancy_weight_kg: null, activity_level: null,
    is_pregnant: false, due_date: null, notes: null,
    created_at: '', updated_at: '', ...overrides,
  }
}

describe('Settings Profiles section', () => {
  beforeEach(() => {
    mockTargets.length = 0
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('SettingsPage renders Account at 01 and Profiles at 02', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8')
    expect(src).toContain('<SectionHead no="01" label="Account"')
    expect(src).toContain('<SectionHead no="02" label="Profiles"')
    expect(src).toContain('<ProfilesSection')
    expect(src).toContain('no="03" label="Household"')
    expect(src).toContain('no="11" label="Danger Zone"')
  })

  it('lists you first, then other members, then member profiles', () => {
    render(<ProfilesSection householdId="h" currentUserId="u-self" isAdmin={false} />)
    const names = screen.getAllByTestId('profile-name').map(el => el.textContent)
    expect(names).toEqual(['Sam', 'Alex', 'Kiddo'])
  })

  it('shows "No profile yet" for a member without stats', () => {
    render(<ProfilesSection householdId="h" currentUserId="u-self" isAdmin={false} />)
    expect(screen.getAllByText('No profile yet')).toHaveLength(3)
  })

  it('shows age, pregnancy trimester and saved calories', () => {
    mockTargets.push(target({
      user_id: 'u-self', sex: 'female', birth_date: '1990-06-01', is_pregnant: true,
      due_date: '2027-01-15', calories: 2400,
    }))
    render(<ProfilesSection householdId="h" currentUserId="u-self" isAdmin={false} />)
    expect(screen.getByText('36 · Pregnant, T3 · 2400 kcal')).toBeTruthy()
  })

  it('shows a suggested calorie figure when no targets are saved', () => {
    mockTargets.push(target({
      member_profile_id: 'p-kid', sex: 'male', birth_date: '2018-03-01',
      height_cm: 125, weight_kg: 25, activity_level: 'moderate',
    }))
    render(<ProfilesSection householdId="h" currentUserId="u-self" isAdmin={false} />)
    expect(screen.getByText(/^8 · \d+ kcal \(suggested\)$/)).toBeTruthy()
  })

  it('non-admin sees Edit profile for self and View for others', () => {
    render(<ProfilesSection householdId="h" currentUserId="u-self" isAdmin={false} />)
    const edit = screen.getAllByText('Edit profile')
    expect(edit).toHaveLength(1)
    expect(edit[0].getAttribute('href')).toBe('/members/u-self/targets')
    const views = screen.getAllByText('View')
    expect(views.map(v => v.getAttribute('href'))).toEqual(['/members/u-admin/targets', '/members/p-kid/targets'])
  })

  it('admin sees Edit profile for everyone', () => {
    render(<ProfilesSection householdId="h" currentUserId="u-admin" isAdmin />)
    expect(screen.getAllByText('Edit profile')).toHaveLength(3)
    expect(screen.queryByText('View')).toBeNull()
  })
})
