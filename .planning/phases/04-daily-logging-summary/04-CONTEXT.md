# Phase 4: Daily Logging & Summary - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Each household member can log what they ate with portion sizes, see a daily nutrition summary comparing actuals to their personal targets, and the app becomes an installable PWA with cached shell for offline resilience. No per-person portion suggestions (Phase 5), no weekly reports (v2), no full offline data operations.

</domain>

<decisions>
## Implementation Decisions

### Logging interaction
- Two logging modes: plan-based (primary) and freeform (via '+' button for unplanned items)
- Plan-based: tap a meal in today's plan to log it with a portion size
- Portion input: stepper (- / +) defaulting to 1.0 servings, with quick-tap presets (0.5, 1.0, 1.5, 2.0) and manual text entry
- Per-meal logging is the default; a "Log all as planned" shortcut marks all unlogged meals as 1.0 servings in one tap
- Freeform logging reuses the existing FoodSearch overlay (USDA/OFF/My Foods/Recipes tabs), then prompts for quantity
- Default portion is always 1.0 servings — no target-based suggestions until Phase 5
- Any household member can log for any other member via the member selector (parents log for children)

### Daily summary view
- Lives on the Home page (replaces current welcome/household info)
- Large progress rings for calories, protein, carbs, fat at top (reuse existing ProgressRing component)
- Below rings: chronological list of logged meals/foods with portion and calorie contribution (tappable for full nutrition)
- Below meals list: collapsible nutrient breakdown section showing micros and custom goals actual vs target
- Date picker to navigate to any past day's summary (defaults to today)
- Member selector to view other members' summaries

### Offline & PWA
- Minimal offline: cache the app shell for fast loads, no offline data operations
- Inline banner at top of screen when offline; cached pages display read-only
- Action buttons show "Available when online" tooltip on tap when offline
- PWA install prompt shown after the user completes their first action (non-intrusive, appears once)
- Custom app icon (sage green with simple leaf/plate motif) and splash screen matching pastel theme
- PWA manifest with proper theme color, background color, display: standalone

### Log editing & history
- Users can edit portion size or delete any log entry by tapping it
- Unlimited history — view and edit any past day's logs via date picker
- Retroactive logging supported — navigate to a past date and log meals there
- Logs are household-visible by default — any member can view any other member's daily summary
- Per-log privacy toggle: members can mark individual log entries as private (hidden from other household members)

### Claude's Discretion
- Log entry data model schema (tables, columns, relationships)
- Service worker caching strategy and workbox configuration
- PWA icon design and splash screen layout
- Exact offline detection mechanism
- How "Log all as planned" determines which meals are unlogged
- Privacy toggle UI placement and storage
- Date picker component choice
- Summary animation/transition details

</decisions>

<specifics>
## Specific Ideas

- The home page should become the daily dashboard — the first thing users see is how they're tracking today
- "Log all as planned" is a power-user shortcut — families who eat what's planned can log the whole day in one tap
- Per-log privacy is important for family dynamics — teens/adults may want to hide some entries while still participating in the shared meal plan
- The portion stepper presets (0.5, 1.0, 1.5, 2.0) cover 90% of real-world logging without requiring typing
- Phase 5 will add smart portion suggestions — Phase 4 is just recording what actually happened

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/plan/ProgressRing.tsx`: Ring visualization for target vs actual — reuse for daily summary rings
- `src/components/plan/MemberSelector.tsx`: Member switching UI — reuse for log viewing and logging-for-others
- `src/components/food/FoodSearch.tsx`: Tabbed search overlay — reuse for freeform log entry
- `src/components/plan/DayCard.tsx`: Day card layout — integration point for log status indicators
- `src/hooks/useNutritionTargets.ts`: Fetches member targets — needed for summary comparison
- `src/hooks/useMealPlan.ts` / `useMealPlanSlots.ts`: Planned meals data — needed for plan-based logging
- `src/utils/nutrition.ts`: Nutrition calculation utilities — extend for log summation

### Established Patterns
- TanStack Query useQuery/useMutation wrapping Supabase client calls
- `meal_items` stores per-100g macro snapshot columns at insert time — log entries should follow same pattern
- RLS with security-definer helpers (`get_user_household_id()`, `get_user_household_role()`)
- Mobile-first responsive with hidden md:flex pattern
- Tailwind CSS 4 with @theme tokens (sage/cream/peach palette)

### Integration Points
- `src/pages/HomePage.tsx`: Transform from welcome page to daily dashboard
- `src/App.tsx`: May need new routes if log detail views are separate pages
- `supabase/migrations/`: New migration for food_logs table with RLS policies
- `vite.config.ts`: Add vite-plugin-pwa configuration
- `public/`: PWA manifest, icons, and splash screen assets

</code_context>

<deferred>
## Deferred Ideas

- Per-person portion suggestions based on targets — Phase 5 (TRCK-05)
- Weekly nutrition reports — v2 (REPT-01)
- Full offline data operations with sync — descoped to minimal shell caching for v1

</deferred>

---

*Phase: 04-daily-logging-summary*
*Context gathered: 2026-03-13*
