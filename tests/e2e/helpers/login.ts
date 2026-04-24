import type { Page } from '@playwright/test'

export interface TestAccount {
  email: string
  password: string
}

/**
 * Logs a Playwright page into NourishPlan via the /auth form.
 *
 * - Uses transition-unique signals per lessons.md L-026 — waits for the URL to
 *   change away from /auth rather than on ambient text.
 * - Clears cookies + localStorage + sessionStorage BEFORE navigating to /auth
 *   so any authenticated session does not trigger GuestGuard to redirect
 *   away from /auth.
 * - Expects the app to redirect authenticated users away from /auth (AuthGuard pattern).
 *
 * Throws if the form cannot be found or the redirect never fires within 15s.
 */
export async function login(page: Page, account: TestAccount): Promise<void> {
  await page.context().clearCookies()
  await page.goto('/')
  await page.evaluate(() => {
    try { localStorage.clear() } catch { /* ignore */ }
    try { sessionStorage.clear() } catch { /* ignore */ }
  })

  await page.goto('/auth')

  // AuthForm uses <input type="email"> + <input type="password"> with placeholders, no explicit ids.
  const emailInput = page.locator('input[type="email"]').first()
  const passwordInput = page.locator('input[type="password"]').first()

  await emailInput.waitFor({ state: 'visible', timeout: 10_000 })
  await emailInput.fill(account.email)
  await passwordInput.fill(account.password)

  await page.locator('button[type="submit"]').first().click()

  // L-026: wait on a transition-unique signal — URL change away from /auth.
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 })
}

/**
 * Signs the current page out without relying on the /settings UI.
 *
 * Clears cookies + storage + navigates to /auth. Absence of a session causes
 * AuthGuard to keep the user on /auth; we wait for the email input as the
 * transition-unique signal.
 */
export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.evaluate(() => {
    try { localStorage.clear() } catch { /* ignore */ }
    try { sessionStorage.clear() } catch { /* ignore */ }
  })
  await page.goto('/auth')
  await page.locator('input[type="email"]').first().waitFor({ state: 'visible', timeout: 10_000 })
}
