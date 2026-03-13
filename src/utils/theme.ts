export type ThemePreference = 'light' | 'dark' | 'system'

export function toggleTheme(preference: ThemePreference) {
  localStorage.setItem('theme', preference)
  applyStoredTheme(preference)
}

export function applyStoredTheme(stored?: string | null) {
  const value = stored ?? localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle(
    'dark',
    value === 'dark' || (!value || value === 'system') && prefersDark
  )
}
