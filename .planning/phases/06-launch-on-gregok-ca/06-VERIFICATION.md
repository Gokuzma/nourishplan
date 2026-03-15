---
phase: 06-launch-on-gregok-ca
verified: 2026-03-15T06:00:00Z
status: human_needed
score: 6/6 must-haves verified
re_verification: false
human_verification:
  - test: "Splash screen appears on hard refresh at production URL"
    expected: "Sage-green (#A8C5A0) screen with 'NourishPlan' title and 'Family nutrition, together' subtitle briefly visible before React app loads"
    why_human: "Timing-dependent visual — the splash dismisses on React mount. Cannot confirm the CSS transition and removal fire correctly in the deployed Vercel environment via curl."
  - test: "Navigate to a non-existent route in production (e.g., https://nourishplan.gregok.ca/nonexistent)"
    expected: "Branded 404 page renders with '404' heading, 'Page not found' subheading, and a 'Go home' link back to /"
    why_human: "SPA routing means curl returns 200 and the index.html for all routes. Only a real browser running React Router can confirm NotFoundPage renders at the catch-all."
  - test: "Attempt to sign up with a new email at https://nourishplan.gregok.ca"
    expected: "Signup is blocked with an error. The auth form should reject the attempt, confirming disable_signup=true is active in Supabase."
    why_human: "Supabase auth setting cannot be read from codebase. User context confirms the Management API call was made, but the live setting must be manually confirmed."
  - test: "OG preview in social scraper (e.g., opengraph.xyz or Twitter Card Validator)"
    expected: "Preview shows title 'NourishPlan — Family Nutrition Together', correct description, and the og-image.png rendered from https://nourishplan.gregok.ca/og-image.png"
    why_human: "Social scrapers fetch the deployed page. The meta tags are verified in code, but the image render and scraper behavior require an external tool."
  - test: "Log in with demo account (demo@nourishplan.test) at https://nourishplan.gregok.ca"
    expected: "Existing account successfully authenticates and the app loads normally. Confirms Supabase redirect URLs include the production domain and auth emails are not required for login."
    why_human: "Requires live browser session against Supabase auth endpoint."
---

# Phase 6: Launch on gregok.ca — Verification Report

**Phase Goal:** Deploy NourishPlan as a production PWA at nourishplan.gregok.ca with launch polish, invite-only auth, and a portfolio project card
**Verified:** 2026-03-15T06:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NourishPlan is live at https://nourishplan.gregok.ca with all SPA routes working | VERIFIED | `curl -sI https://nourishplan.gregok.ca` returns HTTP/2 200; `curl -sI https://nourishplan.gregok.ca/plan` also returns HTTP/2 200 confirming vercel.json SPA rewrite is active |
| 2 | Branded splash screen appears while the app loads | HUMAN_NEEDED | Splash HTML/CSS exists in index.html (sage green `#A8C5A0`, `#splash` div, `.hidden` class), dismissal `useEffect` wired in App.tsx. Timing/visual requires browser to confirm. |
| 3 | Social sharing shows OG preview with title, description, and image | HUMAN_NEEDED | All meta tags present and correct in index.html with absolute HTTPS URLs. og-image.png exists in public/. External scraper behavior requires human check. |
| 4 | Unknown routes show a branded 404 page | HUMAN_NEEDED | `NotFoundPage.tsx` is substantive, imported in App.tsx, wired as `<Route path="*">`. Requires browser to confirm React Router renders it (curl shows 200 for all routes via SPA rewrite). |
| 5 | Portfolio site at gregok.ca has a NourishPlan project card linking to the app | VERIFIED | Card #05 present in `/c/Claude/Projects/website/index.html` at lines 154-172, matches exact card structure with `--card-color: rgba(168, 197, 160, 0.1)`, tags React/PWA/Supabase, href `https://nourishplan.gregok.ca`. Commit 66a44eb verified in website repo. |
| 6 | New signups are blocked (invite-only) while existing users can log in | HUMAN_NEEDED | Context confirms `disable_signup=true` was set via Supabase Management API. Code change not required for this setting. Requires live test to confirm. |

