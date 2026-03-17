# Phase 14: How-To Manual - Research

**Researched:** 2026-03-17
**Domain:** In-app documentation UI (React, Tailwind CSS 4, React Router v7)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Content structure**
- Organized by user journey: Getting Started → Adding Foods → Building Recipes → Creating a Meal Plan → Tracking Your Day
- Quick-start summary at the top ("Get started in 5 steps") before detailed sections
- Dedicated section for household admin tasks (inviting members, managing roles, transferring admin) — separate from main flow
- Step-by-step walkthroughs for each topic — numbered steps detailed enough for first-time users

**Presentation format**
- Dedicated page at `/guide` route — full page similar to Settings
- Accordion/collapsible sections — each topic expands on tap, keeps page scannable on mobile
- Text only — no screenshots or illustrations, easier to maintain across theme changes
- Include tip callouts for non-obvious features (e.g., "Tip: You can use a recipe as an ingredient in another recipe")

**Access & navigation**
- "User Guide" link in the MobileDrawer AND the desktop Sidebar — accessible from any page on all screen sizes
- Deep-linkable sections with anchor hashes (e.g., `/guide#recipes`) — allows linking to specific topics from elsewhere in the app

**Tone & writing style**
- Friendly & casual tone — "Tap the + button to search for a food" — feels like a friend showing you around
- Each section begins with a brief "what & why" intro (1-2 sentences) before numbered steps
- Main content addresses a general household member — admin tasks in their own separate section

**Living document principle**
- Guide is the source of truth for how features work
- When features are added or changed → update the guide
- When guide text is updated → check if the feature implementation needs to match
- Guide changes require user approval before finalizing

### Claude's Discretion
- Whether to use a separate data file or hardcode content in the component (decide based on content volume)
- Exact wording and step counts per section
- Which features deserve "pro tip" callouts

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOCS-01 | In-app how-to manual accessible from the UI explaining all major features (food logging, recipes, meal planning, nutrition targets, household management) | React component with accordion UI, route at `/guide`, nav links in Sidebar and MobileDrawer; content drawn from live page inspection |
</phase_requirements>

## Summary

Phase 14 is a pure UI content phase — it adds a static guide page to the authenticated app. No new data fetching, no new Supabase queries, no new hooks. The deliverables are: a new page component (`src/pages/GuidePage.tsx`), optional sub-components in `src/components/guide/`, a `/guide` route added to `App.tsx`, and nav entries added to `Sidebar.tsx` and `MobileDrawer.tsx`.

The accordion pattern is well-supported using React `useState` without any third-party library. The existing codebase uses no component library (raw Tailwind), so a hand-built accordion is the correct approach and requires no new dependencies. Deep-linking via anchor hashes is achievable with `id` attributes on section headings combined with `scrollIntoView` or native browser hash navigation.

The main planning decision is whether guide content lives as inline JSX inside `GuidePage.tsx` or in a separate data structure. Given the volume (six content sections with multiple steps each plus tip callouts), extracting content to a typed data array in the same file or a companion `guideContent.ts` file is cleaner and makes future updates easier without touching component logic.

**Primary recommendation:** Build `GuidePage.tsx` with a local `useState` accordion, content defined as a typed array in the same file, `id` anchors on each section for deep-linking, and add one nav item to both `MobileDrawer.tsx` and `Sidebar.tsx`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | Component rendering | Already in project |
| react-router-dom | 7.13.1 | `/guide` route + `NavLink` | Already in project |
| Tailwind CSS | 4.2.1 | Styling, dark mode, responsive | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | — | — | No new deps required |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-built accordion | Headless UI / Radix Accordion | Third-party adds bundle weight; hand-built is 20 lines and matches project pattern |
| Inline content data | MDX / markdown files | Markdown pipeline adds build complexity for content that never needs formatting beyond text+tips |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── GuidePage.tsx          # New page — accordion layout + content data
├── components/
│   └── guide/
│       └── GuideSection.tsx   # Reusable accordion section (optional, only if DRY wins)
```

The guide component count is small. If `GuidePage.tsx` stays under ~200 lines with content inlined as a data structure, a separate `GuideSection` component is unnecessary. Introduce it only if accordion + content rendering logic becomes hard to scan.

### Pattern 1: Accordion with useState
**What:** Each section has an `isOpen` boolean in a shared array or individual state variables. Click on a section header toggles it.
**When to use:** Always for collapsible content in this codebase — no library.
**Example:**
```typescript
// Matches existing pattern from MobileDrawer/SettingsPage state management
const [openSection, setOpenSection] = useState<string | null>(null)

