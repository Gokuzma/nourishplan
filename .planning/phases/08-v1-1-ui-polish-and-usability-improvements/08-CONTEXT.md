# Phase 8: v1.1 UI Polish and Usability Improvements - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish pass on existing features: fix dark mode visual issues across all components, add nutrition rings to meal plan grid, introduce realistic measurement units throughout the app, add mobile navigation via hamburger drawer, expand Settings with inline profile/household editing, and add macro % scaling to nutrition targets. No new food hierarchy features, no new data sources, no new pages beyond what exists.

</domain>

<decisions>
## Implementation Decisions

### Dark mode & ring colors
- ProgressRing currently uses hardcoded #A8C5A0 (sage) and #E8B4A2 (peach) — replace with theme-aware lighter/brighter variants that pop on dark backgrounds, same hue family with adjusted lightness
- Full dark mode audit across all components (cards, modals, inputs, nav, borders, text contrast) — fix anything that doesn't look right in dark theme
- Add nutrition rings to meal plan grid: day-total ring at top of each DayCard + tiny per-slot mini rings on individual meal slots
- Day-total rings show 4 rings: calories + protein + carbs + fat
- Per-slot mini rings show how much of daily target that meal covers

### Measurement units & portions
- Show common household measurement units (cups, tbsp, pieces, slices) everywhere: logging, recipe builder, meal plan display, nutrition summary
- Only show units the data source actually provides — no guessing or suggesting units without backing data
- USDA/CNF portion descriptions (e.g., "1 medium banana", "1 cup chopped") used when available
- Custom foods: user defines available units with gram equivalents when creating the food
- Default to the USDA/CNF "household serving" unit in the portion stepper (e.g., "1 cup" for rice). Fall back to grams when no household serving data exists
- Nutrition calculations still use per-100g internally — units are a display/input layer

### Mobile settings & navigation
- Add a "More" / hamburger icon as the last item in the mobile TabBar (replacing one of the current 5 tabs or adding a 6th)
- Tapping opens a slide-out drawer with all nav items: Settings, Household, and Log Out (plus any items not in TabBar)
- Settings page expanded with inline editing sections: display name, avatar upload, email (read-only or with re-verification), household name, theme toggle, log out
- Display name field added to user profiles — shown in household member list and member selector
- Avatar upload: profile photo stored in Supabase Storage, displayed in Settings and anywhere member identity appears

### Macro % scaling
- Toggle on nutrition targets form to switch between entering absolute grams or percentage of calories for protein, carbs, fat
- Changing calorie target when macros are set as % triggers a confirmation prompt: "Update macro grams to match new calorie target?"
- Enforce that P% + C% + F% = 100% — show error if they don't sum correctly
- Same toggle available for all member types including managed child profiles
- Editing either grams or % recalculates the other in real time while in that mode

### Claude's Discretion
- Exact dark mode color values for ring variants and component fixes
- Which TabBar tab to replace with "More" (or whether to add a 6th slot)
- Drawer animation and styling
- Avatar size limits, accepted formats, and Supabase Storage bucket config
- How to surface unit options in the portion stepper UI
- DB schema changes needed for display_name, avatar_url, and custom food units
- Migration strategy for adding measurement unit data to existing foods/recipes

</decisions>

<specifics>
## Specific Ideas

- Ring colors should stay in the same sage/peach hue family — just brighter for dark backgrounds, not a completely different palette
- Measurement units must be accurate — never suggest a unit the data source doesn't actually provide
- CNF is the primary data source (user is Canadian) — CNF portion data takes priority over USDA when both exist
- The "More" drawer should feel native — similar to how iOS apps handle overflow navigation from a tab bar
- Macro % enforcement at 100% prevents user confusion from accidental mis-allocation

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/plan/ProgressRing.tsx`: SVG ring component — needs color prop to accept theme-aware values instead of hardcoded hex
- `src/components/plan/DayCard.tsx`: Day card layout — integration point for day-total and per-slot rings
- `src/components/plan/SlotCard.tsx`: Individual meal slot — integration point for mini rings
- `src/components/log/PortionStepper.tsx`: Portion input — needs unit selector dropdown
- `src/components/targets/NutritionTargetsForm.tsx`: Targets form — add grams/% toggle
- `src/components/layout/TabBar.tsx`: Mobile nav — add "More" item with drawer trigger
- `src/components/layout/Sidebar.tsx`: Desktop nav — already has all nav items, drawer can mirror this
- `src/pages/SettingsPage.tsx`: Currently only theme toggle + logout — expand with profile/household sections
- `src/utils/theme.ts`: Theme toggle utility — may need dark mode CSS variable additions

### Established Patterns
- Tailwind CSS 4 with @theme tokens (sage/cream/peach palette) — dark mode via `dark:` variant classes
- TanStack Query useQuery/useMutation wrapping Supabase client calls
- Per-100g normalization for all nutrition data — units are a display layer on top
- `meal_items` stores per-100g macro snapshot at insert time
- RLS with security-definer helpers (`get_user_household_id()`)
- Supabase auth for user identity — display_name/avatar_url likely stored in profiles table or auth.users metadata

### Integration Points
- `src/components/plan/PlanGrid.tsx`: Parent of DayCards — may need to pass nutrition data for rings
- `src/hooks/useNutritionTargets.ts`: Needs macro_mode field (grams vs percent) support
- `src/hooks/useFoodSearch.ts`: Needs to return portion/unit data from USDA/CNF alongside nutrition
- Supabase edge functions (search-usda, search-cnf): Need to return portion descriptions in response
- `supabase/migrations/`: New migration for display_name, avatar_url, custom food units, macro_mode columns

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-v1-1-ui-polish-and-usability-improvements*
*Context gathered: 2026-03-15*
