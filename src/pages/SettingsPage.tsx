import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../hooks/useHousehold'
import { useProfile, useUpdateProfile, uploadAvatar } from '../hooks/useProfile'
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
    </div>
  )
}
