import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { login, signOut, type TestAccount } from './helpers/login'

/**
 * SPEC Req #8 regression test (Phase 30).
 *
 * End-to-end proof that a promoted admin has the same capabilities as the
 * original household creator. The test:
 *   1. Logs in as admin A (claude-test@nourishplan.test).
 *   2. Generates an invite with role = Member.
 *   3. Captures the invite URL, signs out, logs in as member B (claude-test-member).
 *   4. B navigates to /join?invite=<token> and auto-joins as a Member.
 *   5. B signs out; A signs back in.
 *   6. A opens the MemberList overflow menu on B row and promotes B to Admin.
 *   7. A signs out; B signs back in.
 *   8. B performs three admin-only actions:
 *        (a) generates an invite
 *        (b) updates households.weekly_budget
 *        (c) promotes / demotes another member (the original admin A)
 *      Each must succeed without a permission error.
 *   9. A signs back in, demotes B back to Member, and REMOVES B from the household
 *      (checker B-6: exercises SPEC Req #3 remove_household_member end-to-end).
 *  10. Cleanup: verify B is NOT in the household on next login (redirected to /setup).
 *
 * Accounts carry deterministic profiles.display_name values seeded by
 * scripts/seed-test-member.ts ("Admin A (claude-test)" and "Member B (claude-test-member)"),
 * so MemberList aria-labels are unambiguous for all selectors below (checker B-4).
 *
 * Run: npx playwright test tests/e2e/household-permissions.spec.ts
 */

// Read credentials from .env.local — do NOT commit them to the spec file.
function readEnv(key: string): string | undefined {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    const line = content.split(/\r?\n/).find(l => l.startsWith(`${key}=`))
    return line?.slice(key.length + 1).trim().replace(/^"|"$/g, '')
  } catch {
    return process.env[key]
  }
}

const ADMIN_A: TestAccount = {
  email: 'claude-test@nourishplan.test',
  password: 'ClaudeTest!2026',
}

const MEMBER_B: TestAccount = {
  email: 'claude-test-member@nourishplan.test',
  password: readEnv('CLAUDE_TEST_MEMBER_PASSWORD') ?? '',
}

// Deterministic display_names seeded by scripts/seed-test-member.ts (checker B-4).
// MemberActionMenu sets aria-label as `Actions for ${displayName}`, so these fragments
// are the source-of-truth for strict per-row selectors.
const ADMIN_A_DISPLAY_FRAGMENT = /claude-test\)/i   // matches "Admin A (claude-test)"
const MEMBER_B_DISPLAY_FRAGMENT = /claude-test-member\)/i  // matches "Member B (claude-test-member)"

// Guard: fail fast if the seed script from Plan 02 Task 3 was not run.
if (!MEMBER_B.password) {
  throw new Error(
    'CLAUDE_TEST_MEMBER_PASSWORD missing from .env.local. Run `npx tsx scripts/seed-test-member.ts` first.'
  )
}

async function clearServiceWorker(page: Page): Promise<void> {
  // lessons.md L-003: avoid stale PWA cache polluting the test.
  await page.goto('/')
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
  })
}

async function generateInvite(page: Page, role: 'Member' | 'Admin'): Promise<string> {
  await page.goto('/household')
  await page.getByRole('heading', { name: /invite link/i }).waitFor({ state: 'visible', timeout: 10_000 })

  // Pick the desired role in the segmented control.
  await page.getByRole('radio', { name: role }).click()

  // Click Generate — checker W-3: use EXACT button names, not a union regex that would
  // match both "Generate Invite Link" (primary) and "Generate a new link" (regeneration).
  // Try the primary button first; if not present (URL already generated), click regenerate.
  const primary = page.getByRole('button', { name: 'Generate Invite Link' })
  const regen = page.getByRole('button', { name: 'Generate a new link' })
  if (await primary.count() > 0) {
    await primary.click()
  } else {
    await regen.click()
  }

  // Wait for the generated URL to appear — transition-unique signal: /join?invite= substring.
  const urlLocator = page.locator('text=/\\/join\\?invite=[a-f0-9]+/i').first()
  await expect(urlLocator).toBeVisible({ timeout: 10_000 })
  const urlText = await urlLocator.innerText()
  const match = urlText.match(/https?:\/\/[^\s]+\/join\?invite=[a-f0-9]+/i)
  expect(match, 'Expected a /join?invite=<token> URL to be rendered').not.toBeNull()
  return match![0]
}

