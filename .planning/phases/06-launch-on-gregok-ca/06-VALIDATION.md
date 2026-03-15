---
phase: 6
slug: launch-on-gregok-ca
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | vite.config.ts (vitest inline config) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | — | regression | `npm test` | N/A | ⬜ pending |
| 06-01-02 | 01 | 1 | — | manual | vercel.json SPA rewrite smoke test | N/A | ⬜ pending |
| 06-02-01 | 02 | 1 | — | manual | `curl -I https://nourishplan.gregok.ca` | N/A | ⬜ pending |
| 06-02-02 | 02 | 1 | — | manual | Supabase dashboard config verification | N/A | ⬜ pending |
| 06-03-01 | 03 | 2 | — | manual | Hard refresh → splash visible | N/A | ⬜ pending |
| 06-03-02 | 03 | 2 | — | manual | opengraph.xyz validator | N/A | ⬜ pending |
| 06-03-03 | 03 | 2 | — | manual | Navigate to `/nonexistent` → 404 page | N/A | ⬜ pending |
| 06-04-01 | 04 | 2 | — | manual | Portfolio card visible at gregok.ca | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed.

This phase is infrastructure/deployment — all deliverables are verified manually via smoke tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SPA routes work on Vercel | vercel.json rewrites | Requires deployed environment | Navigate to `/plan` directly in production; confirm no 404 |
| Custom domain resolves | DNS CNAME + Vercel config | External DNS propagation | `curl -I https://nourishplan.gregok.ca` returns 200 |
| Supabase auth emails use production URL | Site URL config | Dashboard-only setting | Trigger password reset; confirm link goes to production domain |
| Invite-only blocks new signups | Supabase auth toggle | Dashboard-only setting | Attempt signup with new email; confirm error |
| Splash screen appears | Inline CSS in index.html | Visual/timing check | Hard-refresh production; confirm branded sage-green screen before app |
| OG tags render preview | Meta tags in index.html | External scraper behavior | Test with opengraph.xyz or Twitter Card validator |
| 404 page renders | React Router catch-all | Browser navigation | Navigate to `/nonexistent` in production |
| Portfolio card visible | HTML edit on portfolio site | Visual layout check | Visit gregok.ca; confirm card #05 visible and link works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
