# Phase 29: v2.0 Documentation Reconciliation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 29-v2-0-documentation-reconciliation
**Areas discussed:** VERIFICATION.md depth, Traceability status vocabulary, Phase-suffix handling, Phase 24 + PORT-02 reconciliation, GuidePage.tsx v2.0 refresh

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| VERIFICATION.md depth (17 & 25) | Full Phase 26-28 template vs retrospective vs minimal | ✓ |
| Traceability status vocabulary | Validated/Partial/Pending + row convention | ✓ |
| "gap closure" / "wire-in" suffix handling | Keep/drop/collapse/footnote | ✓ |
| Phase 24 ROADMAP + PORT-02 reconciliation | Rewrite vs annotate | ✓ |

**User's choice:** All four, plus free-text addition: "also update the in app documentation, how to use."

**Notes:** The free-text addition surfaced a 5th area (GuidePage.tsx v2.0 refresh) not covered by ROADMAP success criteria 1-5. Asked how to handle scope expansion; user chose to fold it in.

---

## Scope-expansion check (added area)

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into Phase 29 (expand scope) | Add as 5th gray area in this phase | ✓ |
| Defer to new Phase 30 "v2.0 User Guide Refresh" | Keep Phase 29 tight | |
| Defer to /gsd-complete-milestone wrap-up | Treat as milestone-completion work | |
| Capture as backlog + decide later | Note as deferred idea | |

**User's choice:** Fold into Phase 29.
**Notes:** User views Phase 29 broadly as "v2.0 documentation reconciliation" covering both planning docs AND user-facing in-app docs.

---

## A. VERIFICATION.md depth (17 & 25)

| Option | Description | Selected |
|--------|-------------|----------|
| Full Phase 26-28 template | All 6 sections, fresh code-line citations | |
| Retrospective template (recommended) | Frontmatter + Observable Truths + Required Artifacts + Requirements Coverage, citing SUMMARY for evidence | ✓ |
| Minimal sign-off | Frontmatter + single criterion→evidence table | |

**User's choice:** Retrospective template.
**Notes:** Establishes a new `status: retrospective` value for frontmatter. Phase 29 is the first use of this template — future retro VERIFICATION.md writes should follow the same shape. See CONTEXT D-01..D-04.

---

## B. Traceability status vocabulary

| Option | Description | Selected |
|--------|-------------|----------|
| 3-state: Pending → Partial → Validated | Phase 28 precedent + `[~]` for human_needed | ✓ |
| 4-state: Pending → Partial → Validated → Complete | Adds terminal tier for v1.0 parity | |
| 2-state: Pending → Complete (collapse) | v1.0 simplicity; loses human_needed granularity | |

**User's choice:** 3-state.
**Notes:** v1.0 rows keep `Complete` (historical); v2.0 terminal is `Validated`. Checkbox mapping: `[ ]` Pending, `[~]` Partial, `[x]` Validated. See CONTEXT D-05..D-07.

---

## C. Phase-suffix column handling

| Option | Description | Selected |
|--------|-------------|----------|
| Keep code-provenance suffixes, drop Phase 29 from IMPORT rows | `(gap closure)` / `(wire-in)` stay where they represent code work | ✓ (Claude's Discretion) |
| Keep all provenance, add `(docs closure)` suffix | Explicit but introduces a new term | |
| Collapse to flat phase list | Drop all suffixes | |
| Footnoted provenance table | Flat list + footnote key | |

**User's choice:** "I don't care, do what makes sense" — Claude's Discretion chose Option 1.
**Notes:** Option 1 preserves useful code-provenance tracking while honestly removing the misleading `Phase 29 (gap closure)` from IMPORT rows (Phase 29 adds zero code). See CONTEXT D-08..D-09.

---

## D. Phase 24 ROADMAP + PORT-02 reconciliation

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite both in place (recommended) | Git history preserves original; clean forward reading | |
| Annotate both with a D-02 deviation block | In-doc audit trail of the pivot | ✓ |
| Rewrite ROADMAP, annotate REQUIREMENTS | Hybrid respecting each doc's role | |
| Minimal: add short inline note | Shortest change | |

**User's choice:** Annotate both with a D-02 deviation block.
**Notes:** User values the in-doc audit trail over clean forward-reading. Establishes a reusable deviation-block pattern for future pivots. See CONTEXT D-15..D-16.

---

## E. GuidePage.tsx v2.0 refresh

### E.1 — Which v2.0 feature areas get dedicated sections?

| Option | Description | Selected |
|--------|-------------|----------|
| Budget tracking (BUDG) | | ✓ |
| Inventory (INVT) | | ✓ |
| Grocery list (GROC) | | ✓ |
| Recipe Import (IMPORT) | | ✓ |

**User's choice:** All four, plus free-text: "Everything that doesn't already have documentation / instructions."
**Notes:** Interpreted as comprehensive — every v2.0 feature family + any undocumented v1.x behaviour.

### E.2 — Heavier-weight v2.0 areas?

| Option | Description | Selected |
|--------|-------------|----------|
| Plan generation + DnD (PLAN) | | ✓ |
| Feedback/ratings (FEED) | | ✓ |
| Schedule + Prep sequencing (SCHED/PREP) | | ✓ |
| Tier-aware portioning (PORT) | | ✓ |

**User's choice:** All four.

### E.3 — Section structure

| Option | Description | Selected |
|--------|-------------|----------|
| Append after Household Admin, before end | Zero risk to existing sections | |
| Interleave by workflow (recommended) | Natural user-flow ordering; may edit v1.0 sections in place | ✓ |
| New collapsible 'v2.0 Features' group | Component change to GuidePage | |

**User's choice:** Interleave by workflow.
**Notes:** Target ordering in CONTEXT D-11.

### E.4 — Tone/depth + QUICK_START_STEPS

| Option | Description | Selected |
|--------|-------------|----------|
| Match existing (intro + 5-8 steps + 1-2 tips) | Strictly follow existing GuideSection shape | ✓ |
| Match existing + allow looser 'How it works' sections | Hybrid for AI/tier features | |
| Extend GuideSection type with `howItWorks` field | Schema change | |

**User's choice:** Match existing.
**Notes:** Do not extend the `GuideSection` interface. QUICK_START_STEPS gets one new step for import/generate-plan. See CONTEXT D-12..D-14.

---

## Final continuation check

| Option | Description | Selected |
|--------|-------------|----------|
| Write context | Proceed to 29-CONTEXT.md | ✓ |
| One more area: testing/CI | Coverage strategy for GuidePage | |
| One more area: doc ordering / commit waves | Decomposition | |
| Revisit an area | | |

**User's choice:** Write context.
**Notes:** Testing/CI and commit-wave decomposition both captured as deferred → planner's discretion.

---

## Claude's Discretion

- Suffix handling (C) — user said "do what makes sense"; Option 1 chosen.
- Commit wave decomposition — deferred to planner.
- Exact GuidePage copy wording — planner/executor subject to D-10..D-14 constraints.
- Exact retrospective-VERIFICATION evidence pointer wording — planner subject to D-01..D-04.

## Deferred Ideas

- Full testing/CI strategy for GuidePage — planner to set minimum (likely just `tsc --noEmit`).
- Decomposition into waves — planner's call.
- Future CI check grep-asserting every v2.0 requirement id appears in GuidePage.tsx — out of scope; note for v2.0 milestone wrap-up.
- Milestone archive via `/gsd-complete-milestone` — separate action after Phase 29 merges.
