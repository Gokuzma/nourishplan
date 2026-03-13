# Phase 1: Foundation & Auth - Research

**Researched:** 2026-03-12
**Domain:** Vite 7 + React 19 + Supabase Auth + Tailwind CSS 4 + TanStack Query v5 + PWA scaffold
**Confidence:** HIGH (stack decisions already locked; research verifies and fills in implementation detail)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth flow & session handling**
- Single page with Login/Sign Up toggle (no separate pages)
- Email + Google sign-in (Supabase Auth handles both)
- After signup, route straight to household setup (no empty dashboard first)
- Password reset via inline modal on the auth page (no separate page navigation)
- Session persistence across browser sessions via Supabase

**Household onboarding**
- Post-signup screen presents "Create household" or "Join household" fork
- Invites via shareable link only (no email invites)
- Two roles: Admin (creator, can manage members/children's profiles) and Member
- One household per user (no multi-household support)

**Pastel colour scheme & visual identity**
- Sage & warm neutrals palette:
  - Primary: #A8C5A0 (sage green)
  - Secondary: #F5EDE3 (warm cream)
  - Accent: #E8B4A2 (muted peach)
  - Text: #3D3D3D (charcoal)
  - Background: #FAFAF7 (off-white)
- Dark mode from the start (not deferred):
  - Background: #1A1D1A (dark sage-tinted)
  - Surface: #252825 (elevated dark)
  - Primary: #A8C5A0 (sage green, same)
  - Accent: #E8B4A2 (muted peach, same)
  - Text: #E8E5E0 (warm off-white)
- System preference auto-detection for light/dark
- Rounded sans-serif typography (Nunito, Quicksand, or Poppins family)

**App shell & navigation**
- Bottom tab bar on mobile (4 tabs): Home, Plan, Household, Settings
- Phase 1: Home and Household tabs active; Plan tab shows placeholder
- Responsive sidebar on desktop/tablet (bottom tabs become left sidebar at 768px+)
- Home tab in Phase 1: welcome greeting, household member list, quick invite link, "coming soon" placeholders for meal plans

### Claude's Discretion
- Exact font choice within the rounded sans-serif family
- Loading states and skeleton designs
- Error state UI patterns
- Form validation UX details
- Exact breakpoint for sidebar transition
- PWA manifest and icon design
- Empty state illustrations

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create an account with email and password | Supabase `signUp()` with email/password; public.profiles trigger |
| AUTH-02 | User can log in and stay logged in across browser sessions | Supabase default `persistSession: true` uses localStorage; `onAuthStateChange` listener |
| AUTH-03 | User can log out from any page | `supabase.auth.signOut()` callable from any component via AuthContext |
| AUTH-04 | User can reset password via email link | Supabase `resetPasswordForEmail()`; inline modal on auth page |
| HSHD-01 | User can create a household | `households` table; insert on create, assign creator as Admin in `household_members` |
| HSHD-02 | User can invite family members via link | Custom `household_invites` table with token; shareable URL; join on token claim |
| HSHD-03 | User can view all members of their household | RLS-protected query on `household_members` joined with `profiles`; TanStack Query |
| HSHD-04 | Parent role can manage children's profiles and nutrition targets | Admin role in `household_members`; `member_profiles` table for child entries |
| HSHD-05 | Household data is isolated — members cannot see other households' data | Postgres RLS on all tables; policies using `auth.uid()` → `household_members` lookup |
| PLAT-01 | App is mobile-first responsive — optimized for phone use | Tailwind CSS 4 mobile-first breakpoints; bottom tab bar → sidebar at md: |
| PLAT-02 | Minimalist UI with pastel colour scheme | Tailwind CSS 4 `@theme` tokens; dark mode via `@custom-variant dark` + localStorage |
</phase_requirements>

---

## Summary

This phase scaffolds a greenfield Vite 7 + React 19 + TypeScript project and wires up Supabase Auth (email/password + Google OAuth), the Postgres data model for households, Row Level Security policies, a React app shell with bottom navigation, and the Tailwind CSS 4 design token system. No food data, recipes, or meal planning is touched.

The stack is fully confirmed compatible: vite-plugin-pwa v1.2.0 explicitly supports Vite 7 (added in v1.0.1). Tailwind CSS 4 ships its own Vite plugin (`@tailwindcss/vite`) replacing PostCSS, which simplifies setup significantly. TanStack Query v5 works with React 19 and Supabase with no known issues. React 19 is mostly backwards-compatible with React 18 patterns; the main concern for this phase is that `useRef` now requires an explicit initial value and ref cleanup functions must not return non-function values.

The shareable household invite link is not a Supabase Auth feature — it must be built as a custom `household_invites` table (token, household_id, created_by, expires_at, used_at) with application logic to validate and consume the token at join time.

**Primary recommendation:** Scaffold with `npm create vite@latest -- --template react-ts`, install the confirmed-compatible dependency set, implement Supabase Auth via a React Context provider + `onAuthStateChange`, define the full Phase 1 database schema with RLS in a single migration file, and wire the Tailwind 4 CSS token system before building any UI.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | 7.x | Build tool & dev server | Fastest HMR; default browser target is now `baseline-widely-available` |
| react | 19.x | UI framework | Latest stable; new hooks (useActionState, useOptimistic) available |
| react-dom | 19.x | DOM renderer | Paired with React 19 |
| typescript | 5.x | Type safety | Included in `react-ts` Vite template |
| @vitejs/plugin-react | 4.x | React fast refresh | Ships with Vite react-ts template |
| @supabase/supabase-js | 2.x | Supabase client | Auth + database + realtime |
| @tanstack/react-query | 5.x | Server state caching | Official Supabase-recommended React data layer |
| react-router-dom | 6.x | Client-side routing | Stable; v7 adds framework mode overhead not needed here |
| tailwindcss | 4.x | Utility CSS | CSS-first config; 5x faster builds; Vite plugin available |
| @tailwindcss/vite | 4.x | Tailwind Vite integration | Replaces PostCSS; required for Tailwind 4 with Vite |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-pwa | 1.2.0 | PWA manifest + service worker | PLAT-01; confirmed Vite 7 compatible as of v1.0.1 |
| @fontsource-variable/nunito | latest | Self-hosted variable font | Avoids Google Fonts network dependency; single import |
| vitest | 2.x | Unit test runner | Reuses Vite config; no separate pipeline needed |
| @testing-library/react | 16.x | Component testing | Pairs with Vitest for behavior-level tests |
| @testing-library/jest-dom | 6.x | DOM matchers | Extends Vitest with `toBeInTheDocument()` etc. |
| jsdom | 25.x | Test DOM environment | Required for Vitest browser-like testing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-router-dom v6 | react-router v7 (framework mode) | v7 framework mode requires loader/action pattern; overkill for a SPA |
| @fontsource-variable/nunito | Google Fonts CSS link | Fontsource is self-hosted, no external network dependency, no GDPR concern |
| TanStack Query v5 | SWR or Zustand | TQ v5 is the Supabase-recommended pairing; best cache invalidation story |
| Tailwind 4 Vite plugin | PostCSS | PostCSS is the Tailwind 3 approach; v4 plugin is faster and simpler |

**Installation:**
```bash
npm create vite@latest nourishplan -- --template react-ts
cd nourishplan
npm install @supabase/supabase-js @tanstack/react-query react-router-dom
npm install tailwindcss @tailwindcss/vite
npm install @fontsource-variable/nunito
npm install -D vite-plugin-pwa
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── main.tsx               # App entry; QueryClientProvider, RouterProvider
├── App.tsx                # Root route; AuthProvider wraps outlet
├── lib/
│   └── supabase.ts        # createClient singleton
├── contexts/
│   └── AuthContext.tsx    # Session state, onAuthStateChange listener
├── hooks/
│   ├── useAuth.ts         # Consume AuthContext
│   └── useHousehold.ts    # TanStack Query hook for household + members
├── pages/
│   ├── AuthPage.tsx       # Login/signup toggle + password reset modal
│   ├── HouseholdSetup.tsx # Create or join household fork
│   ├── HomePage.tsx       # Welcome, member list, invite link, placeholders
│   └── HouseholdPage.tsx  # Manage members, roles
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx   # Bottom tabs (mobile) / sidebar (desktop) wrapper
│   │   └── TabBar.tsx     # Bottom tab navigation component
│   ├── auth/
│   │   ├── AuthForm.tsx   # Email/password form with toggle
│   │   └── ResetModal.tsx # Inline password reset modal
│   └── household/
│       ├── MemberList.tsx
│       └── InviteLink.tsx
├── styles/
│   └── global.css         # @import "tailwindcss"; @theme tokens; dark variant
└── types/
    └── database.ts        # Generated or hand-written Supabase table types
```

### Pattern 1: Supabase Client Singleton

**What:** Create one client instance and import it everywhere — never instantiate in components.
**When to use:** Always. Multiple instances cause session sync issues.

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Pattern 2: Auth Context Provider

**What:** React context that initializes session from storage, then subscribes to `onAuthStateChange` for live updates.
**When to use:** Wrap the entire router so any component can call `useAuth()`.

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialise from storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### Pattern 3: RLS Policy for Household Isolation

**What:** All household-scoped tables check membership via `auth.uid()` against `household_members`. Users can only read/write rows for their own household.
**When to use:** Every table that holds per-household data.

```sql
-- Source: Supabase RLS docs + household isolation pattern
-- Enable RLS on every table
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.profiles enable row level security;

-- household_members: users see only their own row
create policy "members see own membership"
  on public.household_members for select
  to authenticated
  using ( (select auth.uid()) = user_id );

-- households: users see only their household
create policy "members see own household"
  on public.households for select
  to authenticated
  using (
    id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
  );
```

**Critical:** Wrap `auth.uid()` in `(select auth.uid())` — this is the Supabase-recommended performance pattern to prevent re-evaluation per row.

### Pattern 4: Tailwind CSS 4 Theme Tokens + Dark Mode

**What:** Define all design tokens in CSS using `@theme`. Use `@custom-variant dark` for class-based dark mode with system preference fallback via `localStorage` + `matchMedia`.
**When to use:** Single source of truth for the pastel colour palette in light and dark.

```css
/* src/styles/global.css */
@import "tailwindcss";

/* Switch dark mode from media-query to class-based so we can toggle */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Light mode tokens */
  --color-primary: #A8C5A0;
  --color-secondary: #F5EDE3;
  --color-accent: #E8B4A2;
  --color-text: #3D3D3D;
  --color-background: #FAFAF7;
  --color-surface: #FFFFFF;

  /* Font */
  --font-sans: 'Nunito Variable', sans-serif;

  /* Border radius */
  --radius-card: 1rem;
  --radius-btn: 0.5rem;
}

/* Dark mode overrides applied when .dark class is on <html> */
@layer base {
  .dark {
    --color-text: #E8E5E0;
    --color-background: #1A1D1A;
    --color-surface: #252825;
  }
}
```

```typescript
// src/main.tsx — add before React hydration to avoid FOUC
const stored = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.classList.toggle(
  'dark',
  stored === 'dark' || (!stored && prefersDark)
)
```

### Pattern 5: TanStack Query + Supabase Data Fetching

**What:** Each Supabase query is wrapped in a `useQuery` hook. Mutations use `useMutation` with cache invalidation.
**When to use:** Any component that reads household/member data.

```typescript
// src/hooks/useHousehold.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useHousehold() {
  return useQuery({
    queryKey: ['household'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, role, households(name)')
        .single()
      if (error) throw error
      return data
    },
  })
}
```

### Pattern 6: Shareable Invite Link (Custom Implementation)

**What:** Supabase Auth has no built-in household invite concept. Build a custom `household_invites` table with a random token. Share as `?invite=<token>`. On join, validate token, check expiry, insert membership row, mark token used.
**When to use:** HSHD-02 requirement.

```sql
create table public.household_invites (
  id          uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by  uuid not null references auth.users(id),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.household_invites enable row level security;

-- Only household admins can create invite tokens
create policy "admins can create invites"
  on public.household_invites for insert
  to authenticated
  with check (
    exists (
      select 1 from public.household_members
      where household_id = household_invites.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );
```

### Anti-Patterns to Avoid

- **Multiple Supabase clients:** Instantiating `createClient` in component files causes session desync. Always import the singleton from `lib/supabase.ts`.
- **Direct `auth.users` table reads:** Never query `auth.users` from the client. Use a `public.profiles` table with a trigger instead.
- **Testing RLS in SQL Editor:** The Supabase SQL Editor runs as superuser and bypasses RLS. Always test policies from the JavaScript client or `set role authenticated; set local request.jwt.claims = ...`.
- **Storing sensitive claims in `raw_user_meta_data`:** Users can modify their own `raw_user_meta_data`. Role assignments must live in your own `household_members` table, not in user metadata.
- **Blocking signups with a failing trigger:** If the `handle_new_user` trigger throws, signup fails silently. Always wrap trigger body in an exception handler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence across tabs/refreshes | Custom localStorage session store | Supabase default (`persistSession: true`) | Handles token refresh, tab sync, expiry automatically |
| Auth state subscription | Manual polling or event bus | `supabase.auth.onAuthStateChange` | Official event system; handles all auth events including token refresh |
| Password reset email | Custom email server | Supabase `resetPasswordForEmail()` | Built-in with configurable redirect URL |
| Google OAuth PKCE flow | Custom OAuth implementation | `supabase.auth.signInWithOAuth({ provider: 'google' })` | Supabase handles PKCE, redirect, token exchange |
| Dark mode flash prevention | CSS transitions | Inline script in `<head>` before React loads | Only pre-hydration script prevents FOUC reliably |
| Font hosting | Copying font files manually | `@fontsource-variable/nunito` npm package | Vite handles as asset; no CDN dependency; variable font = one file |
| PWA manifest generation | Hand-written `manifest.json` | `vite-plugin-pwa` | Handles manifest, service worker, and asset precaching |

**Key insight:** Supabase handles the entire auth lifecycle (signup, login, OAuth, password reset, session refresh). The application layer only needs to react to state changes — not manage them.

---

## Common Pitfalls

### Pitfall 1: Tailwind CSS 3 vs 4 Installation Confusion

**What goes wrong:** Developers follow old tutorials, install PostCSS plugin + `tailwind.config.js`, find it doesn't work with Vite 7.
**Why it happens:** Most search results, Stack Overflow answers, and blog posts still describe Tailwind v3 setup.
**How to avoid:** Tailwind CSS 4 uses `@tailwindcss/vite` (not PostCSS). Add `tailwindcss()` to `vite.config.ts` plugins array. CSS entry file uses `@import "tailwindcss"` (one line). No `tailwind.config.js` needed for standard setup.
**Warning signs:** Seeing `npx tailwindcss init`, `content: []` arrays, or PostCSS config files in tutorials — these are v3 patterns.

### Pitfall 2: RLS Enabled but No Policy = All Rows Blocked

**What goes wrong:** Developer enables RLS but forgets to add SELECT/INSERT policies. All queries return empty results with no error.
**Why it happens:** RLS defaults to deny-all when enabled. Missing policies silently block all data.
**How to avoid:** After enabling RLS, immediately write and test all required policies (SELECT, INSERT, UPDATE, DELETE). Verify with client SDK, not SQL Editor.
**Warning signs:** Authenticated queries returning `[]` or `null` when data exists; no Supabase error thrown.

### Pitfall 3: Google OAuth Redirect URI Mismatch

**What goes wrong:** Google OAuth fails in production/staging because redirect URI doesn't match the Google Cloud Console configuration.
**Why it happens:** Supabase uses `https://<project>.supabase.co/auth/v1/callback` as the OAuth callback. Custom domains, localhost ports, and production URLs all need separate entries.
**How to avoid:** Add both `http://localhost:5173` (dev) and production URL to Google Cloud Console Authorized Redirect URIs. Also add them to Supabase Auth > URL Configuration > Redirect URLs.
**Warning signs:** `redirect_uri_mismatch` error from Google OAuth screen.

### Pitfall 4: Invite Token Not Expiring

**What goes wrong:** Old invite links remain valid indefinitely, allowing stale members to join.
**Why it happens:** Token expiry check is only enforced in application code, not at the database level.
**How to avoid:** Add `expires_at > now()` to the SELECT policy on `household_invites`. Also check `used_at is null`. This enforces expiry even if application code is bypassed.

### Pitfall 5: FOUC (Flash of Unstyled/Wrong Theme)

**What goes wrong:** Page renders in light mode briefly before React loads and applies dark mode.
**Why it happens:** React renders after JavaScript parses. Theme detection inside a `useEffect` runs after paint.
**How to avoid:** Add the theme-detection script inline in `index.html` `<head>`, before any CSS or React bundle loads. This runs synchronously before first paint.

### Pitfall 6: React 19 `useRef` Without Initial Value

**What goes wrong:** TypeScript error or runtime warning when `useRef()` is called without an argument.
**Why it happens:** React 19 made the initial argument required (matching `useState` and `createContext` behavior).
**How to avoid:** Always write `useRef<HTMLDivElement>(null)` not `useRef()`.

### Pitfall 7: vite-plugin-pwa Peer Dependency on Older Tailwind

**What goes wrong:** GitHub issue #20284 showed `@tailwindcss/vite` peer dependency constraint `^5.2.0 || ^6` blocking Vite 7 installs.
**Why it happens:** Plugin ecosystem lags behind Vite major releases briefly.
**How to avoid:** Use vite-plugin-pwa v1.2.0+ (Vite 7 explicit support since v1.0.1). Run `npm ls vite` after install to confirm single Vite version in tree.

---

## Code Examples

### Supabase Client + Environment Variables

```typescript
// src/lib/supabase.ts
// Source: https://supabase.com/docs/guides/auth/quickstarts/react
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)
```

```
# .env.local (never commit this file)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Email/Password Sign Up

```typescript
// Source: https://supabase.com/docs/guides/auth/quickstarts/react
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { display_name: name },  // stored in raw_user_meta_data
  },
})
```

### Password Reset

```typescript
// Source: https://supabase.com/docs/reference/javascript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
})
```

### Google OAuth

```typescript
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/`,
  },
})
```

