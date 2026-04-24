import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E config (Phase 30 — first Playwright infra in repo).
 *
 * Convention (from 30-CONTEXT D-10 + D-11):
 *  - Runs on-demand only: `npx playwright test`
 *  - NOT wired into CI (deferred; see .planning/ROADMAP.md — CI gate is a Deferred Idea)
 *  - Targets the local dev server by default; override with PLAYWRIGHT_BASE_URL for prod
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npx vite --port 5173',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 30_000,
      },
})