function toggle(id: string) {
  setOpenSection(prev => prev === id ? null : id)
}
```
One-at-a-time open behaviour is appropriate for a guide (avoids vertical overflow). Multiple-open is also viable if user wants to compare sections.

### Pattern 2: Deep-linkable anchors
**What:** Each section heading rendered with `id={section.id}` so `/guide#recipes` scrolls the page to the Recipes section.
**When to use:** Required by locked decision.
**Example:**
```typescript
// On mount, check window.location.hash and auto-open + scroll to matching section
useEffect(() => {
  const hash = window.location.hash.slice(1) // e.g. "recipes"
  if (hash) {
    setOpenSection(hash)
    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
  }
}, [])
```

### Pattern 3: Content as typed data
**What:** Guide sections defined as a `const` array of objects with id, title, intro, steps, tips fields. Render loop generates accordion items.
**When to use:** When content has a regular shape (all sections have title + intro + steps). Avoids duplicated JSX per section.
**Example:**
```typescript
interface GuideSection {
  id: string
  title: string
  intro: string
  steps: string[]
  tips?: string[]
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    intro: 'NourishPlan helps your household plan meals and track nutrition together.',
    steps: [
      'Create your account and set up a household.',
      '...',
    ],
    tips: ['Tip: Invite family members from the Household page.'],
  },
  // ...
]
```

### Pattern 4: Page layout (matches HouseholdPage / SettingsPage)
**What:** Full-page layout with `min-h-screen bg-background px-4 py-8 font-sans` and centered `max-w-lg` content container.
**When to use:** All authenticated pages use this pattern — GuidePage must match.
**Example:**
```typescript
return (
  <div className="min-h-screen bg-background px-4 py-8 font-sans">
    <div className="mx-auto max-w-lg flex flex-col gap-6">
      <h1 className="text-3xl font-bold text-primary">User Guide</h1>
      {/* quick-start card + accordion sections */}
    </div>
  </div>
)
```

### Pattern 5: Tip callout styling
**What:** Visually distinct callout block for tip text within an accordion section body.
**When to use:** Per-locked decision: non-obvious features deserve callouts.
**Example:**
```typescript
// Matches app's use of accent/primary color tokens
<div className="mt-3 rounded-[--radius-btn] bg-primary/10 px-3 py-2 text-sm text-primary">
  {tip}
</div>
```

### Pattern 6: Nav item addition (MobileDrawer + Sidebar)
**What:** Add one object to `drawerItems` in `MobileDrawer.tsx` and one to `navItems` in `Sidebar.tsx`.
**When to use:** Required to satisfy the "accessible from any page" constraint.
**Example for MobileDrawer:**
```typescript
const drawerItems = [
  { label: 'Meals', to: '/meals', icon: '🍽️' },
  { label: 'Household', to: '/household', icon: '👨‍👩‍👧' },
  { label: 'Settings', to: '/settings', icon: '⚙️' },
  { label: 'User Guide', to: '/guide', icon: '📘' },
]
```
**Example for Sidebar:**
```typescript
const navItems = [
  // ...existing items...
  { label: 'User Guide', to: '/guide', icon: '📘' },
]
```

