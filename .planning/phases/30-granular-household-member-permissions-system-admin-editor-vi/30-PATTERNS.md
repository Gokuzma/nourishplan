# Phase 30: Granular Household Member Permissions — Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 16 (7 new, 9 modified)
**Analogs found:** 12 / 14 (2 first-of-kind for Playwright infra)

## File Classification

### New files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `supabase/migrations/031_household_permissions.sql` | migration (combined: column + trigger + 3 RPCs + RLS) | schema + event-driven | `supabase/migrations/005_fix_invite_join_rls.sql` + `013_fix_profile_trigger_security.sql` + `001_foundation.sql` | exact (composite) |
| `src/hooks/useChangeMemberRole.ts` (may co-locate in `useHousehold.ts`) | mutation hook | request-response / CRUD | `useCreateInvite` in `src/hooks/useHousehold.ts` lines 156–178 | exact |
| `src/hooks/useRemoveHouseholdMember.ts` (may co-locate) | mutation hook | request-response / CRUD | `useDeleteMemberProfile` in `src/hooks/useHousehold.ts` lines 267–279 | exact |
| `src/hooks/useLeaveHousehold.ts` (may co-locate) | mutation hook | request-response / RPC-call | `useJoinHousehold` RPC branch in `src/hooks/useHousehold.ts` lines 139–142 | role-match (RPC pattern) |
| `src/components/household/ConfirmDialog.tsx` (optional) | component | event-driven modal | `src/components/recipe/ImportRecipeModal.tsx` lines 34–65 | role-match |
| `src/components/household/MemberActionMenu.tsx` (optional; overflow menu popover) | component | event-driven | **No analog** — first-of-kind | none |
| `playwright.config.ts` | config | — | **No analog** — first Playwright infra in repo | none (use Playwright official scaffold) |
| `tests/e2e/household-permissions.spec.ts` | test (E2E) | request-response | **No analog** — first Playwright test in repo | none (community pattern) |
| `scripts/seed-test-member.ts` | script | batch seed via Supabase admin SDK | `scripts/deploy-edge-functions.sh` (structure/shebang/pre-flight) + `scripts/seed-test-nutrition-targets.sql` | role-match |

### Modified files

| Modified File | Role | Data Flow | Closest Analog (internal sibling) |
|---------------|------|-----------|------------------------------------|
| `src/components/household/MemberList.tsx` | component | request-response | itself — existing `RoleBadge` (lines 5–18) reused; overflow-menu insertion is new |
| `src/components/household/InviteLink.tsx` | component | event-driven | itself — existing `handleGenerate` (lines 9–17) + `RoleBadge` from `MemberList.tsx` |
| `src/components/household/JoinHousehold.tsx` | component | event-driven | itself — add role display after reading `invite.role` |
| `src/pages/HouseholdPage.tsx` | page | request-response | itself — existing admin-gated section pattern (lines 51–67) |
| `src/hooks/useHousehold.ts` | hook module | request-response / CRUD | `useCreateInvite` (lines 156–178), `useJoinHousehold` (lines 108–150), `useCreateHousehold` (lines 71–100) |
| `src/types/database.ts` | type module | — | existing `HouseholdInvite` interface (lines 24–32) + `household_invites` table in `Database` type (lines 383–392) |
| `src/lib/queryKeys.ts` | config | — | no change needed — `['household']` prefix at lines 5–11 already covers members / memberProfiles |

---

## Pattern Assignments

### `supabase/migrations/031_household_permissions.sql` (composite migration)

Single file combining (1) `household_invites.role` column, (2) last-admin trigger, (3) three RPCs, (4) new RLS policies. Matches the `020_budget_engine.sql` / `021_inventory.sql` single-file precedent.

#### (A) Column addition pattern — analog `supabase/migrations/020_budget_engine.sql:1-3`

```sql
-- Add weekly_budget to households
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS weekly_budget numeric;
```

Apply to `household_invites.role` (default `'member'`, not null):

```sql
ALTER TABLE public.household_invites
  ADD COLUMN IF NOT EXISTS role public.household_role NOT NULL DEFAULT 'member';
```

#### (B) Security-definer RPC pattern — analog `supabase/migrations/013_fix_profile_trigger_security.sql:47-61`

