# Phase 23: Prep Optimisation - Discussion Log

**Date:** 2026-04-10
**Mode:** Interactive (default discuss)
**Areas discussed:** 8 (4 initial + 4 follow-up)

This is the full audit trail of the discuss-phase Q&A that produced `23-CONTEXT.md`. For decision rationale, see CONTEXT.md. This file exists for human reference (audits, compliance, replaying the conversation).

---

## Gray Area Selection (Round 1)

**Question:** Which gray areas do you want to discuss for Phase 23 (Prep Optimisation)?

**Options presented:**
1. Task sequence data source — Recipes have no instructions/step durations yet. PREP-02 needs step-by-step timing. Should AI generate, manual entry, or hybrid?
2. Freezer-friendly flag origin — PREP-03 needs a freezer_friendly flag on recipes. AI classify, manual toggle, or hybrid?
3. Batch prep grouping logic — PREP-01 says "grouped by shared ingredients or equipment". How?
4. Prep UI surfaces — Where does the batch prep summary live, and how to open a day-of task sequence?

**Selected:** All four (1, 2, 3, 4)

---

## Area 1: Task sequence data source

### Q1.1 — Where should per-step instructions and durations come from?

Options:
- AI generates on demand (recommended)
- AI generates on recipe save
- User enters manually
- Hybrid: AI + user edit

**Answer (free text):** "AI will generate based on existing recipe form import if it exists already it will just pout into the standard format, if it doesnt exist it will create it based on best practises and good cooking."

**Interpretation:** AI generates the steps. If the recipe has existing imported instructions (e.g., from Phase 25 Universal Recipe Import or the freeform `notes` field), AI parses them into the standard rich-step format. Otherwise AI creates from name + ingredients using cooking best practices.

### Q1.2 — What should each step look like in the data model?

Options:
- Text + duration + blocking flag (recommended)
- Text + duration only
- Text only

**Answer:** Text + duration + blocking flag

### Q1.3 — How should duration estimates be calibrated for a household?

Options:
- AI estimates, no calibration (recommended)
- AI estimates with global offset
- Per-recipe user override

**Answer:** AI estimates, no calibration

### Q1.4 — Should task sequencing handle multi-meal prep?

Options:
- Yes — parallel across all recipes in a session
- No — one recipe at a time (recommended)
- Both — per-meal default, multi-meal optional

**Answer:** Both — per-meal default, multi-meal optional

---

## Area 2: Freezer-friendly flag origin

### Q2.1 — How should recipes get their freezer_friendly flag?

Options:
- AI classifies automatically (recommended)
- AI classifies + confidence score
- Manual toggle only
- Both: AI suggests, user toggles

**Answer:** Both: AI suggests, user toggles

### Q2.2 — Should freezer-friendly be a simple boolean or carry more info?

Options:
- Boolean only (recommended)
- Boolean + freezer shelf life
- Boolean + reheating note

**Answer:** Boolean + freezer shelf life

### Q2.3 — When should the freezer-friendly classification run on existing recipes?

Options:
- Bulk backfill once
- Lazy on recipe open
- Lazy on plan generation (recommended)

**Answer:** Lazy on plan generation

### Q2.4 — Where should the freezer-friendly flag show in the UI?

Options:
- Badge on recipe cards + plan slots + prep summary (recommended)
- Only in plan view and prep summary
- Plan view, prep summary, and a filter in recipe list

**Answer:** Badge on recipe cards + plan slots + prep summary

---

## Area 3: Batch prep grouping logic

### Q3.1 — What's the primary grouping dimension for batch prep suggestions?

Options:
- Schedule prep slots (Phase 21) (recommended)
- Shared ingredients
- Shared equipment
- AI chooses the grouping strategy

**Answer:** AI chooses the grouping strategy

### Q3.2 — What should the batch prep summary tell the user for each prep session?

Options:
- Recipes + total time + shared ingredients (recommended)
- Recipes + total time only
- Full task sequence already expanded

**Answer:** Recipes + total time + shared ingredients

### Q3.3 — What happens when a recipe in a consume slot has no preceding prep session?

Options:
- Flag as planning warning
- Treat as day-of cook
- AI auto-reassigns to a nearby prep slot (recommended)

