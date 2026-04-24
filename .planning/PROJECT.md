# NourishPlan

## What This Is

A constraint-solving meal planning platform for multi-member households. Users configure budgets, inventory, schedules, dietary restrictions, and portion targets per household member; the system generates weekly meal plans optimised against all of those axes, auto-aggregates grocery lists that subtract pantry inventory, tracks cooking → inventory deduction + spend in real time, and supports granular admin/member role management. Mobile-first PWA with a minimalist pastel design, deployed at `nourishplan.gregok.ca`.

## Core Value

Families can plan meals that optimize nutrition, cost, time, and satisfaction for every household member under real-world constraints.

## Current Milestone: (planning next)

v2.0 AMPS shipped 2026-04-24. Next milestone to be defined via `/gsd-new-milestone`.

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
- ✓ Budget tracking — cost per recipe, weekly budget, cost per serving — v2.0
- ✓ Inventory management — pantry/fridge/freezer with quantities, expiry priority, barcode scanning — v2.0
- ✓ Grocery list generation — auto-aggregated from meal plan, categorised, subtracts inventory, household-shared with realtime sync — v2.0
- ✓ Prep optimization — batch prep summary, day-of sequencing, freezer-friendly flagging — v2.0
- ✓ Schedule-aware planning — per-member availability windows as planning constraints — v2.0
- ✓ Feedback & learning — recipe ratings, dietary restrictions, won't-eat tags, monotony warnings — v2.0
- ✓ Constraint-based planning engine — async generate-plan edge function with nutrition-gap detection and swap suggestions — v2.0
- ✓ Drag-and-drop meal planner — dnd-kit desktop + mobile with lock-badge — v2.0
- ✓ Tier-aware recipe selection (RecipeMixPanel) — v2.0 (D-02 pivot: replaced dynamic portioning with recipe tier weighting; portions remain calorie-target-driven)
- ✓ Universal recipe import — paste URL (blog or YouTube) or raw text → AI-extracted recipe — v2.0
- ✓ Cook Mode → inventory deduction + spend log + leftover save prompt — v2.0 (Phase 26 wiring)
- ✓ Schedule badges on PlanGrid (peach=consume, amber=quick, red=away) — v2.0 (Phase 27 wiring)
- ✓ Granular household permissions — admin/member roles with promotion, demotion, remove, self-leave, invite-time role selection, DB-enforced last-admin protection — v2.0 (Phase 30)

### Active

(None — next milestone pending.)

### Out of Scope

- Native iOS/Android apps — mobile-first web (PWA) is sufficient
- Social/public recipe sharing — household-only; public content creates moderation burden
- Real-time collaborative editing — last-write-wins is sufficient; families rarely edit simultaneously
- TDEE auto-calculation — users set their own targets; avoids liability and misinterpretation
- Weight/body tracking — outside core value
- AI-driven adaptive optimization — requires accumulated feedback signal; deferred to v3+
- Grocery delivery integration — external API dependency; out of scope for self-hosted PWA
- Grocery price API — recipe costs are user-entered; no real-time price feeds in v2.0
- Receipt scanning — complex OCR; barcode scanning covers the inventory entry use case
- Cost-aware ingredient substitutions — future enhancement after budget engine validates usage
- Smart prep automation — future enhancement after prep optimization validates usage
- Tier-based role hierarchy (admin / editor / viewer) — binary admin/member proved sufficient for 2–5-person families; per-feature capability scopes deferred
- Audit log / notifications for role changes — families are small; query-refetch gives visibility; no notification infrastructure

## Context

