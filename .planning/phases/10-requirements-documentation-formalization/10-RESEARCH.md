# Phase 10: Requirements Documentation Formalization - Research

**Researched:** 2026-03-15
**Domain:** Documentation — REQUIREMENTS.md and ROADMAP.md structural updates
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Derive IDs only from actual success criteria — no padding to reach 10 per category
- Phase 6 has 6 success criteria → 6 LAUNCH IDs (LAUNCH-01 through LAUNCH-06)
- Phase 8 has 6 success criteria → 6 POLISH IDs (POLISH-01 through POLISH-06)
- Claude decides optimal ID ordering (thematic grouping vs success criteria order)
- Update ROADMAP.md references from "LAUNCH-01–10" / "POLISH-01–10" to match actual count
- Map requirements to the phase that built the feature: LAUNCH-xx → Phase 6, POLISH-xx → Phase 8
- Update the Gap Closure Phases table: mark LAUNCH and POLISH entries as Complete, remove Phase 10 pending rows
- Rewrite ROADMAP success criteria as user-facing requirement statements matching existing style
- Pattern: "User can..." or "App does..." (like AUTH-01: "User can create an account with email and password")
- Mark all new requirements as complete (checked) since features are already built and deployed
- Add two new subsections under "## v1 Requirements": "Launch & Deployment" and "UI Polish"
- Place new subsections after existing subsections (after "Platform & Design")

### Claude's Discretion
- Exact wording of each requirement description
- ID ordering within each category
- Whether to update the coverage count at bottom of traceability section

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAUNCH-01 | App is deployed and accessible at production URL with all SPA routes working | Phase 6 success criterion 1 — maps directly |
| LAUNCH-02 | App displays a branded splash screen on load | Phase 6 success criterion 2 — maps directly |
| LAUNCH-03 | App provides Open Graph social sharing metadata | Phase 6 success criterion 3 — maps directly |
| LAUNCH-04 | Unknown routes show a branded 404 page | Phase 6 success criterion 4 — maps directly |
| LAUNCH-05 | Portfolio site includes a NourishPlan project card | Phase 6 success criterion 5 — maps directly |
| LAUNCH-06 | New signups are blocked; existing users can log in | Phase 6 success criterion 6 — maps directly |
| POLISH-01 | All components render correctly in dark mode | Phase 8 success criterion 1 — maps directly |
| POLISH-02 | Meal plan slot cards show mini nutrition rings | Phase 8 success criterion 2 — maps directly |
| POLISH-03 | Food logging supports household measurement units | Phase 8 success criterion 3 — maps directly |
| POLISH-04 | Mobile tab bar has a "More" drawer for overflow navigation | Phase 8 success criterion 4 — maps directly |
| POLISH-05 | Settings page supports editing profile, avatar, and household name | Phase 8 success criterion 5 — maps directly |
| POLISH-06 | Nutrition targets form supports macro entry as percentages of calories | Phase 8 success criterion 6 — maps directly |
</phase_requirements>

## Summary

Phase 10 is a pure documentation task. No code changes are involved. The work is to add formal requirement entries to REQUIREMENTS.md for features already built in Phase 6 (launch) and Phase 8 (UI polish), then update the traceability tables and ROADMAP.md references to reflect the actual ID counts.

The ROADMAP.md currently lists "LAUNCH-01–10" and "POLISH-01–10" as placeholders. The CONTEXT.md decision is to derive IDs from actual success criteria only: Phase 6 has 6 success criteria, Phase 8 has 6 success criteria. The actual IDs are therefore LAUNCH-01 through LAUNCH-06 and POLISH-01 through POLISH-06.

Three files need edits: REQUIREMENTS.md (add two new subsections plus traceability rows), ROADMAP.md (update requirement count references in Phase 6, Phase 8, and Phase 10 headers), and the Gap Closure table in REQUIREMENTS.md (resolve pending Phase 10 rows as Complete).

**Primary recommendation:** Make all three file edits in a single plan, verifying final state against ROADMAP success criteria before closing.

## Source Material: ROADMAP Success Criteria

This section is the authoritative source for requirement descriptions. The planner translates these into "User can..." / "App does..." statements.

### Phase 6 Success Criteria (source for LAUNCH-xx)

From ROADMAP.md Phase 6:
1. NourishPlan is live at https://nourishplan.gregok.ca with all SPA routes working
2. Branded splash screen appears while the app loads
3. Social sharing shows OG preview with title, description, and image
4. Unknown routes show a branded 404 page
5. Portfolio site at gregok.ca has a NourishPlan project card linking to the app
6. New signups are blocked (invite-only) while existing users can log in

**Translated to requirement style:**

