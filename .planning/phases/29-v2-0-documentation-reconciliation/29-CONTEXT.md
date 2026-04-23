# Phase 29: v2.0 Documentation Reconciliation - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Close v2.0 audit documentation gaps (WARN-02 / WARN-03 / WARN-04 / WARN-05 from `.planning/v2.0-MILESTONE-AUDIT.md`) so the v2.0 milestone can archive with accurate state, **and** refresh the in-app user guide (`src/pages/GuidePage.tsx`) so it reflects every v2.0 feature family shipped since Phase 14.

Original ROADMAP scope (criteria 1-5):
1. IMPORT-01..IMPORT-05 finalised in `REQUIREMENTS.md` (descriptions + traceability rows + status reflecting Phase 25 + 29)
2. `.planning/phases/17-inventory-engine/17-VERIFICATION.md` written (retrospective) against INVT-01..INVT-06 using 17-04-SUMMARY UAT evidence
3. `.planning/phases/25-universal-recipe-import/25-VERIFICATION.md` written (retrospective) against IMPORT-01..IMPORT-05 using 25-03-SUMMARY live Playwright UAT evidence
4. v2.0 traceability rows refreshed (BUDG, INVT, GROC, PLAN, FEED, SCHED, PREP, PORT, IMPORT) to Pending/Partial/Validated matching actual state after Phase 26-28 merges; checkboxes aligned
5. Phase 24 ROADMAP entry + PORT-02 REQUIREMENTS row reconciled with the D-02 tier-aware recipe selection pivot

Folded-in scope (added this discussion, D-10..D-14):
6. `src/pages/GuidePage.tsx` refreshed with guide sections for every v2.0 feature family (BUDG / INVT / GROC / PLAN / FEED / SCHED / PREP / PORT / IMPORT) plus any other user-facing behaviour that lacks in-app instructions today. Interleaved by workflow; existing sections edited in place where v2.0 changed behaviour; `QUICK_START_STEPS` updated.

This phase is **documentation-and-copy only**. No schema changes, no new hooks, no new components, no edge-function changes.

</domain>

<decisions>
## Implementation Decisions

### Retrospective VERIFICATION.md format (phases 17 & 25)
- **D-01:** Both `17-VERIFICATION.md` and `25-VERIFICATION.md` use a **retrospective** template rather than the dense phase-native format used for 26/27/28. Frontmatter `status: retrospective` distinguishes it.
- **D-02:** Retrospective template sections: YAML frontmatter → Observable Truths table (ROADMAP success criteria → status → evidence pointer) → Required Artifacts table (what shipped, confirmed via `ls`/`grep`) → Requirements Coverage table (INVT-01..06 or IMPORT-01..05 → evidence). Skip Key Link Verification, Data-Flow Trace, Behavioral Spot-Checks sections — these are redundant for code that's been in production for weeks.
- **D-03:** Evidence column points to existing SUMMARY files (`17-04-SUMMARY.md`, `25-03-SUMMARY.md`, `17-UAT.md`) rather than re-tracing code line numbers. Avoids duplicating proof already captured at the time of shipping.
- **D-04:** Frontmatter `status` values for the retros: `retrospective` (new status value). If any ROADMAP criterion can't be sourced to existing UAT evidence, mark that row `human_needed` and preserve the row in the frontmatter `human_verification` block exactly as Phase 26 does.