```sql
CREATE OR REPLACE FUNCTION public.mark_invite_used(invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  update public.household_invites
  set used_at = now()
  where id = invite_id
    and used_at is null;
end;
$$;

GRANT EXECUTE ON FUNCTION public.mark_invite_used(uuid) TO authenticated;
```

**Apply to all three RPCs** (`change_member_role`, `remove_household_member`, `leave_household`). Per SPEC Constraint §3 + CONTEXT canonical_refs note, **new RPCs use the stricter `SET search_path = ''`** (not `= public`) and must fully qualify every identifier (`public.household_members`, `auth.uid()`).

#### (C) Security-definer helper bypassing RLS — analog `supabase/migrations/002_fix_household_members_rls.sql:9-33` + `005_fix_invite_join_rls.sql:10-24`

```sql
create or replace function public.get_user_household_role()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select role::text
  from public.household_members
  where user_id = (select auth.uid())
  limit 1;
$$;
```

Useful pattern for the last-admin count check inside each RPC (avoids self-referential RLS recursion when reading `household_members`).

#### (D) Last-admin trigger pattern — analog `supabase/migrations/029_prep_optimisation.sql:88-92` (trigger mechanics) + plpgsql `raise exception` in `013_fix_profile_trigger_security.sql:14-28` (function body shape)

Existing triggers are all `set_updated_at` flavor. There is **no existing `RAISE EXCEPTION` trigger** in the repo — this is the first row-level guard trigger. Shape to use:

```sql
create or replace function public.enforce_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_count int;
  target_household uuid;
begin
  -- Before UPDATE demoting an admin, or before DELETE of an admin row
  if (tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin') then
    target_household := old.household_id;
  elsif (tg_op = 'DELETE' and old.role = 'admin') then
    target_household := old.household_id;
  else
    return coalesce(new, old);
  end if;

  select count(*) into admin_count
  from public.household_members
  where household_id = target_household
    and role = 'admin'
    and id <> old.id;

  if admin_count = 0 then
    raise exception 'At least one admin required' using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists enforce_last_admin_trg on public.household_members;
create trigger enforce_last_admin_trg
  before update or delete on public.household_members
  for each row execute function public.enforce_last_admin();
```

**SPEC Req #2 requires the exact error string `"At least one admin required"`** — must appear verbatim in `raise exception`.

#### (E) RLS policy templates — analog `supabase/migrations/001_foundation.sql:129-140` (admin-gated INSERT) + `012_fix_invite_update_rls.sql:6-18` (members-scoped UPDATE)

Template (admin UPDATE of `household_members.role`):

```sql
create policy "admins update member roles"
  on public.household_members for update
  to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = (select auth.uid())
        and hm.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = (select auth.uid())
        and hm.role = 'admin'
    )
  );
```

**Self-DELETE policy** (for `leave_household` — any member deletes their own row):

```sql
create policy "members delete self"
  on public.household_members for delete
  to authenticated
  using ( user_id = (select auth.uid()) );
```

**Admin DELETE policy** (for `remove_household_member`):

```sql
create policy "admins delete members"
  on public.household_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = (select auth.uid())
        and hm.role = 'admin'
    )
  );
```

**Admin sets role on invite insert** — existing `admins create invites` policy (`001_foundation.sql:159-169`) only gates `with check` on admin role; the new `role` column is free to set as long as the caller is admin. No new policy needed unless the default `with check` is stricter.

---

### `src/hooks/useHousehold.ts` — three new mutation hooks + extend `useCreateInvite` + fix `useJoinHousehold`

**Analog:** the same file's existing mutations. Three new hooks may co-locate here (same file) to match the existing structure — all household mutations already live in `useHousehold.ts`.

#### (A) Mutation hook skeleton — analog `src/hooks/useHousehold.ts:71-100` (`useCreateHousehold`)

Imports at top of file (lines 1–5) already cover everything the new hooks need:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { queryKeys } from '../lib/queryKeys'
import type { Household, HouseholdMember, HouseholdInvite, MemberProfile, Profile } from '../types/database'
```

Standard mutation shape to clone (`src/hooks/useHousehold.ts:71-100`):

```typescript
export function useCreateHousehold() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (name: string): Promise<Household> => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      // …work…
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}
```

#### (B) RPC invocation pattern — analog `src/hooks/useHousehold.ts:139-142` (`useJoinHousehold`)

```typescript
const { error: updateError } = await supabase
  .rpc('mark_invite_used' as never, { invite_id: invite.id } as never)