| ID | Description |
|----|-------------|
| LAUNCH-01 | App is deployed at https://nourishplan.gregok.ca with all SPA routes returning correct responses |
| LAUNCH-02 | App shows a branded splash screen while loading |
| LAUNCH-03 | Social sharing renders an OG preview with title, description, and image |
| LAUNCH-04 | Unknown routes display a branded 404 page |
| LAUNCH-05 | Portfolio site at gregok.ca includes a NourishPlan project card linking to the live app |
| LAUNCH-06 | New user signups are blocked (invite-only); existing users can log in normally |

### Phase 8 Success Criteria (source for POLISH-xx)

From ROADMAP.md Phase 8:
1. All components render correctly in dark mode with visible ring colors and proper contrast
2. Each meal plan slot shows mini nutrition rings indicating contribution to daily targets
3. Food logging shows household measurement units (cups, tbsp, pieces) when source data provides them
4. Mobile tab bar has a "More" button opening a slide-out drawer with overflow navigation
5. Settings page allows editing display name, avatar, and household name (admin only)
6. Nutrition targets form supports entering macros as percentages of calories with P+C+F=100% validation

**Translated to requirement style:**

| ID | Description |
|----|-------------|
| POLISH-01 | App renders all components correctly in dark mode with visible ring colours and proper contrast |
| POLISH-02 | Each meal plan slot card shows mini nutrition rings indicating contribution to daily targets |
| POLISH-03 | Food logging displays household measurement units (cups, tbsp, pieces) when source data provides them |
| POLISH-04 | Mobile tab bar has a "More" button that opens a slide-out drawer for overflow navigation |
| POLISH-05 | Settings page allows editing display name, avatar, and household name (admin only) |
| POLISH-06 | Nutrition targets form supports entering macros as percentages of total calories with P+C+F=100% validation |

## Architecture Patterns

### REQUIREMENTS.md Structure

The existing document follows this pattern exactly:

```
## v1 Requirements

### Authentication
- [x] **AUTH-01**: User can create an account with email and password
- [x] **AUTH-02**: ...

### Platform & Design
- [x] **PLAT-01**: ...
- [x] **PLAT-04**: ...

## v2 Requirements
...

## Traceability
| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 38 total
...

**Gap Closure Phases (v1.1 audit):**
| Requirement | Phase | Status |
|-------------|-------|--------|
| TRCK-05 | Phase 9 ... | Complete |
| LAUNCH-01–10 | Phase 10 (documentation) | Pending |
| POLISH-01–10 | Phase 10 (documentation) | Pending |
```

New subsections go between "Platform & Design" and "## v2 Requirements":

```
### Launch & Deployment
- [x] **LAUNCH-01**: ...
- [x] **LAUNCH-06**: ...

### UI Polish
- [x] **POLISH-01**: ...
- [x] **POLISH-06**: ...
```

### ROADMAP.md Reference Updates

Three locations need count corrections:

| Location | Current Text | Correct Text |
|----------|-------------|-------------|
| Phase 6 Requirements line | `LAUNCH-01, LAUNCH-02, ..., LAUNCH-10` | `LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04, LAUNCH-05, LAUNCH-06` |
| Phase 8 Requirements line | `POLISH-01, POLISH-02, ..., POLISH-10` | `POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06` |
| Phase 10 Requirements line | `LAUNCH-01–LAUNCH-10, POLISH-01–POLISH-10` | `LAUNCH-01–LAUNCH-06, POLISH-01–POLISH-06` |

### Gap Closure Table Updates

Current REQUIREMENTS.md Gap Closure table rows to change:

| Current Row | Action |
|-------------|--------|
| `LAUNCH-01–10 \| Phase 10 (documentation) \| Pending` | Replace with individual rows LAUNCH-01 through LAUNCH-06, Phase 6, Complete |
| `POLISH-01–10 \| Phase 10 (documentation) \| Pending` | Replace with individual rows POLISH-01 through POLISH-06, Phase 8, Complete |

Note: POLISH-01 already has a row: `POLISH-01 | Phase 9 (theme token fix) | Complete`. Keep this row; the new POLISH-01 through POLISH-06 rows from Phase 8 go separately or the existing POLISH-01 row is understood as a cross-reference. The planner should collapse to: POLISH-01 maps to both Phase 8 (defined) and Phase 9 (gap fix) — list Phase 8 as the defining phase.

### Coverage Count Update

Current count: "v1 requirements: 38 total". Adding 12 new requirements (6 LAUNCH + 6 POLISH) brings it to 50. The planner should update this line.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Requirement descriptions | Inventing new requirement scope | Translate directly from ROADMAP success criteria |
| ID ordering | Arbitrary numbering | Match success criteria order (1:1 mapping) |
| Coverage count | Manual count | Add 12 to existing 38 = 50 |

## Common Pitfalls

