# NourishPlan

## What This Is

A configurable meal planning platform for households with varying calorie targets, dietary goals, budgets, and schedules. The system collects inputs (preferences, constraints, inventory), generates optimized plans, validates outputs (nutrition, cost, feasibility), learns from feedback, and iterates weekly. Mobile-first PWA with a minimalist pastel design.

## Core Value

Families can plan meals that optimize nutrition, cost, time, and satisfaction for every household member under real-world constraints.

## Current Milestone: v2.0 Adaptive Meal Planning System (AMPS)

**Goal:** Transform NourishPlan from a meal tracking app into a constraint-solving meal planning platform that optimizes nutrition, cost, time, and satisfaction for multi-user households.

**Target features:**
- Budget Engine — cost per recipe/serving, weekly budget tracking and optimization
- Inventory Engine — pantry/fridge/freezer tracking with expiry priority, influences recipe selection
- Grocery Aggregation — auto-generated grocery lists from meal plans, categorized, flags existing inventory
- Prep Optimization — prep schedules, task sequencing, batch efficiency, equipment usage
- Schedule Model — work schedules, eating patterns, prep availability as planning constraints
- Feedback & Learning — recipe ratings, satiety tracking, repeat rate, adaptive future plans
- Constraint-based Planning Engine — weekly plan generation optimized against all constraints
- Dynamic Portioning — advanced portioning models beyond current suggestions
- Drag-and-drop Planner — UX upgrade for meal plan editing
- Child/selective eater support — expanded dietary accommodation

## Requirements

### Validated

- ✓ Food database search (USDA/CNF) plus manual custom food entry — v1.0
- ✓ Full food hierarchy: Foods → Recipes → Meals → Meal Plans — v1.0
- ✓ Recipe builder with ingredient quantities and auto-calculated nutrition per serving — v1.0
- ✓ Nested recipes (recipes can reference other recipes as ingredients) — v1.0
- ✓ Weekly meal plan templates that family members can follow or swap from — v1.0
- ✓ Household/group system — family members share the same meal plans — v1.0
- ✓ Per-person nutrition targets: calories, macros (P/C/F), micronutrients, custom goals — v1.0
- ✓ Auto-suggested portion sizes based on each person's targets — v1.0
- ✓ Manual portion logging with override — v1.0
- ✓ Daily nutrition summary per person (calories, macros, micros, custom goals) — v1.0
- ✓ Mobile-first responsive PWA design — v1.0
- ✓ Minimalist UI with pastel colour scheme and dark mode — v1.1

### Active

- [ ] Budget tracking — cost per recipe, weekly budget, cost per serving
- [ ] Inventory management — pantry/fridge/freezer with quantities and expiry priority
- [ ] Grocery list generation — auto-aggregated from meal plan, categorized, flags existing inventory
- [ ] Prep optimization — prep schedules, task sequencing, batch efficiency
- [ ] Schedule-aware planning — work schedules, eating patterns, prep availability as constraints
- [ ] Feedback & learning — recipe ratings, satiety, repeat rate, adaptive plan generation
- [ ] Constraint-based planning engine — generate plans optimized for nutrition + cost + time + satisfaction
- [ ] Dynamic portioning models — advanced per-person portion optimization
- [ ] Drag-and-drop meal planner — UX upgrade for plan editing
- [ ] Child/selective eater support — expanded dietary accommodation

### Out of Scope

- Native iOS/Android apps — mobile-first web (PWA) is sufficient
- Social/public recipe sharing — household-only; public content creates moderation burden
- Barcode scanning — deferred to future
- AI-driven optimization — requires preference signal accumulation; not useful on day one
- Cost-aware ingredient substitutions — future enhancement after budget engine is stable
- Smart prep automation — future enhancement after prep optimization is stable
- Learning system personalization — future enhancement after feedback engine has data

## Context

- Primary audience is families where one person typically plans meals and others follow along
- Children and adults in the same household have very different nutritional needs, so per-person targets are essential
- The food hierarchy (Foods → Recipes → Meals → Meal Plans) is the core data model that everything else builds on
- USDA FoodData Central + Canadian Nutrient File are the food data sources
- PWA deployed at nourishplan.gregok.ca via Vercel with Supabase backend
- v1.0 and v1.1 complete — 15 phases shipped, 66 requirements fulfilled
- v2.0 transforms this from a tracking app into a constraint-solving planning platform
- The system is NOT a recipe app — it is a constraint solver optimizing nutrition, cost, time, and satisfaction

## Constraints

- **Tech stack**: Vite + React 19 + Supabase + TanStack Query + Tailwind CSS 4 (established)
- **Data source**: USDA FoodData Central + Canadian Nutrient File
- **Design**: Minimalist, pastel colours, mobile-first responsive, dark mode supported
- **Platform**: Web-based PWA, no native mobile apps
- **Budget data**: Recipe cost estimates are user-entered (no real-time grocery price API in MVP)
- **Inventory**: Manual entry — no barcode scanning or receipt parsing in MVP

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Household-only sharing (no public) | Keeps v1 focused on the core family use case | — Pending |
| Full food hierarchy from day one | Core data model — retrofitting would be painful | — Pending |
| USDA + manual entry for nutrition data | USDA is free and comprehensive; manual covers custom/local foods | — Pending |
| Mobile-first PWA over native apps | Faster to ship, no app store gatekeeping, still installable | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-06 after Phase 19 (drag-and-drop planner) completion*
