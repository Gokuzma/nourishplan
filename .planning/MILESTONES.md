# NourishPlan — Milestone Log

Historical record of shipped versions. Most recent at top.

---

## v2.0 AMPS + Universal Recipe Import + Granular Permissions

**Shipped:** 2026-04-24
**Phases:** 15 (16–30) | **Plans:** 70 | **Commits:** 412 | **Duration:** 30 days (2026-03-25 → 2026-04-24)

### Delivered

Transformed NourishPlan from a meal tracking app into a constraint-solving meal planning platform.

### Key Accomplishments

1. **Constraint-solving Planning Engine** — async `generate-plan` edge function optimises across nutrition, budget, schedule, dietary restrictions, tier weighting, and inventory priority (Phase 22)
2. **End-to-end inventory lifecycle** — pantry/fridge/freezer with ledger-based quantities, FIFO deduct on cook, leftover save flow, barcode scanning (Phase 17 + Phase 26 wiring)
3. **Household-shared grocery list** with realtime sync, pantry subtraction, store-aisle categorisation, and in-store check-off (Phase 18)
4. **Drag-and-drop weekly planner** with locked-slot preservation via dnd-kit + schedule badges (Phase 19 + Phase 27 wiring)
5. **Universal recipe import** — URL + paste-text + YouTube transcript extraction via `import-recipe` edge function (Phase 25)
6. **Granular household roles** — admin/member RPCs, DB-enforced last-admin protection, invite-time role selection, first Playwright E2E regression test in the repo (Phase 30)
7. **Budget engine** — ingredient-level cost entry, recipe cost per serving, weekly spend vs budget on Plan page (Phase 16)

### Key Decisions

- **D-02 pivot** (Phase 24): tier-aware recipe selection instead of satiety-adaptive dynamic portioning. Portions stay calorie-target-driven (PORT-01). RecipeMixPanel three-slider component replaced portion-size adaptation.
- **Binary admin/member roles** (Phase 30): reuses 17 existing admin RLS policies unchanged; no tier hierarchy needed for 2–5-person families.
- **Last-admin protection at DB trigger level** (Phase 30): any future code path that bypasses the RPC still cannot brick a household.
- **Centralised queryKeys.ts** (Phase 16): prevents cache incoherence as hook count grew; every v2.0 feature uses it.
- **Async plan generation via edge function** (Phase 22): UI returns immediately; long-running optimisation stays server-side.

### Issues Closed

- **FEED-02 dietary restrictions save 400** (open since Phase 20) — upsert `onConflict` mismatch with migration 024's function-based unique index. Fixed with query-then-update-or-insert pattern. L-032 captured.
- **Cook Mode `/cook/:mealId` recipe resolution** (pre-existing) — now resolves recipe_ids from `meal_items` when entering from a plan slot.

### Known Tech Debt Carried Forward

- **22 deferred live-browser UATs** (DnD gestures, touch drag, schedule grid picker, recipe mix sliders, OS notifications, Cook Mode reconciliation demo) — pre-declared, documented in `milestones/v2.0-MILESTONE-AUDIT.md` `deferred_human_verification`
- **IMPORT-03 YouTube transcript success rate** unmeasured (one UAT sample hit D-10 fallback); remains Partial
- **4 phases without VALIDATION.md** (27, 28, 29, 30) — Nyquist sampling not enforced mid-milestone; every phase has VERIFICATION.md providing primary quality signal
- **Known deferred items at close:** 8 (5 v2.0 phases + 3 pre-v2 human_needed verifications from older milestones — see STATE.md Deferred Items)

### Traceability

**Final v2.0 Traceability:** 43/44 Validated + 1 Partial (IMPORT-03)
**110 total requirements** across v1.0 (50) + v1.1 (16) + v2.0 (44) — **109/110 Validated**.

Full archive:
- [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md) — phase details + accomplishments
- [milestones/v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md) — requirement snapshot
- [milestones/v2.0-MILESTONE-AUDIT.md](milestones/v2.0-MILESTONE-AUDIT.md) — pre-close audit
- [milestones/v2.0-UAT-RESULTS.md](milestones/v2.0-UAT-RESULTS.md) — initial Playwright UAT sprint
- [milestones/v2.0-UAT-RESULTS-2.md](milestones/v2.0-UAT-RESULTS-2.md) — 3-pass post-Phase-30 UAT sprint + Cook Mode bug fix

---

## v1.1 UI Polish & Usability

**Shipped:** 2026-03-18
**Phases:** 8 (8–15) | **Plans:** 15 | **Duration:** 3 days (2026-03-15 → 2026-03-18)

### Delivered

UI polish and usability improvements on the v1.0 MVP.

### Key Accomplishments

1. **Dark mode** with proper ring colours and contrast (Phase 8)
2. **Per-slot nutrition rings** on MealPlan SlotCards (Phase 8)
3. **CNF measurement units** (cups, tbsp, pieces) for food logging (Phase 8)
4. **Mobile "More" drawer** navigation (Phase 8)
5. **Settings expansion** — profile, avatar, household name (Phase 8)
6. **Macro percentage scaling** with P+C+F=100% validation (Phase 8)
7. **Home page food logging** — Food tab removed, search integrated on home (Phase 12)
8. **Recipe notes + dates** + meal plan print + start-date picker (Phase 13)
9. **Deletion management** for meals/recipes/foods (Phase 13)
10. **Account deletion** with household transfer (Phase 13)
11. **In-app How-To manual** (Phase 14)

*Retroactively archived during v2.0 milestone close 2026-04-24. Files still in `.planning/phases/08-*` through `.planning/phases/15-*`.*

---

## v1.0 MVP

**Shipped:** 2026-03-15
**Phases:** 7 (1–7) | **Plans:** 35 | **Duration:** 3 days (2026-03-13 → 2026-03-15)

### Delivered

Initial release of NourishPlan — a family nutrition planning PWA at nourishplan.gregok.ca.

### Key Accomplishments

1. **Auth + household system** — email/password, password reset, household create/invite/join, RLS isolation (Phase 1 + Phase 7)
2. **Food database** — USDA FoodData Central + Canadian Nutrient File + custom foods with per-100g normalisation + AI verification (Phase 2)
3. **Recipe builder** — ingredients with quantities, nested recipes, raw/cooked weight states, auto-calculated per-serving nutrition (Phase 2)
4. **Meal planning** — weekly meal plan grid (Breakfast/Lunch/Dinner/Snacks), household-shared plans, swap/template system, per-person nutrition targets (Phase 3)
5. **Daily logging + summary** — portion logging with override, offline PWA, nutrition progress vs targets (Phase 4)
6. **Portion suggestions** — auto-suggested per-person portion sizes driven by calorie targets (Phase 5)
7. **Production launch** — deployed at nourishplan.gregok.ca, branded splash, OG tags, 404 page, portfolio card, invite-only signups (Phase 6)

*Retroactively archived during v2.0 milestone close 2026-04-24. Files still in `.planning/phases/01-*` through `.planning/phases/07-*`.*

---

*Milestone log created 2026-04-24 during v2.0 close. Prior milestones (v1.0, v1.1) retroactively logged for historical completeness.*