### Pitfall 1: POLISH-01 Duplicate Row
**What goes wrong:** REQUIREMENTS.md Gap Closure table already has `POLISH-01 | Phase 9 (theme token fix) | Complete`. Adding a new Phase 8 POLISH-01 row could create confusing duplicates.
**How to avoid:** The Phase 9 gap closure row documents a remediation (theme token fix). The Phase 8 traceability row documents the original feature build. These are separate concerns. In the main traceability table, map POLISH-01 → Phase 8. The gap closure table Phase 9 row for POLISH-01 stays as-is (it documents the theme token fix gap, not the requirement origin).

### Pitfall 2: Padding to 10 IDs
**What goes wrong:** ROADMAP.md says "LAUNCH-01–10" and "POLISH-01–10" as placeholders, tempting the planner to invent 4 extra requirements per category.
**How to avoid:** CONTEXT.md locked decision explicitly states: "Derive IDs only from actual success criteria — no padding." Use exactly 6 per category.

### Pitfall 3: Forgetting ROADMAP.md Updates
**What goes wrong:** Updating REQUIREMENTS.md but leaving ROADMAP.md with the stale "LAUNCH-01–10" references.
**How to avoid:** Three ROADMAP.md locations must be updated. Include these as explicit tasks in the plan.

### Pitfall 4: Wrong Section Placement
**What goes wrong:** Adding new subsections before "Platform & Design" or after "## v2 Requirements".
**How to avoid:** CONTEXT.md specifies: "Place after existing subsections (after 'Platform & Design')". The order is: Authentication, Household, Food Data, Recipes, Meals & Meal Plans, Tracking & Targets, Platform & Design, **Launch & Deployment**, **UI Polish**, then ## v2 Requirements.

## Validation Architecture

The nyquist_validation workflow is enabled. However, this phase makes no code changes — it edits only `.planning/*.md` files (REQUIREMENTS.md and ROADMAP.md). There is no test framework applicable to documentation correctness. Validation is performed by inspection: verifying that requirement descriptions match ROADMAP source criteria and that IDs are complete and correctly numbered.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — documentation-only phase |
| Config file | N/A |
| Quick run command | Manual inspection of edited files |
| Full suite command | Manual inspection of edited files |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAUNCH-01 through LAUNCH-06 | Defined in REQUIREMENTS.md with correct descriptions | manual-only | Inspect REQUIREMENTS.md | ✅ (will exist after edit) |
| POLISH-01 through POLISH-06 | Defined in REQUIREMENTS.md with correct descriptions | manual-only | Inspect REQUIREMENTS.md | ✅ (will exist after edit) |
| All 12 | Traceability table rows present and mapped to correct phases | manual-only | Inspect REQUIREMENTS.md traceability section | ✅ (will exist after edit) |

Justification for manual-only: Requirement content correctness (matching ROADMAP descriptions, using consistent style) cannot be verified by automated command. Verification is structural inspection — count rows, compare descriptions against ROADMAP source.

### Sampling Rate
- **Per task commit:** Inspect edited file section before committing
- **Per wave merge:** Review all three changed files (REQUIREMENTS.md, ROADMAP.md) together
- **Phase gate:** Full review of both files before `/gsd:verify-work`

### Wave 0 Gaps
None — existing documentation infrastructure (REQUIREMENTS.md, ROADMAP.md) covers all phase requirements.

## State After Phase 10 Completes

For planner awareness — what the final state should look like:

**REQUIREMENTS.md:**
- Two new subsections under v1: "Launch & Deployment" (6 checked entries) and "UI Polish" (6 checked entries)
- Main traceability table: 12 new rows (LAUNCH-01–06 → Phase 6 Complete, POLISH-01–06 → Phase 8 Complete)
- Coverage count: updated from 38 to 50
- Gap Closure table: LAUNCH and POLISH pending rows replaced/resolved as Complete

**ROADMAP.md:**
- Phase 6 Requirements line: ends at LAUNCH-06
- Phase 8 Requirements line: ends at POLISH-06
- Phase 10 Requirements line: references LAUNCH-01–06 and POLISH-01–06

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` — Source of truth for Phase 6 and Phase 8 success criteria
- `.planning/REQUIREMENTS.md` — Source of existing document structure, format, and conventions
- `.planning/phases/10-requirements-documentation-formalization/10-CONTEXT.md` — User decisions locking scope

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Confirms phases 6, 8, 9 complete; phase 10 ready for planning

## Metadata

**Confidence breakdown:**
- Source material (ROADMAP criteria): HIGH — read directly from authoritative source
- Document structure: HIGH — read directly from REQUIREMENTS.md
- Requirement descriptions: HIGH — 1:1 translation from locked success criteria
- ID count (6+6, not 10+10): HIGH — explicitly confirmed in CONTEXT.md locked decisions

**Research date:** 2026-03-15
**Valid until:** Stable — documentation is static until ROADMAP is edited
