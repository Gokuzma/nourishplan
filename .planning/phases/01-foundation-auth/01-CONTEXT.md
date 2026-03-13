# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create accounts, form households, and the app is installable on mobile with the correct data model in place. This phase delivers: email+Google auth, household creation/invite/join, the app shell with bottom navigation, and the pastel visual identity in both light and dark mode. No food data, recipes, meal plans, or tracking.

</domain>

<decisions>
## Implementation Decisions

### Auth flow & session handling
- Single page with Login/Sign Up toggle (no separate pages)
- Email + Google sign-in (Supabase Auth handles both)
- After signup, route straight to household setup (no empty dashboard first)
- Password reset via inline modal on the auth page (no separate page navigation)
- Session persistence across browser sessions via Supabase

### Household onboarding
- Post-signup screen presents "Create household" or "Join household" fork
- Invites via shareable link only (no email invites)
- Two roles: Admin (creator, can manage members/children's profiles) and Member
- One household per user (no multi-household support)

### Pastel colour scheme & visual identity
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

### App shell & navigation
- Bottom tab bar on mobile (4 tabs): Home, Plan, Household, Settings
- Phase 1: Home and Household tabs are active; Plan tab shows placeholder
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

</decisions>

<specifics>
## Specific Ideas

- Auth screen should feel minimal — just the logo, toggle, and form fields. No marketing copy needed.
- Household creation is the first thing after signup — get to the core value immediately.
- The sage/warm palette should feel like a wholesome kitchen, not clinical.
- Dark mode should keep the same identity (sage + peach accents) on a dark canvas, not just invert colours.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing code — greenfield project. All components built from scratch.

### Established Patterns
- Stack decided: Vite 7 + React 19 + Supabase + TanStack Query + Tailwind CSS 4
- Postgres RLS for household data isolation (decided in research phase)
- Per-100g normalization at ingest (data model decision, relevant to schema design)

### Integration Points
- Supabase Auth for email + Google sign-in
- Supabase Database for household/user tables with RLS policies
- Tailwind CSS 4 for design tokens (colours, typography, spacing)
- vite-plugin-pwa for PWA manifest (compatibility with Vite 7 needs validation)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-03-12*