- Primary audience is families where one person typically plans meals and others follow along
- Children and adults in the same household have very different nutritional needs, so per-person targets are essential
- The food hierarchy (Foods → Recipes → Meals → Meal Plans) is the core data model that everything else builds on
- USDA FoodData Central + Canadian Nutrient File are the food data sources
- PWA deployed at nourishplan.gregok.ca via Vercel with Supabase backend
- v1.0 (7 phases) → v1.1 (8 phases) → v2.0 (15 phases) shipped — 30 total phases, ~110 requirements fulfilled
- **Current codebase (post v2.0):** ~24,500 LOC TypeScript across `src/`; 30 Supabase migrations; Vite 8 + React 19 + Supabase + TanStack Query + Tailwind CSS 4 + dnd-kit; PWA via vite-plugin-pwa/workbox; Playwright E2E infrastructure introduced in Phase 30
- The system is NOT a recipe app — it is a constraint solver optimizing nutrition, cost, time, and satisfaction
- Known tech debt carrying into next milestone: 22 deferred live-browser UATs (DnD gestures, touch drag, schedule grid picker, recipe-mix sliders, Cook Mode reconciliation live demo); IMPORT-03 YouTube transcript success rate unmeasured; 4 phases (27, 28, 29, 30) without VALIDATION.md (Nyquist sampling not enforced mid-milestone)

## Constraints

- **Tech stack**: Vite 8 + React 19 + Supabase + TanStack Query + Tailwind CSS 4 (established)
- **Data source**: USDA FoodData Central + Canadian Nutrient File
- **Design**: Minimalist, pastel colours, mobile-first responsive, dark mode supported
- **Platform**: Web-based PWA, no native mobile apps
- **Budget data**: Recipe cost estimates are user-entered (no real-time grocery price API)
- **Inventory**: Manual entry + barcode scanning (OFF API) — no receipt parsing
- **AI import**: URL import has bot-block fallback to paste-text; YouTube transcripts can fall through to D-10 fallback when captions are missing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Household-only sharing (no public) | Keeps focus on the core family use case | ✓ Good — validated across v1+v2 |
| Full food hierarchy from day one | Core data model — retrofitting would be painful | ✓ Good — all v2.0 features build on it cleanly |
| USDA + CNF + manual entry for nutrition data | Free, comprehensive; manual covers custom/local foods | ✓ Good — imported recipes slot in via same shape |
| Mobile-first PWA over native apps | Faster to ship, no app store gatekeeping, still installable | ✓ Good — PWA install works on iOS + Android |
| Centralised queryKeys.ts (Phase 16) | Prevents cache incoherence as hook count grew | ✓ Good — every v2.0 feature uses it, zero cache bugs |
| Ledger-based inventory with FIFO deduct (Phase 17) | Matches real-world pantry rotation; supports leftovers + expiry | ✓ Good — Phase 26 wired Cook Mode into it cleanly |
| Async plan generation via edge function (Phase 22) | UI returns immediately; long-running optimisation stays server-side | ✓ Good — works under real DB latency |
| D-02 pivot: tier-aware recipe selection instead of dynamic portioning (Phase 24) | Shipped value is recipe-mix tiers, not satiety-based portion-size adaptation; portions stay calorie-target-driven (PORT-01) | ✓ Good — simpler to reason about; RecipeMixPanel adopted |
| Binary admin/member roles, no tier hierarchy (Phase 30) | 2–5-person families don't need editor/viewer; reuses 17 existing admin RLS policies unchanged | ✓ Good — Playwright E2E proves promoted-admin equivalence |
| Last-admin protection at DB trigger level, not just RPC (Phase 30) | Any future code path that bypasses the RPC still can't brick a household | ✓ Good — "At least one admin required" enforced DB-side |
| Function-based unique indexes require manual upsert pattern (L-032) | `onConflict` PostgREST targets must match plain column lists; function indexes like `coalesce(member_user_id, member_profile_id)` cannot be targeted by column name | ⚠️ Revisit — scan remaining upsert call sites for similar mismatches |
| Retrospective VERIFICATION.md for skipped phases (Phase 29) | Treat docs as artifacts like code — reconcile during milestone close, not lose state | ✓ Good — audit-friendly trail |

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
*Last updated: 2026-04-24 after v2.0 AMPS milestone completion (30 phases shipped across v1.0 + v1.1 + v2.0)*