### Profiles Table + Trigger (full migration)

```sql
-- Source: https://supabase.com/docs/guides/auth/managing-user-data
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users see own profile"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- Auto-populate on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name'
  );
  return new;
exception when others then
  -- Never block signup due to trigger failure
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Full Household Schema (Phase 1 migration)

```sql
create table public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create type household_role as enum ('admin', 'member');

create table public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         household_role not null default 'member',
  joined_at    timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.member_profiles (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  managed_by   uuid not null references auth.users(id),
  name         text not null,
  is_child     boolean not null default false,
  birth_year   int,
  created_at   timestamptz not null default now()
);

-- Enable RLS on all tables
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.member_profiles enable row level security;
alter table public.household_invites enable row level security;

-- Household isolation helper: reuse in policies
-- "Is the current user a member of this household?"
-- Inline: exists(select 1 from household_members where household_id = <col> and user_id = (select auth.uid()))

create policy "members read own household"
  on public.households for select to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_id = id
        and user_id = (select auth.uid())
    )
  );

create policy "members read own membership rows"
  on public.household_members for select to authenticated
  using ( user_id = (select auth.uid()) );

create policy "members read all members of own household"
  on public.household_members for select to authenticated
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = (select auth.uid())
    )
  );

create policy "admins insert members"
  on public.household_members for insert to authenticated
  with check (
    exists (
      select 1 from public.household_members
      where household_id = household_members.household_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

create policy "admins manage member_profiles"
  on public.member_profiles for all to authenticated
  using ( managed_by = (select auth.uid()) )
  with check ( managed_by = (select auth.uid()) );
```

### vite-plugin-pwa Basic Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'NourishPlan',
        short_name: 'NourishPlan',
        theme_color: '#A8C5A0',
        background_color: '#FAFAF7',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + PostCSS | `@tailwindcss/vite` plugin + CSS `@theme` | Tailwind v4 (Jan 2025) | No JS config file; faster builds; CSS-first token system |
| `@supabase/auth-helpers-react` | `@supabase/supabase-js` v2 directly | 2024 | auth-helpers deprecated; use supabase-js + onAuthStateChange |
| React 18 `useRef()` no args | React 19 `useRef<T>(null)` required | React 19 (Dec 2024) | TypeScript error if initial value omitted |
| TanStack Query `isLoading` | TanStack Query v5 `isPending` | TQ v5 (Oct 2023) | `isLoading` = `isPending && isFetching`; distinguish initial vs background load |
| Vite + Node 18 | Vite 7 requires Node 20.19+ / 22.12+ | Vite 7 (2025) | Node 18 EOL; upgrade CI/local to Node 20+ |
| `vite-plugin-pwa` v0.x | `vite-plugin-pwa` v1.2.0 | Mid-2025 | v1.x required for Vite 7 peer deps |

**Deprecated/outdated:**
- `@supabase/auth-helpers-react`: Deprecated. Use `@supabase/supabase-js` directly.
- Tailwind v3 PostCSS setup: Do not use with Tailwind 4.
- `create-react-app`: Officially deprecated by React team. Vite is the standard.

---

## Open Questions

1. **Google OAuth credentials setup**
   - What we know: Supabase handles the PKCE flow; credentials come from Google Cloud Console
   - What's unclear: Whether the user has or will create a Google Cloud project and OAuth client
   - Recommendation: The Wave 0 task should include a setup step documenting required Google Cloud Console configuration (Authorized Origins + Redirect URIs). This is a one-time manual step outside code.

2. **Supabase project provisioning**
   - What we know: All code assumes a Supabase project exists with the correct config
   - What's unclear: Whether a Supabase project is already created
   - Recommendation: Wave 0 task creates project, configures `.env.local`, and validates connection before any code lands.

3. **Node.js version in development environment**
   - What we know: Vite 7 requires Node 20.19+ or 22.12+
   - What's unclear: What Node version is installed on this machine
   - Recommendation: Add `.nvmrc` or `engines` field to `package.json` specifying `>=20.19.0` to make constraint explicit.

---

## Validation Architecture

> `nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.config.ts` (or inline in `vite.config.ts`) — Wave 0 gap |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `signUp()` called with valid email/password; no error returned | unit | `npx vitest run tests/auth.test.ts -t "signup"` | Wave 0 |
| AUTH-02 | AuthContext initialises session from `getSession()`; updates on `onAuthStateChange` | unit | `npx vitest run tests/AuthContext.test.tsx` | Wave 0 |
| AUTH-03 | Logout button calls `signOut()`; session set to null in context | unit | `npx vitest run tests/AuthContext.test.tsx -t "logout"` | Wave 0 |
| AUTH-04 | `resetPasswordForEmail()` called when reset form submitted | unit | `npx vitest run tests/auth.test.ts -t "reset"` | Wave 0 |
| HSHD-01 | Household row inserted; creator added as admin in `household_members` | integration (manual-only) | Manual — requires live Supabase | N/A |
| HSHD-02 | Invite token generated; join flow validates token and inserts membership | integration (manual-only) | Manual — requires live Supabase | N/A |
| HSHD-03 | `useHousehold` hook returns member list; RLS prevents cross-household reads | integration (manual-only) | Manual — requires live Supabase | N/A |
| HSHD-04 | Admin can insert `member_profiles`; member cannot | integration (manual-only) | Manual — RLS policy test via Supabase client | N/A |
| HSHD-05 | RLS policy — authenticated user cannot read another household's data | integration (manual-only) | Manual — test with two user sessions | N/A |
| PLAT-01 | Bottom tab renders at mobile viewport; sidebar renders at 768px+ | unit | `npx vitest run tests/AppShell.test.tsx` | Wave 0 |
| PLAT-02 | Dark class applied when system preference is dark; light tokens applied otherwise | unit | `npx vitest run tests/theme.test.ts` | Wave 0 |

**Note on HSHD-05 (data isolation):** RLS correctness cannot be fully automated without a real Supabase instance. The verification step for this requirement is a manual test: log in as user A, log in as user B in a second browser/private window, confirm queries return only own household data. This is the phase gate test for HSHD-05.

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual HSHD-05 isolation check before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — test environment config with jsdom; `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- [ ] `tests/setup.ts` — `@testing-library/jest-dom` import for DOM matchers
- [ ] `tests/auth.test.ts` — covers AUTH-01, AUTH-04 (mocked Supabase client)
- [ ] `tests/AuthContext.test.tsx` — covers AUTH-02, AUTH-03
- [ ] `tests/AppShell.test.tsx` — covers PLAT-01 (viewport-responsive layout)
- [ ] `tests/theme.test.ts` — covers PLAT-02 (dark mode class toggle logic)

---

## Sources

### Primary (HIGH confidence)

- `https://vite.dev/blog/announcing-vite7` — Vite 7 release notes: Node requirements, browser target, removed features
- `https://vite.dev/guide/migration` — Vite 7 migration guide
- `https://supabase.com/docs/guides/auth/quickstarts/react` — Supabase Auth React quickstart: client setup, session management
- `https://supabase.com/docs/guides/auth/managing-user-data` — profiles table + trigger pattern
- `https://supabase.com/docs/guides/database/postgres/row-level-security` — RLS enabling, policy syntax, `auth.uid()` pattern
- `https://supabase.com/docs/guides/auth/social-login/auth-google` — Google OAuth with Supabase
- `https://tailwindcss.com/docs/dark-mode` — Tailwind 4 dark mode: `@custom-variant`, class toggle, FOUC prevention
- `https://tailwindcss.com/blog/tailwindcss-v4` — Tailwind v4 `@theme` directive, `@tailwindcss/vite` plugin
- `https://github.com/vite-pwa/vite-plugin-pwa/releases` — vite-plugin-pwa v1.2.0 release; v1.0.1 confirmed Vite 7 support
- `https://react.dev/blog/2024/12/05/react-19` — React 19 breaking changes: `useRef` initial value, ref cleanup

### Secondary (MEDIUM confidence)

- `https://fontsource.org/docs/getting-started/install` — Fontsource self-hosted font install pattern
- `https://makerkit.dev/blog/saas/supabase-react-query` — TanStack Query v5 + Supabase integration pattern
- `https://github.com/orgs/supabase/discussions/6055` — Supabase invite link discussion; confirms custom table approach is required

### Tertiary (LOW confidence — flag for validation)

- GitHub issue #20284 (vitejs/vite) re: `@tailwindcss/vite` peer dependency constraint — resolved in current versions but worth checking during install

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against official releases and changelogs
- Architecture: HIGH — patterns drawn directly from official Supabase and Tailwind docs
- Pitfalls: HIGH — drawn from official docs + confirmed GitHub issues
- Shareable invite pattern: MEDIUM — custom implementation confirmed necessary; specific SQL is hand-written from pattern analysis

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (90 days — stable libraries; Supabase API changes rarely; Tailwind 4 is post-stable)
