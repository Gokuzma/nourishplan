# Phase 6: Launch on gregok.ca - Research

**Researched:** 2026-03-14
**Domain:** Vercel deployment, custom subdomain DNS, Supabase auth production config, PWA launch polish
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Host on Vercel as a separate project from the portfolio site
- Auto-deploy on push to main branch (with preview deploys on PRs)
- NourishPlan repo needs to be created on GitHub first, then connected to Vercel
- Build command: `tsc -b && vite build` (already in package.json)
- Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) set in Vercel project settings
- Subdomain: nourishplan.gregok.ca
- DNS managed at a separate registrar (not Vercel) — add CNAME record pointing to Vercel
- Portfolio site (gregok.ca) stays on its own Vercel project, unchanged
- Add a NourishPlan project card to the portfolio site linking to nourishplan.gregok.ca
- Use the existing Supabase project (qyablbzodmftobjslgri) — no new project needed
- Add nourishplan.gregok.ca to Supabase auth redirect URLs
- Edge functions already deployed — no changes needed
- Keep demo account (demo@nourishplan.test) available in production with sample data
- Invite-only launch — restrict signup so only invited users can create accounts
- Auth emails use Supabase default sender for now
- Simple branded splash screen: app name on sage green (#A8C5A0) background while loading
- Open Graph meta tags with preview image for social sharing
- Custom branded 404 page and offline fallback page matching NourishPlan's pastel theme
- No analytics for launch

### Claude's Discretion
- Vercel project configuration details (framework preset, output directory)
- OG preview image design and dimensions
- Splash screen implementation approach (CSS-only vs component)
- 404 and offline page copy and layout
- Portfolio project card design (match existing card style on gregok.ca)
- Git repo name and organization
- Invite-only implementation approach (Supabase auth settings vs application-level gating)

### Deferred Ideas (OUT OF SCOPE)
- Custom SMTP sender for auth emails (noreply@gregok.ca)
- Lightweight analytics (Plausible, Umami, or Vercel Analytics)
- Open signup
</user_constraints>

---

## Summary

This phase has no new application features — it is a pure deployment and launch polish phase. The NourishPlan React/Vite SPA needs a GitHub repo, a Vercel project connected to it, a custom subdomain DNS record, Supabase auth configuration for production URLs, and a handful of UI polish items (splash screen, OG tags, 404/offline pages, portfolio card).

The codebase is already production-ready from a build perspective: `tsc -b && vite build` outputs to `dist/`, PWA manifest and service worker are configured via `vite-plugin-pwa`, and all required env vars are documented in `.env.example`. The primary work is infrastructure wiring and polish additions.

The invite-only constraint is implementable with a single Supabase dashboard toggle ("Allow new users to sign up" = disabled), which blocks new self-registrations while allowing existing users and Supabase-invited users to sign in. No application code change is needed for this.

**Primary recommendation:** Create GitHub repo → connect to Vercel with Vite preset → add CNAME at registrar → configure Supabase URLs → add vercel.json for SPA rewrites → implement splash screen, OG tags, 404/offline pages → add portfolio card. Execute in that order to unblock each subsequent step.

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-pwa | 1.2.0 | PWA manifest + service worker | Already configured; workbox navigateFallback already set |
| vite | 8.0.0 | Build tool | Already in use; Vercel auto-detects as framework preset |
| react-router-dom | 7.13.1 | Client-side routing | Requires vercel.json SPA rewrite to work on Vercel |

### Supporting (new additions this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | — | — | No new npm packages required for this phase |

All polish work (splash screen, 404, offline page, OG tags) is pure HTML/CSS/React — no new dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase dashboard invite-only toggle | Before-user-created auth hook | Dashboard toggle is simpler; hook only needed if domain-restriction logic is required |
| Static OG image in `/public` | Dynamic OG image generation | Static is simpler; sufficient for a personal portfolio launch |
| CSS-only splash screen in `index.html` | `vite-plugin-splash-screen` | CSS-only avoids extra dependency; sufficient given simple sage-green-with-text requirement |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure (new files this phase)
```
public/
├── og-image.png             # 1200x630 static OG preview image
├── icon-192.png             # already exists
├── icon-512.png             # already exists
vercel.json                  # SPA rewrite + PWA cache headers
src/
├── pages/
│   ├── NotFoundPage.tsx     # Custom 404 page
│   └── OfflinePage.tsx      # Offline fallback page (served by SW)
├── App.tsx                  # Add splash screen + 404 route
index.html                   # Add splash screen HTML/CSS + OG meta tags
C:\Claude\Projects\website\
└── index.html               # Add NourishPlan project card (article #05)
```

### Pattern 1: vercel.json for Vite SPA + PWA

**What:** Single config file that handles SPA route rewrites and correct cache headers for service worker and manifest.

**When to use:** Required for any Vite SPA on Vercel to prevent 404 on deep-link refresh. PWA cache headers prevent stale SW delivery.

**Example:**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" },
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    }
  ]
}
```
Source: [Vercel Vite docs](https://vercel.com/docs/frameworks/frontend/vite) + [vite-pwa Vercel deployment docs](https://vite-pwa-org.netlify.app/deployment/vercel)

### Pattern 2: Inline CSS Splash Screen in index.html

**What:** A `<div id="splash">` with inline CSS injected before `<div id="root">`. Removed by React once app mounts.

**When to use:** Preferred when splash is simple (solid color + text) and no splash-screen plugin is warranted. Avoids flash of unstyled content before React hydrates.

**Example:**
```html
<!-- In index.html <head> -->
<style>
  #splash {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #A8C5A0;
    z-index: 9999;
    transition: opacity 0.3s ease;
  }
  #splash.hidden { opacity: 0; pointer-events: none; }
  #splash-title {
    font-family: system-ui, sans-serif;
    font-size: 2rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.02em;
  }
  #splash-sub {
    font-family: system-ui, sans-serif;
    font-size: 0.9rem;
    color: rgba(255,255,255,0.75);
    margin-top: 0.5rem;
  }
