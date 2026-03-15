# Phase 6: Launch on gregok.ca - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy NourishPlan as a production PWA at nourishplan.gregok.ca. Set up Vercel hosting, configure the subdomain, update Supabase auth for the production URL, add launch polish (splash screen, OG tags, error pages), and add a project card to the portfolio site. No new app features.

</domain>

<decisions>
## Implementation Decisions

### Hosting & deploy
- Host on Vercel as a separate project from the portfolio site
- Auto-deploy on push to main branch (with preview deploys on PRs)
- NourishPlan repo needs to be created on GitHub first, then connected to Vercel
- Build command: `tsc -b && vite build` (already in package.json)
- Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) set in Vercel project settings

### URL structure
- Subdomain: nourishplan.gregok.ca
- DNS managed at a separate registrar (not Vercel) — add CNAME record pointing to Vercel
- Portfolio site (gregok.ca) stays on its own Vercel project, unchanged
- Add a NourishPlan project card to the portfolio site linking to nourishplan.gregok.ca

### Production Supabase
- Use the existing Supabase project (qyablbzodmftobjslgri) — no new project needed
- Add nourishplan.gregok.ca to Supabase auth redirect URLs
- Edge functions (search-usda, search-cnf, verify-nutrition) already deployed — no changes needed
- Keep demo account (demo@nourishplan.test) available in production with sample data
- Invite-only launch — restrict signup so only invited users can create accounts
- Auth emails use Supabase default sender for now — custom SMTP deferred to later

### Launch polish
- Simple branded splash screen: app name on sage green (#A8C5A0) background while loading
- Open Graph meta tags with preview image for social sharing (title, description, branded OG image)
- Custom branded 404 page and offline fallback page matching NourishPlan's pastel theme
- No analytics for launch — lightweight analytics deferred to a future phase

### Claude's Discretion
- Vercel project configuration details (framework preset, output directory)
- OG preview image design and dimensions
- Splash screen implementation approach (CSS-only vs component)
- 404 and offline page copy and layout
- Portfolio project card design (match existing card style on gregok.ca)
- Git repo name and organization
- Invite-only implementation approach (Supabase auth settings vs application-level gating)

</decisions>

<specifics>
## Specific Ideas

- User is Canadian — gregok.ca is a personal domain with an existing portfolio site
- Portfolio is a dark-themed, glassmorphic design — the NourishPlan project card should match that aesthetic
- The portfolio site is vanilla HTML/CSS/JS on Vercel (Gokuzma/portfolio repo)
- Invite-only is for a controlled launch with family/friends first

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vite.config.ts`: PWA manifest already configured with theme_color (#A8C5A0), icons, workbox
- `package.json`: Build scripts ready (`tsc -b && vite build`)
- `.env.example`: Documents required env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- `public/icon-192.png`, `public/icon-512.png`: PWA icons already generated

### Established Patterns
- Vite 8 + React 19 SPA with client-side routing (react-router-dom v7)
- Supabase client initialized from env vars in `src/lib/supabase.ts`
- Tailwind CSS 4 with @theme tokens (sage/cream/peach palette)
- Service worker with navigateFallback to `/index.html` for SPA routing

### Integration Points
- Vercel needs `vercel.json` for SPA rewrites (all routes → index.html)
- Supabase dashboard: add nourishplan.gregok.ca to Site URL and redirect URLs
- DNS registrar: add CNAME record for nourishplan subdomain → cname.vercel-dns.com
- Portfolio site (C:\Claude\Projects\website): add project card to index.html

</code_context>

<deferred>
## Deferred Ideas

- Custom SMTP sender for auth emails (noreply@gregok.ca) — future polish
- Lightweight analytics (Plausible, Umami, or Vercel Analytics) — future phase
- Open signup — currently invite-only, open up later

</deferred>

---

*Phase: 06-launch-on-gregok-ca*
*Context gathered: 2026-03-14*
