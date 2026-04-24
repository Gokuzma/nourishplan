/**
 * Seed a second test user + deterministic display_names for Phase 30 E2E tests.
 *
 * Run: npx tsx scripts/seed-test-member.ts
 *
 * Reads VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * There is no SUPABASE_URL in .env.local — only VITE_SUPABASE_URL — so the
 * admin SDK reads VITE_SUPABASE_URL as the primary URL source.
 *
 * Creates claude-test-member@nourishplan.test with email_confirm=true.
 * Idempotent — exits 0 if the user already exists.
 *
 * UPSERTs profiles.display_name for BOTH test accounts so MemberList
 * aria-labels are deterministic for Playwright selectors.
 *
 * Appends CLAUDE_TEST_MEMBER_PASSWORD=<pw> to .env.local if missing.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, appendFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'

const ENV_PATH = resolve(process.cwd(), '.env.local')
const MEMBER_EMAIL = 'claude-test-member@nourishplan.test'
const ADMIN_EMAIL = 'claude-test@nourishplan.test'
const MEMBER_DISPLAY = 'Member B (claude-test-member)'
const ADMIN_DISPLAY = 'Admin A (claude-test)'

function readEnv(key: string): string | undefined {
  if (!existsSync(ENV_PATH)) return undefined
  const line = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).find(l => l.startsWith(`${key}=`))
  return line?.slice(key.length + 1).trim().replace(/^"|"$/g, '')
}

async function main(): Promise<number> {
  const url = readEnv('VITE_SUPABASE_URL') || readEnv('SUPABASE_URL') || process.env.SUPABASE_URL
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.')
    console.error('Add SUPABASE_SERVICE_ROLE_KEY from https://supabase.com/dashboard/project/<ref>/settings/api-keys (service_role secret).')
    return 1
  }

  const existingPassword = readEnv('CLAUDE_TEST_MEMBER_PASSWORD')
  const password = existingPassword || `ClaudeTestMember!${randomBytes(6).toString('hex')}`

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const create = await admin.auth.admin.createUser({
    email: MEMBER_EMAIL,
    password,
    email_confirm: true,
  })
  if (create.error && !/already.*registered|duplicate/i.test(create.error.message)) {
    console.error('createUser failed:', create.error.message)
    return 1
  }
  const memberUserId = create.data?.user?.id
  if (create.data?.user) {
    console.log(`Created user ${MEMBER_EMAIL} (id=${create.data.user.id})`)
  } else {
    console.log(`User ${MEMBER_EMAIL} already exists — reusing.`)
  }

  async function userIdForEmail(email: string): Promise<string | null> {
    let page = 1
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (error) { console.error('listUsers failed:', error.message); return null }
      const match = data.users.find(u => (u.email ?? '').toLowerCase() === email.toLowerCase())
      if (match) return match.id
      if (data.users.length < 200) return null
      page += 1
    }
  }
  const adminUserId = await userIdForEmail(ADMIN_EMAIL)
  const resolvedMemberId = memberUserId ?? await userIdForEmail(MEMBER_EMAIL)

  const rows: Array<{ id: string; display_name: string }> = []
  if (adminUserId) rows.push({ id: adminUserId, display_name: ADMIN_DISPLAY })
  if (resolvedMemberId) rows.push({ id: resolvedMemberId, display_name: MEMBER_DISPLAY })
  if (rows.length > 0) {
    const { error: upErr } = await admin.from('profiles').upsert(rows, { onConflict: 'id' })
    if (upErr) {
      console.error('profiles upsert failed:', upErr.message)
      return 1
    }
    console.log(`UPSERTed profiles.display_name for ${rows.length} accounts`)
  } else {
    console.error('Could not resolve user ids for profile seeding — aborting.')
    return 1
  }

  if (!existingPassword) {
    appendFileSync(ENV_PATH, `\nCLAUDE_TEST_MEMBER_PASSWORD=${password}\n`)
    console.log('Wrote CLAUDE_TEST_MEMBER_PASSWORD to .env.local')
  } else {
    console.log('CLAUDE_TEST_MEMBER_PASSWORD already present in .env.local — not overwritten.')
  }
  console.log('\nCredentials:')
  console.log(`  email:    ${MEMBER_EMAIL}`)
  console.log(`  password: ${password}`)
  return 0
}

main().then(code => process.exit(code))
