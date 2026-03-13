# Stack Research

**Domain:** Mobile-first family meal planning / nutrition tracking PWA
**Researched:** 2026-03-12
**Confidence:** HIGH (core stack verified via official releases and multiple authoritative sources)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.x | UI framework | Industry standard for SPAs; v19 Compiler auto-memoizes, removing need for manual `useMemo`/`useCallback`. PWA patterns are well-documented. |
| Vite | 7.x | Build tool + dev server | Current major release. Fastest HMR available; `vite-plugin-pwa` integrates directly. Replaces CRA (unmaintained). |
| TypeScript | 5.x | Type safety | De facto standard. Zod + React Hook Form integration depends on TypeScript inference; catches data-shape bugs early in the food hierarchy model. |
| Tailwind CSS | 4.x | Utility CSS | Released Jan 2025. 5x faster full builds, CSS-first config (no `tailwind.config.js`), built-in container queries for responsive PWA layouts. |
| Supabase | latest JS SDK | Backend-as-a-service | Postgres gives you relational data modeling for the Foods → Recipes → Meals → Meal Plans hierarchy. Auth, real-time, and storage included. Free tier: 500 MB DB, 50k MAUs, 2 projects. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-pwa | 1.2.0 | Service worker, manifest, offline support | Add immediately — configures Workbox caching strategies and the web app manifest for "install to home screen" |
| @tanstack/react-query | 5.90.x | Server state / async caching | All USDA API calls and Supabase data fetching; handles stale-while-revalidate, background refetch, and offline queue automatically |
| zustand | 5.0.x | Client/UI state | Per-session state that does not belong in the server: active meal plan selection, portion override drafts, UI preferences. Minimal boilerplate. |
| react-hook-form | 7.x | Form handling | Recipe builder, food entry, nutrition target forms. Uncontrolled components = no re-render on every keystroke; critical for large nested recipe forms. |
| zod | 3.x | Schema validation + TypeScript inference | Shared validation schema for form inputs and API response parsing. One schema validates both client form and server shape. |
| @supabase/supabase-js | 2.x | Supabase client | Auth, database queries, real-time subscriptions to household meal plan changes |
| react-router-dom | 6.x | Client-side routing | Established SPA router; sufficient for this app's navigation depth. TanStack Router is an alternative if type-safe URL params become a priority. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | Faster installs, strict dependency resolution; preferred over npm/yarn for monorepo-adjacent projects |
| ESLint + eslint-config-react-app | Linting | Catches React hook ordering bugs and accessibility issues early |
| Prettier | Code formatting | Consistent output across editors; configure via `.prettierrc` |
| Lighthouse (CI) | PWA audit | Validates service worker, manifest, offline behavior, and Core Web Vitals before deploy |

## Installation

```bash
# Scaffold with Vite
pnpm create vite nourishplan --template react-ts
cd nourishplan

# Core
pnpm add @supabase/supabase-js @tanstack/react-query zustand react-router-dom react-hook-form zod @hookform/resolvers

# Dev dependencies
pnpm add -D vite-plugin-pwa tailwindcss @tailwindcss/vite typescript eslint prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Supabase | Firebase | When you need Firestore's real-time document sync as the primary data model, or when the team has existing Firebase expertise. Firebase's NoSQL makes the relational food hierarchy awkward. |
| Supabase | Custom Express/Node API | When you need business logic not expressible in Postgres RLS, or when you require a self-hosted backend with full control. Adds significant infra overhead for a v1. |
| React Router v6 | TanStack Router | When URL search params carry complex structured state (e.g., multi-step filter state) and full TypeScript type safety on every param is required. TanStack Router is ~2x the bundle size. |
| Zustand | Redux Toolkit | When you have a large team needing enforced architecture, time-travel debugging, or complex async middleware (sagas). Overkill for a family app with limited client state. |
| Tailwind CSS v4 | CSS Modules | When the team strongly prefers scoped CSS over utility classes. No DX or performance reason to choose CSS Modules over Tailwind v4 in 2025. |
| TanStack Query v5 | SWR | Both are valid. TanStack Query has richer mutation/optimistic update APIs; critical for the portion logging UX. SWR is simpler but less capable here. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Create React App (CRA) | Unmaintained since 2023. No active releases, outdated Webpack config, no Vite integration. | Vite 7 + `vite-plugin-pwa` |
| Next.js | SSR adds complexity with no benefit for a household app behind auth. Service worker conflicts with Next's caching model require extra configuration. | Vite SPA |
| MUI / Material UI | Opinionated design system fights a custom pastel minimalist UI; heavy bundle. | shadcn/ui components (copy-paste, built on Radix) + Tailwind CSS v4 |
| Prisma (client-side) | Prisma runs server-side only. Attempting to use it in a browser-only SPA is not possible. | Supabase JS client with typed Postgres queries |
| localStorage for nutrition data | No cross-device sync, no household sharing, 5 MB limit breaks with full food history. | Supabase Postgres |
| Moment.js | Deprecated, 67 KB. | `date-fns` (modular, tree-shakeable) or native Intl API |

## Stack Patterns by Variant

**If the app grows to need a grocery list or barcode scanning (v2):**
- Add `@zxing/browser` for barcode scanning from the device camera (Web standard, no native bridge needed)
- Add a Supabase Edge Function to proxy USDA lookups server-side (hides API key, adds caching layer)

**If household real-time sync becomes a hard requirement (e.g., live collaborative meal editing):**
- Use Supabase Realtime subscriptions on the `meal_plans` table
- Combine with TanStack Query's `invalidateQueries` on subscription events — no separate WebSocket library needed

**If Supabase free tier is outgrown:**
- Supabase Pro ($25/month) adds 8 GB DB, daily backups, and no project pause
- Data is plain Postgres — migration to self-hosted or managed Postgres (Neon, Railway) is straightforward

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| vite-plugin-pwa@1.2.0 | Vite 5.x or 6.x | Vite 7 compatibility not yet confirmed in latest release notes; test on upgrade |
| @tanstack/react-query@5.x | React 18+ | Requires `useSyncExternalStore` — available in React 18 and 19 |
| zustand@5.x | React 18+ | Dropped React < 18; uses native `useSyncExternalStore` |
| Tailwind CSS v4 | Any Vite project | Uses `@tailwindcss/vite` plugin; CSS-first config replaces `tailwind.config.js` |
| react-hook-form@7.x | React 16.8+ | Compatible with React 19; no breaking changes in recent major |

## Sources

- Vite 7 release — https://vite.dev/blog/announcing-vite7
- vite-plugin-pwa npm (v1.2.0) — https://www.npmjs.com/package/vite-plugin-pwa
- React 19.2 blog — https://react.dev/blog/2025/10/01/react-19-2
- Tailwind CSS v4.0 — https://tailwindcss.com/blog/tailwindcss-v4
- TanStack Query v5 npm (5.90.21) — https://www.npmjs.com/package/@tanstack/react-query
- Zustand v5 (5.0.11) — https://github.com/pmndrs/zustand/releases
- Supabase pricing / free tier — https://supabase.com/pricing
- USDA FoodData Central API guide — https://fdc.nal.usda.gov/api-guide/
- shadcn/ui — https://ui.shadcn.com/
- React Router modes — https://reactrouter.com/start/modes

---
*Stack research for: NourishPlan — family meal planning / calorie tracking PWA*
*Researched: 2026-03-12*