async function joinViaInvite(page: Page, inviteUrl: string): Promise<void> {
  const token = new URL(inviteUrl).searchParams.get('invite')
  expect(token, 'Invite URL must contain a token').not.toBeNull()
  await page.goto(`/join?invite=${token}`)
  await page.waitForURL((url) => !url.pathname.startsWith('/join'), { timeout: 20_000 })
}

/**
 * Open a specific member row overflow menu and click a menu item.
 *
 * Checker B-4: `memberDisplayFragment` is MANDATORY and must be a strict email-fragment regex
 * (e.g. /claude-test\)/i or /claude-test-member\)/i). Loose unions like /you|member/i MUST NOT
 * be used — they match multiple rows.
 */
async function openMemberMenuAndClick(
  page: Page,
  memberDisplayFragment: RegExp,
  menuItemLabel: string,
): Promise<void> {
  await page.goto('/household')
  // aria-label shape from MemberActionMenu (Plan 03): `Actions for ${displayName}`.
  const trigger = page.getByRole('button', {
    name: new RegExp(`actions for.*${memberDisplayFragment.source}`, memberDisplayFragment.flags),
  })
  await expect(trigger, `expected exactly one kebab trigger for ${memberDisplayFragment}`).toHaveCount(1, { timeout: 10_000 })
  await trigger.click()
  const menuItem = page.getByRole('menuitem', { name: menuItemLabel }).first()
  await menuItem.waitFor({ state: 'visible', timeout: 5_000 })
  await menuItem.click()
}

async function confirmDialog(page: Page, confirmLabel: string): Promise<void> {
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible', timeout: 5_000 })
  await dialog.getByRole('button', { name: new RegExp(`^${confirmLabel}$`, 'i') }).click()
  await expect(dialog).toBeHidden({ timeout: 10_000 })
}

test.describe.configure({ mode: 'serial' })