**Answer:** AI auto-reassigns to a nearby prep slot

### Q3.4 — Should prep sessions suggest freezer-vs-fridge storage per recipe?

Options:
- Yes — AI decides per recipe in the session (recommended)
- No — user figures it out
- Only for freezer-friendly recipes flagged in Area 2

**Answer:** Yes — AI decides per recipe in the session

---

## Area 4: Prep UI surfaces

### Q4.1 — Where should the weekly batch prep summary live on the Plan page?

Options:
- Collapsible section below the plan grid (recommended)
- Dedicated 'Prep' tab in the navigation
- Modal triggered by a Plan page button
- Inline per-day expandable on each DayCard

**Answer:** Modal triggered by a Plan page button

### Q4.2 — How does the user open a day-of task sequence for a specific meal?

Options:
- Tap SlotCard → expand to show task sequence (recommended)
- 'Cook' button on SlotCard opens a modal
- Dedicated /cook/:mealId route
- From the batch prep summary only

**Answer:** Dedicated /cook/:mealId route

### Q4.3 — Should the task sequence view have active cooking features (timers, step checkmarks)?

Options:
- Read-only list with durations (recommended)
- Checkable steps (no timers)
- Full cook mode with timers + check-offs

**Answer:** Full cook mode with timers + check-offs

### Q4.4 — Should the batch prep summary auto-refresh when the plan changes, or only on explicit user action?

Options:
- Auto-refresh on plan changes
- Manual 'Recompute prep schedule' button (recommended)
- Auto on big changes, manual on small

**Answer:** Auto-refresh on plan changes

---

## Gray Area Selection (Round 2)

**Question:** We've covered task sequence source, freezer flag, batch prep grouping, and prep UI surfaces. Any more gray areas, or ready to write CONTEXT.md?

**Answer:** Explore more gray areas

**Follow-up — Which additional areas should we discuss?**

Options:
1. Cook mode state + household sharing
2. AI cost + caching strategy
3. Cook mode flow variants
4. Recipe instructions storage & editability

**Selected:** All four

---

## Area 5: Cook mode state + household sharing

### Q5.1 — Should cook mode progress persist if the user closes the tab or switches devices?

Options:
- Persist to Supabase, resume anywhere (recommended)
- Persist to localStorage only
- In-memory only — no persistence

**Answer:** Persist to Supabase, resume anywhere

### Q5.2 — Should household members see each other's cook mode progress in real-time?

Options:
- Yes — realtime subscription
- Yes, but per-member lanes
- No — per-user sessions (recommended)

**Answer:** Yes, but per-member lanes

### Q5.3 — How should timers behave when the tab is hidden or the app is closed?

Options:
- Web notifications via service worker
- In-app only (recommended)
- Sound + vibrate when visible, silent otherwise

**Answer:** Web notifications via service worker

### Q5.4 — Can multiple cook sessions be open at once?

Options:
- Yes — multiple sessions, switchable (recommended)
- Single active session — one meal at a time

**Answer:** Yes — multiple sessions, switchable

---

## Area 6: AI cost + caching strategy

### Q6.1 — Where should AI-generated step sequences be cached, and what invalidates them?

Options:
- Per recipe, invalidated on ingredient change (recommended)
- Per recipe, invalidated on explicit refresh only
- Per recipe + servings combo

**Answer:** Per recipe, invalidated on ingredient change

### Q6.2 — What should trigger the batch prep summary to auto-refresh?

Options:
- Debounced: any plan change, 30s debounce (recommended)
- Immediate on every change
- Only on explicit 'save' or 'generate plan' events

**Answer:** Debounced: any plan change, 30s debounce

### Q6.3 — Should there be a per-household rate limit on prep-related AI calls?

Options:
- Daily cap per household, shared with Phase 22 (recommended)
- Separate cap for prep operations
- No rate limit in MVP

**Answer:** Daily cap per household, shared with Phase 22

### Q6.4 — When AI generates steps, should it return rich data for multi-meal scheduling?

Options:
- Rich steps — text, duration, is_active, ingredients_used, equipment (recommended)
- Minimal steps + separate equipment call
- Minimal steps, no equipment awareness

**Answer:** Rich steps — text, duration, is_active, ingredients_used, equipment

---