</style>

<!-- In index.html <body>, before <div id="root"> -->
<div id="splash">
  <div id="splash-title">NourishPlan</div>
  <div id="splash-sub">Family nutrition, together</div>
</div>
```

**Dismissal in main.tsx or App.tsx:**
```typescript
// After React mounts (useEffect in App)
useEffect(() => {
  const splash = document.getElementById('splash')
  if (splash) {
    splash.classList.add('hidden')
    splash.addEventListener('transitionend', () => splash.remove(), { once: true })
  }
}, [])
```

### Pattern 3: Open Graph Meta Tags in index.html

**What:** Standard OG + Twitter Card tags in `<head>`. Must use absolute URLs for `og:image`.

**Example:**
```html
<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://nourishplan.gregok.ca/" />
<meta property="og:title" content="NourishPlan — Family Nutrition Together" />
<meta property="og:description" content="Share one meal plan while each person gets personalized portion suggestions. A family nutrition app built for real life." />
<meta property="og:image" content="https://nourishplan.gregok.ca/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="NourishPlan — Family Nutrition Together" />
<meta name="twitter:description" content="Share one meal plan while each person gets personalized portion suggestions." />
<meta name="twitter:image" content="https://nourishplan.gregok.ca/og-image.png" />
```

### Pattern 4: React Router 404 Catch-All Route

**What:** Replace the current `<Route path="*" element={<Navigate to="/" replace />}` with a proper `NotFoundPage` component. The service worker's `navigateFallback: '/index.html'` already handles offline fallback.

**Current state (App.tsx:155):**
```tsx
<Route path="*" element={<Navigate to="/" replace />} />
```

**Updated to:**
```tsx
<Route path="*" element={<NotFoundPage />} />
```

**OfflinePage** is served separately: add `public/offline.html` as a static file and point workbox's `navigateFallback` or add an offline-specific entry.

**Note on offline fallback:** The existing `navigateFallback: '/index.html'` in `vite.config.ts` means the service worker already serves `index.html` offline. A static `public/offline.html` is the simplest alternative if a dedicated offline experience is desired — add it as a workbox `additionalManifestEntries` entry or reference it in `navigateFallback`.

### Pattern 5: Portfolio Project Card

**What:** Add a fifth `<article class="project-card reveal">` to the `projects-grid` in `C:\Claude\Projects\website\index.html`. Match existing card structure exactly.

**Existing card pattern (from portfolio index.html):**
```html
<article class="project-card reveal" style="--reveal-delay: 0.4s">
  <div class="project-image" style="--card-color: rgba(168, 197, 160, 0.1);">
    <div class="project-image-inner glass-panel"></div>
    <span class="project-number">05</span>
  </div>
  <div class="project-info">
    <div class="project-meta">
      <span class="project-year">2026</span>
      <div class="project-tags">
        <span class="tag">React</span>
        <span class="tag">PWA</span>
        <span class="tag">Supabase</span>
      </div>
    </div>
    <h3 class="project-title">NourishPlan</h3>
    <p class="project-desc">A family nutrition app where one meal plan serves everyone — with portion suggestions personalized to each member's targets.</p>
    <a href="https://nourishplan.gregok.ca" class="project-link">Open app <span class="arrow" aria-hidden="true">→</span></a>
  </div>