if (updateError) throw updateError
```

**Apply verbatim** to each new hook — `as never` cast is the repo convention until generated types are regenerated (CONTEXT.md "Reusable Assets"). Error-string extraction for the last-admin case follows the same `updateError.message` path — the trigger's `raise exception` message propagates through `PostgrestError.message`.

#### (C) `useChangeMemberRole` — combining (A) + (B)

```typescript
export function useChangeMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { member_row_id: string; new_role: 'admin' | 'member' }) => {
      const { error } = await supabase
        .rpc('change_member_role' as never, {
          member_row_id: params.member_row_id,
          new_role: params.new_role,
        } as never)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}
```

`useRemoveHouseholdMember(member_row_id)` and `useLeaveHousehold()` follow the identical shape — single RPC call, prefix invalidation.

#### (D) Extend `useCreateInvite` with optional `role` — analog `src/hooks/useHousehold.ts:156-178`

Current (lines 159–178):

```typescript
return useMutation({
  mutationFn: async (): Promise<HouseholdInvite> => {
    // …
    const { data, error } = await supabase
      .from('household_invites')
      .insert({ household_id: householdId, created_by: userId })
      .select()
      .single()
    if (error) throw error
    return data
  },
})
```

Extend signature to `async (role?: 'admin' | 'member'): Promise<HouseholdInvite>` and insert `{ household_id, created_by: userId, role: role ?? 'member' }`. Per SPEC Constraint §6 the parameter MUST be optional and default to `'member'` (no breaking change).

#### (E) Fix `useJoinHousehold` line 130 — analog itself

Current (line 128–130):

```typescript
const { error: memberError } = await supabase
  .from('household_members')
  .insert({ household_id: invite.household_id, user_id: userId, role: 'member' })
```

Change the literal `role: 'member'` to `role: invite.role ?? 'member'`. Default covers legacy rows that pre-date the new column (SPEC Constraint §6).

#### (F) Admin-count derivation — analog `src/hooks/useHousehold.ts:45-64` (`useHouseholdMembers`)

Already returns the full member list. **No new hook needed** (D-06). UI computes inline:

```typescript
const { data: members } = useHouseholdMembers()
const adminCount = members?.filter(m => m.role === 'admin').length ?? 0
```

#### (G) Cache-invalidation prefix — analog `src/lib/queryKeys.ts:5-11`

```typescript
household: {
  root: (userId) => ['household', userId] as const,
  members: (userId, householdId) => ['household', userId, 'members', householdId] as const,
  memberProfiles: (userId, householdId) => ['household', userId, 'member_profiles', householdId] as const,
},
```

All three keys start with `['household']`, so `invalidateQueries({ queryKey: ['household'] })` (as in `useCreateHousehold:97` / `useJoinHousehold:147`) hits all of them. **Apply identically to all three new mutation hooks** per D-03.

---

### `src/components/household/MemberList.tsx` (component, request-response) — MODIFY

**Analog:** itself. Extend existing list-item JSX.

#### (A) Reusable `RoleBadge` (lines 5–18) — reused verbatim

```tsx
function RoleBadge({ role }: { role: 'admin' | 'member' }) {
  const isAdmin = role === 'admin'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        isAdmin
          ? 'bg-primary/20 text-primary'
          : 'bg-secondary text-text/60'
      }`}
    >
      {isAdmin ? 'Admin' : 'Member'}
    </span>
  )
}
```

Extract to a shared location (or export from this file) so `InviteLink.tsx` can import it for D-13.

#### (B) Current-user detection — analog `src/components/household/MemberList.tsx:21, 44`

```tsx
const { session } = useAuth()
// …
const isCurrentUser = member.user_id === session?.user.id
```

Drives the menu-item set: non-self gets Promote/Demote/Remove; self gets Leave (+ Demote if admin and not last admin).

#### (C) Member row layout — analog `src/components/household/MemberList.tsx:50-80`

