# Phase 20: Feedback Engine & Dietary Restrictions - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Household members can rate recipes after eating them, set dietary restrictions, maintain a per-member won't-eat list, and see warnings when the meal plan becomes monotonous. AI assists with ingredient classification, pattern detection, recipe tagging, and swap suggestions. This phase accumulates the preference signal data that Phase 22 (Planning Engine) and Phase 24 (Dynamic Portioning) will consume.

</domain>

<decisions>
## Implementation Decisions

### Rating Flow
- **D-01:** End-of-day rating prompt — HomePage shows a "Rate today's meals" card for all cooked meals that day. Not triggered inline on Cook button.
- **D-02:** Persistent card until rated — the rating card stays on HomePage until all cooked meals for the day are rated. Gentle nudge, doesn't block anything.
- **D-03:** 1-5 star rating scale — standard granularity for AI to distinguish preference levels.
- **D-04:** Per-member optional ratings — primary cook rates by default, other members CAN add their own rating if they want. Low friction for small households.
- **D-05:** Satiety tracking deprioritized — user cares about calorie accuracy, not fullness signals. Omit explicit satiety input or make it minimal/optional. AI can infer satisfaction patterns from portion adjustments over time.

### AI Insights & Auto-Tags
- **D-06:** AI auto-tags recipes based on rating + satiety data — tags like "crowd-pleaser", "filling", "divisive" displayed on recipe cards.
- **D-07:** AI insights page — dedicated section showing pattern analysis (e.g., "Your family rates chicken dishes 4.2 avg vs pasta at 3.1"). Both inline tags on recipe cards AND a deeper insights page.
- **D-08:** AI-first approach throughout — leverage AI (via Supabase Edge Functions) for ingredient classification, pattern detection, restriction mapping, and swap suggestions rather than purely manual/rule-based systems.

### Dietary Restrictions UX
- **D-09:** Restrictions live in member profile section on Settings page — alongside name, avatar, nutrition targets. Dietary info is a personal attribute.
- **D-10:** Predefined categories + custom entries — checkboxes for common restrictions (gluten-free, dairy-free, nut allergy, vegetarian, vegan, halal, kosher) plus free-text custom entries.
- **D-11:** AI auto-maps restrictions to ingredients — when user selects "gluten-free", AI automatically identifies gluten-containing ingredients and adds them to the unified won't-eat list. Runs via Supabase Edge Function.
- **D-12:** Hybrid ingredient matching — use USDA/CNF food group metadata where available, fall back to AI classification for ambiguous or custom foods.
- **D-13:** Two-tier enforcement — true allergens (nut, shellfish) are hard-blocked from meal assignment. Diet preferences (vegetarian, gluten-free) are soft warnings. Allergens require explicit override confirmation dialog.
- **D-14:** Inline warning on SlotCard — warning icon/badge directly on meal plan slots containing restricted ingredients. Tap to see which member and which ingredient.

### Won't-Eat List & Flagging
- **D-15:** Free-text tags for won't-eat entries — user types food names (e.g., "mushrooms", "organ meat"). AI resolves free-text to matching recipe ingredients.
- **D-16:** Unified won't-eat list per member — one combined list merging AI auto-mapped restriction items and manual entries. Single source of truth.
- **D-17:** Three preference strength levels — each won't-eat entry has a strength: "dislikes" (warn), "refuses" (soft block), "allergy" (hard block). Works for both kids and adults.
- **D-18:** Separate "Issues" panel on Plan page — collapsible issues panel listing all won't-eat conflicts and dietary violations for the week. Less visual noise on individual slots.
- **D-19:** AI suggests won't-eat additions from rating patterns — if a member consistently rates recipes with ingredient X at 1-2 stars, AI suggests adding it to won't-eat list. User confirms.
- **D-20:** Parents manage child won't-eat lists — same unified list system, parent adds entries on behalf of child member profiles (MemberProfile.is_child).

