# Phase 29: v2.0 Documentation Reconciliation - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 5 file operations (2 new, 3 edit-in-place)
**Analogs found:** 5 / 5 (100% coverage; all five operations have concrete existing analogs in the repo)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/phases/17-inventory-engine/17-VERIFICATION.md` (NEW) | doc (phase retrospective) | static-doc / evidence-aggregation | `.planning/phases/28-resolve-prep-sequence-edge-function-orphans/28-VERIFICATION.md` (frontmatter + table shape); `.planning/phases/26-wire-cook-mode-to-inventory-and-budget/26-VERIFICATION.md` (contrast — sections to OMIT) | role-match (retro is new template; borrows frontmatter/table idioms, drops dense sections) |
| `.planning/phases/25-universal-recipe-import/25-VERIFICATION.md` (NEW) | doc (phase retrospective) | static-doc / evidence-aggregation | Same as above (identical template, different requirement set) | role-match |
| `.planning/REQUIREMENTS.md` (EDIT) | doc (traceability table + requirement list) | tabular status-flip + blockquote append | Existing v2.0 traceability rows (lines 289-328) for format; Phase 28 precedent at line 320 (`PREP-02 | Phase 23, Phase 28 (wire-in) | Validated`) for status spelling | exact (same file, existing rows are self-analog) |
| `.planning/ROADMAP.md` (EDIT) | doc (phase block) | blockquote append (no rewrite) | No existing deviation blockquote in repo — Phase 29 establishes the pattern. Source of truth is the D-15/D-16 template in 29-CONTEXT.md specifics block. | new pattern (planner uses verbatim template from CONTEXT specifics) |
| `src/pages/GuidePage.tsx` (EDIT) | component (React page) | static config array mutation (no hooks, no network) | Existing `GUIDE_SECTIONS` entries at lines 20-117 (6 sections) — every new section is a clone of this exact shape | exact (same file, interface locked by D-12) |

---

## Pattern Assignments

### `.planning/phases/17-inventory-engine/17-VERIFICATION.md` (doc, retrospective)

**Analog (frontmatter + table shape):** `.planning/phases/28-resolve-prep-sequence-edge-function-orphans/28-VERIFICATION.md`
**Contrast analog (what NOT to copy):** `.planning/phases/26-wire-cook-mode-to-inventory-and-budget/26-VERIFICATION.md`

#### Frontmatter pattern — COPY from `28-VERIFICATION.md:1-7` (adapted)

Existing (Phase 28):
```yaml
---
phase: 28-resolve-prep-sequence-edge-function-orphans
status: passed
verifier: inline-orchestrator
verified_at: 2026-04-22T23:10:00Z
requirement_ids: [PREP-02]
---
```

Retrospective variant per D-04 (from 29-CONTEXT.md specifics lines 158-167):
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

Note: `status: retrospective` is a **new enum value** — Phase 29 introduces it. All prior phase VERIFICATION.md files use `passed`, `human_needed`, or `partial`. Spelling matters; downstream tooling globs `*-VERIFICATION.md` and parses frontmatter.

#### Sections to KEEP (per D-02)

From `28-VERIFICATION.md`, keep these three tables verbatim in structure:

1. **`## Success Criteria Audit`** (28-VERIFICATION.md:16-23) — table with columns `| # | Criterion | Status | Evidence |`. For the retros, rename column to `Observable Truth` per D-02 wording, but the table shape is identical.

   Reference row (28-VERIFICATION.md:19):
   ```markdown
   | 1 | A decision is recorded: wire-in or remove — documented in the phase PLAN with rationale | PASS | `.planning/phases/28-resolve-prep-sequence-edge-function-orphans/28-CONTEXT.md` line 30-32 records D-01 wire-in decision. |
   ```

   Retro adaptation: `Evidence` column points to SUMMARY/UAT files per D-03 — e.g., `17-04-SUMMARY.md:85` or `17-UAT.md Test 7 (pass)` rather than source-line numbers.

2. **Required Artifacts table** — from `26-VERIFICATION.md:37-45` (`### Required Artifacts`), columns `| Artifact | Expected | Status | Details |`. For the retros, reformulate as "what shipped, confirmed via `ls`/`grep`" per D-02. Example Phase 17 row:
   ```markdown
   | `src/hooks/useInventoryDeduct.ts` | FIFO deduction hook | VERIFIED | `ls src/hooks/useInventoryDeduct.ts` → present; confirmed in 17-04-SUMMARY.md line 84 |
   ```

