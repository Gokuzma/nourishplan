import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold, useHouseholdMembers } from '../hooks/useHousehold'
import { useProfile, useUpdateProfile, uploadAvatar } from '../hooks/useProfile'
import { useFoodPrices, useDeleteFoodPrice } from '../hooks/useFoodPrices'
import { formatCost } from '../utils/cost'
import { supabase } from '../lib/supabase'
import { toggleTheme } from '../utils/theme'
import type { ThemePreference } from '../utils/theme'

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
    <div className="min-h-screen bg-background px-4 py-8 font-sans">
      <h1 className="text-2xl font-bold text-primary mb-6">Settings</h1>

      {/* Profile section */}
      <section className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm mb-4">
        <h2 className="font-semibold text-text mb-4">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{initials}</span>
            )}
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="px-3 py-1.5 rounded-[--radius-btn] text-sm border border-secondary text-text/70 hover:border-primary/50 hover:text-text transition-colors disabled:opacity-50"
            >
              {avatarUploading ? 'Uploading...' : 'Change Photo'}
            </button>
            {avatarError && <p className="text-xs text-red-500 mt-1">{avatarError}</p>}
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
        <div className="mb-3">
          <label className="block text-sm text-text/60 mb-1">Display Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="flex-1 px-3 py-2 rounded-[--radius-btn] border border-secondary bg-background text-text text-sm focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleSaveDisplayName}
              disabled={nameSaving}
              className="px-4 py-2 rounded-[--radius-btn] text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {nameSaving ? 'Saving...' : nameSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
          {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
        </div>

        {/* Email (read-only) */}
        {session && (
          <div>
            <label className="block text-sm text-text/60 mb-1">Email</label>
            <p className="text-sm text-text">{session.user.email}</p>
          </div>
        )}
      </section>

      {/* Household section */}
      {membership && (
        <section className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm mb-4">
          <h2 className="font-semibold text-text mb-4">Household</h2>
          <div>
            <label className="block text-sm text-text/60 mb-1">Household Name</label>
            {isAdmin ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-[--radius-btn] border border-secondary bg-background text-text text-sm focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleSaveHouseholdName}
                    disabled={householdSaving}
                    className="px-4 py-2 rounded-[--radius-btn] text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {householdSaving ? 'Saving...' : householdSaved ? 'Saved!' : 'Save'}
                  </button>
                </div>
                {householdError && <p className="text-xs text-red-500 mt-1">{householdError}</p>}
              </>
            ) : (
              <p className="text-sm text-text">{membership.households?.name}</p>
            )}
          </div>

          {isAdmin && (
            <div className="mt-4">
              <label className="block text-sm text-text/60 mb-1">Weekly Budget</label>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-text/60">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={weeklyBudget}
                  onChange={(e) => setWeeklyBudget(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-[--radius-btn] border border-secondary bg-background text-text text-sm focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleSaveWeeklyBudget}
                  disabled={budgetSaving}
                  className="px-4 py-2 rounded-[--radius-btn] text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {budgetSaving ? 'Saving...' : budgetSaved ? 'Saved!' : 'Save'}
                </button>
              </div>
              {budgetError && <p className="text-xs text-red-500 mt-1">{budgetError}</p>}
            </div>
          )}
        </section>
      )}

      {/* Food Prices section */}
      {membership && (
        <section className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm mb-4">
          <h2 className="text-base font-semibold text-text mb-3">Food Prices</h2>
          {!foodPrices || foodPrices.length === 0 ? (
            <p className="text-sm text-text/50">
              No ingredient prices yet. Add prices in the recipe builder or manage them here.
            </p>
          ) : (
            <div>
              {foodPrices.map(price => (
                <div key={price.id}>
                  <div className="flex items-center justify-between py-3 border-b border-accent/10">
                    <div>
                      <span className="text-sm text-text">{price.food_name}</span>
                      {price.store && (
                        <span className="text-xs text-text/40 ml-1">{price.store}</span>
                      )}
                      <span className="text-xs text-text/50 ml-2">{formatCost(price.cost_per_100g)}/100g</span>
                    </div>
                    <button
                      onClick={() => setConfirmDeletePriceId(price.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors ml-4"
                    >
                      Remove
                    </button>
                  </div>
                  {confirmDeletePriceId === price.id && (
                    <div className="flex items-center gap-3 py-2 px-3 bg-red-50 dark:bg-red-900/10 border-b border-accent/10">
                      <span className="text-xs text-text/60 flex-1">Remove this price entry?</span>
                      <button
                        onClick={() => {
                          deleteFoodPrice.mutate(price.id)
                          setConfirmDeletePriceId(null)
                        }}
                        className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirmDeletePriceId(null)}
                        className="text-xs text-text/40 hover:text-text transition-colors"
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

      {/* Nutrition section */}
      {session && (
        <section className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm mb-4">
          <h2 className="font-semibold text-text mb-3">Nutrition</h2>
          <a
            href={`/members/${session.user.id}/targets`}
            className="text-sm text-primary hover:underline"
          >
            Edit Nutrition Targets
          </a>
        </section>
      )}

      {/* Appearance section */}
      <section className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm mb-4">
        <h2 className="font-semibold text-text mb-3">Appearance</h2>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as ThemePreference[]).map((option) => (
            <button
              key={option}
              onClick={() => handleThemeChange(option)}
              className={`px-3 py-1.5 rounded-[--radius-btn] text-sm capitalize border transition-colors ${
                theme === option
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text/70 border-secondary hover:border-primary/50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      {/* Account section */}
      <section className="bg-surface rounded-[--radius-card] p-5 border border-secondary shadow-sm">
        <h2 className="font-semibold text-text mb-3">Account</h2>
        <button
          onClick={signOut}
          className="rounded-[--radius-btn] bg-accent/20 text-text font-semibold py-2 px-4 hover:bg-accent/40 transition-colors"
        >
          Log Out
        </button>
      </section>

      {/* Danger Zone */}
      <section className="bg-surface rounded-[--radius-card] p-5 border border-red-200 dark:border-red-900/30 shadow-sm mt-8">
        <h2 className="font-semibold text-red-600 mb-1">Danger Zone</h2>
        <p className="text-xs text-text/50 mb-4">These actions are permanent and cannot be undone.</p>
        <button
          onClick={() => {
            setShowDeleteModal(true)
            setDeleteStep(isAdmin && !isLastMember ? 'transfer' : 'confirm')
            setDeleteConfirmText('')
            setSelectedNewAdmin(null)
            setDeleteError(null)
          }}
          className="rounded-[--radius-btn] border border-red-300 text-red-600 font-semibold py-2 px-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm"
        >
          Delete my account
        </button>
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteModal(false)} />
          <div className="relative bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 mx-0 sm:mx-4">

            {/* Step 1: Admin transfer (admin with other members only) */}
            {deleteStep === 'transfer' && isAdmin && !isLastMember && (
              <>
                <h3 className="font-semibold text-text mb-1">Transfer admin before leaving</h3>
                <p className="text-sm text-text/60 mb-4">Choose a new household admin. They will have full control over the household.</p>
                <div className="flex flex-col gap-2 mb-4">
                  {otherMembers.map(member => (
                    <button
                      key={member.user_id}
                      onClick={() => setSelectedNewAdmin(member.user_id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[--radius-btn] border transition-colors text-left ${
                        selectedNewAdmin === member.user_id
                          ? 'border-primary bg-primary/10'
                          : 'border-secondary hover:border-primary/40'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                        {(member.profiles?.display_name ?? member.profiles?.id ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text truncate">{member.profiles?.display_name ?? 'Member'}</p>
                        <p className="text-xs text-text/40">{member.role}</p>
                      </div>
                      {selectedNewAdmin === member.user_id && (
                        <span className="text-primary text-sm">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 rounded-[--radius-btn] border border-secondary py-2 text-sm text-text/60 hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep('confirm')}
                    disabled={!selectedNewAdmin}
                    className="flex-1 rounded-[--radius-btn] bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    Transfer admin &amp; continue
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Typed confirmation (all paths converge here) */}
            {deleteStep === 'confirm' && (
              <>
                <h3 className="font-semibold text-text mb-1">Delete account</h3>
                <p className="text-sm text-text/60 mb-4">
                  {isLastMember
                    ? `You are the only member. Deleting your account will permanently delete the ${householdDisplayName} household and all its data.`
                    : isAdmin
                      ? 'This will permanently delete your account. The household and all data will remain.'
                      : 'This will permanently delete your account. The household and all its data will remain.'}
                </p>
                <div className="mb-4">
                  <label className="block text-sm text-text/60 mb-1">Type DELETE to confirm</label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className={`w-full px-3 py-2 rounded-[--radius-btn] border text-sm bg-background text-text focus:outline-none ${
                      deleteConfirmText === 'DELETE' ? 'border-red-500 focus:border-red-500' : 'border-secondary focus:border-primary'
                    }`}
                    autoComplete="off"
                  />
                </div>
                {deleteError && <p className="text-xs text-red-500 mb-3">{deleteError}</p>}
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
                    className="flex-1 rounded-[--radius-btn] border border-secondary py-2 text-sm text-text/60 hover:text-text transition-colors"
                  >
                    {isAdmin && !isLastMember ? 'Back' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    className="flex-1 rounded-[--radius-btn] bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
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
