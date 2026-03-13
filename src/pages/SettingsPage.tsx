import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toggleTheme } from '../utils/theme'
import type { ThemePreference } from '../utils/theme'

export function SettingsPage() {
  const { session, signOut } = useAuth()
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
    return 'system'
  })

  useEffect(() => {
    toggleTheme(theme)
  }, [theme])

  function handleThemeChange(value: ThemePreference) {
    setTheme(value)
    toggleTheme(value)
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 font-sans">
      <h1 className="text-2xl font-bold text-primary mb-6">Settings</h1>

      {session && (
        <p className="text-sm text-text/60 mb-6">
          Signed in as <span className="font-medium text-text">{session.user.email}</span>
        </p>
      )}

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
