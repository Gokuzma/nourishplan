# Phase 14: How-To Manual - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Provide an in-app how-to guide that explains how to use all features of NourishPlan. The guide is a **living source of truth** — it defines how features should work. When features change, the guide must be updated; when the guide is updated, features should match.

</domain>

<decisions>
## Implementation Decisions

### Content structure
- Organized by **user journey**: Getting Started → Adding Foods → Building Recipes → Creating a Meal Plan → Tracking Your Day
- Quick-start summary at the top ("Get started in 5 steps") before detailed sections
- Dedicated section for household admin tasks (inviting members, managing roles, transferring admin) — separate from main flow
- **Step-by-step walkthroughs** for each topic — numbered steps detailed enough for first-time users

### Presentation format
- **Dedicated page** at `/guide` route — full page similar to Settings
- **Accordion/collapsible sections** — each topic expands on tap, keeps page scannable on mobile
- **Text only** — no screenshots or illustrations, easier to maintain across theme changes
- Include **tip callouts** for non-obvious features (e.g., "Tip: You can use a recipe as an ingredient in another recipe")

### Access & navigation
- **"User Guide"** link in the MobileDrawer AND the desktop Sidebar — accessible from any page on all screen sizes
- **Deep-linkable sections** with anchor hashes (e.g., `/guide#recipes`) — allows linking to specific topics from elsewhere in the app

### Tone & writing style
- **Friendly & casual** tone — "Tap the + button to search for a food" — feels like a friend showing you around
- Each section begins with a brief **"what & why"** intro (1-2 sentences explaining what the feature is and why you'd use it) before numbered steps
- Main content addresses a **general household member** — admin tasks in their own separate section

### Living document principle
- Guide is the **source of truth** for how features work
- When features are added or changed → update the guide
- When guide text is updated → check if the feature implementation needs to match
- Guide changes require user approval before finalizing

### Claude's Discretion
- Whether to use a separate data file or hardcode content in the component (decide based on content volume)
- Exact wording and step counts per section
- Which features deserve "pro tip" callouts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### App structure
- `.planning/REQUIREMENTS.md` — All feature requirements (AUTH, HSHD, FOOD, RECP, MEAL, TRCK, PLAT, LAUNCH, POLISH) that the guide must cover
- `.planning/PROJECT.md` — Core value proposition and user context

### Navigation
- `src/components/layout/MobileDrawer.tsx` — Where "User Guide" link needs to be added
- `src/components/layout/Sidebar.tsx` — Desktop sidebar for guide link
- `src/App.tsx` — Route definitions, add `/guide` route

### Existing pages (reference for content accuracy)
- `src/pages/HomePage.tsx` — Food logging flow
- `src/pages/RecipesPage.tsx` / `src/pages/RecipePage.tsx` — Recipe management
- `src/pages/PlanPage.tsx` — Meal planning
- `src/pages/MealsPage.tsx` / `src/pages/MealPage.tsx` — Meal management
- `src/pages/SettingsPage.tsx` — Settings, profile, household management
- `src/pages/HouseholdPage.tsx` / `src/pages/HouseholdSetup.tsx` — Household flows
- `src/pages/MemberTargetsPage.tsx` — Nutrition targets

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppShell` layout component wraps all authenticated pages — guide page should use it
- `MobileDrawer` already has navigation items — add "User Guide" entry
- `Sidebar` has navigation items for desktop — add matching entry
- React Router with `<Route>` components in App.tsx — add `/guide` route

### Established Patterns
- Pages are in `src/pages/` as `{Name}Page.tsx`
- Components are organized by feature area in `src/components/`
- Mobile-first responsive design with Tailwind CSS
- Dark mode support via theme tokens throughout

### Integration Points
- Route added to `src/App.tsx` inside the authenticated layout route
- MobileDrawer and Sidebar get new "User Guide" nav item
- New page: `src/pages/GuidePage.tsx`
- New component(s): `src/components/guide/` directory for accordion sections

</code_context>

<specifics>
## Specific Ideas

- Quick-start at the top: a "5 steps to get going" summary before the detailed sections
- User journey order: Getting Started → Adding Foods → Building Recipes → Creating a Meal Plan → Tracking Your Day → Managing Your Household (admin)
- Tip callouts for power features like nested recipes, portion suggestions, meal plan printing
- The guide is a tool to optimize the user journey — not just passive help text

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-how-to-manual*
*Context gathered: 2026-03-17*