### Traceability status vocabulary
- **D-05:** Adopt a **3-state vocabulary** for the v2.0 traceability table:
  - `Pending` → phase not merged OR shipped but no VERIFICATION.md yet. Checkbox `[ ]`.
  - `Partial` → VERIFICATION.md exists but one or more ROADMAP success criteria are `human_needed` (e.g., Phase 26 criterion #5 Playwright UAT deferred). Checkbox `[~]`.
  - `Validated` → VERIFICATION.md passed cleanly, all success criteria met. Checkbox `[x]`.
- **D-06:** Do **not** introduce a `Complete` tier for v2.0. v1.0 rows stay `Complete` (historical convention preserved). The Phase 28 precedent (`Validated`) is the v2.0 terminal state.
- **D-07:** Apply D-05 across every v2.0 row: BUDG-01..04, INVT-01..06, GROC-01..05, PLAN-01..05, FEED-01..04, SCHED-01..02, PREP-01..03, PORT-01..02, IMPORT-01..05. Each row's promotion is driven by whether a VERIFICATION.md exists for its phase(s) and whether all ROADMAP criteria for that phase passed cleanly vs. flagged `human_needed`. PREP-02 stays `Validated` (Phase 28 already promoted it).

### Phase suffix column hygiene
- **D-08:** Keep `(gap closure)` / `(wire-in)` suffixes where they denote **code** work: `Phase 16, Phase 26 (gap closure)`, `Phase 21, Phase 27 (gap closure)`, `Phase 23, Phase 28 (wire-in)`, etc. These preserve useful provenance for future readers tracing why a requirement was touched twice.
- **D-09:** Drop `Phase 29 (gap closure)` from IMPORT-01..IMPORT-05 rows. Phase 29 adds no code — rows become `Phase 25 | Validated`. Misattributing documentation reconciliation as code gap closure would mislead future audits.

### GuidePage.tsx v2.0 refresh
- **D-10:** Coverage is **every v2.0 feature family plus any v1.x behaviour not already documented**: Budget (BUDG), Inventory (INVT), Grocery (GROC), Plan generation + DnD (PLAN), Feedback & ratings (FEED), Schedule (SCHED), Prep sequencing (PREP), Tier-aware portioning (PORT), Recipe Import (IMPORT). The planner should also audit existing v1.0 sections (`getting-started`, `adding-foods`, `recipes`, `meal-plan`, `tracking`, `household-admin`) for v2.0-era behaviour that has been added since Phase 14 and is currently undocumented (e.g., Cook Mode step-by-step flow, dietary restrictions).
- **D-11:** **Interleave by workflow**, not append at end. Target section order after this phase:
  1. Getting Started
  2. Adding Foods
  3. Building Recipes
  4. Recipe Import (new — IMPORT)
  5. Inventory (new — INVT)
  6. Creating a Meal Plan (edited — now covers generate-plan AI + DnD + locking + PLAN family)
  7. Grocery List (new — GROC)
  8. Tracking Your Day (edited — covers Cook Mode flow, ratings/feedback FEED)
  9. Prep & Schedule (new — SCHED + PREP, single combined section)
  10. Budget (new — BUDG)
  11. Tier-aware Recipe Mix (new — PORT; step-light since this is AI-driven behaviour the user configures via RecipeMixPanel sliders rather than a stepwise workflow)
  12. Household Admin Tasks
- **D-12:** Match existing `GuideSection` interface exactly: `id`, `title`, `intro`, `steps: string[]`, optional `tips: string[]`. Sections average 5-8 steps + 1-2 tips. Do **not** extend the interface (no new `howItWorks` field) — where a feature is more explanatory than stepwise, write the steps in imperative user-voice even if a couple steps read as "what's happening" (e.g., "Ratings you add influence which recipes appear in future plans").
- **D-13:** Update `QUICK_START_STEPS` to include a new step covering recipe import or plan generation. Keep total length ≤ 6 steps. Planner's discretion on exact wording and placement.
- **D-14:** When editing existing v1.0 sections, preserve every existing step unless it's factually wrong now. Only add new steps where v2.0 behaviour genuinely extends the flow. Never rewrite a step purely for tone.

### Phase 24 ROADMAP + PORT-02 reconciliation
- **D-15:** **Annotate in place**, do not rewrite. Both `.planning/ROADMAP.md` Phase 24 block AND `.planning/REQUIREMENTS.md` PORT-02 row get a blockquote deviation note appended below the original text:
  > **D-02 pivot (2026-04-15):** Shipped scope is tier-aware recipe selection (generate-plan edge function enrichment + RecipeMixPanel three-slider component) rather than portion-size adaptation. Portions remain calorie-target-driven (PORT-01). See `.planning/phases/24-dynamic-portioning/24-CONTEXT.md` D-02 for the full rationale.
- **D-16:** Deviation-block format is standardised for any future pivots: markdown blockquote, bold label `**D-## pivot (YYYY-MM-DD):**`, one-sentence new scope summary, pointer to CONTEXT.md.

### IMPORT requirements finalisation
- **D-17:** IMPORT-01..IMPORT-05 descriptions at REQUIREMENTS.md:185-189 are already correct — **no edits** to the description text (verified against Phase 25 success criteria). Change is status-column only: flip traceability rows 324-328 from `Phase 25, Phase 29 (gap closure) | Pending` to `Phase 25 | Validated` (after 25-VERIFICATION.md writes pass; see D-09).

### Checkbox alignment
- **D-18:** The `[ ]`/`[~]`/`[x]` checkbox on each REQUIREMENTS.md requirement bullet (lines 180-189 for IMPORT, etc.) must match its traceability table status. Planner must audit every v2.0 requirement checkbox for alignment with its row's status after D-05 / D-07 sweep.

### Claude's Discretion
- The commit wave decomposition (single big commit vs. per-success-criterion waves) is the planner's call. Suggested wave order for clarity: (1) IMPORT status flip → (2) 17-VERIFICATION retro → (3) 25-VERIFICATION retro → (4) full traceability sweep → (5) Phase 24 reconcile → (6) GuidePage refresh.
- Exact wording of every GuidePage section copy (intros, steps, tips) is the planner/executor's call subject to D-10..D-14 constraints.
- Exact wording of retrospective-VERIFICATION evidence pointers is the planner's call subject to D-01..D-04.

### Folded Todos
None — no pending todos matched Phase 29 scope in this discussion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit source of truth
- `.planning/v2.0-MILESTONE-AUDIT.md` §WARN-02/03/04/05 (lines 249-266) — defines the four doc-drift gaps this phase closes.
- `.planning/v2.0-MILESTONE-AUDIT.md` §210, §321-324 — full audit recommendations.

### Roadmap + requirements
- `.planning/ROADMAP.md` §Phase 29 (lines 561-572) — 5 success criteria, WARN mapping, dependencies.
- `.planning/ROADMAP.md` §Phase 24 (lines 471-483) — original Phase 24 text to annotate (D-15).
- `.planning/REQUIREMENTS.md` §Recipe Import (lines 183-189) — IMPORT-01..IMPORT-05 descriptions (already correct per D-17; do not edit).
- `.planning/REQUIREMENTS.md` §Portioning PORT-02 (line 181) — text to annotate (D-15).
- `.planning/REQUIREMENTS.md` §Traceability + v2.0 Traceability (lines 224-328) — full sweep scope (D-05, D-07, D-09).

### VERIFICATION.md precedent
- `.planning/phases/26-wire-cook-mode-to-inventory-and-budget/26-VERIFICATION.md` — dense phase-native format to contrast against (D-01 says retros do NOT copy this).
- `.planning/phases/28-resolve-prep-sequence-edge-function-orphans/28-VERIFICATION.md` — most recent example of a VERIFICATION.md that drove a status flip.

### Retro evidence sources (cited by D-03)
- `.planning/phases/17-inventory-engine/17-04-SUMMARY.md` — UAT evidence for 17-VERIFICATION.md.
- `.planning/phases/17-inventory-engine/17-UAT.md` — additional Phase 17 UAT notes.
- `.planning/phases/25-universal-recipe-import/25-03-SUMMARY.md` — live Playwright UAT evidence for 25-VERIFICATION.md.

### D-02 pivot source
- `.planning/phases/24-dynamic-portioning/24-CONTEXT.md` — D-02 full rationale (referenced in the deviation block of D-15/D-16).

### GuidePage refresh source
- `src/pages/GuidePage.tsx` — 184 lines; current v1.0-only guide to edit in place.
- `src/pages/GuidePage.tsx:4-10` — `GuideSection` interface (D-12 says do not extend).
- `src/pages/GuidePage.tsx:12-18` — `QUICK_START_STEPS` to update per D-13.

### Project rules
- `CLAUDE.md` §Coding Conventions + §Risky Areas — applies to GuidePage edits.
- `lessons.md` — lessons injected at session start; L-001 (worktree cleanup before vitest) and L-013 (cache clear after deploy) are relevant if plans invoke vitest or deploy actions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GuideSection` interface and existing section array in `src/pages/GuidePage.tsx:4-118` — new v2.0 sections slot into this same shape. No new component needed.
- Existing retrospective precedent: none in repo. Phase 29 establishes the retrospective-VERIFICATION.md template (D-01..D-04) for future milestone-archive audits.

### Established Patterns
- **VERIFICATION.md frontmatter**: YAML block with `phase`, `verified`, `status`, `score`, `overrides_applied`, optional `human_verification: []` array. Phase 29 extends `status` enum with `retrospective`.
- **Traceability status**: Column-3 string in the markdown table. Current values in use: `Pending`, `Validated`, `Complete` (v1.0 only). Phase 29 adds `Partial`.
- **Deviation annotation**: None exists in the docs today. Phase 29 establishes the blockquote deviation-block pattern per D-16.
- **Guide section copy voice**: Second-person imperative ("Head to... Tap... Fill in..."), one tip prefixed with `Tip:`.

### Integration Points
- `REQUIREMENTS.md` traceability table is read by `gsd-sdk` verification tooling — status-column spelling matters. Keep `Validated`/`Partial`/`Pending` exact (no case or punctuation drift).
- `GuidePage.tsx` renders through `/guide` route (AppShell Outlet). No route wiring changes; pure copy + data edit.
- Phase-dir VERIFICATION.md files must land at `.planning/phases/17-inventory-engine/17-VERIFICATION.md` and `.planning/phases/25-universal-recipe-import/25-VERIFICATION.md` — downstream `gsd-*` tooling globs for `*-VERIFICATION.md`.

</code_context>

<specifics>
## Specific Ideas

- **Deviation-block template (D-16)** — exact wording:
  ```markdown
  > **D-02 pivot (2026-04-15):** Shipped scope is tier-aware recipe selection
  > (generate-plan edge function enrichment + RecipeMixPanel three-slider
  > component) rather than portion-size adaptation. Portions remain
  > calorie-target-driven (PORT-01). See `.planning/phases/24-dynamic-portioning/24-CONTEXT.md`
  > D-02 for the full rationale.
  ```

- **Retrospective VERIFICATION.md frontmatter template**:
  ```yaml
  ---
  phase: 17-inventory-engine
  verified: 2026-04-2X
  status: retrospective
  score: N/M ROADMAP success criteria verified via existing UAT evidence
  overrides_applied: 0
  human_verification: []  # only populated if any criterion can't be sourced to SUMMARY
  ---
  ```

- **GuidePage section-order target** captured in D-11 above — executor follows this exact ordering unless they find a workflow reason to deviate (flag in SUMMARY if so).

</specifics>

<deferred>
## Deferred Ideas

- **Full testing/CI strategy for GuidePage sections** — the user considered discussing this and deferred to planner. Suggested minimum: no vitest coverage needed (copy-only edits); type-check passes (`npx tsc --noEmit`) is sufficient sign-off for the GuidePage wave. Planner may add a smoke test asserting `GUIDE_SECTIONS.length >= 12` if desired.
- **Decomposition into waves vs. single commit** — deferred to `/gsd-plan-phase` decomposition (see Claude's Discretion above).
- **Future doc-drift prevention mechanism** — e.g., a CI check that grep-asserts every v2.0 requirement id appears in `GuidePage.tsx`. Out of scope for Phase 29; note for milestone wrap-up.
- **Milestone archive itself** — Phase 29 closes doc drift so v2.0 CAN archive, but the actual `/gsd-complete-milestone` run is a separate action after this phase merges.

</deferred>

---

*Phase: 29-v2-0-documentation-reconciliation*
*Context gathered: 2026-04-22*