</article>
```
The card color `rgba(168, 197, 160, 0.1)` is the NourishPlan sage green (#A8C5A0) at 10% opacity — consistent with how existing cards use the accent color at low opacity.

### Anti-Patterns to Avoid
- **Rewrite rule with `/**` pattern:** Use `"source": "/(.*)"` not `"source": "/**"` — Vercel's rewrite syntax uses POSIX regex groups, not glob.
- **Relative URLs in OG tags:** `og:image` must be an absolute `https://` URL or social scrapers will ignore it.
- **Caching the service worker:** Never set a long `max-age` on `sw.js`; this prevents updates from reaching users.
- **Disabling signups without testing existing login:** Supabase's "Allow new users to sign up = false" only blocks new registrations. Verify existing demo account can still log in after the toggle.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPA route fallback | Custom Vercel serverless function | `vercel.json` rewrites | One-line config; function adds cold-start latency |
| Service worker update | Manual SW registration logic | `registerType: 'autoUpdate'` (already set) | Already configured in vite.config.ts |
| Invite-only access | Application-layer email allowlist | Supabase dashboard toggle | Platform-enforced; no code surface area |
| OG image | Server-side image generation (Satori, etc.) | Static PNG in `/public` | Overkill for a personal launch; static is fine |

---

## Common Pitfalls

### Pitfall 1: SPA routes returning 404 without vercel.json
**What goes wrong:** Vercel serves static files from `dist/`. Routes like `/plan` or `/foods` have no corresponding file, so direct access or refresh returns Vercel's 404.
**Why it happens:** Vercel has no framework preset awareness of client-side routing by default for plain Vite SPAs.
**How to avoid:** Add `vercel.json` with the `/(.*) → /index.html` rewrite before deploying.
**Warning signs:** Works at `/` but all sub-routes 404 on refresh.

### Pitfall 2: Supabase auth email links pointing to localhost
**What goes wrong:** Password reset and email confirmation links contain `http://localhost:5173` in production, breaking auth flows.
**Why it happens:** Supabase "Site URL" defaults to localhost and is used as the base for auth email links.
**How to avoid:** Update "Site URL" to `https://nourishplan.gregok.ca` in Supabase Auth dashboard before sending any auth emails from production.
**Warning signs:** Clicking password reset link in production redirects to localhost.

### Pitfall 3: DNS propagation delay blocking immediate verification
**What goes wrong:** Adding CNAME record at registrar and immediately trying to verify in Vercel — DNS not yet propagated.
**Why it happens:** External DNS changes take minutes to hours to propagate.
**How to avoid:** Set TTL to 300 (5 min) on the record before making the change if possible. Wait and re-run `vercel domains inspect` rather than retrying immediately.
**Warning signs:** Vercel shows domain as "unverified" shortly after CNAME is set.

### Pitfall 4: Service worker caching old app shell after deploy
**What goes wrong:** After a new deploy, users with a cached service worker continue seeing the old version until they manually refresh twice.
**Why it happens:** `registerType: 'autoUpdate'` updates the SW on next navigation, but the old cache is used until the new SW activates.
**How to avoid:** Already mitigated by `registerType: 'autoUpdate'`. Set `Cache-Control: public, max-age=0, must-revalidate` on `sw.js` via vercel.json headers so Vercel doesn't cache the worker at the CDN layer.

### Pitfall 5: OG image not appearing in social previews
**What goes wrong:** Sharing the URL on Twitter/Slack/Discord shows no preview image.
**Why it happens:** OG image URL is relative, HTTP instead of HTTPS, or the image is too large (>5MB).
**How to avoid:** Use absolute HTTPS URL in `og:image`. Keep image under 1MB for fast scraping. Test with [opengraph.xyz](https://www.opengraph.xyz/) or Twitter Card validator after deploy.

---

## Code Examples

### vercel.json (complete)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/(.*\\.webmanifest|manifest\\.json)",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" },
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    }
  ]
}
```
Source: [Vercel docs](https://vercel.com/docs/frameworks/frontend/vite) + [vite-pwa Vercel guide](https://vite-pwa-org.netlify.app/deployment/vercel)

### Supabase: Invite-Only Toggle
Dashboard path: Authentication → Configuration → Auth Settings → "Allow new users to sign up" → set to **Disabled**.

This is the only change needed. The Supabase `signInWithPassword()` call in `AuthForm.tsx` continues to work for existing users. New calls to `signUp()` will return an error that the existing AuthForm already surfaces.

### Supabase: Add Production Redirect URL
Dashboard path: Authentication → URL Configuration:
- **Site URL:** `https://nourishplan.gregok.ca`
- **Redirect URLs:** Add `https://nourishplan.gregok.ca/**`

Also keep `http://localhost:5173/**` in Redirect URLs for local development to continue working.

### Vercel Project Setup (Vercel dashboard)
- **Framework Preset:** Vite (auto-detected)
- **Build Command:** `tsc -b && vite build` (override from `npm run build` if Vercel doesn't pick it up)
- **Output Directory:** `dist` (Vite default, Vercel auto-detects)
- **Install Command:** `npm install`
- **Environment Variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (set for Production environment)

### DNS CNAME Record (at external registrar)
```
Type:  CNAME
Name:  nourishplan
Value: cname.vercel-dns.com.
TTL:   300 (or registrar minimum)
```
Exact value may be shown as `cname.vercel-dns-0.com` — run `vercel domains inspect nourishplan.gregok.ca` after linking to get the precise target.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual `_redirects` file (Netlify) | `vercel.json` rewrites | Vercel-native; cleaner |
| `cleanUrls: true` + no extension | Standard `index.html` destination | No issue for this project; we keep `.html` extension in rewrite |
| Separate icon + maskable icon files | `purpose: 'any maskable'` on solid-color icon | Already implemented in vite.config.ts; no change needed |

**Deprecated/outdated:**
- `"routes"` key in vercel.json: replaced by `"rewrites"` — do not use `routes`.
- `@vite-pwa/assets-generator` for splash screens: useful for complex splash screens with device-specific images; overkill for a simple branded loading state.

---

## Open Questions

1. **GitHub repo name**
   - What we know: Context says "Git repo name is Claude's discretion."
   - Recommendation: Use `nourishplan` (matches `package.json` name field). If that's taken on GitHub, use `nourishplan-app`.

2. **OG image creation tooling**
   - What we know: No image editor tooling has been specified. The project has no canvas/sharp.
   - Recommendation: Create a 1200x630 PNG manually (Figma, Canva, or GIMP) with sage green (#A8C5A0) background, "NourishPlan" in white Nunito-style text, and the tagline. Place in `public/og-image.png`. This is a one-time manual asset.

3. **Offline page: dedicated HTML vs React route**
   - What we know: `navigateFallback: '/index.html'` already serves React app for offline navigation. The service worker returns `index.html` which then shows the `OfflineBanner` component.
   - Recommendation: Skip a separate `offline.html` entirely. The React app already has `OfflineBanner` in `src/components/log/OfflineBanner.tsx`. A dedicated `OfflinePage.tsx` route at `/offline` (or a full-screen component rendered when `navigator.onLine === false`) is cleaner than a static HTML file and stays consistent with the app's theme tokens.

---

## Validation Architecture

> `nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vitest configured inline via vite.config.ts (or separate vitest.config.ts if present) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

This phase has no functional application requirements with testable behavior — it is a deployment and infrastructure phase. All deliverables are either:
- Infrastructure configs (vercel.json, DNS record, Supabase dashboard settings) — **manual verification only**
- Static assets (og-image.png) — **manual visual inspection**
- UI polish components (splash screen, 404 page, offline page) — **smoke test via browser**
- External site edit (portfolio card) — **manual visual inspection**

| Deliverable | Verification Type | Method |
|-------------|-------------------|--------|
| vercel.json SPA rewrites | Manual smoke | Navigate to `/plan` directly in production; confirm no 404 |
| Custom domain | Manual smoke | `curl -I https://nourishplan.gregok.ca` returns 200 |
| Supabase auth URLs | Manual smoke | Trigger password reset; confirm link goes to production domain |
| Invite-only | Manual smoke | Attempt signup with new email; confirm error |
| Splash screen | Manual visual | Hard-refresh production; confirm branded screen appears before app |
| OG tags | Manual tool | Test with opengraph.xyz or Twitter Card validator |
| 404 page | Manual smoke | Navigate to `/nonexistent` in production |
| Portfolio card | Manual visual | Visit gregok.ca; confirm card visible and link works |

### Sampling Rate
- **Per task commit:** `npm test` (confirm no regressions in existing tests)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green + manual smoke checklist before `/gsd:verify-work`

### Wave 0 Gaps
None — no new test files are needed. Existing test suite covers application logic; phase deliverables are infrastructure/polish verified manually.

---

## Sources

### Primary (HIGH confidence)
- [Vercel Vite docs](https://vercel.com/docs/frameworks/frontend/vite) — SPA rewrite config, framework preset, output directory
- [Vercel custom domain docs](https://vercel.com/docs/domains/set-up-custom-domain) — CNAME setup, DNS record values, CLI workflow
- [Supabase auth general configuration](https://supabase.com/docs/guides/auth/general-configuration) — "Allow new users to sign up" toggle, Site URL, redirect URLs
- [vite-pwa Vercel deployment](https://vite-pwa-org.netlify.app/deployment/vercel) — SW cache headers, manifest Content-Type header

### Secondary (MEDIUM confidence)
- [Open Graph protocol](https://ogp.me/) — OG tag specification (og:image dimensions: 1200x630)
- Existing portfolio `index.html` at `C:\Claude\Projects\website\index.html` — confirmed card structure, CSS classes, numbering pattern

### Tertiary (LOW confidence)
- None — all findings verified against official documentation.

---

## Metadata

**Confidence breakdown:**
- Vercel deployment config: HIGH — verified against official Vercel docs
- DNS/CNAME setup: HIGH — verified against official Vercel domain docs; exact CNAME target confirmed as `cname.vercel-dns.com` (project-specific value obtained via `vercel domains inspect`)
- Supabase invite-only: HIGH — confirmed via official Supabase auth docs
- OG tag dimensions: HIGH — 1200x630 is the universal standard confirmed by ogp.me
- Splash screen approach: HIGH — inline CSS in index.html is the standard pattern; no plugin needed for a simple branded screen
- Portfolio card: HIGH — confirmed against actual portfolio HTML/CSS

**Research date:** 2026-03-14
**Valid until:** 2026-06-01 (Vercel and Supabase APIs are stable; DNS is timeless)
