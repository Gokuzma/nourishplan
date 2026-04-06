# NourishPlan

## What This Is

A mobile-first PWA for families to build shared meal plans, track nutrition, and log individual portions — live at nourishplan.gregok.ca. Each family member has personal calorie/macro targets with portion suggestions. Features dark mode, fuzzy food search (USDA + Canadian Nutrient File), recipe builder with nested recipes, weekly meal planning with print support, daily nutrition logging with micronutrient drill-down, account management, and an in-app user guide. Minimalist design with pastel colour scheme — function over form.

## Core Value

Families can share one meal plan while each person gets personalized portion suggestions based on their individual nutritional targets.

## Requirements

### Validated

- ✓ Food database search (USDA + CNF) plus manual custom food entry — v1.1
- ✓ Full food hierarchy: Foods → Recipes → Meals → Meal Plans — v1.0
- ✓ Recipe builder with ingredient quantities and auto-calculated nutrition per serving — v1.0
- ✓ Nested recipes (recipes can reference other recipes as ingredients) — v1.0
- ✓ Weekly meal plan templates that family members can follow or swap from — v1.0
- ✓ Household/group system — family members share the same meal plans — v1.0
- ✓ Per-person nutrition targets: calories, macros (P/C/F), micronutrients, custom goals — v1.0
- ✓ Auto-suggested portion sizes based on each person's targets — v1.0
- ✓ Manual portion logging with override (e.g., "I ate 1.5 servings") — v1.0
- ✓ Daily nutrition summary per person (calories, macros, micros, custom goals) — v1.1
- ✓ Nutrition breakdown generated for each recipe in a meal plan — v1.0
- ✓ Mobile-first responsive PWA design — v1.0
- ✓ Minimalist UI with pastel colour scheme — v1.0
- ✓ Dark mode with theme tokens and proper contrast — v1.1
- ✓ Mini nutrition rings on meal plan slots — v1.1
- ✓ Mobile drawer navigation — v1.1
- ✓ Macro percentage scaling on nutrition targets — v1.1
- ✓ Recipe notes/dates, meal plan start date picker, print meal plan — v1.1
- ✓ Inline deletion for meals, recipes, foods — v1.1
- ✓ Account deletion with admin transfer — v1.1
- ✓ In-app how-to user guide — v1.1
- ✓ Deployed at nourishplan.gregok.ca with invite-only auth — v1.0

### Active

- [ ] Grocery list auto-generated from meal plan ingredients
- [ ] Weekly nutrition summary reports per person
- [ ] Nutrition trend charts over time

### Out of Scope

- Native iOS/Android apps — mobile-first PWA is sufficient
- Social/public recipe sharing — household-only scope
- Leftovers tracking — deferred to future milestone
- Barcode scanning — deferred to future milestone
- TDEE auto-calculation — users set their own targets
- Weight/body tracking — outside core value
- AI meal plan generation — requires preference signal accumulation

## Context

- Primary audience is families where one person typically plans meals and others follow along
- Children and adults in the same household have very different nutritional needs, so per-person targets are essential
- The food hierarchy (Foods → Recipes → Meals → Meal Plans) is the core data model that everything else builds on
- Dual food databases: USDA FoodData Central + Canadian Nutrient File (CNF) with fuzzy search scoring
- PWA deployed at nourishplan.gregok.ca with invite-only auth
- 10,832 lines of TypeScript/TSX across 277 commits
- Tech stack: Vite 8 + React 19 + Supabase + TanStack Query + Tailwind CSS 4

## Constraints

- **Tech stack**: Vite 8, React 19, Supabase, TanStack Query, Tailwind CSS 4
- **Data source**: USDA FoodData Central + Canadian Nutrient File as nutrition databases
- **Design**: Minimalist, pastel colours, dark mode, mobile-first responsive
- **Platform**: Web-based PWA at nourishplan.gregok.ca, no native mobile apps
- **Auth**: Invite-only (signups disabled)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Household-only sharing (no public) | Keeps v1 focused on the core family use case | ✓ Good |
| Full food hierarchy from day one | Core data model — retrofitting would be painful | ✓ Good |
| USDA + CNF dual databases | USDA is comprehensive; CNF covers Canadian foods; OFF removed in v1.0 | ✓ Good |
| Mobile-first PWA over native apps | Faster to ship, no app store gatekeeping, still installable | ✓ Good |
| Vite 8 + React 19 + Supabase + TanStack Query | Latest stable, proven stack, excellent DX | ✓ Good |
| Per-100g normalization at ingest | Consistent nutrition calculations across all sources | ✓ Good |
| Postgres RLS for household isolation | Security at database level, not application layer only | ✓ Good |
| food_logs stores per-serving macros (not per-100g) | Matches user mental model, simplifies portion editing | ✓ Good |
| meal_items stores macro snapshots at insert time | Avoids live re-resolution of external food sources | ✓ Good |
| Invite-only auth for launch | Controls user base during early deployment | ✓ Good |
| Dark mode with CSS theme tokens | Adapts all components including progress rings and overlays | ✓ Good |
| Account deletion via Supabase Edge Function | Service-role key needed for cascading deletes; JWT-only auth prevents privilege escalation | ✓ Good |
| Fuzzy search scoring for food search | Prioritizes simple ingredients over CNF-prefixed results | ✓ Good |

---
*Last updated: 2026-04-05 after v1.1 milestone*