3. **Requirements Coverage table** — from `26-VERIFICATION.md:81-86` (`### Requirements Coverage`), columns `| Requirement | Source Plan | Description | Status | Evidence |`. Retro version: `| Requirement | Description | Status | Evidence |` — drop `Source Plan` since the retro is scoped to one phase. Evidence column = pointer to SUMMARY section (per D-03).

   Reference Phase 26 row (26-VERIFICATION.md:83):
   ```markdown
   | INVT-05 | 26-01, 26-03, 26-04 | Finalizing a meal plan auto-deducts ingredient quantities from inventory | SATISFIED | Cook completion via `/cook/:mealId` now fires `useInventoryDeduct` (FIFO) — CookModePage.tsx:257-262 via shared hook. |
   ```

   Retro adaptation (INVT-01 example):
   ```markdown
   | INVT-01 | User can view and manage inventory across Pantry/Fridge/Freezer | VALIDATED | 17-UAT.md Test 1 (Inventory Page and Navigation) + Test 2 (Location Tab Switching) — both `result: pass` |
   ```

#### Sections to SKIP (per D-01, D-02)

These sections appear in `26-VERIFICATION.md` (dense phase-native) but must **NOT** appear in the retros:

| Section to OMIT | Where it lives in 26-VERIFICATION.md | Why skipped |
|-----------------|--------------------------------------|-------------|
| `### Key Link Verification` | lines 47-59 (11-row import-graph wiring table) | Redundant for code in production for weeks — the SUMMARY already shipped the wiring |
| `### Data-Flow Trace (Level 4)` | lines 61-68 (runtime variable flow analysis) | Same — retrofit tracing adds no audit value |
| `### Behavioral Spot-Checks` | lines 70-77 (vitest / tsc commands + results) | Post-hoc test runs would need fresh invocations; SUMMARY already captured the pass/fail at ship time |
| `### Anti-Patterns Found` | lines 89-93 | Phase 17/25 shipped clean per their SUMMARY files; no value in re-scanning |
| `### Preservation Audit (L-020 / L-027)` | lines 127-133 | Only relevant for refactor phases — not retrofit-friendly |
| `### Decision Traceability` | lines 137-156 | Decisions were logged in the CONTEXT.md at the time; no audit benefit in restating |

#### Evidence-source mapping (per D-03)

| ROADMAP criterion for Phase 17 | Evidence pointer |
|--------------------------------|------------------|
| Pantry/Fridge/Freezer tracking with ledger-based quantities | `17-04-SUMMARY.md:79` (`InventorySummaryWidget` card with location count row) + `17-UAT.md` Test 1, 2, 6 |
| FIFO deduction on recipe cook | `17-04-SUMMARY.md:70` (`useInventoryDeduct` FIFO batch) + `17-UAT.md` Test 7 |
| Barcode scanning | `17-UAT.md` Test 10 (`result: pass`) |
| Expiry priority / expiring-soon list | `17-04-SUMMARY.md:71` + `17-UAT.md` Test 9 |
| Plan-driven deduction | Flag as `human_needed` (WARN-01 / CRIT-01 from audit confirms this was NOT wired until Phase 26). Phase 17's scope did NOT include Plan→Cook wiring — the retro should note this honestly with a pointer to 26-VERIFICATION.md |

