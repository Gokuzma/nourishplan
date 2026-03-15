---
phase: 06-launch-on-gregok-ca
plan: 01
subsystem: infra
tags: [vercel, pwa, spa, og-tags, splash-screen, react-router]

requires:
  - phase: 05-portion-suggestions-polish
    provides: Complete React SPA with service worker and PWA manifest

provides:
  - vercel.json with SPA rewrite rule and PWA cache headers
  - Branded splash screen in index.html (sage green, dismisses on React mount)
  - OG and Twitter Card meta tags with absolute HTTPS URLs
  - og-image.png (1200x630 sage green PNG placeholder)
  - NotFoundPage component (branded 404 with link home)
  - OfflinePage component (branded offline state with reload button)
  - /offline route accessible without auth
  - Catch-all route renders NotFoundPage instead of redirecting to /

affects: [06-launch-infrastructure, 06-launch-polish]

tech-stack:
  added: []
  patterns:
    - "vercel.json SPA rewrite with POSIX source pattern /(.*) not /**"
    - "Splash screen dismissed via useEffect adding .hidden class on React mount, removed on transitionend"
    - "OG image as solid-color PNG generated with Node.js raw buffer (no canvas dependency)"

key-files:
  created:
    - vercel.json
    - public/og-image.png
    - src/pages/NotFoundPage.tsx
    - src/pages/OfflinePage.tsx
  modified:
    - index.html
    - src/App.tsx

key-decisions:
  - "Vercel rewrite source uses POSIX regex /(.*) not /** glob — Vercel JSON uses POSIX regex patterns"
  - "Splash dismissed via transitionend listener after adding .hidden class — avoids flash of unstyled content without blocking React hydration"
  - "og-image.png generated as raw PNG byte buffer (Node.js zlib + manual PNG chunks) since canvas/sharp not available — user can replace with designed version"
  - "/offline route placed outside AppShell layout route so it renders without auth requirements"
  - "NotFoundPage uses default export to match plan artifact spec; imported as default in App.tsx"

patterns-established:
  - "Page-level error/fallback components follow full-page centered flex layout with bg-background, matching AuthPage pattern"
  - "Public utility routes (like /offline) declared outside the AuthGuard-wrapped AppShell layout route"

requirements-completed: [LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04, LAUNCH-05]

duration: 3min
completed: 2026-03-15
---

# Phase 6 Plan 01: Vercel Deployment Config + Launch Polish Summary

**Vercel SPA rewrite, PWA cache headers, branded splash screen, OG/Twitter meta tags, 404/offline fallback pages — all committed and TypeScript-clean**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-15T03:38:11Z
- **Completed:** 2026-03-15T03:41:11Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created vercel.json with SPA catch-all rewrite and no-cache headers for sw.js and manifest
- Updated index.html with inline splash screen (sage green, dismisses on React mount), OG meta tags, Twitter Card tags, and updated page title/description
- Generated public/og-image.png as 1200x630 sage green PNG placeholder
- Created NotFoundPage (branded 404 with link home) and OfflinePage (offline state with reload button)
- Updated App.tsx routing: catch-all now renders NotFoundPage; /offline route added outside AppShell

## Task Commits

Each task was committed atomically:

1. **Task 1: vercel.json, splash screen, OG meta tags, og-image.png** - `60df642` (feat)
2. **Task 2: NotFoundPage, OfflinePage, routing update** - `26706ec` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified
- `vercel.json` - SPA rewrite rule and PWA cache control headers
- `index.html` - Splash screen HTML/CSS, OG/Twitter meta tags, updated title and description
- `public/og-image.png` - 1200x630 sage green PNG (placeholder, can be replaced with designed version)
- `src/pages/NotFoundPage.tsx` - Branded 404 page with sage green heading and Link home button
- `src/pages/OfflinePage.tsx` - Branded offline page with wifi-off SVG icon and reload button
- `src/App.tsx` - Splash dismissal useEffect, NotFoundPage/OfflinePage imports, /offline route, catch-all route updated

## Decisions Made
- Vercel rewrite source uses POSIX regex `/(.*)`  not `/**` glob — Vercel JSON uses POSIX regex patterns not glob syntax
- Splash dismissed via transitionend listener after adding .hidden class on mount — smooth fade without blocking hydration
- og-image.png generated via raw Node.js PNG buffer construction (no canvas/sharp available); user can replace with a designed version
- /offline route declared outside AppShell so it renders without authentication requirements

## Deviations from Plan

None - plan executed exactly as written.

### Noted Issue (Out of Scope)

Pre-existing `npm run build` TypeScript errors in `src/hooks/useRecipes.ts`, `src/main.tsx`, and `src/pages/HouseholdPage.tsx` caused the production build to fail. These errors existed before this plan and are unrelated to the changes made here (`npx tsc --noEmit` and all 84 tests pass). Logged to deferred items.

## Issues Encountered
- Production build (`npm run build`) fails due to pre-existing TypeScript errors in useRecipes.ts, main.tsx, and HouseholdPage.tsx. These predate this plan and are out of scope for auto-fix (separate files, separate tasks). Documented above.

## User Setup Required
None - no external service configuration required for this plan. Vercel deployment configuration in Plan 03.

## Next Phase Readiness
- vercel.json ready for Vercel project creation in Plan 03
- All launch-quality code polish committed
- og-image.png can be replaced with a designed version at any time before launch
- Pre-existing build errors in useRecipes.ts and main.tsx need resolution before `npm run build` can be used for deployment

---
*Phase: 06-launch-on-gregok-ca*
*Completed: 2026-03-15*
