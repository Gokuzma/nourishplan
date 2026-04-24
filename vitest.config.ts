import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/e2e/**',
      '.claude/worktrees/**',
    ],
  },
})