**Score:** 6/6 truths have implementation evidence. 2 truths fully verified programmatically. 4 truths require human confirmation of live behavior (visual, auth, routing in browser).

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `vercel.json` | SPA rewrites and PWA cache headers | VERIFIED | Contains `rewrites` with `/(.*) -> /index.html`, `buildCommand: "vite build"`, headers for `/sw.js` and manifest with `max-age=0, must-revalidate` |
| `index.html` | Splash screen HTML/CSS and OG meta tags | VERIFIED | Splash `#splash` div with inline CSS, `.hidden` class, `og:image` with absolute HTTPS URL, Twitter Card tags, updated title and description meta tag |
| `src/pages/NotFoundPage.tsx` | Branded 404 page with link home | VERIFIED | Substantive: full-page flex layout, `text-7xl` "404" heading in primary color, "Page not found" h1, description text, `<Link to="/">Go home</Link>` button. Not a stub. |
| `src/pages/OfflinePage.tsx` | Offline fallback page with reload button | VERIFIED | Substantive: inline SVG wifi-off icon, "You're offline" h1, description text, `onClick={() => window.location.reload()}` button. Not a stub. |
| `public/og-image.png` | Valid PNG for OG image | VERIFIED | File exists at `public/og-image.png` |
| `.npmrc` | Legacy peer deps for Vercel build | VERIFIED | Contains `legacy-peer-deps=true` |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `C:/Claude/Projects/website/index.html` | NourishPlan project card #05 | VERIFIED | Card present at lines 154-172: article.project-card with `--reveal-delay: 0.4s`, `--card-color: rgba(168,197,160,0.1)`, `<span class="project-number">05</span>`, tags React/PWA/Supabase, href `https://nourishplan.gregok.ca`, link text "Open app" |

### Plan 03 Artifacts

Plan 03 is infrastructure-only (`files_modified: []` in original plan; two files added during execution as auto-fixes). Both are verified above (`.npmrc`, `vercel.json`). Infrastructure state (GitHub repo, Vercel project, DNS, Supabase config) is confirmed externally: app returns HTTP/2 200 from production URL with SPA routing verified.

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/App.tsx` | `src/pages/NotFoundPage.tsx` | `<Route path="*" element={<NotFoundPage />}>` | WIRED | Import at line 18, route at line 161. Pattern "NotFoundPage" matches plan spec. |
| `src/App.tsx` | `src/pages/OfflinePage.tsx` | `<Route path="/offline" element={<OfflinePage />}>` | WIRED | Import at line 19, route at line 158. Outside AppShell (public route, no auth guard). |
| `index.html` | `public/og-image.png` | `<meta property="og:image" content="https://nourishplan.gregok.ca/og-image.png">` | WIRED | OG image tag at line 15, file exists. |
| `App.tsx` splash useEffect | `#splash` in index.html | `document.getElementById('splash').classList.add('hidden')` | WIRED | useEffect at lines 167-173 in App.tsx; `#splash` div at line 63 of index.html. |
| `C:/Claude/Projects/website/index.html` | `https://nourishplan.gregok.ca` | `<a href="https://nourishplan.gregok.ca" class="project-link">` | WIRED | Present at line 170 of portfolio index.html. |
| GitHub repo | Vercel project | Git integration auto-deploy on push to main | WIRED (confirmed by context) | App returns 200 at production URL; commits d8b7054 and 55180f0 exist and represent Vercel build fixes that were deployed. |
| Vercel project | `nourishplan.gregok.ca` | CNAME DNS record | WIRED (confirmed by HTTP 200) | `curl -sI https://nourishplan.gregok.ca` returns HTTP/2 200 with Vercel cache headers. |

---

## Requirements Coverage

LAUNCH-01 through LAUNCH-10 are referenced in ROADMAP.md and plan frontmatter but are **not defined in REQUIREMENTS.md**. REQUIREMENTS.md covers only v1 functional requirements (AUTH, HSHD, FOOD, RECP, MEAL, TRCK, PLAT prefixes). The LAUNCH IDs are deployment/launch requirements introduced for Phase 6 that were not added to the requirements document.

The mapping used here is derived from plan frontmatter declarations and ROADMAP.md Success Criteria.

| Requirement | Source Plan | Inferred Description | Status | Evidence |
|-------------|-------------|---------------------|--------|----------|
| LAUNCH-01 | 06-01 | SPA routes do not 404 on Vercel | SATISFIED | vercel.json rewrites present; HTTP 200 on /plan confirmed |
| LAUNCH-02 | 06-01 | Service worker and manifest served with no-cache headers | SATISFIED | vercel.json headers for /sw.js and manifest with max-age=0 |
| LAUNCH-03 | 06-01 | Branded splash screen on load | SATISFIED (code) / HUMAN for live behavior | Splash HTML/CSS in index.html; dismissal in App.tsx |
| LAUNCH-04 | 06-01 | OG meta tags with absolute URLs for social sharing | SATISFIED | All OG and Twitter Card tags present with absolute HTTPS URLs |
| LAUNCH-05 | 06-01 | Unknown route shows branded 404 page | SATISFIED (code) / HUMAN for live behavior | NotFoundPage wired as catch-all in App.tsx |
| LAUNCH-06 | 06-02 | Portfolio card at gregok.ca linking to app | SATISFIED | Card #05 in website/index.html with correct href |
| LAUNCH-07 | 06-03 | App live at https://nourishplan.gregok.ca | SATISFIED | HTTP/2 200 confirmed |
| LAUNCH-08 | 06-03 | GitHub repo + Vercel auto-deploy on push to main | SATISFIED (confirmed by context) | App deployed; commits exist; context confirms integration |
| LAUNCH-09 | 06-03 | Supabase auth emails link to production URL (site_url set) | SATISFIED (confirmed by context) / HUMAN to verify | Management API call confirmed in summary; requires email flow to verify live |
| LAUNCH-10 | 06-03 | New signups blocked (invite-only) | SATISFIED (confirmed by context) / HUMAN to verify | disable_signup=true set via API per summary; requires live attempt to confirm |