### Anti-Patterns to Avoid
- **Fetching guide content from a database:** Guide is static content — no Supabase query needed. Any dynamic source creates unnecessary latency and maintenance burden.
- **Using an animation library for accordion transitions:** `transition-all` / `max-height` trick with Tailwind is sufficient. Don't add Framer Motion for one accordion.
- **Putting guide content in a separate `.md` file with a markdown renderer:** Adds a runtime dependency (e.g., `react-markdown`) for no benefit over plain JSX strings.
- **Creating a separate layout route for the guide:** It belongs inside the existing `AppShell` authenticated layout route, not a new shell.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accordion animation | Custom JS animation | CSS `max-height` transition via Tailwind | Browser-native, no JS layout thrashing |
| Scroll-to-hash on load | Custom scroll manager | `element.scrollIntoView()` + `useEffect` | Standard browser API, zero deps |
| Active nav highlight | Custom active-link logic | React Router `NavLink` (already used everywhere) | Consistent with all other nav items in the codebase |

**Key insight:** This phase is entirely content work and minor plumbing — no complex logic. The implementation risk is content quality (accuracy, completeness) not technical complexity.

## Common Pitfalls

### Pitfall 1: Stale content on first write
**What goes wrong:** Guide describes features as they were during research, but existing pages have evolved (e.g., FreeformLogModal was deleted in Phase 12; food logging happens directly from HomePage).
**Why it happens:** Researcher or writer works from memory/requirements rather than live source.
**How to avoid:** Before writing each guide section, read the actual page source file to confirm current UI flow (CONTEXT.md lists canonical page files).
**Warning signs:** Steps that mention UI elements that no longer exist (e.g., "Tap Add Food" on a page that was redesigned).

### Pitfall 2: Accordion body height transition flicker
**What goes wrong:** Animating `height: auto` directly doesn't work in CSS. Using `max-height` with a large value (e.g., `max-h-96`) can cause slow collapse animation.
**Why it happens:** CSS cannot transition to `height: auto`.
**How to avoid:** Use `max-h-0 overflow-hidden` → `max-h-[1000px]` toggle via class swap, or skip animation entirely and use simple `display: none` / block toggling. For this guide, simple show/hide without animation is acceptable and matches the project's low-animation stance.

### Pitfall 3: Deep-link hash not opening the accordion
**What goes wrong:** User navigates to `/guide#recipes` but the section is closed and the hash scroll doesn't reveal content.
**Why it happens:** Section is in collapsed state when scroll fires; user sees the header but not the content.
**How to avoid:** `useEffect` on mount reads `window.location.hash`, sets that section open, then calls `scrollIntoView`. Order matters: set state, then scroll (may need a tick delay or `flushSync`).

### Pitfall 4: Admin-only content visible to non-admins
**What goes wrong:** Guide section "Managing Your Household" describes admin actions (transfer admin, remove members) in confusing ways for non-admin users.
**Why it happens:** Content written from admin perspective by default.
**How to avoid:** Locked decision already separates admin tasks to their own section with a clear label like "Household Admin Tasks — For admins only." No conditional rendering needed — explaining that these options only appear for admins is sufficient.

### Pitfall 5: Nav item ordering inconsistency
**What goes wrong:** "User Guide" placed differently in MobileDrawer vs Sidebar, confusing users switching between screen sizes.
**Why it happens:** Drawer and Sidebar are edited independently.
**How to avoid:** Plan both edits in the same task; verify relative position (e.g., always after Settings).

## Code Examples

Verified patterns from project source:

### Route addition in App.tsx
```typescript
// Source: src/App.tsx — inside the AppShell layout route block
<Route path="/guide" element={<GuidePage />} />
```

### Accordion open state toggle (single-open)
```typescript
// Pattern derived from existing useState usage in SettingsPage.tsx and RecipesPage.tsx
const [openSection, setOpenSection] = useState<string | null>(null)
const toggle = (id: string) => setOpenSection(prev => prev === id ? null : id)
```

### Conditional section body visibility
```typescript
// Matches Tailwind conditional class pattern used throughout the project
<div className={openSection === section.id ? 'block' : 'hidden'}>
  {/* section content */}
</div>
```