## Area 7: Cook mode flow variants

### Q7.1 — Consume slot (reheating a pre-made meal)?

Options:
- Reheat-only sequence (recommended)
- Full recipe sequence (same as scratch cook)
- Reheat + 'view full recipe' option

**Answer:** Reheat-only sequence

### Q7.2 — Prep slot with multiple recipes?

Options:
- Combined multi-meal sequence (recommended)
- Per-recipe with a switcher
- User chooses each time

**Answer:** User chooses each time

### Q7.3 — Quick slot (something simple, no full cook)?

Options:
- No cook mode — SlotCard shows a short reheat/assembly note inline (recommended)
- Minimal cook mode with 1-3 steps
- Same as day-of scratch cook

**Answer:** Same as day-of scratch cook

### Q7.4 — Cook mode entry points?

Options:
- Plan grid only (recommended)
- Plan grid + recipe page
- Plan grid + recipe page + standalone /cook

**Answer:** Plan grid + recipe page + standalone /cook

---

## Area 8: Recipe instructions storage & editability

### Q8.1 — Where should AI-generated steps be stored?

Options:
- JSONB column on recipes table (recommended)
- New recipe_instructions table
- New recipe_instructions table with versioning

**Answer:** JSONB column on recipes table

### Q8.2 — Can users edit AI-generated steps in the recipe editor?

Options:
- Yes — full edit (text, duration, active flag, reorder) (recommended)
- Yes, but only durations
- No edits — regenerate only

**Answer:** Yes — full edit (text, duration, active flag, reorder)

### Q8.3 — When a user edits a recipe's ingredients, what happens to their manual step edits?

Options:
- Warn before regenerating (recommended)
- Preserve user edits, mark affected steps stale
- Auto-regenerate silently

**Answer (free text):** "AI will integrate the user edits if it makes sense, or at least understand their intent and keep them intact if possible. They should be included in the recipe or ask if we want to keep that addition. It can rephrase the edit as long as the intent is kept."

**Interpretation:** Regeneration prompt includes the previous user-edited steps as input and instructs the AI to merge intent — rephrasing where needed, preserving custom additions, and surfacing a confirmation prompt when the AI is unsure whether a user addition should survive.

### Q8.4 — When should AI steps be generated?

Options:
- On first cook-mode open (lazy) (recommended)
- On recipe save (eager)
- On plan generation

**Answer:** On recipe save (eager)

---

## Completion

**Question:** 8 areas covered with 32 questions answered. Ready for CONTEXT.md?

**Answer:** Ready for context

---

## Summary of Notable Divergences from Recommendations

The user chose non-recommended options in 16 of 32 questions — CONTEXT.md reflects the actual choices, not the recommendations. Notable divergences that shape the build:

1. **Eager step generation on recipe save** (Q1 area + Q8.4) — trades AI cost for always-ready Cook Mode
2. **Rich step objects with ingredients + equipment** (Q6.4) — forward-compat for multi-meal conflict detection even though single-meal cook mode won't use them day one
3. **Per-member lanes with realtime sync** (Q5.2) — Cook Mode is a deliberately collaborative two-person experience, not a single-user tool
4. **Full cook mode with service-worker notifications** (Q4.3 + Q5.3) — committed to PWA notifications for passive-step completion
5. **Dedicated /cook/:mealId route + standalone /cook** (Q4.2 + Q7.4) — Cook Mode is a first-class route, not a modal or inline expansion, and is accessible outside the plan context
6. **Modal for batch prep summary** (Q4.1) — avoids adding a nav tab (which would break Sidebar/TabBar tests) while keeping the feature discoverable
7. **AI-driven merge on step regeneration** (Q8.3, free text) — most sophisticated decision; requires careful prompt design to preserve user intent across ingredient edits
8. **AI chooses grouping strategy** (Q3.1) — batch prep grouping is fully AI-driven, not rule-based
9. **Auto-refresh on plan changes + 30s debounce** (Q4.4 + Q6.2) — responsive but cost-controlled
10. **Shelf-life weeks stored alongside boolean** (Q2.2) — enables future "eat this first" prompts and informs fridge-vs-freeze storage hints

---

*Produced by `/gsd-discuss-phase 23` — 2026-04-10*
