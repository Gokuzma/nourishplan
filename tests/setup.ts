import '@testing-library/jest-dom'

// Mock window.matchMedia — not implemented in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Replace Node 25's built-in localStorage stub (broken without --localstorage-file)
// with a working Map-backed implementation so jsdom tests can use it.
const storageBacking = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  writable: true,
  value: {
    getItem: (key: string) => storageBacking.get(key) ?? null,
    setItem: (key: string, value: string) => { storageBacking.set(key, String(value)) },
    removeItem: (key: string) => { storageBacking.delete(key) },
    clear: () => { storageBacking.clear() },
    key: (i: number) => [...storageBacking.keys()][i] ?? null,
    get length() { return storageBacking.size },
  },
})

// Mock IntersectionObserver — not implemented in jsdom (used by DayCarousel)
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver

// Mock import.meta.env so tests don't crash on missing Supabase env vars
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    MODE: 'test',
    DEV: false,
    PROD: false,
    SSR: false,
  },
  writable: true,
})