Append the overflow menu (⋮) trigger button inside the existing `<div className="flex items-center gap-2">` at line 70, next to the `RoleBadge`. Existing Set Targets link layout already uses that flex container — extend the same pattern.

#### (D) Admin-count gating (D-04, D-05) — driven by inline filter per (F) above

Disabled-state tooltip copy (locked in D-05): **"Promote another member to admin first."**

---

### `src/components/household/InviteLink.tsx` (component, event-driven) — MODIFY

**Analog:** itself + `MemberList.tsx` `RoleBadge`.

#### (A) Segmented control state — inspired by but NO direct analog; use basic `useState` toggle

Current state at line 6:

```tsx
const [inviteUrl, setInviteUrl] = useState<string | null>(null)
```

Add:

```tsx
const [role, setRole] = useState<'admin' | 'member'>('member')
```

#### (B) `handleGenerate` pass-through — analog `src/components/household/InviteLink.tsx:9-17`

Current:

```tsx
function handleGenerate() {
  createInvite.mutate(undefined, {
    onSuccess: (invite) => {
      const url = `${window.location.origin}/join?invite=${invite.token}`
      setInviteUrl(url)
      setCopied(false)
    },
  })
}
```

Change first arg from `undefined` to `role` (after extending `useCreateInvite` per Pattern D above).

#### (C) Role-toggle clears generated URL (D-14)

```tsx
function handleRoleChange(next: 'admin' | 'member') {
  setRole(next)
  setInviteUrl(null)   // clears stale URL — forces Generate again
  setCopied(false)
}
```

#### (D) Role badge next to URL (D-13) — reuse `RoleBadge` from `MemberList.tsx`

Insert inside the generated-link row at `src/components/household/InviteLink.tsx:52-65`:

```tsx
<div className="flex items-center gap-2 rounded-card border border-accent/40 bg-secondary/50 px-3 py-2">
  <p className="flex-1 break-all text-sm text-text">{inviteUrl}</p>
  <RoleBadge role={role} />
  <button type="button" onClick={handleCopy} …>
```

#### (E) Pastel palette for segmented control (SPEC specifics §3)

Selected segment uses `bg-primary/20 text-primary` (admin-badge colors) — unselected uses `bg-secondary text-text/60` (member-badge colors). Matches `RoleBadge` exactly.

---

### `src/components/household/JoinHousehold.tsx` (component, event-driven) — MODIFY (D-15)

**Analog:** itself. Add role display BEFORE the auto-join fires — requires a pre-fetch of the invite row to read `invite.role`. Two options for planner:

1. Extend `useJoinHousehold` to expose an `inviteLookup` query (new `useInvitePreview(token)`), OR
2. Inline a small read inside the auto-join effect (cheap — one row).

#### Render target — analog `src/components/household/JoinHousehold.tsx:58-66`

```tsx
if (initialToken && (joinHousehold.isPending || !joinHousehold.isError)) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-sm text-text/70">Joining household…</p>
    </div>
  )
}
```

Extend to `"Join {household_name} as an Admin"` / `"…as a Member"` before the auto-join resolves.

---

### `src/pages/HouseholdPage.tsx` (page, request-response) — MODIFY

**Analog:** itself. Existing admin-gated section pattern (`src/pages/HouseholdPage.tsx:51-56`):

```tsx
{isAdmin && (
  <section className="rounded-card border border-accent/40 bg-surface p-5 shadow-sm">
    <h2 className="mb-3 text-lg font-bold text-primary">Invite Link</h2>
    <InviteLink />
  </section>
)}
```

**No new sections expected** — the overflow-menu UI lives inside the existing Members section (line 45–48), and the segmented control lives inside the existing Invite Link section (line 51–56). Per CONTEXT.md "Integration Points" this is a near-zero-surface-area change on the page itself.

---

### `src/types/database.ts` — MODIFY

**Analog:** existing `HouseholdInvite` interface (lines 24–32) + matching `Database['public']['Tables']['household_invites']` entry (lines 383–392).

```typescript
export interface HouseholdInvite {
  id: string
  household_id: string
  token: string
  created_by: string
  expires_at: string
  used_at: string | null
  created_at: string
}
```

Add `role: 'admin' | 'member'` field (non-optional — default covers existing rows at the DB layer). Update the `Insert` helper (lines 385–390) to include `role?: 'admin' | 'member'` (optional — default `'member'`).

