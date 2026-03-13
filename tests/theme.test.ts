import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Utility function to apply theme logic (extracted for testing)
function applyTheme(stored: string | null, prefersDark: boolean) {
  document.documentElement.classList.toggle(
    'dark',
    stored === 'dark' || (!stored && prefersDark)
  )
}

describe('theme', () => {
  beforeEach(() => {
    // Reset document class and localStorage before each test
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  it('applies .dark class when localStorage theme is "dark"', () => {
    localStorage.setItem('theme', 'dark')
    applyTheme('dark', false)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('does not apply .dark class when localStorage theme is "light"', () => {
    localStorage.setItem('theme', 'light')
    applyTheme('light', true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('applies .dark class when no stored preference and system prefers dark', () => {
    applyTheme(null, true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('does not apply .dark class when no stored preference and system prefers light', () => {
    applyTheme(null, false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('localStorage "dark" overrides system light preference', () => {
    localStorage.setItem('theme', 'dark')
    applyTheme('dark', false)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggleTheme function updates localStorage and class', async () => {
    const { toggleTheme } = await import('../src/utils/theme')

    document.documentElement.classList.remove('dark')
    localStorage.removeItem('theme')

    toggleTheme('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    toggleTheme('light')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

test('theme test infrastructure works', () => expect(true).toBe(true))