### Monotony Detection & Warnings
- **D-21:** Dual monotony detection — simple recipe repeat rule (same recipe >2x in rolling 2-week window) for immediate warnings, plus AI variety score analyzing ingredient diversity, cuisine variety, and protein source rotation.
- **D-22:** Monotony warnings in Issues panel — same panel as won't-eat conflicts. All plan problems in one place.
- **D-23:** AI suggests swap alternatives — monotony warning includes "Swap suggestion: Try [recipe] instead" based on similar nutrition, household ratings, and available inventory. User taps to swap.

### Claude's Discretion
- Rating card UI design and animation on HomePage
- AI insight page layout and visualizations
- Exact predefined restriction category list
- AI Edge Function implementation details (model choice, prompt design, caching)
- Issues panel design and interaction patterns
- How AI variety score is computed and displayed
- Rating data model schema (recipe_ratings table structure)
- Won't-eat matching algorithm (fuzzy text → ingredient resolution)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Feedback — FEED-01 (recipe ratings + satiety), FEED-02 (dietary restrictions), FEED-03 (won't-eat tags), FEED-04 (monotony warnings)

### Downstream dependencies
- `.planning/ROADMAP.md` §Phase 22 — Constraint-Based Planning Engine consumes feedback weighting, dietary restrictions, and won't-eat lists
- `.planning/ROADMAP.md` §Phase 24 — Dynamic Portioning consumes satiety/feedback history

### Prior phase context
- `.planning/phases/16-budget-engine-query-foundation/16-CONTEXT.md` — Cook button implementation (D-13), query key centralisation pattern (D-15, D-16)
- `.planning/phases/17-inventory-engine/17-CONTEXT.md` — CookDeductionReceipt flow (D-24), MemberProfile patterns
- `.planning/phases/19-drag-and-drop-planner/19-CONTEXT.md` — SlotCard component structure (D-01), locked slot UX patterns

### Existing code
- `src/components/recipe/RecipeBuilder.tsx` — Mark as Cooked flow, CookDeductionReceipt integration
- `src/components/plan/SlotCard.tsx` — Slot card where inline warnings display
- `src/components/plan/PlanGrid.tsx` — Plan page grid where Issues panel will attach
- `src/pages/SettingsPage.tsx` — Settings page where dietary restrictions section will be added
- `src/types/database.ts` — MemberProfile type (is_child, birth_year), FoodLog type, Recipe type
- `src/lib/queryKeys.ts` — Centralised query keys for new hooks

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FoodSearchOverlay` component — could be adapted for won't-eat food search if needed in future
- `CookDeductionReceipt` component — pattern for post-cook interaction flow
- `useProfile` / `useHousehold` hooks — member profile data access for dietary restrictions
- `queryKeys.ts` — centralised query keys ready for new `ratings`, `restrictions`, `wontEat` keys
- `useFoodLogs` hook — food log data for rating correlation analysis

### Established Patterns
- TanStack Query hooks with `enabled: !!householdId` pattern
- Supabase Edge Functions for server-side AI processing (existing pattern from food verification)
- Realtime subscriptions (used in grocery list) — could apply to shared rating updates
- SlotCard badge system (lock icon, nutrition rings) — extensible for warning badges

### Integration Points
- HomePage — new "Rate today's meals" card component
- SettingsPage — new dietary restrictions section per member profile
- PlanGrid/PlanPage — new Issues panel component
- SlotCard — inline warning badges for restriction violations
- RecipeCard — AI auto-tag display
- Recipe detail view — rating display and insights

</code_context>

<specifics>
## Specific Ideas

- "This should be AI first" — user wants AI to be the primary mechanism for ingredient classification, pattern detection, and recommendations, not purely manual/rule-based systems.
- Satiety is explicitly deprioritized — calorie count accuracy matters more than fullness signals. AI can infer satisfaction from portion adjustments over time rather than explicit user input.
- Three-tier preference strength (dislikes/refuses/allergy) applies to both kids and adults — a unified system, not separate child vs adult treatment.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 20-feedback-engine-dietary-restrictions*
*Context gathered: 2026-04-06*