---

### `src/components/household/ConfirmDialog.tsx` (optional new component)

**Analog:** `src/components/recipe/ImportRecipeModal.tsx:49-65` (modal shell + backdrop + ESC handler).

```tsx
return (
  <>
    <div
      className="fixed inset-0 bg-black/40 z-50"
      onClick={isPending ? undefined : onClose}
      aria-hidden="true"
    />
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="bg-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="…"
      >
        {/* heading + body + confirm/cancel buttons */}
      </div>
    </div>
  </>
)
```

ESC-to-close pattern (`src/components/recipe/ImportRecipeModal.tsx:25-32`):

```tsx
useEffect(() => {
  if (!isOpen) return
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !isPending) onClose()
  }
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [isOpen, isPending, onClose])
```

**Alternative (explicitly permitted by D-02 discretion + the only existing precedent):** `window.confirm('Remove this member from the household?')` — see `src/components/log/LogEntryItem.tsx:23` and `src/components/targets/NutritionTargetsForm.tsx:134`. Planner's choice per CONTEXT.md "Claude's Discretion" bullet 3.

---

### `src/components/household/MemberActionMenu.tsx` (optional new component — overflow menu)

**No in-repo analog** — there is no existing kebab-menu, popover, or dropdown primitive. Planner's call per CONTEXT.md "Claude's Discretion" bullet 4:
- Build minimal custom popover (use `useRef` + outside-click detector + Escape handler like `ImportRecipeModal`), OR
- Add headless primitive (Radix / Headless UI), OR
- CSS-only `<details>` / `<summary>` disclosure.

