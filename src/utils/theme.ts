export type ThemePreference = 'light' | 'dark' | 'system'

// Cookbook palette is the canonical look — auto-dark via prefers-color-scheme
// caused inconsistent rendering (some pages forced .paper light, others picked
// up bg-surface dark). Force light until a deliberate dark theme exists.
export function toggleTheme(preference: ThemePreference) {
  localStorage.setItem('theme', preference)
  document.documentElement.classList.remove('dark')
}