### NavLink in nav array (source: MobileDrawer.tsx:4-8)
```typescript
const drawerItems = [
  { label: 'Meals', to: '/meals', icon: '🍽️' },
  { label: 'Household', to: '/household', icon: '👨‍👩‍👧' },
  { label: 'Settings', to: '/settings', icon: '⚙️' },
  { label: 'User Guide', to: '/guide', icon: '📘' },
]
```

## Content Scope (what must be covered)

Based on REQUIREMENTS.md, the guide must explain:

| Feature Area | Requirements Covered | Key Topics |
|---|---|---|
| Getting Started | AUTH-01–04, HSHD-01 | Sign up, log in, create household |
| Adding Foods | FOOD-01–06 | USDA search, Open Food Facts search, custom foods |
| Building Recipes | RECP-01–06 | Create recipe, add ingredients, nested recipes, portions |
| Creating a Meal Plan | MEAL-01–06 | Create meal, build weekly plan, save template, swap meals |
| Tracking Your Day | TRCK-01–07, FOOD-03 | Log food, set targets, view daily summary, portion suggestions |
| Managing Your Household (admin) | HSHD-02–04 | Invite members, manage roles, transfer admin |

The quick-start card ("5 steps") should map to: 1) Sign in, 2) Add foods to your library, 3) Build a recipe, 4) Put it in a meal plan, 5) Log what you eat today.

## Data Structure Recommendation (Claude's Discretion)

Given ~6 sections with 4–8 steps each plus tips, the content should be a typed `const` array in `GuidePage.tsx` itself (not a separate file). Rationale:
- Content is not reused anywhere else — no need for a separate module
- Keeps the page self-contained; a future editor finds content in one place
- Avoids import chain for static data

Only extract to `guideContent.ts` if total file length exceeds ~300 lines and it becomes hard to navigate.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vite.config.ts (vitest inline config) |
| Quick run command | `npx vitest run tests/guide.test.ts --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOCS-01 | `/guide` route renders guide page | source-check | `npx vitest run tests/guide.test.ts -t "route"` | ❌ Wave 0 |
| DOCS-01 | All major feature sections present in guide content | source-check | `npx vitest run tests/guide.test.ts -t "sections"` | ❌ Wave 0 |
| DOCS-01 | "User Guide" nav link present in MobileDrawer | source-check | `npx vitest run tests/guide.test.ts -t "drawer"` | ❌ Wave 0 |
| DOCS-01 | "User Guide" nav link present in Sidebar | source-check | `npx vitest run tests/guide.test.ts -t "sidebar"` | ❌ Wave 0 |

Pattern follows existing `settings.test.tsx` which uses `fs.readFileSync` source-check assertions (no jsdom rendering needed for structural checks).

### Sampling Rate
- **Per task commit:** `npx vitest run tests/guide.test.ts --reporter=verbose`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/guide.test.ts` — covers DOCS-01 (route exists, sections present, nav links added)

## Sources

### Primary (HIGH confidence)
- `src/App.tsx` — Route pattern for adding `/guide` inside AppShell layout
- `src/components/layout/MobileDrawer.tsx` — Exact `drawerItems` array to extend
- `src/components/layout/Sidebar.tsx` — Exact `navItems` array to extend
- `src/components/layout/AppShell.tsx` — Confirms guide page needs no layout changes
- `src/pages/HouseholdPage.tsx` — Page layout pattern (px-4 py-8, max-w-lg, font-sans)
- `src/pages/SettingsPage.tsx` — Reference for full-page structure similar to guide
- `tests/settings.test.tsx` — Source-check test pattern to replicate for guide tests
- `.planning/REQUIREMENTS.md` — Definitive list of features the guide must cover

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` Accumulated Context — Phase decisions confirming current nav structure and feature state

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, existing stack confirmed from source
- Architecture: HIGH — all patterns verified directly from project source files
- Content scope: HIGH — derived from REQUIREMENTS.md (authoritative)
- Pitfalls: MEDIUM — based on common React accordion/content pitfalls and project-specific Phase 12 changes that removed FreeformLogModal

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable content phase, unlikely to be invalidated)
