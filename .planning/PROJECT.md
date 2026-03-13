# NourishPlan

## What This Is

A mobile-first web app for families to build shared meal plans, track nutrition, and log individual portions. Each family member has personal calorie/macro targets, and the system suggests how much of each meal they should eat. Minimalist design with a pastel colour scheme — function over form.

## Core Value

Families can share one meal plan while each person gets personalized portion suggestions based on their individual nutritional targets.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Food database search (USDA) plus manual custom food entry
- [ ] Full food hierarchy: Foods → Recipes → Meals → Meal Plans
- [ ] Recipe builder with ingredient quantities and auto-calculated nutrition per serving
- [ ] Nested recipes (recipes can reference other recipes as ingredients)
- [ ] Weekly meal plan templates that family members can follow or swap from
- [ ] Household/group system — family members share the same meal plans
- [ ] Per-person nutrition targets: calories, macros (P/C/F), micronutrients, custom goals
- [ ] Auto-suggested portion sizes based on each person's targets
- [ ] Manual portion logging with override (e.g., "I ate 1.5 servings")
- [ ] Daily nutrition summary per person (calories, macros, micros, custom goals)
- [ ] Nutrition breakdown generated for each recipe in a meal plan
- [ ] Mobile-first responsive PWA design
- [ ] Minimalist UI with pastel colour scheme

### Out of Scope

- Native iOS/Android apps — mobile-first web (PWA) is sufficient for v1
- Social/public recipe sharing — v1 is household-only
- Grocery list generation — deferred to v2
- Leftovers tracking — deferred to v2
- Weekly nutrition reports — deferred to v2
- Barcode scanning — deferred to v2

## Context

- Primary audience is families where one person typically plans meals and others follow along
- Children and adults in the same household have very different nutritional needs, so per-person targets are essential
- The food hierarchy (Foods → Recipes → Meals → Meal Plans) is the core data model that everything else builds on
- USDA FoodData Central API is the standard free nutrition database for this kind of app
- PWA approach allows "install to home screen" on mobile without app store distribution

## Constraints

- **Tech stack**: To be determined by research phase
- **Data source**: USDA FoodData Central as primary nutrition database
- **Design**: Minimalist, pastel colours, mobile-first responsive
- **Platform**: Web-based PWA, no native mobile apps

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Household-only sharing (no public) | Keeps v1 focused on the core family use case | — Pending |
| Full food hierarchy from day one | Core data model — retrofitting would be painful | — Pending |
| USDA + manual entry for nutrition data | USDA is free and comprehensive; manual covers custom/local foods | — Pending |
| Mobile-first PWA over native apps | Faster to ship, no app store gatekeeping, still installable | — Pending |

---
*Last updated: 2026-03-12 after initialization*