test.describe('Phase 30 — Granular Household Member Permissions (SPEC Req #8)', () => {
  test('promoted admin has full admin capabilities (invite + budget + role-change) + Remove round-trip', async ({ page }) => {
    test.setTimeout(240_000)  // 4 minutes — adds Remove step vs prior 180s

    // ---------- Setup: A logs in and invites B ----------
    await clearServiceWorker(page)
    await login(page, ADMIN_A)
    const inviteUrl = await generateInvite(page, 'Member')

    // ---------- B joins as a Member ----------
    await signOut(page)
    await login(page, MEMBER_B)
    await joinViaInvite(page, inviteUrl)
    await page.goto('/household')
    await expect(page.getByText(/your role:\s*member/i).first()).toBeVisible({ timeout: 10_000 })

    // ---------- A promotes B ----------
    await signOut(page)
    await login(page, ADMIN_A)
    // Checker B-4: strict email-fragment regex matches ONLY B row.
    await openMemberMenuAndClick(page, MEMBER_B_DISPLAY_FRAGMENT, 'Promote to Admin')
    await confirmDialog(page, 'Promote')
    await page.reload()
    await expect(page.locator('text=/^Admin$/').nth(1)).toBeVisible({ timeout: 10_000 })

    // ---------- B logs in as promoted admin ----------
    await signOut(page)
    await login(page, MEMBER_B)
    await page.goto('/household')
    await expect(page.getByText(/your role:\s*admin/i).first()).toBeVisible({ timeout: 10_000 })

    // ---------- Admin-gated action (a): B generates an invite ----------
    const bInviteUrl = await generateInvite(page, 'Member')
    expect(bInviteUrl, 'Promoted admin B must be able to generate an invite URL').toMatch(/\/join\?invite=[a-f0-9]+/i)

    // ---------- Admin-gated action (b): B updates households.weekly_budget ----------
    // Checker W-5: SettingsPage.tsx:299 Weekly Budget label lacks htmlFor, so getByLabel fails.
    // Instead, scope to the budget section: find the label text, walk up to its parent div,
    // and target the <input type="number"> within it.
    await page.goto('/settings')
    const budgetSection = page.locator('label:has-text("Weekly Budget")').locator('..')
    const budgetInput = budgetSection.locator('input[type="number"]').first()
    await budgetInput.waitFor({ state: 'visible', timeout: 10_000 })
    const newBudget = 150 + Math.floor(Math.random() * 50)
    await budgetInput.fill(String(newBudget))
    // Checker W-6: scope the Save button to the same budget section, not the page — there are
    // multiple Save buttons on SettingsPage and getByRole(...).first() matches the wrong one.
    const saveBudgetButton = budgetSection.locator('button', { hasText: 'Save' })
    await saveBudgetButton.click()
    // Transition signal: reload and verify the input still holds the new value (DB write succeeded).
    await page.reload()
    const reloadedBudgetSection = page.locator('label:has-text("Weekly Budget")').locator('..')
    const reloadedBudgetInput = reloadedBudgetSection.locator('input[type="number"]').first()
    await expect(reloadedBudgetInput).toHaveValue(String(newBudget), { timeout: 10_000 })

    // ---------- Admin-gated action (c): B changes another member role ----------
    // Checker B-4: strict email-fragment regex matches ONLY A row.
    await openMemberMenuAndClick(page, ADMIN_A_DISPLAY_FRAGMENT, 'Demote to Member')
    await confirmDialog(page, 'Demote')
    await page.reload()
    await expect(page.locator('text=/^Member$/').first()).toBeVisible({ timeout: 10_000 })

    // Re-promote A so the household ends with >= 2 admins before cleanup.
    await openMemberMenuAndClick(page, ADMIN_A_DISPLAY_FRAGMENT, 'Promote to Admin')
    await confirmDialog(page, 'Promote')
    await page.reload()
    await expect(page.locator('text=/^Admin$/').nth(1)).toBeVisible({ timeout: 10_000 })

    // ---------- Checker B-6: Remove round-trip (exercises SPEC Req #3 end-to-end) ----------
    // Switch back to A, demote B (so there is >= 1 admin after remove), then Remove B.
    await signOut(page)
    await login(page, ADMIN_A)
    await openMemberMenuAndClick(page, MEMBER_B_DISPLAY_FRAGMENT, 'Demote to Member')
    await confirmDialog(page, 'Demote')
    await page.reload()

    // A clicks Remove on B row.
    await openMemberMenuAndClick(page, MEMBER_B_DISPLAY_FRAGMENT, 'Remove from household')
    await confirmDialog(page, 'Remove')
    await page.reload()

    // Verify B kebab is gone from A household view.
    await expect(
      page.getByRole('button', {
        name: new RegExp(`actions for.*${MEMBER_B_DISPLAY_FRAGMENT.source}`, MEMBER_B_DISPLAY_FRAGMENT.flags),
      })
    ).toHaveCount(0, { timeout: 10_000 })

    // ---------- Verify B is redirected to /setup (no household) on re-login ----------
    await signOut(page)
    await login(page, MEMBER_B)
    // After successful login with no household, AuthGuard redirects to /setup.
    await page.waitForURL((url) => url.pathname.startsWith('/setup') || url.pathname === '/', { timeout: 15_000 })
    // Navigating to /household should surface the "no household" state.
    await page.goto('/household')
    await expect(page.getByText(/you are not in a household yet|household setup/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