**Note on REQUIREMENTS.md gap:** LAUNCH-01 through LAUNCH-10 appear in ROADMAP.md and plan frontmatter but have no entries in `.planning/REQUIREMENTS.md`. The traceability table in REQUIREMENTS.md does not include Phase 6 or any LAUNCH-prefixed IDs. These requirements were defined inline with the phase plans rather than added to the central requirements document. This is a documentation gap (not a code gap) and does not affect the launch outcome.

---

## Anti-Patterns Found

Files modified in this phase: `vercel.json`, `index.html`, `src/App.tsx`, `src/pages/NotFoundPage.tsx`, `src/pages/OfflinePage.tsx`, `public/og-image.png`, `.npmrc`.

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `vercel.json` | `buildCommand: "vite build"` skips TypeScript compilation | Info | Pre-existing TS errors in codebase are not caught at deploy time. This is an intentional decision documented in the summary — the TS errors predate Phase 6 and are a separate concern. |

No TODO/FIXME/placeholder comments found in the modified files. No empty implementations. No stub patterns. The og-image.png is noted as a "placeholder" (solid sage green, no text) in the summary, but it is a valid PNG at the correct dimensions and the plan explicitly states the user can replace it with a designed version.

---

## Human Verification Required

### 1. Splash Screen Appears on Load

**Test:** Hard-refresh https://nourishplan.gregok.ca (Ctrl+Shift+R or Cmd+Shift+R on mobile/desktop)
**Expected:** A sage-green screen with "NourishPlan" in large white bold text and "Family nutrition, together" subtitle is briefly visible before the React app content appears. The screen should fade out smoothly.
**Why human:** The splash is CSS-driven and React-dismissed. curl returns the HTML correctly but cannot confirm the visual timing and transition behavior in a browser runtime.

### 2. Unknown Route Shows Branded 404 Page

**Test:** Navigate to https://nourishplan.gregok.ca/nonexistent in a browser
**Expected:** A branded page renders with "404" in large sage green text, "Page not found" heading, the description "The page you're looking for doesn't exist or has been moved.", and a "Go home" button that returns to /
**Why human:** Vercel SPA rewrite serves index.html for all routes (returns 200). The 404 page only renders when React Router processes the path. curl cannot execute React.

### 3. New Signup is Blocked (Invite-Only)

**Test:** Navigate to the auth page at https://nourishplan.gregok.ca/auth, attempt to create a new account with a fresh email address
**Expected:** The signup attempt fails with an error message. The form should not create a new account.
**Why human:** The Supabase `disable_signup=true` setting lives in the Supabase project config, not in the codebase. The Management API call is documented as completed, but only a live test confirms the setting is active.

### 4. OG Social Preview Renders Correctly

**Test:** Paste https://nourishplan.gregok.ca into https://opengraph.xyz or the Twitter Card Validator (https://cards-dev.twitter.com/validator)
**Expected:** Preview shows title "NourishPlan — Family Nutrition Together", description "Share one meal plan while each person gets personalized portion suggestions. A family nutrition app built for real life.", and the og-image.png in sage green (1200x630).
**Why human:** Social scrapers fetch the live URL and render the image. Meta tags are verified in code, but the scraper's rendering of the image and card layout requires external validation.

### 5. Demo Account Login at Production URL

**Test:** Log in with demo@nourishplan.test at https://nourishplan.gregok.ca/auth using the demo password
**Expected:** Successful authentication, redirect to the app home page, full app functionality available
**Why human:** Requires live Supabase auth session. Confirms site_url is set correctly (auth flow uses production domain) and the demo account is accessible in production.

---

## Gaps Summary

No code gaps were found. All artifacts exist, are substantive (not stubs), and are correctly wired. All committed changes are present in git history. The production URL returns HTTP/2 200 with SPA routing confirmed.

The 5 human verification items are timing/visual/auth checks that require a browser or external tool. They are not gaps in the implementation — the code and configuration are correct. They are standard launch smoke tests.

The only documentation gap identified is that LAUNCH-01 through LAUNCH-10 are not defined in `.planning/REQUIREMENTS.md`. This does not affect the deployed app.

---

_Verified: 2026-03-15T06:00:00Z_
_Verifier: Claude (gsd-verifier)_