**Estimated line count:** 60-90 lines (much lighter than Phase 26/28's 160+).

**Skeleton:**
```markdown
---
phase: 17-inventory-engine
verified: 2026-04-2X
status: retrospective
score: 5/6 ROADMAP success criteria verified via existing UAT evidence (1 deferred to Phase 26 scope)
overrides_applied: 0
human_verification: []
---

# Phase 17: Inventory Engine — Verification (Retrospective)

**Phase goal (per ROADMAP):** [restate]
**Retrospective rationale:** Phase shipped 2026-03-26. VERIFICATION.md backfilled during Phase 29 v2.0 milestone reconciliation per WARN-03. Evidence sourced from existing SUMMARY and UAT documents captured at ship time.

## Observable Truths

[6-row table — one per INVT-01..INVT-06 — mapping ROADMAP criteria to SUMMARY/UAT pointers]

## Required Artifacts

[3-5 row table listing the shipped key files from 17-04-SUMMARY key-files block, confirmed via `ls` on current main]

## Requirements Coverage

[6-row table — INVT-01..INVT-06 — status = Validated / Partial / Pending per D-07]

## Status

**[PASSED / PARTIAL]** — [N/M] criteria satisfied by existing evidence. [Any human_needed rows listed here.]
```

---

### `.planning/phases/25-universal-recipe-import/25-VERIFICATION.md` (doc, retrospective)

**Analog:** Same as Phase 17 retro (same template).

#### Evidence-source mapping (per D-03)

Evidence is richer here because `25-03-SUMMARY.md` captured a full live Playwright UAT (not just an offline test log). Reference row from `25-03-SUMMARY.md:83-86` (paraphrased):

> - Raw text import works end-to-end: Pasted Spaghetti Carbonara sample → recipe row created → redirected to `/recipes/48a1c82f-6907-4732-a6ba-4b353e642c4c` → RecipeBuilder rendered with name, 5 ingredients, 5 steps, per-serving total "806.8 cal | 28.9g P | 76.2g C | 40.2g F"

| ROADMAP criterion for Phase 25 | Evidence pointer | Status |
|--------------------------------|------------------|--------|
| SC-1: blog URL → recipe with ingredients and macros | `25-03-SUMMARY.md:151` — "works for scraper-friendly sites; mainstream sites gracefully fall back per D-10. **Partial — D-10 fallback is the documented design**" | Validated (fallback IS the design per D-10) |
| SC-2: raw text → recipe | `25-03-SUMMARY.md:152` — "PASS (verified end-to-end with Spaghetti Carbonara UAT)" | Validated |
| SC-3: YouTube URL → recipe | `25-03-SUMMARY.md:153` — "Untested/unknown — the one UAT sample hit the D-10 fallback" | `human_needed` (preserve the row in frontmatter `human_verification:` array) |
| SC-4: recipe appears in RecipeBuilder ready to edit | `25-03-SUMMARY.md:154` — "PASS" | Validated |
| SC-5: no new tables / only a nullable column | `25-03-SUMMARY.md:155` — "PASS (migration 030 is ALTER TABLE only)" | Validated |

**IMPORT requirements mapping:**
| IMPORT-01 (blog URL) | 25-03-SUMMARY SC-1 | Validated |
| IMPORT-02 (raw text) | 25-03-SUMMARY SC-2 | Validated |
| IMPORT-03 (YouTube) | 25-03-SUMMARY SC-3 | `human_needed` (transcript success rate unmeasured — preserve in frontmatter `human_verification`) |
| IMPORT-04 (RecipeBuilder ready-to-edit) | 25-03-SUMMARY SC-4 | Validated |
| IMPORT-05 (ALTER TABLE only) | 25-03-SUMMARY SC-5 | Validated |

#### `human_verification` frontmatter pattern — COPY from `26-VERIFICATION.md:7-10`

```yaml
human_verification:
  - test: "IMPORT-03: YouTube cooking video URL → recipe via transcript extraction"
    expected: "Paste a YouTube URL with a spoken cooking walkthrough (not the one UAT sample that hit D-10). Verify transcript-based recipe appears with ingredients and steps."
    why_human: "Per 25-03-SUMMARY follow-up polish item 3: one UAT sample hit the D-10 fallback. Indistinguishable without edge function logs whether failure was transcript extraction or bot block. Requires broader sample set + log access."
```

**Estimated line count:** 60-80 lines.

---

### `.planning/REQUIREMENTS.md` (doc, edit-in-place)

**Analog:** The file itself — every row in the existing v2.0 traceability table (lines 289-328) is the exemplar for the rows Phase 29 will flip. The Phase 28 row at line 320 is the canonical "Validated" precedent.

#### Traceability status vocabulary — current state audit (per D-05/D-07)

Scanned lines 224-328:

| Bucket | Status strings in use (as of 2026-04-22) | Rows |
|--------|------------------------------------------|------|
| v1.0/v1.1 (lines 230-279) | `Complete` (legacy — KEEP per D-06) | 50 rows — do NOT touch |
| v2.0 (lines 293-328) | `Pending` (dominant) | 33 / 36 rows |
| v2.0 (lines 293-328) | `Complete` | 6 rows (BUDG-04 line 296; GROC-01..05 lines 303-307) — drift from `Complete` legacy to Phase 29's `Validated` vocabulary |
| v2.0 (lines 293-328) | `Validated` | 1 row (PREP-02 line 320 — Phase 28 precedent) |
| v2.0 (lines 293-328) | `Partial` | 0 rows (new status Phase 29 introduces per D-05) |

**Target states after Phase 29 sweep (per D-07):**

| Req range | Current | Target | Driver |
|-----------|---------|--------|--------|
| BUDG-01, BUDG-02 | `Pending` | `Validated` | 16-VERIFICATION.md exists, passed |
| BUDG-03 | `Pending` | `Validated` | 26-VERIFICATION.md covers gap closure (criterion 5 human_needed but INVT-05/INVT-06/BUDG-03 satisfied per 26-VERIFICATION §Requirements Coverage) |
| BUDG-04 | `Complete` | `Validated` | Normalise to v2.0 vocabulary |
| INVT-01..INVT-04 | `Pending` | `Validated` | 17-VERIFICATION retro (new) covers these |
| INVT-05, INVT-06 | `Pending` | `Validated` | 17 retro + 26-VERIFICATION gap closure |
| GROC-01..GROC-05 | `Complete` | `Validated` | Normalise to v2.0 vocabulary |
| PLAN-01..PLAN-05 | `Pending` | `Validated` or `Partial` | 19-VERIFICATION (human_needed) + 22-VERIFICATION (passed) — PLAN-01/03 via Phase 19 `Partial`; PLAN-02/04/05 via Phase 22 `Validated` |
| FEED-01..FEED-04 | `Pending` | `Validated` | 20-VERIFICATION passed |
| SCHED-01, SCHED-02 | `Pending` | `Validated` | 27-VERIFICATION passed (5/5 criteria) |
| PREP-01 | `Pending` | `Validated` | 23-VERIFICATION passed |
| PREP-02 | `Validated` (already) | `Validated` (KEEP) | D-07 explicit callout |
| PREP-03 | `Pending` | `Validated` | 23-VERIFICATION passed |
| PORT-01, PORT-02 | `Pending` | `Validated` | 24-VERIFICATION human_needed → `Partial` per D-05 OR `Validated` if deploy cleared. Planner verifies. |
| IMPORT-01..IMPORT-05 | `Pending` | `Validated` | 25-VERIFICATION retro (new); D-09 drops `(gap closure)` suffix |

#### Row edit pattern — COPY from line 320 (Phase 28 precedent)

Reference:
```markdown
| PREP-02 | Phase 23, Phase 28 (wire-in) | Validated |
```

Per D-08: keep `(gap closure)` / `(wire-in)` suffixes where they denote CODE work (BUDG-03, INVT-05, INVT-06, SCHED-01, SCHED-02, PREP-02). Per D-09: DROP `Phase 29 (gap closure)` from IMPORT rows because Phase 29 adds no code.

#### IMPORT row flip (D-17) — exact before/after

**BEFORE** (lines 324-328):
```markdown
| IMPORT-01 | Phase 25, Phase 29 (gap closure) | Pending |
| IMPORT-02 | Phase 25, Phase 29 (gap closure) | Pending |
| IMPORT-03 | Phase 25, Phase 29 (gap closure) | Pending |
| IMPORT-04 | Phase 25, Phase 29 (gap closure) | Pending |
| IMPORT-05 | Phase 25, Phase 29 (gap closure) | Pending |
```

**AFTER** (IMPORT-03 potentially `Partial` per human_needed from retro):
```markdown
| IMPORT-01 | Phase 25 | Validated |
| IMPORT-02 | Phase 25 | Validated |
| IMPORT-03 | Phase 25 | Partial |
| IMPORT-04 | Phase 25 | Validated |
| IMPORT-05 | Phase 25 | Validated |
```

#### PORT-02 deviation blockquote (D-15) — APPEND below line 181

Current (line 181):
```markdown
- [ ] **PORT-02**: Portion models adapt based on feedback ratings and logged consumption history
```

After (append the D-16 standardised blockquote from 29-CONTEXT.md specifics lines 149-155):
```markdown
- [ ] **PORT-02**: Portion models adapt based on feedback ratings and logged consumption history
  > **D-02 pivot (2026-04-15):** Shipped scope is tier-aware recipe selection
  > (generate-plan edge function enrichment + RecipeMixPanel three-slider
  > component) rather than portion-size adaptation. Portions remain
  > calorie-target-driven (PORT-01). See `.planning/phases/24-dynamic-portioning/24-CONTEXT.md`
  > D-02 for the full rationale.
```

#### Checkbox alignment (D-18) — exact pattern

For every requirement bullet at lines 158-189:
- Target status `Validated` → checkbox `[x]`
- Target status `Partial` → checkbox `[~]` (NEW per D-05; verify parser tolerance before ship)
- Target status `Pending` → checkbox `[ ]`

**Integration hazard:** The checkbox `[~]` (tilde) is a **new convention** — verify no existing Markdown-to-status parser (gsd-sdk) breaks on it. If in doubt, planner should grep `.claude/` and `.planning/` for any tool that parses `[x]` vs `[ ]` explicitly.

---

### `.planning/ROADMAP.md` Phase 24 block (doc, edit-in-place)

**Analog:** No in-repo precedent for the deviation blockquote. The pattern is **established** by Phase 29 per D-16.

#### Pattern — APPEND blockquote immediately below line 482

Current block (ROADMAP.md:471-483):
```markdown
### Phase 24: Dynamic Portioning
**Goal**: Portion suggestions adapt over time based on each member's satiety feedback and consumption history, moving beyond static calorie-target splits
**Depends on**: Phase 20
**Requirements**: PORT-01, PORT-02
**Success Criteria** (what must be TRUE):
  1. Per-member portion suggestions use each member's calorie target as the primary driver — members with higher targets receive proportionally larger suggested portions
  2. When a member has logged a recipe multiple times and consistently adjusts the suggested portion, the system adapts future suggestions for that recipe toward the observed amount
**Plans**: 2 plans
Plans:
- [x] 24-01-PLAN.md — RecipeMixPanel component (three-slider panel with localStorage persistence) and PlanGrid wiring
- [x] 24-02-PLAN.md — generate-plan edge function enrichment (cook frequency, last-cooked, per-member ratings, cost per serving, tier-aware AI prompts) + redeploy
**UI hint**: yes
```

Append after line 482 (before the blank line at 483):
```markdown

> **D-02 pivot (2026-04-15):** Shipped scope is tier-aware recipe selection
> (generate-plan edge function enrichment + RecipeMixPanel three-slider
> component) rather than portion-size adaptation. Portions remain
> calorie-target-driven (PORT-01). See `.planning/phases/24-dynamic-portioning/24-CONTEXT.md`
> D-02 for the full rationale.
```

**Critical per D-15:** "Annotate in place, do not rewrite." Do NOT edit the Goal line or Success Criteria — append only.

---

### `src/pages/GuidePage.tsx` (component, static config array mutation)

**Analog:** The six existing sections in `GUIDE_SECTIONS` at lines 20-117 are the verbatim copy-voice exemplars. Do **NOT** introduce a new pattern — every new section uses the exact same shape and voice.

#### Interface — LOCKED per D-12 (lines 4-10)

```typescript
interface GuideSection {
  id: string
  title: string
  intro: string
  steps: string[]
  tips?: string[]
}
```

**Integration hazard:** Per D-12, do NOT extend with `howItWorks`, `disclaimer`, or any other field. Where a feature is explanatory rather than stepwise (e.g., PORT tier-aware), write imperative user-voice steps even if a couple read as "what's happening" (example in D-12: "Ratings you add influence which recipes appear in future plans").

#### Canonical section exemplar — COPY VOICE from lines 35-50 (`adding-foods`)

```typescript
  {
    id: 'adding-foods',
    title: 'Adding Foods',
    intro: 'Your food library is where all your foods live. You can search two major food databases or create your own custom foods — great for recipes with specific branded ingredients.',
    steps: [
      'Head to the Home page and tap the search bar at the top to open food search.',
      'Type a food name to search both the USDA and CNF (Canadian Nutrient File) databases at once.',
      'Tap a result to see its nutrition details, then tap "Add" to log it.',
      'To add a custom food, switch to the "My Foods" tab and tap "Add Custom Food".',
      'Fill in the food name, serving size, and macros (calories, protein, carbs, fat), then save.',
      'To edit or delete a custom food, find it in the "My Foods" tab and tap on it.',
    ],
    tips: [
      'Tip: Custom foods are shared with your whole household, so everyone can use them.',
    ],
  },
```

**Voice rules extracted:**
- **Imperative second-person:** "Head to...", "Tap...", "Fill in...", "Type..."
- **Capitalised page names in quotes when they match UI labels:** `"New Recipe"`, `"Add Custom Food"`, `"My Foods" tab`
- **Em-dashes for explanatory clauses** in `intro` (e.g., "great for recipes with specific branded ingredients")
- **Smart apostrophe escaping** — uses `\'` in strings (see line 27 `You\'re`, line 88 `doing`)
- **One tip per section** prefixed `Tip:` — always starts with the literal word `Tip:`
- **5-8 steps per section** — line 42 has 6 steps, line 71 (meal-plan) has 8, line 89 (tracking) has 7
- **Steps end with a period** — consistent across every existing section
- **Intro is ONE sentence** (occasionally two) — never a paragraph

#### Section ordering — per D-11 target (lines 48-60 of CONTEXT)

Current 6 sections + 5 new + 1 edited + existing 2 edited = 12 sections final. Target order:

| # | Section id | Status | Source |
|---|------------|--------|--------|
| 1 | `getting-started` | KEEP (lines 21-34) | existing |
| 2 | `adding-foods` | KEEP (lines 35-50) | existing |
| 3 | `recipes` | KEEP (lines 51-66) | existing — add 1 step noting "Imported recipes land here ready to edit" per D-14 if relevant |
| 4 | `recipe-import` | NEW | IMPORT family (IMPORT-01..05) |
| 5 | `inventory` | NEW | INVT family (INVT-01..06) |
| 6 | `meal-plan` | EDIT (lines 67-84) | existing — extend for PLAN family: generate-plan AI, DnD, locking, swap |
| 7 | `grocery-list` | NEW | GROC family (GROC-01..05) |
| 8 | `tracking` | EDIT (lines 85-101) | existing — extend for Cook Mode flow, ratings/feedback (FEED-01..04) |
| 9 | `prep-schedule` | NEW (combined) | SCHED + PREP families per D-11 clause 9 |
| 10 | `budget` | NEW | BUDG family (BUDG-01..04) |
| 11 | `recipe-mix` | NEW | PORT family — step-light explanatory tone per D-11 clause 11 |
| 12 | `household-admin` | KEEP (lines 102-117) | existing |

**Preservation rule per D-14:** "Preserve every existing step unless it's factually wrong now." Only add new steps where v2.0 extends the flow. Never rewrite a step for tone.

#### QUICK_START_STEPS update — per D-13 (lines 12-18)

Current (5 steps):
```typescript
const QUICK_START_STEPS = [
  'Sign in or create your account',
  'Add foods to your food library',
  'Build a recipe from your foods',
  'Put your recipe into a meal plan',
  'Log what you eat today',
]
```

D-13 constraint: Add one step for recipe import or plan generation; total ≤ 6 steps. Example target (planner discretion on wording):
```typescript
const QUICK_START_STEPS = [
  'Sign in or create your account',
  'Add foods to your food library',
  'Build or import a recipe',          // <- merged step 3 + IMPORT
  'Put your recipe into a meal plan',
  'Log what you eat today',
  'Generate a weekly plan from your recipes',  // <- new step for PLAN family
]
```

Render surface (lines 143-146) reads "Get started in **5** steps" — if planner bumps to 6, update header text accordingly:
```typescript
<h2 className="font-bold text-text mb-2">Get started in 5 steps</h2>
```
becomes
```typescript
<h2 className="font-bold text-text mb-2">Get started in 6 steps</h2>
```

Alternatively, rename to "Quick start" with no count. Planner's call.

#### Test integration hazard

`tests/guide.test.ts` is one of the pre-existing failing test files (per STATE.md and 26-VERIFICATION.md:162 note — "Pre-existing test failures in tests/auth.test.ts, tests/AuthContext.test.tsx, **tests/guide.test.ts**, tests/theme.test.ts confirmed NOT caused by Phase 26 — they existed on baseline pre-26"). Planner should:
1. Read `tests/guide.test.ts` before editing GuidePage.tsx — if the test asserts specific section ids, updating those must be synchronised.
2. Not introduce NEW test failures in `tests/guide.test.ts` — if the existing failures are unrelated (likely ES256 auth or theme-token drift), a GuidePage change should not widen the failure set.
3. D-deferred item (29-CONTEXT.md lines 175-176): "no vitest coverage needed (copy-only edits); `npx tsc --noEmit` is sufficient sign-off." Planner may optionally add a smoke test `GUIDE_SECTIONS.length >= 12`.

---

## Shared Patterns

### Retrospective VERIFICATION.md frontmatter (new in Phase 29)

**Source:** 29-CONTEXT.md specifics lines 158-167 (D-04 canonical).
**Apply to:** Both new retros (17-VERIFICATION.md, 25-VERIFICATION.md).

```yaml
---
phase: <phase-slug-matching-directory-name>
verified: 2026-04-2X
status: retrospective
score: N/M ROADMAP success criteria verified via existing UAT evidence
overrides_applied: 0
human_verification: []  # populate with {test, expected, why_human} objects if any criterion can't be sourced
---
```

**Integration hazard:** `status: retrospective` is a new enum value. Check downstream consumers (gsd-sdk, milestone archive tooling) tolerate it before shipping. If in doubt, use `status: passed` with a prominent `Retrospective rationale:` paragraph at the top of the body — but per D-04 explicit spec, `retrospective` is the intended value.

### Traceability status vocabulary (3-state per D-05)

**Source:** REQUIREMENTS.md:320 (Phase 28 precedent = `Validated`).
**Apply to:** Every v2.0 row at REQUIREMENTS.md:293-328.

| Status | Checkbox | Semantic |
|--------|----------|----------|
| `Pending` | `[ ]` | Not merged OR shipped but no VERIFICATION.md yet |
| `Partial` | `[~]` | VERIFICATION.md exists but ≥1 criterion is `human_needed` |
| `Validated` | `[x]` | VERIFICATION.md passed cleanly |

**Integration hazard:** Exact spelling — `Validated` (not `validated`, not `VALIDATED`, not `Verified`). `Partial` (not `partial`). `Pending` (not `pending`). Downstream gsd-sdk tooling pattern-matches these strings per CONTEXT code_context line 139.

### Deviation blockquote (new in Phase 29 per D-16)

**Source:** 29-CONTEXT.md specifics lines 149-155 (verbatim template).
**Apply to:** ROADMAP.md Phase 24 block (after line 482) AND REQUIREMENTS.md PORT-02 bullet (after line 181).

```markdown
> **D-## pivot (YYYY-MM-DD):** [one-sentence new-scope summary]
> [Wrapped continuation if needed].
> See `.planning/phases/NN-slug/NN-CONTEXT.md` D-## for the full rationale.
```

**Format rules:**
- Markdown blockquote (`> ` prefix on every line)
- Bold label `**D-## pivot (YYYY-MM-DD):**` exactly (no variations like `D-02 scope change`)
- One-sentence new-scope summary
- Pointer to the CONTEXT.md where the decision was captured
- ISO date (YYYY-MM-DD)

### Guide section copy voice

**Source:** `src/pages/GuidePage.tsx:35-50` (canonical example: `adding-foods`).
**Apply to:** Every new section + every edit.

- Imperative second-person ("Head to...", "Tap...", "Fill in...")
- 5-8 steps per section
- Steps end with a period
- Intro is 1-2 sentences (never a paragraph)
- UI labels quoted with smart quotes: `"New Recipe"`
- Escape apostrophes in strings: `you\'re`, `don\'t`
- One tip per section, prefixed with literal `Tip:`
- `id` uses kebab-case matching section intent (e.g., `recipe-import`, `prep-schedule`, `recipe-mix`)

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| `.planning/ROADMAP.md` deviation blockquote | new pattern | No existing deviation annotations in the repo — Phase 29 establishes the pattern per D-16. Source of truth is the exact template in 29-CONTEXT.md specifics lines 149-155. |
| `status: retrospective` frontmatter enum | new enum value | No prior VERIFICATION.md uses this value. Phase 29 introduces it per D-04. Planner must verify downstream tooling (gsd-sdk parsers) tolerate it or document an override. |
| `[~]` checkbox for `Partial` status | new checkbox state | No prior use in REQUIREMENTS.md. Phase 29 introduces it per D-05 / D-18. Planner should grep for parsers that expect `[x]` / `[ ]` only before shipping. |

---

## Integration Hazards Summary

1. **Status vocabulary spelling** — `Validated` / `Partial` / `Pending` case-sensitive and exact. Downstream gsd-sdk tooling parses these strings (per CONTEXT code_context line 139).
2. **VERIFICATION.md path globbing** — phase-dir tooling globs `*-VERIFICATION.md`. Files MUST land at `.planning/phases/17-inventory-engine/17-VERIFICATION.md` and `.planning/phases/25-universal-recipe-import/25-VERIFICATION.md` (per CONTEXT line 141).
3. **New `status: retrospective` enum** — verify gsd-sdk parsers don't whitelist-reject unknown status values. Fallback: use `status: passed` with prominent retrospective banner if tooling breaks.
4. **New `[~]` checkbox** — same concern as #3.
5. **tests/guide.test.ts pre-existing failure** — do not widen failure count when editing GuidePage.tsx. `npx tsc --noEmit` is the contract gate per CONTEXT deferred section lines 175-176.
6. **GuideSection interface locked per D-12** — do NOT add fields. Explanatory content goes into `steps` as user-voice imperative even where stepwise feels forced (PORT section).
7. **D-14 preservation** — existing v1.0 section steps stay unless factually wrong. No tone rewrites.
8. **D-09 suffix drop** — IMPORT rows lose `Phase 29 (gap closure)` because Phase 29 adds no code. Attributing docs work as code gap closure misleads future audits.
9. **Phase 28 precedent at REQUIREMENTS.md:320** — `PREP-02 | Phase 23, Phase 28 (wire-in) | Validated` — do NOT touch this row (already correct).
10. **GROC-01..GROC-05 and BUDG-04 status normalisation** — currently `Complete`, must flip to `Validated` per D-05/D-07 to unify v2.0 vocabulary. (v1.0 `Complete` rows at lines 230-279 stay untouched per D-06.)

---

## Metadata

**Analog search scope:**
- `.planning/phases/*/[0-9]*-VERIFICATION.md` (26 existing VERIFICATION files surveyed)
- `.planning/REQUIREMENTS.md` (full file — 337 lines)
- `.planning/ROADMAP.md` (Phase 24 block + surrounding structure)
- `src/pages/GuidePage.tsx` (full file — 184 lines)

**Files scanned:** 12 files read (CONTEXT, RESEARCH-equivalent audit, 3 VERIFICATION exemplars, 2 SUMMARY evidence sources, 1 UAT evidence, REQUIREMENTS, ROADMAP × 2 ranges, GuidePage).

**Pattern extraction date:** 2026-04-22

**Key confirmations from inspection:**
- 26-VERIFICATION.md (163 lines) and 27-VERIFICATION.md (40+ lines before continuing) both use the dense phase-native format with Key Link Verification + Data-Flow Trace + Behavioral Spot-Checks sections — these are precisely the sections D-01/D-02 tell the retros to OMIT.
- 28-VERIFICATION.md (91 lines) is the most compact existing VERIFICATION.md and is the closest structural analog to the retrospective template — its Success Criteria Audit table and Plan Ledger section shape are reusable.
- Phase 17 and Phase 25 directories confirmed to have no existing `*-VERIFICATION.md` file (WARN-03 source confirmed by Glob).
- Current IMPORT rows at REQUIREMENTS.md:324-328 all read `Phase 25, Phase 29 (gap closure) | Pending` — confirms the exact before-state for the D-17 flip.
- GuidePage.tsx interface is cleanly 5 fields (`id`, `title`, `intro`, `steps`, optional `tips`) — D-12 lock is trivial to honour.