Accessibility requirements (MUST have): `aria-haspopup="menu"`, `aria-expanded`, keyboard arrow-nav, Escape-to-close. Mobile tap-to-reveal for disabled tooltips (CONTEXT.md D-04 Claude's Discretion).

---

### `scripts/seed-test-member.ts` — new seed script

**Analog:** `scripts/deploy-edge-functions.sh` (shebang + pre-flight checks + error handling structure). For the actual SDK call, this is the first admin-SDK Node seed script in the repo — follow standard `@supabase/supabase-js` admin-client pattern:

```typescript
import { createClient } from '@supabase/supabase-js'
// Read SUPABASE_SERVICE_ROLE_KEY from .env.local (see L-017 for token-loading pattern)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const { data, error } = await admin.auth.admin.createUser({
  email: 'claude-test-member@nourishplan.test',
  password: '…',
  email_confirm: true,
})
```

After seeding, append credentials to `C:\Users\Gokuz\.claude\projects\C--Claude-nourishplan\memory\reference_test_account.md` (per D-09).

---

### `playwright.config.ts` + `tests/e2e/household-permissions.spec.ts` — first-of-kind

**No in-repo analog.** This is the first Playwright infra in the repo (D-11). Planner scaffolds from the official Playwright `npm init playwright@latest` output. Key constraints from CONTEXT.md + lessons.md:

- **Test account:** `claude-test@nourishplan.test` / `ClaudeTest!2026` (admin A) + `claude-test-member@nourishplan.test` (member B, seeded by the new script).
- **L-011:** Never search planning docs for credentials — import the constants from a single source.
- **L-026:** Never wait on generic text like "Generated" / "Saved" / "Done" — use transition-unique signals.
- **L-028:** For transient UI, use `page.evaluate` click-then-poll instead of `click` + `waitForSelector`.
- **L-003:** If the spec runs against the deployed site, clear service-worker cache in a `beforeAll`.
- **L-001:** If this test file ends up globbed by Vitest, keep it under `tests/e2e/` and exclude from the Vitest `include` pattern (planner verifies `vitest.config.ts` or `vite.config.ts`).

**Vitest exclusion note:** `tests/` is currently Vitest-only. The planner MUST either (a) update `vite.config.ts` test config to exclude `tests/e2e/**`, or (b) rename the file to a non-matching extension. This is the main integration risk.

---

## Shared Patterns

### Authentication / admin gating (applies to all new UI + hooks)

**Source:** `src/hooks/useHousehold.ts:20-39` (`useHousehold` membership query) + `src/pages/HouseholdPage.tsx:30` (`isAdmin` derivation).

```typescript
const { data: membership } = useHousehold()
const isAdmin = membership?.role === 'admin'
```

Same check drives every new UI element's visibility.

### Error handling (applies to all new mutation hooks)

**Source:** `src/hooks/useHousehold.ts:117-137` (`useJoinHousehold` — shows the both-error-channels pattern).

```typescript
const { error } = await supabase.rpc('…' as never, { … } as never)
if (error) throw error
```

**Surfacing in UI:** match `src/components/household/InviteLink.tsx:42-48`:

```tsx
{mutation.error && (
  <p className="text-sm text-red-500">
    {mutation.error instanceof Error ? mutation.error.message : 'Operation failed.'}
  </p>
)}
```

The DB trigger's `raise exception 'At least one admin required'` surfaces as `mutation.error.message === 'At least one admin required'` through PostgREST's default plpgsql error mapping.

### Cache invalidation (applies to all three new mutation hooks)

**Source:** `src/hooks/useHousehold.ts:96-98` + `src/hooks/useHousehold.ts:146-148`:

```typescript
onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ['household'] })
},
```

`['household']` prefix catches `household.root`, `household.members`, `household.memberProfiles` (per `src/lib/queryKeys.ts:5-11`). Silent refetch per D-03.

### Security-definer RPC convention (applies to all three new RPCs)

**Source:** `supabase/migrations/013_fix_profile_trigger_security.sql:47-61` — template (uses `SET search_path = public`) + SPEC Constraint §3 requiring new RPCs to use the stricter `SET search_path = ''` and fully qualify identifiers.

Checklist per RPC:
- `SECURITY DEFINER`
- `SET search_path = ''`
- Fully qualify every table (`public.household_members`, `auth.uid()`)
- `GRANT EXECUTE ON FUNCTION public.<name>(args) TO authenticated;`
- Internal admin/membership check before mutating

### Error-string contract (applies to trigger + all three RPCs)

**Source:** SPEC Req #2 + CONTEXT.md specifics §2 — **exact string `"At least one admin required"`** must surface from any path that would zero the admin count. Both the trigger body AND each RPC's pre-flight check must raise this exact string so the UI's `mutation.error.message` equality check is reliable.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `playwright.config.ts` | config | — | First Playwright infra in repo — use `npm init playwright@latest` output as the reference |
| `tests/e2e/household-permissions.spec.ts` | E2E test | request-response | First Playwright test in repo — use Playwright official docs' Supabase example + apply L-011 / L-026 / L-028 from `lessons.md` |
| `src/components/household/MemberActionMenu.tsx` | popover | event-driven | No popover / dropdown primitive exists in the codebase — planner's choice per CONTEXT.md Claude's Discretion |

---

## Metadata

**Analog search scope:**
- `supabase/migrations/*.sql` (30 files)
- `src/hooks/*.ts` (39 files)
- `src/components/household/*.tsx` (5 files)
- `src/components/**/*Modal.tsx` (sample 5 for modal shell analogs)
- `src/pages/HouseholdPage.tsx`
- `src/types/database.ts`
- `src/lib/queryKeys.ts`
- `scripts/` (2 files)
- `tests/*.{ts,tsx}` (35 files)

**Files scanned:** ~75 (selective Reads on identified analogs)

**Pattern extraction date:** 2026-04-23

**Key insights for planner:**
- All three new hooks can clone `useCreateHousehold` (mutation + `invalidateQueries({ queryKey: ['household'] })`) verbatim — swap the body for a single `supabase.rpc('…' as never, { … } as never)` call.
- The migration file is composite — four distinct sections (column, trigger, 3 RPCs, RLS policies) in one file matches existing `020_budget_engine.sql` / `021_inventory.sql` precedent.
- `RoleBadge` in `MemberList.tsx:5-18` is reused three times (member row, invite-link badge, and possibly the join-page role display) — extract it or export it from `MemberList.tsx`.
- The trigger is the first `RAISE EXCEPTION` trigger in the repo — all prior triggers are `set_updated_at` flavor. Plpgsql error shape follows `013_fix_profile_trigger_security.sql` function body conventions.
- Playwright is the largest net-new infrastructure risk — ensure Vitest `include` doesn't pick up `tests/e2e/**` (per L-001 discovery issue).
