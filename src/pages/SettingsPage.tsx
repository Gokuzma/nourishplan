import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold, useHouseholdMembers, useMemberProfiles } from '../hooks/useHousehold'
import { useProfile, useUpdateProfile, uploadAvatar } from '../hooks/useProfile'
import { useFoodPrices, useDeleteFoodPrice } from '../hooks/useFoodPrices'
import { formatCost } from '../utils/cost'
import { supabase } from '../lib/supabase'
import { toggleTheme } from '../utils/theme'
import type { ThemePreference } from '../utils/theme'
import { DietaryRestrictionsSection } from '../components/settings/DietaryRestrictionsSection'
import { WontEatSection } from '../components/settings/WontEatSection'
import { ScheduleSection } from '../components/settings/ScheduleSection'
import { Nameplate, StoryHead, SectionHead, Rule } from '../components/editorial'

const fieldStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--rule-c)',
  padding: '8px 10px',
  fontSize: 14,
  color: 'var(--ink)',
}

export function SettingsPage() {
  const { session, signOut } = useAuth()
  const queryClient = useQueryClient()
  const { data: membership } = useHousehold()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()

  // Theme state
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
    return 'system'
  })

  // Profile editing state
  const [displayName, setDisplayName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Household editing state
  const [householdName, setHouseholdName] = useState('')
  const [householdSaving, setHouseholdSaving] = useState(false)
  const [householdSaved, setHouseholdSaved] = useState(false)
  const [householdError, setHouseholdError] = useState<string | null>(null)

  // Weekly budget state
  const [weeklyBudget, setWeeklyBudget] = useState<string>('')
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetSaved, setBudgetSaved] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)

  // Food prices state
  const { data: foodPrices } = useFoodPrices()
  const deleteFoodPrice = useDeleteFoodPrice()
  const [confirmDeletePriceId, setConfirmDeletePriceId] = useState<string | null>(null)

  // Sync profile data into form state
  useEffect(() => {
    if (profile?.display_name != null) {
      setDisplayName(profile.display_name)
    }
  }, [profile?.display_name])

  // Sync household name into form state
  useEffect(() => {
    if (membership?.households?.name) {
      setHouseholdName(membership.households.name)
    }
  }, [membership?.households?.name])

  // Sync weekly budget into form state
  useEffect(() => {
    const budget = membership?.households?.weekly_budget
    if (budget != null) {
      setWeeklyBudget(String(budget))
    }
  }, [membership?.households?.weekly_budget])

  useEffect(() => {
    toggleTheme(theme)
  }, [theme])

  function handleThemeChange(value: ThemePreference) {
    setTheme(value)
    toggleTheme(value)
  }

  async function handleSaveDisplayName() {
    setNameSaving(true)
    setNameError(null)
    setNameSaved(false)
    try {
      await updateProfile.mutateAsync({ display_name: displayName.trim() || null })
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save name.')
    } finally {
      setNameSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session) return
    setAvatarUploading(true)
    setAvatarError(null)
    try {
      const url = await uploadAvatar(session.user.id, file)
      await updateProfile.mutateAsync({ avatar_url: url })
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSaveHouseholdName() {
    const householdId = membership?.household_id
    if (!householdId) return
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
    const householdId = membership?.household_id
    if (!householdId) return
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

  // Danger Zone state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<'transfer' | 'confirm'>('transfer')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: members } = useHouseholdMembers()
  const { data: memberProfiles } = useMemberProfiles()
  const otherMembers = (members ?? []).filter(m => m.user_id !== session?.user.id)
  const isLastMember = otherMembers.length === 0
  const householdDisplayName = membership?.households?.name ?? 'this household'

  async function handleDeleteAccount() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { newAdminUserId: selectedNewAdmin },
      })
      if (error) throw error
      // Account deleted — sign out and redirect
      await signOut()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Account deletion failed. Please try again or contact support.')
      setIsDeleting(false)
    }
  }

  const isAdmin = membership?.role === 'admin'
  const avatarUrl = profile?.avatar_url
  const initials = (profile?.display_name ?? session?.user.email ?? '?')
    .charAt(0)
    .toUpperCase()

  return (
    <div className="paper px-4 md:px-8 pt-4 md:pt-6 pb-24 md:pb-8 font-sans">
      {/* Nameplate — desktop only */}
      <div className="hidden md:block">
        <Nameplate
          left={membership?.households?.name ?? 'Your account'}
          title={<>The <span className="amp">Masthead</span></>}
          right={session?.user.email ?? '—'}
        />
      </div>

      {/* Story head */}
      <StoryHead
        kicker="SETTINGS"
        headline="The Masthead"
        byline="Account & household"
        size="sm"
      />

      {/* Profile section */}
      <section className="mt-6">
        <SectionHead no="01" label="Profile" aux={session?.user.email ?? undefined} />
        <Rule />

        {/* Avatar */}
        <div className="flex items-center gap-4" style={{ padding: '14px 0', borderBottom: '1px dashed var(--rule-soft)' }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ background: 'var(--paper-2)', border: '1px solid var(--rule-c)' }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="serif" style={{ fontSize: 26, color: 'var(--tomato)' }}>{initials}</span>
            )}
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="btn btn-sm"
            >
              {avatarUploading ? 'Uploading...' : 'Change Photo'}
            </button>
            {avatarError && <p className="serif-italic mt-1" style={{ fontSize: 12, color: 'var(--tomato)' }}>{avatarError}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Display name */}
        <div style={{ padding: '14px 0', borderBottom: '1px dashed var(--rule-soft)' }}>
          <label className="eyebrow block mb-1">Display Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="flex-1"
              style={fieldStyle}
            />
            <button
              onClick={handleSaveDisplayName}
              disabled={nameSaving}
              className="btn btn-primary btn-sm"
            >
              {nameSaving ? 'Saving...' : nameSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
          {nameError && <p className="serif-italic mt-1" style={{ fontSize: 12, color: 'var(--tomato)' }}>{nameError}</p>}
        </div>

        {/* Email (read-only) */}
        {session && (
          <div style={{ padding: '14px 0' }}>
            <label className="eyebrow block mb-1">Email</label>
            <p className="serif" style={{ fontSize: 15 }}>{session.user.email}</p>
          </div>
        )}
      </section>

      {/* Household section */}
      {membership && (
        <section className="mt-6">
          <SectionHead no="02" label="Household" aux={isAdmin ? 'admin' : membership.role ?? undefined} />
          <Rule />
          <div style={{ padding: '14px 0', borderBottom: isAdmin ? '1px dashed var(--rule-soft)' : 'none' }}>
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
              <p className="serif" style={{ fontSize: 15 }}>{membership.households?.name}</p>
            )}
          </div>

          {isAdmin && (
            <div style={{ padding: '14px 0' }}>
              <label className="eyebrow block mb-1">Weekly Budget</label>
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
            </div>
          )}
        </section>
      )}

      {/* Food Prices section */}
      {membership && (
        <section className="mt-6">
          <SectionHead
            no="03"
            label="Food Prices"
            aux={foodPrices && foodPrices.length > 0 ? `${foodPrices.length} on file` : undefined}
          />
          <Rule />
          {!foodPrices || foodPrices.length === 0 ? (
            <p className="serif-italic" style={{ fontSize: 14, color: 'var(--ink-dim)', padding: '14px 0' }}>
              No ingredient prices yet. Add prices in the recipe builder or manage them here.
            </p>
          ) : (
            <div>
              {foodPrices.map(price => (
                <div key={price.id}>
                  <div
                    className="flex items-baseline justify-between"
                    style={{ padding: '12px 0', borderBottom: '1px dashed var(--rule-soft)' }}
                  >
                    <div className="min-w-0">
                      <span className="serif" style={{ fontSize: 15 }}>{price.food_name}</span>
                      {price.store && (
                        <span className="mono ml-2" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{price.store}</span>
                      )}
                      <span className="mono tnum ml-2" style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.06em' }}>{formatCost(price.cost_per_100g)}/100g</span>
                    </div>
                    <button
                      onClick={() => setConfirmDeletePriceId(price.id)}
                      className="mono ml-4"
                      style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tomato)' }}
                    >
                      Remove
                    </button>
                  </div>
                  {confirmDeletePriceId === price.id && (
                    <div
                      className="flex items-center gap-3"
                      style={{ padding: '8px 12px', background: 'var(--paper-2)', borderBottom: '1px dashed var(--rule-soft)', borderLeft: '2px solid var(--tomato)' }}
                    >
                      <span className="serif-italic flex-1" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>Remove this price entry?</span>
                      <button
                        onClick={() => {
                          deleteFoodPrice.mutate(price.id)
                          setConfirmDeletePriceId(null)
                        }}
                        className="btn btn-sm"
                        style={{ color: 'var(--tomato)', borderColor: 'var(--tomato)' }}
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirmDeletePriceId(null)}
                        className="btn btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Nutrition & Dietary section */}
      {session && membership && (
        <section className="mt-6">
          <SectionHead no="04" label="Nutrition" />
          <Rule />
          <div style={{ padding: '14px 0' }}>
            <a
              href={`/members/${session.user.id}/targets`}
              className="serif"
              style={{ fontSize: 15, color: 'var(--tomato)', textDecorationColor: 'var(--rule-c)' }}
            >
              Edit Nutrition Targets
            </a>
            <DietaryRestrictionsSection
              householdId={membership.household_id}
              memberId={session.user.id}
              memberType="user"
            />
            <WontEatSection
              householdId={membership.household_id}
              memberId={session.user.id}
              memberType="user"
            />
            <ScheduleSection
              householdId={membership.household_id}
              memberId={session.user.id}
              memberType="user"
              weekStartDay={membership.households?.week_start_day}
            />
          </div>
        </section>
      )}

      {/* Child member profiles — dietary restrictions and won't-eat */}
      {membership && memberProfiles && memberProfiles.length > 0 && (
        <section className="mt-6">
          <SectionHead no="05" label="Member Dietary Preferences" aux={`${memberProfiles.length} member${memberProfiles.length === 1 ? '' : 's'}`} />
          <Rule />
          {memberProfiles.map(profile => (
            <div key={profile.id} style={{ padding: '14px 0', borderBottom: '1px dashed var(--rule-soft)' }}>
              <a
                href={`/members/${profile.id}/targets`}
                className="serif"
                style={{ fontSize: 15, color: 'var(--tomato)', textDecorationColor: 'var(--rule-c)' }}
              >
                Edit {profile.name}&apos;s Nutrition Targets
              </a>
              <DietaryRestrictionsSection
                householdId={membership.household_id}
                memberId={profile.id}
                memberType="profile"
                memberName={profile.name}
              />
              <WontEatSection
                householdId={membership.household_id}
                memberId={profile.id}
                memberType="profile"
                memberName={profile.name}
              />
              <ScheduleSection
                householdId={membership.household_id}
                memberId={profile.id}
                memberType="profile"
                memberName={profile.name}
                weekStartDay={membership.households?.week_start_day}
              />
            </div>
          ))}
        </section>
      )}

      {/* Appearance section */}
      <section className="mt-6">
        <SectionHead no="06" label="Appearance" aux={theme} />
        <Rule />
        <div className="flex gap-2" style={{ padding: '14px 0' }}>
          {(['light', 'dark', 'system'] as ThemePreference[]).map((option) => (
            <button
              key={option}
              onClick={() => handleThemeChange(option)}
              className={`btn btn-sm capitalize ${theme === option ? 'btn-primary' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      {/* Account section */}
      <section className="mt-6">
        <SectionHead no="07" label="Account" />
        <Rule />
        <div style={{ padding: '14px 0' }}>
          <button
            onClick={signOut}
            className="btn btn-sm"
          >
            Log Out
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="mt-10" style={{ borderLeft: '2px solid var(--tomato)', paddingLeft: 14 }}>
        <SectionHead no="08" label="Danger Zone" aux="permanent" />
        <Rule />
        <div style={{ padding: '14px 0' }}>
          <p className="serif-italic mb-3" style={{ fontSize: 13, color: 'var(--ink-dim)' }}>These actions are permanent and cannot be undone.</p>
          <button
            onClick={() => {
              setShowDeleteModal(true)
              setDeleteStep(isAdmin && !isLastMember ? 'transfer' : 'confirm')
              setDeleteConfirmText('')
              setSelectedNewAdmin(null)
              setDeleteError(null)
            }}
            className="btn btn-sm"
            style={{ color: 'var(--tomato)', borderColor: 'var(--tomato)' }}
          >
            Delete my account
          </button>
        </div>
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteModal(false)} />
          <div
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-5 mx-0 sm:mx-4"
            style={{ background: 'var(--paper-2)', border: '1.5px solid var(--rule-c)', borderLeft: '2px solid var(--tomato)' }}
          >

            {/* Step 1: Admin transfer (admin with other members only) */}
            {deleteStep === 'transfer' && isAdmin && !isLastMember && (
              <>
                <div className="mono" style={{ color: 'var(--tomato)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Danger zone
                </div>
                <h3 className="serif" style={{ fontSize: 22, marginTop: 4, marginBottom: 4 }}>Transfer admin before leaving</h3>
                <p className="serif-italic mb-4" style={{ fontSize: 14, color: 'var(--ink-dim)' }}>Choose a new household admin. They will have full control over the household.</p>
                <div className="flex flex-col gap-2 mb-4">
                  {otherMembers.map(member => (
                    <button
                      key={member.user_id}
                      onClick={() => setSelectedNewAdmin(member.user_id)}
                      className="flex items-center gap-3 text-left"
                      style={{
                        padding: '10px 12px',
                        background: 'transparent',
                        cursor: 'pointer',
                        border: selectedNewAdmin === member.user_id
                          ? '1.5px solid var(--tomato)'
                          : '1px dashed var(--rule-c)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 serif"
                        style={{ fontSize: 14, background: 'var(--paper)', border: '1px solid var(--rule-c)', color: 'var(--tomato)' }}
                      >
                        {(member.profiles?.display_name ?? member.profiles?.id ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="serif truncate" style={{ fontSize: 15 }}>{member.profiles?.display_name ?? 'Member'}</p>
                        <p className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{member.role}</p>
                      </div>
                      {selectedNewAdmin === member.user_id && (
                        <span style={{ color: 'var(--tomato)', fontSize: 14 }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 btn btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep('confirm')}
                    disabled={!selectedNewAdmin}
                    className="flex-1 btn btn-primary btn-sm"
                  >
                    Transfer admin &amp; continue
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Typed confirmation (all paths converge here) */}
            {deleteStep === 'confirm' && (
              <>
                <div className="mono" style={{ color: 'var(--tomato)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Danger zone
                </div>
                <h3 className="serif" style={{ fontSize: 22, marginTop: 4, marginBottom: 4 }}>Delete account</h3>
                <p className="serif-italic mb-4" style={{ fontSize: 14, color: 'var(--ink-dim)' }}>
                  {isLastMember
                    ? `You are the only member. Deleting your account will permanently delete the ${householdDisplayName} household and all its data.`
                    : isAdmin
                      ? 'This will permanently delete your account. The household and all data will remain.'
                      : 'This will permanently delete your account. The household and all its data will remain.'}
                </p>
                <div className="mb-4">
                  <label className="eyebrow block mb-1">Type DELETE to confirm</label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full mono"
                    style={{
                      ...fieldStyle,
                      letterSpacing: '0.08em',
                      border: deleteConfirmText === 'DELETE' ? '1.5px solid var(--tomato)' : '1px solid var(--rule-c)',
                    }}
                    autoComplete="off"
                  />
                </div>
                {deleteError && <p className="serif-italic mb-3" style={{ fontSize: 12, color: 'var(--tomato)' }}>{deleteError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (isAdmin && !isLastMember) {
                        setDeleteStep('transfer')
                      } else {
                        setShowDeleteModal(false)
                      }
                      setDeleteConfirmText('')
                    }}
                    disabled={isDeleting}
                    className="flex-1 btn btn-sm"
                  >
                    {isAdmin && !isLastMember ? 'Back' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    className="flex-1 btn btn-sm"
                    style={{ background: 'var(--tomato)', borderColor: 'var(--tomato)', color: 'var(--on-accent)' }}
                  >
                    {isDeleting ? 'Deleting...' : isLastMember ? 'Delete household and account' : 'Delete my account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
